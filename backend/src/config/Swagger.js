import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';

// ─── Constants ───

const __dirname = dirname(fileURLToPath(import.meta.url));

const OPENAPI_VERSION = '3.0.0';
const API_TITLE = 'Salon Appointment API';
const API_VERSION = '1.0.0';
const API_DESCRIPTION = 'API documentation for the Salon Appointment & Time Slot Management System';
const DEV_SERVER_URL = 'http://localhost:5000/api';
const DEV_SERVER_LABEL = 'Development server';

const options = {
  definition: {
    openapi: OPENAPI_VERSION,
    info: {
      title: API_TITLE,
      version: API_VERSION,
      description: API_DESCRIPTION,
    },
    servers: [
      {
        url: DEV_SERVER_URL,
        description: DEV_SERVER_LABEL,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [join(__dirname, '../routes/*.js'), join(__dirname, '../models/*.js')],
};

// ─── Exports ───

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
