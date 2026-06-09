import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  next();
};

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('whatsapp').matches(/^01[0125]\d{8}$/).withMessage('Valid WhatsApp number required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  handleValidationErrors
];

export const loginValidation = [
  body('whatsapp').matches(/^01[0125]\d{8}$/).withMessage('Valid WhatsApp number required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

export const adminLoginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

export const profileUpdateValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  body('whatsapp').optional({ checkFalsy: true }).matches(/^01[0125]\d{8}$/).withMessage('Valid WhatsApp number required'),
  handleValidationErrors
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  handleValidationErrors
];

export const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('image_url').notEmpty().withMessage('Image URL is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('wholesale_price').optional().isFloat({ min: 0 }).withMessage('Wholesale price must be a positive number'),
  body('description').optional().trim(),
  body('category_id').optional({ nullable: true, values: 'falsy' }).isUUID(),
  body('badge').optional().isIn(['best_seller', 'featured', 'most_requested', 'new_arrival', 'none']),
  body('stock').optional().isInt({ min: 0 }),
  body('sort_order').optional().isInt({ min: 0 }),
  handleValidationErrors
];

export const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('slug').trim().notEmpty().withMessage('Slug is required'),
  body('description').optional().trim(),
  body('sort_order').optional().isInt({ min: 0 }),
  handleValidationErrors
];

export const orderValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id').isUUID().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shipping_address').isObject().withMessage('Shipping address is required'),
  body('shipping_address.name').notEmpty().withMessage('Recipient name is required'),
  body('shipping_address.whatsapp').notEmpty().withMessage('WhatsApp number is required'),
  body('shipping_address.address').notEmpty().withMessage('Address is required'),
  body('shipping_address.city').notEmpty().withMessage('City is required'),
  handleValidationErrors
];

export const orderStatusValidation = [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid order status'),
  body('notes').optional().trim(),
  body('tracking_number').optional({ nullable: true }).trim(),
  body('estimated_delivery').optional({ nullable: true }).isISO8601().withMessage('Estimated delivery must be a valid date'),
  body('actual_delivery').optional({ nullable: true }).isISO8601().withMessage('Actual delivery must be a valid date'),
  handleValidationErrors
];

export const userRoleValidation = [
  body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin'),
  handleValidationErrors
];

export const regionValidation = [
  body('name').trim().notEmpty().withMessage('اسم المنطقة مطلوب'),
  body('shipping_cost').isFloat({ min: 0 }).withMessage('يجب أن يكون سعر الشحن رقماً موجباً'),
  handleValidationErrors
];
