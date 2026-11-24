export interface NetworkEnvironmentConfig {
  readonly protocol: 'http' | 'https';
  readonly host: string;
  readonly backendPort: number;
  readonly frontendPort: number;
  readonly apiPrefix: string;
  readonly timeoutMs: number;
  readonly simulatedReferenceDateIso: string;
  readonly defaultSlaThresholdDays: number;
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
}

export const NETWORK_CONFIG: NetworkEnvironmentConfig = {
  protocol: 'http',
  host: 'localhost',
  backendPort: 3000,
  frontendPort: 4200,
  apiPrefix: '/api/v1',
  timeoutMs: 15000,
  simulatedReferenceDateIso: '2026-11-11',
  defaultSlaThresholdDays: 15,
  supabaseUrl: 'https://ladujqbzvigqlgaumsae.supabase.co',
  supabasePublishableKey: 'sb_publishable_OfpaLtNqAc6rUIVh8dR3AQ_D-M2ytAW',
} as const;

export const getApiBaseUrl = (): string =>
  `${NETWORK_CONFIG.protocol}://${NETWORK_CONFIG.host}:${NETWORK_CONFIG.backendPort}${NETWORK_CONFIG.apiPrefix}`;

export const API_ENDPOINTS = {
  auth: {
    base: () => `${getApiBaseUrl()}/auth`,
    login: () => `${getApiBaseUrl()}/auth/login`,
    refresh: () => `${getApiBaseUrl()}/auth/refresh`,
    logout: () => `${getApiBaseUrl()}/auth/logout`,
    sessionStatus: () => `${getApiBaseUrl()}/auth/session/status`,
    users: () => `${getApiBaseUrl()}/auth/users`,
    userById: (id: string) => `${getApiBaseUrl()}/auth/users/${encodeURIComponent(id)}`,
    rbacMatrix: () => `${getApiBaseUrl()}/auth/rbac-matrix`,
    clientCredentials: () => `${getApiBaseUrl()}/auth/client-credentials`,
  },
  quotations: {
    base: () => `${getApiBaseUrl()}/quotations`,
    byId: (id: string) => `${getApiBaseUrl()}/quotations/${encodeURIComponent(id)}`,
    approve: (id: string) => `${getApiBaseUrl()}/quotations/${encodeURIComponent(id)}/approve`,
  },
  shipments: {
    base: () => `${getApiBaseUrl()}/shipments`,
    byRef: (refArlogs: string) =>
      `${getApiBaseUrl()}/shipments/${encodeURIComponent(refArlogs)}`,
    milestones: (refArlogs: string) =>
      `${getApiBaseUrl()}/shipments/${encodeURIComponent(refArlogs)}/milestones`,
    slaThreshold: () => `${getApiBaseUrl()}/shipments/parameters/sla-threshold`,
    exportExcel: () => `${getApiBaseUrl()}/shipments/export/xlsx`,
  },
  billing: {
    base: () => `${getApiBaseUrl()}/billing`,
    invoiceByRef: (refArlogs: string) =>
      `${getApiBaseUrl()}/billing/${encodeURIComponent(refArlogs)}/invoice`,
  },
  warehouse: {
    items: () => `${getApiBaseUrl()}/warehouse/items`,
    receipts: () => `${getApiBaseUrl()}/warehouse/receipts`,
    dispatchById: (itemId: string) =>
      `${getApiBaseUrl()}/warehouse/items/${encodeURIComponent(itemId)}/dispatch`,
    movements: () => `${getApiBaseUrl()}/warehouse/movements`,
  },
  audit: {
    base: () => `${getApiBaseUrl()}/audit`,
    exportExcel: () => `${getApiBaseUrl()}/audit/export/xlsx`,
  },
} as const;
