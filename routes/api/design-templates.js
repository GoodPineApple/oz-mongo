const express = require('express');
const router = express.Router();
const { DesignTemplate } = require('../../models');
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../util/logger');

/**
 * @route   GET /api/design-templates
 * @desc    Get all design templates
 * @access  Public
 */

// localhost:3000/api/design-templates?page=1&limit=10&search=디자인
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  
  // 검색 쿼리 구성
  let query = {};
  if (search) {
    query = {
      name: { $regex: search, $options: 'i' }
    };
  }

  // 페이지네이션
  const skip = (page - 1) * limit;
  const templates = await DesignTemplate.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await DesignTemplate.countDocuments(query);

  logger.info(`Retrieved ${templates.length} design templates (page ${page})`);
  
  return apiResponse.success(res, {
    templates,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  });
}));

/**
 * @route   GET /api/design-templates/:id
 * @desc    Get design template by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const template = await DesignTemplate.findById(req.params.id);
  
  if (!template) {
    return apiResponse.notFound(res, 'Design Template');
  }

  logger.info(`Retrieved design template: ${template.name}`);
  return apiResponse.success(res, template);
}));

/**
 * @route   POST /api/design-templates
 * @desc    Create new design template
 * @access  Public
 */
router.post('/', asyncHandler(async (req, res) => {
  const { name, backgroundColor, textColor, borderStyle, shadowStyle, preview } = req.body;

  // 기본 유효성 검증
  if (!name || !backgroundColor || !textColor || !borderStyle || !shadowStyle || !preview) {
    return apiResponse.error(res, 'All template fields are required', 400);
  }

  const template = new DesignTemplate({
    name,
    backgroundColor,
    textColor,
    borderStyle,
    shadowStyle,
    preview
  });

  await template.save();
  
  logger.success(`New design template created: ${template.name}`);
  return apiResponse.success(res, template, 'Design template created successfully', 201);
}));

/**
 * @route   PUT /api/design-templates/:id
 * @desc    Update design template
 * @access  Public
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, backgroundColor, textColor, borderStyle, shadowStyle, preview } = req.body;
  
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
  if (textColor !== undefined) updateData.textColor = textColor;
  if (borderStyle !== undefined) updateData.borderStyle = borderStyle;
  if (shadowStyle !== undefined) updateData.shadowStyle = shadowStyle;
  if (preview !== undefined) updateData.preview = preview;

  const template = await DesignTemplate.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!template) {
    return apiResponse.notFound(res, 'Design Template');
  }

  logger.success(`Design template updated: ${template.name}`);
  return apiResponse.success(res, template, 'Design template updated successfully');
}));

/**
 * @route   DELETE /api/design-templates/:id
 * @desc    Delete design template
 * @access  Public
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const template = await DesignTemplate.findByIdAndDelete(req.params.id);

  if (!template) {
    return apiResponse.notFound(res, 'Design Template');
  }

  logger.success(`Design template deleted: ${template.name}`);
  return apiResponse.success(res, null, 'Design template deleted successfully');
}));

/**
 * @route   GET /api/design-templates/:id/memos
 * @desc    Get memos using this template
 * @access  Public
 */
router.get('/:id/memos', asyncHandler(async (req, res) => {
  const { Memo } = require('../../models');
  const { page = 1, limit = 10 } = req.query;

  // 템플릿 존재 확인
  const template = await DesignTemplate.findById(req.params.id);
  if (!template) {
    return apiResponse.notFound(res, 'Design Template');
  }

  const skip = (page - 1) * limit;
  const memos = await Memo.find({ templateId: req.params.id })
    .populate('userId', 'username')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Memo.countDocuments({ templateId: req.params.id });

  logger.info(`Retrieved ${memos.length} memos using template: ${template.name}`);
  
  return apiResponse.success(res, {
    memos,
    template: {
      id: template.id,
      name: template.name,
      preview: template.preview
    },
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  });
}));

/**
 * @route   GET /api/design-templates/popular
 * @desc    Get most used design templates
 * @access  Public
 */
router.get('/stats/popular', asyncHandler(async (req, res) => {
  const { Memo } = require('../../models');
  const { limit = 5 } = req.query;

  // 각 템플릿별 사용 횟수 집계
  const popularTemplates = await Memo.aggregate([
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
        count: 1,
        name: '$template.name',
        preview: '$template.preview',
        backgroundColor: '$template.backgroundColor'
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: parseInt(limit)
    }
  ]);

  logger.info(`Retrieved ${popularTemplates.length} popular templates`);
  return apiResponse.success(res, popularTemplates);
}));

module.exports = router;
