import pool from './config/database.js';

async function patchShipBluColumns() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS shipblu_awb_url VARCHAR(255);
        `);

        await client.query('COMMIT');
        console.log('Successfully added shipblu_awb_url to orders table.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to update DB:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

patchShipBluColumns();
