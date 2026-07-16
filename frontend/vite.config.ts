import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Backend URL — reads VITE_API_URL or falls back to localhost:4000
  // Strips trailing /api if present to get the base server URL
  const backendUrl = (env.VITE_API_URL || 'http://localhost:4000/api')
    .replace(/\/api\/?$/, '');

  return {
    plugins: [react()],
    define: {
      // Fix 'process is not defined' from packages like react-grid-layout
      'process.env': {},
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || 'development'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // No fixed port — Vite picks the next available one starting from 5173
      // Set VITE_PORT in .env.local to override
      port: env.VITE_PORT ? parseInt(env.VITE_PORT, 10) : undefined,
      strictPort: false, // Don't fail if port is taken, use the next one
      host: true,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});
