import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 关键：必须是相对路径，否则 Electron 加载不到资源
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});