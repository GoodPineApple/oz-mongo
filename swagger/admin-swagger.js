const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Oz-Mongo Admin Documentation',
      version: '1.0.0',
      description: 'Administrative API documentation for Oz-Mongo system management',
      contact: {
        name: 'Admin Support',
        email: 'admin-support@oz-mongo.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.SERVER_ORIGIN || 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Admin Dashboard',
        description: 'Administrative dashboard and system overview'
      },
      {
        name: 'User Management',
        description: 'User administration and management operations'
      },
      {
        name: 'System Management',
        description: 'System monitoring and configuration'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for admin authentication'
        }
      },
      schemas: {
        AdminDashboard: {
          type: 'object',
          properties: {
            overview: {
              type: 'object',
              properties: {
                totalUsers: { type: 'integer' },
                totalMemos: { type: 'integer' },
                totalTemplates: { type: 'integer' },
                activeUsers: { type: 'integer' },
                systemHealth: { type: 'string' }
              }
            },
            stats: {
              type: 'object',
              properties: {
                today: {
                  type: 'object',
                  properties: {
                    newUsers: { type: 'integer' },
                    newMemos: { type: 'integer' },
                    systemLoad: { type: 'string' },
                    errorRate: { type: 'string' }
                  }
                },
                thisWeek: {
                  type: 'object',
                  properties: {
                    newUsers: { type: 'integer' },
                    newMemos: { type: 'integer' },
                    averageLoad: { type: 'string' },
                    uptime: { type: 'string' }
                  }
                }
              }
            },
            recentActivity: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string' },
                  message: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  severity: { type: 'string', enum: ['info', 'warning', 'error'] }
                }
              }
            },
            systemStatus: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    responseTime: { type: 'string' }
                  }
                },
                storage: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    usage: { type: 'string' }
                  }
                },
                api: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    requestsPerMinute: { type: 'integer' }
                  }
                },
                cache: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    hitRate: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        UsersManagement: {
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
                  role: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  lastLoginAt: { type: 'string', format: 'date-time' },
                  memoCount: { type: 'integer' },
                  isEmailVerified: { type: 'boolean' }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                current: { type: 'integer' },
                total: { type: 'integer' },
                pages: { type: 'integer' },
                limit: { type: 'integer' }
              }
            },
            stats: {
              type: 'object',
              properties: {
                active: { type: 'integer' },
                inactive: { type: 'integer' },
                suspended: { type: 'integer' },
                totalThisMonth: { type: 'integer' }
              }
            }
          }
        },
        SystemData: {
          type: 'object',
          properties: {
            server: {
              type: 'object',
              properties: {
                uptime: { type: 'string' },
                cpu: {
                  type: 'object',
                  properties: {
                    usage: { type: 'string' },
                    cores: { type: 'integer' }
                  }
                },
                memory: {
                  type: 'object',
                  properties: {
                    used: { type: 'string' },
                    total: { type: 'string' },
                    percentage: { type: 'string' }
                  }
                },
                disk: {
                  type: 'object',
                  properties: {
                    used: { type: 'string' },
                    total: { type: 'string' },
                    percentage: { type: 'string' }
                  }
                }
              }
            },
            database: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                connections: { type: 'integer' },
                queryTime: { type: 'string' },
                size: { type: 'string' },
                collections: {
                  type: 'object',
                  properties: {
                    users: { type: 'integer' },
                    memos: { type: 'integer' },
                    templates: { type: 'integer' },
                    files: { type: 'integer' }
                  }
                }
              }
            },
            logs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  level: { type: 'string', enum: ['info', 'warning', 'error'] },
                  message: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  source: { type: 'string' }
                }
              }
            },
            backup: {
              type: 'object',
              properties: {
                lastBackup: { type: 'string', format: 'date-time' },
                nextBackup: { type: 'string', format: 'date-time' },
                status: { type: 'string' },
                size: { type: 'string' }
              }
            }
          }
        },
        UserStatusUpdate: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended']
            },
            reason: {
              type: 'string'
            }
          },
          required: ['status']
        },
        UserStatusUpdateResult: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            oldStatus: { type: 'string' },
            newStatus: { type: 'string' },
            reason: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' },
            updatedBy: { type: 'string' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            error: { type: 'object', nullable: true }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                details: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        ForbiddenError: {
          description: 'Access denied - Admin privileges required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './routes/admin/*.js',
    './swagger/docs/admin-docs.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
