import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Star, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Header from '@/components/layout/Header';
import CartDrawer from '@/components/layout/CartDrawer';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Product, Shop } from '@/types';
import { cn } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';

const PLACEHOLDER_IMAGE = 'https://placehold.co/600x600?text=Product';
const PLACEHOLDER_LOGO = 'https://placehold.co/200x200?text=Shop';

type ReviewDisplay = {
  id: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  images?: string[];
  ownerReply?: string;
  ownerRepliedAt?: string;
};

function mapDbProductToProduct(row: {
  id: string;
  shop_id: string;
  name: string;
  slug: string;
  price: number;
  product_images?: { image_url: string }[];
}): Product {
  const images = row.product_images?.length
    ? row.product_images.map((i) => i.image_url)
    : [PLACEHOLDER_IMAGE];
  return {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    slug: row.slug,
    price: row.price,
    images,
    description: '',
    category: '',
    inStock: true,
    rating: 0,
    reviewCount: 0,
    likeCount: 0,
    createdAt: '',
  };
}

function mapDbShopToShop(row: { id: string; name: string; slug: string; logo: string | null; bio: string | null }): Shop {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo ?? PLACEHOLDER_LOGO,
    banner: PLACEHOLDER_LOGO,
    bio: row.bio ?? '',
    category: '—',
    rating: 0,
    reviewCount: 0,
    followerCount: 0,
    productCount: 0,
    isVerified: true,
  };
}

const ReviewPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [reviews, setReviews] = useState<ReviewDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [formRating, setFormRating] = useState<number>(0);
  const [formComment, setFormComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: productRows } = await supabase
        .from('products')
        .select('*, product_images(image_url)')
        .eq('slug', slug)
        .limit(1);

      const productRow = productRows?.[0] || null;

      if (productRow) {
        setProduct(mapDbProductToProduct(productRow));
        const { data: shopRow } = await supabase
          .from('shops')
          .select('id, name, slug, logo, bio')
          .eq('id', productRow.shop_id)
          .single();
        if (shopRow) setShop(mapDbShopToShop(shopRow));
        const { data: reviewRows } = await supabase
          .from('reviews')
          .select('id, user_id, product_id, rating, comment, created_at, owner_reply, owner_replied_at')
          .eq('product_id', productRow.id)
          .order('created_at', { ascending: false });
        setReviews(
          (reviewRows ?? []).map((r) => ({
            id: r.id,
            userId: r.user_id ?? undefined,
            userName: 'Customer',
            rating: r.rating ?? 0,
            comment: r.comment ?? '',
            createdAt: r.created_at ?? '',
            ownerReply: r.owner_reply ?? undefined,
            ownerRepliedAt: r.owner_replied_at ?? undefined,
          }))
        );
      }
      setLoading(false);
    })();
  }, [slug]);

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) ratingBreakdown[Math.round(r.rating) as keyof typeof ratingBreakdown]++;
  });
  const totalReviews = reviews.length;
  const alreadyReviewed = user && product && reviews.some((r) => r.userId === user.id);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product || formRating < 1 || formRating > 5) {
      setFormError('Please choose a rating (1–5 stars).');
      return;
    }
    const comment = formComment.trim();
    if (!comment) {
      setFormError('Please write your review.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    const { data: inserted, error } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        product_id: product.id,
        rating: formRating,
        comment,
      })
      .select('id, user_id, product_id, rating, comment, created_at')
      .single();
    setSubmitting(false);
    if (error) {
      toast({ title: 'Could not submit review', description: error.message, variant: 'destructive' });
      return;
    }
    setReviews((prev) => [
      {
        id: inserted.id,
        userId: inserted.user_id ?? undefined,
        userName: 'You',
        rating: inserted.rating ?? 0,
        comment: inserted.comment ?? '',
        createdAt: inserted.created_at ?? new Date().toISOString(),
      },
      ...prev,
    ]);
    setFormRating(0);
    setFormComment('');
    toast({ title: 'Review submitted', description: 'Thanks for your feedback!' });
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!product || !shop) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
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

      {/* Back Button */}
      <div className="container py-4 px-4 sm:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/product/${product.slug}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Product
          </Link>
        </Button>
      </div>

      <div className="container pb-12 px-4 sm:px-6">
        {/* Product Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 mb-8"
        >
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-20 w-20 rounded-xl object-cover"
          />
          <div>
            <h1 className="text-xl font-bold">{product.name}</h1>
            <Link to={`/shop/${shop.slug}`} className="text-sm text-muted-foreground hover:text-primary">
              {shop.name}
            </Link>
          </div>
        </motion.div>

        {/* Rating Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-8 md:grid-cols-2 mb-8 p-6 rounded-2xl bg-secondary"
        >
          {/* Average Rating */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <span className="text-5xl font-bold">{averageRating}</span>
              <div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-5 w-5",
                        star <= Math.round(averageRating)
                          ? "fill-warning text-warning"
                          : "fill-muted text-muted"
                      )}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on {totalReviews} reviews
                </p>
              </div>
            </div>
          </div>

          {/* Rating Breakdown */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingBreakdown[rating];
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  </div>
                  <Progress value={percentage} className="flex-1 h-2" />
                  <span className="text-sm text-muted-foreground w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Write a review */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Write a review</h2>
          {!user ? (
            <div className="p-6 rounded-xl bg-muted/50 border border-border text-center">
              <p className="text-muted-foreground mb-3">Sign in to leave a review for this product.</p>
              <Button asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          ) : alreadyReviewed ? (
            <div className="p-6 rounded-xl bg-muted/50 border border-border text-center">
              <p className="text-muted-foreground">You've already reviewed this product.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="p-6 rounded-xl bg-card border border-border space-y-4">
              <div>
                <Label className="text-sm font-medium">Your rating</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormRating(star)}
                      className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={cn(
                          'h-8 w-8 transition-colors',
                          star <= formRating ? 'fill-warning text-warning' : 'text-muted'
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="review-comment" className="text-sm font-medium">Your review</Label>
                <Textarea
                  id="review-comment"
                  placeholder="Share your experience with this product..."
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  rows={4}
                  className="mt-2"
                  maxLength={2000}
                />
              </div>
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit review'}
              </Button>
            </form>
          )}
        </div>

        {/* Reviews List */}
        <div>
          <h2 className="text-lg font-semibold mb-4">All Reviews ({totalReviews})</h2>
          
          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-secondary rounded-2xl">
              <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
              <p className="text-muted-foreground">Be the first to review this product!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                  className="p-4 rounded-xl bg-card border border-border"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {review.userName === 'Anonymous' || !review.userAvatar ? (
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                    ) : (
                      <img
                        src={review.userAvatar}
                        alt={review.userName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    )}

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {review.userName === 'Anonymous' ? 'Anonymous User' : review.userName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      {/* Stars */}
                      <div className="flex mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "h-4 w-4",
                              star <= review.rating
                                ? "fill-warning text-warning"
                                : "fill-muted text-muted"
                            )}
                          />
                        ))}
                      </div>

                      {/* Comment */}
                      <p className="text-muted-foreground text-sm">{review.comment}</p>

                      {/* Seller reply */}
                      {review.ownerReply && (
                        <div className="mt-3 pl-3 border-l-2 border-primary/30 bg-muted/30 rounded-r-md p-2 text-sm">
                          <p className="font-medium text-foreground mb-0.5">Seller&apos;s reply</p>
                          <p className="text-muted-foreground">{review.ownerReply}</p>
                        </div>
                      )}

                      {/* Review Images */}
                      {review.images && review.images.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {review.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Review image ${idx + 1}`}
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ReviewPage;
