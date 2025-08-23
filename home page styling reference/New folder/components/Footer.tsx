export function Footer() {
  const productLinks = [
    "Snapback Caps",
    "Trucker Hats", 
    "Dad Caps",
    "Performance Caps",
    "Beanies",
    "Custom Patches"
  ];

  const companyLinks = [
    "About Us",
    "Our Story", 
    "Careers",
    "Press Kit",
    "Contact",
    "Support"
  ];

  const resourceLinks = [
    "Design Guide",
    "Size Charts",
    "Bulk Orders",
    "Shipping Info",
    "Returns",
    "FAQ"
  ];

  const socialIcons = [
    { name: "Twitter", icon: "🐦" },
    { name: "Instagram", icon: "📷" },
    { name: "Facebook", icon: "📘" },
    { name: "LinkedIn", icon: "💼" }
  ];

  return (
    <footer className="relative pt-24 pb-12 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-900 to-slate-800" />
      
      {/* Neon gradient outline around footer */}
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#dfe42d] via-orange-500 to-transparent" />
      
      {/* Subtle gradient orbs */}
      <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/10 to-[#dfe42d]/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Main Footer Content */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-12 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="text-3xl font-bold bg-gradient-to-r from-[#dfe42d] to-orange-500 bg-clip-text text-transparent mb-6">
                OPM Gear
              </div>
              <p className="text-gray-300 leading-relaxed mb-8">
                Premium custom caps and headwear designed your way. Quality craftsmanship meets unlimited creativity.
              </p>
              
              {/* Social Icons */}
              <div className="flex space-x-4">
                {socialIcons.map((social) => (
                  <a 
                    key={social.name}
                    href="#" 
                    className="w-12 h-12 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl flex items-center justify-center text-xl hover:bg-gradient-to-r hover:from-[#dfe42d] hover:to-orange-500 hover:text-black transition-all duration-300 transform hover:scale-110"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Products */}
            <div>
              <h3 className="text-xl font-bold text-white mb-6 bg-gradient-to-r from-[#dfe42d] to-orange-500 bg-clip-text text-transparent">
                Products
              </h3>
              <ul className="space-y-3">
                {productLinks.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-gray-400 hover:text-[#dfe42d] transition-colors duration-300">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-xl font-bold text-white mb-6 bg-gradient-to-r from-[#dfe42d] to-orange-500 bg-clip-text text-transparent">
                Company
              </h3>
              <ul className="space-y-3">
                {companyLinks.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-gray-400 hover:text-[#dfe42d] transition-colors duration-300">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-xl font-bold text-white mb-6 bg-gradient-to-r from-[#dfe42d] to-orange-500 bg-clip-text text-transparent">
                Resources
              </h3>
              <ul className="space-y-3">
                {resourceLinks.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-gray-400 hover:text-[#dfe42d] transition-colors duration-300">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/20">
          <div className="text-gray-400 mb-4 md:mb-0">
            © 2025 OPM Gear. All rights reserved.
          </div>
          
          <div className="flex space-x-8">
            <a href="#" className="text-gray-400 hover:text-[#dfe42d] transition-colors duration-300">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-400 hover:text-[#dfe42d] transition-colors duration-300">
              Terms of Service
            </a>
            <a href="#" className="text-gray-400 hover:text-[#dfe42d] transition-colors duration-300">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}