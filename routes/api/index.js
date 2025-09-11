const express = require('express');
const router = express.Router();
const logger = require('../../util/logger');

// Swagger 설정
const swaggerUi = require('swagger-ui-express');
const apiSpecs = require('../../swagger/api-swagger');

// API 라우터들 import
const authRouter = require('./auth');
const usersRouter = require('./users');
const designTemplatesRouter = require('./design-templates');
const memosRouter = require('./memos');
const filesRouter = require('./files');

// API 정보 엔드포인트
// Swagger UI 설정 - /api 경로에서 접근 가능
// 독립적인 Swagger UI 인스턴스 생성
const apiSwaggerOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Oz-Mongo API Documentation",
  swaggerOptions: {
    url: '/api/docs/swagger.json'
  }
};

router.get('/docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(apiSpecs);
});

router.use('/docs', swaggerUi.serveFiles(apiSpecs), swaggerUi.setup(apiSpecs, apiSwaggerOptions));

// API 라우터 등록
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/templates', designTemplatesRouter);
router.use('/memos', memosRouter);
router.use('/files', filesRouter);

module.exports = router;
