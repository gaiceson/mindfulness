/**
 * @apps-in-toss/web-framework 타입 선언
 * 실제 패키지는 토스 앱 런타임에서 주입됨
 */
declare module '@apps-in-toss/web-framework' {
  /** 클라이언트: 토스 앱 인증 흐름으로 인가 코드 받기 (유효시간 10분, 일회성) */
  export function appLogin(): Promise<{
    authorizationCode: string;
    referrer: 'DEFAULT' | 'SANDBOX';
  }>;

  export const AppsInToss: {
    registerApp: (component: unknown, options: unknown) => unknown;

    /** GET /api-partner/v1/apps-in-toss/user/oauth2/login-me */
    loginMe: () => Promise<{
      userKey: number;
      scope: string;
      agreedTerms: string[];
      name?: string;
      phone?: string;
      birthday?: string;
      ci?: string;
      di: null;
      gender?: string;
      nationality?: string;
      email?: string | null;
    }>;

    /** POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token */
    generateOauth2Token: (params: { authorizationCode: string; referrer: string }) => Promise<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      tokenType: 'Bearer';
      scope: string;
    }>;

    /** POST /api-partner/v1/apps-in-toss/user/oauth2/refresh-token */
    refreshOauth2Token: (params: { refreshToken: string }) => Promise<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      tokenType: 'Bearer';
      scope: string;
    }>;

    /** POST /api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-access-token */
    removeByAccessToken: (params: { accessToken: string }) => Promise<void>;

    /** POST /api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-user-key */
    removeByUserKey: (params: { userKey: number }) => Promise<void>;
  };

  export const IAP: {
    getProductItemList: (() => Promise<{ products: unknown[] } | undefined>) & { isSupported: () => boolean };
    createSubscriptionPurchaseOrder: ((params: {
      options: {
        sku: string;
        offerId?: string | null;
        processProductGrant: (params: { orderId: string; subscriptionId?: string }) => boolean | Promise<boolean>;
      };
      onEvent: (event: unknown) => void | Promise<void>;
      onError: (error: unknown) => void | Promise<void>;
    }) => () => void) & { isSupported: () => boolean };
    createOneTimePurchaseOrder: ((params: unknown) => () => void) & { isSupported: () => boolean };
    getPendingOrders: (() => Promise<unknown>) & { isSupported: () => boolean };
    getCompletedOrRefundedOrders: (() => Promise<unknown>) & { isSupported: () => boolean };
    completeProductGrant: ((params: { params: { orderId: string } }) => Promise<boolean | undefined>) & { isSupported: () => boolean };
  };
}
