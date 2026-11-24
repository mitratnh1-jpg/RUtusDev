import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const api = 'http://localhost:8787'; // wrangler dev
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: { proxy: { '/api': api, '/media': api, '/articles': api, '/work': api, '/sitemap.xml': api, '/admin/config.js': api } },
});
