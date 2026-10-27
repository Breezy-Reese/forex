import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { closeTrade, getPairHistory, getPortfolio, getQuotes, openTrade } from "@/lib/api";
import { decimalsFor, PAIRS, type Pair } from "@/lib/trading";
import { errMsg, pnlClass, signedUsd, usd } from "@/lib/format";

const quotesQ = queryOptions({ queryKey: ["quotes"], queryFn: () => getQuotes(), refetchInterval: 60_000 });
const portfolioQ = queryOptions({ queryKey: ["portfolio"], queryFn: () => getPortfolio(), refetchInterval: 30_000 });

export const Route = createFileRoute("/_authenticated/trade")({
  head: () => ({
    meta: [
      { title: "Trade — Tradefix" },
      { name: "description", content: "Live currency prices, charts and your open positions." },
      { property: "og:title", content: "Trade — Tradefix" },
      { property: "og:description", content: "Live currency prices, charts and your open positions." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(quotesQ), context.queryClient.ensureQueryData(portfolioQ)]),
  component: TradePage,
});

function TradePage() {
  const { data: quotes } = useSuspenseQuery(quotesQ);
  const { data: pf } = useSuspenseQuery(portfolioQ);
  const [pair, setPair] = useState<Pair>("EUR/USD");
  const [units, setUnits] = useState(10000);
  const qc = useQueryClient();
  const doOpen = openTrade;
  const doClose = closeTrade;
  const history = useQuery({ queryKey: ["history", pair], queryFn: () => getPairHistory({ data: { pair } }) });
  const price = quotes.quotes.find((q) => q.pair === pair)?.price ?? 0;
  const dp = decimalsFor(pair);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["portfolio"] });
    qc.invalidateQueries({ queryKey: ["wallet"] });
  };
  async function place(side: "buy" | "sell") {
    try {
      await doOpen({ data: { pair, side, units } });
      toast.success(`${side === "buy" ? "Bought" : "Sold"} ${units.toLocaleString()} ${pair}`);
      refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
        <Stat label="Balance" value={usd(pf.user.balance)} />
        <Stat label="Equity" value={usd(pf.equity)} />
        <Stat label="Open P/L" value={signedUsd(pf.floating)} cls={pnlClass(pf.floating)} />
        <Stat label="Margin used" value={usd(pf.usedMargin)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr_300px]">
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground">
            Markets · {quotes.date}
          </div>
          {quotes.quotes.map((q) => (
            <button
              key={q.pair}
              onClick={() => setPair(q.pair as Pair)}
              className={`flex w-full items-center justify-between px-4 py-3 text-left hover:bg-secondary ${q.pair === pair ? "bg-secondary" : ""}`}
            >
              <span className="font-medium">{q.pair}</span>
              <span className="num text-sm">{q.price.toFixed(decimalsFor(q.pair))}</span>
            </button>
          ))}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold">{pair}</h2>
            <span className="num text-2xl text-primary">{price.toFixed(dp)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Last 90 days</p>
          <div className="mt-4 h-72">
            {history.data && history.data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history.data}>
                  <defs>
                    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} minTickGap={40} />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={60} tickFormatter={(v: number) => v.toFixed(dp - 1)} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="price" stroke="var(--primary)" strokeWidth={2} fill="url(#fill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                {history.isLoading ? "Loading chart…" : "Chart unavailable"}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-4">
          <h3 className="font-semibold">New order</h3>
          <div>
            <label className="text-xs text-muted-foreground">Units ({pair.split("/")[0]})</label>
            <Input type="number" min={1000} step={1000} value={units} onChange={(e) => setUnits(Number(e.target.value))} className="num mt-1" />
            <div className="mt-2 flex gap-1">
              {[1000, 10000, 50000, 100000].map((u) => (
                <Button key={u} size="sm" variant="secondary" onClick={() => setUnits(u)} className="flex-1 px-1">
                  {u >= 1000 ? `${u / 1000}k` : u}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="sell" size="lg" onClick={() => place("sell")}>Sell</Button>
            <Button variant="buy" size="lg" onClick={() => place("buy")}>Buy</Button>
          </div>
          <p className="text-xs text-muted-foreground">Practice money only · 1:100 leverage</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 font-semibold">Open positions ({pf.open.length})</div>
        {pf.open.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No open trades. Pick a pair and press Buy or Sell.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>{["Pair", "Side", "Units", "Open", "Now", "P/L", ""].map((h) => <th key={h} className="px-4 py-2">{h}</th>)}</tr>
              </thead>
              <tbody>
                {pf.open.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{t.pair}</td>
                    <td className={`px-4 py-2 uppercase ${t.side === "buy" ? "text-gain" : "text-loss"}`}>{t.side}</td>
                    <td className="num px-4 py-2">{t.units.toLocaleString()}</td>
                    <td className="num px-4 py-2">{t.openPrice.toFixed(decimalsFor(t.pair))}</td>
                    <td className="num px-4 py-2">{t.currentPrice.toFixed(decimalsFor(t.pair))}</td>
                    <td className={`num px-4 py-2 ${pnlClass(t.livePnl)}`}>{signedUsd(t.livePnl)}</td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const r = await doClose({ data: { id: t.id } });
                            toast.success(`Closed for ${signedUsd(r.pnl)}`);
                            refresh();
                          } catch (e) {
                            toast.error(errMsg(e));
                          }
                        }}
                      >
                        Close
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`num mt-1 text-xl font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
