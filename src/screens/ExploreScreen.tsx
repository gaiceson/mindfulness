import { useState } from 'react';
import { motion } from 'framer-motion';
import { MeditationCard } from '../components/MeditationCard';
import { SESSIONS, CATEGORIES, SessionCategory, SessionDuration } from '../data/sessions';
import './ExploreScreen.css';

const DURATIONS: { value: SessionDuration | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 5, label: '5분' },
  { value: 10, label: '10분' },
  { value: 20, label: '20분' },
];

export function ExploreScreen() {
  const [activeCategory, setActiveCategory] = useState<SessionCategory | 'all'>('all');
  const [activeDuration, setActiveDuration] = useState<SessionDuration | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = SESSIONS.filter((s) => {
    const matchCat = activeCategory === 'all' || s.category === activeCategory;
    const matchDur = activeDuration === 'all' || s.duration === activeDuration;
    const matchSearch =
      !searchQuery ||
      s.title.includes(searchQuery) ||
      s.subtitle.includes(searchQuery) ||
      s.tags.some((t) => t.includes(searchQuery));
    return matchCat && matchDur && matchSearch;
  });

  return (
    <div className="screen-content explore-screen">
      <div className="explore-header">
        <h1 className="explore-title">탐색</h1>
        <p className="explore-subtitle">원하는 명상을 찾아봐요</p>
      </div>

      {/* 검색 */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="명상 검색하기"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      {/* 카테고리 필터 */}
      <div className="filter-scroll">
        <button
          className={`chip ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          전체
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.type}
            className={`chip ${activeCategory === cat.type ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.type)}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* 시간 필터 */}
      <div className="filter-scroll duration-filter">
        {DURATIONS.map((d) => (
          <button
            key={d.value}
            className={`chip ${activeDuration === d.value ? 'active' : ''}`}
            onClick={() => setActiveDuration(d.value as SessionDuration | 'all')}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* 결과 */}
      <div className="results-info">
        <span className="results-count">명상 {filtered.length}개</span>
      </div>

      <div className="session-grid">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-emoji">🔍</p>
            <p className="empty-text">검색 결과가 없어요</p>
            <p className="empty-sub">다른 키워드로 찾아봐요</p>
          </div>
        ) : (
          filtered.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="px-20"
            >
              <MeditationCard session={session} variant="horizontal" />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
