# Category name display fix

- Loads GET /api/categories once in AppLayout with other profile data.
- Shares the server-returned `{ id, name, emoji }` list with History, Dashboard, Budgets, Analytics and the expense form.
- Resolves category names and emojis through `client/src/lib/format.js`.
- Prevents Firestore document IDs from appearing on screen and in History CSV exports.
- Automatically refreshes the categories list when creating a new category.
- If category retrieval fails or a category has been deleted, shows `Custom category` instead of an opaque ID.
- Does not change existing Firestore documents or the backend schema.

## Deploy

Replace the files in your existing repo with the files in this ZIP while keeping its `.git` folder; run `git add . && git commit -m "Fix custom category display" && git push`. Vercel must redeploy the **frontend** (Root Directory `client`). The existing backend stays unchanged.
