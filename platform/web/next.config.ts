import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: import.meta.dirname,
  },
  // mysql2 and nodemailer are loaded at runtime from node_modules on Netlify.
  serverExternalPackages: ["mysql2", "nodemailer"],
  experimental: {
    // Turbopack's build cache stores a snapshot of the environment, secrets included.
    // Builds are fast enough without it, and no secret is ever written to disk.
    turbopackFileSystemCacheForBuild: false,
    serverActions: {
      // yallapp.com.tr is served through a reverse proxy on host.webek.org, so the
      // browser's origin differs from the host Netlify sees (deploy/apache-proxy.conf).
      allowedOrigins: ["yallapp.com.tr", "www.yallapp.com.tr"],
      // Plugin release uploads go through a server action. Netlify functions accept up to 6 MB.
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
