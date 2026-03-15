import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { EMOTIONS, EmotionType } from '../data/sessions';
import './RecordScreen.css';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

const ALL_BADGES = [
  // 첫 시작
  { name: '첫 명상',     emoji: '🌱', hint: '첫 명상 완료' },
  // 연속
  { name: '3일 연속',    emoji: '🔥', hint: '3일 연속 명상' },
  { name: '7일 연속',    emoji: '⚡', hint: '7일 연속 명상' },
  { name: '14일 연속',   emoji: '🌙', hint: '14일 연속 명상' },
  { name: '30일 연속',   emoji: '💎', hint: '30일 연속 명상' },
  { name: '100일 연속',  emoji: '👑', hint: '100일 연속 명상' },
  // 세션 수
  { name: '10회 완료',   emoji: '🎯', hint: '명상 10회 완료' },
  { name: '50회 완료',   emoji: '🏆', hint: '명상 50회 완료' },
  { name: '100회 완료',  emoji: '🥇', hint: '명상 100회 완료' },
  // 시간
  { name: '60분 달성',   emoji: '⏱', hint: '총 명상 60분' },
  { name: '300분 달성',  emoji: '🎖', hint: '총 명상 300분' },
  { name: '1000분 달성', emoji: '✨', hint: '총 명상 1000분' },
  // 카테고리
  { name: '수면 명상가', emoji: '🌊', hint: '수면 명상 완료' },
  { name: '집중 마스터', emoji: '🎯', hint: '집중 명상 완료' },
  { name: '호흡 전문가', emoji: '🌬', hint: '호흡 명상 완료' },
  { name: '아침 루틴',   emoji: '🌅', hint: '아침 명상 완료' },
  { name: '마음 치유사', emoji: '💜', hint: '자기사랑 명상 완료' },
  // 긴 세션
  { name: '20분 집중',   emoji: '🧘', hint: '20분 이상 명상 완료' },
  { name: '45분 몰입',   emoji: '🌿', hint: '45분 명상 완료' },
  // 리워드
  { name: '첫 리워드',   emoji: '⭐', hint: '리워드 첫 수령' },
];

