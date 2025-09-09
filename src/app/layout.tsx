import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/components/auth/AuthContext";
import { CartProvider } from "@/components/cart/CartContext";
import { QueryProvider } from "@/components/providers/QueryProvider";
import ConditionalNavbar from "@/components/ConditionalNavbar";
import ConditionalFooter from "@/components/ConditionalFooter";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "US Custom Caps — Custom Baseball Caps",
  description: "Premium custom baseball caps with live previews, wholesale pricing, and professional customization tools.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link id="all-fonts-link-font-geist" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap" />
        <link id="all-fonts-link-font-roboto" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&display=swap" />
        <link id="all-fonts-link-font-montserrat" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" />
        <link id="all-fonts-link-font-poppins" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" />
        <link id="all-fonts-link-font-playfair" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;900&display=swap" />
        <link id="all-fonts-link-font-instrument-serif" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:wght@400;500;600;700&display=swap" />
        <link id="all-fonts-link-font-merriweather" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap" />
        <link id="all-fonts-link-font-bricolage" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@300;400;500;600;700&display=swap" />
        <link id="all-fonts-link-font-jakarta" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" />
        <link id="all-fonts-link-font-manrope" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" />
        <link id="all-fonts-link-font-space-grotesk" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" />
        <link id="all-fonts-link-font-work-sans" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700;800&display=swap" />
        <link id="all-fonts-link-font-pt-serif" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700&display=swap" />
        <link id="all-fonts-link-font-geist-mono" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600;700&display=swap" />
        <link id="all-fonts-link-font-space-mono" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" />
        <link id="all-fonts-link-font-quicksand" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" />
        <link id="all-fonts-link-font-nunito" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&display=swap" />
        <style>{`
          .font-geist { font-family: 'Geist', sans-serif !important; }
          .font-roboto { font-family: 'Roboto', sans-serif !important; }
          .font-montserrat { font-family: 'Montserrat', sans-serif !important; }
          .font-poppins { font-family: 'Poppins', sans-serif !important; }
          .font-playfair { font-family: 'Playfair Display', serif !important; }
          .font-instrument-serif { font-family: 'Instrument Serif', serif !important; }
          .font-merriweather { font-family: 'Merriweather', serif !important; }
          .font-bricolage { font-family: 'Bricolage Grotesque', sans-serif !important; }
          .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif !important; }
          .font-manrope { font-family: 'Manrope', sans-serif !important; }
          .font-space-grotesk { font-family: 'Space Grotesk', sans-serif !important; }
          .font-work-sans { font-family: 'Work Sans', sans-serif !important; }
          .font-pt-serif { font-family: 'PT Serif', serif !important; }
          .font-geist-mono { font-family: 'Geist Mono', monospace !important; }
          .font-space-mono { font-family: 'Space Mono', monospace !important; }
          .font-quicksand { font-family: 'Quicksand', sans-serif !important; }
          .font-nunito { font-family: 'Nunito', sans-serif !important; }
          .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; opacity: 0; }
          .animate-slide-up { animation: slideUp 0.8s ease-out forwards; opacity: 0; transform: translateY(20px); }
          .animate-delay-200 { animation-delay: 0.2s; }
          .animate-delay-400 { animation-delay: 0.4s; }
          .animate-delay-600 { animation-delay: 0.6s; }
          .animate-delay-800 { animation-delay: 0.8s; }
          @keyframes fadeIn { to { opacity: 1; } }
          @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </head>
      <body className="text-white antialiased min-h-screen">
        <QueryProvider>
          <AuthProvider>
            <CartProvider>
              <ConditionalNavbar />
              <main className="relative">
                {children}
              </main>
              <ConditionalFooter />
            </CartProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
