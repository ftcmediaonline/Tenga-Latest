import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  created_at: string | null;
  product_images?: { image_url: string }[];
  shops?: { name: string; slug: string; logo: string | null; categories?: { name: string } | null } | null;
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
    rating: 0,
    reviewCount: 0,
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

const TrendingProducts = () => {
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [shopsMap, setShopsMap] = useState<Record<string, Shop>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: productRows, error } = await supabase
        .from('products')
        .select('*, product_images(image_url), shops(id, name, slug, logo, categories(name))')
        .eq('is_trending', true)
        .limit(8);
      setLoading(false);
      if (!error && productRows && productRows.length > 0) {
        const shopMap: Record<string, Shop> = {};
        productRows.forEach((r) => {
          if (r.shops) {
            shopMap[r.shop_id] = mapDbRowToShop(r.shops as { id: string; name: string; slug: string; logo: string | null; categories?: { name: string } | null });
          }
        });
        setShopsMap(shopMap);
        setTrendingProducts(productRows.map((row) => mapDbProductToProduct(row)));
      }
    })();
  }, []);

  return (
    <section className="py-8 sm:py-12 md:py-16">
      <div className="container px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 mb-2"
            >
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Hot right now</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold sm:text-3xl"
            >
              Trending Products
            </motion.h2>
          </div>
          <Button asChild variant="ghost" className="hidden sm:flex">
            <Link to="/trending">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 pb-4 sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:gap-6 sm:overflow-x-visible sm:snap-none sm:mx-0 sm:px-0 sm:pb-0">
            {trendingProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                shop={shopsMap[product.shopId]}
                index={index}
                className="w-[185px] shrink-0 snap-start sm:w-auto sm:shrink sm:snap-none"
              />
            ))}
          </div>
        )}

        {/* Mobile CTA */}
        <div className="mt-6 text-center sm:hidden">
          <Button asChild variant="outline">
            <Link to="/trending">
              View All Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TrendingProducts;
