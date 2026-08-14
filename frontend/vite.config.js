import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  if (mode === 'production') {
    const apiUrl = String(env.VITE_API_URL || '').trim();
    if (!apiUrl) {
      throw new Error('VITE_API_URL is required for production builds.');
    }
    if (/localhost|127\.0\.0\.1/i.test(apiUrl)) {
      throw new Error(
        'VITE_API_URL must not point to localhost or 127.0.0.1 for production builds. '
        + 'Set VITE_API_URL to your public API URL (e.g. https://api.example.com/api).'
      );
    }
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
        // Legacy public /uploads is blocked server-side; keep proxy only for clear 401 responses in dev.
        '/uploads': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  };
});
