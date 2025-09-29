/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@supabase/supabase-js');
    }
    return config;
  },
};

module.exports = nextConfig;


