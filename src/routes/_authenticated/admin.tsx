import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminOverview, adminUpdateUser } from "@/lib/api";
import { errMsg, pnlClass, signedUsd, usd } from "@/lib/format";
import { Section, Table } from "@/components/Section";

const adminQ = queryOptions({ queryKey: ["admin"], queryFn: () => adminOverview() });

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Tradefix" },
      { name: "description", content: "Manage Tradefix users and review trades." },
      { property: "og:title", content: "Admin — Tradefix" },
      { property: "og:description", content: "Manage Tradefix users and review trades." },
    ],
  }),
  beforeLoad: ({ context }) => {
    if (context.user.role !== "admin") throw redirect({ to: "/trade" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(adminQ),
  component: AdminPage,
});

type Action = "disable" | "enable" | "makeAdmin" | "removeAdmin" | "resetBalance";

function AdminPage() {
  const { data } = useSuspenseQuery(adminQ);
  const { user: me } = Route.useRouteContext();
  const qc = useQueryClient();
  const update = adminUpdateUser;
  const act = async (id: string, action: Action) => {
    try {
      await update({ data: { id, action } });
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const totalBal = data.users.reduce((s, u) => s + u.balance, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
        {[
          ["Users", String(data.users.length)],
          ["Open trades", String(data.users.reduce((s, u) => s + u.openTrades, 0))],
          ["Total balances", usd(totalBal)],
        ].map(([l, v]) => (
          <div key={l} className="bg-card px-4 py-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{l}</div>
            <div className="num mt-1 text-xl font-semibold">{v}</div>
          </div>
        ))}
      </div>

      <Section title="Users">
        <Table head={["Name", "Email", "Role", "Balance", "Trades", "Realized P/L", ""]}>
          {data.users.map((u) => (
            <tr key={u.id} className={`border-t ${u.disabled ? "opacity-50" : ""}`}>
              <td className="px-4 py-2 font-medium">{u.name}</td>
              <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
              <td className="px-4 py-2 capitalize">{u.role}{u.disabled ? " · disabled" : ""}</td>
              <td className="num px-4 py-2">{usd(u.balance)}</td>
              <td className="num px-4 py-2">{u.trades} ({u.openTrades} open)</td>
              <td className={`num px-4 py-2 ${pnlClass(u.realized)}`}>{signedUsd(u.realized)}</td>
              <td className="px-4 py-2">
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="secondary" onClick={() => act(u.id, "resetBalance")}>Reset</Button>
                  {u.id !== me.id && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => act(u.id, u.role === "admin" ? "removeAdmin" : "makeAdmin")}>
                        {u.role === "admin" ? "Remove admin" : "Make admin"}
                      </Button>
                      <Button size="sm" variant={u.disabled ? "outline" : "destructive"} onClick={() => act(u.id, u.disabled ? "enable" : "disable")}>
                        {u.disabled ? "Enable" : "Disable"}
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Recent trades">
        <Table head={["Opened", "User", "Pair", "Side", "Units", "Status", "P/L"]}>
          {data.recent.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="px-4 py-2 text-muted-foreground">{new Date(t.openedAt).toLocaleString()}</td>
              <td className="px-4 py-2">{t.email}</td>
              <td className="px-4 py-2 font-medium">{t.pair}</td>
              <td className={`px-4 py-2 uppercase ${t.side === "buy" ? "text-gain" : "text-loss"}`}>{t.side}</td>
              <td className="num px-4 py-2">{t.units.toLocaleString()}</td>
              <td className="px-4 py-2 capitalize">{t.status}</td>
              <td className={`num px-4 py-2 ${pnlClass(t.pnl ?? 0)}`}>{t.pnl == null ? "—" : signedUsd(t.pnl)}</td>
            </tr>
          ))}
        </Table>
      </Section>
    </div>
  );
}
