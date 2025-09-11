const express = require('express');
const router = express.Router();
const { apiResponse, asyncHandler } = require('../../middleware/errorHandler');

// GET /admin - Get admin dashboard data
router.get('/', asyncHandler(async (req, res) => {
  // 더미 관리자 대시보드 데이터
  const adminData = {
    overview: {
      totalUsers: 1247,
      totalMemos: 8934,
      totalTemplates: 45,
      activeUsers: 234,
      systemHealth: "healthy"
    },
    stats: {
      today: {
        newUsers: 12,
        newMemos: 89,
        systemLoad: "42%",
        errorRate: "0.1%"
      },
      thisWeek: {
        newUsers: 78,
        newMemos: 567,
        averageLoad: "38%",
        uptime: "99.9%"
      }
    },
    recentActivity: [
      {
        id: "activity1",
        type: "user_registration",
        message: "새 사용자 '홍길동'이 가입했습니다",
        timestamp: new Date().toISOString(),
        severity: "info"
      },
      {
        id: "activity2",
        type: "system_warning",
        message: "메모리 사용량이 80%를 초과했습니다",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        severity: "warning"
      },
      {
        id: "activity3",
        type: "template_created",
        message: "새 템플릿 '빈티지 스타일'이 생성되었습니다",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        severity: "info"
      }
    ],
    systemStatus: {
      database: { status: "healthy", responseTime: "12ms" },
      storage: { status: "healthy", usage: "67%" },
      api: { status: "healthy", requestsPerMinute: 145 },
      cache: { status: "healthy", hitRate: "94%" }
    }
  };

  return apiResponse.success(res, adminData, 'Admin dashboard data retrieved successfully');
}));

// GET /admin/users - Get users management data
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query;
  
  // 더미 사용자 관리 데이터
  const usersData = {
    users: [
      {
        id: "user1",
        username: "김철수",
        email: "kim@example.com",
        status: "active",
        role: "user",
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
        memoCount: 45,
        isEmailVerified: true
      },
      {
        id: "user2", 
        username: "이영희",
        email: "lee@example.com",
        status: "inactive",
        role: "user",
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
        memoCount: 12,
        isEmailVerified: true
      },
      {
        id: "user3",
        username: "박민수",
        email: "park@example.com", 
        status: "suspended",
        role: "user",
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        lastLoginAt: new Date(Date.now() - 172800000).toISOString(),
        memoCount: 3,
        isEmailVerified: false
      }
    ],
    pagination: {
      current: parseInt(page),
      total: 1247,
      pages: Math.ceil(1247 / limit),
      limit: parseInt(limit)
    },
    stats: {
      active: 1089,
      inactive: 134,
      suspended: 24,
      totalThisMonth: 78
    }
  };

  return apiResponse.success(res, usersData, 'Users management data retrieved successfully');
}));

// GET /admin/system - Get system management data
router.get('/system', asyncHandler(async (req, res) => {
  const systemData = {
    server: {
      uptime: "15d 4h 23m",
      cpu: { usage: "42%", cores: 4 },
      memory: { used: "3.2GB", total: "8GB", percentage: "40%" },
      disk: { used: "120GB", total: "500GB", percentage: "24%" }
    },
    database: {
      status: "connected",
      connections: 45,
      queryTime: "avg 12ms",
      size: "2.3GB",
      collections: {
        users: 1247,
        memos: 8934,
        templates: 45,
        files: 2341
      }
    },
    logs: [
      {
        level: "info",
        message: "User login successful: kim@example.com",
        timestamp: new Date().toISOString(),
        source: "auth"
      },
      {
        level: "warning", 
        message: "High memory usage detected: 85%",
        timestamp: new Date(Date.now() - 900000).toISOString(),
        source: "system"
      },
      {
        level: "error",
        message: "Database connection timeout",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        source: "database"
      }
    ],
    backup: {
      lastBackup: new Date(Date.now() - 86400000).toISOString(),
      nextBackup: new Date(Date.now() + 86400000).toISOString(),
      status: "completed",
      size: "1.8GB"
    }
  };

  return apiResponse.success(res, systemData, 'System management data retrieved successfully');
}));

// POST /admin/users/:id/status - Update user status
router.post('/users/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  // 더미 상태 업데이트 결과
  const updateResult = {
    userId: id,
    oldStatus: "active",
    newStatus: status,
    reason: reason || "Admin action",
    updatedAt: new Date().toISOString(),
    updatedBy: "admin123"
  };

  return apiResponse.success(res, updateResult, `User status updated to ${status}`);
}));

module.exports = router;
