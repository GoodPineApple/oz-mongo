const express = require('express');
const router = express.Router();

// Swagger 설정
const swaggerUi = require('swagger-ui-express');
const appSpecs = require('../../swagger/app-swagger');

const appMainRoute = require('./app-main-router');
const appAuthRoute = require('./app-auth-router');

// Swagger UI 설정 - /app 경로에서 접근 가능
// 독립적인 Swagger UI 인스턴스 생성
const appSwaggerOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Oz-Mongo App Documentation",
  swaggerOptions: {
    url: '/app/docs/swagger.json'
  }
};

if(process.env.NODE_ENV === 'development') {
    router.get('/docs/swagger.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(appSpecs);
    });    
    router.use('/docs', swaggerUi.serveFiles(appSpecs), swaggerUi.setup(appSpecs, appSwaggerOptions));
}

router.use('/main', appMainRoute);
router.use('/auth', appAuthRoute);

module.exports = router;