var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var morganLogger = require('morgan');
const logger = require('./util/logger');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
var dotenv = require('dotenv');
dotenv.config();

const indexRouter = require('./routes/index-router');
const apiRouter = require('./routes/api');
const appRouter = require('./routes/app');
const adminRouter = require('./routes/admin');

// Swagger 설정은 각 라우터에서 개별적으로 처리

const database = require('./util/database');
const { connectRedis } = require('./util/redisService');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 15분 동안 최대 100번 요청
  message: 'Too many requests, please try again later.'
});

// MongoDB 연결 초기화
database.connect().catch(err => {
  logger.error(`Failed to connect to database: ${err.message}`);
  process.exit(1);
});

// Redis 연결 초기화 및 테스트
connectRedis().catch(err => {
  logger.error(`Failed to connect to Redis: ${err.message}`);
  // Redis 연결 실패 시에도 서버는 계속 실행 (선택적 의존성)
});

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(limiter);
app.use(cors());

// HTTP 로깅 설정
app.use(logger.getHttpLogger());
app.use(logger.getErrorLogger());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger UI는 각 라우터에서 개별적으로 설정됨

app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/app', appRouter);
app.use('/admin', adminRouter);

// 통합 에러 핸들링
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 모든 요청에 대한 404 핸들러
app.use(notFoundHandler);

// 통합 에러 핸들러 (API와 웹 페이지 모두 처리)
app.use(errorHandler);




module.exports = app;
