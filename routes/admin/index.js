const express = require('express');
const router = express.Router();

const adminMainRoute = require('./admin-main-router');

router.use('/main', adminMainRoute);

module.exports = router;