// usage: node render.js <outdir> page.html[#dark]:name ...   -> outdir/name.jpg (JPEG q90, 780px wide, full page)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [,, outdir, ...jobs] = process.argv;
  const browser = await chromium.launch();
  for (const job of jobs) {
    const [src, name] = job.split(':');
    const [file, hash] = src.split('#');
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('requestfailed', r => errors.push('FAILED ' + r.url()));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
    await page.goto('file://' + path.resolve(file) + (hash ? '#' + hash : ''), { waitUntil: 'load' });
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
      // text overflow (ellipsis-less clipping) check
      const clip = [];
      document.querySelectorAll('.chk-clip').forEach(el => { if (el.scrollWidth > el.clientWidth + 1) clip.push(el.textContent.slice(0, 30)); });
      const fonts = [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))];
      return { sw: document.documentElement.scrollWidth, H: document.documentElement.scrollHeight, over: over.slice(0, 10), clip, fonts };
    });
    console.log(name, JSON.stringify(info), errors.join(' | '));
    await page.screenshot({ path: path.join(outdir, name + '.jpg'), type: 'jpeg', quality: 90, fullPage: true });
    await page.close();
  }
  await browser.close();
})();
