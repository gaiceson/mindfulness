/**
 * 토스 로그인 SDK 래퍼
 * 앱인토스 프레임워크 브릿지를 통해 서버-서버 OAuth2 API를 추상화
 *
 * 로그인 플로우:
 *   1. appLogin()           — 클라이언트: 인가 코드 받기
 *   2. generateOauth2Token  — 서버: accessToken + refreshToken 발급
 *      POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token
 *   3. loginMe              — 서버: 사용자 정보 조회
 *      GET  /api-partner/v1/apps-in-toss/user/oauth2/login-me
 *   4. refreshOauth2Token   — 서버: accessToken 갱신 (refreshToken 유효기간 14일)
 *      POST /api-partner/v1/apps-in-toss/user/oauth2/refresh-token
 *   5. removeByAccessToken  — 서버: accessToken으로 로그인 해제
 *      POST /api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-access-token
 *   6. removeByUserKey      — 서버: userKey로 전체 세션 해제
 *      POST /api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-user-key
 */

import { appLogin as sdkAppLogin, AppsInToss } from '@apps-in-toss/web-framework';


// ─── 타입 ──────────────────────────────────────────────────────────────────────

export interface AppLoginResult {
  authorizationCode: string;      // 유효시간 10분, 일회성
  referrer: 'DEFAULT' | 'SANDBOX';
}

export interface TossOAuth2Token {
  accessToken: string;
  refreshToken: string;           // 유효기간 14일
  expiresIn: number;              // 초 (약 3599 = 1시간)
  tokenType: 'Bearer';
  scope: string;
}

export interface TossUser {
  userKey: number;                // 토스 고유 유저 식별자 (안정적, 영구적)
  scope: string;                  // 인가된 scope 목록 (공백 또는 쉼표 구분)
  agreedTerms: string[];          // 사용자가 동의한 약관 태그 목록
  name?: string;                  // AES-256-GCM 암호화 값
  phone?: string;                 // AES-256-GCM 암호화 값
  birthday?: string;              // AES-256-GCM 암호화 값 (yyyyMMdd)
  ci?: string;                    // AES-256-GCM 암호화 값
  di: null;                       // 항상 null
  gender?: string;                // AES-256-GCM 암호화 값 (MALE/FEMALE)
  nationality?: string;           // AES-256-GCM 암호화 값 (LOCAL/FOREIGNER)
  email?: string | null;          // AES-256-GCM 암호화 값 (점유 인증 미실시)
}

// ─── 클라이언트 SDK ─────────────────────────────────────────────────────────────

/**
 * 토스 앱 인증 흐름으로 인가 코드 받기 (클라이언트 전용)
 * - 최초 로그인: 약관 동의 화면 표시 후 인가 코드 반환
 * - 재로그인: 약관 동의 없이 즉시 인가 코드 반환
 */
export const appLogin = (): Promise<AppLoginResult> => sdkAppLogin();

// ─── 서버-서버 API 브릿지 ──────────────────────────────────────────────────────

/**
 * authorizationCode → accessToken + refreshToken 발급
 * POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token
 *
 * @param authorizationCode - appLogin()에서 받은 인가 코드
 * @param referrer          - appLogin()에서 받은 referrer ('DEFAULT' | 'SANDBOX')
 */
export const generateOauth2Token = (
  authorizationCode: string,
  referrer: 'DEFAULT' | 'SANDBOX',
): Promise<TossOAuth2Token> =>
  AppsInToss.generateOauth2Token({ authorizationCode, referrer });

/**
 * refreshToken으로 accessToken 갱신
 * POST /api-partner/v1/apps-in-toss/user/oauth2/refresh-token
 */
export const refreshOauth2Token = (refreshToken: string): Promise<TossOAuth2Token> =>
  AppsInToss.refreshOauth2Token({ refreshToken });

/**
 * 현재 로그인된 토스 유저 정보 조회
 * GET /api-partner/v1/apps-in-toss/user/oauth2/login-me
 * Authorization: Bearer ${accessToken}
 *
 * 반환되는 개인정보(name, phone 등)는 AES-256-GCM 암호화 상태
 */
export const loginMe = (): Promise<TossUser> =>
  AppsInToss.loginMe();

/**
 * accessToken으로 로그인 해제
 * POST /api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-access-token
 * Authorization: Bearer ${accessToken}
 */
export const removeByAccessToken = (accessToken: string): Promise<void> =>
  AppsInToss.removeByAccessToken({ accessToken });

/**
 * userKey로 전체 세션 해제
 * POST /api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-user-key
 *
 * 주의: accessToken이 많을 경우 readTimeout(3초) 발생 가능 — 재시도 금지
 */
export const removeByUserKey = (userKey: number): Promise<void> =>
  AppsInToss.removeByUserKey({ userKey });

// ─── 초기화 헬퍼 ───────────────────────────────────────────────────────────────

export interface TossSession {
  userKey: number;
  accessToken: string;
  refreshToken: string;
  /** accessToken 만료 시각 (epoch ms) */
  expiresAt: number;
}

/**
 * 전체 OAuth2 플로우를 수행하고 세션 정보를 반환.
 * 실패 시 dev 환경에서는 mock 세션 반환, prod에서는 null.
 */
export async function getTossSession(): Promise<TossSession | null> {
  try {
    const { authorizationCode, referrer } = await appLogin();
    const token = await generateOauth2Token(authorizationCode, referrer);
    const user = await loginMe();
    return {
      userKey: user.userKey,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: Date.now() + token.expiresIn * 1000,
    };
  } catch {
    if (import.meta.env.DEV) {
      return {
        userKey: Number(import.meta.env.VITE_DEV_USER_KEY ?? 10001),
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 3600 * 1000,
      };
    }
    return null;
  }
}

/**
 * 앱 시작 시 userKey를 가져옴 (하위 호환).
 * @deprecated getTossSession() 사용 권장
 */
export async function getTossUserKey(): Promise<number | null> {
  const session = await getTossSession();
  return session?.userKey ?? null;
}
