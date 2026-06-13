import 'dotenv/config'; // Load .env first — must be before any other import
import app from './app';
import { env } from './config/env';
import prisma from './config/database';
import { initScheduler } from './jobs/scheduler';

const startServer = async () => {
  try {
    // Test Database connection
    console.log('🔌 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Database connection successful.');

    // Start background jobs scheduler
    initScheduler();

    // Start listening
    const server = app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`🚀 DevOS Backend running in ${env.NODE_ENV} mode on port ${env.PORT}`);
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
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start the server:', error);
    process.exit(1);
  }
};

startServer();
