/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pino-pretty", "@0glabs/0g-serving-broker"],
  experimental: {
    serverComponentsExternalPackages: ["@0glabs/0g-serving-broker"],
  },
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
    
    // Handle dynamic imports for 0G SDK
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push("@0glabs/0g-serving-broker");
    }
    
    return config;
  },
};

export default nextConfig;
