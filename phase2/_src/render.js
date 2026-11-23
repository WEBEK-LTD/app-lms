// usage: node render.js page.html out.png
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [,, html, out] = process.argv;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('requestfailed', r => errors.push('FAILED ' + r.url()));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve(html), { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    // background images
    const urls = new Set();
    document.querySelectorAll('*').forEach(el => { const b = getComputedStyle(el).backgroundImage; const m = b && b.match(/url\("?(.*?)"?\)/g); if (m) m.forEach(u => urls.add(u.replace(/url\("?|"?\)/g, ''))); });
    await Promise.all([...urls].map(u => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = u; })));
  });
  await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 15000 }).catch(() => console.log('READY TIMEOUT'));
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const over = [];
    document.querySelectorAll('body *').forEach(el => {
      if (el.closest('.hscroll')) return;
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > W + 0.5 || r.left < -0.5)) over.push(el.className || el.tagName);
    });
    const bad = [...document.images].filter(i => !i.naturalWidth).map(i => i.src);
    const fontsOk = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family);
    return { scrollW: document.documentElement.scrollWidth, H: document.documentElement.scrollHeight, over: over.slice(0, 15), bad, fonts: [...new Set(fontsOk)] };
  });
  console.log(JSON.stringify(info));
  if (errors.length) console.log(errors.join('\n'));
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
})();
