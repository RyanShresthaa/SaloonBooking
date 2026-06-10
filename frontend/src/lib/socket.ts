import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/** Origin only (no `/api`). Example: `http://localhost:5000` or `https://api.example.com` */
const rawSocketUrl = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000').replace(/\/$/, '');

/**
 * Default Engine.IO starts with HTTP long-polling; some proxies / HTTP2 edges respond with
 * **426 Upgrade Required**. Prefer WebSocket first unless `VITE_SOCKET_POLLING_FIRST=true`.
 */
const transports =
  import.meta.env.VITE_SOCKET_POLLING_FIRST === 'true'
    ? (['polling', 'websocket'] as const)
    : (['websocket', 'polling'] as const);

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(rawSocketUrl, {
      autoConnect: false,
      path: '/socket.io/',
      transports: [...transports],
    });
  }
  return socket;
};

export const connectSocket = (): Socket => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};
