import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/layout/Header';
import CartDrawer from '@/components/layout/CartDrawer';
import Footer from '@/components/layout/Footer';
import ShopCard from '@/components/shop/ShopCard';
import { supabase } from '@/integrations/supabase/client';
import type { Shop } from '@/types';
import { cn } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';

const PLACEHOLDER_LOGO = 'https://placehold.co/200x200?text=Shop';
const PLACEHOLDER_BANNER = 'https://placehold.co/1200x400?text=Shop';

function mapDbShopToShop(row: {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  banner: string | null;
  bio: string | null;
  category_id: string | null;
  location: string | null;
  is_verified: boolean | null;
  rating: number | null;
  review_count: number | null;
  follower_count: number | null;
  product_count: number | null;
  categories?: { name: string } | null;
}): Shop {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo ?? PLACEHOLDER_LOGO,
    banner: row.banner ?? PLACEHOLDER_BANNER,
    bio: row.bio ?? '',
    category: row.categories?.name ?? '—',
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    followerCount: row.follower_count ?? 0,
    productCount: row.product_count ?? 0,
    isVerified: row.is_verified ?? false,
    location: row.location ?? undefined,
  };
}

const ShopsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: shopRows, error } = await supabase
        .from('shops')
        .select('*, categories(name)')
        .eq('is_verified', true)
        .order('created_at', { ascending: false });
      if (error || !shopRows) {
        setShops([]);
        setLoading(false);
        return;
      }
      // Get real product counts per shop (shops.product_count is not auto-updated)
      const shopIds = shopRows.map((r) => r.id);
      const { data: productRows } = await supabase.from('products').select('id, shop_id').in('shop_id', shopIds);
      const countByShop: Record<string, number> = {};
      const productToShop: Record<string, string> = {};
      (productRows ?? []).forEach((p) => {
        countByShop[p.shop_id] = (countByShop[p.shop_id] ?? 0) + 1;
        productToShop[p.id] = p.shop_id;
      });
      const productIds = Object.keys(productToShop);
      let ratingByShop: Record<string, { sum: number; count: number }> = {};
      if (productIds.length > 0) {
        const { data: reviewRows } = await supabase.from('reviews').select('product_id, rating').in('product_id', productIds);
        (reviewRows ?? []).forEach((r) => {
          const shopId = productToShop[r.product_id];
          if (!shopId || r.rating == null) return;
          if (!ratingByShop[shopId]) ratingByShop[shopId] = { sum: 0, count: 0 };
          ratingByShop[shopId].sum += r.rating;
          ratingByShop[shopId].count += 1;
        });
      }
      const { data: followerRows } = await supabase.from('shop_followers').select('shop_id').in('shop_id', shopIds);
      const followerCountByShop: Record<string, number> = {};
      (followerRows ?? []).forEach((r) => {
        followerCountByShop[r.shop_id] = (followerCountByShop[r.shop_id] ?? 0) + 1;
      });
      const approvedShops: Shop[] = shopRows.map((row) => {
        const mapped = mapDbShopToShop(row);
        mapped.productCount = countByShop[row.id] ?? 0;
        mapped.followerCount = followerCountByShop[row.id] ?? 0;
        const agg = ratingByShop[row.id];
        if (agg && agg.count > 0) {
          mapped.rating = Math.round((agg.sum / agg.count) * 10) / 10;
          mapped.reviewCount = agg.count;
        }
        return mapped;
      });
      setShops(approvedShops);
      setLoading(false);
    })();
  }, []);

  const searchTerms = searchQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const filteredShops = shops.filter((shop) => {
    const searchableText = [shop.name, shop.bio ?? ''].join(' ').toLowerCase();
    const matchesSearch =
      searchTerms.length === 0 ||
      searchTerms.every((term) => searchableText.includes(term));
    const matchesCategory = !selectedCategory || shop.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = [...new Set(shops.map(shop => shop.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CartDrawer />

      <div className="container py-6 sm:py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold md:text-4xl"
          >
            Discover Shops
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-2 text-muted-foreground"
          >
            Find your new favorite stores from our curated collection
          </motion.p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search shops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-3 py-2.5 sm:py-2 bg-secondary border-0 text-base sm:text-sm"
            />
          </div>
          <Button
            variant="outline"
            className="sm:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {selectedCategory && (
              <span className="ml-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                1
              </span>
            )}
          </Button>
        </div>

        {/* Category Filters */}
        <motion.div
          initial={false}
          animate={{ height: showFilters || window.innerWidth >= 640 ? 'auto' : 0 }}
          className="overflow-hidden sm:overflow-visible sm:h-auto"
        >
          <div className="flex flex-wrap gap-2 mb-8">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "rounded-full",
                selectedCategory === null && "bg-gradient-primary"
              )}
            >
              All Shops
            </Button>
            {uniqueCategories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "rounded-full",
                  selectedCategory === category && "bg-gradient-primary"
                )}
              >
                {category}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Results */}
        {loading ? (
          <PageLoader fullScreen={false} />
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-secondary mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No shops found</h3>
            <p className="text-muted-foreground mb-4">
              {shops.length === 0
                ? 'No approved shops yet. Check back later.'
                : 'Try adjusting your search or filters'}
            </p>
            {shops.length > 0 && (
              <Button onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Showing {filteredShops.length} shop{filteredShops.length !== 1 && 's'}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredShops.map((shop, index) => (
                <ShopCard key={shop.id} shop={shop} index={index} />
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ShopsPage;
