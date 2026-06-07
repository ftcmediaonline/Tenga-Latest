import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, UserPlus, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import CartDrawer from '@/components/layout/CartDrawer';
import Footer from '@/components/layout/Footer';
import ShopCard from '@/components/shop/ShopCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Shop } from '@/types';
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

const FollowingPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowing = async (uid: string) => {
    const { data: followRows } = await supabase
      .from('shop_followers')
      .select('shop_id')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    const shopIds = (followRows ?? []).map((r) => r.shop_id);
    if (shopIds.length === 0) {
      setShops([]);
      setLoading(false);
      return;
    }
    const { data: shopRows } = await supabase
      .from('shops')
      .select('*, categories(name)')
      .in('id', shopIds)
      .eq('is_verified', true);
    if (!shopRows?.length) {
      setShops([]);
      setLoading(false);
      return;
    }
    const { data: productRows } = await supabase.from('products').select('shop_id').in('shop_id', shopIds);
    const countByShop: Record<string, number> = {};
    (productRows ?? []).forEach((p) => {
      countByShop[p.shop_id] = (countByShop[p.shop_id] ?? 0) + 1;
    });
    const { data: followerRows } = await supabase.from('shop_followers').select('shop_id').in('shop_id', shopIds);
    const followerCountByShop: Record<string, number> = {};
    (followerRows ?? []).forEach((r) => {
      followerCountByShop[r.shop_id] = (followerCountByShop[r.shop_id] ?? 0) + 1;
    });
    const { data: productIdRows } = await supabase.from('products').select('id, shop_id').in('shop_id', shopIds);
    const productToShop: Record<string, string> = {};
    (productIdRows ?? []).forEach((p) => { productToShop[p.id] = p.shop_id; });
    const ids = Object.keys(productToShop);
    let ratingByShop: Record<string, { sum: number; count: number }> = {};
    if (ids.length > 0) {
      const { data: reviewRows } = await supabase.from('reviews').select('product_id, rating').in('product_id', ids);
      (reviewRows ?? []).forEach((r) => {
        const shopId = productToShop[r.product_id];
        if (!shopId || r.rating == null) return;
        if (!ratingByShop[shopId]) ratingByShop[shopId] = { sum: 0, count: 0 };
        ratingByShop[shopId].sum += r.rating;
        ratingByShop[shopId].count += 1;
      });
    }
    const list: Shop[] = shopRows.map((row) => {
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
    setShops(list);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      setShops([]);
      setLoading(false);
      return;
    }
    fetchFollowing(user.id);
  }, [user?.id]);

  const handleUnfollow = async (shop: Shop) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('shop_followers')
        .delete()
        .eq('user_id', user.id)
        .eq('shop_id', shop.id);
      if (error) throw error;
      setShops((prev) => prev.filter((s) => s.id !== shop.id));
      toast({ title: 'Unfollowed', description: `You unfollowed ${shop.name}.` });
    } catch (e) {
      toast({ title: 'Could not unfollow', description: (e as Error).message, variant: 'destructive' });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <CartDrawer />
        <div className="container py-16 flex flex-col items-center justify-center text-center">
          <UserPlus className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your followed shops</h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            Sign in to see and manage the shops you follow.
          </p>
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CartDrawer />
      <div className="container py-8 px-4 sm:px-6">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold md:text-4xl flex items-center gap-2"
        >
          <Store className="h-8 w-8" />
          Shops you follow
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-2 text-muted-foreground"
        >
          {shops.length === 0
            ? "You aren't following any shops yet. Discover shops and tap Follow on a shop page."
            : `${shops.length} shop${shops.length === 1 ? '' : 's'}`}
        </motion.p>

        {shops.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border"
          >
            <Store className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No followed shops yet</p>
            <Button asChild variant="outline">
              <Link to="/shops">Discover shops</Link>
            </Button>
          </motion.div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop, index) => (
              <motion.div
                key={shop.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                <ShopCard shop={shop} index={index} />
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleUnfollow(shop)}
                    className="text-muted-foreground"
                  >
                    Unfollow
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default FollowingPage;
