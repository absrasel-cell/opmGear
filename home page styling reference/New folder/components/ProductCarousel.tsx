import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function ProductCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const products = [
    {
      id: 1,
      title: "Snapback Classic",
      image: "https://images.unsplash.com/photo-1737666636073-f15d9762cf83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNlYmFsbCUyMGNhcCUyMHNuYXBiYWNrJTIwaGF0fGVufDF8fHx8MTc1NTUyMTYwOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      description: "Adjustable snapback with structured crown and flat brim"
    },
    {
      id: 2,
      title: "Trucker Mesh",
      image: "https://images.unsplash.com/photo-1652909665128-0b9e6c10c165?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cnVja2VyJTIwbWVzaCUyMGNhcCUyMGhhdHxlbnwxfHx8fDE3NTU1MjE2MDl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      description: "Breathable mesh back with foam front panel design"
    },
    {
      id: 3,
      title: "Flat Bill Pro",
      image: "https://images.unsplash.com/photo-1737666636073-f15d9762cf83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmbGF0JTIwYmlsbCUyMGNhcCUyMGhhdHxlbnwxfHx8fDE3NTU1MjE2MTB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      description: "Modern flat brim style with premium materials"
    },
    {
      id: 4,
      title: "Dad Cap Vintage",
      image: "https://images.unsplash.com/photo-1610749359341-65c96bf609d5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYWQlMjBjYXAlMjB2aW50YWdlJTIwaGF0fGVufDF8fHx8MTc1NTUyMTYxMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      description: "Relaxed fit with curved brim and vintage aesthetic"
    },
    {
      id: 5,
      title: "Performance Cap",
      image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJmb3JtYW5jZSUyMGF0aGxldGljJTIwY2FwfGVufDF8fHx8MTc1NTUyMTYxMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      description: "Athletic design with moisture-wicking technology"
    },
    {
      id: 6,
      title: "Winter Beanie",
      image: "https://images.unsplash.com/flagged/photo-1552359480-7cc7cce64868?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFuaWUlMjB3aW50ZXIlMjBjYXB8ZW58MXx8fHwxNzU1NTIxNjEyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      description: "Cozy knit beanie perfect for cold weather customization"
    }
  ];

  // Auto-scroll every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [products.length]);

  const visibleProducts = () => {
    const items = [];
    for (let i = 0; i < 3; i++) {
      const index = (currentIndex + i) % products.length;
      items.push(products[index]);
    }
    return items;
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900" />
      
      {/* Floating gradient orbs */}
      <div className="absolute top-1/3 left-10 w-72 h-72 bg-gradient-to-r from-red-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-gradient-to-r from-[#dfe42d]/20 to-orange-500/20 rounded-full blur-3xl animate-pulse delay-500" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Featured
            </span>
            <span className="bg-gradient-to-r from-[#dfe42d] via-orange-500 to-red-500 bg-clip-text text-transparent">
              {" "}Products
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Discover our premium collection of customizable caps and headwear
          </p>
        </div>

        {/* Carousel */}
        <div className="relative">
          {/* Product Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {visibleProducts().map((product, index) => (
              <Card key={`${product.id}-${currentIndex}`} className="group backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-500 transform hover:scale-105">
                {/* Product Image */}
                <div className="relative h-64 overflow-hidden">
                  <ImageWithFallback
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Floating badge */}
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-[#dfe42d] to-orange-500 text-black px-3 py-1 rounded-full text-sm font-bold">
                    Popular
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-white mb-4">{product.title}</h3>
                  <p className="text-gray-300 mb-8 leading-relaxed">{product.description}</p>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <Button 
                      className="flex-1 bg-gradient-to-r from-[#dfe42d] to-orange-500 hover:from-orange-500 hover:to-red-500 text-black font-bold transition-all duration-300"
                    >
                      Configure
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-white/30 text-white hover:bg-white/10 hover:border-[#dfe42d] transition-all duration-300"
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Carousel Navigation Dots */}
          <div className="flex justify-center space-x-3">
            {products.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? "bg-gradient-to-r from-[#dfe42d] to-orange-500 scale-125" 
                    : "bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* View All Products Button */}
        <div className="text-center mt-12">
          <Button 
            size="lg"
            variant="outline" 
            className="px-12 py-6 text-lg border-2 border-white/30 text-white hover:bg-white/10 hover:border-[#dfe42d] rounded-xl transition-all duration-300 backdrop-blur-sm"
          >
            View All Products
          </Button>
        </div>
      </div>
    </section>
  );
}