import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Server-side rendering bundle (dist-ssr/entry-server.js) includes its own copy of React,
  // so the Node server can render pages without extra packages.
  ssr: { noExternal: true },
  server: {
    port: 5173,
    // In development, /api calls are forwarded to the Node server.
    proxy: { '/api': 'http://localhost:5000' },
  },
});
