import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tradefix — Practice forex trading" },
      { name: "description", content: "Trade major currency pairs with a $10,000 practice balance and real exchange rates." },
      { property: "og:title", content: "Tradefix — Practice forex trading" },
      { property: "og:description", content: "Trade major currency pairs with a $10,000 practice balance and real exchange rates." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex gap-2">
          <Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button>
          <Button variant="hero" asChild><Link to="/signup">Open account</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-28">
        <p className="num text-sm uppercase tracking-[0.3em] text-primary">Practice account · 1:100 leverage</p>
        <h1 className="mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
          Learn the markets <span className="text-primary">without</span> risking a shilling.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Get $10,000 in practice funds. Buy and sell EUR/USD, GBP/USD, USD/JPY and more at real exchange rates.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button size="lg" variant="hero" asChild><Link to="/signup">Start trading free</Link></Button>
          <Button size="lg" variant="outline" asChild><Link to="/login">I have an account</Link></Button>
        </div>
        <div className="mt-24 grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3">
          {[
            ["8", "major currency pairs"],
            ["$10,000", "starting practice balance"],
            ["0", "real money at risk"],
          ].map(([n, l]) => (
            <div key={l} className="bg-card p-8">
              <div className="num text-4xl font-semibold text-primary">{n}</div>
              <div className="mt-2 text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
