# DevOS — Codebase & UI/UX Design Specification

This document provides a highly detailed breakdown of the DevOS (Developer Operating System) codebase, architecture, data schemas, API routes, and page-by-page feature specs. Feed this document directly to any AI model (e.g. Claude 3.5 Sonnet, GPT-4o) to generate a complete visual system redesign, Tailwind CSS styles, wireframes, or high-fidelity mockup instructions.

---

## 1. High-Level Concept & Design Objectives

### Product Pitch
**DevOS** is a unified, productivity, learning, and career-tracking dashboard custom-tailored for software engineers. It integrates task planning (Trello/Todoist), algorithm practice trackers (LeetCode/GFG), concept notes (Notion/Obsidian), job application tracking (Huntr), and real-time developer statistics (GitHub, coding time) into a single cockpit.

### UX Design Goals for Redesign
1. **Information Density & Clarity**: The app manages complex structures (code snippets, recursive lists, job statuses, revision calendars). The design must feel clean, avoiding clutter while remaining dense enough for power users.
2. **"Developer Cockpit" Aesthetic**: A premium, state-of-the-art dark theme by default, featuring deep indigo/charcoal backgrounds, glassmorphism card panels (`backdrop-filter`), vibrant glow accents (emerald for success, violet/indigo for primary branding, rose for errors), and elegant monospace stats.
3. **Smooth Transitions & Micro-Animations**: Implement micro-interactions for checkboxes, drag-and-drop lists, and progress bars.
4. **Universal Design Consistency**: Consolidate cards, status badges, forms, and markdown renderers into a unified, reusable component library.

---

## 2. Directory & Routing Architecture

### Project Layout (Monorepo)
```
personalplace/
├── backend/
│   ├── prisma/             # Schema, migrations, seeding scripts
│   └── src/
│       ├── config/         # DB connection, Env loading, server setup
│       ├── middleware/     # Auth checks, file upload
│       ├── jobs/           # Scheduled crons (DailyReset, DailyReport, Syncs)
│       ├── services/       # Email (Resend), Telegram, Storage (Supabase)
│       └── modules/        # Feature modules (controller, routes, service)
├── frontend/
│   ├── src/
│   │   ├── components/     # UI elements (buttons, inputs, select, dialog)
│   │   ├── lib/            # Axios API config, general utilities
│   │   ├── pages/          # App views (Dashboard, PriorityPage, DSA, Jobs, etc.)
│   │   └── stores/         # State management (authStore)
│   └── index.html
```

### Frontend Routes (`frontend/src/App.tsx`)
- `/login` & `/register` — Authentication access portals.
- `/` — Core Dashboard/Overview (GitHub commit calendars, priority widgets, task count).
- `/planner` — Drag-and-drop tasks grouped by Daily, Weekly, and Monthly logs.
- `/priority` — Queue-based execution tracking, priority list, and estimated time left.
- `/dsa` — LeetCode, GFG sync trackers, spaced repetition revision calendars.
- `/dsa-concepts` — Cheatsheets, algorithms, markdown notes, code snippet editor.
- `/jobs` — Job application funnel stages (Applied, Interviewing, Offered, Rejected).
- `/interviews` — Logs of technical interviews, rounds, questions asked, and feedback.
- `/notes` — Clean markdown writing workspace for documentation.
- `/opportunities` & `/hackathons` — Networking events and developer competitions.
- `/github` — Integration status page, repository streams.
- `/settings` — Profile settings, Telegram PIN linking, notifications config.

---

## 3. Database Schema Breakdown (Prisma Models)

The PostgreSQL schema (`backend/prisma/schema.prisma`) contains the following core data models.

### User & Authentication
- **`User`**: Contains authentication fields (`email`, `password` (bcrypt/development-bypass), `role` (USER/ADMIN), verification tokens). Relates 1-to-1 to a Profile and 1-to-many with all module tables.
- **`Profile`**: User metadata (`name`, `avatarUrl`, `logoUrl`, `bio`, social handles, external usernames: `leetcodeUsername`, `gfgUsername`). Also maintains notification controls (`notifEmail`, `notifTelegram`, `telegramChatId`).

### Productivity & Planning
- **`Task`**: Standard plan items. Properties: `title`, `description`, `type` (`DAILY` / `WEEKLY` / `MONTHLY`), `priority` (`LOW` / `MEDIUM` / `HIGH` / `CRITICAL`), `status` (`TODO` / `IN_PROGRESS` / `DONE`), `dueDate`, and `priorityId` (optional link to execution queue).
- **`Priority`**: Long-term milestones queue. Properties: `title`, `description`, `status` (`NOT_STARTED` / `IN_PROGRESS` / `COMPLETED` / `HOLD`), `estimatedTotalHours`, `hoursCompleted`, `progress` (calculated automatically), `dailyHoursAlloc`, `queuePosition`, and target `deadline`. Has a 1-to-many relationship with `Task`.

### LeetCode / DSA Practice
- **`DsaProblem`**: Coding question entries. Properties: `title`, `link`, `platform` (`LEETCODE` / `GFG`), `difficulty` (`EASY` / `MEDIUM` / `HARD`), `tags`, `timeTaken` (minutes), `codeSnippet`, `myNotes`, `createdAt`.
- **`DsaConcept`**: Algorithm reference sheet. Properties: `topicName`, `category` (Arrays, Trees, Graphs, etc.), `shortDescription`, `detailedNotes` (Markdown format), `codeSnippet`, `language` (C++, Python, etc.), difficulty, tags, links (YouTube, LeetCode, GFG), and favorite star boolean.

