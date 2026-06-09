import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Notification } from '../models/Notification.js';
import { createShipment } from '../services/shipbluService.js';
import pool from '../config/database.js';

export const getOrders = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const filters = {
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    if (req.query.status) {
      filters.status = req.query.status;
    }

    if (!isAdmin) {
      filters.user_id = req.user.id;
    }

    const orders = await Order.findAll(filters.limit, filters.offset, filters);
    
    // Get items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await Order.getOrderItems(order.id);
        return { ...order, items };
      })
    );

    res.json({ orders: ordersWithItems });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user has access to this order
    if (!isAdmin && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const items = await Order.getOrderItems(id);
    const history = await Order.getStatusHistory(id);

    res.json({ order: { ...order, items, history } });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { items, shipping_address, notes } = req.body;

    // Validate products and calculate total
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product_id);
      
      if (!product) {
        return res.status(404).json({ error: `Product with ID ${item.product_id} not found` });
      }

      if (!product.is_active) {
        return res.status(400).json({ error: `Product ${product.name} is not available` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }

      const itemTotal = parseFloat(product.price) * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: parseFloat(product.price),
        wholesale_price: parseFloat(product.wholesale_price || 0)
      });
    }

    // Fetch shipping cost from database for the selected city/region
    let shippingCost = 65.00; // Default fallback
    if (shipping_address && shipping_address.city) {
      const regionResult = await pool.query(
        'SELECT shipping_cost FROM shipping_regions WHERE name = $1',
        [shipping_address.city.trim()]
      );
      if (regionResult.rows.length > 0) {
        shippingCost = parseFloat(regionResult.rows[0].shipping_cost);
      }
    }
    const finalTotal = totalAmount + shippingCost;

    // Create order
    const order = await Order.create({
      user_id: req.user.id,
      items: validatedItems,
      total_amount: finalTotal,
      shipping_cost: shippingCost,
      shipping_address,
      notes
    });

    // Create notification for user
    await Notification.create({
      user_id: req.user.id,
      type: 'order_update',
      title: 'تم استلام طلبك',
      message: `تم استلام طلبك بنجاح. رقم الطلب: ${order.id}`
    });

    // Create notification for admin
    const adminUsers = await pool.query('SELECT id FROM users WHERE role = $1', ['admin']);
    for (const admin of adminUsers.rows) {
      await Notification.create({
        user_id: admin.id,
        type: 'order_update',
        title: 'طلب جديد',
        message: `تم استلام طلب جديد. رقم الطلب: ${order.id}`
      });
    }

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status, notes, tracking_number, estimated_delivery, actual_delivery } = req.body;

    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let shipbluData = { shipblu_tracking_number: null, shipblu_shipment_id: null, shipblu_awb_url: null };

    // Auto-create ShipBlu shipment if order is approved (processing or confirmed) and has no shipment id yet
    if ((status === 'processing' || status === 'confirmed') && !order.shipblu_shipment_id) {
      try {
        const sbResponse = await createShipment(order, order.shipping_address);
        shipbluData.shipblu_shipment_id = sbResponse.shipment_id;
        shipbluData.shipblu_tracking_number = sbResponse.tracking_number;
        shipbluData.shipblu_awb_url = sbResponse.awb_url;
        
        // Let's also sync it to the standard tracking_number if it's not provided manually
        if (!tracking_number) {
           tracking_number = sbResponse.tracking_number;
        }
      } catch (error) {
        console.error("ShipBlu Auto-Sync Failed:", error);
        return res.status(400).json({ error: error.message || "حدث خطأ أثناء الربط مع شركة الشحن" });
      }
    }

    // Update order status
    const updatedOrder = await Order.updateStatus(id, status, req.user.id, {
      notes,
      tracking_number,
      estimated_delivery,
      actual_delivery,
      ...shipbluData
    });

    const trackingText = tracking_number ? ` رقم التتبع: ${tracking_number}.` : '';
    const deliveryText = estimated_delivery
      ? ` موعد التسليم المتوقع: ${new Date(estimated_delivery).toLocaleDateString('ar-EG')}.`
      : '';

    // Create notification for user
    await Notification.create({
      user_id: order.user_id,
      type: 'order_update',
      title: 'تحديث حالة الطلب',
      message: `تم تحديث حالة طلبك إلى: ${getStatusText(status)}.${trackingText}${deliveryText}`.trim()
    });

    res.json({
      message: 'Order status updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

export const getOrderHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!isAdmin && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const history = await Order.getStatusHistory(id);
    res.json({ history });
  } catch (error) {
    console.error('Get order history error:', error);
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
};

function getStatusText(status) {
  const statusMap = {
    pending: 'قيد الانتظار',
    confirmed: 'مؤكد',
    processing: 'قيد المعالجة',
    shipped: 'تم الشحن',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
    returned: 'مسترجع'
  };
  return statusMap[status] || status;
}
