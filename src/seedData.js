import pool from './config/database.js';
import { Category } from './models/Category.js';
import { Product } from './models/Product.js';

const categories = [
    { name: 'التمور السيوية', slug: 'dates', description: 'تمور مختارة من نخيل سيوة', sort_order: 1 },
    { name: 'الزيوت السيوية', slug: 'oils', description: 'زيوت طبيعية وعطرية عالية الجودة (شاملة زيت الزيتون)', sort_order: 2 },
    { name: 'العناية والتجميل', slug: 'care', description: 'منتجات العناية الطبيعية والبرطمانات المستوحاة من بيئة سيوة (الزيتون والمربات الطبيعية)', sort_order: 3 },
    { name: 'الأباجورات السيوية', slug: 'lamps', description: 'منتجات ديكور وإضاءة بروح الواحة (أباجورات شجر الزيتون الملحية)', sort_order: 4 },
    { name: 'الشموع والأعشاب السيوية', slug: 'herbs', description: 'خلطات عشبية وغذائية خاصة بالواحة', sort_order: 5 }
];

const products = [
    // Dates
    { categorySlug: 'dates', name: 'تمور لّاب (كيلو)', price: 245, description: 'تمور لّاب مختارة بعناية وزن 1 كيلو، حلاوة طبيعية وفوائد غذائية عالية.', stock: 100 },
    { categorySlug: 'dates', name: 'علبة تمور لوز / كاجو', price: 150, description: 'تمور فاخرة محشوة باللوز والكاجو الطازج.', stock: 100 },
    { categorySlug: 'dates', name: 'تمور لّاب (1/2 كيلو)', price: 145, description: 'تمور لّاب مختارة بعناية وزن نصف كيلو.', stock: 100 },
    { categorySlug: 'dates', name: 'كرتونة تمور (1600 جم)', price: 125, description: 'كرتونة تمور سيوية وزن 1600 جرام، مناسبة للعائلات.', stock: 100 },
    { categorySlug: 'dates', name: 'معمول سيوة', price: 115, description: 'معمول سيوة اللذيذ المصنوع بالتمر السيوى الطبيعى.', stock: 100 },
    { categorySlug: 'dates', name: 'كرتونة تمور (700 جم)', price: 70, description: 'كرتونة تمور سيوية اقتصادية وزن 700 جرام.', stock: 100 },

    // Oils
    { categorySlug: 'oils', name: 'صفيحة زيت زيتون', price: 5500, description: 'صفيحة زيت زيتون بكر ممتاز عصرة أولى على البارد، طبيعي 100%.', stock: 100 },
    { categorySlug: 'oils', name: 'زجاجة زيت زيتون (لتر)', price: 520, description: 'زيت زيتون سيوي أصلي سعة 1 لتر، للحفاظ على الصحة والمناعة.', stock: 100 },
    { categorySlug: 'oils', name: 'جركن زيت زيتون (لتر)', price: 440, description: 'جركن زيت زيتون سيوي سعة 1 لتر، اقتصادي وممتاز للطبخ.', stock: 100 },
    { categorySlug: 'oils', name: 'زجاجة زيت زيتون (1/2 لتر)', price: 290, description: 'زجاجة نصف لتر زيت زيتون سيوي عصرة أولى.', stock: 100 },
    { categorySlug: 'oils', name: 'زجاجة زيت زيتون (1/4 لتر)', price: 160, description: 'زجاجة ربع لتر زيت زيتون، مثالية للتجربة أو الاستخدام الشخصي.', stock: 100 },

    // Care
    { categorySlug: 'care', name: 'زيتون تفاحي (برطمان)', price: 120, description: 'زيتون تفاحي سيوى مخلل بطرق تقليدية طبيعية.', stock: 100 },
    { categorySlug: 'care', name: 'زيتون أخضريوس (برطمان)', price: 120, description: 'زيتون أخضريوس مميز بطعمه القوي وفوائده العظيمة.', stock: 100 },
    { categorySlug: 'care', name: 'زيتون عادي (برطمان)', price: 110, description: 'برطمان زيتون سيوي عادي، لا غنى عنه في كل بيت.', stock: 100 },
    { categorySlug: 'care', name: 'زيتون كلاماتا (برطمان)', price: 150, description: 'زيتون كلاماتا فاخر مخلل بعناية، مثالي للوجبات.', stock: 100 },
    { categorySlug: 'care', name: 'مربى زيتون', price: 95, description: 'مربى الزيتون السيوية، طعم مبتكر ومفيد جداً.', stock: 100 },
    { categorySlug: 'care', name: 'مربى كركديه', price: 95, description: 'مربى كركديه غنية بفيتامين سي وطعم رائع.', stock: 100 },
    { categorySlug: 'care', name: 'مربى بتنجان', price: 95, description: 'مربى بتنجان سيوية فريدة من نوعها ومن التراث المحلي.', stock: 100 },

    // Lamps
    { categorySlug: 'lamps', name: 'أباجورة ملح وشجر زيتون (الحجم الأكبر)', price: 650, description: 'أباجورة ملح طبيعي مع قاعدة من شجر الزيتون، تنقي الهواء وتعطي طاقة إيجابية - الحجم الأكبر.', stock: 50 },
    { categorySlug: 'lamps', name: 'أباجورة ملح وشجر زيتون (الحجم الثاني)', price: 550, description: 'أباجورة ديكور من الملح الصخري وخشب الزيتون - الحجم الثاني.', stock: 50 },
    { categorySlug: 'lamps', name: 'أباجورة ملح وشجر زيتون (الحجم الثالث)', price: 420, description: 'إضاءة خافتة ومريحة للأعصاب بأباجورة الملح السيوية - الحجم الثالث.', stock: 50 },
    { categorySlug: 'lamps', name: 'أباجورة ملح وشجر زيتون (الحجم الرابع)', price: 385, description: 'أباجورة طبيعية 100% من سيوه، تضفي جواً من الهدوء - الحجم الرابع.', stock: 50 },
    { categorySlug: 'lamps', name: 'أباجورة ملح وشجر زيتون (الحجم الأصغر)', price: 290, description: 'أباجورة ملح صغيرة، مناسبة للمكاتب وغرف النوم.', stock: 50 },

    // Herbs
    { categorySlug: 'herbs', name: 'شنطة نجمة سيوة محشية بأطعمة', price: 500, description: 'شنطة تحتوي على خلطات عشبية وغذائية طبيعية مميزة من التراث السيوي الدافيء.', stock: 50 }
];

