const express = require('express');
const router = express.Router();
const { User } = require('../../models');
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../util/logger');

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Public
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
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  
  if (!user) {
    return apiResponse.notFound(res, 'User');
  }

  logger.info(`Retrieved user: ${user.username}`);
  return apiResponse.success(res, user);
}));

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Public
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
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Public
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { username, email } = req.body;
  
  const updateData = {};
  if (username) updateData.username = username;
  if (email) updateData.email = email;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return apiResponse.notFound(res, 'User');
  }

  logger.success(`User updated: ${user.username}`);
  return apiResponse.success(res, user, 'User updated successfully');
}));

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Public
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return apiResponse.notFound(res, 'User');
  }

  logger.success(`User deleted: ${user.username}`);
  return apiResponse.deleted(res);
}));

/**
 * @route   GET /api/users/:id/memos
 * @desc    Get user's memos
 * @access  Public
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
