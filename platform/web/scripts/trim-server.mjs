#!/usr/bin/env node
// Runs after `next build` (npm's postbuild). On Netlify only: its functions
// run on glibc x64 Linux and may hold 250 MB unzipped, and the server function
// is copied from .next/standalone. Next's own server trace takes every sharp
// build npm installed (musl and WebAssembly too, about 28 MB), which the
// function never loads; the shop types' photos had taken it past the limit.
// Elsewhere (a self-hosted standalone server on Alpine needs musl) nothing changes.
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.NETLIFY !== "true") process.exit(0);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const img = path.join(root, ".next", "standalone", "node_modules", "@img");
const unused = ["sharp-libvips-linuxmusl-x64", "sharp-linuxmusl-x64", "sharp-wasm32"];

for (const name of unused) {
  const dir = path.join(img, name);
  if (!existsSync(dir)) continue;
  rmSync(dir, { recursive: true, force: true });
  console.log(`trim-server: left out ${path.relative(root, dir)}`);
}
