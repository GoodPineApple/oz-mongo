const express = require('express');
const router = express.Router();
const { User } = require('../../models');
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../util/logger');

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // 기본 유효성 검증
  if (!username || !password) {
    return apiResponse.error(res, 'Username and password are required', 400);
  }

  // 사용자 찾기 (username 또는 email로 로그인 가능)
  const user = await User.findOne({
    $or: [
      { username: username },
      { email: username }
    ]
  });

  if (!user) {
    return apiResponse.error(res, 'Invalid credentials', 401);
  }

  // 실제 환경에서는 bcrypt로 비밀번호 검증 필요
  // const isPasswordValid = await bcrypt.compare(password, user.password);
  const isPasswordValid = password === user.password; // 임시로 평문 비교

  if (!isPasswordValid) {
    return apiResponse.error(res, 'Invalid credentials', 401);
  }

  // JWT 토큰 생성 (실제 환경에서는 JWT 라이브러리 사용)
  const token = `mock-jwt-token-${user._id}-${Date.now()}`;

  logger.success(`User logged in: ${user.username}`);

  // 프론트엔드가 기대하는 형식으로 응답
  return apiResponse.success(res, {
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email
    },
    token
  });
}));

/**
 * @route   POST /api/auth/register
 * @desc    User registration
 * @access  Public
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // 기본 유효성 검증
  if (!username || !email || !password) {
    return apiResponse.error(res, 'Username, email, and password are required', 400);
  }

  // 중복 사용자 확인
  const existingUser = await User.findOne({
    $or: [
      { username: username },
      { email: email }
    ]
  });

  if (existingUser) {
    if (existingUser.username === username) {
      return apiResponse.error(res, 'Username already exists', 409);
    }
    if (existingUser.email === email) {
      return apiResponse.error(res, 'Email already exists', 409);
    }
  }

  // 새 사용자 생성
  const user = new User({
    username,
    email,
    password // 실제 환경에서는 해시화 필요
  });

  await user.save();

  // JWT 토큰 생성
  const token = `mock-jwt-token-${user._id}-${Date.now()}`;

  logger.success(`New user registered: ${user.username}`);

  // 프론트엔드가 기대하는 형식으로 응답
  return apiResponse.success(res, {
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email
    },
    token
  }, 'User registered successfully', 201);
}));

/**
 * @route   POST /api/auth/logout
 * @desc    User logout
 * @access  Public
 */
router.post('/logout', asyncHandler(async (req, res) => {
  // 실제 환경에서는 토큰 블랙리스트 처리 또는 세션 무효화
  logger.info('User logout requested');
  
  // 프론트엔드는 단순히 성공 응답만 필요
  return res.status(200).json({ message: 'Logged out successfully' });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private (나중에 JWT 미들웨어 추가)
 */
router.get('/me', asyncHandler(async (req, res) => {
  // 실제 환경에서는 JWT에서 사용자 ID 추출
  // 임시로 하드코딩된 사용자 반환
  const userId = '1'; // JWT에서 추출해야 할 값
  
  const user = await User.findById(userId);
  
  if (!user) {
    return apiResponse.error(res, 'User not found', 404);
  }

  logger.info(`User info requested: ${user.username}`);

  return apiResponse.success(res, {
    id: user._id.toString(),
    username: user.username,
    email: user.email
  });
}));

module.exports = router;
