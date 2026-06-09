import pool from '../config/database.js';
import { Order } from '../models/Order.js';

/**
 * Handle incoming webhooks from ShipBlu
 */
export const handleShipbluWebhook = async (req, res) => {
  try {
    const payload = req.body;
    
    // ShipBlu typical webhook payload example:
    // { shipment_id: "...", tracking_number: "...", status: "Delivered", status_code: "DLV", timestamp: "..." }
    const { shipment_id, tracking_number, status: shipbluStatus } = payload;

    if (!shipment_id && !tracking_number) {
      return res.status(400).json({ error: 'Missing shipment identification' });
    }

    // Map ShipBlu status to our internal order status
    let internalStatus = null;
    
    // Exact mapping depends on ShipBlu's documentation. Common mappings:
    const statusLower = (shipbluStatus || '').toLowerCase();
    
    if (statusLower.includes('delivered')) {
      internalStatus = 'delivered';
    } else if (statusLower.includes('returned') || statusLower.includes('cancelled')) {
      internalStatus = 'returned'; // or cancelled
    } else if (statusLower.includes('shipped') || statusLower.includes('out for delivery')) {
      internalStatus = 'shipped';
    }

    if (internalStatus) {
      // Find the order by shipblu_shipment_id or shipblu_tracking_number
      const orderQuery = await pool.query(
        'SELECT * FROM orders WHERE shipblu_shipment_id = $1 OR shipblu_tracking_number = $2 OR tracking_number = $2 LIMIT 1',
        [shipment_id, tracking_number]
      );

      if (orderQuery.rows.length > 0) {
        const order = orderQuery.rows[0];
        
        // Only update if status is different
        if (order.status !== internalStatus) {
          // System update (no specific user, so we pass null for changed_by, but our function might need one,
          // Let's pass the order.user_id or fetch a system admin ID. For now we use the order's owner as 'system')
          await Order.updateStatus(order.id, internalStatus, order.user_id, {
            notes: `تحديث تلقائي من شركة الشحن: ${shipbluStatus}`
          });
        }
      } else {
        console.warn(`Webhook received for unknown shipment: ${shipment_id} / ${tracking_number}`);
      }
    }

    // Always return 200 OK to the webhook provider so they don't retry unnecessarily
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('ShipBlu Webhook Error:', error);
    // Even on error, return 200 so ShipBlu doesn't retry infinitely, or 500 if we want them to retry.
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
