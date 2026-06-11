import { Server } from 'socket.io';
import env from '../config/Env.js';
import logger from '../utils/Logger.js';

let io;

/**
 * @param {http.Server} httpServer
 */
const initSocket = (httpServer) => {
  const socketAllowedOrigins =
    env.nodeEnv === 'production'
      ? env.clientOrigins
      : [
          ...env.clientOrigins,
          'http://localhost:3000',
          'http://localhost:3002',
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:5174',
          'http://127.0.0.1:5174',
        ];

  io = new Server(httpServer, {
    cors: {
      origin: socketAllowedOrigins,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const emitAppointmentUpdated = (payload) => {
  try {
    if (!io) return;
    io.emit('appointment:updated', payload);
  } catch {
    /* no-op if socket not ready */
  }
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export { initSocket, getIO, emitAppointmentUpdated };
