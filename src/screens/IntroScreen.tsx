import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import './IntroScreen.css';

const FEATURES = [
  { icon: '🌿', title: '매일 5분', desc: '짧은 명상으로 하루를 리셋해요' },
  { icon: '🎯', title: '감정 기반 추천', desc: '지금 내 감정에 맞는 세션을 골라드려요' },
  { icon: '🏆', title: '연속 기록', desc: '7일 연속 명상으로 성취 배지를 받아요' },
];

export function IntroScreen() {
  const { initTossUser, checkSubscription } = useStore();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await initTossUser();
    await checkSubscription();
  };

  return (
    <div className="app-shell intro-shell">
      {/* 배경 그라디언트 */}
      <div className="intro-bg" />

      <div className="intro-content">
        {/* 로고 영역 */}
        <motion.div
          className="intro-logo"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="intro-logo-icon">🧘</div>
          <h1 className="intro-title">마음챙김</h1>
          <p className="intro-subtitle">바쁜 일상 속, 나만의 고요한 시간</p>
        </motion.div>

        {/* 기능 소개 */}
        <motion.div
          className="intro-features"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        >
          {FEATURES.map((f) => (
            <div key={f.title} className="intro-feature-item">
              <span className="intro-feature-icon">{f.icon}</span>
              <div>
                <p className="intro-feature-title">{f.title}</p>
                <p className="intro-feature-desc">{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* 로그인 버튼 */}
        <motion.div
          className="intro-cta"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
        >
          <button
            className="intro-login-btn"
            onClick={handleLogin}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
              <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z" fill="white" opacity="0.25"/>
              <path d="M31.2 17.6H16.8c-.884 0-1.6.716-1.6 1.6v9.6c0 .884.716 1.6 1.6 1.6h14.4c.884 0 1.6-.716 1.6-1.6v-9.6c0-.884-.716-1.6-1.6-1.6zm-7.2 8.8c-1.326 0-2.4-1.074-2.4-2.4s1.074-2.4 2.4-2.4 2.4 1.074 2.4 2.4-1.074 2.4-2.4 2.4z" fill="white"/>
            </svg>
            {loading ? '로그인 중...' : '토스로 시작하기'}
          </button>
          <p className="intro-notice">토스 계정으로 안전하게 로그인해요</p>
        </motion.div>
      </div>
    </div>
  );
}
