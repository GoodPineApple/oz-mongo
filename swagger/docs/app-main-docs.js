/**
 * @swagger
 * /app/main:
 *   get:
 *     summary: Get app main dashboard data
 *     description: Retrieve dashboard data including user info, stats, and recent activity
 *     tags: [App Main]
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DashboardData'
 */

/**
 * @swagger
 * /app/main/notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Retrieve user notifications and alerts
 *     tags: [App Main]
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 */

/**
 * @swagger
 * /app/main/quick-stats:
 *   get:
 *     summary: Get quick statistics
 *     description: Retrieve quick statistics for dashboard display
 *     tags: [App Main]
 *     responses:
 *       200:
 *         description: Quick stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QuickStats'
 */

module.exports = {};
