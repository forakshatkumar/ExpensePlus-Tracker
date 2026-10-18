# ExpensePlus

**Track smarter. Spend wiser.**

ExpensePlus is a full-stack personal finance web app that helps you track expenses, manage budgets, and understand spending habits—all in one place. Built as an installable Progressive Web App (PWA), it works across desktop and mobile.

**[Live App](https://expense-plus-pi-gray.vercel.app)**

## Features

- Google sign-in and private, account-specific financial data
- Expense tracking with categories and transaction history
- Interactive dashboard and spending analytics
- Monthly budgets and spending alerts
- No-spend streaks, achievements, and financial highlights
- Editable profile, appearance preferences, and PWA installation
- Responsive interface with light and dark modes

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS  
**Backend:** Node.js, Express.js  
**Authentication & Database:** Firebase Authentication, Cloud Firestore  
**Deployment:** Vercel

## Run Locally

```bash
npm install
cp client/.env.example client/.env
cp server/.env.example server/.env
npm run dev
```

Configure the Firebase environment variables in both `.env` files before starting. Never commit Firebase Admin credentials or other secrets.

## Author

Developed by **[Akshat Kumar](https://github.com/forakshatkumar)**.

_ExpensePlus is a personal portfolio project, publicly available for anyone to use._
