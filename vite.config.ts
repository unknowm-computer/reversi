import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  plugins: [vue()],
  server: { port: 5188, strictPort: true, proxy: { '/socket.io': { target: 'http://localhost:3001', ws: true } } },
});
