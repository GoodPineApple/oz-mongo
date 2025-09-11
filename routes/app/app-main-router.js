const express = require('express');
const router = express.Router();
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');

// GET /app/main - Get app main dashboard data
router.get('/', asyncHandler(async (req, res) => {
  // 더미 데이터
  const dashboardData = {
    user: {
      id: "user123",
      name: "김철수",
      email: "user@example.com",
      profileImage: "/uploads/profiles/default.jpg"
    },
    stats: {
      totalMemos: 25,
      totalTemplates: 8,
      recentActivity: 12
    },
    recentMemos: [
      {
        id: "memo1",
        title: "오늘의 할 일",
        content: "프로젝트 마무리하기",
        createdAt: new Date().toISOString(),
        templateId: "template1"
      },
      {
        id: "memo2", 
        title: "회의 메모",
        content: "팀 미팅 내용 정리",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        templateId: "template2"
      }
    ],
    quickActions: [
      { name: "새 메모 작성", url: "/app/memos/new", icon: "✏️" },
      { name: "템플릿 보기", url: "/app/templates", icon: "🎨" },
      { name: "설정", url: "/app/settings", icon: "⚙️" }
    ]
  };

  return apiResponse.success(res, dashboardData, 'App dashboard data retrieved successfully');
}));

// GET /app/main/notifications - Get user notifications
router.get('/notifications', asyncHandler(async (req, res) => {
  const notifications = [
    {
      id: "notif1",
      type: "memo_shared",
      title: "새 메모가 공유되었습니다",
      message: "홍길동님이 '프로젝트 계획' 메모를 공유했습니다",
      createdAt: new Date().toISOString(),
      read: false
    },
    {
      id: "notif2",
      type: "template_updated", 
      title: "템플릿이 업데이트되었습니다",
      message: "'모던 블루' 템플릿이 새로운 스타일로 업데이트되었습니다",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      read: true
    }
  ];

  return apiResponse.success(res, notifications, 'Notifications retrieved successfully');
}));

// GET /app/main/quick-stats - Get quick statistics for dashboard
router.get('/quick-stats', asyncHandler(async (req, res) => {
  const stats = {
    today: {
      memosCreated: 3,
      templatesUsed: 2,
      timeSpent: "2h 30m"
    },
    thisWeek: {
      memosCreated: 15,
      templatesUsed: 5,
      mostUsedTemplate: "모던 블루"
    },
    thisMonth: {
      memosCreated: 67,
      templatesUsed: 8,
      favoriteCategory: "업무"
    }
  };

  return apiResponse.success(res, stats, 'Quick stats retrieved successfully');
}));

module.exports = router;
