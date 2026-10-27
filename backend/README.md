# Tradefix Backend

Standalone REST API for the Tradefix practice-forex app. Express 5 + TypeScript + MongoDB (Atlas).
It reproduces everything in the frontend's `src/lib/api.functions.ts`, with the same trading math
(`src/lib/trading.ts` is copied unchanged), the same data model, and the same rules.

## Run it

```bash
npm install
cp .env.example .env     # fill in MONGODB_URI and JWT_SECRET
npm run dev              # http://localhost:4000
npm test
npm run build && npm start
```

Use a MongoDB Atlas cluster (or any replica set): orders and withdrawals use transactions,
which need a replica set. A plain standalone `mongod` will not work for those routes.

## Endpoints

| Frontend server fn | Method + path | Auth |
| --- | --- | --- |
| `signUp` | `POST /api/auth/signup` `{name,email,password}` | public |
| `signIn` | `POST /api/auth/login` `{email,password}` | public |
| `signOut` | `POST /api/auth/logout` | public |
| `getMe` | `GET /api/auth/me` → `{user \| null}` | public |
| `getQuotes` | `GET /api/market/quotes` | public |
| `getPairHistory` | `GET /api/market/history?pair=EUR/USD` | public |
| `getPortfolio` | `GET /api/portfolio` | user |
| `openTrade` | `POST /api/trades` `{pair,side,units}` | user |
| `closeTrade` | `POST /api/trades/:id/close` | user |
| `getWallet` | `GET /api/wallet` | user |
| `moveFunds` | `POST /api/wallet/deposit` or `/withdraw` `{amount}` | user |
| `adminOverview` | `GET /api/admin/overview` | admin |
| `adminUpdateUser` | `PATCH /api/admin/users/:id` `{action}` | admin |
| — | `GET /health` | public |

`action` is one of `disable | enable | makeAdmin | removeAdmin | resetBalance`.
Errors are JSON: `{ "error": "message" }` with a proper status (400, 401, 403, 404, 409).

## Auth

- bcrypt password hashes, JWT (HS256, 7 days) in an httpOnly cookie `tradefix_session`.
  The same token is also returned in the login/signup response and accepted as
  `Authorization: Bearer <token>`.
- The first account to sign up becomes admin.
- Every protected request re-loads the user, so disabling an account takes effect immediately.
- Login/signup are rate limited (30 per 15 min per IP).

## Calling it from the frontend

Send cookies with every request:

```ts
const API = import.meta.env.VITE_API_URL; // e.g. http://localhost:4000

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Something went wrong");
  return body as T;
}

// api("/api/trades", { method: "POST", body: JSON.stringify({ pair, side, units }) })
```

Set `CORS_ORIGIN` to the frontend's URL. In production, if the frontend and API are on different
sites, set `COOKIE_SAMESITE=none` (HTTPS required); if they share a parent domain, `lax` is fine.

## Data (database `forex`)

- `users` — email (unique), name, passwordHash, role, balance, disabled, createdAt
- `trades` — userId, pair, side, units, openPrice, closePrice, margin, pnl, status, openedAt, closedAt
- `transactions` — userId, type (deposit | withdraw | trade), amount, note, createdAt

Indexes are created on startup.

## Differences from the embedded server functions

- Opening a trade, closing one, and moving funds run in MongoDB transactions, so two simultaneous
  orders can't both pass the margin check and a crash can't leave a trade closed without its P/L booked.
- Duplicate emails are also enforced by a unique index.
- Admin updates return 404 for unknown users.
- Rate limiting, Helmet security headers, request size limit.

## Not included (worth knowing)

- Prices come from the daily ECB feed (Frankfurter), so they update once a day, not live.
- No stop-loss/take-profit, password reset, or email verification.
- The "first user is admin" rule has a small race if two people sign up at the exact same moment on an empty database.
