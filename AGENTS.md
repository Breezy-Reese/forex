<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- The frontend has no server code or database access. All data goes through the standalone Tradefix backend (Express + MongoDB, separate repo/folder `backend/`) via `src/lib/api.ts`, which reads `VITE_API_URL` (default http://localhost:4000). Why: user wanted a separate backend API.
- Auth: the backend sets an httpOnly JWT cookie; the client calls it with `credentials: "include"`. The `_authenticated` route is `ssr: false` so its loaders run in the browser where the cookie is available.
- First account to sign up becomes admin (enforced by the backend).
- Trading math is pure in `src/lib/trading.ts` (a copy lives in the backend) with tests in `trading.test.ts`.
- Prices come from the free Frankfurter (ECB) feed via the backend, cached 5 min.
