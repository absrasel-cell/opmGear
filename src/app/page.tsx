'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const slides = [
    {
      image: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Empowering Identity, Fueling Communities',
      subtitle: 'Custom headwear that reflects your identity and supports your goals',
      cta: 'Start Customizing'
    },
    {
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Every Cap Sold Supports Youth Sports',
      subtitle: 'Help bridge the financial gap for athletic programs',
      cta: 'Learn More'
    },
    {
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Build Your Brand, Not Just a Cap',
      subtitle: 'Retail-grade finishes for professional presentation',
      cta: 'Explore Options'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section with Slider */}
      <section className="relative h-screen overflow-hidden">
        {/* Background Slides */}
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute inset-0 bg-black/40 z-10" />
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${slide.image})`,
                filter: 'blur(2px)'
              }}
            />
          </div>
        ))}

        {/* Glass Hero Content */}
        <div className="relative z-20 h-full flex items-center justify-center">
          <div className={`text-center text-white transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <div className="backdrop-blur-md bg-white/10 rounded-3xl p-12 border border-white/20 shadow-2xl">
              <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                {slides[currentSlide].title}
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
                {slides[currentSlide].subtitle}
              </p>
              <Link
                href="/customize"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {slides[currentSlide].cta}
              </Link>
            </div>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex space-x-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-white scale-125' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="backdrop-blur-md bg-white/60 rounded-3xl p-8 border border-white/20 shadow-xl">
              <h3 className="text-3xl font-bold text-gray-900 mb-6">Empowering Identity, Fueling Communities</h3>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                At OPM Gear, our mission is to empower schools, teams, and communities with full control over how they represent themselves—on and off the field. We believe every group deserves access to high-quality, custom headwear that reflects their identity, supports their goals, and strengthens their connection with fans, families, and sponsors.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                We've eliminated the traditional barriers set by big-box brands by offering a fully customizable platform where customers can design their own caps, set up fundraising initiatives, and take ownership of their merchandise.
              </p>
            </div>
            
            <div className="relative">
              <div className="backdrop-blur-md bg-white/60 rounded-3xl p-8 border border-white/20 shadow-xl">
                <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎯</div>
                    <h4 className="text-xl font-semibold text-gray-900">5 Million Hats</h4>
                    <p className="text-gray-600">Our 5-year goal</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Every Detail, Fully Branded</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '🧵', title: '3D Embroidery', desc: 'Raised stitching with serious dimension and impact' },
              { icon: '✨', title: 'Flat Embroidery', desc: 'Clean, sharp, and perfect for fine logo detail' },
              { icon: '🛡️', title: 'Rubber Patch', desc: 'Bold, modern, and highly durable' },
              { icon: '🎨', title: 'Sublimated Print', desc: 'Vivid, full-color printing for complex designs' },
              { icon: '🐄', title: 'Leather Patch', desc: 'Premium natural texture with timeless appeal' },
              { icon: '🖨️', title: 'Screen Print', desc: 'Sleek and lightweight — ideal for large graphics' }
            ].map((feature, index) => (
              <div
                key={index}
                className="backdrop-blur-md bg-white/60 rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-700">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="backdrop-blur-md bg-gradient-to-r from-blue-600/90 to-purple-600/90 rounded-3xl p-12 border border-white/20 shadow-2xl">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Start Your Custom Cap Journey?</h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of teams and communities who trust OPM Gear for their custom headwear needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/customize"
                className="bg-white text-blue-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
              >
                Start Customizing
              </Link>
              <Link
                href="/about"
                className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
