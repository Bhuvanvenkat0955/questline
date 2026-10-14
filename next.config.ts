import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a self-contained server (.next/standalone/server.js) that the
  // desktop app can run without the whole project or node_modules.
  output: "standalone",
  // Never copy your own database or secrets into that build: the code reads
  // data/ at runtime, so Next.js would otherwise include it.
  outputFileTracingExcludes: { "/*": ["./data/**/*", "./.env*"] },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
