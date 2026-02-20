import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.ASAAS_TOKEN': JSON.stringify('$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjQ0ZThiNmQ0LTY3NjQtNDNjNy1hNTUwLWFkY2IyNjkzODdmODo6JGFhY2hfYWMzNThiYzMtMTBkYy00ZDg3LTkzMjEtOWQ1YTNiZmQ3MTEz')
  }
});