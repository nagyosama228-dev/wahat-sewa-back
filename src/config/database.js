import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : (process.env.DATABASE_URL?.includes('sslmode=') ? undefined : false),
});

// Remove pool.on('connect') to prevent log spam. 
// Server.js already verifies connection on startup.

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
