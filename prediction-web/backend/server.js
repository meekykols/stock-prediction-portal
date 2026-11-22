import http from 'node:http';
import { env } from './src/config/env.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { createApp } from './src/app.js';
import { initSocket } from './src/socket/index.js';
import { startScheduler } from './src/jobs/scheduler.js';

async function main() {
  await connectDB();

  const server = http.createServer(createApp());
  const io = initSocket(server);
  const stopScheduler = startScheduler();

  server.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    stopScheduler();
    io.close();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