### Career Modules
- **`Job`**: Employment tracking cards. Properties: `companyName`, `role`, `status` (`WISHLIST` / `APPLIED` / `ONLINE_ASSESSMENT` / `INTERVIEWING` / `OFFER` / `REJECTED`), `location`, `salary`, `jobDescription`, `url`, `notes`, `appliedDate`.
- **`InterviewQuestion`**: Logs of actual interview queries. Properties: `company`, `role`, `question`, `topic`, `difficulty`, `solutionCode`, `myAnswerStatus`, `roundInfo`, `feedback`.

---

## 4. Backend Modules & API Endpoints

### 🔑 Authentication (`/api/auth`)
- `POST /register` — Sign up new developers.
- `POST /login` — Issues a JWT. *Supports developer bypass with password `dev123` on local environments.*

### 👤 Profile & Config (`/api/profile`)
- `GET /` & `PATCH /` — Get and update personal profile fields, custom avatar logos, and toggle alerts.
- `POST /telegram-link-pin` — Generates a secure, 15-minute PIN for the user to link their Telegram Chat ID via bot commands.
- `POST /trigger-report` — Admin/User quick trigger to manually compile and fire both Email and Telegram reports.

### 📅 Tasks Planner (`/api/planner`)
- `GET /` & `POST /` — CRUD operations on tasks.
- `PATCH /:id` — Updates task properties (e.g. marking a task as `DONE` instantly triggers the `Priority` progress sync on the backend).

### 🚀 Priorities Queue (`/api/priorities`)
- `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id` — CRUD operations. Reordering priorities automatically triggers a queue-repositioning swap logic.
- Setting target deadlines calculates and displays a remaining time badge (`X days left` or `Overdue`).

### 💻 DSA Modules (`/api/dsa` & `/api/dsa-concepts`)
- CRUD endpoints for logging coding problems and tracking spaced repetition revisions.
- Scraper endpoints that ping custom scraping scripts to check LeetCode and GFG total problem completions.

---

## 5. Integrations & Real-Time Sync Logic

### A. Telegram Bot Service (`backend/src/services/telegram.service.ts`)
- **Interactive Bot**: Operates via `node-telegram-bot-api` using webhook or long-polling.
- **Link Account**: Users link accounts by sending `/link <PIN>` to the bot.
- **Urgent Alerts**: When a Critical task is created or a Priority queue deadline approaches, it fires a push ping.
- **Daily Summaries**: Delivers formatted summaries of tasks and priority percentages.

### B. Daily Report Email Scheduler (`backend/src/jobs/dailyReport.job.ts`)
- **Cron Trigger**: Runs precisely at Midnight (`0 0 * * *`) every day.
- **Aggregation Engine**: Queries database snapshots for the user's daily metrics (completed tasks, commits, jobs applied) and active top 3 priorities.
- **HTML Briefing**: Sends a clean, modern, gradient-accented email report via **Resend** (using `EMAIL_FROM` configuration).

---

## 6. Page-by-Page Feature & UI Redesign Prompts

### 1. Dashboard Overview Redesign
- **Core Elements**: High-priority checklist widget, active priority progress tracker cards, GitHub streak indicators, and weekly productivity charts.
- **Redesign Goal**: Create a grid-based dashboard using cards with subtle transparent borders (`border-white/10` on dark glassmorphism). Display stats as big bold monospace numbers, accompanied by minimal sparkline charts for activity visualization.

### 2. Planner Page Redesign
- **Core Elements**: Columns for Daily Tasks, Weekly Goals, and Monthly Logs. Quick task creation forms, select inputs for Priority (Low to Critical) and linked priorities.
- **Redesign Goal**: Create a clean, multi-column kanban board layout. Cards should use subtle indicators for priority (e.g. glowing red side-border for Critical, amber for High). Add toggle buttons to easily shift items between columns.

### 3. Priority Execution Queue Redesign
- **Core Elements**: Draggable queue items. Cards show progress bars, target deadlines (X days left), allocated daily hours, and estimated weeks remaining. Actions: Requeue, Pause, Complete.
- **Redesign Goal**: A linear stack layout resembling queue systems (like Linear or Linear-App queue). Drag handles should feel tactile. Progress bars should have smooth transitions, changing colors from purple to green as they approach completion.

### 4. DSA Concept Vault Redesign
- **Core Elements**: Filters for Category, Tags, Language, and Search. Cards with syntax-highlighted code blocks, toggleable favorites (Stars), and detailed Markdown content renderers.
- **Redesign Goal**: A dual-panel dashboard. The left panel shows the list of concepts with categorization metadata (Difficulty, Category, Favorite status). Clicking a concept opens a full-screen or half-panel details view on the right, featuring a high-contrast code IDE snippet display and a clean typography layout for Markdown notes.

### 5. Career Hub & Job Funnel Redesign
- **Core Elements**: Job card items with application statuses, company name, salary range, links, and log of interviews.
- **Redesign Goal**: Implement a modern horizontal Kanban board (Wishlist, Applied, OA, Interviewing, Offer, Rejected). Each card must clearly summarize upcoming events (e.g., "Round 2 on Tuesday") and allow quick drags to update statuses.
