import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ShopCard from '@/components/shop/ShopCard';
import { supabase } from '@/integrations/supabase/client';
import type { Shop } from '@/types';

const PLACEHOLDER_LOGO = 'https://placehold.co/200x200?text=Shop';
const PLACEHOLDER_BANNER = 'https://placehold.co/1200x400?text=Shop';

function mapDbShopToShop(row: {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  banner: string | null;
  bio: string | null;
  location: string | null;
  is_verified: boolean | null;
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
    rating: 0,
    reviewCount: 0,
    followerCount: 0,
    productCount: 0,
    isVerified: row.is_verified ?? false,
    location: row.location ?? undefined,
  };
}

const FeaturedShops = () => {
  const [featuredShops, setFeaturedShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, slug, logo, banner, bio, location, is_verified, categories(name)')
        .eq('is_verified', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(8);
      setLoading(false);
      if (!error && data && data.length > 0) {
        setFeaturedShops(data.map((r) => mapDbShopToShop(r)));
      }
    })();
  }, []);

  return (
    <section className="py-12 sm:py-16">
      <div className="container px-8 sm:px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl font-bold sm:text-3xl"
            >
              Featured Shops
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-2 text-muted-foreground"
            >
              Discover our handpicked collection of verified sellers
            </motion.p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:flex">
            <Link to="/shops">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory hide-scrollbar pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 sm:overflow-x-visible sm:snap-none sm:mx-0 sm:px-0 sm:pb-0">
              {featuredShops.map((shop, index) => (
                <ShopCard key={shop.id} shop={shop} index={index} className="w-[280px] shrink-0 snap-start sm:w-auto sm:shrink sm:snap-none" />
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Button asChild variant="outline">
                <Link to="/shops">
                  View All Shops
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default FeaturedShops;
