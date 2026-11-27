import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build`        -> dist/         (serveri bilan birga ishlaydi)
// `npm run build:single` -> dist-single/  (bitta Pulim.html, ikki marta bosib ochiladi)
export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    base: single ? './' : '/',
    define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')) },
    plugins: [react(), tailwindcss(), ...(single ? [viteSingleFile()] : [])],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      ...(!single ? { rolldownOptions: { output: { manualChunks: (id) => (id.includes('node_modules') ? 'vendor' : undefined) } } } : {}),
    },
    server: { proxy: { '/api': 'http://localhost:8787' } },
  }
})
