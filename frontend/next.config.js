/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore ESLint errors during production build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Ignore TypeScript errors during production build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configure external images (Cloudinary)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
    // Optional: completely disable Next.js optimization if using Cloudinary URLs directly
    // unoptimized: true,
  },

  // Other Next.js production optimizations are kept by default
};

module.exports = nextConfig;