import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow access through a cloudflared quick tunnel (random *.trycloudflare.com subdomain)
    // for sharing the local dev server for testing.
    allowedHosts: [".trycloudflare.com"],
  },
})
