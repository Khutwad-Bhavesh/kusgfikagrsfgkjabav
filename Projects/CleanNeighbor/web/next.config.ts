/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    domains: ['usable-salamander-542.convex.cloud'],
  },
  eslint: {
    ignoreDuringBuilds: true, 
  },
   outputFileTracingRoot: process.cwd(),
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
