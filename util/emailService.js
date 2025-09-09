const logger = require('./logger');

// nodemailer가 설치되면 주석 해제
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Gmail SMTP 설정 (nodemailer 설치 후 활성화)
      if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          }
        });
        this.isConfigured = true;
        logger.success('Email service configured with Gmail SMTP');
      } else {
        logger.warning('Gmail credentials not found in environment variables');
        logger.info('Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file');
      }
    } catch (error) {
      logger.error(`Failed to configure email service: ${error.message}`);
    }
  }

  generateVerificationToken() {
    // 6자리 숫자 코드 생성
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendVerificationEmail(email, username, verificationToken) {
    if (!this.isConfigured) {
      logger.error('Email service is not configured');
      throw new Error('Email service is not configured');
    }

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: process.env.GMAIL_USER || 'noreply@memoapp.com',
      to: email,
      subject: '메모 앱 - 이메일 인증을 완료해주세요',
      html: this.getVerificationEmailTemplate(username, verificationToken, verificationUrl)
    };

    try {
      // nodemailer가 설치되면 실제 이메일 발송
      const info = await this.transporter.sendMail(mailOptions);
      logger.success(`Verification email sent to ${email}: ${info.messageId}`);
      
      // 개발 환경에서 추가 정보 출력
      if (process.env.NODE_ENV === 'development') {
        logger.info(`🔗 Verification URL: ${verificationUrl}`);
        logger.info(`🔑 Verification Code: ${verificationToken}`);
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to send verification email: ${error.message}`);
      throw error;
    }
  }

  getVerificationEmailTemplate(username, verificationCode, verificationUrl) {
    return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>이메일 인증</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .container {
                background: #ffffff;
                border-radius: 10px;
                padding: 40px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 10px;
            }
            .verification-code {
                background: #f3f4f6;
                border: 2px dashed #d1d5db;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
            }
            .code {
                font-size: 32px;
                font-weight: bold;
                color: #1f2937;
                letter-spacing: 4px;
                margin: 10px 0;
            }
            .button {
                display: inline-block;
                background: #2563eb;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                margin: 20px 0;
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
                text-align: center;
            }
            .warning {
                background: #fef3cd;
                border: 1px solid #fbbf24;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
                color: #92400e;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">📝 메모 앱</div>
                <h1>이메일 인증을 완료해주세요</h1>
            </div>
            
            <p>안녕하세요, <strong>${username}</strong>님!</p>
            <p>메모 앱에 가입해주셔서 감사합니다. 계정을 활성화하기 위해 이메일 인증을 완료해주세요.</p>
            
            <div class="verification-code">
                <p><strong>인증 코드</strong></p>
                <div class="code">${verificationCode}</div>
                <p>또는 아래 버튼을 클릭하세요</p>
                <a href="${verificationUrl}" class="button">이메일 인증 완료</a>
            </div>
            
            <div class="warning">
                ⚠️ <strong>주의사항:</strong><br>
                • 이 인증 코드는 1시간 후에 만료됩니다<br>
                • 본인이 요청하지 않은 경우 이 이메일을 무시해주세요<br>
                • 인증 완료 후 바로 로그인하실 수 있습니다
            </div>
            
            <div class="footer">
                <p>이 이메일은 자동으로 발송되었습니다. 회신하지 마세요.</p>
                <p>© 2024 메모 앱. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async sendPasswordResetEmail(email, username, resetToken) {
    // 향후 비밀번호 재설정 기능을 위한 메서드
    if (!this.isConfigured) {
      logger.error('Email service is not configured');
      throw new Error('Email service is not configured');
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: process.env.GMAIL_USER || 'noreply@memoapp.com',
      to: email,
      subject: '메모 앱 - 비밀번호 재설정',
      html: `
        <h2>비밀번호 재설정</h2>
        <p>안녕하세요, ${username}님!</p>
        <p>비밀번호 재설정을 요청하셨습니다.</p>
        <p><a href="${resetUrl}">여기를 클릭하여 비밀번호를 재설정하세요</a></p>
        <p>이 링크는 1시간 후에 만료됩니다.</p>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.success(`Password reset email sent to ${email}: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send password reset email: ${error.message}`);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
const emailService = new EmailService();

module.exports = emailService;
