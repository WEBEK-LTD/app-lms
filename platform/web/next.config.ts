import type { NextConfig } from "next";
import { GUIDE_REDIRECTS } from "./src/content/docs";
import { countryVaryHeaders, PRICED_PAGES } from "./src/lib/geo-vary";
import { deployRobotsHeaders } from "./src/lib/indexing";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

/** 69 The pages' Content-Security-Policy (scripts stay as they are: Next.js inlines its own). */
const PAGE_CSP = "base-uri 'self'; object-src 'none'; frame-ancestors 'none'";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // 64b A tab left open from an earlier deploy: Next.js sees the new deployment and loads the
  // page again instead of calling server actions that no longer exist ("Failed to find Server
  // Action"). Netlify sets DEPLOY_ID for each build; local builds have none.
  deploymentId: process.env.DEPLOY_ID || undefined,
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
      // 69 Pages: no <base> or plugin content from elsewhere and never framed, a policy browsers
      // enforce on top of React's escaping. API routes and the media links set their own
      // (files and SVGs are sandboxed: src/app/api/v1/assets), so they're left out here.
      { source: "/:path((?!preview-app/|api/|media/|m/).*)", headers: [{ key: "Content-Security-Policy", value: PAGE_CSP }] },
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
      // 52 Prices follow the visitor's country (pounds in Egypt, dollars elsewhere): caches keep a copy per country.
      ...PRICED_PAGES.map((source) => ({ source, headers: countryVaryHeaders() })),
      // 67 Deploy previews and branch deploys stay out of search engines; production never gets this.
      ...deployRobotsHeaders(),
    ];
  },
  // 46 Links that open the apps: the files phones read at the root of the domain (lib/links/files.ts).
  async rewrites() {
    return [
      { source: "/.well-known/assetlinks.json", destination: "/api/links/assetlinks" },
      { source: "/.well-known/apple-app-site-association", destination: "/api/links/apple-app-site-association" },
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
