/**
 * @apps-in-toss/web-framework 개발 환경 mock (SDK 2.x)
 * 실제 패키지는 토스 앱 런타임에서만 주입됨
 */

export const AppsInToss = {
  registerApp: (component: unknown, _options: unknown) => component,

  loginMe: async () => ({
    userKey: Number(import.meta.env.VITE_DEV_USER_KEY ?? 10001),
    scope: 'profile',
  }),

  generateOauth2Token: async (_: unknown) => ({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3599,
    tokenType: 'Bearer' as const,
    scope: 'profile',
  }),

  refreshOauth2Token: async (_: unknown) => ({
    accessToken: 'mock-access-token-refreshed',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3599,
    tokenType: 'Bearer' as const,
    scope: 'profile',
  }),

  removeByAccessToken: async (_: unknown) => {},
  removeByUserKey: async (_: unknown) => {},
};
