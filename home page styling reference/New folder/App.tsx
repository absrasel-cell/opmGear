import { HeroSection } from "./components/HeroSection";
import { TabSection } from "./components/TabSection";
import { ProductCarousel } from "./components/ProductCarousel";
import { CallToAction } from "./components/CallToAction";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-x-hidden">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Tabbed Section - How It Works / Mission & Vision */}
      <TabSection />
      
      {/* Featured Products Carousel */}
      <ProductCarousel />
      
      {/* Final Call-to-Action */}
      <CallToAction />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}