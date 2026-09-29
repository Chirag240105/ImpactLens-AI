/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Read only the client's own env files. Loading the repo-root .env would pick up the server's
  // NODE_ENV=development, which Vite then applies to `vite build` (shipping React's dev build).
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_');
  // The API allows CLIENT_URL (default http://localhost:3000); the dev proxy avoids CORS entirely.
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5000';
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 3000,
      strictPort: true,
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    preview: { port: 3000, proxy: { '/api': { target: apiTarget, changeOrigin: true } } },
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query', 'axios', 'zustand'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
    },
  };
});
