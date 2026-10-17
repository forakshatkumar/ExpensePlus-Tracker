# What was fixed — ExpensePlus production deployment

## Actual issue

The deployed React app loaded but displayed **Backend URL missing**. The old implementation relied on the build-time `VITE_API_URL` variable, which wasn't included in the deployed client bundle. The backend itself was running.

## Code fixes

- `client/src/lib/api.js`: production API calls use relative `/api/...` routes. Local development still uses `VITE_API_URL`, defaulting to `http://localhost:4000`.
- `client/vercel.json`: rewrites `/api/:path*` to `https://expenseplus-api.vercel.app/api/:path*`, **before** the SPA fallback rule for React Router.
- `client/.env.example` and `server/.env.example`: safe starter environment settings (no credentials).
- `README.md` and `VERCEL-QUICK-START.md`: corrected deployment instructions. No new frontend environment variable is required for API access.

## Deployment required

A change to the ZIP does not automatically change your Vercel site. Commit and push these changes to the **GitHub repository connected to the frontend Vercel project**. Verify Vercel uses `client` as Root Directory and redeploy. You can keep the working `expenseplus-api` backend; it doesn't need to be recreated.

## Verification

- Confirmed the live backend `https://expenseplus-api.vercel.app/api/health` returned `{"ok":true,"service":"expenseplus-api"}` on 2026-10-18.
- Checked Vercel rewrite priority/configuration and production same-origin API selection.
- Checked all relative JS/JSX component imports resolve to files.
- Passed `node --check` for server and non-JSX JS files.
- Verified uploaded Git metadata, local `.env` files, and any private Admin JSON were **excluded** from this ZIP.
- **Not completed:** npm install/full Vite compilation (dependency installation timed out), browser end-to-end tests, Firestore-protected API tests (require your actual user login and Firebase Admin credentials).

## Quick smoke tests after redeploy

1. `https://expenseplus-api.vercel.app/api/health`: direct backend health JSON.
2. `https://expense-plus-pi-gray.vercel.app/api/health`: **same JSON** from the frontend domain, proving proxy works.
3. Sign in with Google. If needed, authorize `expense-plus-pi-gray.vercel.app` under Firebase Authentication > Settings > Authorized domains.
4. Load dashboard, add a sample expense, refresh, and verify persistence.
5. If the proxy works but authenticated APIs return 500, open backend Vercel Function logs and verify Firestore activation and `FIREBASE_SERVICE_ACCOUNT_JSON`.
