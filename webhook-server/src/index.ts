import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import https from 'https';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';

const app = express();
const PORT = process.env.PORT || 4000;

// ── 환경변수 ────────────────────────────────────────────────────────────────
const TOSS_WEBHOOK_SECRET = process.env.TOSS_WEBHOOK_SECRET || '';
const BKEND_API_URL       = process.env.BKEND_API_URL || 'https://api-client.bkend.ai/v1';
const BKEND_PROJECT_ID    = process.env.BKEND_PROJECT_ID || '';
const BKEND_API_KEY       = process.env.BKEND_API_KEY || '';
const BKEND_ENV           = process.env.BKEND_ENV || 'prod';
const TOSS_API_BASE       = 'https://apps-in-toss-api.toss.im';
/** 토스 콘솔에서 등록·심사 완료된 알림 템플릿 코드 */
const NOTIF_TEMPLATE_CODE = process.env.NOTIF_TEMPLATE_CODE || '';
const CERT_PATH = process.env.TOSS_CERT_PATH || path.resolve(__dirname, '../../cert_key/mindfulness_public.crt');
const KEY_PATH  = process.env.TOSS_KEY_PATH  || path.resolve(__dirname, '../../cert_key/mindfulness_private.key');

// ── 타입 ────────────────────────────────────────────────────────────────────

// 토스 IAP 웹훅 이벤트 타입
// 참고: https://docs.tosspayments.com/reference/webhook
type TossIapEventType =
  | 'SUBSCRIPTION_RENEWED'    // 구독 갱신 성공
  | 'SUBSCRIPTION_CANCELLED'  // 구독 해지
  | 'SUBSCRIPTION_FAILED'     // 갱신 결제 실패
  | 'SUBSCRIPTION_SUSPENDED'; // 결제 실패로 구독 정지

interface TossIapWebhookPayload {
  eventType: TossIapEventType;
  createdAt: string;
  data: {
    orderId: string;
    subscriptionId?: string;
    tossUserId?: number;
    userKey?: number;           // tossUserId 대체 필드명
    plan?: string;              // monthly | annual
    amount?: number;
    nextBillingDate?: string;   // 다음 결제일 (YYYY-MM-DD)
    cancelledAt?: string;
    failReason?: string;
  };
}

interface BkendSubscriptionRow {
  id: string;
  tossUserId: number;
  orderId: string;
  plan: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  amount: number;
}

// ── bkend REST 클라이언트 ───────────────────────────────────────────────────

const bkendHeaders = {
  'Content-Type': 'application/json',
  'x-project-id': BKEND_PROJECT_ID,
  'x-api-key': BKEND_API_KEY,
  'x-environment': BKEND_ENV,
};

async function bkendFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BKEND_API_URL}${path}`, {
    ...options,
    headers: { ...bkendHeaders, ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`bkend [${res.status}] ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// orderId로 구독 레코드 조회
async function findSubscriptionByOrderId(orderId: string): Promise<BkendSubscriptionRow | null> {
  const qs = new URLSearchParams({ 'filter[orderId]': orderId, limit: '1' });
  const res = await bkendFetch<{ data: BkendSubscriptionRow[] }>(`/data/subscriptions?${qs}`);
  return res.data[0] ?? null;
}

// tossUserId로 활성 구독 레코드 조회
async function findActiveSubscriptionByUser(tossUserId: number): Promise<BkendSubscriptionRow | null> {
  const qs = new URLSearchParams({
    'filter[tossUserId]': String(tossUserId),
    'filter[status]': 'active',
    sort: 'expiresAt:desc',
    limit: '1',
  });
  const res = await bkendFetch<{ data: BkendSubscriptionRow[] }>(`/data/subscriptions?${qs}`);
  return res.data[0] ?? null;
}

// 구독 상태 업데이트
async function updateSubscription(id: string, patch: Partial<BkendSubscriptionRow>): Promise<void> {
  await bkendFetch(`/data/subscriptions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

// 신규 구독 갱신 레코드 생성
async function createRenewalRecord(row: Omit<BkendSubscriptionRow, 'id'>): Promise<void> {
  await bkendFetch('/data/subscriptions', {
    method: 'POST',
    body: JSON.stringify(row),
  });
}

// user_profiles의 isPremium 업데이트
async function updateUserProfile(tossUserId: number, isPremium: boolean, premiumPlan: string | null, expiresAt: string | null): Promise<void> {
  const qs = new URLSearchParams({ 'filter[tossUserId]': String(tossUserId), limit: '1' });
  const res = await bkendFetch<{ data: Array<{ id: string }> }>(`/data/user_profiles?${qs}`);
  const profile = res.data[0];
  if (!profile) return;
  await bkendFetch(`/data/user_profiles/${profile.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isPremium, premiumPlan, lastPremiumExpiresAt: expiresAt }),
  });
}

