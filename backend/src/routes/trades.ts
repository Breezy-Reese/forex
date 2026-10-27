import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { trades, txs, users, withTx, type TradeDoc } from "../db.js";
import { AppError } from "../lib/errors.js";
import { getRates } from "../lib/rates.js";
import { PAIRS, marginUsd, pairPrice, pnlUsd, round2 } from "../lib/trading.js";
import { publicUser, requireUser } from "../middleware/auth.js";

export function tradeDto(t: TradeDoc) {
  return {
    id: t._id.toHexString(),
    pair: t.pair,
    side: t.side,
    units: t.units,
    openPrice: t.openPrice,
    closePrice: t.closePrice ?? null,
    margin: t.margin,
    pnl: t.pnl ?? null,
    status: t.status,
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt ? t.closedAt.toISOString() : null,
  };
}

// ---------- GET /api/portfolio ----------
export const portfolioRouter = Router();
portfolioRouter.use(requireUser);
portfolioRouter.get("/", async (req, res) => {
  const u = req.user!;
  const { rates } = await getRates();
  const list = await (await trades()).find({ userId: u._id }).sort({ openedAt: -1 }).limit(200).toArray();
  const open = list
    .filter((t) => t.status === "open")
    .map((t) => {
      const price = pairPrice(t.pair, rates);
      return {
        ...tradeDto(t),
        currentPrice: price,
        livePnl: pnlUsd(t.pair, t.side, t.units, t.openPrice, price, rates),
      };
    });
  const usedMargin = round2(open.reduce((s, t) => s + t.margin, 0));
  const floating = round2(open.reduce((s, t) => s + t.livePnl, 0));
  res.json({
    user: publicUser(u),
    open,
    closed: list.filter((t) => t.status === "closed").map(tradeDto),
    usedMargin,
    floating,
    equity: round2(u.balance + floating),
  });
});

// ---------- /api/trades ----------
export const tradesRouter = Router();
tradesRouter.use(requireUser);

const openSchema = z.object({
  pair: z.enum(PAIRS),
  side: z.enum(["buy", "sell"]),
  units: z.number().int().min(1000).max(10_000_000),
});

tradesRouter.post("/", async (req, res) => {
  const data = openSchema.parse(req.body);
  const uid = req.user!._id;
  const { rates } = await getRates();
  const margin = marginUsd(data.pair, data.units, rates);

  const doc = await withTx(async (session) => {
    // Touching the user doc makes concurrent orders for the same user conflict and retry,
    // so two simultaneous orders can't both pass the margin check.
    const u = await (await users()).findOneAndUpdate(
      { _id: uid, disabled: { $ne: true } },
      { $inc: { rev: 1 } },
      { session, returnDocument: "after" },
    );
    if (!u) throw new AppError(401, "Please sign in");
    const open = await (await trades()).find({ userId: uid, status: "open" }, { session }).toArray();
    const used = open.reduce((s, t) => s + t.margin, 0);
    if (used + margin > u.balance) throw new AppError(400, "Not enough free balance for this trade size");
    const t: TradeDoc = {
      _id: new ObjectId(),
      userId: uid,
      pair: data.pair,
      side: data.side,
      units: data.units,
      openPrice: pairPrice(data.pair, rates),
      margin,
      status: "open",
      openedAt: new Date(),
    };
    await (await trades()).insertOne(t, { session });
    return t;
  });
  res.status(201).json(tradeDto(doc));
});

tradesRouter.post("/:id/close", async (req, res) => {
  const { id } = z.object({ id: z.string().length(24) }).parse(req.params);
  const uid = req.user!._id;
  const { rates } = await getRates();

  const pnl = await withTx(async (session) => {
    const col = await trades();
    const t = await col.findOne({ _id: new ObjectId(id), userId: uid, status: "open" }, { session });
    if (!t) throw new AppError(404, "Trade not found");
    const closePrice = pairPrice(t.pair, rates);
    const p = pnlUsd(t.pair, t.side, t.units, t.openPrice, closePrice, rates);
    await col.updateOne(
      { _id: t._id, status: "open" },
      { $set: { status: "closed", closePrice, pnl: p, closedAt: new Date() } },
      { session },
    );
    await (await users()).updateOne({ _id: uid }, { $inc: { balance: p, rev: 1 } }, { session });
    await (await txs()).insertOne(
      {
        _id: new ObjectId(),
        userId: uid,
        type: "trade",
        amount: p,
        note: `Closed ${t.side} ${t.pair}`,
        createdAt: new Date(),
      },
      { session },
    );
    return p;
  });
  res.json({ pnl });
});
