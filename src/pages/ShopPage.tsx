import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BadgeCheck, MapPin, Star, Grid3X3, Share2, MessageCircle, ChevronLeft, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductCard from '@/components/product/ProductCard';
import { ShopMessagePanel } from '@/components/shop/ShopMessagePanel';
import Header from '@/components/layout/Header';
import CartDrawer from '@/components/layout/CartDrawer';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Shop, Product } from '@/types';

const PLACEHOLDER_LOGO = 'https://placehold.co/200x200?text=Shop';
const PLACEHOLDER_BANNER = 'https://placehold.co/1200x400?text=Shop';
const PLACEHOLDER_PRODUCT = 'https://placehold.co/600x600?text=Product';

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
  contact_email?: string | null;
  contact_phone?: string | null;
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
    contactEmail: row.contact_email ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
  };
}

function mapDbProductToProduct(row: {
  id: string;
  shop_id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  description: string | null;
  in_stock: boolean | null;
  stock_count: number | null;
  rating: number | null;
  review_count: number | null;
  like_count: number | null;
  created_at: string | null;
  product_images?: { image_url: string }[];
}): Product {
  const images = row.product_images?.length
    ? row.product_images.map((i) => i.image_url)
    : [PLACEHOLDER_PRODUCT];
  return {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    slug: row.slug,
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    images,
    description: row.description ?? '',
    category: '',
    inStock: row.in_stock ?? true,
    stockCount: row.stock_count ?? undefined,
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    likeCount: row.like_count ?? 0,
    createdAt: row.created_at ?? '',
  };
}

