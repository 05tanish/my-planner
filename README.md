# DevOS - Personal Engineering Workspace & Planner

> [!NOTE]
> **Internal Personal Productivity Workspace**  
> This is a custom-built, internal tool that I created for my personal use to organize, manage, and plan my daily engineering work. I use it to keep track of tasks, schedule DSA revision problems, maintain learning journals, log job applications, and run interactive command controls via my personal Telegram bot. Having used this locally for some time, this repository serves as my official backup template and deployment guide.

DevOS is a flat-dark styled personal developer cockpit designed to track tasks, organize notes, master Data Structures & Algorithms (DSA) through spaced repetition, read engineering books, track job applications, and sync with GitHub activities—all unified with a secure Telegram Bot integration.

---

## 🚀 Key Features

*   **Integrated Developer Dashboard**: Custom grid layout detailing productivity logs, DSA stats, tasks, job application pipelines, and GitHub activity feeds.
*   **Robust Imported Notes Parser**: Parse exported HTML notes (e.g. from Notion) with support for tags, links, nested formats, code blocks, lists, and images.
*   **DSA Practice Tracker**: Revision scheduling based on spaced repetition (Days 1, 3, 7, 15, 30, 60, 90), topic tagging, and live syncing for LeetCode/GeeksforGeeks profiles.
*   **EPUB, PDF & TXT Reader**: Custom inline reader featuring paginated scrolling, keyword search, and reading progress retention.
*   **Job Application Tracker**: Drag-and-drop or pipeline list tracker supporting Wishlist, Applied, Online Assessment (OA), Interview, Rejected, and Offer states.
*   **Secure Telegram Bot Integration**:
    *   **Secure Linking**: Generated 6-digit verification PINs to associate chats safely.
    *   **Interactive Menu**: Rich bot keyboard featuring inline actions.
    *   **Conversational Flows**: Create tasks, notes, or log job updates using interactive multi-step prompts.
    *   **System Controls**: `/dsadone`, `/dsastatus`, `/ghstatus`, `/ghcommits`, and `/me` commands.
*   **Premium Flat Dark Design**: Built with high contrast charcoal/slate backgrounds (zinc palette), solid inputs, custom scrollbars, and fluid layout transitions—completely gradient/neon/glassmorphism free.

---

## 📂 Project Architecture

```
personalplace/
├── backend/            # Express.js & TypeScript API Server
│   ├── prisma/         # Database schemas & migrations
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       └── services/   # Telegram, Scraping, Notes Parsing Services
├── frontend/           # React, Vite, Tailwind CSS, & Zustand Client
│   └── src/
│       ├── components/ # Custom components (Topbar, Sidebar, Reader)
│       ├── pages/      # Dashboard, DSA, Books, Notes, Jobs, Settings
│       └── stores/     # Client global states
├── docker-compose.yml  # Docker environment setup
└── package.json        # Workspace orchestrator script
```

---

## 🛠️ Setup & Local Installation

### Prerequisites
*   Node.js (v18+)
*   npm or Yarn
*   PostgreSQL Database instance (local or hosted e.g. Neon, Supabase)

### 1. Environment Configuration

Create a `.env` file in the **root** folder (you can base it off `.env.example`):

```env
# Database Settings
DATABASE_URL="postgresql://user:password@localhost:5432/devos?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/devos?schema=public"

# Auth Secret
JWT_SECRET="YOUR_RANDOM_LONG_SECRET_KEY"

# Telegram Bot
TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_API_TOKEN"

# Optional Third-Party Services
RESEND_API_KEY="re_..."
EMAIL_FROM="DevOS Planner <noreply@yourdomain.com>"
```

### 2. Install Dependencies

In the root folder, run:
```bash
npm install
```

### 3. Setup Database (Prisma)

Generate client and push schemas to your database:
```bash
cd backend
npx prisma generate
npx prisma db push
```

### 4. Running the App

To run both backend and frontend servers in development mode concurrently:
```bash
# From the root directory
npm run dev
```

*   **Frontend Client**: [http://localhost:5173](http://localhost:5173)
*   **Backend API**: [http://localhost:4000](http://localhost:4000)

---

## 🐳 Docker Deployment

To spin up the entire setup (database, backend, frontend, nginx) locally using Docker:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

---

## ☁️ Real World Deployment Guide

### Database Hosting
We recommend using serverless PostgreSQL providers like **Neon** or **Supabase** to obtain your `DATABASE_URL` and `DIRECT_URL`.

### 1. Backend Deployment (Railway / Render)

#### Deploying on Railway
1. Sign in to [Railway.app](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repository**.
3. Select your repository.
4. Set the **Root Directory** to `backend`.
5. Add the necessary Environment Variables:
   * `DATABASE_URL`, `DIRECT_URL`
   * `JWT_SECRET`
   * `TELEGRAM_BOT_TOKEN`
   * `PORT` (usually set automatically by Railway, typically `8080` or `4000`)
6. In Settings, configure the **Start Command**:
   ```bash
   npx prisma db push && npm run build && npm start
   ```

---

### 2. Frontend Deployment (Vercel)

Vercel is the ideal option for hosting the React Vite static app.

1. Go to [Vercel](https://vercel.com).
2. Import your GitHub project.
3. Configure the Project Settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `frontend`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Add the Frontend Environment Variables:
   * `VITE_API_URL`: Your deployed backend URL (e.g. `https://your-backend.up.railway.app`)
5. Click **Deploy**.

#### Vercel Rewrite Configuration
If using client-side React Router navigation, add a `vercel.json` inside the `frontend/` directory to prevent `404` errors on routing refreshes:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 🔒 Security Best Practices

1. **Telegram Webhooks**: In production, switch the Telegram bot polling to a secure webhook route for improved security and latency.
2. **Helmet Protections**: Keep CSP headers enabled. Set `cors` rules restricted to your deployed frontend domain.
3. **Upload File Scans**: Validate MIME types strictly in `upload.middleware.ts` to block executing scripts.
