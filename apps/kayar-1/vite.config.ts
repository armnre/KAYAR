import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

const pkgDeps = Object.keys(pkg.dependencies).filter(
  (dep) =>
    ![
      '@project/components',
      '@tiptap/pm',
      'read-excel-file',
      '@fontsource-variable/sora',
      '@fontsource-variable/vazirmatn',
    ].includes(dep),
);

const deps = new Set([
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom',
  'react-dom/client',
  'react-dom/server',
  ...pkgDeps,
]);

const apiTarget = process.env.VITE_API_PROXY ?? 'http://127.0.0.1:4000';

export default defineConfig(() => ({
  build: {
    target: 'esnext',
    sourcemap: false,
    reportCompressedSize: false,
  },
  server: {
    host: '::',
    port: 8080,
    cors: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: false,
        rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
      },
      '/media': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/healthz': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/readyz': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [...deps],
    entries: ['index.html', 'src/**/*.{ts,tsx,js,jsx}'],
  },
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'zitejs/api': path.resolve(__dirname, './src/lib/api-client.ts'),
      'zitejs/upload': path.resolve(__dirname, './src/lib/upload.ts'),
    },
  },
}));
