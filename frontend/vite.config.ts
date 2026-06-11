import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function assertVercelProductionApiEnv(mode: string) {
  if (process.env.VERCEL !== '1' || mode !== 'production') return;

  const api = (process.env.VITE_API_URL || '').trim();
  const socket = (process.env.VITE_SOCKET_URL || '').trim();
  const isBad = (value: string) =>
    !value ||
    /\blocalhost\b/i.test(value) ||
    value.includes('127.0.0.1') ||
    value.includes('[::1]');

  if (isBad(api) || isBad(socket)) {
    throw new Error(
      'Vercel production build: add two separate Environment Variables (not a pasted .env blob): ' +
        'VITE_API_URL = https://your-api.example.com/api and VITE_SOCKET_URL = https://your-api.example.com ' +
        '(public HTTPS URLs for your deployed Node API). Then redeploy. ' +
        `Got VITE_API_URL=${api ? 'set' : 'MISSING'}, VITE_SOCKET_URL=${socket ? 'set' : 'MISSING'}.`,
    );
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  assertVercelProductionApiEnv(mode);

  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
