import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = 'http://localhost:8787'; // wrangler dev
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: { proxy: { '/api': api, '/media': api, '/articles': api, '/work': api, '/sitemap.xml': api, '/admin/config.js': api } },
});
