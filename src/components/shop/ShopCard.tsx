import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Shop } from '@/types';

interface ShopCardProps {
  shop: Shop;
  index?: number;
  className?: string;
}

const ShopCard = ({ shop, index = 0, className }: ShopCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn("h-full", className)}
    >
      <Link
        to={`/shop/${shop.slug}`}
        className="group flex flex-col h-full overflow-hidden rounded-2xl bg-card shadow-card transition-all duration-300 hover:shadow-card-hover"
      >
        {/* Banner */}
        <div className="relative h-24 overflow-hidden">
          <img
            src={shop.banner}
            alt={shop.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative px-4 pb-4 flex flex-col flex-1">
          {/* Logo */}
          <div className="absolute -top-8 left-4">
            <div className="relative">
              <img
                src={shop.logo}
                alt={shop.name}
                className="h-16 w-16 rounded-xl border-4 border-card object-cover shadow-md"
              />
              {shop.isVerified && (
                <div className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1">
                  <BadgeCheck className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="pt-10 flex flex-col flex-1 justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {shop.name}
                </h3>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="font-medium">{shop.rating}</span>
                </div>
              </div>

              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                {shop.bio}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="line-clamp-1">{shop.location}</span>
              </div>
              <span className="font-medium text-foreground shrink-0">{shop.productCount} products</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ShopCard;
