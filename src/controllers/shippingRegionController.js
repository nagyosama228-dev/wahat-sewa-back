import { ShippingRegion } from '../models/ShippingRegion.js';

export const getRegions = async (req, res) => {
  try {
    const regions = await ShippingRegion.findAll();
    res.json({ regions });
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({ error: 'Failed to fetch shipping regions' });
  }
};

export const createRegion = async (req, res) => {
  try {
    const { name, shipping_cost } = req.body;
    
    // Check if region already exists
    const allRegions = await ShippingRegion.findAll();
    const exists = allRegions.some(r => r.name.toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'المنطقة موجودة بالفعل' });
    }

    const region = await ShippingRegion.create({
      name: name.trim(),
      shipping_cost: parseFloat(shipping_cost)
    });

    res.status(201).json({
      message: 'تم إنشاء المنطقة بنجاح',
      region
    });
  } catch (error) {
    console.error('Create region error:', error);
    res.status(500).json({ error: 'Failed to create shipping region' });
  }
};

export const updateRegion = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, shipping_cost } = req.body;

    const existingRegion = await ShippingRegion.findById(id);
    if (!existingRegion) {
      return res.status(404).json({ error: 'المنطقة غير موجودة' });
    }

    // Check if name is being changed and if new name already exists
    if (name.trim().toLowerCase() !== existingRegion.name.toLowerCase()) {
      const allRegions = await ShippingRegion.findAll();
      const exists = allRegions.some(r => r.name.toLowerCase() === name.trim().toLowerCase() && r.id !== id);
      if (exists) {
        return res.status(400).json({ error: 'يوجد منطقة أخرى بنفس الاسم' });
      }
    }

    const region = await ShippingRegion.update(id, {
      name: name.trim(),
      shipping_cost: parseFloat(shipping_cost)
    });

    res.json({
      message: 'تم تحديث المنطقة بنجاح',
      region
    });
  } catch (error) {
    console.error('Update region error:', error);
    res.status(500).json({ error: 'Failed to update shipping region' });
  }
};

export const deleteRegion = async (req, res) => {
  try {
    const { id } = req.params;

    const region = await ShippingRegion.delete(id);
    if (!region) {
      return res.status(404).json({ error: 'المنطقة غير موجودة' });
    }

    res.json({
      message: 'تم حذف المنطقة بنجاح',
      region
    });
  } catch (error) {
    console.error('Delete region error:', error);
    res.status(500).json({ error: 'Failed to delete shipping region' });
  }
};
