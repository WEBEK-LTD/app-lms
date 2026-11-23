// Renders the pilot's screens: 390 x 844 CSS px at deviceScaleFactor 2,
// JPEG quality 90. Run from this folder: node render.js [name ...]
// Serves the folder over http (CSS masks don't load from file://).
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const shots = [
  ["signin", "dark"], ["signin", "light"],
  ["home", "dark"], ["home", "light"],
  ["order", "dark"], ["order", "light"],
  ["sounds", "dark"], ["sounds", "light"],
  ["home-en", "dark"],
  ["home-tr", "dark"],
  ["theme-picker", "dark"],
  ["kitchen-empty", "dark"], ["kitchen-empty", "light"],
];
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".ttf": "font/ttf", ".jpg": "image/jpeg" };

(async () => {
  const only = process.argv.slice(2);
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  }).listen(0);
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  fs.mkdirSync(path.join(root, "screens"), { recursive: true });
  for (const [name, mode] of shots) {
    if (only.length && !only.includes(name)) continue;
    await page.goto(`http://127.0.0.1:${port}/src/${name}.html?mode=${mode}`);
    await page.waitForSelector("body[data-ready]");
    await page.waitForTimeout(150);
    const out = path.join(root, "screens", `${name}-${mode}.jpg`);
    await page.screenshot({ path: out, type: "jpeg", quality: 90 });
    console.log("wrote", path.relative(root, out));
  }
  await browser.close();
  server.close();
})();
