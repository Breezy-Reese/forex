import { MongoClient, ObjectId, type ClientSession, type Db } from "mongodb";
import { config } from "./config.js";

export type UserDoc = {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  role: "admin" | "user";
  balance: number;
  disabled?: boolean;
  /** bumped inside transactions so concurrent money operations conflict and retry */
  rev?: number;
  createdAt: Date;
};

export type TradeDoc = {
  _id: ObjectId;
  userId: ObjectId;
  pair: string;
  side: "buy" | "sell";
  units: number;
  openPrice: number;
  closePrice?: number;
  margin: number;
  pnl?: number;
  status: "open" | "closed";
  openedAt: Date;
  closedAt?: Date;
};

export type TxDoc = {
  _id: ObjectId;
  userId: ObjectId;
  type: "deposit" | "withdraw" | "trade";
  amount: number;
  note: string;
  createdAt: Date;
};

let clientPromise: Promise<MongoClient> | null = null;

export async function getClient(): Promise<MongoClient> {
  if (!clientPromise) {
    clientPromise = new MongoClient(config().MONGODB_URI, { maxPoolSize: 10 })
      .connect()
      .catch((e) => {
        clientPromise = null;
        throw e;
      });
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  return (await getClient()).db(config().MONGODB_DB);
}

export const users = async () => (await getDb()).collection<UserDoc>("users");
export const trades = async () => (await getDb()).collection<TradeDoc>("trades");
export const txs = async () => (await getDb()).collection<TxDoc>("transactions");

/** Run `fn` in a MongoDB transaction (Atlas replica sets support this). */
export async function withTx<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const client = await getClient();
  const session = client.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function ensureIndexes() {
  const db = await getDb();
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("trades").createIndex({ userId: 1, status: 1, openedAt: -1 });
  await db.collection("transactions").createIndex({ userId: 1, createdAt: -1 });
}

export async function closeDb() {
  if (clientPromise) {
    const c = await clientPromise;
    await c.close();
    clientPromise = null;
  }
}
