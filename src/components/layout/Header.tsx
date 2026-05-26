import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, User, Menu, X, Heart, Sun, Moon, LogOut, Shield, Store, Package, UserPlus, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import tengaLogo from '@/assets/tenga-logo.png';
import tengaLogoWhite from '@/assets/tenga-logo-white.png';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [hasShop, setHasShop] = useState(false);

  useEffect(() => {
    const path = location.pathname;
    const q = searchParams.get('q') ?? '';
    if (path === '/search' || path === '/discover') {
      setSearchQuery(q);
    }
  }, [location.pathname, searchParams.get('q')]);
  const { totalItems, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setIsDev(false);
      setHasShop(false);
      return;
    }
    supabase
      .from('profiles')
      .select('role, is_dev')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data: byId }) => {
        if (byId != null) {
          setIsAdmin(byId.role === 'admin');
          setIsDev(byId.is_dev === true);
          return;
        }
        supabase
          .from('profiles')
          .select('role, is_dev')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data: byUserId }) => {
            const role = byUserId?.role ?? null;
            setIsAdmin(role === 'admin');
            setIsDev(byUserId?.is_dev === true);
          });
      });
    supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data }) => setHasShop(!!data));
  }, [user]);

  const navLinks = [
    { name: 'Discover', href: '/discover' },
    { name: 'Shops', href: '/shops' },
    { name: 'Categories', href: '/categories' },
    { name: 'Trending', href: '/trending' },
    { name: 'Following', href: '/following' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchQuery(q);
      setIsSearchOpen(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="container flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 min-h-[44px] min-w-[44px] -ml-2 flex-shrink-0">
          <img src={theme === 'dark' ? tengaLogoWhite : tengaLogo} alt="Tenga Virtual Mall" className="h-11 w-auto sm:h-10" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.name}
            </Link>
          ))}
          {hasShop && (
            <Link
              to="/seller-dashboard"
              className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1.5"
            >
              <Store className="h-4 w-4" />
              Seller
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1.5"
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
          {isDev && (
            <Link
              to="/dev"
              className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1.5"
            >
              <Code2 className="h-4 w-4" />
              Dev
            </Link>
          )}
        </nav>

        {/* Search Bar - Desktop / Tablet */}
        <form onSubmit={handleSearch} className="hidden flex-1 max-w-md md:flex min-w-0 md:min-w-[160px] items-center" role="search">
          <div className="relative w-full min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search products, shops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-3 py-2 sm:py-2.5 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary text-base sm:text-sm"
              aria-label="Search products and shops"
            />
          </div>
        </form>

        {/* Actions - touch-friendly icon size */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-11 w-11 touch-target"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Dark Mode Toggle */}
          <Button variant="ghost" size="icon" className="hidden md:flex h-11 w-11 touch-target" onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          {/* Wishlist */}
          <Button variant="ghost" size="icon" className="hidden sm:flex h-11 w-11 touch-target" asChild>
            <Link to="/wishlist" className="relative hidden sm:flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
                >
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </motion.span>
              )}
            </Link>
          </Button>

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-11 w-11 touch-target"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingBag className="h-5 w-5" />
            {totalItems > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
              >
                {totalItems}
              </motion.span>
            )}
          </Button>

          {/* User */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden md:flex h-11 w-11 touch-target">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/orders">
                    <Package className="h-4 w-4 mr-2" />
                    Order history
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/following">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Following
                  </Link>
                </DropdownMenuItem>
                {hasShop && (
                  <DropdownMenuItem asChild>
                    <Link to="/seller-dashboard">
                      <Store className="h-4 w-4 mr-2" />
                      Seller dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon" className="hidden md:flex h-11 w-11 touch-target" onClick={() => navigate('/auth')}>
              <User className="h-5 w-5" />
            </Button>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-11 w-11 touch-target"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Search */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border md:hidden overflow-hidden"
          >
            <form onSubmit={handleSearch} className="container py-3 px-4 sm:px-6 flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Search products, shops..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 bg-secondary border-0"
                  autoFocus
                  aria-label="Search products and shops"
                />
              </div>
              <Button type="submit" size="sm">Search</Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border md:hidden overflow-hidden"
          >
            <nav className="container py-4 flex flex-col gap-0.5 px-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="px-4 py-3.5 min-h-[48px] flex items-center text-base font-medium text-foreground rounded-lg hover:bg-secondary active:bg-secondary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to="/wishlist"
                className="px-4 py-3.5 min-h-[48px] flex items-center text-base font-medium text-foreground rounded-lg hover:bg-secondary active:bg-secondary transition-colors gap-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Heart className="h-4 w-4" />
                Wishlist
                {wishlistCount > 0 && (
                  <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              {/* Theme Toggle inside Mobile Drawer */}
              <button
                onClick={() => {
                  toggleTheme();
                  setIsMobileMenuOpen(false);
                }}
                className="px-4 py-3.5 min-h-[48px] flex items-center text-base font-medium text-foreground rounded-lg hover:bg-secondary active:bg-secondary transition-colors gap-2 w-full text-left"
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="h-4 w-4" />
                    Dark Mode
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4" />
                    Light Mode
                  </>
                )}
              </button>
              
              {!user && (
                <Link
                  to="/auth"
                  className="px-4 py-3.5 min-h-[48px] flex items-center text-base font-medium text-foreground rounded-lg hover:bg-secondary active:bg-secondary transition-colors gap-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Sign In / Register
                </Link>
              )}

              {user && (
                <>
                  <Link
                    to="/profile"
                    className="px-4 py-3.5 min-h-[48px] flex items-center text-base font-medium text-foreground rounded-lg hover:bg-secondary active:bg-secondary transition-colors gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    to="/orders"
                    className="px-4 py-3.5 min-h-[48px] flex items-center text-base font-medium text-foreground rounded-lg hover:bg-secondary active:bg-secondary transition-colors gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Package className="h-4 w-4" />
                    Order history
                  </Link>
                  <Link
                    to="/following"
                    className="px-4 py-3.5 min-h-[48px] flex items-center text-base font-medium text-foreground rounded-lg hover:bg-secondary active:bg-secondary transition-colors gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <UserPlus className="h-4 w-4" />
                    Following
                  </Link>
                  {hasShop && (
                    <Link
                      to="/seller-dashboard"
                      className="px-4 py-3.5 min-h-[48px] flex items-center text-base font-medium text-foreground rounded-lg hover:bg-secondary active:bg-secondary transition-colors gap-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Store className="h-4 w-4" />
                      Seller dashboard
                    </Link>
                  )}
                </>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-4 py-3.5 min-h-[48px] flex items-center text-base font-medium text-foreground rounded-lg hover:bg-secondary active:bg-secondary transition-colors gap-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}
              {isDev && (
                <Link
                  to="/dev"
                  className="px-4 py-3.5 min-h-[48px] flex items-center text-base font-medium text-foreground rounded-lg hover:bg-secondary active:bg-secondary transition-colors gap-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Code2 className="h-4 w-4" />
                  Dev
                </Link>
              )}
              {user && (
                <button
                  onClick={() => {
                    signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-4 py-3.5 min-h-[48px] flex items-center text-base font-medium text-destructive rounded-lg hover:bg-secondary active:bg-secondary transition-colors gap-2 w-full text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