export function RecordScreen() {
  const { records, streakDays, totalMinutes, badges, diaryEntries, addDiaryEntry, selectedEmotion } = useStore();
  const [activeTab, setActiveTab] = useState<'calendar' | 'diary'>('calendar');
  const [diaryText, setDiaryText] = useState('');
  const [showDiaryForm, setShowDiaryForm] = useState(false);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // 이번 달 캘린더 데이터
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const recordedDays = new Set(
    records
      .filter(r => r.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`))
      .map(r => parseInt(r.date.split('-')[2]))
  );

  const getEmotionForDay = (day: number): EmotionType | null => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = records.find(r => r.date === dateStr);
    return record ? record.emotion : null;
  };

  const getEmotionEmoji = (emotion: EmotionType | null) => {
    if (!emotion) return null;
    return EMOTIONS.find(e => e.type === emotion)?.emoji;
  };

  // 감정 분포
  const emotionCounts = EMOTIONS.map(e => ({
    ...e,
    count: records.filter(r => r.emotion === e.type).length,
  }));
  const totalEmotions = records.length;

  const handleSaveDiary = () => {
    if (!diaryText.trim()) return;
    addDiaryEntry({
      id: Date.now().toString(),
      date: today.toISOString().split('T')[0],
      emotion: selectedEmotion || 'neutral',
      note: diaryText.trim(),
    });
    setDiaryText('');
    setShowDiaryForm(false);
  };

  return (
    <div className="screen-content record-screen">
      <div className="record-header">
        <h1 className="record-title">기록</h1>
        <p className="record-subtitle">{currentYear}년 {MONTHS[currentMonth]}</p>
      </div>

      {/* 상단 통계 */}
      <div className="record-stats">
        <div className="record-stat-card highlight">
          <span className="rs-emoji">🔥</span>
          <p className="rs-value">{streakDays}일</p>
          <p className="rs-label">연속 명상</p>
        </div>
        <div className="record-stat-card">
          <span className="rs-emoji">⏱</span>
          <p className="rs-value">{totalMinutes}</p>
          <p className="rs-label">총 분</p>
        </div>
        <div className="record-stat-card">
          <span className="rs-emoji">🧘</span>
          <p className="rs-value">{records.length}</p>
          <p className="rs-label">세션</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="record-tabs">
        <button
          className={`record-tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          📅 캘린더
        </button>
        <button
          className={`record-tab ${activeTab === 'diary' ? 'active' : ''}`}
          onClick={() => setActiveTab('diary')}
        >
          📝 마음 일기
        </button>
      </div>

      {activeTab === 'calendar' ? (
        <>
          {/* 캘린더 */}
          <div className="calendar-card">
            <div className="calendar-days-header">
              {DAYS_KO.map(d => (
                <div key={d} className="cal-day-header">{d}</div>
              ))}
            </div>
            <div className="calendar-grid">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="cal-cell empty" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = day === today.getDate();
                const hasRecord = recordedDays.has(day);
                const emotion = getEmotionForDay(day);
                return (
                  <motion.div
                    key={day}
                    className={`cal-cell ${hasRecord ? 'recorded' : ''} ${isToday ? 'today' : ''}`}
                    whileTap={{ scale: 0.88 }}
                  >
                    <span className="cal-day">{day}</span>
                    {emotion && (
                      <span className="cal-emotion">{getEmotionEmoji(emotion)}</span>
                    )}
                    {hasRecord && !emotion && (
                      <span className="cal-dot" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 최근 기록 */}
          <div className="section-header">
            <h2 className="section-title" style={{ fontSize: '16px' }}>최근 명상 기록</h2>
          </div>
          <div className="recent-records">
            {records.slice(0, 5).map((record, i) => {
              const emotion = EMOTIONS.find(e => e.type === record.emotion);
              return (
                <motion.div
                  key={record.id}
                  className="record-item"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="record-item-left">
                    <span className="record-emoji">{emotion?.emoji || '🧘'}</span>
                    <div>
                      <p className="record-session-title">{record.sessionTitle}</p>
                      <p className="record-date">{record.date} · {record.duration}분</p>
                    </div>
                  </div>
                  <span className="record-emotion-label">{emotion?.label}</span>
                </motion.div>
              );
            })}
          </div>

          {/* 감정 분포 */}
          <div className="emotion-chart-card">
            <h3 className="emotion-chart-title">이번 달 감정 분포</h3>
            {emotionCounts.map((e) => (
              <div key={e.type} className="emotion-bar-row">
                <span className="emotion-bar-emoji">{e.emoji}</span>
                <span className="emotion-bar-label">{e.label}</span>
                <div className="emotion-bar-track">
                  <motion.div
                    className="emotion-bar-fill"
                    style={{ background: e.color }}
                    initial={{ width: 0 }}
                    animate={{ width: totalEmotions > 0 ? `${(e.count / totalEmotions) * 100}%` : '0%' }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  />
                </div>
                <span className="emotion-bar-count">{e.count}</span>
              </div>
            ))}
          </div>

          {/* 뱃지 */}
          <div className="badges-section">
            <div className="section-header">
              <h2 className="section-title" style={{ fontSize: '16px' }}>
                뱃지 <span className="badge-count">{badges.length}/{ALL_BADGES.length}</span>
              </h2>
            </div>
            <div className="badges-grid">
              {ALL_BADGES.map((b) => {
                const earned = badges.includes(b.name);
                return (
                  <div key={b.name} className={`badge-item ${earned ? '' : 'locked'}`}>
                    <span className="badge-icon">{earned ? b.emoji : '🔒'}</span>
                    <span className="badge-name">{b.name}</span>
                    {!earned && <span className="badge-hint">{b.hint}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 마음 일기 */}
          <div className="diary-section">
            <button
              className="diary-new-btn"
              onClick={() => setShowDiaryForm(true)}
            >
              + 오늘의 마음 기록하기
            </button>

            {showDiaryForm && (
              <motion.div
                className="diary-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="diary-form-header">
                  <span className="diary-date">{today.toLocaleDateString('ko-KR')}</span>
                  {selectedEmotion && (
                    <span className="diary-emotion">
                      {EMOTIONS.find(e => e.type === selectedEmotion)?.emoji}
                      {EMOTIONS.find(e => e.type === selectedEmotion)?.label}
                    </span>
                  )}
                </div>
                <textarea
                  className="diary-textarea"
                  placeholder="오늘 마음이 어땠나요? 자유롭게 적어봐요."
                  value={diaryText}
                  onChange={(e) => setDiaryText(e.target.value)}
                  rows={5}
                />
                <div className="diary-form-actions">
                  <button className="diary-cancel" onClick={() => setShowDiaryForm(false)}>취소</button>
                  <button className="diary-save" onClick={handleSaveDiary} disabled={!diaryText.trim()}>저장하기</button>
                </div>
              </motion.div>
            )}

            {diaryEntries.length === 0 && !showDiaryForm && (
              <div className="diary-empty">
                <p className="diary-empty-icon">📝</p>
                <p className="diary-empty-text">아직 기록이 없어요</p>
                <p className="diary-empty-sub">오늘의 마음을 기록해봐요</p>
              </div>
            )}

            {diaryEntries.map((entry, i) => {
              const emotion = EMOTIONS.find(e => e.type === entry.emotion);
              return (
                <motion.div
                  key={entry.id}
                  className="diary-entry"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="diary-entry-header">
                    <span className="diary-entry-date">{entry.date}</span>
                    {emotion && (
                      <span className="diary-entry-emotion">
                        {emotion.emoji} {emotion.label}
                      </span>
                    )}
                  </div>
                  <p className="diary-entry-text">{entry.note}</p>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
