import axios from 'axios';

const API_KEY = 'SI0Mm6s3.7Q7E4NBsRTHz4hf595umz6kgedHaz7lh';
const API_URL = 'https://api.shipblu.com';

async function test() {
  try {
    const payload = {
      customer: {
        full_name: "Test User",
        email: "test@example.com",
        phone: "01000000000",
        address: {
          line_1: "Test Address 1",
          line_2: "Test Address 2",
          zone: 1
        }
      },
      packages: [
        {
          package_size: 1
        }
      ],
      cash_amount: 100,
      order_notes: "Please deliver carefully",
      merchant_order_reference: "123456"
    };

    const response = await axios.post(`${API_URL}/api/v1/delivery-orders/`, payload, {
      headers: {
        'Authorization': `Api-Key ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log("Error status:", error.response?.status);
    console.log("Error data:", JSON.stringify(error.response?.data, null, 2));
    console.log("Error message:", error.message);
  }
}

test();