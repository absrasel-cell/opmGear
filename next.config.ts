/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
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