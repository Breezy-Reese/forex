export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
export const signedUsd = (n: number) => (n > 0 ? "+" : "") + usd(n);
export const pnlClass = (n: number) => (n > 0 ? "text-gain" : n < 0 ? "text-loss" : "text-muted-foreground");
export const errMsg = (e: unknown) =>
  e instanceof Error ? e.message.replace(/^\[.*?\]\s*/, "") : "Something went wrong";
