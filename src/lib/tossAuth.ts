/**
 * 토스 로그인 SDK 래퍼
 * 앱인토스 프레임워크 브릿지를 통해 서버-서버 OAuth2 API를 추상화
 * https://developers-apps-in-toss.toss.im/api/loginMe.html
 */

import { AppsInToss } from '@apps-in-toss/web-framework';

export interface TossUser {
  userKey: number;  // 토스 고유 유저 식별자 (안정적, 영구적)
  scope: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface TossOAuth2Token {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;  // 초 (약 3599 = 1시간)
  tokenType: 'Bearer';
  scope: string;
}

// ─── SDK 함수 래퍼 ─────────────────────────────────────────────────────────────

/**
 * 현재 로그인된 토스 유저 정보 조회
 * GET /api-partner/v1/apps-in-toss/user/oauth2/login-me
 */
export const loginMe = (): Promise<TossUser> =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (AppsInToss as any).loginMe();

/**
 * authorizationCode → accessToken + refreshToken 발급
 * POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token
 */
export const generateOauth2Token = (authorizationCode: string): Promise<TossOAuth2Token> =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (AppsInToss as any).generateOauth2Token({ authorizationCode, referrer: 'DEFAULT' });

/**
 * refreshToken으로 accessToken 갱신 (유효기간 14일)
 * POST /api-partner/v1/apps-in-toss/user/oauth2/refresh-token
 */
export const refreshOauth2Token = (refreshToken: string): Promise<TossOAuth2Token> =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (AppsInToss as any).refreshOauth2Token({ refreshToken });

/**
 * accessToken으로 로그인 해제
 * POST /api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-access-token
 */
export const removeByAccessToken = (accessToken: string): Promise<void> =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (AppsInToss as any).removeByAccessToken({ accessToken });

/**
 * userKey로 전체 세션 해제
 * POST /api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-user-key
 */
export const removeByUserKey = (userKey: number): Promise<void> =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (AppsInToss as any).removeByUserKey({ userKey });

// ─── 초기화 헬퍼 ───────────────────────────────────────────────────────────────

/**
 * 앱 시작 시 userKey를 가져옴.
 * 토스 앱 외부(개발환경) 에서는 mock 값 반환.
 */
export async function getTossUserKey(): Promise<number | null> {
  try {
    const user = await loginMe();
    return user.userKey;
  } catch {
    // 개발 환경 또는 토스 앱 외부에서 실행 시
    if (import.meta.env.DEV) {
      return Number(import.meta.env.VITE_DEV_USER_KEY ?? 0) || null;
    }
    return null;
  }
}