// ── mTLS 에이전트 ──────────────────────────────────────────────────────────

function createTossAgent(): https.Agent | undefined {
  // Railway 등 파일시스템이 없는 환경: base64 env var 우선
  const certContent = process.env.TOSS_CERT_CONTENT?.replace(/\s/g, '');
  const keyContent  = process.env.TOSS_KEY_CONTENT?.replace(/\s/g, '');
  if (certContent && keyContent) {
    try {
      const agent = new https.Agent({
        cert: Buffer.from(certContent, 'base64'),
        key:  Buffer.from(keyContent, 'base64'),
        rejectUnauthorized: true,
      });
      console.log('[mTLS] env var 인증서 로드 성공');
      return agent;
    } catch (e) {
      console.error('[mTLS] env var 인증서 로드 실패:', e);
    }
  }
  // 로컬 개발: 파일 경로
  if (!fs.existsSync(CERT_PATH) || !fs.existsSync(KEY_PATH)) return undefined;
  return new https.Agent({
    cert: fs.readFileSync(CERT_PATH),
    key:  fs.readFileSync(KEY_PATH),
    rejectUnauthorized: true,
  });
}

/**
 * mTLS로 Toss API 호출하는 내부 헬퍼
 * native fetch는 https.Agent를 지원하지 않으므로 https.request 직접 사용
 */
