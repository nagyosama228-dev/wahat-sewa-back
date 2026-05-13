import pool from '../config/database.js';

export class Product {
  static filterWritableFields(input = {}) {
    const allowedFields = [
      'name',
      'image_url',
      'price',
      'description',
      'category_id',
      'badge',
      'stock',
      'sort_order',
      'is_active',
    ];

    return Object.fromEntries(
      Object.entries(input).filter(([key, value]) => allowedFields.includes(key) && value !== undefined)
    );
  }

  static async create({ name, image_url, price, description, category_id, badge, stock, sort_order = 0, is_active = true }) {
    const result = await pool.query(
      `INSERT INTO products (name, image_url, price, description, category_id, badge, stock, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, image_url, price, description, category_id, badge, stock, sort_order, is_active]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(sales.total_sold, 0) as total_sold
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT product_id, COALESCE(SUM(quantity), 0) as total_sold
        FROM order_items
        GROUP BY product_id
      ) sales ON sales.product_id = p.id
      WHERE 1 = 1
    `;
    const params = [];
    let paramIndex = 1;

    if (!filters.include_inactive) {
      query += ' AND p.is_active = true';
    }

    if (filters.category_id) {
      query += ` AND p.category_id = $${paramIndex}`;
      params.push(filters.category_id);
      paramIndex++;
    }

    if (filters.category_slug) {
      query += ` AND c.slug = $${paramIndex}`;
      params.push(filters.category_slug);
      paramIndex++;
    }

    if (filters.badge) {
      query += ` AND p.badge = $${paramIndex}`;
      params.push(filters.badge);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const sortMap = {
      catalog: 'COALESCE(p.sort_order, 0) ASC, p.created_at DESC',
      best_selling: 'COALESCE(sales.total_sold, 0) DESC, p.created_at DESC',
      newest: 'p.created_at DESC',
      price_asc: 'p.price ASC, p.created_at DESC',
      price_desc: 'p.price DESC, p.created_at DESC',
      name_asc: 'p.name ASC',
      stock_asc: 'p.stock ASC, p.created_at DESC',
      stock_desc: 'p.stock DESC, p.created_at DESC',
    };

    query += ` ORDER BY ${sortMap[filters.sort] || sortMap.catalog}`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async update(id, updates) {
    const safeUpdates = Product.filterWritableFields(updates);
    const updateKeys = Object.keys(safeUpdates);

    if (updateKeys.length === 0) {
      return this.findById(id);
    }

    const setClause = updateKeys
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = Object.values(safeUpdates);
    const result = await pool.query(
      `UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
  }

  static async toggleActive(id) {
    const result = await pool.query(
      'UPDATE products SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async updateStock(id, quantity) {
    const result = await pool.query(
      'UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING stock',
      [quantity, id]
    );
    return result.rows[0];
  }
}
