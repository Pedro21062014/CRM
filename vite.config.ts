import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Evita erro de 'process is not defined' no navegador se o replace não ocorrer automaticamente
    'process.env': process.env
  }
});