// Browser client for the Tradefix backend (see tradefix-backend/README.md).
// Function names and the `({ data })` call style match the old server functions,
// so pages only needed their import path changed.
import type { Pair } from "./trading";

const BASE = (
  (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:4000"
).replace(/\/$/, "");

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      credentials: "include", // sends/receives the httpOnly session cookie
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : {},
      body: init.body !== undefined ? JSON.stringify(init.body) : null,
    });
  } catch {
    throw new Error("Can't reach the server. Is the backend running?");
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    const msg = (json as { error?: string } | null)?.error;
    throw new Error(msg ?? `Request failed (${res.status})`);
  }
  return json as T;
}

// ---------- Types ----------
export type User = { id: string; email: string; name: string; role: "admin" | "user"; balance: number };

export type Trade = {
  id: string;
  pair: string;
  side: "buy" | "sell";
  units: number;
  openPrice: number;
  closePrice: number | null;
  margin: number;
  pnl: number | null;
  status: "open" | "closed";
  openedAt: string;
  closedAt: string | null;
};
export type OpenTrade = Trade & { currentPrice: number; livePnl: number };

export type Portfolio = {
  user: User;
  open: OpenTrade[];
  closed: Trade[];
  usedMargin: number;
  floating: number;
  equity: number;
};

export type Wallet = {
  balance: number;
  transactions: {
    id: string;
    type: "deposit" | "withdraw" | "trade";
    amount: number;
    note: string;
    createdAt: string;
  }[];
};

export type AdminOverview = {
  users: (User & {
    disabled: boolean;
    createdAt: string;
    trades: number;
    openTrades: number;
    realized: number;
  })[];
  recent: (Trade & { email: string })[];
};

// ---------- Auth ----------
export const getMe = async (): Promise<User | null> =>
  (await request<{ user: User | null }>("/api/auth/me")).user;

export const signUp = async ({ data }: { data: { name: string; email: string; password: string } }) =>
  (await request<{ user: User }>("/api/auth/signup", { method: "POST", body: data })).user;

export const signIn = async ({ data }: { data: { email: string; password: string } }) =>
  (await request<{ user: User }>("/api/auth/login", { method: "POST", body: data })).user;

export const signOut = () => request<{ ok: true }>("/api/auth/logout", { method: "POST" });

// ---------- Market ----------
export const getQuotes = () =>
  request<{ date: string; quotes: { pair: Pair; price: number }[] }>("/api/market/quotes");

export const getPairHistory = ({ data }: { data: { pair: Pair } }) =>
  request<{ date: string; price: number }[]>(`/api/market/history?pair=${encodeURIComponent(data.pair)}`);

// ---------- Trading ----------
export const getPortfolio = () => request<Portfolio>("/api/portfolio");

export const openTrade = ({ data }: { data: { pair: Pair; side: "buy" | "sell"; units: number } }) =>
  request<Trade>("/api/trades", { method: "POST", body: data });

export const closeTrade = ({ data }: { data: { id: string } }) =>
  request<{ pnl: number }>(`/api/trades/${data.id}/close`, { method: "POST" });

// ---------- Wallet ----------
export const getWallet = () => request<Wallet>("/api/wallet");

export const moveFunds = ({ data }: { data: { type: "deposit" | "withdraw"; amount: number } }) =>
  request<{ ok: true }>(`/api/wallet/${data.type}`, { method: "POST", body: { amount: data.amount } });

// ---------- Admin ----------
export const adminOverview = () => request<AdminOverview>("/api/admin/overview");

export const adminUpdateUser = ({
  data,
}: {
  data: { id: string; action: "disable" | "enable" | "makeAdmin" | "removeAdmin" | "resetBalance" };
}) => request<{ ok: true }>(`/api/admin/users/${data.id}`, { method: "PATCH", body: { action: data.action } });
