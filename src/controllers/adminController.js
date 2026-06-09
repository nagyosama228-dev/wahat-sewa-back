import pool from '../config/database.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';

export const getDashboardStats = async (req, res) => {
  try {
    // Get order stats
    const orderStats = await Order.getStats();

    // Get product stats
    const productStats = await pool.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE is_active = true) as active_products,
        COUNT(*) FILTER (WHERE badge = 'best_seller') as best_sellers,
        COUNT(*) FILTER (WHERE badge = 'featured') as featured_products,
        COUNT(*) FILTER (WHERE badge = 'new_arrival') as new_arrivals,
        SUM(stock) as total_stock
      FROM products
    `);

    // Get user stats
    const userStats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
        COUNT(*) FILTER (WHERE role = 'user') as regular_users
      FROM users
    `);

    // Get recent orders
    const recentOrders = await Order.findAll(10, 0);
    const recentOrdersWithItems = await Promise.all(
      recentOrders.map(async (order) => {
        const items = await Order.getOrderItems(order.id);
        return { ...order, items };
      })
    );

    // Get low stock products
    const lowStockProducts = await pool.query(`
      SELECT id, name, stock, image_url
      FROM products
      WHERE stock < 10 AND is_active = true
      ORDER BY stock ASC
      LIMIT 10
    `);

    const usersPreview = await pool.query(`
      SELECT id, name, email, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 8
    `);

    const unreadNotifications = await pool.query(`
      SELECT COUNT(*) as unread_notifications
      FROM notifications
      WHERE is_read = false
    `);

    const categoryStats = await pool.query(`
      SELECT COUNT(*) as total_categories
      FROM categories
    `);

    const topProducts = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.image_url,
        p.price,
        p.stock,
        p.badge,
        COALESCE(SUM(oi.quantity), 0) as total_sold
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      GROUP BY p.id
      ORDER BY total_sold DESC, p.created_at DESC
      LIMIT 6
    `);

    res.json({
      orders: orderStats,
      products: {
        ...productStats.rows[0],
        total_categories: categoryStats.rows[0]?.total_categories || 0,
      },
      users: userStats.rows[0],
      recentOrders: recentOrdersWithItems,
      lowStockProducts: lowStockProducts.rows,
      usersPreview: usersPreview.rows,
      topProducts: topProducts.rows,
      unreadNotifications: unreadNotifications.rows[0]?.unread_notifications || 0
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const getProfitAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);

    // 1. Overview Orders Stats
    const ordersOverview = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'returned') as returned
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    `);

    // 2. Exact Profit Metrics
    const profitMetrics = await pool.query(`
      SELECT 
        SUM((oi.price_at_purchase - COALESCE(oi.wholesale_price_at_purchase, 0)) * oi.quantity) as net_profit,
        SUM(oi.price_at_purchase * oi.quantity) as total_products_revenue,
        SUM(COALESCE(oi.wholesale_price_at_purchase, 0) * oi.quantity) as total_wholesale_cost,
        SUM(o.shipping_cost) as total_shipping_fees,
        SUM(o.total_amount) as gross_revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(DISTINCT o.id) as total_successful_orders
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND o.status IN ('confirmed', 'processing', 'shipped', 'delivered')
    `);

    // 3. Top Selling Products (Detailed)
    const topSellingProducts = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.image_url,
        p.price as current_price,
        p.wholesale_price as current_wholesale,
        SUM(oi.quantity) as total_units_sold,
        SUM(oi.quantity * oi.price_at_purchase) as total_revenue,
        SUM(oi.quantity * (oi.price_at_purchase - COALESCE(oi.wholesale_price_at_purchase, 0))) as total_profit
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND o.status IN ('confirmed', 'processing', 'shipped', 'delivered')
      GROUP BY p.id, p.name, p.image_url, p.price, p.wholesale_price
      ORDER BY total_units_sold DESC
      LIMIT 15
    `);

    // 4. Top Customers (Detailed)
    const topCustomers = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        SUM(o.total_amount - o.shipping_cost) as total_products_spent
      FROM users u
      JOIN orders o ON u.id = o.user_id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND o.status IN ('confirmed', 'processing', 'shipped', 'delivered')
      GROUP BY u.id, u.name, u.email, u.phone
      ORDER BY total_spent DESC
      LIMIT 15
    `);

    // 5. Category Performance
    const categoryPerformance = await pool.query(`
      SELECT 
        c.name as category_name,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(oi.quantity) as total_items_sold,
        SUM(oi.quantity * oi.price_at_purchase) as total_revenue,
        SUM(oi.quantity * (oi.price_at_purchase - COALESCE(oi.wholesale_price_at_purchase, 0))) as total_profit
      FROM categories c
      JOIN products p ON c.id = p.category_id
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND o.status IN ('confirmed', 'processing', 'shipped', 'delivered')
      GROUP BY c.id, c.name
      ORDER BY total_profit DESC
    `);

    // 6. Regional / City Performance
    const regionalPerformance = await pool.query(`
      SELECT 
        shipping_address->>'city' as city,
        COUNT(id) as total_orders,
        SUM(total_amount) as total_revenue,
        SUM(shipping_cost) as total_shipping_collected
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND status IN ('confirmed', 'processing', 'shipped', 'delivered')
        AND shipping_address->>'city' IS NOT NULL
      GROUP BY shipping_address->>'city'
      ORDER BY total_orders DESC
      LIMIT 15
    `);

    res.json({
      ordersOverview: ordersOverview.rows[0],
      profitMetrics: profitMetrics.rows[0],
      topSellingProducts: topSellingProducts.rows,
      topCustomers: topCustomers.rows,
      categoryPerformance: categoryPerformance.rows,
      regionalPerformance: regionalPerformance.rows
    });
  } catch (error) {
    console.error('Get profit analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch profit analytics' });
  }
};

