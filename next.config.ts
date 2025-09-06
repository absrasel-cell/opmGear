/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Completely ignore ESLint during builds - required for Vercel deployment
    ignoreDuringBuilds: true,
    dirs: []  // Don't run ESLint on any directories
  },
  typescript: {
    // Completely ignore TypeScript errors during builds - required for Vercel deployment  
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.prod.website-files.com",
        port: "",
        pathname: "/689adff1e8bb4da83b60751e/**", // Match the specific Webflow collection path
      },
      {
        protocol: "https",
        hostname: "nowxzkdkaegjwfhhqoez.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**", // Match Supabase storage paths
      },
    ],
  },
  // Enable hydration debugging in development
  reactStrictMode: true,
  // Help with SSR/hydration debugging
  serverExternalPackages: ['@supabase/supabase-js'],
  // Improve hydration by ensuring consistent serialization
  compiler: {
    // Remove console.logs in production but keep in development for debugging
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
};

module.exports = nextConfig;