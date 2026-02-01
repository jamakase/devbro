/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@agent-sandbox/shared",
    "@agent-sandbox/core",
    "@agent-sandbox/server",
    "better-auth",
  ],
  experimental: {
    serverComponentsExternalPackages: [
      "better-sqlite3",
      "cpu-features",
      "dockerode",
      "ssh2",
      "drizzle-orm",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [...externals, "cpu-features", "ssh2", "drizzle-orm"];
    }
    return config;
  },
};

module.exports = nextConfig;
