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

    // Revenue over time
    const revenueOverTime = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        SUM(shipping_cost) as shipping_revenue
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND status NOT IN ('cancelled', 'returned')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Revenue by category
    const revenueByCategory = await pool.query(`
      SELECT 
        c.name as category,
        c.slug,
        COUNT(DISTINCT o.id) as orders,
        SUM(oi.quantity * oi.price_at_purchase) as revenue
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND o.status NOT IN ('cancelled', 'returned')
      GROUP BY c.id, c.name, c.slug
      ORDER BY revenue DESC
    `);

    // Top selling products
    const topSellingProducts = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.image_url,
        p.price,
        SUM(oi.quantity) as total_sold,
        SUM(oi.quantity * oi.price_at_purchase) as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND o.status NOT IN ('cancelled', 'returned')
      GROUP BY p.id, p.name, p.image_url, p.price
      ORDER BY total_sold DESC
      LIMIT 10
    `);

    // Order completion rate
    const completionRate = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        ROUND(
          ((COUNT(*) FILTER (WHERE status = 'delivered'))::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
          2
        ) as completion_rate
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    `);

    // Average order value
    const averageOrderValue = await pool.query(`
      SELECT 
        AVG(total_amount) as avg_order_value,
        MIN(total_amount) as min_order_value,
        MAX(total_amount) as max_order_value
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND status NOT IN ('cancelled', 'returned')
    `);

    // Monthly comparison
    const monthlyComparison = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
        AND status NOT IN ('cancelled', 'returned')
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);

    // Profit calculation (assuming 30% profit margin)
    const profitMetrics = await pool.query(`
      SELECT 
        SUM(total_amount) as total_revenue,
        SUM(total_amount) * 0.30 as estimated_profit,
        SUM(total_amount) * 0.70 as estimated_cost,
        AVG(total_amount) as avg_order_value,
        COUNT(*) as total_orders
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND status NOT IN ('cancelled', 'returned')
    `);
    res.json({
      revenueOverTime: revenueOverTime.rows,
      revenueByCategory: revenueByCategory.rows,
      topSellingProducts: topSellingProducts.rows,
      completionRate: completionRate.rows[0],
      averageOrderValue: averageOrderValue.rows[0],
      monthlyComparison: monthlyComparison.rows,
      profitMetrics: profitMetrics.rows[0]
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
