import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart, ShoppingBag, Star, Minus, Plus,
  Share2, Truck, Shield, RotateCcw, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import CartDrawer from '@/components/layout/CartDrawer';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Product, Shop, Review } from '@/types';
import { cn } from '@/lib/utils';

import PageLoader from '@/components/ui/PageLoader';

const PLACEHOLDER_IMAGE = 'https://placehold.co/600x600?text=Product';
const PLACEHOLDER_LOGO = 'https://placehold.co/200x200?text=Shop';

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
    : [PLACEHOLDER_IMAGE];
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

function mapDbShopToShop(row: {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  banner: string | null;
  bio: string | null;
  location: string | null;
  categories?: { name: string } | null;
}): Shop {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo ?? PLACEHOLDER_LOGO,
    banner: row.banner ?? 'https://placehold.co/1200x400?text=Shop',
    bio: row.bio ?? '',
    category: row.categories?.name ?? '—',
    rating: 0,
    reviewCount: 0,
    followerCount: 0,
    productCount: 0,
    isVerified: true,
    location: row.location ?? undefined,
  };
}

const ProductPage = () => {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const isLiked = product ? isInWishlist(product.id) : false;

  const handleShare = async () => {
    if (!product?.slug) return;
    const url = `${window.location.origin}/product/${product.slug}`;
    const title = product.name;
    const text = `${product.name}${shop ? ` from ${shop.name}` : ''}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        toast({ title: 'Link shared', description: 'Thanks for sharing!' });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyFallback(url);
        }
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
      () => toast({ title: 'Link copied', description: 'Product link copied to clipboard.' }),
      () => toast({ title: 'Could not copy', description: 'Please copy the URL from your browser.', variant: 'destructive' })
    );
  };

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
        const mappedProduct = mapDbProductToProduct(productRow);
        const { data: shopRow } = await supabase
          .from('shops')
          .select('*, categories(name)')
          .eq('id', productRow.shop_id)
          .single();
        if (shopRow) setShop(mapDbShopToShop(shopRow));
        const { data: relatedRows } = await supabase
          .from('products')
          .select('*, product_images(image_url)')
          .eq('shop_id', productRow.shop_id)
          .neq('id', productRow.id)
          .limit(4);
        setRelatedProducts((relatedRows ?? []).map(mapDbProductToProduct));
        const { data: reviewRows } = await supabase
          .from('reviews')
          .select('*')
          .eq('product_id', productRow.id)
          .order('created_at', { ascending: false });
        const reviewList = reviewRows ?? [];
        if (reviewList.length > 0) {
          const sum = reviewList.reduce((a, r) => a + (r.rating ?? 0), 0);
          mappedProduct.rating = Math.round((sum / reviewList.length) * 10) / 10;
          mappedProduct.reviewCount = reviewList.length;
        }
        setProduct(mappedProduct);
        setReviews(
          reviewList.map((r) => ({
            id: r.id,
            productId: r.product_id ?? '',
            userId: r.user_id ?? '',
            userName: 'Customer',
            userAvatar: '',
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

  useEffect(() => {
    if (product && selectedVariants['Color'] && product.colorImages) {
      const colorImage = product.colorImages[selectedVariants['Color']];
      if (colorImage) {
        const imageIndex = product.images.findIndex(img => img === colorImage);
        if (imageIndex >= 0) setSelectedImage(imageIndex);
        else setSelectedImage(0);
      }
    }
  }, [selectedVariants, product]);

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

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedVariants, shop);
  };

  const handleVariantSelect = (variantName: string, option: string) => {
    setSelectedVariants(prev => ({ ...prev, [variantName]: option }));
  };

  // Get the current display image (considering color selection)
  const getCurrentImage = () => {
    if (selectedVariants['Color'] && product.colorImages?.[selectedVariants['Color']]) {
      return product.colorImages[selectedVariants['Color']];
    }
    return product.images[selectedImage];
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <CartDrawer />

      {/* Breadcrumb */}
      <div className="container py-4 px-4 sm:px-6 max-w-full">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link
            to={`/shop/${shop.slug}`}
            className="text-muted-foreground hover:text-foreground"
          >
            {shop.name}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground truncate">{product.name}</span>
        </div>
      </div>

      <div className="container pb-12 px-4 sm:px-6 max-w-full">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 min-w-0">
          {/* Images - constrain on mobile to prevent horizontal scroll */}
          <div className="space-y-4 min-w-0 max-w-full">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={getCurrentImage()}
              className="relative aspect-square overflow-hidden rounded-2xl bg-secondary max-w-full w-full mx-auto sm:mx-0"
            >
              <img
                src={getCurrentImage()}
                alt={product.name}
                className="h-full w-full object-cover max-w-full"
              />
              {discount && (
                <div className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
                  -{discount}%
                </div>
              )}
            </motion.div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedImage(index);
                      // Clear color selection if manually selecting thumbnail
                      if (selectedVariants['Color']) {
                        setSelectedVariants(prev => {
                          const { Color, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    className={cn(
                      "flex-shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border-2 transition-colors min-w-[64px]",
                      selectedImage === index && !selectedVariants['Color']
                        ? "border-primary"
                        : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6 min-w-0">
            {/* Shop */}
            <Link
              to={`/shop/${shop.slug}`}
              className="inline-flex items-center gap-3 rounded-full bg-secondary px-4 py-2 hover:bg-secondary/80 transition-colors"
            >
              <img
                src={shop.logo}
                alt={shop.name}
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="font-medium">{shop.name}</span>
            </Link>

            {/* Title & Price */}
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold md:text-3xl"
              >
                {product.name}
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-2 flex items-center gap-3"
              >
                {/* Clickable Rating */}
                <Link
                  to={`/product/${product.slug}/reviews`}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <Star className="h-5 w-5 fill-warning text-warning" />
                  <span className="font-medium">{product.rating}</span>
                  <span className="text-muted-foreground hover:text-primary hover:underline">
                    ({reviews.length} reviews)
                  </span>
                </Link>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {product.likeCount} likes
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-4 flex items-baseline gap-3"
              >
                <span className="text-3xl font-bold">${product.price.toFixed(2)}</span>
                {product.originalPrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
              </motion.div>
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-4">
                {product.variants.map((variant) => (
                  <div key={variant.id}>
                    <label className="text-sm font-medium mb-2 block">
                      {variant.name}
                      {selectedVariants[variant.name] && (
                        <span className="text-muted-foreground ml-2">
                          : {selectedVariants[variant.name]}
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {variant.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => handleVariantSelect(variant.name, option)}
                          className={cn(
                            "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                            selectedVariants[variant.name] === option
                              ? "border-primary bg-accent text-accent-foreground"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-sm font-medium mb-2 block">Quantity</label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-lg font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                {product.stockCount && (
                  <span className="text-sm text-muted-foreground">
                    {product.stockCount} in stock
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 h-14 text-base bg-gradient-primary"
                onClick={handleAddToCart}
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14"
                onClick={() => product && toggleWishlist(product.id)}
              >
                <Heart className={cn("h-5 w-5", isLiked && "fill-primary text-primary")} />
              </Button>
              <Button variant="outline" size="lg" className="h-14" onClick={handleShare} title="Share product link">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <Truck className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">Free Shipping</span>
              </div>
              <div className="text-center">
                <Shield className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">Secure Payment</span>
              </div>
              <div className="text-center">
                <RotateCcw className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">Easy Returns</span>
              </div>
            </div>

            {/* Description */}
            <div className="pt-4 border-t border-border">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{product.description}</p>
            </div>

            {/* Reviews Preview */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Customer Reviews</h3>
                <Link 
                  to={`/product/${product.slug}/reviews`}
                  className="text-sm text-primary hover:underline"
                >
                  View all ({reviews.length})
                </Link>
              </div>
              
              {reviews.slice(0, 2).map((review) => (
                <div key={review.id} className="mb-3 pb-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-3.5 w-3.5",
                            star <= review.rating
                              ? "fill-warning text-warning"
                              : "fill-muted text-muted"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {review.userName === 'Anonymous' ? 'Anonymous User' : review.userName}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{review.comment}</p>
                  {'ownerReply' in review && review.ownerReply && (
                    <div className="mt-2 pl-3 border-l-2 border-primary/30 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Seller: </span>
                      {review.ownerReply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold mb-6">More from {shop.name}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {relatedProducts.map((p, index) => (
                <ProductCard key={p.id} product={p} shop={shop} index={index} />
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ProductPage;
