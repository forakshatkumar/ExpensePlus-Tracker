# ExpensePlus 3.1

**Track smarter. Spend wiser. Save for what matters.**

ExpensePlus is a modern personal-finance PWA built with React, Tailwind CSS, Express and Firebase. Track spending, manage budgets and build savings habits through a focused, mobile-friendly experience.

[**Live application**](https://expense-plus-pi-gray.vercel.app)

### Highlights

- Google authentication with user-scoped financial records
- Expense tracking, categories, filters and financial analytics
- Monthly budgets, notifications and no-spend streaks
- **Savings Hub:** cumulative deposits, withdrawals, monthly history and personal savings goals
- Four themes with light/dark appearance settings
- Responsive desktop, tablet and mobile experience, installable as a PWA

### Development

```bash
cd client && npm install && npm run dev
# In a separate terminal:
cd server && npm install && npm run dev
```

Set up your Firebase and API environment variables using the `.env.example` files. Keep credentials private.

### Deployment and testing

ExpensePlus uses separate Vercel frontend and Express API projects. For this update, **deploy both projects**. See [V31-DEPLOY-GUIDE.md](V31-DEPLOY-GUIDE.md) and [release notes](V31-RELEASE-NOTES.md).

Made by [Akshat Kumar](https://github.com/forakshatkumar). Publicly usable as a personal portfolio project.
