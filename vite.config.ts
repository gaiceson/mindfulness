import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'web' ? '/mindfulness/' : '/',
  server: {
    port: 3000,
    host: true,   // 0.0.0.0 — 같은 WiFi 폰에서 접근 가능
  },
  resolve: {
    alias: (mode === 'development' || mode === 'web') ? {
      '@apps-in-toss/web-framework': path.resolve(
        __dirname,
        'src/lib/__mocks__/apps-in-toss-framework.ts'
      ),
    } : {},
  },
}))
