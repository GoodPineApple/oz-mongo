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

  // DELETE 요청 성공 시 204 No Content 응답
  deleted: (res) => {
    return res.status(204).send();
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

// 통합 에러 처리 미들웨어
const errorHandler = (err, req, res, next) => {
  const isApiRoute = req.originalUrl.startsWith('/api');
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // 개발 환경에서 상세한 에러 로깅 (스택 트레이스 포함)
  if (isDevelopment) {
    logger.error(`Error in ${req.method} ${req.originalUrl}`, '🚨', 'ERROR_HANDLER', err);
  } else {
    logger.error(`Error: ${err.message}`, '🚨', 'ERROR_HANDLER');
  }

  // API 라우트인 경우 JSON 응답
  if (isApiRoute) {
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

    // JWT 에러들
    if (err.name === 'JsonWebTokenError') {
      return apiResponse.error(res, 'Invalid token', 401);
    }

    if (err.name === 'TokenExpiredError') {
      return apiResponse.error(res, 'Token expired', 401);
    }

    // 기본 에러 (API)
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';
    
    return apiResponse.error(res, message, statusCode);
  } else {
    // 웹 페이지 라우트인 경우 HTML 응답
    res.locals.message = err.message;
    res.locals.error = isDevelopment ? err : {};
    
    res.status(err.status || 500);
    res.render('error');
  }
};

// 통합 404 에러 핸들러
const notFoundHandler = (req, res, next) => {
  const isApiRoute = req.originalUrl.startsWith('/api');
  
  if (isApiRoute) {
    // API 라우트인 경우 JSON 응답
    return apiResponse.error(res, `Route ${req.originalUrl} not found`, 404);
  } else {
    // 웹 페이지 라우트인 경우 404 에러 생성하여 에러 핸들러로 전달
    const createError = require('http-errors');
    next(createError(404));
  }
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
