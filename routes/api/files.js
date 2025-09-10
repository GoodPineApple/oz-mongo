const express = require('express');
const router = express.Router();
const { File, DOMAIN_TYPES } = require('../../models');
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');
const { authenticateToken, optionalAuth } = require('../../middleware/authMiddleware');
const { createUploadMiddleware, handleUploadError } = require('../../middleware/multerConfig');
const FileService = require('../../util/fileService');
const logger = require('../../util/logger');

/**
 * @route   POST /api/files/upload/:domain
 * @desc    Upload file for specific domain
 * @access  Private (requires authentication)
 */
router.post('/upload/:domain', authenticateToken, (req, res, next) => {
  const { domain } = req.params;
  
  // 도메인 유효성 검증
  if (!Object.values(DOMAIN_TYPES).includes(domain)) {
    return apiResponse.error(res, 'Invalid domain type', 400);
  }
  
  const uploadMiddleware = createUploadMiddleware(domain);
  
  uploadMiddleware(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    next();
  });
}, asyncHandler(async (req, res) => {
  const { domain } = req.params;
  const { referenceId, description, tags, isPublic } = req.body;
  
  if (!req.file) {
    return apiResponse.error(res, 'No file uploaded', 400);
  }
  
  if (!referenceId) {
    return apiResponse.error(res, 'Reference ID is required', 400);
  }
  
  try {
    // 파일을 데이터베이스에 저장
    const file = await FileService.saveFile(
      req.file,
      domain,
      referenceId,
      req.user.id,
      {
        description,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        isPublic: isPublic === 'true'
      }
    );
    
    // 이미지인 경우 리사이징 (백그라운드에서 처리)
    if (file.isImage) {
      FileService.createResizedVersions(file).catch(error => {
        logger.error(`Failed to create resized versions for file ${file.id}: ${error.message}`);
      });
    }
    
    logger.success(`File uploaded: ${file.originalName} (${domain})`);
    return apiResponse.success(res, file, 'File uploaded successfully', 201);
  } catch (error) {
    logger.error(`File upload failed: ${error.message}`);
    return apiResponse.error(res, 'File upload failed', 500);
  }
}));

/**
 * @route   GET /api/files/:id
 * @desc    Get file by ID
 * @access  Public (with optional auth for private files)
 */
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);
  
  if (!file || file.status !== 'active') {
    return apiResponse.notFound(res, 'File');
  }
  
  // 비공개 파일인 경우 권한 확인
  if (!file.isPublic) {
    if (!req.user) {
      return apiResponse.error(res, 'Authentication required for private file', 401);
    }
    
    // 파일 업로더이거나 참조된 리소스의 소유자인지 확인 (간단한 예시)
    if (file.uploadedBy.toString() !== req.user.id) {
      return apiResponse.error(res, 'Access denied', 403);
    }
  }
  
  // 조회수 증가
  file.incrementView().catch(error => {
    logger.warn(`Failed to increment view count: ${error.message}`);
  });
  
  logger.info(`File accessed: ${file.originalName}`);
  return apiResponse.success(res, file);
}));

/**
 * @route   GET /api/files/domain/:domain/:referenceId
 * @desc    Get files by domain and reference ID
 * @access  Public (with optional auth for private files)
 */
router.get('/domain/:domain/:referenceId', optionalAuth, asyncHandler(async (req, res) => {
  const { domain, referenceId } = req.params;
  
  if (!Object.values(DOMAIN_TYPES).includes(domain)) {
    return apiResponse.error(res, 'Invalid domain type', 400);
  }
  
  const files = await FileService.getFilesByDomain(domain, referenceId);
  
  // 비공개 파일 필터링
  const filteredFiles = files.filter(file => {
    if (file.isPublic) return true;
    if (!req.user) return false;
    return file.uploadedBy.toString() === req.user.id;
  });
  
  logger.info(`Retrieved ${filteredFiles.length} files for ${domain}:${referenceId}`);
  return apiResponse.success(res, filteredFiles);
}));

/**
 * @route   GET /api/files/user/:userId
 * @desc    Get files uploaded by user
 * @access  Private (requires authentication)
 */
router.get('/user/:userId', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20, domain } = req.query;
  
  // 자신의 파일만 조회 가능
  if (userId !== req.user.id) {
    return apiResponse.error(res, 'Access denied', 403);
  }
  
  const files = await FileService.getFilesByUploader(userId, { page, limit, domain });
  
  logger.info(`Retrieved ${files.length} files for user ${userId}`);
  return apiResponse.success(res, files);
}));

/**
 * @route   DELETE /api/files/:id
 * @desc    Delete file (soft delete)
 * @access  Private (requires authentication)
 */
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);
  
  if (!file) {
    return apiResponse.notFound(res, 'File');
  }
  
  // 파일 소유자만 삭제 가능
  if (file.uploadedBy.toString() !== req.user.id) {
    return apiResponse.error(res, 'Access denied', 403);
  }
  
  await FileService.deleteFile(req.params.id);
  
  logger.success(`File deleted: ${file.originalName}`);
  return apiResponse.deleted(res);
}));

/**
 * @route   POST /api/files/:id/download
 * @desc    Track file download
 * @access  Public (with optional auth)
 */
router.post('/:id/download', optionalAuth, asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);
  
  if (!file || file.status !== 'active') {
    return apiResponse.notFound(res, 'File');
  }
  
  // 비공개 파일인 경우 권한 확인
  if (!file.isPublic && (!req.user || file.uploadedBy.toString() !== req.user.id)) {
    return apiResponse.error(res, 'Access denied', 403);
  }
  
  // 다운로드 수 증가
  file.incrementDownload().catch(error => {
    logger.warn(`Failed to increment download count: ${error.message}`);
  });
  
  logger.info(`File download tracked: ${file.originalName}`);
  return apiResponse.success(res, { downloadUrl: file.metadata.original.url });
}));

/**
 * @route   GET /api/files/stats/overview
 * @desc    Get file statistics
 * @access  Private (admin only - simplified check)
 */
router.get('/stats/overview', authenticateToken, asyncHandler(async (req, res) => {
  const stats = await FileService.getFileStats();
  
  logger.info('Retrieved file statistics');
  return apiResponse.success(res, stats);
}));

module.exports = router;
