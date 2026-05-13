import app from './app.js';
import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

import { createServer } from 'http';
import { initSocket } from './utils/socket.js';

const DEFAULT_PORT = Number(process.env.PORT || 5000);
const httpServer = createServer(app);
const io = initSocket(httpServer);

async function verifyDatabase() {
  const result = await pool.query('SELECT NOW()');
  console.log('✅ Database connection verified.');
}

function startServer(port, retriesLeft = 5) {
  const serverInstance = httpServer.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  serverInstance.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && retriesLeft > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use, retrying on port ${nextPort}`);
      startServer(nextPort, retriesLeft - 1);
      return;
    }

    console.error('Server failed to start:', error);
    process.exit(1);
  });

  server = serverInstance;
  return serverInstance;
}

await verifyDatabase();
let server;
startServer(DEFAULT_PORT);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});
