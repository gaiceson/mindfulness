import { motion } from 'framer-motion';
import { EmotionPicker } from '../components/EmotionPicker';
import { MeditationCard } from '../components/MeditationCard';
import { useStore } from '../store/useStore';
import { getRecommendedSessions, SESSIONS } from '../data/sessions';
import './HomeScreen.css';

export function HomeScreen() {
  const { selectedEmotion, setSelectedEmotion, streakDays, totalMinutes, maumPoints, totalSessions, records } = useStore();

  const recommended = selectedEmotion
    ? getRecommendedSessions(selectedEmotion)
    : SESSIONS.filter((s) => !s.isPremium).slice(0, 4);

  const today = new Date();
  const hour = today.getHours();
  const greeting =
    hour < 6 ? '아직 새벽이네요 🌙' :
    hour < 12 ? '좋은 아침이에요 ☀️' :
    hour < 18 ? '활기찬 오후예요 🌤' :
    '편안한 저녁이에요 🌙';

  const lastSession = records[0];

  return (
    <div className="screen-content home-screen">
      {/* 헤더 */}
      <motion.div
        className="home-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="home-header-top">
          <div>
            <p className="home-greeting">{greeting}</p>
            <h1 className="home-title">마음챙김</h1>
          </div>
          <div className="home-point-badge">
            <span className="point-icon">⭐</span>
            <span className="point-value">{maumPoints.toLocaleString()}P</span>
          </div>
        </div>
      </motion.div>

      {/* 통계 카드 */}
      <motion.div
        className="stats-row"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="stat-card">
          <span className="stat-emoji">🔥</span>
          <p className="stat-value">{streakDays}일</p>
          <p className="stat-label">연속 명상</p>
        </div>
        <div className="stat-card">
          <span className="stat-emoji">⏱</span>
          <p className="stat-value">{totalMinutes}분</p>
          <p className="stat-label">총 명상 시간</p>
        </div>
        <div className="stat-card">
          <span className="stat-emoji">🧘</span>
          <p className="stat-value">{totalSessions}회</p>
          <p className="stat-label">완료 세션</p>
        </div>
      </motion.div>

      {/* 감정 체크인 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <EmotionPicker selected={selectedEmotion} onSelect={setSelectedEmotion} />
      </motion.div>

      {/* 최근 이어하기 */}
      {lastSession && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="section-header">
            <h2 className="section-title">이어서 명상해요</h2>
          </div>
          <div className="px-20">
            <div className="continue-card">
              <div className="continue-icon">🧘</div>
              <div className="continue-info">
                <p className="continue-label">마지막 세션</p>
                <p className="continue-title">{lastSession.sessionTitle}</p>
              </div>
              <button
                className="continue-btn"
                onClick={() => {
                  const session = SESSIONS.find(s => s.id === lastSession.sessionId);
                  if (session) {
                    useStore.getState().setCurrentSession(session);
                    useStore.getState().setActiveTab('session');
                  }
                }}
              >
                시작하기
              </button>
            </div>
          </div>
        </motion.section>
      )}

      {/* 추천 세션 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <div className="section-header">
          <h2 className="section-title">
            {selectedEmotion ? '맞춤 추천 명상이에요' : '오늘의 명상'}
          </h2>
          <button
            className="section-more"
            onClick={() => useStore.getState().setActiveTab('explore')}
          >
            전체보기
          </button>
        </div>
        <div className="session-list">
          {recommended.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="px-20"
            >
              <MeditationCard session={session} variant="horizontal" />
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 7일 챌린지 배너 */}
      <motion.div
        className="challenge-banner"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <div className="challenge-content">
          <p className="challenge-label">🏆 7일 챌린지</p>
          <p className="challenge-title">7일 연속 명상하면<br />마음P 1,000P를 드려요</p>
          <div className="challenge-progress">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`challenge-dot ${i < streakDays ? 'done' : ''}`}>
                {i < streakDays ? '✓' : i + 1}
              </div>
            ))}
          </div>
        </div>
        <div className="challenge-reward">
          <span className="challenge-reward-icon">⭐</span>
          <span className="challenge-reward-text">1,000P</span>
        </div>
      </motion.div>
    </div>
  );
}
