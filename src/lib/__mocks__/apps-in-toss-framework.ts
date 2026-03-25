/**
 * @apps-in-toss/web-framework 개발 환경 mock (SDK 2.x)
 * 실제 패키지는 토스 앱 런타임에서만 주입됨
 *
 * [Sandbox] ReactNativeWebView 가 있으면 bridge-core 를 통해 실제 브릿지 호출.
 *   → appLogin() 이 실제 인가 코드를 받아 Granite 샌드박스 인증 흐름 완성.
 *
 * [Dev] mTLS 프록시 연동:
 *   cert_key/ 인증서가 있으면 vite.config.ts 가 /api/toss-login/* 를
 *   apps-in-toss-api.toss.im 으로 mTLS 프록시함.
 *   → generateOauth2Token 성공 시 세션 토큰을 획득하고,
 *     이후 loginMe 등의 호출에서 실제 API 응답을 받아요.
 *   → 프록시 미사용 또는 오류 시 mock 값으로 자동 fallback.
 */

import { createAsyncBridge } from '@apps-in-toss/bridge-core'

// ─── 세션 토큰 (dev 프록시 호출용) ────────────────────────────────────────────

/** 현재 세션 accessToken — generateOauth2Token 또는 refreshOauth2Token 성공 시 세팅 */
let _sessionToken: string | null = null

// ─── 내부 프록시 헬퍼 ──────────────────────────────────────────────────────────

// dev: Vite proxy → /api/toss-login → apps-in-toss-api.toss.im (mTLS)
// prod: Railway → VITE_TOSS_AUTH_API (env var로 주입)
const PROXY_PREFIX = import.meta.env.VITE_TOSS_AUTH_API ?? '/api/toss-login'

/**
 * mTLS 프록시로 Toss API 호출
 * 경로: /api/toss-login/{path} → vite proxy → apps-in-toss-api.toss.im
 * 응답 형식: { resultType: 'SUCCESS', success: T } | { resultType: 'FAIL', error: {...} }
 */
async function tossProxy<T>(
  apiPath: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${PROXY_PREFIX}${apiPath}`, {
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Toss proxy ${res.status}: ${body}`)
  }
  const json = await res.json()
  if (json.resultType === 'FAIL') {
    throw new Error(json.error?.reason ?? `Toss API error: ${json.error?.errorCode}`)
  }
  return (json.success ?? json) as T
}

// ─── 클라이언트 SDK ─────────────────────────────────────────────────────────────

/**
 * appLogin: 인가 코드 발급 (클라이언트 전용, 유효시간 10분)
 *
 * - Sandbox (ReactNativeWebView 존재): bridge-core 로 실제 Granite 브릿지 호출
 *   → Toss 샌드박스 앱이 인가 코드 + referrer:'SANDBOX' 를 반환
 * - Dev browser (ReactNativeWebView 없음): mock 값 반환
 *   → VITE_DEV_AUTH_CODE 환경변수로 실제 코드 주입 가능
 */
const _bridgeAppLogin = createAsyncBridge<[], { authorizationCode: string; referrer: 'DEFAULT' | 'SANDBOX' }>('appLogin')

export const appLogin = async (): Promise<{
  authorizationCode: string
  referrer: 'DEFAULT' | 'SANDBOX'
}> => {
  if (typeof window !== 'undefined' && (window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView) {
    // 샌드박스 환경: 실제 Granite 브릿지를 통해 인가 코드 획득
    return _bridgeAppLogin()
  }
  // 브라우저 개발 환경: mock 반환
  return {
    authorizationCode: import.meta.env.VITE_DEV_AUTH_CODE ?? `mock-auth-code-${Date.now()}`,
    referrer: (import.meta.env.VITE_DEV_REFERRER as 'DEFAULT' | 'SANDBOX') ?? 'DEFAULT',
  }
}

// ─── 서버-서버 API 브릿지 ──────────────────────────────────────────────────────

interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
  scope: string
}

const MOCK_TOKEN: TokenResponse = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3599,
  tokenType: 'Bearer',
  scope: 'user_key user_name user_phone',
}

