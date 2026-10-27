import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { marketRouter } from "./routes/market.js";
import { portfolioRouter, tradesRouter } from "./routes/trades.js";
import { walletRouter } from "./routes/wallet.js";

export function createApp() {
  const app = express();
  const origins = config()
    .CORS_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.set("trust proxy", 1); // behind Render/Railway/Fly/etc. so rate-limit sees real IPs
  app.use(helmet());
  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json({ limit: "50kb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/market", marketRouter);
  app.use("/api/portfolio", portfolioRouter);
  app.use("/api/trades", tradesRouter);
  app.use("/api/wallet", walletRouter);
  app.use("/api/admin", adminRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