async function tossApiProxy(
  apiPath: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; body: string }> {
  const agent = createTossAgent();
  if (!agent) throw new Error('mTLS 인증서 없음');

  const url = new URL(`${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2${apiPath}`);

  return new Promise((resolve, reject) => {
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (body) reqHeaders['Content-Length'] = Buffer.byteLength(body).toString();

    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method,
        headers: reqHeaders,
        agent,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => resolve({ status: res.statusCode ?? 500, body: data }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── 알림 스케줄러 ──────────────────────────────────────────────────────────

interface NotifSchedule {
  tossUserId: number;
  time: string; // HH:MM (KST)
}

interface NotifScheduleRow {
  id: string;
  tossUserId: number;
  time: string;
}

/** tossUserId → 알림 설정 (인메모리 캐시 + bkend DB 영속) */
const notifSchedules = new Map<number, NotifSchedule>();

// bkend notif_schedules CRUD
async function dbLoadSchedules(): Promise<void> {
  try {
    const res = await bkendFetch<{ data: NotifScheduleRow[] }>('/data/notif_schedules?limit=1000');
    notifSchedules.clear();
    for (const row of res.data) {
      notifSchedules.set(row.tossUserId, { tossUserId: row.tossUserId, time: row.time });
    }
    console.log(`[NOTIF] DB에서 ${res.data.length}개 스케줄 로드`);
  } catch (err) {
    console.warn('[NOTIF] 스케줄 로드 실패 (notif_schedules 테이블 확인 필요):', err);
  }
}

async function dbUpsertSchedule(tossUserId: number, time: string): Promise<void> {
  const qs = new URLSearchParams({ 'filter[tossUserId]': String(tossUserId), limit: '1' });
  const res = await bkendFetch<{ data: NotifScheduleRow[] }>(`/data/notif_schedules?${qs}`);
  if (res.data[0]?.id) {
    await bkendFetch(`/data/notif_schedules/${res.data[0].id}`, {
      method: 'PATCH',
      body: JSON.stringify({ time }),
    });
  } else {
    await bkendFetch('/data/notif_schedules', {
      method: 'POST',
      body: JSON.stringify({ tossUserId, time }),
    });
  }
}

async function dbDeleteSchedule(tossUserId: number): Promise<void> {
  const qs = new URLSearchParams({ 'filter[tossUserId]': String(tossUserId), limit: '1' });
  const res = await bkendFetch<{ data: NotifScheduleRow[] }>(`/data/notif_schedules?${qs}`);
  if (res.data[0]?.id) {
    await bkendFetch(`/data/notif_schedules/${res.data[0].id}`, { method: 'DELETE' });
  }
}

/**
 * Toss Smart Message API 호출
 * 사전 조건: NOTIF_TEMPLATE_CODE 환경변수 설정 + 콘솔 템플릿 심사 완료
 */
async function sendSmartMessage(tossUserId: number): Promise<void> {
  if (!NOTIF_TEMPLATE_CODE) {
    console.warn('[NOTIF] NOTIF_TEMPLATE_CODE 미설정 — 알림 발송 건너뜀');
    return;
  }
  const agent = createTossAgent();
  if (!agent) {
    console.warn('[NOTIF] mTLS 인증서 없음 — 알림 발송 건너뜀');
    return;
  }

  const res = await (fetch as typeof fetch)(
    `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/messenger/send-message`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-toss-user-key': String(tossUserId),
      },
      body: JSON.stringify({
        templateSetCode: NOTIF_TEMPLATE_CODE,
        context: {},
      }),
      // @ts-ignore — Node.js fetch agent option
      agent,
    }
  );

  const body = await res.text();
  if (!res.ok) throw new Error(`Smart Message API ${res.status}: ${body}`);
  console.log(`[NOTIF] 발송 완료 userId=${tossUserId} response=${body}`);
}

/** 매 분 실행: KST 현재 시각 == 등록 시각인 유저에게 알림 발송 */
cron.schedule('* * * * *', async () => {
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const hhmm = nowKST.toISOString().slice(11, 16); // "HH:MM"

  for (const [userId, schedule] of notifSchedules.entries()) {
    if (schedule.time === hhmm) {
      sendSmartMessage(userId).catch(err =>
        console.error(`[NOTIF] 발송 실패 userId=${userId}:`, err)
      );
    }
  }
});

// ── 서명 검증 ──────────────────────────────────────────────────────────────

function verifySignature(rawBody: Buffer, signature: string): boolean {
  if (!TOSS_WEBHOOK_SECRET) return true; // dev 환경: 검증 스킵
  const expected = crypto
    .createHmac('sha256', TOSS_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ── 이벤트 핸들러 ──────────────────────────────────────────────────────────

async function handleRenewed(payload: TossIapWebhookPayload): Promise<void> {
  const { orderId, tossUserId, userKey, plan, amount, nextBillingDate } = payload.data;
  const userId = tossUserId ?? userKey;
  if (!userId) throw new Error('tossUserId 없음');

  // 다음 만료일 계산 (nextBillingDate 있으면 사용, 없으면 플랜 기준)
  const expiresAt = nextBillingDate
    ? new Date(nextBillingDate).toISOString()
    : plan === 'annual'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30  * 24 * 60 * 60 * 1000).toISOString();

  // 기존 활성 구독 만료 처리
  const existing = await findActiveSubscriptionByUser(userId);
  if (existing) {
    await updateSubscription(existing.id, { status: 'expired' });
  }

  // 갱신 레코드 신규 생성
  await createRenewalRecord({
    tossUserId: userId,
    orderId,
    plan: plan ?? existing?.plan ?? 'monthly',
    status: 'active',
    startedAt: new Date().toISOString(),
    expiresAt,
    amount: amount ?? existing?.amount ?? 4900,
  });

  // 프로필 업데이트
  await updateUserProfile(userId, true, plan ?? existing?.plan ?? 'monthly', expiresAt);

  console.log(`[RENEWED] userId=${userId} orderId=${orderId} expiresAt=${expiresAt}`);
}

async function handleCancelled(payload: TossIapWebhookPayload): Promise<void> {
  const { orderId, tossUserId, userKey } = payload.data;
  const userId = tossUserId ?? userKey;
  if (!userId) throw new Error('tossUserId 없음');

  // 기존 활성 구독 상태 → cancelled (만료일은 유지 — 기간 만료까지 사용 가능)
  const existing = await findSubscriptionByOrderId(orderId)
    ?? await findActiveSubscriptionByUser(userId);
  if (existing) {
    await updateSubscription(existing.id, { status: 'cancelled' });
  }

  // 프로필의 isPremium은 유지 (expiresAt 만료 시 앱에서 자동 해제)
  console.log(`[CANCELLED] userId=${userId} orderId=${orderId}`);
}

async function handleFailed(payload: TossIapWebhookPayload): Promise<void> {
  const { orderId, tossUserId, userKey, failReason } = payload.data;
  const userId = tossUserId ?? userKey;
  if (!userId) throw new Error('tossUserId 없음');

  const existing = await findSubscriptionByOrderId(orderId)
    ?? await findActiveSubscriptionByUser(userId);
  if (existing) {
    await updateSubscription(existing.id, { status: 'expired' });
  }

  // 프로필 프리미엄 즉시 해제
  await updateUserProfile(userId, false, null, null);

  console.log(`[FAILED] userId=${userId} reason=${failReason}`);
}

// ── Express 라우터 ─────────────────────────────────────────────────────────

// raw body 보존 (서명 검증용)
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// CORS — ait 웹뷰에서 Railway 서버 직접 호출 허용
app.use('/auth/toss', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// ── Toss OAuth 프록시 (mTLS) ───────────────────────────────────────────────

/** POST /auth/toss/generate-token — authorizationCode → accessToken */
app.post('/auth/toss/generate-token', async (req: Request, res: Response) => {
  try {
    const result = await tossApiProxy('/generate-token', 'POST', {}, JSON.stringify(req.body));
    res.status(result.status).send(result.body);
  } catch (err) {
    console.error('[AUTH] generate-token 오류:', err);
    res.status(500).json({ error: String(err) });
  }
});

/** POST /auth/toss/refresh-token — refreshToken → 새 accessToken */
app.post('/auth/toss/refresh-token', async (req: Request, res: Response) => {
  try {
    const result = await tossApiProxy('/refresh-token', 'POST', {}, JSON.stringify(req.body));
    res.status(result.status).send(result.body);
  } catch (err) {
    console.error('[AUTH] refresh-token 오류:', err);
    res.status(500).json({ error: String(err) });
  }
});

/** GET /auth/toss/login-me — accessToken으로 유저 정보 조회 */
app.get('/auth/toss/login-me', async (req: Request, res: Response) => {
  const auth = req.headers['authorization'] as string ?? '';
  try {
    const result = await tossApiProxy('/login-me', 'GET', { Authorization: auth });
    res.status(result.status).send(result.body);
  } catch (err) {
    console.error('[AUTH] login-me 오류:', err);
    res.status(500).json({ error: String(err) });
  }
});

// 헬스체크
app.get('/health', (_req: Request, res: Response) => {
  const certRaw = process.env.TOSS_CERT_CONTENT ?? '';
  const keyRaw  = process.env.TOSS_KEY_CONTENT ?? '';
  const certClean = certRaw.replace(/\s/g, '');
  const keyClean  = keyRaw.replace(/\s/g, '');
  const hasCert = !!(certClean && keyClean);
  res.json({
    status: 'ok',
    env: BKEND_ENV,
    notifCount: notifSchedules.size,
    mtls: hasCert ? 'loaded' : 'missing',
    debug: { certLen: certClean.length, keyLen: keyClean.length },
  });
});

// ── 알림 스케줄 API ────────────────────────────────────────────────────────

/** 알림 등록/갱신: POST /api/notif/register { tossUserId, time: "HH:MM" } */
app.post('/api/notif/register', async (req: Request, res: Response) => {
  const { tossUserId, time } = req.body as { tossUserId?: number; time?: string };
  if (!tossUserId || !time || !/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ error: 'tossUserId와 time(HH:MM) 필요' });
  }
  notifSchedules.set(tossUserId, { tossUserId, time });
  dbUpsertSchedule(tossUserId, time).catch(err => console.error('[NOTIF] DB 저장 실패:', err));
  console.log(`[NOTIF] 등록: userId=${tossUserId} time=${time} (총 ${notifSchedules.size}명)`);
  res.json({ ok: true });
});

/** 알림 해제: POST /api/notif/unregister { tossUserId } */
app.post('/api/notif/unregister', async (req: Request, res: Response) => {
  const { tossUserId } = req.body as { tossUserId?: number };
  if (!tossUserId) return res.status(400).json({ error: 'tossUserId 필요' });
  notifSchedules.delete(tossUserId);
  dbDeleteSchedule(tossUserId).catch(err => console.error('[NOTIF] DB 삭제 실패:', err));
  console.log(`[NOTIF] 해제: userId=${tossUserId} (총 ${notifSchedules.size}명)`);
  res.json({ ok: true });
});

// 토스 IAP 웹훅 수신
app.post('/webhook/toss-iap', async (req: Request, res: Response) => {
  // 1. 서명 검증
  const signature = req.headers['x-toss-signature'] as string ?? '';
  if (!verifySignature(req.body as Buffer, signature)) {
    console.warn('[WEBHOOK] 서명 검증 실패');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. 파싱
  let payload: TossIapWebhookPayload;
  try {
    payload = JSON.parse((req.body as Buffer).toString('utf-8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  console.log(`[WEBHOOK] ${payload.eventType} at ${payload.createdAt}`);

  // 3. 이벤트 처리
  try {
    switch (payload.eventType) {
      case 'SUBSCRIPTION_RENEWED':
        await handleRenewed(payload);
        break;
      case 'SUBSCRIPTION_CANCELLED':
        await handleCancelled(payload);
        break;
      case 'SUBSCRIPTION_FAILED':
      case 'SUBSCRIPTION_SUSPENDED':
        await handleFailed(payload);
        break;
      default:
        console.log(`[WEBHOOK] 미처리 이벤트: ${payload.eventType}`);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[WEBHOOK] 처리 오류:', err);
    // 토스는 200 응답을 못 받으면 재시도하므로 500 반환
    res.status(500).json({ error: 'Internal error' });
  }
});

// 에러 핸들러
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`웹훅 서버 실행 중: http://localhost:${PORT}`);
  console.log(`엔드포인트: POST /webhook/toss-iap`);
  dbLoadSchedules();
});
