import { defineConfig } from '@apps-in-toss/web-framework/config';

// 앱인토스 WebView SDK 2.x 설정
export default defineConfig({
  appName: 'mindfulness',
  brand: {
    displayName: '마음챙김',
    primaryColor: '#5C6BC0',
    icon: 'https://cdn.mindfulness.app/logo.png',
  },
  web: {
    host: 'localhost',
    port: 3000,
    commands: {
      dev: 'vite --host',
      build: 'tsc && vite build',
    },
  },
  permissions: [],
});
