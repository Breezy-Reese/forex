import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { trades, txs, users, withTx } from "../db.js";
import { AppError } from "../lib/errors.js";
import { round2 } from "../lib/trading.js";
import { requireUser } from "../middleware/auth.js";

export const walletRouter = Router();
walletRouter.use(requireUser);

walletRouter.get("/", async (req, res) => {
  const u = req.user!;
  const list = await (await txs()).find({ userId: u._id }).sort({ createdAt: -1 }).limit(200).toArray();
  res.json({
    balance: u.balance,
    transactions: list.map((t) => ({
      id: t._id.toHexString(),
      type: t.type,
      amount: t.amount,
      note: t.note,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

const amountSchema = z.object({ amount: z.number().positive().max(1_000_000) });

async function move(userId: ObjectId, type: "deposit" | "withdraw", rawAmount: number) {
  const amount = round2(type === "deposit" ? rawAmount : -rawAmount);
  await withTx(async (session) => {
    const u = await (await users()).findOneAndUpdate(
      { _id: userId, disabled: { $ne: true } },
      { $inc: { rev: 1 } },
      { session, returnDocument: "after" },
    );
    if (!u) throw new AppError(401, "Please sign in");
    if (type === "withdraw") {
      const open = await (await trades()).find({ userId, status: "open" }, { session }).toArray();
      const used = open.reduce((s, t) => s + t.margin, 0);
      if (u.balance - used < rawAmount) throw new AppError(400, "Not enough free balance");
    }
    await (await users()).updateOne({ _id: userId }, { $inc: { balance: amount } }, { session });
    await (await txs()).insertOne(
      {
        _id: new ObjectId(),
        userId,
        type,
        amount,
        note: type === "deposit" ? "Practice deposit" : "Practice withdrawal",
        createdAt: new Date(),
      },
      { session },
    );
  });
}

walletRouter.post("/deposit", async (req, res) => {
  const { amount } = amountSchema.parse(req.body);
  await move(req.user!._id, "deposit", amount);
  res.json({ ok: true });
});

walletRouter.post("/withdraw", async (req, res) => {
  const { amount } = amountSchema.parse(req.body);
  await move(req.user!._id, "withdraw", amount);
  res.json({ ok: true });
});
