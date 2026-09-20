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
import githubRouter from './modules/github/github.routes';
import analyticsRouter from './modules/analytics/analytics.routes';
import remindersRouter from './modules/reminders/reminders.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';
import usersRouter from './modules/users/users.routes';
import projectsRouter from './modules/projects/projects.routes';
import hackathonsRouter from './modules/hackathons/hackathons.routes';
import prioritiesRouter from './modules/priorities/priorities.routes';
import dsaConceptsRouter from './modules/dsa-concepts/dsa-concepts.routes';
import aiRouter from './modules/ai/ai.routes';
import logsRouter from './modules/analytics/logs.routes';
import contactsRouter from './modules/contacts/contacts.routes';

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
    // Explicitly allow any origin including chrome-extension:// URLs.
    // `origin: true` reflects the request Origin, but can fail for
    // non-standard schemes (chrome-extension://) through certain proxies.
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);
      // Always allow chrome extensions
      if (origin.startsWith('chrome-extension://')) return callback(null, true);
      // Allow all other origins (same behaviour as origin: true)
      return callback(null, origin);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Extension-Token'],
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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
app.use('/api/github', githubRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/users', usersRouter);
// V2 Routes
app.use('/api/projects', projectsRouter);
app.use('/api/hackathons', hackathonsRouter);
app.use('/api/priorities', prioritiesRouter);
app.use('/api/dsa-concepts', dsaConceptsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/logs', logsRouter);
app.use('/api/contacts', contactsRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
