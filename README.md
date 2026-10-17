# ExpensePlus 2.0 — Vercel-ready full-stack project

A responsive expense manager with **React 19 + Vite + Tailwind CSS 4** and an **Express 5 + Firebase Admin / Firestore API**. Uses the existing Firebase project `spendly-ba3b0` and keeps the original Firestore user collections.

**This repository is deployed as TWO Vercel projects from ONE GitHub repository:**

| Project | Vercel Root Directory | Framework | URL example |
| --- | --- | --- | --- |
| ExpensePlus API | `server` | Express (auto-detect) | `https://expenseplus-api.vercel.app` |
| ExpensePlus website | `client` | Vite | `https://expense-plus-pi.vercel.app` |

> **Never deploy the repo root as the frontend.** The React app is under `client/`, not `/` or `server/`. The frontend's `client/vercel.json` provides refresh-safe React Router rewrites.

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Make ExpensePlus Vercel ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/expenseplus-v2.git
git push -u origin main
```

Create the empty repository first; replace `YOUR_USERNAME`. Do **not** commit any `.env` files or Firebase **service-account JSON**. The `.gitignore` excludes these common secret filenames; verify with `git status` before pushing.

## 2. Deploy the backend FIRST (`server`)

1. Vercel → **Add New → Project** → Import this GitHub repo.
2. Name the project e.g. `expenseplus-api`.
3. **Root Directory: `server`**. Framework: **Express** (automatic detection; do not choose Vite for backend).
4. Leave Build Command and Output Directory on their automatic Express defaults.
5. Add these **server-project** environment variables under Settings → Environment Variables (Production):

| Key | Value |
| --- | --- |
| `FIREBASE_PROJECT_ID` | `spendly-ba3b0` |
| `APP_TIME_ZONE` | `Asia/Kolkata` |
| `CLIENT_ORIGIN` | `https://expense-plus-pi.vercel.app` (replace with the EXACT live frontend URL, no trailing slash) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **Entire contents** of your Firebase Admin service-account JSON, set securely in Vercel (never commit to GitHub) |

The secret is created at **Firebase Console → Project Settings → Service accounts → Generate new private key**. It is NOT the public Firebase web config. Paste the whole downloaded JSON as the variable value, including braces. After updating variables in Vercel, **redeploy**.

6. Deploy. Visit `https://YOUR-BACKEND.vercel.app/api/health`. Expect JSON such as:

```json
{"ok": true, "service": "expenseplus-api"}
```

The backend root `/` returns a JSON explanation on purpose. The HTML web app lives on the **other** Vercel project.

## 3. Deploy the frontend (`client`)

1. Vercel → **Add New → Project** → Import the **same repo** again.
2. Name the project e.g. `expense-plus-pi`.
3. Set **Root Directory: `client`**, Framework: **Vite**, Build Command: `npm run build`, Output Directory: `dist`.
4. In **frontend-project** Environment Variables (Production) add:

```env
VITE_API_URL=https://YOUR-BACKEND.vercel.app
```

Replace with the exact API deployment domain (no trailing slash, no `/api` suffix). The frontend already includes your supplied **public Firebase web config** as defaults in `client/src/lib/firebase.js`. To override it or use a different Firebase project, set the `VITE_FIREBASE_*` variables shown in `client/.env.example` as Vercel frontend env vars.

5. Click Deploy. Verify the live domain serves a styled login page (or dashboard if signed in).
6. Go back to **the backend Vercel project**, ensure `CLIENT_ORIGIN` matches the *actual* frontend URL, then redeploy backend if changed.
7. In **Firebase Console → Authentication → Settings → Authorized domains**, add your public frontend host (e.g. `expense-plus-pi.vercel.app`, *without* `https://`). Google Sign-In must be enabled in **Sign-in method**.

After editing any environment variable, use **Redeploy**; Vite bakes its public configuration into the build.

## 4. Local development

Requires Node.js 20+ and npm. From the repo root:

```bash
npm install
cp client/.env.example client/.env
cp server/.env.example server/.env
```

On Windows without `cp`, manually create `.env` files from the examples.

Local `client/.env` should have `VITE_API_URL=http://localhost:4000`. Local `server/.env` should have `CLIENT_ORIGIN=http://localhost:5173`, `FIREBASE_PROJECT_ID=spendly-ba3b0`, and **either** a real `GOOGLE_APPLICATION_CREDENTIALS` path to a safely stored JSON service-account file, **or** a private `FIREBASE_SERVICE_ACCOUNT_JSON` value. Keep credentials private and outside Git.

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:4000/api/health`
- Production-style build: `npm run build`
- Server syntax check: `npm run check -w server`

## Common deployment errors and fixes

| Symptom | Fix |
| --- | --- |
| **Cannot GET /** or JSON API response on site URL | You deployed `server` instead of `client`, or visited the API project URL. Deploy the frontend with **Root Directory `client`**. |
| **404 on refreshing `/dashboard`** | Commit `client/vercel.json` (already included); deploy with Root Directory `client`. |
| **Blank screen** | Open browser DevTools → Console. The app now renders an explicit startup-error panel if its JS bootstrap fails. Check failed asset requests, build logs and environment variables. |
| **Backend URL missing** | Set `VITE_API_URL=https://YOUR-BACKEND.vercel.app` in frontend Vercel environment variables and **redeploy**. |
| **Google auth/unauthorized-domain** | Add your exact frontend hostname under Firebase Authentication → Authorized domains. |
| **CORS error / Failed to fetch** | On the backend set `CLIENT_ORIGIN` to the exact `https://...vercel.app` frontend origin, then redeploy. |
| **500 Internal server error** | Check backend Function logs and Admin service-account secret JSON. The `/api/health` route checks availability but not Firestore credentials. |
| **Local works, Vercel doesn't** | Make sure variables are set on the correct Vercel project and environment; Vercel cannot access a `C:\...` Windows JSON path. |

## Features

- Responsive, collapsible desktop/tablet sidebar and mobile navigation drawer.
- Expense add/edit/delete with desktop modal and mobile bottom sheet, notes, emoji categories.
- Spending overview and charts, transaction history with filters and CSV export, budgets, check-in streaks, badges, and editable profile.
- Firebase Google Authentication and protected, per-user Express/Firestore API calls.
- Minimalist dark espresso/sage editorial theme with optional light mode.

## Security and data

Only the browser-safe Firebase **web config** is included in client code. Your **Firebase Admin private key is NOT included** and must never enter `client/` or GitHub. All Firestore reads/writes go through Express endpoints requiring valid Firebase ID tokens. Expenses are stored at `users/{uid}/expenses`, profiles at `users/{uid}`, and streak information under the same existing user.

The included `firestore-admin-only.rules` is **optional**; only activate restrictive rules after you have stopped using older clients that access Firestore directly, or those clients will break.

## Verification note

Source and configuration files were checked for parse errors, JSON syntax, missing relative imports, and backend Node syntax. A full npm/Vite build and live Firebase deployment require dependency installation and real private Admin credentials, which are not available in this package's creation environment. Test the flow on your Vercel deployment after adding secrets.
