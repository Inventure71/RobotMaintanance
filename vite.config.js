import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          terminal: ['xterm', 'xterm-addon-fit'],
          modelViewer: ['@google/model-viewer'],
        },
      },
    },
  },
});
