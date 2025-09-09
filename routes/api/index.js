const express = require('express');
const router = express.Router();
const logger = require('../../util/logger');

// API 라우터들 import
const authRouter = require('./auth');
const usersRouter = require('./users');
const designTemplatesRouter = require('./design-templates');
const memosRouter = require('./memos');
const filesRouter = require('./files');

// API 정보 엔드포인트
router.get('/', (req, res) => {
  logger.info('API root endpoint accessed');
  
  res.json({
    success: true,
    message: 'Memo App API v1.0',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      templates: '/api/templates',
      memos: '/api/memos',
      files: '/api/files'
    },
    documentation: {
      auth: {
        'POST /api/auth/login': 'User login (requires email verification) - Returns JWT token',
        'POST /api/auth/register': 'User registration (sends verification email) - Password auto-hashed',
        'GET /api/auth/verify-email': 'Verify email with token (query params)',
        'POST /api/auth/resend-verification': 'Resend verification email',
        'POST /api/auth/logout': 'User logout',
        'GET /api/auth/me': 'Get current user info (requires JWT token)',
        'POST /api/auth/refresh-token': 'Refresh JWT token'
      },
      users: {
        'GET /api/users': 'Get all users with pagination and search',
        'GET /api/users/:id': 'Get user by ID',
        'POST /api/users': 'Create new user',
        'PUT /api/users/:id': 'Update user',
        'DELETE /api/users/:id': 'Delete user',
        'GET /api/users/:id/memos': 'Get user\'s memos'
      },
      templates: {
        'GET /api/templates': 'Get all design templates with pagination',
        'GET /api/templates/:id': 'Get template by ID',
        'POST /api/templates': 'Create new template',
        'PUT /api/templates/:id': 'Update template',
        'DELETE /api/templates/:id': 'Delete template',
        'GET /api/templates/:id/memos': 'Get memos using this template',
        'GET /api/templates/stats/popular': 'Get most used templates'
      },
      memos: {
        'GET /api/memos': 'Get all memos with filters and pagination',
        'GET /api/memos/:id': 'Get memo by ID',
        'POST /api/memos': 'Create new memo',
        'PUT /api/memos/:id': 'Update memo',
        'DELETE /api/memos/:id': 'Delete memo',
        'GET /api/memos/stats/overview': 'Get memo statistics',
        'POST /api/memos/:id/duplicate': 'Duplicate a memo',
        'POST /api/memos/with-image': 'Create memo with image upload'
      },
      files: {
        'POST /api/files/upload/:domain': 'Upload file for specific domain (memo, profile-image, template-image)',
        'GET /api/files/:id': 'Get file by ID',
        'GET /api/files/domain/:domain/:referenceId': 'Get files by domain and reference ID',
        'GET /api/files/user/:userId': 'Get files uploaded by user',
        'DELETE /api/files/:id': 'Delete file (soft delete)',
        'POST /api/files/:id/download': 'Track file download',
        'GET /api/files/stats/overview': 'Get file statistics'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// API 라우터 등록
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/templates', designTemplatesRouter);
router.use('/memos', memosRouter);
router.use('/files', filesRouter);

module.exports = router;
