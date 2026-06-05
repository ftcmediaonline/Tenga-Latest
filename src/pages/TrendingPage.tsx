import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Heart, Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import CartDrawer from '@/components/layout/CartDrawer';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import type { Product, Shop } from '@/types';

const PLACEHOLDER_IMAGE = 'https://placehold.co/600x600?text=Product';
const PLACEHOLDER_LOGO = 'https://placehold.co/200x200?text=Shop';

function mapDbProductToProduct(row: {
  id: string;
  shop_id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  like_count: number | null;
  rating: number | null;
  review_count: number | null;
  created_at: string | null;
  product_images?: { image_url: string }[];
  shops?: { id: string; name: string; slug: string; logo: string | null; categories?: { name: string } | null } | null;
}): Product {
  const images = row.product_images?.length
    ? row.product_images.map((i) => i.image_url)
    : [PLACEHOLDER_IMAGE];
  const categoryName = row.shops?.categories?.name ?? '';
  return {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    slug: row.slug,
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    images,
    description: '',
    category: categoryName,
    inStock: true,
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    likeCount: row.like_count ?? 0,
    createdAt: row.created_at ?? '',
  };
}

function mapDbRowToShop(row: {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  categories?: { name: string } | null;
}): Shop {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo ?? PLACEHOLDER_LOGO,
    banner: 'https://placehold.co/1200x400?text=Shop',
    bio: '',
    category: row.categories?.name ?? '—',
    rating: 0,
    reviewCount: 0,
    followerCount: 0,
    productCount: 0,
    isVerified: true,
  };
}

const TrendingPage = () => {
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [shopsMap, setShopsMap] = useState<Record<string, Shop>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: productRows, error } = await supabase
        .from('products')
        .select('*, product_images(image_url), shops(id, name, slug, logo, categories(name))')
        .eq('is_trending', true)
        .order('like_count', { ascending: false, nullsFirst: false })
        .limit(20);
      setLoading(false);
      if (!error && productRows && productRows.length > 0) {
        const shopMap: Record<string, Shop> = {};
        productRows.forEach((r) => {
          if (r.shops) {
            shopMap[r.shop_id] = mapDbRowToShop(r.shops as { id: string; name: string; slug: string; logo: string | null; categories?: { name: string } | null });
          }
        });
        setShopsMap(shopMap);

        const productIds = productRows.map((r) => r.id);
        let ratingByProduct: Record<string, { sum: number; count: number }> = {};
        if (productIds.length > 0) {
          const { data: reviewRows } = await supabase
            .from('reviews')
            .select('product_id, rating')
            .in('product_id', productIds);
          (reviewRows ?? []).forEach((r: { product_id: string; rating: number }) => {
            const id = r.product_id;
            if (!id || r.rating == null) return;
            if (!ratingByProduct[id]) ratingByProduct[id] = { sum: 0, count: 0 };
            ratingByProduct[id].sum += r.rating;
            ratingByProduct[id].count += 1;
          });
        }

        const mapped = productRows.map((row) => {
          const p = mapDbProductToProduct(row);
          const agg = ratingByProduct[row.id];
          if (agg && agg.count > 0) {
            p.rating = Math.round((agg.sum / agg.count) * 10) / 10;
            p.reviewCount = agg.count;
          }
          return p;
        });
        setTrendingProducts(mapped);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CartDrawer />

      <div className="container py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold md:text-4xl">Trending Now</h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            Top 20 most loved products on Tenga
          </motion.p>
        </div>

        {/* Trending Products */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {trendingProducts.map((product, index) => {
            const shop = shopsMap[product.shopId];
            return (
              <div key={product.id} className="relative">
                {/* Rank Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="absolute -left-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground shadow-lg"
                >
                  {index + 1}
                </motion.div>
                
                <ProductCard
                  product={product}
                  shop={shop}
                  index={index}
                />
                
                {/* Like Count Badge */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 + 0.2 }}
                  className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-medium backdrop-blur-sm"
                >
                  <Heart className="h-3 w-3 fill-primary text-primary" />
                  {product.likeCount}
                </motion.div>
              </div>
            );
          })}
        </div>
        )}

        {/* Empty State */}
        {trendingProducts.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-secondary mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No trending products yet</h3>
            <p className="text-muted-foreground">
              Check back later for popular items
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default TrendingPage;
