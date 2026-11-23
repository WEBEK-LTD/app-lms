// usage: node render.js page.html out.png [dark]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const jobs = process.argv.slice(2); // pairs: html out mode ...
  const browser = await chromium.launch();
  for (let j = 0; j < jobs.length; j += 3) {
    const [html, out, mode] = jobs.slice(j, j + 3);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('requestfailed', r => errors.push('FAILED ' + r.url()));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
    await page.goto('file://' + path.resolve(html) + (mode === 'dark' ? '#dark' : ''), { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    });
    await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 15000 }).catch(() => console.log('READY TIMEOUT'));
    await page.waitForTimeout(250);
    const info = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const over = [];
      document.querySelectorAll('body *').forEach(el => {
        if (el.closest('.hscroll')) return;
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > W + 0.5 || r.left < -0.5)) over.push(el.className || el.tagName);
      });
      const fontsOk = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family);
      return { scrollW: document.documentElement.scrollWidth, H: document.documentElement.scrollHeight, over: over.slice(0, 10), fonts: [...new Set(fontsOk)] };
    });
    console.log(path.basename(out), JSON.stringify(info));
    if (errors.length) console.log(errors.join('\n'));
    await page.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 90 });
    await page.close();
  }
  await browser.close();
})();
