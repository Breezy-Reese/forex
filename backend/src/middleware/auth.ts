import type { NextFunction, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { users, type UserDoc } from "../db.js";
import { AppError } from "../lib/errors.js";

export const COOKIE = "tradefix_session";
const WEEK = 60 * 60 * 24 * 7;

declare module "express-serve-static-core" {
  interface Request {
    user?: UserDoc;
  }
}

const key = () => new TextEncoder().encode(config().JWT_SECRET);

export async function signToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
}

function cookieOpts() {
  const c = config();
  return {
    httpOnly: true,
    secure: c.COOKIE_SECURE || c.COOKIE_SAMESITE === "none",
    sameSite: c.COOKIE_SAMESITE,
    path: "/",
  } as const;
}

export async function startSession(res: Response, userId: string) {
  const token = await signToken(userId);
  res.cookie(COOKIE, token, { ...cookieOpts(), maxAge: WEEK * 1000 });
  return token;
}

export function endSession(res: Response) {
  res.clearCookie(COOKIE, cookieOpts());
}

function tokenFrom(req: Request): string | undefined {
  const cookie = req.cookies?.[COOKIE] as string | undefined;
  if (cookie) return cookie;
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return undefined;
}

export async function loadUser(req: Request): Promise<UserDoc | null> {
  const token = tokenFrom(req);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (!payload.sub) return null;
    const u = await (await users()).findOne({ _id: new ObjectId(payload.sub) });
    if (!u || u.disabled) return null;
    return u;
  } catch {
    return null;
  }
}

export async function requireUser(req: Request, _res: Response, next: NextFunction) {
  const u = await loadUser(req);
  if (!u) throw new AppError(401, "Please sign in");
  req.user = u;
  next();
}

export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const u = await loadUser(req);
  if (!u) throw new AppError(401, "Please sign in");
  if (u.role !== "admin") throw new AppError(403, "Admins only");
  req.user = u;
  next();
}

export function publicUser(u: Pick<UserDoc, "_id" | "email" | "name" | "role" | "balance">) {
  return { id: u._id.toHexString(), email: u.email, name: u.name, role: u.role, balance: u.balance };
}
