const logger = require('../util/logger');

// API 응답 헬퍼 함수들
const apiResponse = {
  success: (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json(data);
    // return res.status(statusCode).json({
    //   success: true,
    //   message,
    //   data
    // });
  },

  error: (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  },

  validationError: (res, errors) => {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  },

  notFound: (res, resource = 'Resource') => {
    return res.status(404).json({
      success: false,
      message: `${resource} not found`
    });
  }
};

// 에러 처리 미들웨어
const errorHandler = (err, req, res, next) => {
  logger.error(`API Error: ${err.message}`, '🚨');
  
  // Mongoose 유효성 검증 에러
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
    return apiResponse.validationError(res, errors);
  }

  // Mongoose 중복 키 에러
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return apiResponse.error(res, `${field} '${value}' already exists`, 409);
  }

  // Mongoose CastError (잘못된 ObjectId)
  if (err.name === 'CastError') {
    return apiResponse.error(res, 'Invalid ID format', 400);
  }

  // JWT 에러들 (나중에 인증 구현 시 사용)
  if (err.name === 'JsonWebTokenError') {
    return apiResponse.error(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return apiResponse.error(res, 'Token expired', 401);
  }

  // 기본 에러
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  return apiResponse.error(res, message, statusCode);
};

// 404 에러 핸들러
const notFoundHandler = (req, res) => {
  return apiResponse.error(res, `Route ${req.originalUrl} not found`, 404);
};

// 비동기 에러 캐처 래퍼
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  apiResponse,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
