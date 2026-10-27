// Pure trading math shared by client and server.
export const PAIRS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
  "NZD/USD",
  "EUR/GBP",
] as const;
export type Pair = (typeof PAIRS)[number];

export const STARTING_BALANCE = 10000;
export const LEVERAGE = 100;

/** rates: USD-based table, e.g. { USD: 1, EUR: 0.92, JPY: 150 } */
export function pairPrice(pair: string, rates: Record<string, number>): number {
  const [base = "", quote = ""] = pair.split("/");
  const rb = base === "USD" ? 1 : (rates[base] ?? 0);
  const rq = quote === "USD" ? 1 : (rates[quote] ?? 0);
  if (!rb || !rq) throw new Error(`No rate for ${pair}`);
  return rq / rb;
}

/** Profit/loss in USD for a position of `units` of the base currency. */
export function pnlUsd(
  pair: string,
  side: "buy" | "sell",
  units: number,
  openPrice: number,
  closePrice: number,
  rates: Record<string, number>,
): number {
  const quote = pair.split("/")[1] ?? "";
  const rq = quote === "USD" ? 1 : (rates[quote] ?? 0);
  const diff = side === "buy" ? closePrice - openPrice : openPrice - closePrice;
  return round2((units * diff) / rq);
}

/** Margin (USD) a position ties up at LEVERAGE. */
export function marginUsd(pair: string, units: number, rates: Record<string, number>): number {
  const base = pair.split("/")[0] ?? "";
  const rb = base === "USD" ? 1 : (rates[base] ?? 0);
  return round2(units / rb / LEVERAGE);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function decimalsFor(pair: string) {
  return pair.includes("JPY") ? 3 : 5;
}
