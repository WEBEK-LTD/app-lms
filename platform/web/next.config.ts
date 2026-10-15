import type { NextConfig } from "next";
import { GUIDE_REDIRECTS } from "./src/content/docs";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
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
  // 32 The share images (opengraph-image) read their font files at runtime.
  outputFileTracingIncludes: { "/**": ["./src/app/fonts/og/*.ttf"] },
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
    return [
      { source: "/:path((?!preview-app/).*)", headers: [...securityHeaders, { key: "X-Frame-Options", value: "DENY" }] },
      // 17 The app preview (public/preview-app, built from mobile/) opens in a frame on the dashboard's Preview page.
      {
        source: "/preview-app/:path*",
        headers: [
          ...securityHeaders,
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  // The guides moved into the documentation (src/content/docs.ts); old links keep working.
  async redirects() {
    return [
      { source: "/guides", destination: "/docs", permanent: true },
      ...Object.entries(GUIDE_REDIRECTS).map(([guide, article]) => ({ source: `/guides/${guide}`, destination: `/docs/${article}`, permanent: true })),
      { source: "/guides/:slug", destination: "/docs", permanent: true },
    ];
  },
};

export default nextConfig;
