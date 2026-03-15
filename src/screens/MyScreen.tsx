import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import './MyScreen.css';

export function MyScreen() {
  const { isPremium, premiumPlan, maumPoints, streakDays, totalMinutes, records, badges, subscribePremium, claimReward, isDarkMode, toggleDarkMode } = useStore();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  const canClaimReward = streakDays >= 7 && !rewardClaimed;

  const handleClaimReward = () => {
    claimReward();
    setRewardClaimed(true);
  };

  const handleSubscribe = () => {
    subscribePremium(selectedPlan);
    setShowSubscribeModal(false);
  };

  return (
    <div className="screen-content my-screen">
      <div className="my-header">
        <h1 className="my-title">마이</h1>
      </div>

      {/* 프로필 카드 */}
      <div className="profile-card">
        <div className="profile-avatar">🧘</div>
        <div className="profile-info">
          <p className="profile-name">명상하는 사람</p>
          <p className="profile-sub">토스 계정으로 로그인됨</p>
        </div>
        {isPremium && (
          <span className="premium-badge-pill">✨ 프리미엄</span>
        )}
      </div>

      {/* 마음P 카드 */}
      <div className="point-card">
        <div className="point-card-left">
          <p className="point-card-label">마음P 잔액</p>
          <p className="point-card-value">{maumPoints.toLocaleString()} P</p>
          <p className="point-card-sub">명상으로 포인트를 모아봐요</p>
        </div>
        <div className="point-card-icon">⭐</div>
      </div>

      {/* 리워드 섹션 */}
      <div className="section-header" style={{ marginTop: 8 }}>
        <h2 className="section-title" style={{ fontSize: '16px' }}>리워드</h2>
      </div>

      <div className="reward-card">
        <div className="reward-icon">🏆</div>
        <div className="reward-info">
          <p className="reward-title">7일 연속 명상 챌린지</p>
          <p className="reward-sub">완료 시 1,000P 지급</p>
          <div className="streak-progress">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`streak-dot ${i < streakDays ? 'done' : ''}`}>
                {i < streakDays ? '✓' : ''}
              </div>
            ))}
          </div>
        </div>
        <button
          className={`reward-btn ${canClaimReward ? 'claimable' : rewardClaimed ? 'claimed' : 'pending'}`}
          onClick={canClaimReward ? handleClaimReward : undefined}
          disabled={!canClaimReward}
        >
          {rewardClaimed ? '수령완료' : canClaimReward ? '수령하기' : `${streakDays}/7`}
        </button>
      </div>

      {/* 구독 섹션 */}
      <div className="section-header">
        <h2 className="section-title" style={{ fontSize: '16px' }}>구독</h2>
      </div>

      {isPremium ? (
        <div className="premium-active-card">
          <span className="premium-active-icon">✨</span>
          <div>
            <p className="premium-active-title">프리미엄 이용 중이에요</p>
            <div className="premium-active-row">
              <span className="premium-plan-badge">
                {premiumPlan === 'annual' ? '연간 구독 · 39,900원/년' : '월간 구독 · 4,900원/월'}
              </span>
            </div>
            <p className="premium-active-sub">33개 명상 세션을 무제한으로 즐겨봐요</p>
          </div>
        </div>
      ) : (
        <div className="subscription-card">
          <div className="sub-header">
            <p className="sub-title">마음챙김 프리미엄</p>
            <div className="sub-price">
              <span className="sub-price-amount">4,900원</span>
              <span className="sub-price-unit">/월</span>
            </div>
          </div>

          <div className="sub-features">
            {[
              { icon: '🎵', text: '33개 명상 세션 무제한 이용' },
              { icon: '⏱', text: '5·10·20·45분 세션 선택' },
              { icon: '🌙', text: '수면·집중·불안 등 12가지 테마' },
              { icon: '📊', text: 'AI 감정 분석 및 인사이트' },
              { icon: '⭐', text: '매주 마음P 리워드' },
              { icon: '📱', text: '오프라인 저장 (최대 10개)' },
            ].map((f, i) => (
              <div key={i} className="sub-feature">
                <span className="sub-feature-icon">{f.icon}</span>
                <span className="sub-feature-text">{f.text}</span>
              </div>
            ))}
          </div>

          <button className="sub-btn" onClick={() => setShowSubscribeModal(true)}>
            프리미엄 구독하기
          </button>
          <p className="sub-note">언제든지 취소 가능해요 · 연간 구독 시 2개월 무료</p>
        </div>
      )}

      {/* 설정 */}
      <div className="section-header">
        <h2 className="section-title" style={{ fontSize: '16px' }}>설정</h2>
      </div>

      <div className="settings-card">
        <div className="setting-item">
          <div className="setting-left">
            <span className="setting-icon">🔔</span>
            <div>
              <p className="setting-label">명상 알림</p>
              <p className="setting-sub">매일 저녁 8시에 알려드려요</p>
            </div>
          </div>
          <button
            className={`toggle ${notifEnabled ? 'on' : 'off'}`}
            onClick={() => setNotifEnabled(!notifEnabled)}
          >
            <div className="toggle-thumb" />
          </button>
        </div>

        <div className="setting-divider" />

        <div className="setting-item">
          <div className="setting-left">
            <span className="setting-icon">🌙</span>
            <div>
              <p className="setting-label">다크 모드</p>
              <p className="setting-sub">{isDarkMode ? '다크 모드 켜짐' : '라이트 모드'}</p>
            </div>
          </div>
          <button
            className={`toggle ${isDarkMode ? 'on' : 'off'}`}
            onClick={toggleDarkMode}
          >
            <div className="toggle-thumb" />
          </button>
        </div>

      </div>

      {/* 앱 정보 */}
      <div className="app-info">
        <p className="app-version">마음챙김 v1.0.0</p>
        <p className="app-copy">토스 인앱 명상 서비스 · 앱인토스 미니앱</p>
      </div>

      {/* 구독 모달 */}
      <AnimatePresence>
        {showSubscribeModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSubscribeModal(false)}
          >
            <motion.div
              className="subscribe-modal"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-handle" />
              <p className="modal-emoji">✨</p>
              <p className="modal-title">마음챙김 프리미엄</p>
              <p className="modal-desc">구독 플랜을 선택해주세요.</p>

              <div className="modal-price-options">
                <button
                  className={`price-option ${selectedPlan === 'monthly' ? 'selected' : ''}`}
                  onClick={() => setSelectedPlan('monthly')}
                >
                  <p className="price-option-label">월간 구독</p>
                  <p className="price-option-amount">4,900원</p>
                  <p className="price-option-unit">/월</p>
                </button>
                <button
                  className={`price-option ${selectedPlan === 'annual' ? 'selected' : ''}`}
                  onClick={() => setSelectedPlan('annual')}
                >
                  <p className="price-option-label">연간 구독</p>
                  <p className="price-option-amount">39,900원</p>
                  <p className="price-option-unit">/년</p>
                  <span className="price-option-save">2개월 무료</span>
                </button>
              </div>

              <button className="modal-subscribe-btn" onClick={handleSubscribe}>
                {selectedPlan === 'monthly' ? '월 4,900원 결제하기' : '연 39,900원 결제하기'}
              </button>
              <p className="modal-billing-note">
                {selectedPlan === 'monthly'
                  ? '매월 자동 결제 · 언제든 취소 가능'
                  : '연 39,900원 (월 3,325원) · 언제든 취소 가능'}
              </p>
              <button className="modal-cancel-btn" onClick={() => setShowSubscribeModal(false)}>
                나중에 할게요
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}
