import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EmotionType, MeditationSession } from '../data/sessions';
import { bkend } from '../lib/bkend';
import { getTossSession, refreshOauth2Token } from '../lib/tossAuth';

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
  isInitializing: boolean;
  currentSession: MeditationSession | null;
  selectedEmotion: EmotionType | null;
  tossUserId: number | null;
  tossAccessToken: string | null;
  tossRefreshToken: string | null;
  /** accessToken 만료 시각 (epoch ms) */
  tossTokenExpiresAt: number | null;
  isPremium: boolean;
  premiumPlan: 'monthly' | 'annual' | null;
  premiumExpiresAt: string | null;
  isDarkMode: boolean;
  notifEnabled: boolean;
  notifTime: string; // HH:MM (KST)
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
  subscribePremium: (plan: 'monthly' | 'annual', orderId: string, expiresAt: string) => void;
  claimReward: () => void;
  toggleDarkMode: () => void;
  toggleNotif: () => void;
  setNotifTime: (time: string) => void;
  /** 앱 시작 시 호출 — 토스 userKey + 토큰 로드 (저장된 refreshToken 재사용) */
  initTossUser: () => Promise<void>;
  /** accessToken 만료 시 refreshToken으로 갱신. refreshToken도 만료됐으면 전체 플로우 재시작. */
  refreshTossToken: () => Promise<void>;
  /** bkend에서 구독 유효성 검증 — 앱 시작 시 호출 */
  checkSubscription: () => Promise<void>;
  /** 프로필을 bkend에 동기화 (백그라운드) */
  syncProfile: () => void;
  /** 로그인 없이 초기화 완료 처리 (인트로 화면 표시용) */
  stopInitializing: () => void;
}


