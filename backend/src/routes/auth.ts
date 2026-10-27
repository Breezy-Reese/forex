import { Router } from "express";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { users, txs, type UserDoc } from "../db.js";
import { AppError } from "../lib/errors.js";
import { STARTING_BALANCE } from "../lib/trading.js";
import { endSession, loadUser, publicUser, startSession } from "../middleware/auth.js";

export const authRouter = Router();

const limiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, try again later" },
});

const signUpSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(100),
});
const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

authRouter.post("/signup", limiter, async (req, res) => {
  const data = signUpSchema.parse(req.body);
  const col = await users();
  if (await col.findOne({ email: data.email })) throw new AppError(409, "That email is already registered");

  // First account to sign up becomes admin.
  const isFirst = (await col.estimatedDocumentCount()) === 0;
  const doc: UserDoc = {
    _id: new ObjectId(),
    email: data.email,
    name: data.name,
    passwordHash: await bcrypt.hash(data.password, 10),
    role: isFirst ? "admin" : "user",
    balance: STARTING_BALANCE,
    createdAt: new Date(),
  };
  try {
    await col.insertOne(doc);
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) throw new AppError(409, "That email is already registered");
    throw e;
  }
  await (await txs()).insertOne({
    _id: new ObjectId(),
    userId: doc._id,
    type: "deposit",
    amount: STARTING_BALANCE,
    note: "Welcome practice balance",
    createdAt: new Date(),
  });
  const token = await startSession(res, doc._id.toHexString());
  res.status(201).json({ user: publicUser(doc), token });
});

authRouter.post("/login", limiter, async (req, res) => {
  const data = signInSchema.parse(req.body);
  const u = await (await users()).findOne({ email: data.email });
  if (!u || !(await bcrypt.compare(data.password, u.passwordHash)))
    throw new AppError(401, "Wrong email or password");
  if (u.disabled) throw new AppError(403, "This account is disabled");
  const token = await startSession(res, u._id.toHexString());
  res.json({ user: publicUser(u), token });
});

authRouter.post("/logout", (_req, res) => {
  endSession(res);
  res.json({ ok: true });
});

authRouter.get("/me", async (req, res) => {
  const u = await loadUser(req);
  res.json({ user: u ? publicUser(u) : null });
});
