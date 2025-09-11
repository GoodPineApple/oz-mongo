const express = require('express');
const router = express.Router();
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');

// GET /app/auth - Get app auth status and user info
router.get('/', asyncHandler(async (req, res) => {
  // 더미 인증 상태 데이터
  const authData = {
    isAuthenticated: true,
    user: {
      id: "user123",
      username: "김철수",
      email: "user@example.com",
      profileImage: "/uploads/profiles/default.jpg",
      role: "user",
      lastLoginAt: new Date().toISOString(),
      preferences: {
        theme: "light",
        language: "ko",
        notifications: true
      }
    },
    session: {
      sessionId: "sess_abc123",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      loginMethod: "email"
    },
    permissions: [
      "memo:read",
      "memo:write", 
      "template:read",
      "profile:update"
    ]
  };

  return apiResponse.success(res, authData, 'Auth status retrieved successfully');
}));

// POST /app/auth/refresh - Refresh user session
router.post('/refresh', asyncHandler(async (req, res) => {
  // 더미 세션 갱신 데이터
  const refreshData = {
    success: true,
    newSessionId: "sess_def456",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    refreshedAt: new Date().toISOString()
  };

  return apiResponse.success(res, refreshData, 'Session refreshed successfully');
}));

// GET /app/auth/profile - Get user profile for app
router.get('/profile', asyncHandler(async (req, res) => {
  const profile = {
    user: {
      id: "user123",
      username: "김철수",
      email: "user@example.com",
      fullName: "김철수",
      bio: "메모 앱을 사랑하는 사용자입니다.",
      profileImage: "/uploads/profiles/default.jpg",
      joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      stats: {
        totalMemos: 125,
        totalTemplatesUsed: 15,
        favoriteTemplate: "모던 블루",
        streakDays: 7
      }
    },
    settings: {
      theme: "light",
      language: "ko",
      emailNotifications: true,
      pushNotifications: false,
      autoSave: true,
      defaultTemplate: "template1"
    }
  };

  return apiResponse.success(res, profile, 'User profile retrieved successfully');
}));

// PUT /app/auth/profile - Update user profile
router.put('/profile', asyncHandler(async (req, res) => {
  const { fullName, bio, settings } = req.body;
  
  // 더미 업데이트 결과
  const updatedProfile = {
    id: "user123",
    username: "김철수",
    email: "user@example.com",
    fullName: fullName || "김철수",
    bio: bio || "메모 앱을 사랑하는 사용자입니다.",
    profileImage: "/uploads/profiles/default.jpg",
    updatedAt: new Date().toISOString(),
    settings: {
      ...settings,
      theme: settings?.theme || "light",
      language: settings?.language || "ko"
    }
  };

  return apiResponse.success(res, updatedProfile, 'Profile updated successfully');
}));

module.exports = router;
