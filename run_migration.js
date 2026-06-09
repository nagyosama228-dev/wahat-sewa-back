import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : (process.env.DATABASE_URL?.includes('sslmode=') ? undefined : false),
});

const runMigration = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add wholesale_price to products
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10, 2) DEFAULT 0
    `);

    // Add wholesale_price_at_purchase to order_items
    await client.query(`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS wholesale_price_at_purchase DECIMAL(10, 2) DEFAULT 0
    `);

    await client.query('COMMIT');
    console.log('Successfully added wholesale_price columns to database');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

runMigration();