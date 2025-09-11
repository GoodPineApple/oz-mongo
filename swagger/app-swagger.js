const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Oz-Mongo App Documentation',
      version: '1.0.0',
      description: 'Client application API documentation for Oz-Mongo frontend services',
      contact: {
        name: 'App Support',
        email: 'app-support@oz-mongo.com'
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
        name: 'App Main',
        description: 'Main application dashboard and overview endpoints'
      },
      {
        name: 'App Auth',
        description: 'Application-specific authentication and user management'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        }
      },
      schemas: {
        DashboardData: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                profileImage: { type: 'string' }
              }
            },
            stats: {
              type: 'object',
              properties: {
                totalMemos: { type: 'integer' },
                totalTemplates: { type: 'integer' },
                recentActivity: { type: 'integer' }
              }
            },
            recentMemos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  content: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  templateId: { type: 'string' }
                }
              }
            },
            quickActions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  url: { type: 'string' },
                  icon: { type: 'string' }
                }
              }
            }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            read: { type: 'boolean' }
          }
        },
        QuickStats: {
          type: 'object',
          properties: {
            today: {
              type: 'object',
              properties: {
                memosCreated: { type: 'integer' },
                templatesUsed: { type: 'integer' },
                timeSpent: { type: 'string' }
              }
            },
            thisWeek: {
              type: 'object',
              properties: {
                memosCreated: { type: 'integer' },
                templatesUsed: { type: 'integer' },
                mostUsedTemplate: { type: 'string' }
              }
            },
            thisMonth: {
              type: 'object',
              properties: {
                memosCreated: { type: 'integer' },
                templatesUsed: { type: 'integer' },
                favoriteCategory: { type: 'string' }
              }
            }
          }
        },
        AuthStatus: {
          type: 'object',
          properties: {
            isAuthenticated: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string', format: 'email' },
                profileImage: { type: 'string' },
                role: { type: 'string' },
                lastLoginAt: { type: 'string', format: 'date-time' },
                preferences: {
                  type: 'object',
                  properties: {
                    theme: { type: 'string' },
                    language: { type: 'string' },
                    notifications: { type: 'boolean' }
                  }
                }
              }
            },
            session: {
              type: 'object',
              properties: {
                sessionId: { type: 'string' },
                expiresAt: { type: 'string', format: 'date-time' },
                loginMethod: { type: 'string' }
              }
            },
            permissions: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string', format: 'email' },
                fullName: { type: 'string' },
                bio: { type: 'string' },
                profileImage: { type: 'string' },
                joinedAt: { type: 'string', format: 'date-time' },
                stats: {
                  type: 'object',
                  properties: {
                    totalMemos: { type: 'integer' },
                    totalTemplatesUsed: { type: 'integer' },
                    favoriteTemplate: { type: 'string' },
                    streakDays: { type: 'integer' }
                  }
                }
              }
            },
            settings: {
              type: 'object',
              properties: {
                theme: { type: 'string' },
                language: { type: 'string' },
                emailNotifications: { type: 'boolean' },
                pushNotifications: { type: 'boolean' },
                autoSave: { type: 'boolean' },
                defaultTemplate: { type: 'string' }
              }
            }
          }
        },
        ProfileUpdateInput: {
          type: 'object',
          properties: {
            fullName: { type: 'string' },
            bio: { type: 'string' },
            settings: {
              type: 'object',
              properties: {
                theme: { type: 'string' },
                language: { type: 'string' },
                emailNotifications: { type: 'boolean' },
                pushNotifications: { type: 'boolean' },
                autoSave: { type: 'boolean' },
                defaultTemplate: { type: 'string' }
              }
            }
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
    './routes/app/*.js',
    './swagger/docs/app-main-docs.js',
    './swagger/docs/app-auth-docs.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
