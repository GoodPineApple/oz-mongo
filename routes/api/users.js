const express = require('express');
const router = express.Router();
const { User } = require('../../models');
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../util/logger');
const { getRedisClient } = require('../../util/redisService');

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Get all users with optional search and pagination
 *     tags: [Users]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in username and email
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                         users:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/User'
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationResponse'
 */
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  
  // 검색 쿼리 구성
  let query = {};
  if (search) {
    query = {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    };
  }

  // 페이지네이션
  const skip = (page - 1) * limit;
  const users = await User.find(query)
    .select('-password') // 비밀번호 제외
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(query);

  logger.info(`Retrieved ${users.length} users (page ${page})`);
  
  return apiResponse.success(res, {
    users,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  });
}));

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Get a specific user by their ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const cacheKey = `user:${userId}`;
  
  try {
    // Redis에서 캐시된 사용자 정보 조회 (hash 사용)
    const redisClient = getRedisClient();
    const cachedUser = await redisClient.hGetAll(cacheKey);
    
    if (cachedUser && Object.keys(cachedUser).length > 0) {
      // 캐시에 데이터가 있으면 캐시된 데이터 반환
      const user = {
        _id: cachedUser._id,
        username: cachedUser.username,
        email: cachedUser.email,
        createdAt: new Date(cachedUser.createdAt),
        updatedAt: new Date(cachedUser.updatedAt)
      };
      logger.info(`User retrieved from cache: ${user.username}`);
      return apiResponse.success(res, user);
    }
    
    // 캐시에 데이터가 없으면 DB에서 조회
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return apiResponse.notFound(res, 'User');
    }
    
    // DB에서 조회한 데이터를 Redis hash에 저장하고 60초간 캐시
    const userData = user.toObject();
    await redisClient.hSet(cacheKey, {
      _id: userData._id.toString(),
      username: userData.username,
      email: userData.email,
      createdAt: userData.createdAt.toISOString(),
      updatedAt: userData.updatedAt.toISOString()
    });
    await redisClient.expire(cacheKey, 60);
    
    logger.info(`User retrieved from DB and cached: ${user.username}`);
    return apiResponse.success(res, user);
    
  } catch (redisError) {
    // Redis 오류 시 DB에서 직접 조회 (fallback)
    logger.warn(`Redis error, falling back to DB: ${redisError.message}`);
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return apiResponse.notFound(res, 'User');
    }
    
    logger.info(`User retrieved from DB (Redis fallback): ${user.username}`);
    return apiResponse.success(res, user);
  }
}));

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create new user
 *     description: Create a new user account
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *           example:
 *             username: "newuser"
 *             email: "user@example.com"
 *             password: "password123"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/', asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // 기본 유효성 검증
  if (!username || !email || !password) {
    return apiResponse.error(res, 'Username, email, and password are required', 400);
  }

  const user = new User({
    username,
    email,
    password // 실제 환경에서는 해시화 필요
  });

  await user.save();
  
  logger.success(`New user created: ${user.username}`);
  return apiResponse.success(res, user, 'User created successfully', 201);
}));

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     description: Update user information
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               email:
 *                 type: string
 *                 format: email
 *           example:
 *             username: "updateduser"
 *             email: "updated@example.com"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { username, email } = req.body;
  const cacheKey = `user:${userId}`;
  
  const updateData = {};
  if (username) updateData.username = username;
  if (email) updateData.email = email;

  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return apiResponse.notFound(res, 'User');
  }

  // 사용자 정보가 업데이트되었으므로 hash 캐시 무효화
  try {
    const redisClient = getRedisClient();
    await redisClient.del(cacheKey);
    logger.info(`User hash cache invalidated for: ${user.username}`);
  } catch (redisError) {
    logger.warn(`Failed to invalidate hash cache: ${redisError.message}`);
  }

  logger.success(`User updated: ${user.username}`);
  return apiResponse.success(res, user, 'User updated successfully');
}));

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Delete a user by their ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const cacheKey = `user:${userId}`;
  
  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    return apiResponse.notFound(res, 'User');
  }

  // 사용자가 삭제되었으므로 hash 캐시 무효화
  try {
    const redisClient = getRedisClient();
    await redisClient.del(cacheKey);
    logger.info(`User hash cache invalidated for deleted user: ${user.username}`);
  } catch (redisError) {
    logger.warn(`Failed to invalidate hash cache: ${redisError.message}`);
  }

  logger.success(`User deleted: ${user.username}`);
  return apiResponse.deleted(res);
}));

/**
 * @swagger
 * /api/users/{id}/memos:
 *   get:
 *     summary: Get user's memos
 *     description: Get all memos created by a specific user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
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
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: User's memos retrieved successfully
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
 *                         pagination:
 *                           $ref: '#/components/schemas/PaginationResponse'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id/memos', asyncHandler(async (req, res) => {
  const { Memo } = require('../../models');
  const { page = 1, limit = 10 } = req.query;

  // 사용자 존재 확인
  const user = await User.findById(req.params.id);
  if (!user) {
    return apiResponse.notFound(res, 'User');
  }

  const skip = (page - 1) * limit;
  const memos = await Memo.find({ userId: req.params.id })
    .populate('templateId', 'name preview')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Memo.countDocuments({ userId: req.params.id });

  logger.info(`Retrieved ${memos.length} memos for user: ${user.username}`);
  
  return apiResponse.success(res, {
    memos,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  });
}));

module.exports = router;
