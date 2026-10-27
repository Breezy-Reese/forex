import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { trades, users, type UserDoc } from "../db.js";
import { AppError } from "../lib/errors.js";
import { STARTING_BALANCE, round2 } from "../lib/trading.js";
import { publicUser, requireAdmin } from "../middleware/auth.js";
import { tradeDto } from "./trades.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get("/overview", async (_req, res) => {
  const all = await (await users()).find({}).sort({ createdAt: -1 }).limit(500).toArray();
  const tcol = await trades();
  const counts = await tcol
    .aggregate<{ _id: ObjectId; open: number; total: number; pnl: number }>([
      {
        $group: {
          _id: "$userId",
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
          pnl: { $sum: { $ifNull: ["$pnl", 0] } },
        },
      },
    ])
    .toArray();
  const byUser = new Map(counts.map((c) => [c._id.toHexString(), c]));
  const recent = await tcol.find({}).sort({ openedAt: -1 }).limit(30).toArray();
  const emailById = new Map(all.map((u) => [u._id.toHexString(), u.email]));
  res.json({
    users: all.map((u) => {
      const c = byUser.get(u._id.toHexString());
      return {
        ...publicUser(u),
        disabled: !!u.disabled,
        createdAt: u.createdAt.toISOString(),
        trades: c?.total ?? 0,
        openTrades: c?.open ?? 0,
        realized: round2(c?.pnl ?? 0),
      };
    }),
    recent: recent.map((t) => ({ ...tradeDto(t), email: emailById.get(t.userId.toHexString()) ?? "—" })),
  });
});

const actionSchema = z.object({
  action: z.enum(["disable", "enable", "makeAdmin", "removeAdmin", "resetBalance"]),
});

adminRouter.patch("/users/:id", async (req, res) => {
  const { id } = z.object({ id: z.string().length(24) }).parse(req.params);
  const { action } = actionSchema.parse(req.body);
  const me = req.user!;
  if (me._id.toHexString() === id && action !== "resetBalance")
    throw new AppError(400, "You can't change your own access");

  const _id = new ObjectId(id);
  const set: Partial<UserDoc> =
    action === "disable"
      ? { disabled: true }
      : action === "enable"
        ? { disabled: false }
        : action === "makeAdmin"
          ? { role: "admin" }
          : action === "removeAdmin"
            ? { role: "user" }
            : { balance: STARTING_BALANCE };
  const r = await (await users()).updateOne({ _id }, { $set: set });
  if (r.matchedCount === 0) throw new AppError(404, "User not found");
  if (action === "resetBalance") {
    await (await trades()).updateMany(
      { userId: _id, status: "open" },
      { $set: { status: "closed", pnl: 0, closedAt: new Date() } },
    );
  }
  res.json({ ok: true });
});
