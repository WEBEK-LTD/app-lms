// usage: node render2.js out_dir page1.html [page2.html ...]  -> out_dir/<basename>.jpg
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [,, outDir, ...pages] = process.argv;
  const browser = await chromium.launch();
  for (const html of pages) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('requestfailed', r => errors.push('FAILED ' + r.url()));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
    await page.goto('file://' + path.resolve(html), { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    });
    await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 20000 }).catch(() => errors.push('READY TIMEOUT'));
    await page.waitForTimeout(250);
    const info = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const over = [];
      document.querySelectorAll('body *').forEach(el => {
        if (el.closest('.hscroll')) return;
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > W + 0.5 || r.left < -0.5)) over.push((el.className && el.className.baseVal === undefined ? el.className : el.tagName) + '');
      });
      // text clipping check: elements whose scrollWidth > clientWidth with ellipsis are fine; flag overflow-hidden text that wraps badly is hard; skip
      const missing = [...document.querySelectorAll('[data-src]')].filter(e => !e.style.backgroundImage).map(e => e.dataset.src);
      return { scrollW: document.documentElement.scrollWidth, H: document.documentElement.scrollHeight, over: [...new Set(over)].slice(0, 10), missing };
    });
    const out = path.join(outDir, path.basename(html).replace(/\.html$/, '.jpg'));
    await page.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 90 });
    console.log(path.basename(out), JSON.stringify(info), errors.slice(0,4).join(' | '));
    await page.close();
  }
  await browser.close();
})();
