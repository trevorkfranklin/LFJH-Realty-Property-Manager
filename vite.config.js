import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/chat': {
          target: 'https://openrouter.ai',
          changeOrigin: true,
          rewrite: () => '/api/v1/chat/completions',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${env.OPENROUTER_API_KEY}`);
              proxyReq.setHeader('HTTP-Referer', 'http://localhost:5173');
              proxyReq.setHeader('X-Title', 'LT2D Realty Property Manager');
            });
          },
        },
      },
    },
  }
})
