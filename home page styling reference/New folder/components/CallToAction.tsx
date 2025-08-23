import { Button } from "./ui/button";

export function CallToAction() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-800" />
      
      {/* Prominent gradient beam */}
      <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-2 bg-gradient-to-r from-transparent via-[#dfe42d] via-orange-500 via-red-500 to-transparent opacity-40 blur-sm" />
      
      {/* Large glowing orb */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[800px] h-[400px] bg-gradient-to-r from-[#dfe42d]/20 via-orange-500/15 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* Main Glass Card */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/15 to-white/5 border border-white/30 rounded-3xl p-16 text-center shadow-2xl">
          {/* Accent decoration */}
          <div className="inline-block mb-8">
            <div className="w-20 h-1 bg-gradient-to-r from-[#dfe42d] to-orange-500 rounded-full mx-auto mb-2" />
            <div className="w-12 h-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mx-auto" />
          </div>

          <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              Ready to build your
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#dfe42d] via-orange-500 to-red-500 bg-clip-text text-transparent">
              first cap?
            </span>
          </h2>

          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join thousands of satisfied customers who've created their perfect custom caps. 
            Start designing today with our intuitive configurator.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button 
              size="lg" 
              className="px-12 py-8 text-xl bg-gradient-to-r from-[#dfe42d] to-orange-500 hover:from-orange-500 hover:to-red-500 text-black font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-[#dfe42d]/30"
            >
              Open Configurator
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="px-12 py-8 text-xl border-2 border-white/40 text-white hover:bg-white/10 hover:border-[#dfe42d] rounded-2xl transition-all duration-300 backdrop-blur-sm"
            >
              See Templates
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 pt-8 border-t border-white/20">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-[#dfe42d] to-orange-500 bg-clip-text text-transparent mb-2">
                  50K+
                </div>
                <div className="text-gray-400">Caps Created</div>
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-[#dfe42d] to-orange-500 bg-clip-text text-transparent mb-2">
                  4.9★
                </div>
                <div className="text-gray-400">Customer Rating</div>
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-[#dfe42d] to-orange-500 bg-clip-text text-transparent mb-2">
                  24h
                </div>
                <div className="text-gray-400">Fast Shipping</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}