/**
 * @apps-in-toss/web-framework 타입 선언
 * 실제 패키지는 토스 앱 런타임에서 주입됨
 */
declare module '@apps-in-toss/web-framework' {
  export const AppsInToss: {
    registerApp: (component: unknown, options: unknown) => unknown;
    loginMe: () => Promise<{
      userKey: number;
      scope: string;
      name?: string;
      email?: string;
      phone?: string;
    }>;
    generateOauth2Token: (params: { authorizationCode: string; referrer: string }) => Promise<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      tokenType: 'Bearer';
      scope: string;
    }>;
    refreshOauth2Token: (params: { refreshToken: string }) => Promise<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      tokenType: 'Bearer';
      scope: string;
    }>;
    removeByAccessToken: (params: { accessToken: string }) => Promise<void>;
    removeByUserKey: (params: { userKey: number }) => Promise<void>;
  };
}
