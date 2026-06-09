import express from 'express';
import { handleShipbluWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// ShipBlu webhook endpoint
// In production, we should add middleware to verify the webhook signature if ShipBlu provides one
router.post('/shipblu', handleShipbluWebhook);

export default router;
