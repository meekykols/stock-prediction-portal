import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss(),],
  server: {
    port: 3000,   // 👈 change to any port you want
    strictPort: true, // optional: fail if port is already in use
  },
  
})
