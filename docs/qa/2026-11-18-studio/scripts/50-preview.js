const { open, problems, shot } = require('./lib');
const fs = require('fs');
const [app, langs = 'en,ar,tr', draft = '1', tag = ''] = process.argv.slice(2);
(async () => {
  const { browser, ctx } = await open({ tag: 'preview', viewport: { width: 390, height: 844 }, dsf: 2 });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  let src = info.src;
  if (draft !== '1') { const { open: o } = require('./lib'); }
  for (const l of langs.split(',')) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
    page.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().slice(0, 160)); });
    page.on('pageerror', e => errs.push('pageerror ' + e.message.slice(0, 200)));
    const url = src.replace(/lang=[a-z]+/, 'lang=' + l);
    await page.goto(url);
    await page.waitForTimeout(15000);
    await shot(page, `preview-${app}-${l}${tag}-signin`);
    await page.mouse.click(341, 32); await page.waitForTimeout(6000);
    await shot(page, `preview-${app}-${l}${tag}`);
    for (let k = 1; k <= (+process.env.SCROLLS || 0); k++) { await page.mouse.move(195, 500); await page.mouse.wheel(0, 700); await page.waitForTimeout(1500); await shot(page, `preview-${app}-${l}${tag}-s${k}`); }
    console.log(l, 'errors:', errs.slice(0, 8).join(' || '));
    await page.close();
  }
  await browser.close();
})();
