import { motion } from 'framer-motion';
import { EMOTIONS, EmotionType } from '../data/sessions';
import './EmotionPicker.css';

interface Props {
  selected: EmotionType | null;
  onSelect: (emotion: EmotionType) => void;
}

export function EmotionPicker({ selected, onSelect }: Props) {
  return (
    <div className="emotion-picker">
      <p className="emotion-question">오늘 기분이 어때요?</p>
      <div className="emotion-list">
        {EMOTIONS.map((e) => (
          <motion.button
            key={e.type}
            className={`emotion-item ${selected === e.type ? 'selected' : ''}`}
            onClick={() => onSelect(e.type)}
            whileTap={{ scale: 0.88 }}
            animate={selected === e.type ? { scale: 1.08 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={selected === e.type ? { '--emotion-color': e.color } as React.CSSProperties : {}}
          >
            <span className="emotion-emoji">{e.emoji}</span>
            <span className="emotion-label">{e.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
