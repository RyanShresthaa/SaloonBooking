import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';

const __dirname = dirname(fileURLToPath(import.meta.url));

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Salon Appointment API',
      version: '1.0.0',
      description: 'API documentation for the Salon Appointment & Time Slot Management System',
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
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

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
