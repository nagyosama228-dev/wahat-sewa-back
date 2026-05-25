import pool from './config/database.js';

async function updateForeignKeys() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Drop existing cascade constraints on orders->users and notifications->users
        await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'orders_user_id_fkey') THEN
          ALTER TABLE orders DROP CONSTRAINT orders_user_id_fkey;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_user_id_fkey') THEN
          ALTER TABLE notifications DROP CONSTRAINT notifications_user_id_fkey;
        END IF;
      END $$;
    `);

        // Add new constraints with ON DELETE SET NULL instead of CASCADE for orders,
        // and CASCADE for notifications is fine or SET NULL. Let's just do orders.
        await client.query(`
      ALTER TABLE orders 
      ADD CONSTRAINT orders_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    `);

        await client.query(`
      ALTER TABLE notifications 
      ADD CONSTRAINT notifications_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);

        await client.query('COMMIT');
        console.log('Successfully updated foreign keys to prevent order deletion on user deletion.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to update DB:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

updateForeignKeys();
