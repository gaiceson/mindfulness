import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playBreathTick } from '../utils/audioEngine';
import './BreathingCircle.css';

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'hold2';
type BreathTechnique = '4-7-8' | 'box' | 'simple';

const TECHNIQUES: Record<BreathTechnique, { phases: BreathPhase[]; durations: number[]; labels: string[] }> = {
  '4-7-8': {
    phases: ['inhale', 'hold', 'exhale'],
    durations: [4, 7, 8],
    labels: ['들이마셔요', '참아요', '내쉬어요'],
  },
  box: {
    phases: ['inhale', 'hold', 'exhale', 'hold2'],
    durations: [4, 4, 4, 4],
    labels: ['들이마셔요', '참아요', '내쉬어요', '참아요'],
  },
  simple: {
    phases: ['inhale', 'exhale'],
    durations: [4, 6],
    labels: ['들이마셔요', '내쉬어요'],
  },
};

interface Props {
  technique?: BreathTechnique;
  isActive: boolean;
  color?: string;
}

export function BreathingCircle({ technique = 'simple', isActive, color = '#5C6BC0' }: Props) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(TECHNIQUES[technique].durations[0]);
  const [cycleCount, setCycleCount] = useState(0);

  const tech = TECHNIQUES[technique];

  const nextPhase = useCallback(() => {
    if (isActive) playBreathTick();
    setPhaseIdx((prev) => {
      const next = (prev + 1) % tech.phases.length;
      if (next === 0) setCycleCount((c) => c + 1);
      return next;
    });
  }, [tech.phases.length, isActive]);

  useEffect(() => {
    if (!isActive) {
      setPhaseIdx(0);
      setCountdown(tech.durations[0]);
      return;
    }
    setCountdown(tech.durations[phaseIdx]);
  }, [phaseIdx, isActive, tech.durations]);

  useEffect(() => {
    if (!isActive) return;
    if (countdown <= 0) {
      nextPhase();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, isActive, nextPhase]);

  const currentPhase = tech.phases[phaseIdx];
  const isExpanding = currentPhase === 'inhale';
  const isHolding = currentPhase === 'hold' || currentPhase === 'hold2';

  const circleScale = isExpanding ? 1.5 : isHolding ? (phaseIdx > 0 ? 1.5 : 1.0) : 1.0;
  const duration = tech.durations[phaseIdx];

  return (
    <div className="breathing-container">
      <div className="breathing-scene">
        {/* 외부 펄스 링 */}
        {isActive && (
          <motion.div
            className="pulse-ring"
            style={{ borderColor: color }}
            animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {/* 메인 원 */}
        <motion.div
          className="breath-circle"
          style={{ background: `radial-gradient(circle at 40% 35%, ${color}CC, ${color})` }}
          animate={{ scale: circleScale }}
          transition={{
            duration: duration,
            ease: isExpanding ? 'easeIn' : isHolding ? 'linear' : 'easeOut',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhase}
              className="breath-inner"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <span className="breath-countdown">{countdown}</span>
              <span className="breath-label">{tech.labels[phaseIdx]}</span>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="breath-info">
        <p className="breath-technique-name">
          {technique === '4-7-8' ? '4-7-8 호흡법' : technique === 'box' ? '박스 브리딩' : '기본 호흡'}
        </p>
        <p className="breath-cycle">{cycleCount}사이클 완료</p>
      </div>
    </div>
  );
}
