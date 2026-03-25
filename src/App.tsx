import { useEffect, Component, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { ExploreScreen } from './screens/ExploreScreen';
import { SessionScreen } from './screens/SessionScreen';
import { RecordScreen } from './screens/RecordScreen';
import { MyScreen } from './screens/MyScreen';
import { IntroScreen } from './screens/IntroScreen';
import { useStore } from './store/useStore';
import { registerNotif } from './lib/notifApi';
import './App.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ position: 'fixed', inset: 0, background: '#1A0A0A', color: 'white', padding: 20, fontFamily: 'monospace', fontSize: 12, overflow: 'auto', wordBreak: 'break-all', whiteSpace: 'pre-wrap', zIndex: 99999 }}>
          <b style={{ color: '#FF6B6B', fontSize: 14 }}>❌ React 에러</b>{'\n\n'}{err.message}{'\n\n'}{err.stack}
        </div>
      );
    }
    return this.props.children;
  }
}

const SCREENS = {
  home: HomeScreen,
  explore: ExploreScreen,
  session: SessionScreen,
  record: RecordScreen,
  my: MyScreen,
};

function AppInner() {
  const { activeTab, isInitializing, tossUserId, initTossUser, checkSubscription, stopInitializing, notifEnabled, notifTime } = useStore();
  const ActiveScreen = SCREENS[activeTab];

  useEffect(() => {
    if (tossUserId) {
      initTossUser().then(() => {
        checkSubscription();
        // 앱 재진입 시 알림 스케줄 재등록 (서버 재시작 대비)
        if (notifEnabled) registerNotif(tossUserId, notifTime);
      });
    } else {
      stopInitializing();
    }
  }, []); // eslint-disable-line

  // 뒤로가기: 홈이 아닌 탭 → 홈으로 이동 / 홈 → 종료 다이얼로그(기본)
  // pushState URL에 #app 해시를 붙여야 RN WebView가 canGoBack=true로 인식
  useEffect(() => {
    const baseUrl = window.location.href.split('#')[0];
    window.history.pushState(null, '', baseUrl + '#app');

    const handlePopState = () => {
      if (useStore.getState().activeTab !== 'home') {
        useStore.getState().setActiveTab('home');
        window.history.pushState(null, '', baseUrl + '#app');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 재방문 유저 로딩 중
  if (isInitializing && tossUserId) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧘</div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>불러오는 중이에요...</p>
        </div>
      </div>
    );
  }

  // 인트로 (미로그인)
  if (!tossUserId && !isInitializing) {
    return <IntroScreen />;
  }

  // 인트로에서 로그인 진행 중
  if (!tossUserId && isInitializing) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #3D4FAF 0%, #5C6BC0 50%, #7986CB 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧘</div>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15 }}>토스 로그인 중이에요...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="screen-wrapper">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="screen-motion-wrapper"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <ActiveScreen />
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
