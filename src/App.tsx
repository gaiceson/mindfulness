import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { ExploreScreen } from './screens/ExploreScreen';
import { SessionScreen } from './screens/SessionScreen';
import { RecordScreen } from './screens/RecordScreen';
import { MyScreen } from './screens/MyScreen';
import { useStore } from './store/useStore';
import './App.css';

const SCREENS = {
  home: HomeScreen,
  explore: ExploreScreen,
  session: SessionScreen,
  record: RecordScreen,
  my: MyScreen,
};

export default function App() {
  const { activeTab, initTossUser } = useStore();
  const ActiveScreen = SCREENS[activeTab];

  useEffect(() => {
    initTossUser();
  }, []);

  return (
    <div className="app-shell">
      {/* 상태바 영역 */}
      <div className="status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons">
          <span>●●●</span>
          <span>WiFi</span>
          <span>🔋</span>
        </div>
      </div>

      {/* 화면 */}
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

      {/* 하단 탭바 */}
      <BottomNav />
    </div>
  );
}
