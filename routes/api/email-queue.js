const express = require('express');
const router = express.Router();
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../util/logger');
const emailQueue = require('../../util/emailQueue');

/**
 * @swagger
 * /api/email-queue/status:
 *   get:
 *     summary: Get email queue status
 *     description: Get current status of the email queue
 *     tags: [Email Queue]
 *     responses:
 *       200:
 *         description: Queue status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         pending:
 *                           type: integer
 *                           description: Number of pending emails
 *                         processing:
 *                           type: integer
 *                           description: Number of emails being processed
 *                         isProcessing:
 *                           type: boolean
 *                           description: Whether queue processing is active
 */
router.get('/status', asyncHandler(async (req, res) => {
  const status = await emailQueue.getQueueStatus();
  logger.info(`Email queue status: ${JSON.stringify(status)}`);
  return apiResponse.success(res, status);
}));

/**
 * @swagger
 * /api/email-queue/send:
 *   post:
 *     summary: Send email to queue
 *     description: Add an email to the queue for processing
 *     tags: [Email Queue]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - subject
 *               - content
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 description: Recipient email address
 *               subject:
 *                 type: string
 *                 description: Email subject
 *               content:
 *                 type: string
 *                 description: Email content
 *               userId:
 *                 type: string
 *                 description: User ID (optional)
 *           example:
 *             to: "user@example.com"
 *             subject: "Test Email"
 *             content: "This is a test email from the queue system"
 *             userId: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Email added to queue successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         messageId:
 *                           type: string
 *                           description: Unique message ID
 */
router.post('/send', asyncHandler(async (req, res) => {
  const { to, subject, content, userId } = req.body;

  // 기본 유효성 검증
  if (!to || !subject || !content) {
    return apiResponse.error(res, 'to, subject, and content are required', 400);
  }

  const messageId = await emailQueue.addToQueue({
    to,
    subject,
    content,
    userId
  });

  logger.info(`Email added to queue: ${to} - ${subject}`);
  return apiResponse.success(res, { messageId }, 'Email added to queue successfully');
}));

/**
 * @swagger
 * /api/email-queue/send-all:
 *   post:
 *     summary: Send email to all users
 *     description: Add emails for all users to the queue
 *     tags: [Email Queue]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - content
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Email subject
 *               content:
 *                 type: string
 *                 description: Email content
 *           example:
 *             subject: "Important Announcement"
 *             content: "This is an important announcement for all users"
 *     responses:
 *       200:
 *         description: Emails added to queue for all users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/send-all', asyncHandler(async (req, res) => {
  const { subject, content } = req.body;

  // 기본 유효성 검증
  if (!subject || !content) {
    return apiResponse.error(res, 'subject and content are required', 400);
  }

  await emailQueue.sendToAllUsers(subject, content);
  
  logger.info(`Emails added to queue for all users: ${subject}`);
  return apiResponse.success(res, null, 'Emails added to queue for all users');
}));

/**
 * @swagger
 * /api/email-queue/clear:
 *   delete:
 *     summary: Clear email queue
 *     description: Remove all emails from the queue
 *     tags: [Email Queue]
 *     responses:
 *       200:
 *         description: Queue cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.delete('/clear', asyncHandler(async (req, res) => {
  await emailQueue.clearQueue();
  logger.info('Email queue cleared');
  return apiResponse.success(res, null, 'Email queue cleared successfully');
}));

/**
 * @swagger
 * /api/email-queue/start:
 *   post:
 *     summary: Start email queue processing
 *     description: Start processing emails from the queue
 *     tags: [Email Queue]
 *     responses:
 *       200:
 *         description: Queue processing started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/start', asyncHandler(async (req, res) => {
  emailQueue.startProcessing();
  logger.info('Email queue processing started manually');
  return apiResponse.success(res, null, 'Email queue processing started');
}));

/**
 * @swagger
 * /api/email-queue/stop:
 *   post:
 *     summary: Stop email queue processing
 *     description: Stop processing emails from the queue
 *     tags: [Email Queue]
 *     responses:
 *       200:
 *         description: Queue processing stopped
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/stop', asyncHandler(async (req, res) => {
  emailQueue.stopProcessing();
  logger.info('Email queue processing stopped manually');
  return apiResponse.success(res, null, 'Email queue processing stopped');
}));

module.exports = router;
