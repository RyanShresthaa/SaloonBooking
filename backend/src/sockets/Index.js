import { Server } from 'socket.io';
import env from '../config/Env.js';
import logger from '../utils/Logger.js';
import { socketCorsOriginOption } from '../config/corsOrigins.js';

let io;

/**
 * @param {http.Server} httpServer
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: socketCorsOriginOption(),
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
