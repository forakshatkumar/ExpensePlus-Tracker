# ExpensePlus 2.1 — Smart Finance PWA Edition

**Track smarter. Spend wiser. Anywhere.**

ExpensePlus is a React/Vite + Tailwind personal finance PWA with a Firebase-authenticated Express API and Cloud Firestore. This upgrade builds on the earlier ExpensePlus 2.0 / category-names-fixed project. It keeps the same Firestore user paths and existing dashboard, history, analytics, budget, streak, and profile features.

## What's new in 2.1

- **PWA**: installation manifest, 192/512/maskable icons, Apple touch icon, service worker that precaches the static app shell, manual iOS install guidance, and update prompt.
- **Offline privacy**: only the shell/assets are cached, **not** `/api`, Firebase tokens, financial records, or private profile images. Financial changes require a connection.
- **In-app budget notifications**: thresholds 50/75/90/100%, and above budget; persisted per user in Firestore; deduplicated by month and threshold; notification bell, read/unread controls and preferences.
- **Pre-save warnings**: projected spending before saving an expense (including edit amounts and selected dates); users can add anyway.
- **Optional device push**: standard browser Web Push via VAPID. Requires opt-in and backend VAPID setup. Single Workbox service worker handles push and app shell. No FCM SDK / competing worker.
- **Device avatar upload**: JPEG/PNG/WebP, up to 5 MB; validated and converted by Sharp on the Express backend, privately stored in Firebase Cloud Storage, fetched with a Firebase ID token. Uploaded picture overrides Google photo; restoring Google deletes private photo and clears external override.
- **Profile**: editable display name, avatar upload, notifications settings, PWA install card. All existing features preserved.

## Structure

```text
client/              React + Vite + Tailwind frontend
  public/icons/      PWA icons
  src/sw.js          Single PWA / Web Push service worker
  src/components/pwa/
  src/components/notifications/
  src/components/profile/
  vercel.json        /api rewrite FIRST, SPA fallback second
server/              Express + Firebase Admin API
  budgetAlerts.js    Alert threshold and dedup logic
  test-budget-alerts.mjs
```

## Local setup

Requirements: Node.js 20+, npm, Firebase Auth (Google), Firestore and a Firebase Admin service account.

1. Run `npm install` at the repository root.
2. Copy `client/.env.example` to `client/.env` and `server/.env.example` to `server/.env`.
3. Set `GOOGLE_APPLICATION_CREDENTIALS` in `server/.env` to an **absolute** path to your private Firebase Admin service account JSON **outside** the project. Do not commit credentials.
4. Run `npm run dev` in the root, open `http://localhost:5173`.
5. `npm run build` produces the Vite PWA at `client/dist`. PWA service workers generally require HTTPS or localhost; the development server does not register the production worker. Use `npm run preview -w client` after building for local PWA testing.

## Vercel deployment — existing two projects

**Backend**: Vercel project with root directory `server`, Express entry `server.js` (Vercel imports its default export). Configure under backend **Settings → Environment Variables**:

```dotenv
FIREBASE_PROJECT_ID=spendly-ba3b0
APP_TIME_ZONE=Asia/Kolkata
CLIENT_ORIGIN=https://expense-plus-pi-gray.vercel.app
FIREBASE_STORAGE_BUCKET=spendly-ba3b0.firebasestorage.app
```

Set `FIREBASE_SERVICE_ACCOUNT_JSON` as a **secret** in the backend containing the complete Firebase Admin service account JSON; never commit or prefix with `VITE_`.

**Frontend**: separate Vercel project with root directory `client`, Vite preset, build command `npm run build`, output directory `dist`.

`client/vercel.json` proxies `/api/:path*` to `https://expenseplus-api.vercel.app/api/:path*` before serving `index.html` for React Router. If you rename your backend, update the rewrite destination. The frontend production API does **not** require `VITE_API_URL` because it uses same-origin `/api` calls. Google sign-in requires authorizing the frontend domain under Firebase Authentication → Settings → Authorized domains.

**PWA assets:** after deployment, verify `/manifest.webmanifest` and `/sw.js` and `https://YOUR_FRONTEND_DOMAIN/api/health`; install and offline features only work where the browser supports them.

### Enable profile-photo upload

The backend service account needs Cloud Storage access to the Firebase Storage bucket. Confirm Firebase Storage is enabled in `spendly-ba3b0` and `FIREBASE_STORAGE_BUCKET` is correct. Firebase Storage may require billing to be enabled. No avatars are made public; `/api/user/avatar` requires the user’s Firebase ID token.

### Enable optional device push

On a trusted development machine run `npx web-push generate-vapid-keys`. Put the resulting **public and private VAPID keys in backend environment variables**:

```dotenv
VAPID_PUBLIC_KEY=GENERATED_PUBLIC_KEY
VAPID_PRIVATE_KEY=GENERATED_PRIVATE_KEY
PUSH_CONTACT_EMAIL=you@example.com
```

Do **not** add the private key to the frontend or GitHub. Redeploy the backend, then on a supported device open Profile → Notification preferences → Enable. This implementation uses the standard Web Push protocol (not Firebase Cloud Messaging) to share a single service worker safely with the PWA. It supports common Chrome, Firefox, Safari, and Edge push services when the platform supports Web Push. iOS requires a supported installed Home Screen web app for Web Push. Push permissions are requested only on button click; in-app alerts work even without them. Browser/platform limitations apply.

When changing VAPID keys, previously subscribed devices will need to subscribe again.

### Privacy and offline limits

The service worker **only precaches static assets**, and never stores authenticated API responses, Firebase credentials, transactions, budgets or profile photos. Expense changes are intentionally not queued offline. Firebase Auth may persist session information through its own SDK, outside service-worker Cache Storage.

### Important Vercel requirement

Frontend production and backend production are separate deployments. Backend changes to notifications, push and avatar routes require redeploying the **backend** too. Commit and push both updated directories; use Vercel to redeploy both projects.

## API additions

All listed paths are authenticated except `/api/health`:

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `GET/PUT /api/notifications/preferences`
- `GET /api/push/config`
- `POST /api/push/register`
- `DELETE /api/push/unregister`
- `GET /api/user/avatar` — private image bytes
- `POST /api/user/avatar` — multipart field `avatar`, up to 5 MB
- `DELETE /api/user/avatar`
- Existing `PUT /api/user/profile` now also accepts an editable `name` string.

Notification records: `users/{uid}/notifications/{id}`; preference document: `users/{uid}/settings/notifications`; device subscriptions: `users/{uid}/pushSubscriptions/{sha256-endpoint}`; avatar path in `users/{uid}.avatarPath`. No migration needed for existing expense data.

## Testing

Run `npm run test -w server` for budget logic and deterministic alert dedup tests, `npm run check -w server` for backend syntax, and `npm run build -w client` for production output.

**Verification limitations at handoff:** The JavaScript and JSX parser and relative-import checks passed; backend syntax and budget notification unit tests passed. `npm install` timed out in the build environment, so the Vite production build, live Firebase Storage upload and real device Web Push were **not** verified here. See `IMPLEMENTATION-NOTES.md` for required hands-on checks.

## Security notes

- Keep `server/.env`, `client/.env`, Admin JSON and VAPID **private** key out of GitHub.
- The app never caches user financial data in service-worker storage.
- Cloud Storage access and push notification permissions must be configured by the site owner.
- You are responsible for reviewing IAM, Firebase Auth authorized domains and billing before production use.
