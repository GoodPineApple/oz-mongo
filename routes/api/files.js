const express = require('express');
const router = express.Router();
const { File, DOMAIN_TYPES } = require('../../models');
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');
const { authenticateToken, optionalAuth } = require('../../middleware/authMiddleware');
const { createUploadMiddleware, handleUploadError } = require('../../middleware/multerConfig');
const FileService = require('../../util/fileService');
const logger = require('../../util/logger');

/**
 * @swagger
 * /api/files/upload/{domain}:
 *   post:
 *     summary: Upload file for specific domain
 *     description: Upload a file for a specific domain (requires authentication)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *           enum: [memo, profile-image, template-image, attachment]
 *         description: Domain type for the file
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               referenceId:
 *                 type: string
 *                 description: ID of the related entity
 *               description:
 *                 type: string
 *                 description: File description
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *               isPublic:
 *                 type: string
 *                 enum: ['true', 'false']
 *                 description: Whether the file is publicly accessible
 *             required: [file, referenceId]
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/File'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: File upload failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: Get file by ID
 *     description: Get file information by its ID (authentication required for private files)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/File'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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
 * @swagger
 * /api/files/domain/{domain}/{referenceId}:
 *   get:
 *     summary: Get files by domain and reference ID
 *     description: Get all files for a specific domain and reference ID
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *           enum: [memo, profile-image, template-image, attachment]
 *         description: Domain type
 *       - in: path
 *         name: referenceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Reference ID of the related entity
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/File'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
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
 * @swagger
 * /api/files/user/{userId}:
 *   get:
 *     summary: Get files uploaded by user
 *     description: Get all files uploaded by a specific user (requires authentication)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: domain
 *         schema:
 *           type: string
 *           enum: [memo, profile-image, template-image, attachment]
 *         description: Filter by domain type
 *     responses:
 *       200:
 *         description: User files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/File'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
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
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     summary: Delete file
 *     description: Delete a file (soft delete, requires authentication and ownership)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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
 * @swagger
 * /api/files/{id}/download:
 *   post:
 *     summary: Track file download
 *     description: Track file download and get download URL
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: Download tracked successfully
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
 *                         downloadUrl:
 *                           type: string
 *                           description: URL to download the file
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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
 * @swagger
 * /api/files/stats/overview:
 *   get:
 *     summary: Get file statistics
 *     description: Get comprehensive file statistics (admin access required)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File statistics retrieved successfully
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
 *                         totalFiles:
 *                           type: integer
 *                         totalSize:
 *                           type: integer
 *                           description: Total size in bytes
 *                         filesByDomain:
 *                           type: object
 *                           additionalProperties:
 *                             type: integer
 *                         filesByType:
 *                           type: object
 *                           additionalProperties:
 *                             type: integer
 *                         recentFiles:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/File'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/stats/overview', authenticateToken, asyncHandler(async (req, res) => {
  const stats = await FileService.getFileStats();
  
  logger.info('Retrieved file statistics');
  return apiResponse.success(res, stats);
}));

module.exports = router;
