================================================================================
ExpensePlus 3.2 — UX Refinements & Monthly Financial Views
Update Package & Release Notes
================================================================================

This package contains ONLY the modified files for ExpensePlus version 3.2.
It preserves your existing architecture, Firebase authentication, Firestore
database schema, Express server backend, and Vercel deployment setup.

--------------------------------------------------------------------------------
1. CHANGED & ADDED FILES
--------------------------------------------------------------------------------

ExpensePlus-3.2-Update/
  client/
    src/
      components/
        layout/
          AppLayout.jsx     (Updated notify() to assign timestamps so duplicate/consecutive
                             notifications reset dismissal timers accurately)
        ui/
          Toast.jsx         (Added automatic dismissal: ~3s for success, ~4.5s for error,
                             supports manual dismiss, timer reset, unmount cleanup)
      lib/
        format.js           (Added formatMonthYear helper for timezone-safe YYYY-MM formatting)
      pages/
        Analytics.jsx       (Updated "The big picture" spending bar chart to aggregate monthly
                             totals chronologically from transaction dates, with dynamic year
                             labels and monthly tooltips)
        History.jsx         (Implemented monthly-grouped spending log with month headers,
                             monthly spending totals, newest-first chronological sort,
                             and transaction sorting within each month)
        Savings.jsx         (Implemented compact savings goals display showing max 3 cards
                             plus "View More" option, dedicated full Savings Goals view with
                             responsive 3-col desktop / 2-col tablet / 1-col mobile grid,
                             remaining amounts, and monthly-wise savings history with totals
                             distinguishing deposits and withdrawals)
      styles/
        v31.css             (Added styles for monthly transaction groups, monthly savings
                             history headers & tags, and dedicated goals grid layout)
  README.txt                (This update guide)

--------------------------------------------------------------------------------
2. COMPLETED FEATURES & UX REFINEMENTS
--------------------------------------------------------------------------------

UPDATE 1: Automatic Dismissal of Notifications & Popups
- Success notifications (expense added/deleted, savings added/withdrawn, goals created/updated)
  automatically dismiss after 3 seconds.
- Important error notifications automatically dismiss after 4.5 seconds.
- Users can manually dismiss notifications at any time via the close (X) button.
- Timers reset immediately when a notification is updated or replaced.
- Cleanup occurs cleanly when components unmount, preventing memory leaks.
- Does not affect dialogs, modal forms, or confirmation alerts.

UPDATE 2: Monthly-wise Spending Log in Transactions
- Groups all transactions by their actual transaction date (YYYY-MM), not database creation date.
- Displays clear month headings ("November 2026", "October 2026", etc.).
- Displays monthly spending total directly next to each month heading.
- Months are sorted in descending chronological order (newest first).
- Transactions within each month are sorted by date (newest first).
- Retains existing search query, category filter, month filter, and sort options.
- Preserves all category icons, payment details, notes, edit, and delete actions.

UPDATE 3: Savings Goals Compact Display & Dedicated "View More" Page
- Main Savings page displays up to 3 savings goal cards.
- When more than 3 goals exist, only the first 3 are shown, followed by a clear "View More (N Goals)" button.
- Clicking "View More" opens a dedicated Savings Goals view showing all goals.
- Responsive layout: exactly 3 cards per row on desktop, 2 columns on tablet, 1 column on mobile.
- Goal cards display goal name, target amount, saved amount, remaining amount, and progress bar.
- Full goal actions supported: Allocate, Release, Edit, and Archive.
- Includes a clear "Back to Savings" button returning to the main view.
- Strictly maintained as a local feature view: NOT added to sidebar, main nav, mobile drawer,
  or public routes.

UPDATE 4: Monthly-wise Savings History
- Groups savings history by the effective date of each savings operation.
- Displays month headings ("November 2026", "October 2026", etc.).
- Shows relevant monthly totals: total deposits (+), total withdrawals (−), and net change.
- Clearly distinguishes deposits (green indicator & icon) and withdrawals (terracotta indicator & icon).
- Shows date, description, operation badge ("Deposit" / "Withdrawal"), and amount.
- Sorts months newest first; sorts entries within each month newest first.
- Goal allocations remain movements within savings and are not counted as new deposits.
- Updates automatically upon adding a deposit or recording a withdrawal.

UPDATE 5: Monthly Spending Insights Bar Chart
- Aggregates all expenses within each calendar month using actual transaction dates.
- Displays months in chronological order from oldest to newest.
- Provides clear month labels (e.g., Jan, Feb, Mar; includes 2-digit year when spanning multiple years).
- Hover or tap on any bar reveals the exact monthly total spending.
- Uses existing Chart.js configuration, themes (light and dark mode support), and responsive sizing.
- Handles empty states gracefully.

--------------------------------------------------------------------------------
3. DATABASE & ENVIRONMENT CHANGES
--------------------------------------------------------------------------------
- NO database schema changes or migrations required.
- NO new environment variables required.
- Fully compatible with existing Firestore collections and security rules.

--------------------------------------------------------------------------------
4. DEPENDENCY CHANGES
--------------------------------------------------------------------------------
- NO new dependencies introduced.
- Uses the existing packages already installed in your project:
  React 19, Lucide React, Chart.js, react-chartjs-2, Tailwind CSS.

--------------------------------------------------------------------------------
5. HOW TO APPLY THIS UPDATE SAFELY
--------------------------------------------------------------------------------
Step 1: Create a backup of your existing project directory.

Step 2: Copy the contents of this "ExpensePlus-3.2-Update" folder directly over
        your existing "ExpensePlus-Tracker" root directory, allowing file
        replacement:

        - client/src/components/layout/AppLayout.jsx
        - client/src/components/ui/Toast.jsx
        - client/src/lib/format.js
        - client/src/pages/Analytics.jsx
        - client/src/pages/History.jsx
        - client/src/pages/Savings.jsx
        - client/src/styles/v31.css

Step 3: Run the build command to verify:
        npm run build -w client

Step 4: Run the test suite:
        npm test -w server

Step 5: Deploy as usual (e.g., Vercel, Node server).
================================================================================
