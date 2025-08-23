import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";

export function TabSection() {
  const [activeTab, setActiveTab] = useState("how-it-works");

  const steps = [
    {
      icon: "🧢",
      title: "Pick Base Cap",
      description: "Choose from snapback, trucker, dad cap, performance, and more premium styles."
    },
    {
      icon: "🎨",
      title: "Add Logos",
      description: "Upload your design or use our library. Multiple placement options available."
    },
    {
      icon: "✨",
      title: "Add Accessories",
      description: "Premium pins, patches, custom tags, and special materials to make it unique."
    },
    {
      icon: "🚚",
      title: "Choose Shipping",
      description: "Fast standard shipping or rush delivery options to meet your timeline."
    },
    {
      icon: "💳",
      title: "Cost & Checkout",
      description: "Transparent pricing with no hidden fees. Pay securely and track your order."
    }
  ];

  const values = [
    {
      title: "Mission",
      description: "Empowering individuals and teams to express their identity through premium custom headwear that tells their unique story."
    },
    {
      title: "Vision", 
      description: "To become the world's most trusted platform for custom cap creation, where quality meets creativity without compromise."
    },
    {
      title: "Impact",
      description: "Supporting local communities through ethical manufacturing while delivering sustainable, high-quality products that last."
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-800" />
      
      {/* Subtle gradient orbs */}
      <div className="absolute top-1/4 right-20 w-64 h-64 bg-gradient-to-r from-purple-500/10 to-[#dfe42d]/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Glass tab buttons */}
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-transparent p-2 mb-16">
            <TabsTrigger 
              value="how-it-works"
              className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#dfe42d] data-[state=active]:to-orange-500 data-[state=active]:text-black transition-all duration-300"
            >
              How It Works
            </TabsTrigger>
            <TabsTrigger 
              value="mission"
              className="backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#dfe42d] data-[state=active]:to-orange-500 data-[state=active]:text-black transition-all duration-300"
            >
              Mission & Vision
            </TabsTrigger>
          </TabsList>

          <TabsContent value="how-it-works" className="mt-0">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-[#dfe42d] to-orange-500 bg-clip-text text-transparent">
                  How It Works
                </span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Five simple steps to create your perfect custom cap
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
              {steps.map((step, index) => (
                <Card key={index} className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 p-8 text-center hover:bg-white/15 transition-all duration-300 group">
                  <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">{step.title}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{step.description}</p>
                  
                  {/* Step number */}
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-[#dfe42d] to-orange-500 rounded-full flex items-center justify-center text-black font-bold text-sm">
                    {index + 1}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="mission" className="mt-0">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-purple-400 to-[#dfe42d] bg-clip-text text-transparent">
                  Our Purpose
                </span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Driven by quality, community, and creative expression
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {values.map((value, index) => (
                <Card key={index} className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 p-12 text-center hover:bg-white/15 transition-all duration-300 group">
                  <h3 className="text-2xl font-bold mb-8">
                    <span className="bg-gradient-to-r from-[#dfe42d] to-orange-500 bg-clip-text text-transparent">
                      {value.title}
                    </span>
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-lg">{value.description}</p>
                  
                  {/* Accent line */}
                  <div className="mt-8 w-16 h-1 bg-gradient-to-r from-[#dfe42d] to-orange-500 mx-auto group-hover:w-24 transition-all duration-300" />
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}