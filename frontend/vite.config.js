import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/ace': 'http://localhost:6878',
      '/webui': 'http://localhost:6878'
    }
  }
});
