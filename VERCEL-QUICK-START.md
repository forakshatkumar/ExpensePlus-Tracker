# ExpensePlus — Vercel deployment (fixed API connection)

This is the **updated project from your uploaded ZIP**. It still uses two Vercel projects connected to one GitHub repository.

## Important: What was fixed

Production API calls now go to `/api/...` on the **frontend domain**, and `client/vercel.json` proxies them to `https://expenseplus-api.vercel.app/api/...`. The Vite build no longer needs `VITE_API_URL` in Vercel. This bypasses the configuration issue that caused `Backend URL missing`.

**Backend domain:** `https://expenseplus-api.vercel.app` — this is the backend health endpoint confirmed live when the package was prepared. If you later change your backend Vercel domain, edit `client/vercel.json` before rebuilding.

## Deploy in this order

1. Extract this ZIP and push the **project contents** to your existing GitHub repository on its `main` branch. `git add . && git commit -m "Fix ExpensePlus production API proxy" && git push` from the extracted project root. Make sure you cloned/pulled your repo first or point its remote to the correct repository. Do not upload `.env` files or Admin private keys.
2. Vercel **frontend project** (the project hosting `expense-plus-pi-gray.vercel.app`) → Settings → Build and Deployment:
   - Framework Preset **Vite**
   - Root Directory **`client`**
   - Build Command **`npm run build`**
   - Output Directory **`dist`**
3. Redeploy the **frontend** from the new GitHub commit (Deployments → latest deployment → Redeploy, or let the Git push trigger an automatic deployment). You do **not** need to create another frontend project.
4. In **Firebase Console → Authentication → Settings → Authorized domains**, confirm `expense-plus-pi-gray.vercel.app` is present. Google provider must be enabled under Sign-in method.
5. Keep the existing **backend** Vercel project root `server` and Firebase Admin environment settings. It needs `FIREBASE_PROJECT_ID=spendly-ba3b0` and **private** `FIREBASE_SERVICE_ACCOUNT_JSON`. The `CLIENT_ORIGIN` setting should match `https://expense-plus-pi-gray.vercel.app` for direct API requests. The proxy makes production browser API calls same-origin, but keeping CORS correct is useful for future clients.

## Check the result

- `https://expenseplus-api.vercel.app/api/health` should show `{"ok":true,...}` (backend directly).
- After deploying the updated **frontend**, `https://expense-plus-pi-gray.vercel.app/api/health` should also return the same JSON (proves rewrite is live).
- Open `https://expense-plus-pi-gray.vercel.app/login`, sign in with Google, and visit `/dashboard`.
- Add a small test expense; refresh and confirm it persists in Firestore.

If the frontend-domain `/api/health` returns HTML or 404, the **new `client/vercel.json` was not deployed** or the frontend project Root Directory is not `client`.
If `/api/health` works but the dashboard errors with **500**, check the **backend Function logs**; the health route itself does not validate Firestore access. Check `FIREBASE_SERVICE_ACCOUNT_JSON` and Firestore database activation in project `spendly-ba3b0`.
If the frontend domain returns 401 for `/api/user/profile` without being signed in, **that is normal** — protected endpoints require a Firebase ID token.

## Local development

From project root, with Node.js 20+:

```bash
npm install
cp client/.env.example client/.env
cp server/.env.example server/.env
npm run dev
```

Locally, set `VITE_API_URL=http://localhost:4000` in `client/.env`; backend at `http://localhost:4000`, frontend at `http://localhost:5173`. Local backend needs `GOOGLE_APPLICATION_CREDENTIALS` pointing to a private service-account JSON file stored **outside** the Git repo, or `FIREBASE_SERVICE_ACCOUNT_JSON` set privately on your machine.

**Security:** The ZIP excludes your uploaded `.git` directory and both local `.env` files. The Firebase Admin private key is never included. Firebase public web config remains in the client as a fallback; it is not an Admin credential.
