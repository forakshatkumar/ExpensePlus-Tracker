# ExpensePlus ✦

### Track smarter. Spend wiser.

**A modern, full-stack expense tracker designed to make everyday money management simple, insightful, and enjoyable.**

🌐 **[Live Website](https://expenseplus.vercel.app/)**

---

## ✨ About ExpensePlus

**ExpensePlus** is a responsive personal finance web application that helps users track their expenses, analyze spending patterns, manage monthly budgets, and build healthier financial habits.

Designed with a **Warm Playful Editorial** aesthetic, ExpensePlus combines modern UI/UX principles with practical financial tools to deliver a clean and intuitive experience across desktop, tablet, and mobile devices.

The application uses React for the frontend, Node.js and Express for the backend, and Firebase for authentication and data storage.

---

## 🚀 Features

### 📊 Interactive Dashboard

- Monthly spending overview.
- Budget utilization and remaining balance.
- Recent transaction history.
- Category-wise spending breakdown.
- No-spend streak tracking.
- Responsive financial summary cards.

### 💸 Expense Management

- Add, edit, and delete expenses.
- Categorize transactions.
- Create personalized categories with emojis.
- Record transaction dates and optional notes.
- Search, filter, and sort transaction history.
- Export transactions as CSV.

### 📈 Spending Analytics

- Interactive charts using Chart.js.
- Category-wise spending distribution.
- Six-month expense comparison.
- Daily spending trends.
- Monthly spending insights.
- Identification of highest spending categories.

### 🎯 Budget Management

- Set personalized monthly budgets.
- Track budget utilization.
- View remaining monthly balance.
- Monitor spending by category.
- Receive contextual budget warnings.

### 🔥 No-Spend Streaks

- Track spending-free days.
- Complete daily check-ins.
- Unlock milestone badges.
- Monitor current and longest streaks.
- View activity history.

### 👤 User Profile

- Google account integration.
- Editable profile details.
- Profile picture and bio.
- Financial activity summary.
- Dark and light appearance options.
- Secure account sign-out.

### 📱 Responsive UI

- Collapsible sidebar for desktop.
- Compact expandable sidebar for tablets.
- Slide-out navigation drawer for mobile.
- Responsive Add Expense modal and bottom sheet.
- Smooth animations and reusable UI components.

---

## 🛠️ Tech Stack

| Technology              | Purpose                         |
| ----------------------- | ------------------------------- |
| React.js                | Frontend development            |
| Vite                    | Frontend tooling                |
| Tailwind CSS            | Styling                         |
| React Router            | Client-side routing             |
| Chart.js                | Spending visualizations         |
| Node.js                 | Backend runtime                 |
| Express.js              | REST API                        |
| Firebase Authentication | Google Sign-In                  |
| Cloud Firestore         | Database                        |
| Firebase Admin SDK      | Secure backend operations       |
| Vercel                  | Frontend and backend deployment |

---

## 📁 Project Structure

```text
ExpensePlus/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── expenses/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── context/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vercel.json
│
├── server/
│   ├── server.js
│   └── package.json
│
├── README.md
└── package.json
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have:

- Node.js 20 or later.
- npm.
- A Firebase project.
- Google Authentication enabled in Firebase.
- Cloud Firestore enabled.

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

Replace the placeholders with your GitHub repository details.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Frontend Environment Variables

Create a `.env` file inside the `client` directory.

```env
VITE_API_URL=http://localhost:4000

VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

### 4. Configure Backend Environment Variables

Create a `.env` file inside the `server` directory.

```env
PORT=4000
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
APP_TIME_ZONE=Asia/Kolkata
CLIENT_ORIGIN=http://localhost:5173
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

Keep Firebase Admin credentials private.

### 5. Run the Application

From the project root:

```bash
npm run dev
```

Frontend:

http://localhost:5173

Backend health endpoint:

http://localhost:400
