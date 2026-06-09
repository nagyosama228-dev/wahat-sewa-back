import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.SHIPBLU_API_KEY;
const API_URL = process.env.SHIPBLU_API_URL || 'https://api.staging.shipblu.com';

/**
 * Creates a new shipment in ShipBlu.
 * @param {Object} order - The order object from database.
 * @param {Object} shippingAddress - The shipping address object.
 * @returns {Promise<{shipment_id: string, tracking_number: string}>}
 */
export const createShipment = async (order, shippingAddress) => {
  if (!API_KEY) {
    console.warn("⚠️ SHIPBLU_API_KEY is not set. Simulating ShipBlu shipment creation...");
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      shipment_id: `sb_mock_${Date.now()}`,
      tracking_number: `SB-${Math.floor(10000000 + Math.random() * 90000000)}`
    };
  }

  try {
    // ShipBlu official payload mapping
    const payload = {
      customer: {
        full_name: shippingAddress.name || 'عميل الواحات',
        email: "customer@wahat-sewa.com",
        phone: shippingAddress.whatsapp || shippingAddress.phone || '01000000000',
        address: {
          line_1: shippingAddress.address || 'العنوان غير محدد',
          line_2: shippingAddress.city || 'Cairo',
          zone: 1 // Default zone, ShipBlu might re-zone automatically
        }
      },
      packages: [
        {
          package_size: 1 // 1: Small, 2: Medium, 3: Large
        }
      ],
      cash_amount: parseFloat(order.total_amount),
      order_notes: order.notes || 'لا يوجد ملاحظات',
      merchant_order_reference: String(order.id)
    };

    const response = await axios.post(`${API_URL}/api/v1/delivery-orders/`, payload, {
      headers: {
        'Authorization': `Api-Key ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return {
      shipment_id: response.data.id,
      tracking_number: response.data.tracking_number,
      awb_url: `https://app.shipblu.com/orders/delivery/${response.data.id}` // Link to the order in ShipBlu dashboard
    };
  } catch (error) {
    console.error("ShipBlu API Error:", error.response?.data || error.message);
    throw new Error("فشل في إنشاء بوليصة الشحن مع ShipBlu: " + (error.response?.data?.message || error.message));
  }
};
