import type { NextConfig } from "next";
import { GUIDE_REDIRECTS } from "./src/content/docs";
import { countryVaryHeaders, PRICED_PAGES } from "./src/lib/geo-vary";
import { PAGE_CSP, PAY_PERMISSIONS_POLICY, PERMISSIONS_POLICY } from "./src/lib/csp";
import { deployRobotsHeaders } from "./src/lib/indexing";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

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
  // 71 PDFKit (the receipts' PDFs) too: its font engine stays as published.
  serverExternalPackages: ["mysql2", "nodemailer", "pdfkit"],
  // 32 The share images (opengraph-image) and 71 the receipts' PDFs read their font files at runtime,
  // and the Zad demo its photos (lib/demo/zad-photos.ts), the academy its (lib/demo/academy-photos.ts), Safra its hotels' (lib/demo/travel.ts).
  outputFileTracingIncludes: { "/**": ["./src/app/fonts/og/*.ttf", "./public/demo-photos/*.jpg", "./public/stories/academy/*.jpg", "./public/travel-photos/*.jpg", "./public/flower-photos/*.jpg", "./public/clothes-photos/*.jpg", "./public/kids-photos/*.jpg"] },
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
      // 155 No camera, microphone, location or payments anywhere, but the payment page lets Stripe's
      // frames use the Payment Request API, so Apple Pay and Google Pay can show in its card form
      // (lib/csp.ts). Kept apart so no page gets both.
      { source: "/:path((?!preview-app/|pay/).*)", headers: [{ key: "Permissions-Policy", value: PERMISSIONS_POLICY }] },
      { source: "/pay/:path+", headers: [{ key: "Permissions-Policy", value: PAY_PERMISSIONS_POLICY }] },
      // 69 Pages: no <base> or plugin content from elsewhere and never framed, a policy browsers
      // enforce on top of React's escaping. API routes and the media links set their own
      // (files and SVGs are sandboxed: src/app/api/v1/assets), so they're left out here. 69.12 The
      // signed-in pages and the sign-in forms get it with their scripts limited too (src/proxy.ts).
      { source: "/:path((?!preview-app/|api/|media/|m/).*)", headers: [{ key: "Content-Security-Policy", value: PAGE_CSP }] },
      // 17 The app preview (public/preview-app, built from mobile/) opens in a frame on the dashboard's Preview page.
      {
        source: "/preview-app/:path*",
        headers: [
          ...securityHeaders,
          { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
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
      // 136 The platform as an OpenID Connect issuer for Google's Workload Identity Federation (lib/google/platform-keys.ts).
      { source: "/oidc/.well-known/openid-configuration", destination: "/api/oidc/openid-configuration" },
      { source: "/oidc/jwks.json", destination: "/api/oidc/jwks" },
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
