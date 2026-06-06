import Header from '@/components/layout/Header';
import CartDrawer from '@/components/layout/CartDrawer';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/home/HeroSection';
import CategorySection from '@/components/home/CategorySection';
import VideoCarousel from '@/components/home/VideoCarousel';
import FeaturedShops from '@/components/home/FeaturedShops';
import TrendingProducts from '@/components/home/TrendingProducts';
import PromoBanner from '@/components/home/PromoBanner';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CartDrawer />

      <main>
        <HeroSection />
        <CategorySection />
        <VideoCarousel />
        <FeaturedShops />
        <TrendingProducts />
        <PromoBanner />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
