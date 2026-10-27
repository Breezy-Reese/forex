// Free Frankfurter (ECB) feed, cached for 5 minutes. No API key needed.
let cache: { at: number; rates: Record<string, number>; date: string } | null = null;

export async function getRates() {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache;
  const res = await fetch("https://api.frankfurter.app/latest?from=USD");
  if (!res.ok) {
    if (cache) return cache; // serve stale rather than fail
    throw new Error("Price feed unavailable");
  }
  const json = (await res.json()) as { rates: Record<string, number>; date: string };
  cache = { at: Date.now(), rates: { ...json.rates, USD: 1 }, date: json.date };
  return cache;
}

export async function getHistory(pair: string, days = 90) {
  const [base = "", quote = ""] = pair.split("/");
  const start = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const res = await fetch(`https://api.frankfurter.app/${start}..?from=${base}&to=${quote}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { rates: Record<string, Record<string, number>> };
  return Object.entries(json.rates).map(([date, r]) => ({ date, price: r[quote] ?? 0 }));
}
