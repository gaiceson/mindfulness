import { useStore, TabType } from '../store/useStore';
import './BottomNav.css';

const NAV_ITEMS: { tab: TabType; label: string; icon: string; activeIcon: string }[] = [
  { tab: 'home', label: '홈', icon: '🏠', activeIcon: '🏠' },
  { tab: 'explore', label: '탐색', icon: '🔍', activeIcon: '🔍' },
  { tab: 'session', label: '명상', icon: '🧘', activeIcon: '🧘' },
  { tab: 'record', label: '기록', icon: '📅', activeIcon: '📅' },
  { tab: 'my', label: '마이', icon: '👤', activeIcon: '👤' },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.tab}
            className={`nav-item ${activeTab === item.tab ? 'active' : ''}`}
            onClick={() => setActiveTab(item.tab)}
          >
            <span className="nav-icon">{activeTab === item.tab ? item.activeIcon : item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
