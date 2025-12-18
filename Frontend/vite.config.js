import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'


// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(),react(),],
  server: {
    port: 3000,   // 👈 change to any port you want
    strictPort: true, // optional: fail if port is already in use
  },
  build: {
    sourcemap: true,
  },
  
})
