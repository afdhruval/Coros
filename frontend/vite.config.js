import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    // ---------------------------------------------------------------------------
    // Development proxy
    // ---------------------------------------------------------------------------
    // During development the React dev-server runs on :5173 and the Express
    // server runs on :3000.  Any request that starts with /api or /auth is
    // forwarded to Express so relative-path API calls work exactly as they will
    // in production.
    //
    // In production this entire `server` block is ignored — Express serves the
    // built /dist directly and there is no separate Vite dev-server.
    // ---------------------------------------------------------------------------
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
})
