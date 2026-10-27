# Tradefix

**Learn the markets without risking a shilling.**

Tradefix is a practice forex trading platform. Sign up, get **$10,000 in practice funds**, and trade
major currency pairs at **1:100 leverage** using real exchange rates. No real money is ever involved.

This repository is the **frontend**. It talks to the Tradefix backend API (Express + MongoDB), which
lives in a separate folder: `backend/`.

Built by Basil Kyende Mutuku.

---

## Features

- **Practice account:** every new user starts with $10,000 in practice funds.
- **Live-style market view:** 8 major pairs (EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USD/CAD, NZD/USD, EUR/GBP) with a 90-day price chart.
- **Buy / Sell orders:** choose the units, open a position, and close it whenever you like.
- **Portfolio:** balance, equity, open P/L and margin used, updated automatically.
- **Wallet:** practice deposits and withdrawals plus a full transaction history.
- **Admin dashboard:** view all users, disable accounts, promote or demote admins, reset balances, and review recent trades.
- **Secure sessions:** httpOnly cookie login, with the first account created becoming the admin.

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | TanStack Start (React 19) + TanStack Router |
| Language | TypeScript |
| Data fetching | TanStack Query |
| Styling | Tailwind CSS 4, shadcn/ui (Radix UI), Lucide icons |
| Charts | Recharts |
| Forms and toasts | React Hook Form, Zod, Sonner |
| Testing | Vitest, Testing Library |

## How it fits together

```
Browser (this app)  ──fetch + cookie──▶  Tradefix API (backend/)  ──▶  MongoDB Atlas
                                              │
                                              └──▶  Frankfurter (ECB) exchange rates
```

All data requests go through one file, `src/lib/api.ts`. The signed-in pages (`/trade`, `/wallet`,
`/admin`) load in the browser only, because the login cookie lives there.

## Getting started

### 1. Start the backend first

```bash
cd backend
npm install
cp .env.example .env     # add MONGODB_URI and JWT_SECRET
npm run dev              # runs on http://localhost:4000
```

In `backend/.env`, set `CORS_ORIGIN` to the exact URL this frontend opens at.

### 2. Start the frontend

```bash
npm install              # add --legacy-peer-deps if npm reports a dependency error
cp .env.example .env     # VITE_API_URL=http://localhost:4000
npm run dev
```

Open the URL printed in the terminal, create an account, and start trading.
The first account you create is the admin.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:4000` | Base URL of the Tradefix backend |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm test` | Run the tests once |
| `npm run test:watch` | Run the tests in watch mode |
| `npm run lint` | Lint the code |
| `npm run format` | Format with Prettier |

## Project structure

```
src/
  components/       Shared UI (AuthForm, Logo, Section) and shadcn/ui components
  lib/
    api.ts          Client for the backend API
    trading.ts      Pure trading math (price, P/L, margin) with tests
    format.ts       Currency and P/L formatting helpers
  routes/           File-based routes
    index.tsx         Landing page
    login.tsx         Sign in
    signup.tsx        Create account
    _authenticated/   Signed-in area
      trade.tsx         Markets, chart, orders, open positions
      wallet.tsx        Balance, deposits, withdrawals, history
      admin.tsx         User management (admins only)
```

## Deploying

1. Deploy the backend to a Node host (for example Render, Railway or Fly.io) and note its URL.
2. Set `VITE_API_URL` to that URL when building the frontend.
3. On the backend, set `CORS_ORIGIN` to your frontend's URL.
4. If the frontend and backend are on different sites, set `COOKIE_SAMESITE=none` on the backend (HTTPS required).

## Good to know

- Prices come from the European Central Bank's daily rates, so they update once a day rather than tick by tick.
- This is a learning tool. Balances are practice money and cannot be withdrawn.

## Ideas for next

- [ ] Stop-loss and take-profit orders
- [ ] Password reset and email verification
- [ ] Faster price updates from a live market feed
- [ ] Leaderboard of top practice traders