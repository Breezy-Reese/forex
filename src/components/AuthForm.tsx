import { useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { signIn, signUp } from "@/lib/api";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const doSignIn = signIn;
  const doSignUp = signUp;
  const navigate = useNavigate();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const email = String(f.get("email"));
      const password = String(f.get("password"));
      if (mode === "signup") await doSignUp({ data: { name: String(f.get("name")), email, password } });
      else await doSignIn({ data: { email, password } });
      await router.invalidate();
      navigate({ to: "/trade" });
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^\[.*?\]\s*/, "") : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-8 text-3xl font-bold">{mode === "signup" ? "Open your practice account" : "Welcome back"}</h1>
        <p className="mt-2 text-muted-foreground">
          {mode === "signup" ? "You'll get $10,000 in practice funds." : "Sign in to keep trading."}
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
          )}
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          {error && <p className="text-sm text-loss">{error}</p>}
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          {mode === "signup" ? (
            <>Already have an account? <Link to="/login" className="text-primary">Sign in</Link></>
          ) : (
            <>New here? <Link to="/signup" className="text-primary">Open an account</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
