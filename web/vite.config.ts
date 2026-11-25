import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

const api = 'http://localhost:8787'; // wrangler dev
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dua halaman: situs publik (index.html) dan panel admin React (admin/index.html → /admin/).
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: { main: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin/index.html') } } },
  server: { proxy: { '/api': api, '/media': api, '/articles': api, '/work': api, '/services': api, '/sitemap.xml': api, '/admin/config.js': api } },
});
