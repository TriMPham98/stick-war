import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // For GitHub Pages deployment under /stick-war/ (project page)
  // If deploying to custom domain or user page, change base to '/'
  base: process.env.NODE_ENV === 'production' ? '/stick-war/' : '/',
  server: {
    port: 5173,
  },
});