import 'dotenv/config';
import fs from 'fs';
import http from 'http';
import app from './src/App.js';
import { connectDB } from './src/models/Index.js';
import { initSocket } from './src/sockets/Index.js';
import { startAppointmentReminderScheduler } from './src/jobs/AppointmentReminderJob.js';
import env from './src/config/Env.js';
import logger from './src/utils/Logger.js';

import './src/queues/NotificationProcessor.js';

const httpServer = http.createServer(app);

initSocket(httpServer);

const start = async () => {
  try {
    fs.mkdirSync('logs', { recursive: true });
    await connectDB();

    startAppointmentReminderScheduler();

    httpServer.listen(env.port, () => {
      logger.info(`Server running on http://localhost:${env.port}`);
      logger.info(`Swagger docs at http://localhost:${env.port}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
