import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/components/auth/AuthContext";
import { CartProvider } from "@/components/cart/CartContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OPM Gear — Custom Caps",
  description: "Neon-smooth customization, live previews, wholesale-ready cart, role-based access.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#07070b]">
      <body className={inter.className + " text-white antialiased bg-[#07070b]"}>
        <AuthProvider>
          <CartProvider>
            <div className="relative min-h-screen flex flex-col">
              {/* Background beams for whole site (subtle) */}
              <div className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute -top-32 -left-24 h-[50vh] w-[50vw] rounded-full blur-3xl"
                  style={{ background: "radial-gradient(closest-side, rgba(223,228,45,0.06), transparent 65%)" }} />
                <div className="absolute -bottom-40 -right-32 h-[60vh] w-[55vw] rounded-full blur-3xl"
                  style={{ background: "radial-gradient(closest-side, rgba(168,85,247,0.10), transparent 70%)" }} />
              </div>

              <Navbar />

              <main className="flex-1 px-4 sm:px-6 lg:px-8">
                {children}
              </main>

              <Footer />
            </div>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
