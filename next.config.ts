/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.prod.website-files.com",
        port: "",
        pathname: "/689adff1e8bb4da83b60751e/**", // Match the specific Webflow collection path
      },
    ],
  },
};

module.exports = nextConfig;