import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { Product, Shop } from '@/types';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  shop?: Shop;
  index?: number;
  variant?: 'default' | 'compact';
  className?: string;
}

const ProductCard = ({ product, shop, index = 0, variant = 'default', className }: ProductCardProps) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isLiked = isInWishlist(product.id);
  const [isHovered, setIsHovered] = useState(false);

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1, undefined, shop);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleReviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `/product/${product.slug}/reviews`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
    >
      <Link
        to={`/product/${product.slug}`}
        className="group block overflow-hidden rounded-2xl bg-card"
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-secondary">
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Discount Badge */}
          {discount && (
            <div className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
              -{discount}%
            </div>
          )}

          {/* Actions - always visible on touch (hover: none), show on hover on desktop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex gap-2 [@media(hover:none)]:opacity-100"
          >
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 sm:h-11 sm:w-11 min-w-[44px] rounded-full shadow-lg backdrop-blur-sm bg-background/80 hover:bg-background"
              onClick={handleLike}
            >
              <Heart className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-colors", isLiked && "fill-primary text-primary")} />
            </Button>
            <Button
              size="icon"
              className="h-9 w-9 sm:h-11 sm:w-11 min-w-[44px] rounded-full shadow-lg bg-gradient-primary hover:opacity-90"
              onClick={handleAddToCart}
            >
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-3">
          {shop && (
            <p className="text-xs text-muted-foreground mb-1">{shop.name}</p>
          )}
          <h3 className="font-medium text-sm text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>

            {variant === 'default' && (
              <button
                onClick={handleReviewClick}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                <span>{product.rating}</span>
                <span className="hidden sm:inline">({product.reviewCount})</span>
              </button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
