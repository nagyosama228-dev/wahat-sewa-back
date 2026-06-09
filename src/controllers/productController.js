import { Product } from '../models/Product.js';
import { deleteImageByUrl } from '../utils/cloudinary.js';

export const getProducts = async (req, res) => {
  try {
    const includeInactive = req.user?.role === 'admin' && req.query.include_inactive === 'true';
    const filters = {
      category_id: req.query.category_id,
      category_slug: req.query.category,
      badge: req.query.badge,
      search: req.query.search,
      sort: req.query.sort || 'catalog',
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      include_inactive: includeInactive
    };

    const products = await Product.findAll(filters);

    if (req.user?.role !== 'admin') {
      products.forEach(p => delete p.wholesale_price);
    }

    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (req.user?.role !== 'admin') {
      delete product.wholesale_price;
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const product = await Product.create(productData);

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const oldProduct = await Product.findById(id);
    if (!oldProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await Product.update(id, updates);

    if (product && updates.image_url && oldProduct.image_url && oldProduct.image_url !== updates.image_url) {
      try {
        await deleteImageByUrl(oldProduct.image_url);
      } catch (cloudinaryError) {
        console.error('Failed to delete old image from Cloudinary on product update:', cloudinaryError);
      }
    }

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (product && product.image_url) {
      try {
        await deleteImageByUrl(product.image_url);
      } catch (cloudinaryError) {
        console.error('Failed to delete image from Cloudinary on product deletion:', cloudinaryError);
      }
    }

    await Product.delete(id);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

export const toggleProductActive = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.toggleActive(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      message: 'Product status toggled successfully',
      product
    });
  } catch (error) {
    console.error('Toggle product error:', error);
    res.status(500).json({ error: 'Failed to toggle product status' });
  }
};
