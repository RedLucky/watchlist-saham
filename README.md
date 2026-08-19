# 👑 Alpha Legend - IDX Watchlist

A smart web-based application designed to monitor, analyze, and screen stocks on the Indonesia Stock Exchange (IDX) using the methodologies of world-renowned legendary investors. This application is built to empower retail investors in making empirical data-driven decisions, managing their portfolios, and planning for early retirement (FIRE).

## ✨ Key Features

- **🔍 Alpha Legends Screener:** Automatically screen stocks using 10 legendary formulas (Warren Buffett, Peter Lynch, Ben Graham, Joel Greenblatt, etc).
- **💼 Portfolio & Transactions:** Track your asset values in real-time, calculate your Average Price, and monitor your portfolio growth performance.
- **📈 Market Movers & Technicals:** Keep an eye on the IDX Composite (IHSG) index movements, top gainers, top losers, and industrial sector performance.
- **🏖️ Pension Calculator (FIRE):** Simulate your retirement targets using a combination of Government Bonds (SBN) and Stocks, complete with a monthly stock lot purchasing guide.
- **🔐 High-Level Security:** Equipped with a custom Edge-compatible JWT authentication, Next.js Middleware route protection, and user data privacy compliance.

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Backend:** Next.js Route Handlers (API), Edge Middleware
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT (JSON Web Tokens) using Web Crypto API
- **Deployment:** Vercel & Neon.tech (Recommended)

---

## 🚀 Local Development Setup

Follow the steps below to run this application on your local machine.

### 1. System Requirements
- [Node.js](https://nodejs.org/) (Version 18 or newer)
- [Docker Desktop](https://www.docker.com/) (To run PostgreSQL locally)

### 2. Clone and Install
```bash
# Clone the repository (if using git)
git clone https://github.com/username/watchlist-saham.git
cd watchlist-saham

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory of your project and populate it with the following variables:
```env
# Connection to the local PostgreSQL database (via Docker)
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/watchlist?schema=public"

# Secret key for JWT Token (Use a strong random string)
JWT_SECRET="YourSuperSecretRandomStringHere123!@#"

# (Optional) Google Analytics Measurement ID
NEXT_PUBLIC_GA_ID=""
```

### 4. Running the Database (Docker)
Ensure Docker Desktop is running, then execute the following command to spin up the local PostgreSQL container:
```bash
docker-compose up -d db
```

### 5. Database Schema Synchronization (Prisma)
Once the database is running, generate the Prisma client and push the schema to create the tables:
```bash
npx prisma generate
npx prisma db push
```

### 6. Run the Application
```bash
npm run dev
```
The application can now be accessed via your browser at: [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deployment Guide (Go-Live for Free)

This application is highly optimized to run in Vercel's Serverless environment.

1. **Database:** Create a free PostgreSQL database on [Neon.tech](https://neon.tech).
2. **Repository:** Push this source code to a GitHub repository.
3. **Vercel:** 
   - Connect your GitHub repository to Vercel.
   - Add the `DATABASE_URL` (from Neon) and your `JWT_SECRET` into the **Environment Variables** section in your Vercel project settings.
   - Override the **Build Command** in Vercel to: `npx prisma generate && npx prisma db push && next build`.
   - Click **Deploy**.

---

## 📜 Legal Disclaimer
This application functions strictly as a mathematical calculation and analytical tool. **It is NOT Financial Advice.** Any material losses incurred in the capital market resulting from the use of this application are the sole responsibility of the user. We never encourage or instruct users to buy or sell specific stocks.

---
*Built for the future Alpha Legends of the Indonesia Stock Exchange.* 🇮🇩
