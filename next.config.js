const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['puppeteer'],
  },
  async redirects() {
    return [
      {
        source: '/mattillsynet',
        destination: '/mattilsynet',
        permanent: true,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
