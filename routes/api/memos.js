const express = require('express');
const router = express.Router();
const { Memo, User, DesignTemplate } = require('../../models');
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');
const { authenticateToken, optionalAuth } = require('../../middleware/authMiddleware');
const { uploadSingleImage, handleUploadError } = require('../../middleware/multerConfig');
const logger = require('../../util/logger');
const path = require('path');

const SERVER_ORIGIN = process.env.SERVER_ORIGIN || 'http://localhost:3001';

/**
 * @swagger
 * /api/memos:
 *   get:
 *     summary: Get all memos
 *     description: Get all memos with optional filters and pagination
 *     tags: [Memos]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
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
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: templateId
 *         schema:
 *           type: string
 *         description: Filter by template ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and content
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Memos retrieved successfully
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
 *                         $ref: '#/components/schemas/Memo'
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    userId, 
    templateId, 
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;
  
  // 검색 및 필터 쿼리 구성
  let query = {};
  
  if (userId) query.userId = userId;
  if (templateId) query.templateId = templateId;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ];
  }

  // 정렬 옵션
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // 페이지네이션
  const skip = (page - 1) * limit;
  const memos = await Memo.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort(sortOptions);

  const total = await Memo.countDocuments(query);

  // 프론트엔드가 기대하는 형식으로 변환
  const formattedMemos = memos.map(memo => ({
    id: memo._id.toString(),
    title: memo.title,
    content: memo.content,
    templateId: memo.templateId.toString(),
    userId: memo.userId.toString(),
    imageUrl: `${SERVER_ORIGIN}${memo.imageUrl}`,
    createdAt: memo.createdAt.toISOString(),
    updatedAt: memo.updatedAt.toISOString()
  }));

  logger.info(`Retrieved ${memos.length} memos (page ${page})`);
  
  // 프론트엔드는 직접 메모 배열을 기대하므로 formattedMemos만 반환
  return apiResponse.success(res, formattedMemos);
}));

/**
 * @swagger
 * /api/memos/{id}:
 *   get:
 *     summary: Get memo by ID
 *     description: Get a specific memo by its ID
 *     tags: [Memos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Memo ID
 *     responses:
 *       200:
 *         description: Memo retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Memo'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const memo = await Memo.findById(req.params.id);
  
  if (!memo) {
    return apiResponse.notFound(res, 'Memo');
  }

  // 프론트엔드가 기대하는 형식으로 변환
  const formattedMemo = {
    id: memo._id.toString(),
    title: memo.title,
    content: memo.content,
    templateId: memo.templateId.toString(),
    userId: memo.userId.toString(),
    imageUrl: `${SERVER_ORIGIN}${memo.imageUrl}`,
    createdAt: memo.createdAt.toISOString(),
    updatedAt: memo.updatedAt.toISOString()
  };

  logger.info(`Retrieved memo: ${memo.title}`);
  return apiResponse.success(res, formattedMemo);
}));

/**
 * @swagger
 * /api/memos:
 *   post:
 *     summary: Create new memo
 *     description: Create a new memo (requires authentication)
 *     tags: [Memos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MemoInput'
 *           example:
 *             title: "My First Memo"
 *             content: "This is the content of my memo"
 *             templateId: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Memo created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Memo'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Design template not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { title, content, templateId } = req.body;
  
  // 인증된 사용자의 ID 사용
  const userId = req.user.id;

  // 기본 유효성 검증
  if (!title || !content || !templateId) {
    return apiResponse.error(res, 'Title, content, and templateId are required', 400);
  }

  // 템플릿 존재 확인 (사용자는 이미 인증됨)
  const template = await DesignTemplate.findById(templateId);

  if (!template) {
    return apiResponse.error(res, 'Design template not found', 404);
  }

  const memo = new Memo({
    title,
    content,
    templateId,
    userId
  });

  await memo.save();
  
  // 프론트엔드가 기대하는 형식으로 메모 반환 (populate 없이)
  const createdMemo = {
    id: memo._id.toString(),
    title: memo.title,
    content: memo.content,
    templateId: memo.templateId.toString(),
    userId: memo.userId.toString(),
    imageUrl: memo.imageUrl,
    createdAt: memo.createdAt.toISOString(),
    updatedAt: memo.updatedAt.toISOString()
  };
  
  logger.success(`New memo created: ${memo.title} by ${req.user.username}`);
  return apiResponse.success(res, createdMemo);
}));

/**
 * @swagger
 * /api/memos/{id}:
 *   put:
 *     summary: Update memo
 *     description: Update an existing memo
 *     tags: [Memos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Memo ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               content:
 *                 type: string
 *                 maxLength: 10000
 *               templateId:
 *                 type: string
 *           example:
 *             title: "Updated Memo Title"
 *             content: "Updated memo content"
 *     responses:
 *       200:
 *         description: Memo updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Memo'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { title, content, templateId } = req.body;
  
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (templateId !== undefined) {
    // 템플릿 존재 확인
    const template = await DesignTemplate.findById(templateId);
    if (!template) {
      return apiResponse.error(res, 'Design template not found', 404);
    }
    updateData.templateId = templateId;
  }

  const memo = await Memo.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('userId', 'username email')
   .populate('templateId', 'name preview backgroundColor textColor');

  if (!memo) {
    return apiResponse.notFound(res, 'Memo');
  }

  logger.success(`Memo updated: ${memo.title}`);
  return apiResponse.success(res, memo, 'Memo updated successfully');
}));

/**
 * @swagger
 * /api/memos/{id}:
 *   delete:
 *     summary: Delete memo
 *     description: Delete a memo by its ID
 *     tags: [Memos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Memo ID
 *     responses:
 *       200:
 *         description: Memo deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const memo = await Memo.findByIdAndDelete(req.params.id);

  if (!memo) {
    return apiResponse.notFound(res, 'Memo');
  }

  logger.success(`Memo deleted: ${memo.title}`);
  return apiResponse.deleted(res);
}));

/**
 * @swagger
 * /api/memos/with-image:
 *   post:
 *     summary: Create memo with image
 *     description: Create a new memo with image upload (requires authentication)
 *     tags: [Memos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               content:
 *                 type: string
 *                 maxLength: 10000
 *               templateId:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *             required: [title, content, templateId]
 *     responses:
 *       200:
 *         description: Memo with image created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Memo'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Design template not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/with-image', authenticateToken, (req, res, next) => {
  uploadSingleImage(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    next();
  });
}, asyncHandler(async (req, res) => {
  const { title, content, templateId } = req.body;
  
  // 인증된 사용자의 ID 사용
  const userId = req.user.id;

  // 기본 유효성 검증
  if (!title || !content || !templateId) {
    return apiResponse.error(res, 'Title, content, and templateId are required', 400);
  }

  // 템플릿 존재 확인 (사용자는 이미 인증됨)
  const template = await DesignTemplate.findById(templateId);

  if (!template) {
    return apiResponse.error(res, 'Design template not found', 404);
  }

  // 이미지 URL 생성 (업로드된 파일이 있는 경우)
  let imageUrl = null;
  if (req.file) {
    // 상대 경로로 저장 (uploads 폴더 기준)
    const relativePath = req.file.path.replace(path.join(__dirname, '../../'), '');
    imageUrl = `/${relativePath.replace(/\\/g, '/')}`;  // Windows 경로 구분자 처리
  }

  const memo = new Memo({
    title,
    content,
    templateId,
    userId,
    imageUrl
  });

  await memo.save();
  
  // 프론트엔드가 기대하는 형식으로 메모 반환 (populate 없이)
  const createdMemo = {
    id: memo._id.toString(),
    title: memo.title,
    content: memo.content,
    templateId: memo.templateId.toString(),
    userId: memo.userId.toString(),
    imageUrl: memo.imageUrl,
    createdAt: memo.createdAt.toISOString(),
    updatedAt: memo.updatedAt.toISOString()
  };
  
  logger.success(`New memo with image created: ${memo.title} by ${req.user.username}`);
  return apiResponse.success(res, createdMemo);
}));

/**
 * @swagger
 * /api/memos/stats/overview:
 *   get:
 *     summary: Get memos statistics
 *     description: Get comprehensive statistics about memos, users, and templates
 *     tags: [Memos]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                         totals:
 *                           type: object
 *                           properties:
 *                             memos:
 *                               type: integer
 *                             users:
 *                               type: integer
 *                             templates:
 *                               type: integer
 *                         recentMemos:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Memo'
 *                         memosByTemplate:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               templateId:
 *                                 type: string
 *                               templateName:
 *                                 type: string
 *                               preview:
 *                                 type: string
 *                               count:
 *                                 type: integer
 */
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const [
    totalMemos,
    totalUsers,
    totalTemplates,
    recentMemos,
    memosByTemplate
  ] = await Promise.all([
    Memo.countDocuments(),
    User.countDocuments(),
    DesignTemplate.countDocuments(),
    Memo.find()
      .populate('userId', 'username')
      .populate('templateId', 'name preview')
      .sort({ createdAt: -1 })
      .limit(5),
    Memo.aggregate([
      {
        $group: {
          _id: '$templateId',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'designtemplates',
          localField: '_id',
          foreignField: '_id',
          as: 'template'
        }
      },
      {
        $unwind: '$template'
      },
      {
        $project: {
          _id: 0,
          templateId: '$_id',
          templateName: '$template.name',
          preview: '$template.preview',
          count: 1
        }
      },
      {
        $sort: { count: -1 }
      }
    ])
  ]);

  logger.info('Retrieved memo statistics overview');
  
  return apiResponse.success(res, {
    totals: {
      memos: totalMemos,
      users: totalUsers,
      templates: totalTemplates
    },
    recentMemos,
    memosByTemplate
  });
}));

