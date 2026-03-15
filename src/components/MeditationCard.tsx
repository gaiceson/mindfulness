import { motion } from 'framer-motion';
import { MeditationSession } from '../data/sessions';
import { useStore } from '../store/useStore';
import './MeditationCard.css';

interface Props {
  session: MeditationSession;
  variant?: 'horizontal' | 'vertical';
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  stress: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  sleep: 'linear-gradient(135deg, #2C3E7A 0%, #1a1a3e 100%)',
  focus: 'linear-gradient(135deg, #5C6BC0 0%, #3F51B5 100%)',
  anxiety: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  breath: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  morning: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
  love: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
};

export function MeditationCard({ session, variant = 'horizontal' }: Props) {
  const { setCurrentSession, setActiveTab, isPremium } = useStore();
  const gradient = CATEGORY_GRADIENTS[session.category] || CATEGORY_GRADIENTS.stress;

  const handleClick = () => {
    if (session.isPremium && !isPremium) {
      setCurrentSession(session);
      setActiveTab('session');
    } else {
      setCurrentSession(session);
      setActiveTab('session');
    }
  };

  if (variant === 'vertical') {
    return (
      <motion.div
        className="card-vertical"
        onClick={handleClick}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div className="card-vertical-thumb" style={{ background: gradient }}>
          <span className="card-thumbnail">{session.thumbnail}</span>
          {session.isPremium && !isPremium && (
            <span className="lock-icon">🔒</span>
          )}
        </div>
        <div className="card-vertical-info">
          <p className="card-subtitle">{session.subtitle}</p>
          <p className="card-title-sm">{session.title}</p>
          <div className="card-meta">
            <span className="card-duration">{session.duration}분</span>
            {session.isPremium ? (
              <span className="badge badge-premium">PRO</span>
            ) : (
              <span className="badge badge-free">FREE</span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="card-horizontal"
      onClick={handleClick}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div className="card-h-thumb" style={{ background: gradient }}>
        <span className="card-thumbnail">{session.thumbnail}</span>
        {session.isPremium && !isPremium && (
          <span className="lock-icon">🔒</span>
        )}
      </div>
      <div className="card-h-info">
        <p className="card-subtitle">{session.subtitle}</p>
        <p className="card-title">{session.title}</p>
        <div className="card-meta">
          <span className="card-duration">⏱ {session.duration}분</span>
          <span className="card-instructor">by {session.instructor}</span>
          {session.isPremium ? (
            <span className="badge badge-premium">PRO</span>
          ) : (
            <span className="badge badge-free">FREE</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
