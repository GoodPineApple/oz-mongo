const { getRedisClient } = require('./redisService');
const logger = require('./logger');
const { User } = require('../models');

class EmailQueue {
  constructor() {
    this.queueName = 'email_queue';
    this.processingQueueName = 'email_processing';
    this.isProcessing = false;
    this.processingInterval = null;
  }

  /**
   * 이메일 큐에 메시지 추가
   * @param {Object} emailData - 이메일 데이터
   * @param {string} emailData.to - 수신자 이메일
   * @param {string} emailData.subject - 이메일 제목
   * @param {string} emailData.content - 이메일 내용
   * @param {string} emailData.userId - 사용자 ID (선택사항)
   */
  async addToQueue(emailData) {
    try {
      const redisClient = getRedisClient();
      const message = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        ...emailData,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      await redisClient.lPush(this.queueName, JSON.stringify(message));
      logger.info(`Email added to queue: ${emailData.to} - ${emailData.subject}`);
      
      return message.id;
    } catch (error) {
      logger.error(`Failed to add email to queue: ${error.message}`);
      throw error;
    }
  }

  /**
   * 큐에서 메시지 가져오기 (FIFO)
   */
  async getFromQueue() {
    try {
      const redisClient = getRedisClient();
      const message = await redisClient.rPop(this.queueName);
      
      if (message) {
        return JSON.parse(message);
      }
      return null;
    } catch (error) {
      logger.error(`Failed to get message from queue: ${error.message}`);
      throw error;
    }
  }

  /**
   * 처리 중인 메시지를 처리 큐로 이동 (안전한 처리)
   */
  async moveToProcessing(message) {
    try {
      const redisClient = getRedisClient();
      await redisClient.lPush(this.processingQueueName, JSON.stringify(message));
    } catch (error) {
      logger.error(`Failed to move message to processing queue: ${error.message}`);
    }
  }

  /**
   * 처리 완료된 메시지 제거
   */
  async removeFromProcessing(messageId) {
    try {
      const redisClient = getRedisClient();
      const messages = await redisClient.lRange(this.processingQueueName, 0, -1);
      
      for (let i = 0; i < messages.length; i++) {
        const message = JSON.parse(messages[i]);
        if (message.id === messageId) {
          await redisClient.lRem(this.processingQueueName, 1, messages[i]);
          break;
        }
      }
    } catch (error) {
      logger.error(`Failed to remove message from processing queue: ${error.message}`);
    }
  }

  /**
   * 실제 이메일 발송 (여기서는 로그로 대체)
   */
  async sendEmail(emailData) {
    try {
      // 실제 이메일 발송 로직을 여기에 구현
      // 현재는 로그로 대체
      logger.info(`📧 Email sent to: ${emailData.to}`);
      logger.info(`📧 Subject: ${emailData.subject}`);
      logger.info(`📧 Content: ${emailData.content}`);
      
      // 실제 구현 시 emailService 사용
      // await emailService.sendEmail(emailData);
      
      return true;
    } catch (error) {
      logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  /**
   * 큐 처리 시작 (1분마다 실행)
   */
  startProcessing() {
    if (this.isProcessing) {
      logger.warn('Email queue processing is already running');
      return;
    }

    this.isProcessing = true;
    logger.info('Email queue processing started');

    // 1분마다 큐 처리
    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, 60000); // 60초 = 1분
  }

  /**
   * 큐 처리 중지
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    logger.info('Email queue processing stopped');
  }

  /**
   * 큐에서 메시지 처리
   */
  async processQueue() {
    try {
      const message = await this.getFromQueue();
      
      if (!message) {
        return; // 처리할 메시지가 없음
      }

      // 처리 중인 큐로 이동
      await this.moveToProcessing(message);

      try {
        // 이메일 발송
        await this.sendEmail(message);
        
        // 처리 완료 후 제거
        await this.removeFromProcessing(message.id);
        
        logger.info(`Email processed successfully: ${message.id}`);
      } catch (error) {
        logger.error(`Failed to process email ${message.id}: ${error.message}`);
        
        // 실패한 메시지를 다시 큐에 추가 (재시도)
        await this.addToQueue({
          to: message.to,
          subject: message.subject,
          content: message.content,
          userId: message.userId
        });
        
        // 처리 중인 큐에서 제거
        await this.removeFromProcessing(message.id);
      }
    } catch (error) {
      logger.error(`Queue processing error: ${error.message}`);
    }
  }

  /**
   * 모든 사용자에게 이메일 발송 (테스트용)
   */
  async sendToAllUsers(subject, content) {
    try {
      const users = await User.find({}, 'email username').select('-password');
      
      for (const user of users) {
        await this.addToQueue({
          to: user.email,
          subject: subject,
          content: content,
          userId: user._id.toString()
        });
      }
      
      logger.info(`Added ${users.length} emails to queue`);
    } catch (error) {
      logger.error(`Failed to send emails to all users: ${error.message}`);
      throw error;
    }
  }

  /**
   * 큐 상태 조회
   */
  async getQueueStatus() {
    try {
      const redisClient = getRedisClient();
      const queueLength = await redisClient.lLen(this.queueName);
      const processingLength = await redisClient.lLen(this.processingQueueName);
      
      return {
        pending: queueLength,
        processing: processingLength,
        isProcessing: this.isProcessing
      };
    } catch (error) {
      logger.error(`Failed to get queue status: ${error.message}`);
      throw error;
    }
  }

  /**
   * 큐 초기화 (모든 메시지 삭제)
   */
  async clearQueue() {
    try {
      const redisClient = getRedisClient();
      await redisClient.del(this.queueName);
      await redisClient.del(this.processingQueueName);
      logger.info('Email queue cleared');
    } catch (error) {
      logger.error(`Failed to clear queue: ${error.message}`);
      throw error;
    }
  }
}

// 싱글톤 인스턴스 생성
const emailQueue = new EmailQueue();

module.exports = emailQueue;
