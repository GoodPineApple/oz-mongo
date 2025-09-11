const express = require('express');
const router = express.Router();

const appMainRoute = require('./app-main-router');
const appAuthRoute = require('./app-auth-router');

router.use('/main', appMainRoute);
router.use('/auth', appAuthRoute);

module.exports = router;