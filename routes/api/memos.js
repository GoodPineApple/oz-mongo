const express = require('express');
const router = express.Router();
const { Memo, User, DesignTemplate } = require('../../models');
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../util/logger');

/**
 * @route   GET /api/memos
 * @desc    Get all memos with filters
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
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
    createdAt: memo.createdAt.toISOString(),
    updatedAt: memo.updatedAt.toISOString()
  }));

  logger.info(`Retrieved ${memos.length} memos (page ${page})`);
  
  // 프론트엔드는 직접 메모 배열을 기대하므로 formattedMemos만 반환
  return apiResponse.success(res, formattedMemos);
}));

/**
 * @route   GET /api/memos/:id
 * @desc    Get memo by ID
 * @access  Public
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
    createdAt: memo.createdAt.toISOString(),
    updatedAt: memo.updatedAt.toISOString()
  };

  logger.info(`Retrieved memo: ${memo.title}`);
  return apiResponse.success(res, formattedMemo);
}));

/**
 * @route   POST /api/memos
 * @desc    Create new memo
 * @access  Public
 */
router.post('/', asyncHandler(async (req, res) => {
  let { title, content, templateId, userId } = req.body;

  // 프론트엔드에서 userId를 '3'으로 하드코딩하는 경우 처리
  if (!userId) {
    userId = '1'; // 기본값 설정
  }

  // 기본 유효성 검증
  if (!title || !content || !templateId) {
    return apiResponse.error(res, 'Title, content, and templateId are required', 400);
  }

  // 사용자와 템플릿 존재 확인
  const [user, template] = await Promise.all([
    User.findById(userId),
    DesignTemplate.findById(templateId)
  ]);

  if (!user) {
    return apiResponse.error(res, 'User not found', 404);
  }

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
    createdAt: memo.createdAt.toISOString(),
    updatedAt: memo.updatedAt.toISOString()
  };
  
  logger.success(`New memo created: ${memo.title} by ${user.username}`);
  return apiResponse.success(res, createdMemo);
}));

/**
 * @route   PUT /api/memos/:id
 * @desc    Update memo
 * @access  Public
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
 * @route   DELETE /api/memos/:id
 * @desc    Delete memo
 * @access  Public
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const memo = await Memo.findByIdAndDelete(req.params.id);

  if (!memo) {
    return apiResponse.notFound(res, 'Memo');
  }

  logger.success(`Memo deleted: ${memo.title}`);
  return apiResponse.success(res, null, 'Memo deleted successfully');
}));

/**
 * @route   GET /api/memos/stats/overview
 * @desc    Get memos statistics
 * @access  Public
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
 * @route   POST /api/memos/:id/duplicate
 * @desc    Duplicate a memo
 * @access  Public
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
