import pool from '../config/database.js';
import { sendNotification } from '../utils/socket.js';

export class Notification {
  static async create({ user_id, type, title, message }) {
    const result = await pool.query(
      'INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, type, title, message]
    );
    
    const notification = result.rows[0];
    
    // Send real-time notification
    sendNotification(user_id, notification);
    
    return notification;
  }

  static async findByUserId(user_id, limit = 20, offset = 0) {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [user_id, limit, offset]
    );
    return result.rows;
  }

  static async findUnreadByUserId(user_id) {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 AND is_read = false ORDER BY created_at DESC',
      [user_id]
    );
    return result.rows;
  }

  static async markAsRead(id, user_id) {
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, user_id]
    );
    return result.rows[0];
  }

  static async markAllAsRead(user_id) {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [user_id]
    );
  }

  static async getUnreadCount(user_id) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [user_id]
    );
    return parseInt(result.rows[0].count);
  }

  static async delete(id, user_id) {
    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );
  }
}
