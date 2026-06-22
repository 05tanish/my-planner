import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { globalLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/error.middleware';

// Import Route Handlers
import authRouter from './modules/auth/auth.routes';
import profileRouter from './modules/profile/profile.routes';
import dsaRouter from './modules/dsa/dsa.routes';
import notesRouter from './modules/notes/notes.routes';
import plannerRouter from './modules/planner/planner.routes';
import jobsRouter from './modules/jobs/jobs.routes';
import resourcesRouter from './modules/resources/resources.routes';
import booksRouter from './modules/books/books.routes';
import placementRouter from './modules/placement/placement.routes';
import githubRouter from './modules/github/github.routes';
import analyticsRouter from './modules/analytics/analytics.routes';
import remindersRouter from './modules/reminders/reminders.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';
import usersRouter from './modules/users/users.routes';
// V2 Routes
import projectsRouter from './modules/projects/projects.routes';
import interviewsRouter from './modules/interviews/interviews.routes';
import habitsRouter from './modules/habits/habits.routes';
import opportunitiesRouter from './modules/opportunities/opportunities.routes';
import hackathonsRouter from './modules/hackathons/hackathons.routes';
import alertsRouter from './modules/alerts/alerts.routes';
import knowledgeRouter from './modules/knowledge/knowledge.routes';

const app = express();

// Security and utility middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "*"],
        connectSrc: ["'self'", "*"],
        frameSrc: ["'self'", env.FRONTEND_URL || '*', "blob:", "*"],
        childSrc: ["'self'", env.FRONTEND_URL || '*', "blob:", "*"],
        objectSrc: ["'self'", "data:", "blob:", "*"],
        mediaSrc: ["'self'", "data:", "blob:", "*"],
      },
    },
    frameguard: false,
  })
);
app.use(
  cors({
    origin: true, // standard frontend URLs
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files locally as a fallback
const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  // Allow PDFs to be embedded in iframes from any origin
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Content-Security-Policy');
  next();
}, express.static(uploadsPath));

// Apply global rate limiter
app.use(globalLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/dsa', dsaRouter);
app.use('/api/notes', notesRouter);
app.use('/api/planner', plannerRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/books', booksRouter);
app.use('/api/placement', placementRouter);
app.use('/api/github', githubRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/users', usersRouter);
// V2 Routes
app.use('/api/projects', projectsRouter);
app.use('/api/interviews', interviewsRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/hackathons', hackathonsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/knowledge', knowledgeRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
