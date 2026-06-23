import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Index from "./pages/Index";
import ShopsPage from "./pages/ShopsPage";
import ShopPage from "./pages/ShopPage";
import DiscoverPage from "./pages/DiscoverPage";
import SearchPage from "./pages/SearchPage";
import ProductPage from "./pages/ProductPage";
import ReviewPage from "./pages/ReviewPage";
import CategoriesPage from "./pages/CategoriesPage";
import TrendingPage from "./pages/TrendingPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import OrderFailedPage from "./pages/OrderFailedPage";
import OpenShopPage from "./pages/OpenShopPage";
import AuthPage from "./pages/AuthPage";
import HelpCenterPage from "./pages/HelpCenterPage";
import ContactUsPage from "./pages/ContactUsPage";
import ContactSalesPage from "./pages/ContactSalesPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import SellerDashboardPage from "./pages/SellerDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import DevDashboardPage from "./pages/DevDashboardPage";
import PricingPage from "./pages/PricingPage";
import UpgradeShopPage from "./pages/UpgradeShopPage";
import SuccessStoriesPage from "./pages/SuccessStoriesPage";
import WishlistPage from "./pages/WishlistPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import FollowingPage from "./pages/FollowingPage";
import ProfilePage from "./pages/ProfilePage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import NotFound from "./pages/NotFound";

// Redirect clean routes / callbacks to hash routes for HashRouter compatibility (especially Supabase auth redirects)
const checkAuthRedirect = () => {
  const path = window.location.pathname;
  const search = window.location.search;
  const hash = window.location.hash;
  const params = new URLSearchParams(search);
  
  if (path === '/auth' || path.startsWith('/auth/')) {
    window.location.replace(`${window.location.origin}/#/auth${search}${hash}`);
    return true;
  }

  if (path === '/order-confirmation' || path.startsWith('/order-confirmation/')) {
    window.location.replace(`${window.location.origin}/#/order-confirmation${search}${hash}`);
    return true;
  }

  if (path === '/checkout' || path.startsWith('/checkout/')) {
    window.location.replace(`${window.location.origin}/#/checkout${search}${hash}`);
    return true;
  }

  if (path === '/order-failed' || path.startsWith('/order-failed/')) {
    window.location.replace(`${window.location.origin}/#/order-failed${search}${hash}`);
    return true;
  }
  
  if (path === '/' && (params.has('code') || params.has('error') || hash.includes('access_token=') || hash.includes('error='))) {
    if (!hash.includes('/auth')) {
      window.location.replace(`${window.location.origin}/#/auth${search}${hash}`);
      return true;
    }
  }
  
  return false;
};

checkAuthRedirect();

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <HashRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <CartProvider>
            <WishlistProvider>
              <Toaster />
              <Sonner />
              <ScrollToTop />
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/shops" element={<ShopsPage />} />
              <Route path="/shop/:slug" element={<ShopPage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/product/:slug" element={<ProductPage />} />
              <Route path="/product/:slug/reviews" element={<ReviewPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/trending" element={<TrendingPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
              <Route path="/order-failed" element={<OrderFailedPage />} />
              <Route path="/open-shop" element={<OpenShopPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/help-center" element={<HelpCenterPage />} />
              <Route path="/contact-us" element={<ContactUsPage />} />
              <Route path="/contact-sales" element={<ContactSalesPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-of-service" element={<TermsOfServicePage />} />
              <Route path="/seller-dashboard" element={<SellerDashboardPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/dev" element={<DevDashboardPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/upgrade-plan" element={<UpgradeShopPage />} />
              <Route path="/success-stories" element={<SuccessStoriesPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/orders" element={<OrderHistoryPage />} />
              <Route path="/following" element={<FollowingPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </WishlistProvider>
          </CartProvider>
        </HashRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
