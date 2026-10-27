# Apply to your frontend (the `forex/` root folder)

1. Copy everything in this zip over your frontend files (same paths).
2. Delete these files (the old built-in backend):
   - src/lib/api.functions.ts
   - src/lib/auth.server.ts
   - src/lib/db.server.ts
   - src/lib/rates.server.ts
3. Create `.env` in the frontend root:  VITE_API_URL=http://localhost:4000
4. In the frontend folder run:  npm install   (add --legacy-peer-deps if npm errors)
   Then start it:               npm run dev
5. Backend: make sure backend/.env has CORS_ORIGIN including the exact URL your frontend opens at
   (e.g. http://localhost:8080), and a real JWT_SECRET. Restart the backend after editing.
