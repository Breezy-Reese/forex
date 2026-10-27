import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Open an account — Tradefix" },
      { name: "description", content: "Create a free Tradefix account with $10,000 in practice funds." },
      { property: "og:title", content: "Open an account — Tradefix" },
      { property: "og:description", content: "Create a free Tradefix account with $10,000 in practice funds." },
    ],
  }),
  component: () => <AuthForm mode="signup" />,
});
