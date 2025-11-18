/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@bookmark-gen/shared', '@bookmark-gen/database', '@bookmark-gen/services'],
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

module.exports = nextConfig;
