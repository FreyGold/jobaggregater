// ─── Swagger/OpenAPI Configuration ────────────────────────────────

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JobAgg API',
      version: '1.0.0',
      description: 'Comprehensive job aggregation API combining multiple job boards into one powerful search interface.',
      contact: {
        name: 'JobAgg Team',
        url: 'https://jobagg.dev',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3001',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Bearer token for authentication',
        },
      },
      schemas: {
        Job: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            company: { type: 'string' },
            location: { type: 'string' },
            salary: { type: 'string', nullable: true },
            salaryMin: { type: 'integer', nullable: true },
            salaryMax: { type: 'integer', nullable: true },
            salaryCurrency: { type: 'string', nullable: true },
            url: { type: 'string' },
            source: { type: 'string' },
            description: { type: 'string', nullable: true },
            tags: { type: 'array', items: { type: 'string' } },
            employmentType: { type: 'string', enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE'] },
            experienceLevel: { type: 'string', enum: ['ENTRY', 'MID', 'SENIOR'] },
            isRemote: { type: 'boolean' },
            postedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            subscriptionPlan: { type: 'string', enum: ['FREE', 'PRO', 'ENTERPRISE'] },
            subscriptionStatus: { type: 'string', enum: ['ACTIVE', 'CANCELLED', 'EXPIRED'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            data: { type: 'null' },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                details: { type: 'object', nullable: true },
              },
            },
          },
        },
      },
    },
  },
  apis: [
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
  ],
};

export const specs = swaggerJsdoc(options);
