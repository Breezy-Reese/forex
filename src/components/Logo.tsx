import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground num text-sm">TF</span>
      tradefix
    </Link>
  );
}
