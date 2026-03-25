import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import https from 'https'
import fs from 'fs'

/**
 * cert_key/ 디렉토리의 mTLS 인증서로 HTTPS Agent 생성
 * 인증서가 없으면 undefined 반환 (빌드 환경 등)
 */
function createTossAgent(): https.Agent | undefined {
  const certPath = path.resolve(__dirname, 'cert_key/mindfulness_public.crt')
  const keyPath  = path.resolve(__dirname, 'cert_key/mindfulness_private.key')
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) return undefined
  return new https.Agent({
    cert: fs.readFileSync(certPath),
    key:  fs.readFileSync(keyPath),
    rejectUnauthorized: true,
  })
}

export default defineConfig(({ mode }) => {
  const tossAgent = createTossAgent()

  return {
    plugins: [react()],
    base: mode === 'web' ? '/mindfulness/' : '/',
    server: {
      port: 3000,
      host: true,   // 0.0.0.0 — 같은 WiFi 폰에서 접근 가능
      allowedHosts: true,  // 192.168.x.x Host 헤더 허용 (Vite 5.4.x DNS rebinding 패치 우회)
      proxy: {
        /** mTLS 프록시: /api/toss-login/* → apps-in-toss-api.toss.im */
        ...(tossAgent ? {
          '/api/toss-login': {
            target: 'https://apps-in-toss-api.toss.im',
            changeOrigin: true,
            rewrite: (p: string) =>
              p.replace(/^\/api\/toss-login/, '/api-partner/v1/apps-in-toss/user/oauth2'),
            agent: tossAgent,
            secure: true,
          },
        } : {}),
        /** 알림 스케줄 API: /api/notif/* → webhook-server:4000 */
        '/api/notif': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'framer-motion', 'zustand'],
    },
    resolve: {
      alias: {
        // web-framework mock은 항상 적용 — AppsInToss(mTLS proxy 래퍼) 등 실제 패키지에 없는
        // 커스텀 심볼을 tossAuth.ts 가 사용하므로 프로덕션 빌드에서도 필요
        '@apps-in-toss/web-framework': path.resolve(
          __dirname,
          'src/lib/__mocks__/apps-in-toss-framework.ts'
        ),
        // web-bridge mock은 dev/web 모드에서만 적용
        // — ait 빌드(production)에서는 실제 패키지를 사용해야 IAP 네이티브 브릿지가 동작함
        ...(mode === 'development' || mode === 'web'
          ? {
              '@apps-in-toss/web-bridge': path.resolve(
                __dirname,
                'src/lib/__mocks__/apps-in-toss-framework.ts'
              ),
            }
          : {}),
      },
    },
  }
})