export const getReports = async (req, res) => {
  try {
    const { type } = req.query;

    switch (type) {
      case 'sales':
        const salesReport = await pool.query(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as orders,
            SUM(total_amount) as revenue,
            AVG(total_amount) as avg_order_value
          FROM orders
          WHERE status IN ('delivered', 'shipped', 'processing')
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `);
        return res.json({ report: salesReport.rows });

      case 'inventory':
        const inventoryReport = await pool.query(`
          SELECT 
            p.*,
            c.name as category_name,
            COUNT(oi.id) as times_ordered,
            SUM(COALESCE(oi.quantity, 0)) as total_sold
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN order_items oi ON p.id = oi.product_id
          GROUP BY p.id, c.name
          ORDER BY p.stock ASC
        `);
        return res.json({ report: inventoryReport.rows });

      case 'customers':
        const customerReport = await pool.query(`
          SELECT 
            u.id,
            u.name,
            u.email,
            COUNT(o.id) as total_orders,
            SUM(o.total_amount) as total_spent,
            AVG(o.total_amount) as avg_order_value,
            MAX(o.created_at) as last_order_date
          FROM users u
          LEFT JOIN orders o ON u.id = o.user_id
          WHERE u.role = 'user'
          GROUP BY u.id
          ORDER BY total_spent DESC
        `);
        return res.json({ report: customerReport.rows });

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

export const resetRecords = async (req, res) => {
  const client = await pool.connect();
  try {
    const { targets } = req.body; // ['orders', 'notifications', 'profits']
    if (!Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ error: 'No targets specified for clearing.' });
    }

    await client.query('BEGIN');

    for (const target of targets) {
      if (target === 'orders' || target === 'profits') {
        // Clearing orders inherently resets profits and order history. CASCADE clears items.
        // Or if 'profits' alone is chosen but orders should clear, we truncate orders.
        await client.query('TRUNCATE TABLE orders CASCADE');
      } else if (target === 'notifications') {
        await client.query('TRUNCATE TABLE notifications CASCADE');
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Selected records were successfully cleared.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reset records error:', error);
    res.status(500).json({ error: 'Failed to reset records.' });
  } finally {
    client.release();
  }
};
