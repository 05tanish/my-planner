# DevOS — Comprehensive Application Summary

This document provides a detailed breakdown of the DevOS application. It is designed to be used as context for an AI UI/UX designer to understand the scope, features, and data models of the app for a complete redesign.

---

## 1. Core Identity & Concept
**Name:** DevOS (Developer Operating System)  
**Purpose:** A unified productivity, learning, and career-tracking dashboard for software engineers. It replaces fragmented tools (Notion, Todoist, LeetCode trackers, GitHub spreadsheets) with a single, highly integrated platform.  
**Target Audience:** Software engineers, CS students, and job seekers who want to optimize their daily workflow, track interview prep, and maintain consistency.

## 2. Tech Stack
- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Lucide Icons, Recharts (for analytics graphs), `dnd-kit` (drag and drop), `@uiw/react-md-editor` (Markdown rendering).
- **Backend**: Node.js, Express, TypeScript, Prisma (ORM).
- **Database**: PostgreSQL (hosted on Neon).
- **Background Jobs**: `node-cron` for scheduling, Resend for email, Telegram Bot API for alerts.
- **State Management**: React Context, custom hooks, React Router DOM.

---

## 3. Global Navigation & Layout
The current application uses a standard dashboard layout:
- **Left Sidebar**: A vertical navigation menu containing links to all modules, grouped by category (Dashboard, Tasks, DSA, Career, Knowledge, Settings).
- **Top Header**: Often contains breadcrumbs, a user profile dropdown, and global quick-actions (e.g., global search).
- **Main Content Area**: A scrollable canvas for the active page content, heavily utilizing cards, grids, and tables.

---

## 4. Modules & Features Breakdown

### A. Dashboard & Analytics (`/`)
- **Overview Stats**: Quick summary of today's tasks, weekly coding hours, active applications, and current GitHub streak.
- **Activity Graph**: A visual representation of productivity (commits, tasks, DSA problems) over time, similar to GitHub's contribution graph.
- **Priority Widget**: A quick view of the top 3 active priorities in the execution queue.

### B. Planner & Tasks (`/planner`)
- **Task Management**: Daily, weekly, and monthly tasks. Includes title, description, priority (Low to Critical), due date, and status (Todo, In Progress, Done).
- **Queue Sync**: Tasks can be linked to larger "Priorities" (see below), automatically tracking progress when completed.

### C. Priority Execution Queue (`/priority`)
- **Goal Tracking**: Long-term goals broken down by estimated hours.
- **Kanban-style/List View**: Users can drag and drop priorities to reorder them.
- **Time Allocation**: Users allocate "daily hours" to a priority. The system calculates an "Estimated Deadline" (e.g., 2 weeks left).
- **Automated Sync**: Checking off linked tasks in the Planner automatically increments the progress bar of the priority.

### D. DSA Tracker (`/dsa`)
- **Problem Log**: Tracks LeetCode, GFG, and Codeforces problems. Records difficulty, tags, time taken, solution code, and mistakes.
- **Spaced Repetition**: A built-in revision engine that schedules reviews for difficult problems (1, 3, 7, 15 days out) to ensure long-term retention.
- **Daily Goals**: Tracking how many problems were solved today vs. the daily goal.

### E. DSA Concepts (`/dsa-concepts`)
- **Snippet Vault**: A repository for learning patterns, algorithms, and code snippets.
- **Rich Media**: Supports full Markdown notes, syntax-highlighted code blocks, and multiple external resource links (YouTube, Docs).
- **Categorization**: Filterable by tags, difficulty, and language.

### F. Career Hub
- **Jobs (`/jobs`)**: An application tracker (Applied, Interviewing, Offered, Rejected) with notes, salary expectations, and company links.
- **Interviews (`/interviews`)**: Tracks specific interview rounds, questions asked, feedback, and outcomes.
- **Opportunities & Hackathons (`/opportunities`, `/hackathons`)**: Tracking pipelines for networking, open-source programs, and hackathon projects.
- **Placement Prep (`/placement`)**: A dedicated view tying together DSA stats, interview readiness, and resume versions.

### G. Knowledge & Resources
- **Notes (`/notes`)**: Markdown-based note-taking system organized in folders.
- **Resources (`/resources`)**: A bookmark manager for courses, blogs, and tutorials.
- **Books (`/books`)**: A library tracker for reading progress on technical books.
- **GitHub Sync (`/github`)**: Connects to the GitHub API to fetch commit history and repositories, mapping them to productivity stats.

### H. Notifications & Alerts
- **Telegram Bot**: Users can link their Telegram account to receive instant pings for Critical tasks, missing their GitHub daily streak, or daily DSA revision reminders.
- **Email Reports**: A daily cron job runs at midnight and sends a beautiful HTML summary of the day's productivity to the user's email via Resend.

---

## 5. UI/UX Redesign Goals
For the AI generating the new design system, consider the following constraints and desires:
1. **Density & Information Architecture**: DevOS holds *a lot* of data. The new UI must handle high data density without feeling cluttered. Think linear.app or Superhuman.
2. **Dynamic & Premium Feel**: The user prefers modern aesthetics—glassmorphism, subtle micro-animations, vibrant accents on dark/sleek backgrounds, and interactive hover states.
3. **Responsive Typography**: Use modern, clean fonts (Inter, Geist, or Outfit) to ensure readability across complex tables and markdown notes.
4. **Unified Design Language**: Currently, features were built iteratively. The redesign should unify the visual language of badges, cards, modals, and forms across all 15+ modules.
