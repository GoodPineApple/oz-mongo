const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Oz-Mongo API Documentation',
      version: '1.0.0',
      description: 'REST API documentation for Oz-Mongo application core services',
      contact: {
        name: 'API Support',
        email: 'api-support@oz-mongo.com'
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
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'Memos',
        description: 'Memo CRUD operations and related functionality'
      },
      {
        name: 'Design Templates',
        description: 'Design template management and statistics'
      },
      {
        name: 'Files',
        description: 'File upload, management, and access control'
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
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID'
            },
            username: {
              type: 'string',
              description: 'Username',
              minLength: 3,
              maxLength: 30
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            isEmailVerified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp'
            }
          },
          required: ['id', 'username', 'email', 'isEmailVerified']
        },
        UserInput: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 30
            },
            email: {
              type: 'string',
              format: 'email'
            },
            password: {
              type: 'string',
              minLength: 6
            }
          },
          required: ['username', 'email', 'password']
        },
        LoginInput: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username or email'
            },
            password: {
              type: 'string'
            }
          },
          required: ['username', 'password']
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User'
            },
            token: {
              type: 'string',
              description: 'JWT authentication token'
            }
          }
        },
        DesignTemplate: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Template ID'
            },
            name: {
              type: 'string',
              maxLength: 100,
              description: 'Template name'
            },
            backgroundColor: {
              type: 'string',
              pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
              description: 'Background color in hex format'
            },
            textColor: {
              type: 'string',
              pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
              description: 'Text color in hex format'
            },
            borderStyle: {
              type: 'string',
              maxLength: 200,
              description: 'CSS border style'
            },
            shadowStyle: {
              type: 'string',
              maxLength: 200,
              description: 'CSS shadow style'
            },
            preview: {
              type: 'string',
              maxLength: 10,
              description: 'Preview emoji or icon'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['id', 'name', 'backgroundColor', 'textColor', 'borderStyle', 'shadowStyle', 'preview']
        },
        DesignTemplateInput: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              maxLength: 100
            },
            backgroundColor: {
              type: 'string',
              pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
            },
            textColor: {
              type: 'string',
              pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
            },
            borderStyle: {
              type: 'string',
              maxLength: 200
            },
            shadowStyle: {
              type: 'string',
              maxLength: 200
            },
            preview: {
              type: 'string',
              maxLength: 10
            }
          },
          required: ['name', 'backgroundColor', 'textColor', 'borderStyle', 'shadowStyle', 'preview']
        },
        Memo: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Memo ID'
            },
            title: {
              type: 'string',
              maxLength: 200,
              description: 'Memo title'
            },
            content: {
              type: 'string',
              maxLength: 10000,
              description: 'Memo content'
            },
            templateId: {
              type: 'string',
              description: 'Design template ID'
            },
            userId: {
              type: 'string',
              description: 'User ID who created the memo'
            },
            imageUrl: {
              type: 'string',
              nullable: true,
              description: 'Image URL if attached'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['id', 'title', 'content', 'templateId', 'userId']
        },
        MemoInput: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              maxLength: 200
            },
            content: {
              type: 'string',
              maxLength: 10000
            },
            templateId: {
              type: 'string'
            }
          },
          required: ['title', 'content', 'templateId']
        },
        File: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'File ID'
            },
            originalName: {
              type: 'string',
              description: 'Original filename'
            },
            fileName: {
              type: 'string',
              description: 'Stored filename'
            },
            mimeType: {
              type: 'string',
              description: 'MIME type'
            },
            size: {
              type: 'integer',
              description: 'File size in bytes'
            },
            domain: {
              type: 'string',
              enum: ['memo', 'profile-image', 'template-image', 'attachment'],
              description: 'Domain type'
            },
            referenceId: {
              type: 'string',
              description: 'Reference ID to related entity'
            },
            uploadedBy: {
              type: 'string',
              description: 'User ID who uploaded the file'
            },
            isPublic: {
              type: 'boolean',
              description: 'Public accessibility'
            },
            metadata: {
              type: 'object',
              description: 'File metadata including URLs'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            message: {
              type: 'string'
            },
            data: {
              type: 'object'
            },
            error: {
              type: 'object',
              nullable: true
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string'
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string'
                },
                details: {
                  type: 'string'
                }
              }
            }
          }
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            current: {
              type: 'integer',
              description: 'Current page number'
            },
            pages: {
              type: 'integer',
              description: 'Total pages'
            },
            total: {
              type: 'integer',
              description: 'Total items count'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
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
    './routes/api/*.js',
    './swagger/docs/auth-docs.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
