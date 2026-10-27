import { Router } from "express";
import { z } from "zod";
import { getHistory, getRates } from "../lib/rates.js";
import { PAIRS, pairPrice } from "../lib/trading.js";

export const marketRouter = Router();

marketRouter.get("/quotes", async (_req, res) => {
  const { rates, date } = await getRates();
  res.json({ date, quotes: PAIRS.map((pair) => ({ pair, price: pairPrice(pair, rates) })) });
});

// Pairs contain a slash, so use a query string: /api/market/history?pair=EUR/USD
marketRouter.get("/history", async (req, res) => {
  const { pair } = z.object({ pair: z.enum(PAIRS) }).parse(req.query);
  res.json(await getHistory(pair));
});
