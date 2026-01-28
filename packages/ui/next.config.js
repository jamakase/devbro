/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@agent-sandbox/shared",
    "@agent-sandbox/core",
    "@agent-sandbox/server",
    "better-auth",
    "drizzle-orm",
  ],
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "dockerode", "ssh2"],
  },
};

module.exports = nextConfig;
