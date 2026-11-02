import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Relative base so the built site works on any host or sub-path
// (custom domain, GitHub Pages, Netlify, Vercel…).
export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: true,
  },
});