export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      isInitializing: true,
      currentSession: null,
      selectedEmotion: null,
      tossUserId: null,
      tossAccessToken: null,
      tossRefreshToken: null,
      tossTokenExpiresAt: null,
      isPremium: false,
      premiumPlan: null,
      premiumExpiresAt: null,
      isDarkMode: false,
      notifEnabled: true,
      notifTime: '20:00',
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
          maumPoints: s.maumPoints + 3,
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

      subscribePremium: (plan, orderId, expiresAt) => {
        set({ isPremium: true, premiumPlan: plan, premiumExpiresAt: expiresAt });
        const { tossUserId } = get();
        if (tossUserId) {
          bkend.subscriptions.create({
            tossUserId,
            plan,
            status: 'active',
            startedAt: new Date().toISOString(),
            expiresAt,
            amount: plan === 'annual' ? 49500 : 4950,
            orderId,
          }).catch(() => {});
        }
        get().syncProfile();
      },

      toggleNotif: () => set((s) => ({ notifEnabled: !s.notifEnabled })),
      setNotifTime: (time) => set({ notifTime: time }),

      toggleDarkMode: () => set((s) => {
        const next = !s.isDarkMode;
        document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
        return { isDarkMode: next };
      }),

      claimReward: () => {
        set((s) => ({
          maumPoints: s.maumPoints + 100,
          badges: s.badges.includes('첫 리워드') ? s.badges : [...s.badges, '첫 리워드'],
        }));
        get().syncProfile();
      },

      initTossUser: async () => {
        const { tossUserId, tossRefreshToken: storedRefresh, tossTokenExpiresAt } = get();

        // accessToken이 5분 이내 만료 → 갱신 시도
        const isExpiringSoon =
          !tossTokenExpiresAt || tossTokenExpiresAt - Date.now() < 5 * 60 * 1000;

        if (tossUserId && storedRefresh) {
          if (isExpiringSoon) await get().refreshTossToken();
          return;
        }

        // 최초 로그인 또는 refreshToken 없을 때 전체 OAuth 플로우
        const session = await getTossSession();
        if (session) {
          set({
            tossUserId: session.userKey,
            tossAccessToken: session.accessToken,
            tossRefreshToken: session.refreshToken,
            tossTokenExpiresAt: session.expiresAt,
          });
        }
      },

      refreshTossToken: async () => {
        const { tossRefreshToken: storedRefresh } = get();
        if (!storedRefresh) return;
        try {
          const token = await refreshOauth2Token(storedRefresh);
          set({
            tossAccessToken: token.accessToken,
            tossRefreshToken: token.refreshToken,
            tossTokenExpiresAt: Date.now() + token.expiresIn * 1000,
          });
        } catch {
          if (import.meta.env.DEV) {
            // dev/sandbox: bridge appLogin() 무한 대기 방지 → mock 토큰 재발급
            set({
              tossAccessToken: 'mock-access-token',
              tossRefreshToken: 'mock-refresh-token',
              tossTokenExpiresAt: Date.now() + 3600 * 1000,
            });
            return;
          }
          // prod: refreshToken 만료 시 전체 플로우 재시작
          const session = await getTossSession();
          if (session) {
            set({
              tossUserId: session.userKey,
              tossAccessToken: session.accessToken,
              tossRefreshToken: session.refreshToken,
              tossTokenExpiresAt: session.expiresAt,
            });
          }
        }
      },

      checkSubscription: async () => {
        const { tossUserId, premiumExpiresAt } = get();
        set({ isInitializing: true });

        // 로컬 만료일 우선 체크 (빠른 만료 처리)
        if (premiumExpiresAt && new Date(premiumExpiresAt).getTime() < Date.now()) {
          set({ isPremium: false, premiumPlan: null, premiumExpiresAt: null });
        }

        if (!tossUserId) {
          set({ isInitializing: false });
          return;
        }

        // bkend에서 프로필 + 구독 + 기록 + 일기 병렬 로드
        const [profile, sub, remoteRecords, remoteDiary] = await Promise.allSettled([
          bkend.profiles.get(tossUserId),
          bkend.subscriptions.getActive(tossUserId),
          bkend.records.list(tossUserId, { sort: 'date:desc', limit: '200' }),
          bkend.diary.list(tossUserId, { sort: 'date:desc', limit: '200' }),
        ]);

        if (profile.status === 'fulfilled' && profile.value) {
          const p = profile.value;
          set({
            maumPoints: p.maumPoints,
            streakDays: p.streakDays,
            totalMinutes: p.totalMinutes,
            totalSessions: p.totalSessions,
            badges: (() => { try { return JSON.parse(p.badges); } catch { return []; } })(),
            lastCompletedDate: p.lastCompletedDate,
            isDarkMode: p.isDarkMode,
          });
          document.documentElement.setAttribute('data-theme', p.isDarkMode ? 'dark' : 'light');
        }

        if (sub.status === 'fulfilled') {
          if (sub.value) {
            set({ isPremium: true, premiumPlan: sub.value.plan, premiumExpiresAt: sub.value.expiresAt });
          } else {
            set({ isPremium: false, premiumPlan: null, premiumExpiresAt: null });
          }
        }

        // bkend 기록으로 로컬 보완 (로컬에 없는 항목만 추가)
        if (remoteRecords.status === 'fulfilled' && remoteRecords.value.data.length > 0) {
          const local = get().records;
          const localIds = new Set(local.map((r) => r.id));
          const toAdd: MeditationRecord[] = remoteRecords.value.data
            .filter((r) => !localIds.has(r.id))
            .map((r) => ({
              id: r.id,
              sessionId: r.sessionId,
              sessionTitle: r.sessionTitle,
              date: r.date,
              duration: r.duration,
              emotion: r.emotion as EmotionType,
            }));
          if (toAdd.length > 0) {
            set((s) => ({
              records: [...toAdd, ...s.records].sort((a, b) => b.date.localeCompare(a.date)),
            }));
          }
        }

        // bkend 일기로 로컬 보완 (로컬에 없는 항목만 추가)
        if (remoteDiary.status === 'fulfilled' && remoteDiary.value.data.length > 0) {
          const local = get().diaryEntries;
          const localIds = new Set(local.map((d) => d.id));
          const toAdd: DiaryEntry[] = remoteDiary.value.data
            .filter((d) => !localIds.has(d.id))
            .map((d) => ({
              id: d.id,
              date: d.date,
              emotion: d.emotion as EmotionType,
              note: d.note,
            }));
          if (toAdd.length > 0) {
            set((s) => ({
              diaryEntries: [...toAdd, ...s.diaryEntries].sort((a, b) => b.date.localeCompare(a.date)),
            }));
          }
        }

        set({ isInitializing: false });
      },

      stopInitializing: () => set({ isInitializing: false }),

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
      version: 9,
      partialize: (s) => ({
        // isInitializing은 persist 제외 — 매 시작마다 true로 초기화
        tossUserId: s.tossUserId,
        tossAccessToken: s.tossAccessToken,
        tossRefreshToken: s.tossRefreshToken,
        tossTokenExpiresAt: s.tossTokenExpiresAt,
        isPremium: s.isPremium,
        premiumPlan: s.premiumPlan,
        premiumExpiresAt: s.premiumExpiresAt,
        isDarkMode: s.isDarkMode,
        notifEnabled: s.notifEnabled,
        notifTime: s.notifTime,
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
