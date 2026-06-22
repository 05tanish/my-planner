import 'dotenv/config'; // Load .env first — must be before any other import
import app from './app';
import { env } from './config/env';
import prisma from './config/database';
import { initScheduler } from './jobs/scheduler';

const MAX_DB_RETRIES = 8;
const RETRY_DELAY_MS = 8000; // Neon free tier can take 30-60s to wake up from cold start

const connectWithRetry = async (): Promise<void> => {
  for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
    try {
      console.log(`🔌 Connecting to database (attempt ${attempt}/${MAX_DB_RETRIES})...`);
      await prisma.$connect();
      console.log('✅ Database connection successful.');
      return;
    } catch (err: any) {
      console.error(`❌ DB connection failed (attempt ${attempt}): ${err.message}`);
      if (attempt < MAX_DB_RETRIES) {
        console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      } else {
        throw err;
      }
    }
  }
};

const startServer = async () => {
  try {
    // Connect to DB with retry logic
    await connectWithRetry();

    // Start background jobs scheduler
    initScheduler();

    // Use PORT from env — fallback to 4000 in dev, 8080 in prod
    const PORT = parseInt(process.env.PORT || (env.NODE_ENV === 'development' ? '4000' : '8080'), 10);

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 DevOS Backend running in ${env.NODE_ENV} mode on port ${PORT}`);
    });

    // Handle server errors (e.g. port already in use)
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Kill the existing process or change PORT.`);
      } else {
        console.error('❌ Server error:', err);
      }
      process.exit(1);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('💤 Express server closed.');
        await prisma.$disconnect();
        console.log('🔌 Database connection closed.');
        process.exit(0);
      });

      // Force-exit after 10s if graceful shutdown hangs
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start the server:', error);
    // Don't exit immediately in dev — let tsx watch restart
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

startServer();
