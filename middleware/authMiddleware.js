const jwtService = require('../util/jwtService');
const { User } = require('../models');
const { apiResponse } = require('./errorHandler');
const logger = require('../util/logger');

/**
 * JWT 토큰 인증 미들웨어
 * Authorization 헤더에서 토큰을 추출하고 검증합니다.
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);

    if (!token) {
      return apiResponse.error(res, 'Access token is required', 401);
    }

    // 토큰 검증
    const decoded = jwtService.verifyToken(token);
    if (!decoded) {
      return apiResponse.error(res, 'Invalid or expired token', 401);
    }

    // 사용자 존재 확인
    const user = await User.findById(decoded.userId);
    if (!user) {
      return apiResponse.error(res, 'User not found', 401);
    }

    // 이메일 인증 여부 확인
    if (!user.isEmailVerified) {
      return apiResponse.error(res, 'Please verify your email before accessing this resource', 403);
    }

    // 요청 객체에 사용자 정보 추가
    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified
    };

    req.token = token;
    
    logger.debug(`User authenticated: ${user.username}`);
    next();
  } catch (error) {
    logger.error(`Authentication failed: ${error.message}`);
    return apiResponse.error(res, 'Authentication failed', 401);
  }
};

/**
 * 선택적 인증 미들웨어
 * 토큰이 있으면 인증하고, 없으면 그냥 통과시킵니다.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);

    if (!token) {
      // 토큰이 없으면 그냥 통과
      req.user = null;
      return next();
    }

    // 토큰 검증
    const decoded = jwtService.verifyToken(token);
    if (!decoded) {
      req.user = null;
      return next();
    }

    // 사용자 존재 확인
    const user = await User.findById(decoded.userId);
    if (!user || !user.isEmailVerified) {
      req.user = null;
      return next();
    }

    // 요청 객체에 사용자 정보 추가
    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified
    };

    req.token = token;
    next();
  } catch (error) {
    // 에러가 발생해도 그냥 통과
    req.user = null;
    next();
  }
};

/**
 * 관리자 권한 확인 미들웨어 (향후 확장용)
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return apiResponse.error(res, 'Authentication required', 401);
  }

  // 향후 사용자 역할 시스템 구현 시 사용
  // if (req.user.role !== 'admin') {
  //   return apiResponse.error(res, 'Admin access required', 403);
  // }

  next();
};

/**
 * 자신의 리소스만 접근 가능하도록 하는 미들웨어
 */
const requireOwnership = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return apiResponse.error(res, 'Authentication required', 401);
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    
    if (req.user.id !== resourceUserId) {
      return apiResponse.error(res, 'Access denied. You can only access your own resources.', 403);
    }

    next();
  };
};

/**
 * 토큰 갱신 미들웨어 (향후 구현)
 */
const refreshTokenMiddleware = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
    
    if (!refreshToken) {
      return apiResponse.error(res, 'Refresh token is required', 400);
    }

    // 리프레시 토큰 검증 로직 구현
    // const decoded = jwtService.verifyToken(refreshToken);
    // ...

    next();
  } catch (error) {
    logger.error(`Token refresh failed: ${error.message}`);
    return apiResponse.error(res, 'Token refresh failed', 401);
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireOwnership,
  refreshTokenMiddleware
};
