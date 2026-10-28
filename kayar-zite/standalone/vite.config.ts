// Vite build of the KAYAR website for the standalone server (no Zite runtime script, local uploads).
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import { VitePWA } from 'vite-plugin-pwa';

const root = path.resolve(__dirname, '..');
const app = path.resolve(root, 'apps/kayar');

export default defineConfig({
  root: app,
  publicDir: path.resolve(app, 'public'),
  build: { target: 'es2019', sourcemap: false, reportCompressedSize: false, outDir: path.resolve(__dirname, 'dist/public'), emptyOutDir: true },
  plugins: [react(), VitePWA({
    // Service worker source: standalone/pwa/sw.ts → dist/public/sw.js (served no-cache by server.ts; SW_DISABLED=1 swaps in a kill-switch)
    strategies: 'injectManifest', srcDir: path.resolve(__dirname, 'pwa'), filename: 'sw.ts',
    injectRegister: false, registerType: 'prompt', manifest: false,
    injectManifest: { globPatterns: ['assets/**/*.{js,css,woff2}', 'offline.html', '*.{png,svg}'], globIgnores: ['index.html', 'media/**', 'og.png'], maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 },
  }), {
    name: 'kayar-html',
    transformIndexHtml(html: string) {
      const head = fs.readFileSync(path.resolve(__dirname, 'head.html'), 'utf8');
      return html
        .replace('<html lang="en">', '<html lang="fa" dir="rtl" class="dark">')
        .replace(/\s*<link rel="icon"[^>]*>/, '').replace(/\s*<meta name="viewport"[^>]*>/, '').replace(/\s*<title>[^<]*<\/title>/, '')
        .replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n${head}`);
    },
  }],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(app, 'src'),
      'zitejs/upload': path.resolve(__dirname, 'client/upload.ts'),
      'zitejs/api': path.resolve(app, '.zite/api.ts'),
      'zitejs/caller': path.resolve(root, 'node_modules/zitejs/dist/esm/caller/index.js'),
      'zitejs/backend/base': path.resolve(root, 'node_modules/zitejs/dist/esm/backend/index.js'),
      'zitejs/auth/base': path.resolve(root, 'node_modules/zitejs/dist/esm/auth/index.js'),
      'zitejs/backend': path.resolve(app, '.zite/backend.ts'),
    },
  },
});