async function seed() {
    try {
        console.log('Starting seed process...');

        // 1. Insert categories if they don't exist
        const exCategories = await Category.findAll();
        const exSlugs = exCategories.map(c => c.slug);

        for (const cat of categories) {
            if (!exSlugs.includes(cat.slug)) {
                await Category.create(cat);
                console.log(`Created category: ${cat.name}`);
            } else {
                console.log(`Category exists: ${cat.name}`);
            }
        }

        // Refresh categories mapping
        const finalCategories = await Category.findAll();
        const categoryMap = {};
        for (const cat of finalCategories) {
            categoryMap[cat.slug] = cat.id;
        }

        // 2. Insert products
        for (const prod of products) {
            const category_id = categoryMap[prod.categorySlug];
            if (!category_id) {
                console.error(`Category ID not found for slug: ${prod.categorySlug}`);
                continue;
            }

            const newProduct = {
                name: prod.name,
                description: prod.description,
                price: prod.price,
                category_id: category_id,
                stock: prod.stock,
                is_active: true,
                image_url: 'https://images.unsplash.com/photo-1600661653561-629509216228?q=80&w=600&auto=format&fit=crop' // Olive related placeholder
            };

            await Product.create(newProduct);
            console.log(`Created product: ${newProduct.name}`);
        }

        console.log('Seed completed successfully!');
    } catch (error) {
        console.error('Failed to seed DB:', error);
    } finally {
        await pool.end();
    }
}

seed();
