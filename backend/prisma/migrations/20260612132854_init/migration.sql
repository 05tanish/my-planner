-- CreateEnum
CREATE TYPE "DsaPlatform" AS ENUM ('LEETCODE', 'GFG', 'CODEFORCES', 'CODECHEF', 'HACKERRANK');

-- CreateEnum
CREATE TYPE "DsaDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "DsaTopic" AS ENUM ('ARRAYS', 'STRINGS', 'HASHING', 'LINKED_LIST', 'STACK', 'QUEUE', 'TREE', 'BST', 'HEAP', 'GRAPH', 'DP', 'GREEDY', 'BACKTRACKING', 'TRIE', 'SEGMENT_TREE', 'BINARY_SEARCH', 'SLIDING_WINDOW', 'TWO_POINTERS');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskScope" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('DSA', 'SYSTEM_DESIGN', 'BACKEND_LEARNING', 'GITHUB_PUSH', 'JOB_APPLICATION', 'BOOK_READING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('WISHLIST', 'APPLIED', 'OA', 'INTERVIEW', 'REJECTED', 'OFFER', 'SELECTED');

-- CreateEnum
CREATE TYPE "LearningCategory" AS ENUM ('BACKEND', 'DEVOPS', 'BLOCKCHAIN', 'AUTOMATION', 'SYSTEM_DESIGN', 'AI');

-- CreateEnum
CREATE TYPE "LearningResourceType" AS ENUM ('NOTE', 'VIDEO', 'ARTICLE', 'PDF', 'IMAGE', 'CHEAT_SHEET', 'PROJECT', 'ROADMAP');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('YOUTUBE', 'WEBSITE', 'PDF', 'IMAGE', 'COURSE', 'PLAYLIST', 'BLOG', 'DOCUMENTATION', 'CHEAT_SHEET');

-- CreateEnum
CREATE TYPE "PlacementSection" AS ENUM ('DBMS', 'OS', 'CN', 'OOP', 'SYSTEM_DESIGN', 'APTITUDE', 'QUANT', 'REASONING', 'VERBAL', 'HR', 'INTERVIEW_EXPERIENCE');

-- CreateEnum
CREATE TYPE "PlacementResourceType" AS ENUM ('NOTE', 'PDF', 'IMAGE', 'FLASHCARD', 'IMPORTANT_QUESTION');

-- CreateEnum
CREATE TYPE "BookCategory" AS ENUM ('DSA', 'BACKEND', 'DEVOPS', 'BLOCKCHAIN', 'SYSTEM_DESIGN', 'PRODUCTIVITY');

-- CreateEnum
CREATE TYPE "ReadingStatus" AS ENUM ('WANT_TO_READ', 'READING', 'COMPLETED', 'PAUSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "emailVerifyExpiry" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "githubUsername" TEXT,
    "linkedinUrl" TEXT,
    "backupEmail" TEXT,
    "socialLinks" JSONB,
    "notifEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifTelegram" BOOLEAN NOT NULL DEFAULT false,
    "telegramChatId" TEXT,
    "reminderTime" TEXT NOT NULL DEFAULT '09:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardLayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "layout" JSONB NOT NULL,
    "widgets" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DsaProblem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "difficulty" "DsaDifficulty" NOT NULL,
    "platform" "DsaPlatform" NOT NULL,
    "problemUrl" TEXT,
    "solutionUrl" TEXT,
    "code" TEXT,
    "videoLinks" TEXT[],
    "notes" TEXT,
    "tags" TEXT[],
    "topics" "DsaTopic"[],
    "personalRating" SMALLINT,
    "timeTaken" INTEGER,
    "mistakes" TEXT,
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DsaProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DsaRevision" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "dayInterval" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DsaRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "category" TEXT,
    "folderPath" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteTag" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "NoteTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteAttachment" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "scope" "TaskScope" NOT NULL DEFAULT 'DAILY',
    "category" TEXT,
    "dueDate" TIMESTAMP(3),
    "reminderAt" TIMESTAMP(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "channels" TEXT[],
    "message" TEXT NOT NULL,
    "cronExpr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSent" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "jobUrl" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'APPLIED',
    "appliedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "salary" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "LearningCategory" NOT NULL,
    "type" "LearningResourceType" NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "fileUrl" TEXT,
    "tags" TEXT[],
    "durationMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "url" TEXT,
    "fileUrl" TEXT,
    "folderId" TEXT,
    "tags" TEXT[],
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "section" "PlacementSection" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "type" "PlacementResourceType" NOT NULL DEFAULT 'NOTE',
    "fileUrl" TEXT,
    "tags" TEXT[],
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "category" "BookCategory" NOT NULL,
    "coverUrl" TEXT,
    "fileUrl" TEXT,
    "notes" TEXT,
    "highlights" TEXT,
    "totalPages" INTEGER,
    "currentPage" INTEGER NOT NULL DEFAULT 0,
    "readingStatus" "ReadingStatus" NOT NULL DEFAULT 'WANT_TO_READ',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "commits" INTEGER NOT NULL DEFAULT 0,
    "repositories" TEXT[],
    "features" TEXT,
    "bugsFix" TEXT,
    "upcomingWork" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "studyMinutes" INTEGER NOT NULL DEFAULT 0,
    "codingMinutes" INTEGER NOT NULL DEFAULT 0,
    "projectMinutes" INTEGER NOT NULL DEFAULT 0,
    "readingMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dsaSolved" INTEGER NOT NULL DEFAULT 0,
    "revisionsCount" INTEGER NOT NULL DEFAULT 0,
    "learningMinutes" INTEGER NOT NULL DEFAULT 0,
    "githubCommits" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "jobsApplied" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteTag_noteId_tag_key" ON "NoteTag"("noteId", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "GithubActivity_userId_date_key" ON "GithubActivity"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ProductivityLog_userId_date_key" ON "ProductivityLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSnapshot_userId_date_key" ON "AnalyticsSnapshot"("userId", "date");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardLayout" ADD CONSTRAINT "DashboardLayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DsaProblem" ADD CONSTRAINT "DsaProblem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DsaRevision" ADD CONSTRAINT "DsaRevision_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "DsaProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteTag" ADD CONSTRAINT "NoteTag_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteAttachment" ADD CONSTRAINT "NoteAttachment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEntry" ADD CONSTRAINT "LearningEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceFolder" ADD CONSTRAINT "ResourceFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ResourceFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceFolder" ADD CONSTRAINT "ResourceFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ResourceFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementNote" ADD CONSTRAINT "PlacementNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubActivity" ADD CONSTRAINT "GithubActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductivityLog" ADD CONSTRAINT "ProductivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
