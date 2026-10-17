# Vercel Deployment — 2 Projects, 1 GitHub Repository

## A. Backend first
Vercel → Import GitHub repo → Name: `expenseplus-api` → **Root Directory = `server`** → Framework Express (auto).

Add **backend** environment variables:

```text
FIREBASE_PROJECT_ID = spendly-ba3b0
APP_TIME_ZONE = Asia/Kolkata
CLIENT_ORIGIN = https://YOUR-FRONTEND.vercel.app
FIREBASE_SERVICE_ACCOUNT_JSON = [complete PRIVATE Firebase Admin JSON]
```

Get the Admin JSON in Firebase Console → Project settings → Service accounts → Generate new private key. Do **not** include this key in GitHub, in frontend variables, or in this ZIP.

Deploy → verify `https://YOUR-BACKEND.vercel.app/api/health` responds with `ok: true`.

## B. Frontend second
Vercel → Import the **same** repo again → Name: `expense-plus-pi` → **Root Directory = `client`** → Vite → Build `npm run build` → Output `dist`.

Add **frontend** environment variable:

```text
VITE_API_URL = https://YOUR-BACKEND.vercel.app
```

Your existing PUBLIC Firebase web config (`spendly-ba3b0`) is already included. **Deploy**.

## C. Connect
- Firebase Console → Authentication → Settings → Authorized domains → add `YOUR-FRONTEND.vercel.app`.
- Vercel backend project → update `CLIENT_ORIGIN` to actual frontend `https://YOUR-FRONTEND.vercel.app` → **Redeploy**.
- Test Google login, add expense, dashboard, profile.

**If the site says `Cannot GET /`, you probably deployed the server folder as the frontend. Set frontend Root Directory to `client`.**

Full instructions in `README.md`.
