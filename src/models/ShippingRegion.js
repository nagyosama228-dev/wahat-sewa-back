import pool from '../config/database.js';

export class ShippingRegion {
  static async create({ name, shipping_cost }) {
    const result = await pool.query(
      `INSERT INTO shipping_regions (name, shipping_cost)
       VALUES ($1, $2)
       RETURNING *`,
      [name, shipping_cost]
    );
    return result.rows[0];
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT * FROM shipping_regions ORDER BY name ASC`
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT * FROM shipping_regions WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async update(id, { name, shipping_cost }) {
    const result = await pool.query(
      `UPDATE shipping_regions
       SET name = $1, shipping_cost = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [name, shipping_cost, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      `DELETE FROM shipping_regions WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
}
