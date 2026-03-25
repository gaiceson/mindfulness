/**
 * bkend.ai REST Service API Client
 * 토스 인앱은 별도 로그인 불필요 — API Key 인증 + tossUserId 필드로 유저 식별
 */

const API_BASE = import.meta.env.VITE_BKEND_API_URL || 'https://api-client.bkend.ai/v1';
const PROJECT_ID = import.meta.env.VITE_BKEND_PROJECT_ID || '';
const API_KEY = import.meta.env.VITE_BKEND_API_KEY || '';
const ENVIRONMENT = import.meta.env.VITE_BKEND_ENV || 'dev';

// ─── Base Fetch ───────────────────────────────────────────────────────────────

async function bkendFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-project-id': PROJECT_ID,
      'x-api-key': API_KEY,
      'x-environment': ENVIRONMENT,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[${res.status}] ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface MeditationRecordRow {
  id: string;
  tossUserId: number;
  sessionId: string;
  sessionTitle: string;
  date: string;
  duration: number;
  emotion: string;
}

export interface DiaryEntryRow {
  id: string;
  tossUserId: number;
  date: string;
  emotion: string;
  note: string;
}

export interface UserProfileRow {
  id?: string;
  tossUserId: number;
  isPremium: boolean;
  premiumPlan: string | null;
  maumPoints: number;
  streakDays: number;
  totalMinutes: number;
  totalSessions: number;
  badges: string; // JSON.stringify(string[])
  lastCompletedDate: string | null;
  isDarkMode: boolean;
}

export interface SubscriptionRow {
  id?: string;
  tossUserId: number;
  plan: 'monthly' | 'annual';
  status: 'active' | 'expired' | 'cancelled';
  startedAt: string;  // ISO 8601
  expiresAt: string;  // ISO 8601
  amount: number;     // 4900 or 39900
  orderId?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const bkend = {
  records: {
    list: (tossUserId: number, params?: Record<string, string>) => {
      const qs = new URLSearchParams({ ...params, 'filter[tossUserId]': String(tossUserId) });
      return bkendFetch<ListResponse<MeditationRecordRow>>(`/data/meditation_records?${qs}`);
    },

    create: (row: Omit<MeditationRecordRow, 'id'>) =>
      bkendFetch<MeditationRecordRow>('/data/meditation_records', {
        method: 'POST',
        body: JSON.stringify(row),
      }),
  },

  diary: {
    list: (tossUserId: number, params?: Record<string, string>) => {
      const qs = new URLSearchParams({ ...params, 'filter[tossUserId]': String(tossUserId) });
      return bkendFetch<ListResponse<DiaryEntryRow>>(`/data/diary_entries?${qs}`);
    },

    create: (row: Omit<DiaryEntryRow, 'id'>) =>
      bkendFetch<DiaryEntryRow>('/data/diary_entries', {
        method: 'POST',
        body: JSON.stringify(row),
      }),
  },

  subscriptions: {
    getActive: async (tossUserId: number): Promise<SubscriptionRow | null> => {
      const qs = new URLSearchParams({
        'filter[tossUserId]': String(tossUserId),
        'filter[status]': 'active',
        sort: 'expiresAt:desc',
        limit: '5',
      });
      const res = await bkendFetch<ListResponse<SubscriptionRow>>(`/data/subscriptions?${qs}`);
      const now = Date.now();
      return res.data.find(s => new Date(s.expiresAt).getTime() > now) ?? null;
    },

    create: (row: Omit<SubscriptionRow, 'id'>) =>
      bkendFetch<SubscriptionRow>('/data/subscriptions', {
        method: 'POST',
        body: JSON.stringify(row),
      }),
  },

  profiles: {
    get: async (tossUserId: number): Promise<UserProfileRow | null> => {
      const qs = new URLSearchParams({ 'filter[tossUserId]': String(tossUserId), limit: '1' });
      const res = await bkendFetch<ListResponse<UserProfileRow>>(`/data/user_profiles?${qs}`);
      return res.data[0] ?? null;
    },

    upsert: async (row: UserProfileRow): Promise<void> => {
      const existing = await bkend.profiles.get(row.tossUserId);
      if (existing?.id) {
        await bkendFetch(`/data/user_profiles/${existing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(row),
        });
      } else {
        await bkendFetch('/data/user_profiles', {
          method: 'POST',
          body: JSON.stringify(row),
        });
      }
    },
  },
};
