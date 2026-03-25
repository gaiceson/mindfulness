/**
 * 알림 스케줄 등록/해제 — webhook-server /api/notif/*
 * VITE_NOTIF_SERVER: 웹훅 서버 URL (기본값: 현재 origin proxy)
 */
const BASE = (import.meta.env.VITE_NOTIF_SERVER ?? '') + '/api/notif';

export async function registerNotif(tossUserId: number, time: string): Promise<void> {
  await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tossUserId, time }),
  }).catch(() => {});
}

export async function unregisterNotif(tossUserId: number): Promise<void> {
  await fetch(`${BASE}/unregister`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tossUserId }),
  }).catch(() => {});
}