export const AppsInToss = {
  registerApp: (component: unknown, _options: unknown) => component,

  /**
   * POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token
   * Body: { authorizationCode, referrer }
   * AccessToken 유효시간: 1시간 / RefreshToken 유효시간: 14일
   */
  generateOauth2Token: async (params: {
    authorizationCode: string
    referrer: string
  }): Promise<TokenResponse> => {
    try {
      const result = await tossProxy<TokenResponse>('/generate-token', {
        method: 'POST',
        body: JSON.stringify(params),
      })
      _sessionToken = result.accessToken
      console.info('[TossLogin] generateOauth2Token 성공, accessToken 세팅')
      return result
    } catch (e) {
      console.warn('[TossLogin] generateOauth2Token proxy 실패, mock 사용:', e)
      _sessionToken = MOCK_TOKEN.accessToken
      return MOCK_TOKEN
    }
  },

  /**
   * POST /api-partner/v1/apps-in-toss/user/oauth2/refresh-token
   * Body: { refreshToken }
   */
  refreshOauth2Token: async (params: {
    refreshToken: string
  }): Promise<TokenResponse> => {
    try {
      const result = await tossProxy<TokenResponse>('/refresh-token', {
        method: 'POST',
        body: JSON.stringify(params),
      })
      _sessionToken = result.accessToken
      console.info('[TossLogin] refreshOauth2Token 성공, accessToken 갱신')
      return result
    } catch (e) {
      console.warn('[TossLogin] refreshOauth2Token proxy 실패, mock 사용:', e)
      _sessionToken = 'mock-access-token-refreshed'
      return { ...MOCK_TOKEN, accessToken: 'mock-access-token-refreshed' }
    }
  },

  /**
   * GET /api-partner/v1/apps-in-toss/user/oauth2/login-me
   * Authorization: Bearer ${accessToken}
   * 개인정보(name, phone 등)는 AES-256-GCM 암호화 상태로 반환됨
   */
  loginMe: async () => {
    if (_sessionToken) {
      try {
        const result = await tossProxy<{
          userKey: number
          scope: string
          agreedTerms: string[]
          name?: string
          phone?: string
          birthday?: string
          ci?: string
          di: null
          gender?: string
          nationality?: string
          email?: string | null
        }>('/login-me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${_sessionToken}` },
        })
        console.info('[TossLogin] loginMe 성공, userKey:', result.userKey)
        return result
      } catch (e) {
        console.warn('[TossLogin] loginMe proxy 실패, mock 사용:', e)
      }
    }
    // 세션 토큰 없거나 proxy 실패 → mock 반환
    return {
      userKey: Number(import.meta.env.VITE_DEV_USER_KEY ?? 10001),
      scope: 'user_key user_name user_phone',
      agreedTerms: ['terms_service', 'terms_privacy'],
      name: undefined,
      phone: undefined,
      birthday: undefined,
      ci: undefined,
      di: null,
      gender: undefined,
      nationality: undefined,
      email: null,
    }
  },

  /**
   * POST /api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-access-token
   * Authorization: Bearer ${accessToken}
   */
  removeByAccessToken: async (params: { accessToken: string }): Promise<void> => {
    try {
      await tossProxy('/access/remove-by-access-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${params.accessToken}` },
      })
      if (_sessionToken === params.accessToken) _sessionToken = null
      console.info('[TossLogin] removeByAccessToken 성공')
    } catch (e) {
      console.warn('[TossLogin] removeByAccessToken proxy 실패:', e)
    }
  },

  /**
   * POST /api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-user-key
   * Body: { userKey }
   * 주의: 연결된 AccessToken이 많으면 readTimeout(3초) 발생 가능 — 재시도 금지
   */
  removeByUserKey: async (params: { userKey: number }): Promise<void> => {
    try {
      await tossProxy('/access/remove-by-user-key', {
        method: 'POST',
        body: JSON.stringify(params),
      })
      _sessionToken = null
      console.info('[TossLogin] removeByUserKey 성공, userKey:', params.userKey)
    } catch (e) {
      console.warn('[TossLogin] removeByUserKey proxy 실패:', e)
    }
  },
}

const noop = () => {}
const noopSupported = Object.assign(noop, { isSupported: () => false })

export const IAP = {
  getProductItemList: Object.assign(async () => undefined, { isSupported: () => false }),
  createSubscriptionPurchaseOrder: Object.assign(
    (_params: unknown) => noop,
    { isSupported: () => false }
  ),
  createOneTimePurchaseOrder: Object.assign(
    (_params: unknown) => noop,
    { isSupported: () => false }
  ),
  getPendingOrders: Object.assign(async () => undefined, { isSupported: () => false }),
  getCompletedOrRefundedOrders: Object.assign(async () => undefined, { isSupported: () => false }),
  completeProductGrant: Object.assign(async () => undefined, { isSupported: () => false }),
}

export const TossAds = {
  initialize: noopSupported,
  attach: noopSupported,
  attachBanner: Object.assign(() => ({ destroy: noop }), { isSupported: () => false }),
  destroy: noopSupported,
  destroyAll: noopSupported,
}

export const GoogleAdMob = {
  loadAppsInTossAdMob: Object.assign(() => noop, { isSupported: () => false }),
  showAppsInTossAdMob: Object.assign(() => noop, { isSupported: () => false }),
  isAppsInTossAdMobLoaded: Object.assign(async () => false, { isSupported: () => false }),
}
