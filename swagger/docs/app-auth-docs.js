/**
 * @swagger
 * /app/auth:
 *   get:
 *     summary: Get app auth status
 *     description: Get authentication status and user information for the app
 *     tags: [App Auth]
 *     responses:
 *       200:
 *         description: Auth status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthStatus'
 */

/**
 * @swagger
 * /app/auth/refresh:
 *   post:
 *     summary: Refresh user session
 *     description: Refresh the current user session
 *     tags: [App Auth]
 *     responses:
 *       200:
 *         description: Session refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                         newSessionId:
 *                           type: string
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                         refreshedAt:
 *                           type: string
 *                           format: date-time
 */

/**
 * @swagger
 * /app/auth/profile:
 *   get:
 *     summary: Get user profile
 *     description: Get detailed user profile information for the app
 *     tags: [App Auth]
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *   put:
 *     summary: Update user profile
 *     description: Update user profile information
 *     tags: [App Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProfileUpdateInput'
 *           example:
 *             fullName: "김철수"
 *             bio: "업데이트된 소개글입니다."
 *             settings:
 *               theme: "dark"
 *               language: "ko"
 *               emailNotifications: true
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         fullName:
 *                           type: string
 *                         bio:
 *                           type: string
 *                         profileImage:
 *                           type: string
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                         settings:
 *                           type: object
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

module.exports = {};
