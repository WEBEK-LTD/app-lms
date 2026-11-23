// usage: node render.js out_dir name1 name2 ...   (renders name.html in light+dark to out_dir/<file>.jpg)
// file naming: html "mobiles-A-home.html" -> mobiles-A-home-light.jpg / -dark.jpg
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [,, outDir, ...names] = process.argv;
  const browser = await chromium.launch();
  for (const name of names) for (const theme of ['light','dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme });
    const page = await ctx.newPage();
    await page.addInitScript(t => { document.documentElement.dataset.theme = t; }, theme);
    const errors = [];
    page.on('requestfailed', r => errors.push('FAILED ' + r.url()));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
    await page.goto('file://' + path.resolve(__dirname, name + '.html'), { waitUntil: 'load' });
    await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    });
    await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 15000 }).catch(() => console.log('READY TIMEOUT'));
    await page.waitForTimeout(250);
    const info = await page.evaluate(() => {
      const W = document.documentElement.clientWidth; const over = [];
      document.querySelectorAll('body *').forEach(el => {
        if (el.closest('.hscroll')) return;
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > W + 0.5 || r.left < -0.5)) over.push((el.className && el.className.baseVal===undefined ? el.className : el.tagName));
      });
      // text overflow (ellipsis-free clipping) check
      const clip=[];
      document.querySelectorAll('body *').forEach(el=>{ if(el.children.length===0 && el.scrollWidth>el.clientWidth+1 && getComputedStyle(el).overflow==='hidden' && getComputedStyle(el).textOverflow!=='ellipsis') clip.push(el.className+':'+el.textContent.slice(0,20)); });
      const bad = [...document.querySelectorAll('[data-src]')].filter(e => !e.style.backgroundImage).map(e => e.dataset.src);
      const fonts = [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))];
      const missingIcons=[...document.querySelectorAll('.ms')].filter(e=>e.getBoundingClientRect().width>parseFloat(getComputedStyle(e).fontSize)*1.3).map(e=>e.textContent);
      return { scrollW: document.documentElement.scrollWidth, H: document.documentElement.scrollHeight, over: over.slice(0, 10), clip:clip.slice(0,10), bad, fonts, missingIcons:[...new Set(missingIcons)] };
    });
    const out = path.join(outDir, name + '-' + theme + '.jpg');
    console.log(name, theme, JSON.stringify(info));
    if (errors.length) console.log(errors.join('\n'));
    await page.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 90 });
    await ctx.close();
  }
  await browser.close();
})();