const ShopPage = () => {
  const { slug: slugParam } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopOwnerId, setShopOwnerId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPendingPreview, setIsPendingPreview] = useState(false);
  const [messagePanelOpen, setMessagePanelOpen] = useState(false);

  const handleShare = async () => {
    const shopSlug = slugParam ?? shop?.slug;
    if (!shopSlug) return;
    const url = `${window.location.origin}/shop/${shopSlug}`;
    const title = shop?.name ?? 'Shop';
    const text = shop?.name ? `Check out ${shop.name}` : undefined;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        toast({ title: 'Link shared', description: 'Thanks for sharing!' });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') copyFallback(url);
      }
    } else {
      copyFallback(url);
    }
  };

  const copyFallback = (url: string) => {
    if (!navigator.clipboard?.writeText) {
      toast({ title: 'Copy link', description: url, variant: 'destructive' });
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => toast({ title: 'Link copied', description: 'Shop link copied to clipboard.' }),
      () => toast({ title: 'Could not copy', description: 'Please copy the URL from your browser.', variant: 'destructive' })
    );
  };

  const handleFollow = async () => {
    if (!shop) return;
    if (!user) {
      toast({ title: 'Sign in to follow', description: 'Create an account or sign in to follow shops.', variant: 'destructive' });
      return;
    }
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('shop_followers')
          .delete()
          .eq('user_id', user.id)
          .eq('shop_id', shop.id);
        if (error) throw error;
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
        toast({ title: 'Unfollowed', description: `You unfollowed ${shop.name}.` });
      } else {
        const { error } = await supabase
          .from('shop_followers')
          .insert({ user_id: user.id, shop_id: shop.id });
        if (error) throw error;
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
        toast({ title: 'Following', description: `You are now following ${shop.name}.` });
      }
    } catch (e) {
      toast({ title: 'Could not update follow', description: (e as Error).message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!slugParam) {
      setLoading(false);
      return;
    }
    setIsPendingPreview(false);
    (async () => {
      const { data: verifiedRow } = await supabase
        .from('shops')
        .select('*, categories(name)')
        .eq('slug', slugParam)
        .eq('is_verified', true)
        .maybeSingle();

      let shopRow = verifiedRow;

      if (!shopRow && user) {
        let profileData: { role: string | null } | null = null;
        const byId = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        profileData = byId.data;
        if (profileData == null) {
          const byUserId = await supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle();
          profileData = byUserId.data;
        }
        if (profileData?.role === 'admin') {
          const { data: pendingRow } = await supabase
            .from('shops')
            .select('*, categories(name)')
            .eq('slug', slugParam)
            .maybeSingle();
          if (pendingRow) {
            shopRow = pendingRow;
            setIsPendingPreview(true);
          }
        }
      }

      if (shopRow) {
        const mapped = mapDbShopToShop(shopRow);
        setShop(mapped);
        setShopOwnerId((shopRow as { owner_id?: string }).owner_id ?? null);
        const { data: productRows } = await supabase
          .from('products')
          .select('*, product_images(image_url)')
          .eq('shop_id', shopRow.id);
        const productIds = (productRows ?? []).map((p) => p.id);
        let ratingByProduct: Record<string, { sum: number; count: number }> = {};
        if (productIds.length > 0) {
          const { data: reviewRows } = await supabase
            .from('reviews')
            .select('product_id, rating')
            .in('product_id', productIds);
          (reviewRows ?? []).forEach((r) => {
            const id = r.product_id;
            if (!id || r.rating == null) return;
            if (!ratingByProduct[id]) ratingByProduct[id] = { sum: 0, count: 0 };
            ratingByProduct[id].sum += r.rating;
            ratingByProduct[id].count += 1;
          });
        }
        const productList = (productRows ?? []).map((row) => {
          const p = mapDbProductToProduct(row);
          const agg = ratingByProduct[row.id];
          if (agg && agg.count > 0) {
            p.rating = Math.round((agg.sum / agg.count) * 10) / 10;
            p.reviewCount = agg.count;
          }
          return p;
        });
        setProducts(productList);
        const n = Object.values(ratingByProduct).reduce((a, x) => a + x.count, 0);
        const sum = Object.values(ratingByProduct).reduce((a, x) => a + x.sum, 0);
        if (n > 0) {
          setRating(Math.round((sum / n) * 10) / 10);
          setReviewCount(n);
        } else {
          setRating(0);
          setReviewCount(0);
        }
        const { count } = await supabase
          .from('shop_followers')
          .select('*', { count: 'exact', head: true })
          .eq('shop_id', shopRow.id);
        setFollowerCount(typeof count === 'number' ? count : 0);
        const uid = (await supabase.auth.getUser()).data.user?.id;
        if (uid) {
          const { data: followRow } = await supabase
            .from('shop_followers')
            .select('shop_id')
            .eq('user_id', uid)
            .eq('shop_id', shopRow.id)
            .maybeSingle();
          setIsFollowing(!!followRow);
        } else {
          setIsFollowing(false);
        }
      } else {
        setShopOwnerId(null);
      }
      setLoading(false);
    })();
  }, [slugParam, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Shop not found</h1>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CartDrawer />

      {isPendingPreview && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-800 dark:text-amber-200 px-4 py-3 text-center text-sm font-medium">
          This shop is pending approval. Only you (admin) can see this preview.
        </div>
      )}

      {/* Back Button (Mobile) */}
      <div className="container py-4 px-4 sm:px-6 md:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      {/* Banner */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img
          src={shop.banner}
          alt={shop.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
      </div>

      {/* Shop Info */}
      <div className="container relative px-4 sm:px-6">
        <div className="relative -mt-16 md:-mt-20 pb-6 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <img
                src={shop.logo}
                alt={shop.name}
                className="h-28 w-28 md:h-36 md:w-36 rounded-2xl border-4 border-background object-cover shadow-lg"
              />
              {shop.isVerified && (
                <div className="absolute -bottom-2 -right-2 rounded-full bg-primary p-2 shadow-md">
                  <BadgeCheck className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
            </motion.div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="min-w-0">
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xl font-bold sm:text-2xl md:text-3xl flex flex-wrap items-center gap-2"
                  >
                    {shop.name}
                    {shop.isVerified && (
                      <span className="text-xs font-normal text-primary bg-accent px-2 py-1 rounded-full">
                        Verified
                      </span>
                    )}
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-1 text-muted-foreground flex items-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    {shop.location}
                    <span className="mx-2">•</span>
                    <span className="text-sm px-2 py-0.5 bg-secondary rounded-full">
                      {shop.category}
                    </span>
                  </motion.p>
                </div>

                {/* Actions - wrap on small screens, touch-friendly */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <Button
                    type="button"
                    onClick={handleFollow}
                    className={isFollowing ? 'min-h-[44px] px-4 sm:px-6 bg-secondary text-secondary-foreground hover:bg-secondary/80' : 'min-h-[44px] px-4 sm:px-6 bg-gradient-primary'}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 min-w-[44px]"
                    title="Message seller"
                    onClick={() => setMessagePanelOpen(true)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-11 w-11 min-w-[44px]" onClick={handleShare} title="Share shop link">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>

              {/* Bio */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-4 text-foreground max-w-2xl"
              >
                {shop.bio}
              </motion.p>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 flex flex-wrap items-center gap-4 sm:gap-6"
              >
                <div className="text-center">
                  <div className="text-xl font-bold">{products.length}</div>
                  <div className="text-xs text-muted-foreground">Products</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{followerCount >= 1000 ? `${(followerCount / 1000).toFixed(1)}K` : followerCount}</div>
                  <div className="text-xs text-muted-foreground">Followers</div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-warning text-warning" />
                  <span className="text-xl font-bold">{rating}</span>
                  <span className="text-xs text-muted-foreground">({reviewCount} reviews)</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <Tabs defaultValue="products" className="mt-6">
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
            <TabsTrigger
              value="products"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              <Grid3X3 className="h-4 w-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              <Star className="h-4 w-4 mr-2" />
              Reviews
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6 pb-12">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
{products.map((product, index) => (
                <ProductCard key={product.id} product={product} shop={shop} index={index} />
              ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-6 pb-12">
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Customer Reviews</h3>
              <p className="text-muted-foreground">
                Reviews will appear here when customers share their experiences.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ShopMessagePanel
        shop={{ id: shop.id, name: shop.name }}
        ownerId={shopOwnerId}
        userId={user?.id ?? null}
        open={messagePanelOpen}
        onOpenChange={setMessagePanelOpen}
      />

      <Footer />
    </div>
  );
};

export default ShopPage;
