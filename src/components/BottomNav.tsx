import { Home, Search, Wind, BookOpen, User } from 'lucide-react';
import { useStore, TabType } from '../store/useStore';
import './BottomNav.css';

const NAV_ITEMS: { tab: TabType; label: string; Icon: React.ElementType }[] = [
  { tab: 'home', label: '홈', Icon: Home },
  { tab: 'explore', label: '탐색', Icon: Search },
  { tab: 'session', label: '명상', Icon: Wind },
  { tab: 'record', label: '기록', Icon: BookOpen },
  { tab: 'my', label: '마이', Icon: User },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {NAV_ITEMS.map(({ tab, label, Icon }) => (
          <button
            key={tab}
            className={`nav-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="nav-icon">
              <Icon size={22} strokeWidth={activeTab === tab ? 2.5 : 1.8} />
            </span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
