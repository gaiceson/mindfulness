import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IAP } from '@apps-in-toss/web-bridge';
import { useStore } from '../store/useStore';
import { registerNotif, unregisterNotif } from '../lib/notifApi';
import './MyScreen.css';

const SUBSCRIPTION_SKUS = {
  monthly: 'ait.0000022387.081e24bf.edb4c397a9.3389690467',
  annual: 'ait.0000022387.3133e386.c6f19b393f.3389781816',
} as const;

export function MyScreen() {
  const { isPremium, premiumPlan, premiumExpiresAt, maumPoints, streakDays, totalMinutes, records, badges, subscribePremium, claimReward, isDarkMode, toggleDarkMode, notifEnabled, toggleNotif, notifTime, setNotifTime, tossUserId } = useStore();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // 타임피커 내부 상태 (HH:MM → 분리)
  const initHour = parseInt(notifTime.split(':')[0], 10);
  const initMin  = parseInt(notifTime.split(':')[1], 10);
  const [pickerAmPm, setPickerAmPm] = useState<'AM' | 'PM'>(initHour < 12 ? 'AM' : 'PM');
  const [pickerHour, setPickerHour]  = useState(initHour % 12 === 0 ? 12 : initHour % 12);
  const [pickerMin,  setPickerMin]   = useState(initMin);

  const openTimePicker = () => {
    const h = parseInt(notifTime.split(':')[0], 10);
    const m = parseInt(notifTime.split(':')[1], 10);
    setPickerAmPm(h < 12 ? 'AM' : 'PM');
    setPickerHour(h % 12 === 0 ? 12 : h % 12);
    setPickerMin(m);
    setShowTimePicker(true);
  };

  const confirmTimePicker = () => {
    const h24 = pickerAmPm === 'AM'
      ? (pickerHour === 12 ? 0 : pickerHour)
      : (pickerHour === 12 ? 12 : pickerHour + 12);
    const time = `${String(h24).padStart(2, '0')}:${String(pickerMin).padStart(2, '0')}`;
    handleNotifTimeChange(time);
    setShowTimePicker(false);
  };

  // 표시용 포맷: "오후 8:00"
  const formatNotifTime = (hhmm: string) => {
    const h = parseInt(hhmm.split(':')[0], 10);
    const m = hhmm.split(':')[1];
    const ampm = h < 12 ? '오전' : '오후';
    const h12  = h % 12 === 0 ? 12 : h % 12;
    return `${ampm} ${h12}:${m}`;
  };

  const handleNotifToggle = () => {
    const next = !notifEnabled;
    toggleNotif();
    if (tossUserId) {
      if (next) registerNotif(tossUserId, notifTime);
      else unregisterNotif(tossUserId);
    }
  };

  const handleNotifTimeChange = (time: string) => {
    setNotifTime(time);
    if (notifEnabled && tossUserId) {
      registerNotif(tossUserId, time);
    }
  };

  const canClaimReward = streakDays >= 7 && !rewardClaimed;

  const handleClaimReward = () => {
    claimReward();
    setRewardClaimed(true);
  };

  const iapCleanupRef = useRef<(() => void) | null>(null);

  const handleSubscribe = () => {
    const sku = SUBSCRIPTION_SKUS[selectedPlan];

    // dev/web 환경이면 mock 처리 (IAP 브릿지 미지원)
    if (!sku || import.meta.env.DEV) {
      const expiresAt = selectedPlan === 'annual'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30  * 24 * 60 * 60 * 1000).toISOString();
      subscribePremium(selectedPlan, 'mock-order', expiresAt);
      setShowSubscribeModal(false);
      return;
    }

    try {
      iapCleanupRef.current?.();
      iapCleanupRef.current = IAP.createSubscriptionPurchaseOrder({
        options: {
          sku,
          processProductGrant: ({ orderId }: { orderId: string; subscriptionId?: string }) => {
            console.info('[IAP] processProductGrant orderId:', orderId);
            const expiresAt = selectedPlan === 'annual'
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 30  * 24 * 60 * 60 * 1000).toISOString();
            subscribePremium(selectedPlan, orderId, expiresAt);
            return true;
          },
        },
        onEvent: () => {
          setShowSubscribeModal(false);
          iapCleanupRef.current?.();
        },
        onError: (err: unknown) => {
          console.error('[IAP] 구독 오류:', err);
          setShowSubscribeModal(false);
          alert('결제 중 오류가 발생했어요. 다시 시도해주세요.');
          iapCleanupRef.current?.();
        },
      });
    } catch (err) {
      console.error('[IAP] createSubscriptionPurchaseOrder 실패:', err);
      setShowSubscribeModal(false);
      alert('결제를 시작할 수 없어요. 다시 시도해주세요.');
    }
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

      {/* 마음코인 카드 */}
      <div className="point-card">
        <div className="point-card-left">
          <p className="point-card-label">마음코인 잔액</p>
          <p className="point-card-value">{maumPoints.toLocaleString()} 코인</p>
          <p className="point-card-sub">명상으로 마음코인을 모아봐요</p>
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
          <p className="reward-sub">완료 시 100코인 지급</p>
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
        <>
          <div className="premium-active-card">
            <span className="premium-active-icon">✨</span>
            <div>
              <p className="premium-active-title">프리미엄 이용 중이에요</p>
              <div className="premium-active-row">
                <span className="premium-plan-badge">
                  {premiumPlan === 'annual' ? '연간 구독 · 49,500원/년' : '월간 구독 · 4,950원/월'}
                </span>
              </div>
              <p className="premium-active-sub">
                {premiumExpiresAt
                  ? `${new Date(premiumExpiresAt).toLocaleDateString('ko-KR')} 갱신 예정`
                  : '33개 명상 세션을 무제한으로 즐겨봐요'}
              </p>
            </div>
          </div>
          <p className="sub-manage-note">
            구독 해지는 토스 앱 &gt; 전체 &gt; 구독 관리에서 할 수 있어요
          </p>
          {/* TODO: 테스트용 - 배포 전 삭제 */}
          <button
            style={{ marginTop: 8, padding: '6px 12px', fontSize: 12, color: '#FF3B30', background: 'none', border: '1px solid #FF3B30', borderRadius: 8, cursor: 'pointer' }}
            onClick={() => useStore.setState({ isPremium: false, premiumPlan: null, premiumExpiresAt: null })}
          >
            [테스트] 구독 초기화
          </button>
        </>
      ) : (
        <div className="subscription-card">
          <div className="sub-header">
            <p className="sub-title">마음챙김 프리미엄</p>
            <div className="sub-price">
              <span className="sub-price-amount">4,950원</span>
              <span className="sub-price-unit">/월</span>
            </div>
          </div>

          <div className="sub-features">
            {[
              { icon: '🎵', text: '33개 명상 세션 무제한 이용' },
              { icon: '⏱', text: '5·10·20·45분 세션 선택' },
              { icon: '🌙', text: '수면·집중·불안 등 12가지 테마' },
              { icon: '📊', text: 'AI 감정 분석 및 인사이트' },
              { icon: '⭐', text: '매주 마음코인 리워드' },
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
              {notifEnabled ? (
                <button className="notif-time-chip" onClick={openTimePicker}>
                  <span className="notif-time-chip-icon">⏰</span>
                  <span className="notif-time-chip-text">{formatNotifTime(notifTime)}</span>
                  <span className="notif-time-chip-arrow">›</span>
                </button>
              ) : (
                <p className="setting-sub">알림이 꺼져있어요</p>
              )}
            </div>
          </div>
          <button
            className={`toggle ${notifEnabled ? 'on' : 'off'}`}
            onClick={handleNotifToggle}
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
                  <p className="price-option-amount">4,950원</p>
                  <p className="price-option-unit">/월</p>
                </button>
                <button
                  className={`price-option ${selectedPlan === 'annual' ? 'selected' : ''}`}
                  onClick={() => setSelectedPlan('annual')}
                >
                  <p className="price-option-label">연간 구독</p>
                  <p className="price-option-amount">49,500원</p>
                  <p className="price-option-unit">/년</p>
                  <span className="price-option-save">2개월 무료</span>
                </button>
              </div>

              <button className="modal-subscribe-btn" onClick={handleSubscribe}>
                {selectedPlan === 'monthly' ? '월 4,950원 결제하기' : '연 49,500원 결제하기'}
              </button>
              <p className="modal-billing-note">
                {selectedPlan === 'monthly'
                  ? '매월 자동 결제 · 언제든 취소 가능'
                  : '연 49,500원 (월 4,125원) · 언제든 취소 가능'}
              </p>
              <button className="modal-cancel-btn" onClick={() => setShowSubscribeModal(false)}>
                나중에 할게요
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 알림 시간 타임피커 바텀시트 */}
      <AnimatePresence>
        {showTimePicker && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTimePicker(false)}
          >
            <motion.div
              className="time-picker-sheet"
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-handle" />
              <p className="time-picker-title">알림 시간 설정</p>
              <p className="time-picker-sub">매일 이 시간에 명상 알림을 보내드려요</p>

              {/* AM/PM 토글 */}
              <div className="ampm-toggle">
                {(['AM', 'PM'] as const).map(v => (
                  <button
                    key={v}
                    className={`ampm-btn ${pickerAmPm === v ? 'active' : ''}`}
                    onClick={() => setPickerAmPm(v)}
                  >
                    {v === 'AM' ? '오전' : '오후'}
                  </button>
                ))}
              </div>

              {/* 시/분 선택 */}
              <div className="time-wheel-row">
                <div className="time-wheel">
                  <button className="wheel-arrow" onClick={() => setPickerHour(h => h === 12 ? 1 : h + 1)}>▲</button>
                  <span className="wheel-value">{String(pickerHour).padStart(2, '0')}</span>
                  <button className="wheel-arrow" onClick={() => setPickerHour(h => h === 1 ? 12 : h - 1)}>▼</button>
                </div>
                <span className="wheel-colon">:</span>
                <div className="time-wheel">
                  <button className="wheel-arrow" onClick={() => setPickerMin(m => (m + 5) % 60)}>▲</button>
                  <span className="wheel-value">{String(pickerMin).padStart(2, '0')}</span>
                  <button className="wheel-arrow" onClick={() => setPickerMin(m => (m - 5 + 60) % 60)}>▼</button>
                </div>
              </div>

              <button className="time-picker-confirm" onClick={confirmTimePicker}>
                설정 완료
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
