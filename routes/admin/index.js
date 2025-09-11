const express = require('express');
const router = express.Router();

// Swagger 설정
const swaggerUi = require('swagger-ui-express');
const adminSpecs = require('../../swagger/admin-swagger');

const adminMainRoute = require('./admin-main-router');

// Swagger UI 설정 - /admin 경로에서 접근 가능
// 독립적인 Swagger UI 인스턴스 생성
const adminSwaggerOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Oz-Mongo Admin Documentation",
  swaggerOptions: {
    url: '/admin/docs/swagger.json'
  }
};

router.get('/docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(adminSpecs);
});

// Swagger 라우터를 먼저 설정 (더 구체적인 경로)
router.use('/docs', swaggerUi.serveFiles(adminSpecs), swaggerUi.setup(adminSpecs, adminSwaggerOptions));

// 일반 라우터는 나중에 설정
router.use('/main', adminMainRoute);
router.use('/', adminMainRoute);

module.exports = router;