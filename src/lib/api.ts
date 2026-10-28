import { Platform } from 'react-native';

// Adresse de l'API (trade_back), sans le prefixe /trade/v1. En local, l'emulateur Android
// joint la machine hote par 10.0.2.2 ; en production, definir
// EXPO_PUBLIC_API_URL au moment du build.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');

// Toutes les routes metier sont versionnees sous ce prefixe (cf. trade_back).
const API_PREFIX = '/trade/v1';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Reponses de l'API : { success, message, data } ou { success: false, message, details? }.
type Envelope<T> = { success: boolean; message?: string; data?: T; details?: string[] };

export type Session = { token: string; refresh_token: string };

let authToken: string | null = null;
let refreshToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let onSessionRenewed: ((session: Session) => void) | null = null;

export function setSession(session: Session | null) {
  authToken = session?.token ?? null;
  refreshToken = session?.refresh_token ?? null;
}

export function getRefreshToken() {
  return refreshToken;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

// Appele quand la session a ete renouvelee, pour enregistrer les nouveaux jetons.
export function setSessionRenewedHandler(handler: (session: Session) => void) {
  onSessionRenewed = handler;
}

async function send(path: string, method: string, body: unknown, token: string | null) {
  try {
    return await fetch(`${API_URL}${API_PREFIX}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Serveur injoignable : vérifie ta connexion.');
  }
}

// Un seul renouvellement a la fois : plusieurs ecrans peuvent recevoir un
// 401 en meme temps, et le serveur refuse un refresh_token deja utilise.
let renewing: Promise<boolean> | null = null;

function renewSession() {
  renewing ??= (async () => {
    if (!refreshToken) return false;
    try {
      const response = await send('/auth/refresh', 'POST', { refresh_token: refreshToken }, null);
      if (!response.ok) return false;
      const envelope = (await response.json()) as Envelope<Session>;
      if (!envelope.data) return false;
      setSession(envelope.data);
      onSessionRenewed?.(envelope.data);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    renewing = null;
  });
  return renewing;
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}) {
  const method = options.method ?? 'GET';

  let response = await send(path, method, options.body, authToken);

  // Jeton d'acces expire (60 min) : on le renouvelle et on rejoue la requete.
  if (response.status === 401 && authToken && !path.startsWith('/auth/')) {
    if (await renewSession()) {
      response = await send(path, method, options.body, authToken);
    }
  }

  const envelope = (await response.json().catch(() => null)) as Envelope<T> | null;

  if (!response.ok) {
    if (response.status === 401 && authToken && !path.startsWith('/auth/')) onUnauthorized?.();
    throw new ApiError(
      response.status,
      typeof envelope?.message === 'string' ? envelope.message : 'Une erreur est survenue.'
    );
  }
  return envelope?.data as T;
}

// ---- Types renvoyes par l'API ----

export type Quota = { used: number; limit: number };

export type User = {
  id: number;
  email: string;
  plan: string;
  pro_until: string | null;
  assistant: Quota;
};

export type Offer = {
  price: number;
  currency: string;
  days: number;
  assistant_limit: number;
  available: boolean;
};

export type Dividend = {
  cutoff: string;
  ex_date: string;
  amount: number;
  days_left: number;
} | null;

export type MarketEntry = {
  symbol: string;
  name: string;
  close: number;
  pct: number | null;
  date: string | null;
  decision: string | null;
  score: number | null;
  confidence: number | null;
  changes: string[];
  dividend: Dividend;
  spark?: (number | null)[];
};

export type Analysis = {
  symbol: string;
  name: string;
  close: number;
  pct: number | null;
  session_date: string | null;
  result: {
    decision: string;
    score: number;
    confidence: number;
    technical_score: number;
    ml_score: number | null;
    risk_score: number | null;
    positive: number;
    negative: number;
    neutral: number;
    reasons: string[];
    liquidity_warnings: string[];
    details?: {
      indicator: string;
      tone: 'positive' | 'negative' | 'neutral';
      counted: boolean;
      text: string;
    }[];
  };
  ml: { probability_up: number | null; counted: boolean; horizon_days: number | null };
  dividend: Dividend;
  narration: string[];
  chart: { dates: string[] } & Record<string, (number | null)[] | string[]>;
  indicators: string[];
};

export type Valuation = {
  cost: number;
  value: number;
  gain: number;
  gain_pct: number;
  dividends: number;
  fees: number;
  net: number;
  net_pct: number;
};

export type PortfolioPosition = {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  buy_price: number;
  buy_date: string;
  last_close: number | null;
  valuation: Valuation | null;
};

export type Portfolio = {
  positions: PortfolioPosition[];
  totals: {
    cost: number;
    value: number;
    dividends: number;
    fees: number;
    net: number;
    net_pct: number | null;
  };
};

export type Preferences = {
  selected_parameters: string[];
  adjust_dividends: boolean;
  round_trip_fee: number;
  indicator_options: string[];
};
