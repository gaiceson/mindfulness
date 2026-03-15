import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EmotionType, MeditationSession } from '../data/sessions';
import { bkend } from '../lib/bkend';
import { getTossUserKey } from '../lib/tossAuth';

export type TabType = 'home' | 'explore' | 'session' | 'record' | 'my';

export interface MeditationRecord {
  id: string;
  sessionId: string;
  sessionTitle: string;
  date: string;
  duration: number;
  emotion: EmotionType;
}

export interface DiaryEntry {
  id: string;
  date: string;
  emotion: EmotionType;
  note: string;
}

interface AppState {
  activeTab: TabType;
  currentSession: MeditationSession | null;
  selectedEmotion: EmotionType | null;
  tossUserId: number | null;
  isPremium: boolean;
  premiumPlan: 'monthly' | 'annual' | null;
  isDarkMode: boolean;
  maumPoints: number;
  streakDays: number;
  totalMinutes: number;
  totalSessions: number;
  records: MeditationRecord[];
  diaryEntries: DiaryEntry[];
  badges: string[];
  lastCompletedDate: string | null;

  setActiveTab: (tab: TabType) => void;
  setCurrentSession: (session: MeditationSession | null) => void;
  setSelectedEmotion: (emotion: EmotionType | null) => void;
  addRecord: (record: MeditationRecord) => void;
  addDiaryEntry: (entry: DiaryEntry) => void;
  completeMeditation: (session: MeditationSession) => void;
  subscribePremium: (plan: 'monthly' | 'annual') => void;
  claimReward: () => void;
  toggleDarkMode: () => void;
  /** 앱 시작 시 호출 — 토스 userKey 로드 */
  initTossUser: () => Promise<void>;
  /** 프로필을 bkend에 동기화 (백그라운드) */
  syncProfile: () => void;
}


export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      currentSession: null,
      selectedEmotion: null,
      tossUserId: null,
      isPremium: false,
      premiumPlan: null,
      isDarkMode: false,
      maumPoints: 0,
      streakDays: 0,
      totalMinutes: 0,
      totalSessions: 0,
      records: [],
      diaryEntries: [],
      badges: [],
      lastCompletedDate: null,

      setActiveTab: (tab) => set({ activeTab: tab }),
      setCurrentSession: (session) => set({ currentSession: session }),
      setSelectedEmotion: (emotion) => set({ selectedEmotion: emotion }),

      addRecord: (record) => set((s) => ({ records: [record, ...s.records] })),

      addDiaryEntry: (entry) => {
        set((s) => ({ diaryEntries: [entry, ...s.diaryEntries] }));
        const { tossUserId } = get();
        if (tossUserId) {
          bkend.diary.create({ tossUserId, date: entry.date, emotion: entry.emotion, note: entry.note })
            .catch(() => {});
        }
      },

      completeMeditation: (session) => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];

        const alreadyToday = state.lastCompletedDate === today;
        const newStreak = alreadyToday ? state.streakDays : state.streakDays + 1;

        const record: MeditationRecord = {
          id: Date.now().toString(),
          sessionId: session.id,
          sessionTitle: session.title,
          date: today,
          duration: session.duration,
          emotion: state.selectedEmotion || 'neutral',
        };

        const newBadges = [...state.badges];
        const newTotalSessions = state.totalSessions + 1;
        const newTotalMinutes  = state.totalMinutes + session.duration;

        const check = (key: string, cond: boolean) => {
          if (cond && !newBadges.includes(key)) newBadges.push(key);
        };

        check('첫 명상',      state.totalSessions === 0);
        check('3일 연속',     newStreak >= 3);
        check('7일 연속',     newStreak >= 7);
        check('14일 연속',    newStreak >= 14);
        check('30일 연속',    newStreak >= 30);
        check('100일 연속',   newStreak >= 100);
        check('10회 완료',    newTotalSessions >= 10);
        check('50회 완료',    newTotalSessions >= 50);
        check('100회 완료',   newTotalSessions >= 100);
        check('60분 달성',    newTotalMinutes >= 60);
        check('300분 달성',   newTotalMinutes >= 300);
        check('1000분 달성',  newTotalMinutes >= 1000);
        check('수면 명상가',   session.category === 'sleep');
        check('집중 마스터',   session.category === 'focus');
        check('호흡 전문가',   session.category === 'breath');
        check('아침 루틴',     session.category === 'morning');
        check('마음 치유사',   session.category === 'love');
        check('20분 집중',     session.duration >= 20);
        check('45분 몰입',     session.duration >= 45);

        set((s) => ({
          records: [record, ...s.records],
          totalMinutes: s.totalMinutes + session.duration,
          totalSessions: s.totalSessions + 1,
          streakDays: newStreak,
          lastCompletedDate: today,
          maumPoints: s.maumPoints + (session.duration >= 10 ? 100 : 50),
          badges: newBadges,
        }));

        // 백그라운드 동기화
        const { tossUserId } = get();
        if (tossUserId) {
          bkend.records.create({
            tossUserId,
            sessionId: session.id,
            sessionTitle: session.title,
            date: today,
            duration: session.duration,
            emotion: state.selectedEmotion || 'neutral',
          }).catch(() => {});
          get().syncProfile();
        }
      },

      subscribePremium: (plan) => {
        set({ isPremium: true, premiumPlan: plan });
        get().syncProfile();
      },

      toggleDarkMode: () => set((s) => {
        const next = !s.isDarkMode;
        document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
        return { isDarkMode: next };
      }),

      claimReward: () => {
        set((s) => ({
          maumPoints: s.maumPoints + 1000,
          badges: s.badges.includes('첫 리워드') ? s.badges : [...s.badges, '첫 리워드'],
        }));
        get().syncProfile();
      },

      initTossUser: async () => {
        const userKey = await getTossUserKey();
        if (userKey) set({ tossUserId: userKey });
      },

      syncProfile: () => {
        const s = get();
        if (!s.tossUserId) return;
        bkend.profiles.upsert({
          tossUserId: s.tossUserId,
          isPremium: s.isPremium,
          premiumPlan: s.premiumPlan,
          maumPoints: s.maumPoints,
          streakDays: s.streakDays,
          totalMinutes: s.totalMinutes,
          totalSessions: s.totalSessions,
          badges: JSON.stringify(s.badges),
          lastCompletedDate: s.lastCompletedDate,
          isDarkMode: s.isDarkMode,
        }).catch(() => {});
      },
    }),
    {
      name: 'mindfulness-store',
      version: 3,
      partialize: (s) => ({
        tossUserId: s.tossUserId,
        isPremium: s.isPremium,
        premiumPlan: s.premiumPlan,
        isDarkMode: s.isDarkMode,
        maumPoints: s.maumPoints,
        streakDays: s.streakDays,
        totalMinutes: s.totalMinutes,
        totalSessions: s.totalSessions,
        records: s.records,
        diaryEntries: s.diaryEntries,
        badges: s.badges,
        lastCompletedDate: s.lastCompletedDate,
        selectedEmotion: s.selectedEmotion,
      }),
    }
  )
);
