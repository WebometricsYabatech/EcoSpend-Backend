const productionHost = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5000'

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'EcoSpend Backend API',
    version: '1.0.0',
    description: 'Sustainable spending tracker API for auth, expenses, budgets, categories, receipts, and dashboard insights.'
  },
  servers: [
    {
      url: productionHost,
      description: process.env.VERCEL_URL ? 'Production server' : 'Local development server'
    }
  ],
  tags: [
    { name: 'Auth', description: 'Registration, login, logout, and account management' },
    { name: 'Expenses', description: 'Manual and AI-generated expense operations' },
    { name: 'Receipts', description: 'Receipt scanning, confirmation and history' },
    { name: 'Budget', description: 'Monthly budget tracking and updates' },
    { name: 'Dashboard', description: 'Insights and spending summaries' },
    { name: 'Categories', description: 'Default and custom spending categories' },
    { name: 'Profile', description: 'User profile reading and updates' },
    { name: 'Transactions', description: 'Transaction search and management' },
    { name: 'Admin', description: 'Administrator dashboard access' }
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullname: { type: 'string' },
          email: { type: 'string', format: 'email' },
          budget: { type: 'number', nullable: true },
          currency: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['fullname', 'email', 'password'],
        properties: {
          fullname: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          password: { type: 'string', format: 'password', example: 'secret123' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          password: { type: 'string', format: 'password', example: 'secret123' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              fullname: { type: 'string' },
              email: { type: 'string' }
            }
          }
        }
      },
      Expense: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          amount: { type: 'number' },
          category: { type: 'string' },
          storeName: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          sustainabilityScore: { type: 'integer', nullable: true },
          sustainabilityTip: { type: 'string', nullable: true },
          receiptUrl: { type: 'string', nullable: true },
          receiptTotal: { type: 'number', nullable: true },
          isManual: { type: 'boolean' },
          date: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      ExpenseCreateRequest: {
        type: 'object',
        required: ['amount', 'category'],
        properties: {
          amount: { type: 'number', example: 25.5 },
          category: { type: 'string', example: 'Groceries' },
          storeName: { type: 'string', example: 'Shoprite' },
          description: { type: 'string', example: 'Fresh vegetables and rice' },
          sustainabilityScore: { type: 'integer', example: 8 },
          receiptUrl: { type: 'string', nullable: true },
          isManual: { type: 'boolean', example: true },
          date: { type: 'string', format: 'date-time', example: '2026-08-13T12:00:00.000Z' }
        }
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          userId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      UpdateProfileRequest: {
        type: 'object',
        properties: {
          fullname: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
          currency: { type: 'string', example: 'NGN' }
        }
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['newPassword'],
        properties: {
          newPassword: { type: 'string', minLength: 6, example: 'newPassword123' }
        }
      },
      BudgetRequest: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', example: 30000 }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          error: { type: 'string', nullable: true }
        }
      }
    }
  },
  paths: {
    '/': {
      get: {
        tags: ['General'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'API is running',
            content: {
              'text/plain': {
                schema: { type: 'string', example: 'Ecospend API is running' }
              }
            }
          }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } }
            }
          },
          '400': { description: 'Email already in use or invalid payload' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in an existing user',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } }
            }
          },
          '400': { description: 'Invalid credentials' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out the current user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Logout successful' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/auth/account': {
      delete: {
        tags: ['Auth'],
        summary: 'Delete the authenticated user account',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Account deleted successfully' },
          '401': { description: 'Unauthorized' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/api/expenses': {
      post: {
        tags: ['Expenses'],
        summary: 'Create a manual expense',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ExpenseCreateRequest' } }
          }
        },
        responses: {
          '201': {
            description: 'Expense created',
            content: { 'application/json': { schema: { type: 'object' } } }
          },
          '500': { description: 'Server error' }
        }
      },
      get: {
        tags: ['Expenses'],
        summary: 'Get all expenses for the current user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of expenses',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    expenses: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Expense' }
                    }
                  }
                }
              }
            }
          },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/expenses/report': {
      get: {
        tags: ['Expenses'],
        summary: 'Get spending report by store and period',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'storeName', schema: { type: 'string' }, description: 'Filter by store name' },
          { in: 'query', name: 'year', schema: { type: 'integer' }, description: 'Year filter' },
          { in: 'query', name: 'month', schema: { type: 'integer' }, description: 'Month filter' }
        ],
        responses: {
          '200': { description: 'Store report' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/expenses/{id}': {
      get: {
        tags: ['Expenses'],
        summary: 'Get a single expense by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Expense found' },
          '404': { description: 'Expense not found' },
          '401': { description: 'Unauthorized' }
        }
      },
      put: {
        tags: ['Expenses'],
        summary: 'Update an expense',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ExpenseCreateRequest' }
            }
          }
        },
        responses: {
          '200': { description: 'Expense updated' },
          '404': { description: 'Expense not found' }
        }
      },
      delete: {
        tags: ['Expenses'],
        summary: 'Delete an expense',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Expense deleted' },
          '404': { description: 'Expense not found' }
        }
      }
    },
    '/api/ai/scan-receipt': {
      post: {
        tags: ['Receipts'],
        summary: 'Scan a receipt image or PDF to extract purchase data',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['receipt'],
                properties: {
                  receipt: {
                    type: 'string',
                    format: 'binary',
                    description: 'Receipt image or PDF file'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Receipt scanned successfully' },
          '400': { description: 'No receipt uploaded or OCR failed' },
          '500': { description: 'Failed to scan receipt' }
        }
      }
    },
    '/api/ai/confirm-receipt': {
      post: {
        tags: ['Receipts'],
        summary: 'Save the AI-confirmed receipt items as expenses',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        price: { type: 'number' }
                      }
                    }
                  },
                  category: { type: 'string', example: 'Groceries' },
                  totalAmount: { type: 'number', example: 42.75 },
                  sustainabilityScore: { type: 'integer', example: 7 },
                  sustainabilityTip: { type: 'string', example: 'Consider choosing reusable produce bags.' },
                  store: { type: 'string', example: 'Fresh Mart' },
                  receiptImage: { type: 'string', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Receipt saved successfully' },
          '409': { description: 'Receipt already saved; wait a moment and retry' },
          '500': { description: 'Failed to save receipt' }
        }
      }
    },
    '/api/receipts/history': {
      get: {
        tags: ['Receipts'],
        summary: 'Get receipt scanning history grouped into receipts',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } }
        ],
        responses: {
          '200': { description: 'Receipt history retrieved' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/receipts/{id}': {
      delete: {
        tags: ['Receipts'],
        summary: 'Delete a receipt record',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Receipt deleted successfully' },
          '403': { description: 'Not authorized' },
          '404': { description: 'Receipt not found' }
        }
      }
    },
    '/api/budget': {
      get: {
        tags: ['Budget'],
        summary: 'Get current month budget summary',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Budget summary returned' },
          '401': { description: 'Unauthorized' }
        }
      },
      put: {
        tags: ['Budget'],
        summary: 'Set or update the user monthly budget',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BudgetRequest' } }
          }
        },
        responses: {
          '200': { description: 'Budget updated successfully' },
          '400': { description: 'Invalid budget amount' }
        }
      }
    },
    '/api/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get dashboard overview, categories, daily spending, and recent receipts',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Dashboard data returned' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/categories': {
      get: {
        tags: ['Categories'],
        summary: 'Get all default and custom categories',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Categories returned' },
          '401': { description: 'Unauthorized' }
        }
      },
      post: {
        tags: ['Categories'],
        summary: 'Create a custom category',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string', example: 'Travel' } }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Category created' },
          '409': { description: 'Category already exists' }
        }
      }
    },
    '/api/categories/{id}': {
      put: {
        tags: ['Categories'],
        summary: 'Update a custom category',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } }
            }
          }
        },
        responses: {
          '200': { description: 'Category updated' },
          '403': { description: 'Not authorized' },
          '404': { description: 'Category not found' }
        }
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete a custom category',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Category deleted' },
          '403': { description: 'Not authorized' },
          '404': { description: 'Category not found' }
        }
      }
    },
    '/api/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Profile returned', content: { 'application/json': { schema: { type: 'object' } } } },
          '401': { description: 'Unauthorized' }
        }
      },
      put: {
        tags: ['Profile'],
        summary: 'Update profile details such as fullname, email, and currency',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateProfileRequest' } }
          }
        },
        responses: {
          '200': { description: 'Profile updated' },
          '409': { description: 'Email already in use' }
        }
      }
    },
    '/api/profile/change-password': {
      put: {
        tags: ['Profile'],
        summary: 'Change the authenticated user password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } }
          }
        },
        responses: {
          '200': { description: 'Password changed successfully' },
          '400': { description: 'New password required or too short' }
        }
      }
    },
    '/api/profile/currency': {
      put: {
        tags: ['Profile'],
        summary: 'Update the preferred currency for the user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currency'],
                properties: {
                  currency: {
                    type: 'string',
                    enum: ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'],
                    example: 'NGN'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Currency updated successfully' },
          '400': { description: 'Invalid currency value' }
        }
      }
    },
    '/api/transactions': {
      get: {
        tags: ['Transactions'],
        summary: 'Search and filter transactions using query params',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'category', schema: { type: 'string' } },
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'minAmount', schema: { type: 'number' } },
          { in: 'query', name: 'maxAmount', schema: { type: 'number' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
          { in: 'query', name: 'sortBy', schema: { type: 'string', default: 'date' } },
          { in: 'query', name: 'order', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } }
        ],
        responses: {
          '200': { description: 'Transactions list retrieved' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/transactions/{id}': {
      get: {
        tags: ['Transactions'],
        summary: 'Get a single transaction by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Transaction found' },
          '403': { description: 'Not authorized' },
          '404': { description: 'Transaction not found' }
        }
      },
      put: {
        tags: ['Transactions'],
        summary: 'Update a transaction',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amount: { type: 'number' },
                  category: { type: 'string' },
                  description: { type: 'string' },
                  date: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Transaction updated' },
          '403': { description: 'Not authorized' },
          '404': { description: 'Transaction not found' }
        }
      }
    },
    '/api/user/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Get the authenticated user profile using the user route',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Profile retrieved' },
          '401': { description: 'Unauthorized' }
        }
      },
      put: {
        tags: ['Profile'],
        summary: 'Update the user profile via user route',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullname: { type: 'string' },
                  budget: { type: 'number' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Profile updated' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/api/user/avatar': {
      post: {
        tags: ['Profile'],
        summary: 'Upload and save a user avatar image',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['avatar'],
                properties: {
                  avatar: {
                    type: 'string',
                    format: 'binary',
                    description: 'Avatar image file'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Avatar updated successfully' },
          '400': { description: 'No image uploaded' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/api/admin/dashboard': {
      get: {
        tags: ['Admin'],
        summary: 'Get admin dashboard metrics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Admin dashboard data returned' },
          '401': { description: 'Unauthorized' }
        }
      }
    }
  }
}

export default swaggerDocument
