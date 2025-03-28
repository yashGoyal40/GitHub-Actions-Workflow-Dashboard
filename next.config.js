/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        dns: false,
        fs: false,
        child_process: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        zlib: false,
        http: false,
        https: false,
        buffer: false,
        util: false,
        assert: false,
        url: false,
        querystring: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig; 