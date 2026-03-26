import { defineConfig } from '@apps-in-toss/web-framework/config';

// ADB reverse tcp:3000 tcp:3000 를 사용하므로 phone의 localhost:3000 → PC 포트 3000
// WiFi LAN IP 방식은 Windows 방화벽 / AP isolation 문제로 불안정
const webHost = 'localhost';
console.log(`[granite] webHost: ${webHost}:3000 (ADB reverse 사용)`);

export default defineConfig({
  appName: 'mindfulness',
  brand: {
    displayName: '마음챙김',
    primaryColor: '#5C6BC0',
    icon: 'https://mindfulness-production-2fee.up.railway.app/logo.png',
  },
  web: {
    host: webHost,
    port: 3000,
    commands: {
      dev: 'vite --host',
      build: 'tsc && vite build',
    },
  },
  permissions: [],
});
