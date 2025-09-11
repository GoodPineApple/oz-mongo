const express = require('express');
const router = express.Router();
const { User } = require('../../models');
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');
const { authenticateToken } = require('../../middleware/authMiddleware');
const logger = require('../../util/logger');
const emailService = require('../../util/emailService');
const jwtService = require('../../util/jwtService');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with username/email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *           example:
 *             username: "user@example.com"
 *             password: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Email verification required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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

  // bcrypt를 사용한 비밀번호 검증
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return apiResponse.error(res, 'Invalid credentials', 401);
  }

  // 이메일 인증 여부 확인
  if (!user.isEmailVerified) {
    return apiResponse.error(res, 'Please verify your email before logging in. Check your email for the verification link.', 403, {
      requiresEmailVerification: true,
      email: user.email
    });
  }

  // JWT 토큰 생성
  const token = user.generateAuthToken();

  logger.success(`User logged in: ${user.username}`);

  // 프론트엔드가 기대하는 형식으로 응답
  return apiResponse.success(res, {
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      isEmailVerified: true
    },
    token
  });
}));

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: User registration
 *     description: Register a new user account
 *     tags: [Authentication]
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
 *         description: Registration successful
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
 *                         message:
 *                           type: string
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         requiresEmailVerification:
 *                           type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Username or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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

  // 이메일 인증 토큰 생성 (1시간 유효)
  const verificationToken = emailService.generateVerificationToken();
  const verificationExpires = new Date(Date.now() + 60 * 60 * 1000); // 1시간 후

  // 새 사용자 생성 (이메일 미인증 상태)
  // 비밀번호는 User 모델의 pre-save 미들웨어에서 자동으로 해시화됨
  const user = new User({
    username,
    email,
    password,
    isEmailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires
  });

  await user.save();

  // 인증 이메일 발송
  try {
    await emailService.sendVerificationEmail(email, username, verificationToken);
    logger.success(`Registration email sent to: ${email}`);
  } catch (emailError) {
    logger.error(`Failed to send verification email: ${emailError.message}`);
    // 이메일 발송 실패 시에도 사용자는 생성되지만 알림
  }

  logger.success(`New user registered (pending email verification): ${user.username}`);

  // 프론트엔드에 이메일 인증 필요 메시지 반환
  return apiResponse.success(res, {
    message: 'Registration successful! Please check your email to verify your account.',
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      isEmailVerified: false
    },
    requiresEmailVerification: true
  }, 'User registered successfully', 201);
}));

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Verify user email
 *     description: Verify user email with verification token
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email address
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *     responses:
 *       200:
 *         description: Email verification successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get('/verify-email', asyncHandler(async (req, res) => {
  const { email, token } = req.query;
  // const query = req.query;
  // const email = query.email;
  // const token = query.token;

  // 기본 유효성 검증
  if (!email || !token) {
    return apiResponse.error(res, 'Email and verification token are required', 400);
  }

  // 사용자 찾기
  const user = await User.findOne({ 
    email: email,
    emailVerificationToken: token
  });

  if (!user) {
    return apiResponse.error(res, 'Invalid verification token or email', 400);
  }

  // 토큰 만료 확인
  if (user.emailVerificationExpires < new Date()) {
    return apiResponse.error(res, 'Verification token has expired. Please register again.', 400);
  }

  // 이미 인증된 경우
  if (user.isEmailVerified) {
    return apiResponse.success(res, {
      message: 'Email is already verified. You can now login.',
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        isEmailVerified: true
      }
    });
  }

  // 이메일 인증 완료
  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  
  await user.save();

  // JWT 토큰 생성 (인증 완료 후 자동 로그인)
  const authToken = user.generateAuthToken();

  logger.success(`Email verified for user: ${user.username}`);

  // 프론트엔드가 기대하는 형식으로 응답 (자동 로그인)
  return apiResponse.success(res, {
    message: 'Email verification successful! You are now logged in.',
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      isEmailVerified: true
    },
    token: authToken
  });
}));

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     description: Resend email verification token to user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *             required: [email]
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/resend-verification', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return apiResponse.error(res, 'Email is required', 400);
  }

  const user = await User.findOne({ email: email });

  if (!user) {
    return apiResponse.error(res, 'User not found', 404);
  }

  if (user.isEmailVerified) {
    return apiResponse.error(res, 'Email is already verified', 400);
  }

  // 새로운 인증 토큰 생성
  const verificationToken = emailService.generateVerificationToken();
  const verificationExpires = new Date(Date.now() + 60 * 60 * 1000); // 1시간 후

  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = verificationExpires;
  await user.save();

  // 인증 이메일 재발송
  try {
    await emailService.sendVerificationEmail(email, user.username, verificationToken);
    logger.success(`Verification email resent to: ${email}`);
  } catch (emailError) {
    logger.error(`Failed to resend verification email: ${emailError.message}`);
    return apiResponse.error(res, 'Failed to send verification email', 500);
  }

  return apiResponse.success(res, {
    message: 'Verification email has been resent. Please check your email.'
  });
}));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Logout current user (client-side token removal)
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 */
router.post('/logout', asyncHandler(async (req, res) => {
  // 실제 환경에서는 토큰 블랙리스트 처리 또는 세션 무효화
  logger.info('User logout requested');
  
  // 프론트엔드는 단순히 성공 응답만 필요
  return res.status(200).json({ message: 'Logged out successfully' });
}));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     description: Get authenticated user information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  // JWT 미들웨어에서 사용자 정보가 req.user에 설정됨
  logger.info(`User info requested: ${req.user.username}`);

  return apiResponse.success(res, {
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    isEmailVerified: req.user.isEmailVerified
  });
}));

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh JWT token
 *     description: Refresh expired JWT token with refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *             required: [refreshToken]
 *           example:
 *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token refreshed successfully
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
 *                         token:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/refresh-token', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return apiResponse.error(res, 'Refresh token is required', 400);
  }

  // 리프레시 토큰 검증
  const decoded = jwtService.verifyToken(refreshToken);
  if (!decoded) {
    return apiResponse.error(res, 'Invalid refresh token', 401);
  }

  // 사용자 존재 확인
  const user = await User.findById(decoded.userId);
  if (!user || !user.isEmailVerified) {
    return apiResponse.error(res, 'User not found or email not verified', 401);
  }

  // 새로운 액세스 토큰 생성
  const newToken = user.generateAuthToken();
  const newRefreshToken = jwtService.generateRefreshToken({
    userId: user._id.toString()
  });

  logger.success(`Token refreshed for user: ${user.username}`);

  return apiResponse.success(res, {
    token: newToken,
    refreshToken: newRefreshToken,
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified
    }
  });
}));

module.exports = router;
