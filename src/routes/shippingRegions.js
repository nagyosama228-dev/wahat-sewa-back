import express from 'express';
import {
  getRegions,
  createRegion,
  updateRegion,
  deleteRegion
} from '../controllers/shippingRegionController.js';
import { regionValidation } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

router.get('/', authenticate, getRegions);
router.post('/', authenticate, requireAdmin, regionValidation, createRegion);
router.put('/:id', authenticate, requireAdmin, regionValidation, updateRegion);
router.delete('/:id', authenticate, requireAdmin, deleteRegion);

export default router;
