// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Oil-CRM/',    // ← this must match your GitHub Pages repo name
  plugins: [react()],
})