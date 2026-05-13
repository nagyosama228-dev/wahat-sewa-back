import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        image_url TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        description TEXT,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        badge TEXT DEFAULT 'none' CHECK (badge IN ('best_seller', 'featured', 'most_requested', 'new_arrival', 'none')),
        stock INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0
    `);

    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'products_badge_check'
            AND table_name = 'products'
        ) THEN
          ALTER TABLE products DROP CONSTRAINT products_badge_check;
        END IF;
      END $$;
    `);

    await client.query(`
      ALTER TABLE products
      ADD CONSTRAINT products_badge_check
      CHECK (badge IN ('best_seller', 'featured', 'most_requested', 'new_arrival', 'none'))
    `);

    // Orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        total_amount DECIMAL(10, 2) NOT NULL,
        shipping_cost DECIMAL(10, 2) DEFAULT 45.00,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
        shipping_address JSONB NOT NULL,
        tracking_number TEXT,
        estimated_delivery DATE,
        actual_delivery DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Order items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        price_at_purchase DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Order status history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('order_update', 'promotion', 'system')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_badge ON products(badge)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)');

    // Create function to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create triggers for updated_at
    await client.query('DROP TRIGGER IF EXISTS update_users_updated_at ON users');
    await client.query(`
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await client.query('DROP TRIGGER IF EXISTS update_products_updated_at ON products');
    await client.query(`
      CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await client.query('DROP TRIGGER IF EXISTS update_orders_updated_at ON orders');
    await client.query(`
      CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // Insert default admin user (password: admin123)
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash('admin123', 12);
    
    await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['Admin', 'admin@wahatsewa.com', hashedPassword, 'admin']);

    // Insert default categories
    await client.query(`
      INSERT INTO categories (name, slug, description)
      VALUES 
        ('الأعشاب السيوية', 'herbs', 'الأعشاب الطبيعية القادمة من واحة سيوة'),
        ('التمور السيوية', 'dates', 'تمور مختارة من نخيل سيوة'),
        ('الزيوت السيوية', 'oils', 'زيوت طبيعية وعطرية عالية الجودة'),
        ('العناية والتجميل', 'care', 'منتجات العناية الطبيعية المستوحاة من سيوة'),
        ('الأباجورات السيوية', 'lamps', 'منتجات ديكور وإضاءة بروح الواحة'),
        ('الشموع', 'candles', 'شموع عطرية ولمسات منزلية دافئة')
      ON CONFLICT (slug) DO NOTHING
    `);

    await client.query(`
      UPDATE categories
      SET sort_order = seeded.sort_order
      FROM (
        VALUES
          ('herbs', 1),
          ('dates', 2),
          ('oils', 3),
          ('care', 4),
          ('lamps', 5),
          ('candles', 6)
      ) AS seeded(slug, sort_order)
      WHERE categories.slug = seeded.slug
    `);

    await client.query(`
      INSERT INTO products (name, image_url, price, description, category_id, badge, stock, sort_order, is_active)
      SELECT seed.name, seed.image_url, seed.price, seed.description, c.id, seed.badge, seed.stock, seed.sort_order, true
      FROM (
        VALUES
          ('زيت الزيتون البكر الممتاز', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200&q=80', 320.00, 'زيت زيتون نقي من سيوة بعصرة أولى على البارد، مناسب للطهي والضيافة.', 'oils', 'best_seller', 40, 1),
          ('تمر سيوة الفاخر', 'https://images.unsplash.com/photo-1615485925873-6b0c2b2f9f9d?w=1200&q=80', 185.00, 'تمر فاخر بقوام طري وحلاوة طبيعية، مناسب للهدايا والضيافة.', 'dates', 'most_requested', 60, 2),
          ('شاي الأعشاب السيوي', 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=1200&q=80', 95.00, 'خليط أعشاب طبيعية مجففة بعناية من واحة سيوة.', 'herbs', 'new_arrival', 50, 3),
          ('زيت الأركان للعناية', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=1200&q=80', 280.00, 'زيت طبيعي غني للعناية بالبشرة والشعر بامتصاص سريع.', 'care', 'featured', 25, 4),
          ('أباجورة سيوية يدوية', 'https://images.unsplash.com/photo-1540932297044-c13724e59e6c?w=1200&q=80', 490.00, 'قطعة ديكور بإضاءة دافئة وتصميم يدوي مستوحى من البيئة السيوية.', 'lamps', 'featured', 12, 5),
          ('شمعة عطرية طبيعية', 'https://images.unsplash.com/photo-1602825269784-0109043c5c17?w=1200&q=80', 150.00, 'شمعة طبيعية بروائح هادئة تمنح المنزل لمسة دافئة ومميزة.', 'candles', 'new_arrival', 30, 6)
      ) AS seed(name, image_url, price, description, category_slug, badge, stock, sort_order)
      JOIN categories c ON c.slug = seed.category_slug
      WHERE NOT EXISTS (
        SELECT 1
        FROM products existing
        WHERE existing.name = seed.name
      )
    `);

    await client.query('COMMIT');
    console.log('Database tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

createTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
