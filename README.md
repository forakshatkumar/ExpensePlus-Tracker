# ExpensePlus — Savings Goal Achievement Patch

This patch adds persistent goal completion, a completed-goals counter, an Active/Completed filter, confirmation before status changes, and subtle achievement animations.

## Files to replace

Extract this archive over the root of your existing ExpensePlus repository, preserving the folder structure. It contains these replacement files:

- `client/src/pages/Savings.jsx`
- `client/src/styles/v31.css`
- `server/savingsRoutes.js`
- `server/test-savings-routes.mjs`

## What changed

- Added an explicit “I've achieved this goal” checkbox-style control to each goal.
- Added a confirmation modal before completing or restoring a goal.
- Added a Goals Achieved counter and Active / Completed filters.
- Completed goals remain in Firestore and can be restored to active status.
- Completion date is stored as `completedAt` and displayed on completed goal cards.
- Added a dedicated `PUT /api/savings/goals/:id/completion` endpoint.
- Completion updates are transactional and idempotent; they do not change balances, deposits, withdrawals, or allocations.
- Newly created goals are initialized with `completed: false` and `completedAt: null`.
- Existing goals without these fields are treated as active by the frontend.
- Added reduced-motion-aware checkmark and counter animations.

## Apply and run

1. Back up your current project.
2. Extract the patch into the project root and allow it to replace the four files listed above.
3. Run the backend tests from the server folder:

   ```bash
   node --test test-savings-routes.mjs
   ```

4. Start the backend and frontend using your existing project scripts.
5. Test completing a goal, refreshing the page, switching to Completed, restoring it, and checking that savings balances remain unchanged.

No Firebase collection migration or environment-variable change is required. The new fields are stored on the existing `savingsGoals` documents.
