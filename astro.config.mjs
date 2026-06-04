import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  outDir: './dist',
  publicDir: './public',
  srcDir: './src',
  site: 'https://example.com',  // заменить на реальный домен позже
  build: {
    assets: 'assets',
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          loadPaths: [path.join(__dirname, '#src', 'scss')],
        },
      },
    },
  },
});
