import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BreathingCircle } from '../components/BreathingCircle';
import { useStore } from '../store/useStore';
import { SESSIONS } from '../data/sessions';
import {
  startSessionSound,
  stopSessionSound,
  setMasterVolume,
  playCompletionBell,
  disposeAudio,
  CATEGORY_SOUND_PROFILES,
  SessionCategory,
} from '../utils/audioEngine';
import './SessionScreen.css';

type PlayerState = 'idle' | 'playing' | 'paused' | 'completed';

export function SessionScreen() {
  const { currentSession, setCurrentSession, setActiveTab, isPremium, completeMeditation } = useStore();
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [showBreath, setShowBreath] = useState(false);
  const [activeBreathTab, setActiveBreathTab] = useState<'4-7-8' | 'box' | 'simple'>('simple');
  const [volume, setVolume] = useState(0.4);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const session = currentSession || SESSIONS[0];
  const totalSeconds = session.duration * 60;
  const progress = Math.min(elapsed / totalSeconds, 1);
  const isLocked = session.isPremium && !isPremium;

  const soundProfile = CATEGORY_SOUND_PROFILES[session.category as SessionCategory]
    ?? CATEGORY_SOUND_PROFILES.stress;

  // 세션 변경 시 초기화
  useEffect(() => {
    setPlayerState('idle');
    setElapsed(0);
    setShowBreath(false);
    stopSessionSound(false);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopSessionSound(false);
    };
  }, [session.id]);

  useEffect(() => () => { disposeAudio(); }, []);

  // 재생 상태 → 오디오 제어
  useEffect(() => {
    if (playerState === 'playing') {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev >= totalSeconds) { setPlayerState('completed'); return prev; }
          return prev + 1;
        });
      }, 1000);
      // 세션별 사운드 시작
      startSessionSound(session.category as SessionCategory, volume, session.id);

    } else if (playerState === 'paused') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopSessionSound(true);

    } else if (playerState === 'completed') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopSessionSound(true);
      playCompletionBell();
      completeMeditation(session);

    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playerState]); // eslint-disable-line

  const handlePlayToggle = () =>
    setPlayerState(p => p === 'playing' ? 'paused' : 'playing');

  const handleReset = () => {
    setPlayerState('idle');
    setElapsed(0);
    stopSessionSound(false);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    setMasterVolume(v);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const remaining = totalSeconds - elapsed;

  const CATEGORY_GRADIENTS: Record<string, string> = {
    stress:  'linear-gradient(160deg, #667eea 0%, #764ba2 100%)',
    sleep:   'linear-gradient(160deg, #1a1a3e 0%, #2C3E7A 100%)',
    focus:   'linear-gradient(160deg, #5C6BC0 0%, #3F51B5 100%)',
    anxiety: 'linear-gradient(160deg, #43e97b 0%, #38bfb0 100%)',
    breath:  'linear-gradient(160deg, #4facfe 0%, #00d2ff 100%)',
    morning: 'linear-gradient(160deg, #f6d365 0%, #fda085 100%)',
    love:    'linear-gradient(160deg, #f093fb 0%, #f5576c 100%)',
  };
  const gradient = CATEGORY_GRADIENTS[session.category] || CATEGORY_GRADIENTS.stress;

  // ── 완료 화면 ─────────────────────────────────────────────────────────────
  if (playerState === 'completed') {
    return (
      <motion.div
        className="session-completed"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ background: gradient }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="completed-icon"
        >✨</motion.div>
        <h2 className="completed-title">명상을 마쳤어요</h2>
        <p className="completed-sub">오늘도 마음을 잘 돌봤어요</p>
        <div className="completed-stats">
          <div className="completed-stat">
            <span className="cs-value">{session.duration}분</span>
            <span className="cs-label">명상 시간</span>
          </div>
          <div className="completed-divider" />
          <div className="completed-stat">
            <span className="cs-value">+{session.duration >= 10 ? 100 : 50}P</span>
            <span className="cs-label">포인트 적립</span>
          </div>
        </div>
        <button className="completed-btn" onClick={() => { setPlayerState('idle'); setElapsed(0); setActiveTab('home'); }}>
          홈으로 돌아가기
        </button>
        <button className="completed-btn-ghost" onClick={() => { setPlayerState('idle'); setElapsed(0); setActiveTab('record'); }}>
          기록 확인하기
        </button>
      </motion.div>
    );
  }

  // ── 메인 화면 ─────────────────────────────────────────────────────────────
  return (
    <div className="screen-content session-screen">
      {/* 헤더 */}
      <div className="session-hero" style={{ background: gradient }}>
        <div className="session-hero-content">
          <p className="session-category-label">{session.subtitle}</p>
          <h1 className="session-title">{session.title}</h1>
          <p className="session-instructor">by {session.instructor}</p>
        </div>
        <div className="session-thumbnail">{session.thumbnail}</div>
      </div>

      {/* 태그 */}
      <div className="session-tags">
        {session.tags.map(tag => (
          <span key={tag} className="session-tag">#{tag}</span>
        ))}
      </div>

      {/* 설명 */}
      <div className="session-desc-card">
        <p className="session-description">{session.description}</p>
        <div className="session-meta-row">
          <span className="session-meta-item">⏱ {session.duration}분</span>
          <span className="session-meta-item">👤 {session.instructor}</span>
          {session.isPremium
            ? <span className="badge badge-premium">PRO</span>
            : <span className="badge badge-free">FREE</span>}
        </div>
      </div>

      {/* 잠금 / 플레이어 */}
      {isLocked ? (
        <div className="locked-player">
          <div className="locked-icon">🔒</div>
          <h3 className="locked-title">프리미엄 콘텐츠예요</h3>
          <p className="locked-sub">구독하면 모든 프리미엄 명상을 무제한으로 즐길 수 있어요</p>
          <button className="btn-primary" onClick={() => setActiveTab('my')}>
            프리미엄 구독하기 → 월 4,900원
          </button>
        </div>
      ) : (
        <div className="player-container">

          {/* 사운드 프로파일 배지 */}
          <div className="sound-profile-badge">
            <span className="spb-emoji">{soundProfile.emoji}</span>
            <div className="spb-info">
              <p className="spb-name">{soundProfile.label}</p>
              <p className="spb-desc">{soundProfile.description}</p>
            </div>
          </div>

          {/* 타이머 링 */}
          <div className="timer-section">
            <svg className="timer-ring" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#E8ECF0" strokeWidth="6" />
              <circle
                cx="60" cy="60" r="54"
                fill="none" stroke="#5C6BC0" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress)}`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="timer-display">
              <span className="timer-time">{formatTime(remaining)}</span>
              <span className="timer-label">남은 시간</span>
            </div>
          </div>

          {/* 볼륨 슬라이더 */}
          <div className="volume-row">
            <span className="vol-icon">🔈</span>
            <input
              type="range" min={0} max={1} step={0.05} value={volume}
              onChange={e => handleVolumeChange(parseFloat(e.target.value))}
              className="volume-slider"
            />
            <span className="vol-icon">🔊</span>
          </div>

          {/* 컨트롤 */}
          <div className="player-controls">
            <button className="ctrl-btn ctrl-reset" onClick={handleReset} disabled={playerState === 'idle'}>
              ↺
            </button>
            <motion.button
              className={`ctrl-btn ctrl-play ${playerState === 'playing' ? 'playing' : ''}`}
              onClick={handlePlayToggle}
              whileTap={{ scale: 0.92 }}
            >
              {playerState === 'playing' ? '⏸' : '▶'}
            </motion.button>
            <button className="ctrl-btn ctrl-breath" onClick={() => setShowBreath(!showBreath)}>
              🌬️
            </button>
          </div>

          <p className="player-hint">
            {playerState === 'idle'
              ? `▶ 버튼을 누르면 ${soundProfile.emoji} ${soundProfile.label}가 시작돼요`
              : playerState === 'playing'
              ? `${soundProfile.emoji} ${soundProfile.label} 재생 중이에요`
              : '일시정지 중이에요'}
          </p>

          {/* 호흡 가이드 */}
          <AnimatePresence>
            {showBreath && (
              <motion.div
                className="breath-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="breath-tabs">
                  {(['simple', '4-7-8', 'box'] as const).map(t => (
                    <button
                      key={t}
                      className={`breath-tab ${activeBreathTab === t ? 'active' : ''}`}
                      onClick={() => setActiveBreathTab(t)}
                    >
                      {t === 'simple' ? '기본' : t === '4-7-8' ? '4-7-8' : '박스'}
                    </button>
                  ))}
                </div>
                <BreathingCircle
                  technique={activeBreathTab}
                  isActive={playerState === 'playing'}
                  color="#5C6BC0"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 다른 세션 추천 */}
      <div className="related-section">
        <div className="section-header">
          <h2 className="section-title" style={{ fontSize: '16px' }}>이런 명상도 있어요</h2>
        </div>
        <div className="related-scroll">
          {SESSIONS
            .filter(s => s.id !== session.id && s.category === session.category)
            .slice(0, 3)
            .map(s => (
              <motion.div
                key={s.id}
                className="related-card"
                style={{ background: gradient }}
                onClick={() => { setCurrentSession(s); setPlayerState('idle'); setElapsed(0); stopSessionSound(false); }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="related-thumb">{s.thumbnail}</span>
                <p className="related-title">{s.title}</p>
                <p className="related-dur">{s.duration}분</p>
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
}
