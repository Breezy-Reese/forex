import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPortfolio, getWallet, moveFunds } from "@/lib/api";
import { decimalsFor } from "@/lib/trading";
import { Empty, Section, Table } from "@/components/Section";
import { errMsg, pnlClass, signedUsd, usd } from "@/lib/format";

const walletQ = queryOptions({ queryKey: ["wallet"], queryFn: () => getWallet() });
const portfolioQ = queryOptions({ queryKey: ["portfolio"], queryFn: () => getPortfolio() });

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — Tradefix" },
      { name: "description", content: "Your practice balance, deposits, withdrawals and trade history." },
      { property: "og:title", content: "Wallet — Tradefix" },
      { property: "og:description", content: "Your practice balance, deposits, withdrawals and trade history." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(walletQ), context.queryClient.ensureQueryData(portfolioQ)]),
  component: WalletPage,
});

function WalletPage() {
  const { data: w } = useSuspenseQuery(walletQ);
  const { data: pf } = useSuspenseQuery(portfolioQ);
  const [amount, setAmount] = useState(1000);
  const qc = useQueryClient();
  const doMove = moveFunds;

  async function move(type: "deposit" | "withdraw") {
    try {
      await doMove({ data: { type, amount } });
      toast.success(type === "deposit" ? "Funds added" : "Funds withdrawn");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
        <div className="rounded-lg border bg-card p-6 shadow-glow">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Practice balance</div>
          <div className="num mt-2 text-5xl font-bold">{usd(w.balance)}</div>
          <div className="mt-2 text-sm text-muted-foreground">Free to trade: <span className="num">{usd(w.balance - pf.usedMargin)}</span></div>
        </div>
        <div className="space-y-3 rounded-lg border bg-card p-6">
          <label className="text-xs text-muted-foreground">Amount (USD)</label>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="num" />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => move("withdraw")}>Withdraw</Button>
            <Button variant="hero" onClick={() => move("deposit")}>Deposit</Button>
          </div>
        </div>
      </div>

      <Section title="Trade history">
        {pf.closed.length === 0 ? <Empty>No closed trades yet.</Empty> : (
          <Table head={["Closed", "Pair", "Side", "Units", "Open", "Close", "P/L"]}>
            {pf.closed.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-2 text-muted-foreground">{t.closedAt ? new Date(t.closedAt).toLocaleString() : "—"}</td>
                <td className="px-4 py-2 font-medium">{t.pair}</td>
                <td className={`px-4 py-2 uppercase ${t.side === "buy" ? "text-gain" : "text-loss"}`}>{t.side}</td>
                <td className="num px-4 py-2">{t.units.toLocaleString()}</td>
                <td className="num px-4 py-2">{t.openPrice.toFixed(decimalsFor(t.pair))}</td>
                <td className="num px-4 py-2">{t.closePrice?.toFixed(decimalsFor(t.pair)) ?? "—"}</td>
                <td className={`num px-4 py-2 ${pnlClass(t.pnl ?? 0)}`}>{signedUsd(t.pnl ?? 0)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Transactions">
        <Table head={["Date", "Type", "Note", "Amount"]}>
          {w.transactions.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="px-4 py-2 text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</td>
              <td className="px-4 py-2 capitalize">{t.type}</td>
              <td className="px-4 py-2">{t.note}</td>
              <td className={`num px-4 py-2 ${pnlClass(t.amount)}`}>{signedUsd(t.amount)}</td>
            </tr>
          ))}
        </Table>
      </Section>
    </div>
  );
}


