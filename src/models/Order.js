import pool from '../config/database.js';

export class Order {
  static async create({ user_id, items, total_amount, shipping_cost, shipping_address, notes }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, total_amount, shipping_cost, shipping_address, notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [user_id, total_amount, shipping_cost, JSON.stringify(shipping_address), notes]
      );
      const order = orderResult.rows[0];

      // Create order items
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
           VALUES ($1, $2, $3, $4)`,
          [order.id, item.product_id, item.quantity, item.price]
        );

        // Update product stock
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // Create initial status history
      await client.query(
        `INSERT INTO order_status_history (order_id, status, changed_by, notes)
         VALUES ($1, 'pending', $2, 'Order created')`,
        [order.id, user_id]
      );

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findByUserId(user_id, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT o.* FROM orders o WHERE o.user_id = $1 ORDER BY o.created_at DESC LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );
    return result.rows;
  }

  static async findAll(limit = 50, offset = 0, filters = {}) {
    let query = 'SELECT o.*, u.name as user_name, u.email as user_email FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.user_id) {
      query += ` AND o.user_id = $${paramIndex}`;
      params.push(filters.user_id);
      paramIndex++;
    }

    query += ' ORDER BY o.created_at DESC';

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);
      paramIndex++;
    }

    if (offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getOrderItems(order_id) {
    const result = await pool.query(
      `SELECT oi.*, p.name as product_name, p.image_url as product_image
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [order_id]
    );
    return result.rows;
  }

  static async updateStatus(id, status, changed_by, { notes, tracking_number, estimated_delivery, actual_delivery } = {}) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const nextActualDelivery = actual_delivery || (status === 'delivered' ? new Date().toISOString().slice(0, 10) : null);

      // Update order status and shipping metadata
      const result = await client.query(
        `UPDATE orders
         SET
           status = $1,
           tracking_number = COALESCE($2, tracking_number),
           estimated_delivery = COALESCE($3, estimated_delivery),
           actual_delivery = CASE
             WHEN $4::date IS NOT NULL THEN $4::date
             WHEN $1 = 'delivered' AND actual_delivery IS NULL THEN CURRENT_DATE
             ELSE actual_delivery
           END,
           notes = COALESCE($5, notes),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [status, tracking_number || null, estimated_delivery || null, nextActualDelivery, notes || null, id]
      );

      // Add to status history
      await client.query(
        `INSERT INTO order_status_history (order_id, status, changed_by, notes)
         VALUES ($1, $2, $3, $4)`,
        [id, status, changed_by, notes || null]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getStatusHistory(order_id) {
    const result = await pool.query(
      `SELECT osh.*, u.name as changed_by_name
       FROM order_status_history osh
       LEFT JOIN users u ON osh.changed_by = u.id
       WHERE osh.order_id = $1
       ORDER BY osh.created_at ASC`,
      [order_id]
    );
    return result.rows;
  }

  static async getStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'returned') as returned,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('confirmed', 'processing', 'shipped', 'delivered')), 0) as total_revenue
      FROM orders
    `);
    return result.rows[0];
  }
}
