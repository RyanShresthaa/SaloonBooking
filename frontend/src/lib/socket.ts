import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function isLoopbackOrLocalhostUrl(url: string): boolean {
  try {
    const withProto = /^[a-z]+:\/\//i.test(url) ? url : `http://${url}`;
    const { hostname } = new URL(withProto);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

function resolveSocketOrigin(): string {
  const raw = import.meta.env.VITE_SOCKET_URL?.trim();
  if (raw) {
    if (import.meta.env.PROD && isLoopbackOrLocalhostUrl(raw)) {
      throw new Error(
        'VITE_SOCKET_URL must be a public origin in production (not localhost). Set it in Vercel (same host as your API, no /api path), then redeploy.',
      );
    }
    return raw.replace(/\/$/, '');
  }
  if (import.meta.env.PROD) {
    throw new Error(
      'Missing VITE_SOCKET_URL. Set it to your deployed API origin (e.g. https://your-api.onrender.com), then redeploy the frontend.',
    );
  }
  return 'http://localhost:5000';
}

/** Origin only (no `/api`). Example: `http://localhost:5000` or `https://api.example.com` */
const rawSocketUrl = resolveSocketOrigin();

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
