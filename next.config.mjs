/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pino-pretty"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        "fs/promises": false,
        net: false,
        tls: false,
        crypto: false,
        readline: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
