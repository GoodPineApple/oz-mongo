const express = require('express');
const router = express.Router();
const { DesignTemplate } = require('../../models');
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../util/logger');

/**
 * @swagger
 * /api/design-templates:
 *   get:
 *     summary: Get all design templates
 *     description: Get all design templates with optional search and pagination
 *     tags: [Design Templates]
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
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in template names
 *     responses:
 *       200:
 *         description: Design templates retrieved successfully
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
 *                         $ref: '#/components/schemas/DesignTemplate'
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

  // 프론트엔드가 기대하는 형식으로 변환
  const formattedTemplates = templates.map(template => ({
    id: template._id.toString(),
    name: template.name,
    backgroundColor: template.backgroundColor,
    textColor: template.textColor,
    borderStyle: template.borderStyle,
    shadowStyle: template.shadowStyle,
    preview: template.preview
  }));

  logger.info(`Retrieved ${templates.length} design templates (page ${page})`);
  
  // 프론트엔드는 직접 배열을 기대하므로 formattedTemplates만 반환
  return apiResponse.success(res, formattedTemplates);
}));

/**
 * @swagger
 * /api/design-templates/{id}:
 *   get:
 *     summary: Get design template by ID
 *     description: Get a specific design template by its ID
 *     tags: [Design Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Design template ID
 *     responses:
 *       200:
 *         description: Design template retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DesignTemplate'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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
 * @swagger
 * /api/design-templates:
 *   post:
 *     summary: Create new design template
 *     description: Create a new design template
 *     tags: [Design Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DesignTemplateInput'
 *           example:
 *             name: "Modern Blue"
 *             backgroundColor: "#3498db"
 *             textColor: "#ffffff"
 *             borderStyle: "2px solid #2980b9"
 *             shadowStyle: "0 4px 8px rgba(0,0,0,0.1)"
 *             preview: "🔷"
 *     responses:
 *       201:
 *         description: Design template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DesignTemplate'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
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
 * @swagger
 * /api/design-templates/{id}:
 *   put:
 *     summary: Update design template
 *     description: Update an existing design template
 *     tags: [Design Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Design template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               backgroundColor:
 *                 type: string
 *                 pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *               textColor:
 *                 type: string
 *                 pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *               borderStyle:
 *                 type: string
 *                 maxLength: 200
 *               shadowStyle:
 *                 type: string
 *                 maxLength: 200
 *               preview:
 *                 type: string
 *                 maxLength: 10
 *           example:
 *             name: "Updated Modern Blue"
 *             backgroundColor: "#2980b9"
 *     responses:
 *       200:
 *         description: Design template updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DesignTemplate'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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
 * @swagger
 * /api/design-templates/{id}:
 *   delete:
 *     summary: Delete design template
 *     description: Delete a design template by its ID
 *     tags: [Design Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Design template ID
 *     responses:
 *       200:
 *         description: Design template deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const template = await DesignTemplate.findByIdAndDelete(req.params.id);

  if (!template) {
    return apiResponse.notFound(res, 'Design Template');
  }

  logger.success(`Design template deleted: ${template.name}`);
  return apiResponse.deleted(res);
}));

/**
 * @swagger
 * /api/design-templates/{id}/memos:
 *   get:
 *     summary: Get memos using this template
 *     description: Get all memos that use a specific design template
 *     tags: [Design Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Design template ID
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
 *     responses:
 *       200:
 *         description: Memos using template retrieved successfully
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
 *                         memos:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Memo'
 *                         template:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             preview:
 *                               type: string
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationResponse'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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
 * @swagger
 * /api/design-templates/stats/popular:
 *   get:
 *     summary: Get popular design templates
 *     description: Get the most used design templates based on memo count
 *     tags: [Design Templates]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of popular templates to return
 *     responses:
 *       200:
 *         description: Popular templates retrieved successfully
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
 *                         type: object
 *                         properties:
 *                           templateId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           preview:
 *                             type: string
 *                           backgroundColor:
 *                             type: string
 *                           count:
 *                             type: integer
 *                             description: Number of memos using this template
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
