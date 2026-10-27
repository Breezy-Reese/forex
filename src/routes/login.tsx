import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Tradefix" },
      { name: "description", content: "Sign in to your Tradefix practice trading account." },
      { property: "og:title", content: "Sign in — Tradefix" },
      { property: "og:description", content: "Sign in to your Tradefix practice trading account." },
    ],
  }),
  component: () => <AuthForm mode="login" />,
});
