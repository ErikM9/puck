import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      /* Kept in step with the "@/*" mapping in tsconfig.json, or the two disagree */
      '@': path.resolve(__dirname, './src'),
    },
  },
});
