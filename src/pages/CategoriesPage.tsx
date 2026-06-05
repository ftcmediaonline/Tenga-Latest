import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import CartDrawer from '@/components/layout/CartDrawer';
import Footer from '@/components/layout/Footer';
import { fetchCategories } from '@/data/categories';
import type { Category } from '@/types';
import { Loader2 } from 'lucide-react';

const categoryImages: Record<string, string> = {
  'Fashion': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop',
  'Electronics': 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400&h=400&fit=crop',
  'Home & Living': 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=400&fit=crop',
  'Beauty': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop',
  'Sports': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop',
  'Books': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=400&fit=crop',
  'Food & Drinks': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
  'Art & Crafts': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=400&fit=crop',
};

const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then((data) => {
      setCategories(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CartDrawer />

      <div className="container py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold md:text-4xl"
          >
            Categories
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-2 text-muted-foreground"
          >
            Browse products by category
          </motion.p>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category, index) => {
            const Icon = category.icon;
            const productCount = category.productCount ?? 0;
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/discover?category=${encodeURIComponent(category.name)}`}
                  className="group block overflow-hidden rounded-2xl bg-card relative aspect-square"
                >
                  {/* Background Image */}
                  <img
                    src={categoryImages[category.name] || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=400&fit=crop'}
                    alt={category.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-6 w-6 text-white" />
                      <h3 className="font-semibold text-white text-lg">
                        {category.name}
                      </h3>
                    </div>
                    <p className="text-white/80 text-sm">
                      {productCount} product{productCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default CategoriesPage;
