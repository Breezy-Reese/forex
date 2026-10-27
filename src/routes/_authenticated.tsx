import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { getMe, signOut } from "@/lib/api";

export const Route = createFileRoute("/_authenticated")({
  // Session cookie lives in the browser, so these routes (and their children) load client-side only.
  ssr: false,
  beforeLoad: async () => {
    const user = await getMe();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  component: Layout,
});

function Layout() {
  const { user } = Route.useRouteContext();
  const doSignOut = signOut;
  const navigate = useNavigate();
  const router = useRouter();
  const link = "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground";
  const active = { className: "rounded-md px-3 py-1.5 text-sm bg-secondary text-foreground" };
  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Logo />
          <nav className="flex gap-1">
            <Link to="/trade" className={link} activeProps={active}>Trade</Link>
            <Link to="/wallet" className={link} activeProps={active}>Wallet</Link>
            {user.role === "admin" && <Link to="/admin" className={link} activeProps={active}>Admin</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await doSignOut();
                await router.invalidate();
                navigate({ to: "/" });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
