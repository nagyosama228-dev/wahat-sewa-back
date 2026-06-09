import pool from './config/database.js';

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Running migration V2...');

    // Add wholesale_price to products
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(10,2) DEFAULT 0;
    `);
    console.log('Added wholesale_price to products');

    // Add wholesale_price_at_purchase to order_items
    await client.query(`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS wholesale_price_at_purchase NUMERIC(10,2) DEFAULT 0;
    `);
    console.log('Added wholesale_price_at_purchase to order_items');

    // Add phone column to users
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    `);
    console.log('Added phone to users');

    // Add whatsapp column to users
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);
    `);
    console.log('Added whatsapp to users');

    // Make email nullable for non-admins
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN email DROP NOT NULL;
    `);
    console.log('Made email nullable in users');

    // Create unique index on phone for non-admin users
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique 
      ON users (phone) WHERE phone IS NOT NULL AND role = 'user';
    `);
    console.log('Created unique index on user phone numbers');

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