/**
 * @swagger
 * /api/memos/{id}/duplicate:
 *   post:
 *     summary: Duplicate memo
 *     description: Create a copy of an existing memo
 *     tags: [Memos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Original memo ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *             required: [userId]
 *           example:
 *             userId: "507f1f77bcf86cd799439011"
 *     responses:
 *       201:
 *         description: Memo duplicated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Memo'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:id/duplicate', asyncHandler(async (req, res) => {
  const originalMemo = await Memo.findById(req.params.id);
  
  if (!originalMemo) {
    return apiResponse.notFound(res, 'Memo');
  }

  const { userId } = req.body;
  if (!userId) {
    return apiResponse.error(res, 'userId is required for duplication', 400);
  }

  // 사용자 존재 확인
  const user = await User.findById(userId);
  if (!user) {
    return apiResponse.error(res, 'User not found', 404);
  }

  const duplicatedMemo = new Memo({
    title: `${originalMemo.title} (Copy)`,
    content: originalMemo.content,
    templateId: originalMemo.templateId,
    userId: userId
  });

  await duplicatedMemo.save();

  const populatedMemo = await Memo.findById(duplicatedMemo._id)
    .populate('userId', 'username email')
    .populate('templateId', 'name preview backgroundColor textColor');

  logger.success(`Memo duplicated: ${originalMemo.title} -> ${duplicatedMemo.title}`);
  return apiResponse.success(res, populatedMemo, 'Memo duplicated successfully', 201);
}));

module.exports = router;
