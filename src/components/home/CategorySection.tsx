import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { fetchCategories } from '@/data/categories';
import type { Category } from '@/types';
const CategorySection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then((data) => {
      setCategories(data);
      setLoading(false);
    });
  }, []);

  if (loading || categories.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-secondary/50">
      <div className="container px-8 sm:px-6">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl font-bold sm:text-2xl md:text-3xl"
          >
            Shop by Category
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground"
          >
            Find exactly what you're looking for
          </motion.p>
        </div>

        {/* Categories Carousel / Grid */}
        <div className="flex flex-row overflow-x-auto gap-3 snap-x snap-mandatory hide-scrollbar py-1.5 sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:gap-4 sm:overflow-x-visible sm:snap-none sm:mx-0 sm:px-0 sm:py-0">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="w-[115px] shrink-0 snap-start sm:w-auto sm:shrink sm:snap-none"
              >
                <Link
                  to={`/discover?category=${encodeURIComponent(category.name)}`}
                  className="group flex flex-col items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-background p-4 sm:p-6 shadow-card transition-all hover:shadow-card-hover active:scale-[0.98] min-h-[105px] sm:min-h-0 justify-center h-full"
                >
                  <Icon className="h-7 w-7 sm:h-10 sm:w-10 text-primary" />
                  <div className="text-center">
                    <span className="block text-[11px] sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {category.name}
                    </span>
                    <span className="text-[9px] sm:text-xs text-muted-foreground">
                      {category.productCount > 0 ? `${category.productCount.toLocaleString()} items` : 'Browse'}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
