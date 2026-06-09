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
      reference: String(order.id),
      customer_name: shippingAddress.name || 'عميل الواحات',
      customer_phone: shippingAddress.whatsapp || shippingAddress.phone || '0000000000',
      city: shippingAddress.city,
      address: shippingAddress.address || 'العنوان غير محدد',
      amount: parseFloat(order.total_amount),
      notes: order.notes || 'لا يوجد ملاحظات',
      is_test: API_URL.includes('staging') || API_URL.includes('app.shipblu.com')
    };

    const response = await axios.post(`${API_URL}/api/v1/shipments`, payload, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return {
      shipment_id: response.data.data?.id || response.data.id,
      tracking_number: response.data.data?.tracking_number || response.data.tracking_number,
      awb_url: response.data.data?.awb_link || response.data.awb_link || null
    };
  } catch (error) {
    console.error("ShipBlu API Error:", error.response?.data || error.message);
    throw new Error("فشل في إنشاء بوليصة الشحن مع ShipBlu: " + (error.response?.data?.message || error.message));
  }
};
