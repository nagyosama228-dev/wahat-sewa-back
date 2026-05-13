import pool from '../config/database.js';

export class Category {
  static async create({ name, slug, description, sort_order = 0 }) {
    const result = await pool.query(
      'INSERT INTO categories (name, slug, description, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, slug, description, sort_order]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findBySlug(slug) {
    const result = await pool.query(
      'SELECT * FROM categories WHERE slug = $1',
      [slug]
    );
    return result.rows[0];
  }

  static async findAll() {
    const result = await pool.query(
      'SELECT * FROM categories ORDER BY sort_order ASC, name ASC'
    );
    return result.rows;
  }

  static async update(id, updates) {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = Object.values(updates);
    const result = await pool.query(
      `UPDATE categories SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
  }
}
