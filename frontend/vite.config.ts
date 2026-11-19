import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const backendTarget = process.env.VITE_BACKEND_URL || 'http://localhost:8080';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: 'Service Unavailable',
                  message: `Backend service is unreachable at ${backendTarget}. Please start the backend service (run-windows-service.bat or run-service-background.vbs).`,
                  code: 'BACKEND_CONNECTION_REFUSED',
                })
              );
            }
          });
        },
      },
      '/ws': {
        target: backendTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
