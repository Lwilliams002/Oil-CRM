// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Oil-CRM/', // keep this line for GitHub Pages
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5174', // 👈 forwards API calls to your Express server
    },
  },
})