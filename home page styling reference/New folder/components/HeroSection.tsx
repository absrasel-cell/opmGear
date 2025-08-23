import { Button } from "./ui/button";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-800" />
      
      {/* Floating gradient orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-to-r from-[#dfe42d]/30 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500/20 to-red-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
      
      {/* Glassmorphism navigation */}
      <nav className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-8 py-4">
          <div className="flex items-center space-x-8">
            <div className="text-2xl font-bold bg-gradient-to-r from-[#dfe42d] to-orange-500 bg-clip-text text-transparent">
              OPM Gear
            </div>
            <div className="hidden md:flex space-x-6">
              <a href="#products" className="text-white/80 hover:text-[#dfe42d] transition-colors">Products</a>
              <a href="#how-it-works" className="text-white/80 hover:text-[#dfe42d] transition-colors">How It Works</a>
              <a href="#pricing" className="text-white/80 hover:text-[#dfe42d] transition-colors">Pricing</a>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Floating glass card */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-12 shadow-2xl">
          <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Custom Caps,
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#dfe42d] via-orange-500 to-red-500 bg-clip-text text-transparent">
              Built Your Way.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Configure styles, add custom logos, choose premium accessories, and enjoy completely transparent pricing for your perfect cap.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button 
              size="lg" 
              className="px-8 py-6 text-lg bg-gradient-to-r from-[#dfe42d] to-orange-500 hover:from-orange-500 hover:to-red-500 text-black font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-[#dfe42d]/25"
            >
              Start Configuring
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="px-8 py-6 text-lg border-2 border-white/30 text-white hover:bg-white/10 hover:border-[#dfe42d] rounded-xl transition-all duration-300 backdrop-blur-sm"
            >
              Browse Products
            </Button>
            
            <Button 
              variant="ghost" 
              size="lg" 
              className="px-8 py-6 text-lg text-gray-300 hover:text-[#dfe42d] hover:bg-white/5 rounded-xl transition-all duration-300"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </div>
      
      {/* Gradient beam effect */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-[#dfe42d] to-transparent opacity-60" />
    </section>
  );
}