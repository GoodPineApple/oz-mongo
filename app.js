var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var morganLogger = require('morgan');
const logger = require('./util/logger');
const cors = require('cors');
var dotenv = require('dotenv');
dotenv.config();

var indexRouter = require('./routes/index-router');
var usersRouter = require('./routes/users-router');
const apiRouter = require('./routes/api');

const database = require('./util/database');

// MongoDB 연결 초기화
database.connect().catch(err => {
  logger.error(`Failed to connect to database: ${err.message}`);
  process.exit(1);
});

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(cors());

// HTTP 로깅 설정
app.use(logger.getHttpLogger());
app.use(logger.getErrorLogger());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', apiRouter);

// API 에러 핸들링
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// API 404 핸들러 (API 경로에만 적용)
app.use('/api/*', notFoundHandler);

// API 에러 핸들러
app.use('/api', errorHandler);

// catch 404 and forward to error handler (일반 페이지용)
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler (일반 페이지용)
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
