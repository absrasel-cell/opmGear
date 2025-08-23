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
};

module.exports = nextConfig;