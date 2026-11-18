const { open, fetchApp } = require('./lib');
const fs = require('fs');
(async () => {
  const app = process.argv[2];
  const { browser, ctx } = await open();
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  for (const l of ['en', 'ar', 'tr']) {
    const c = await fetchApp(ctx.request, info, '/config', l, false);
    const j = c.json;
    const pick = o => String(JSON.stringify(o)).slice(0, 250);
    console.log('==', l, c.status, 'keys', Object.keys(j).join(','));
    console.log('  languages', pick(j.languages), '| store', pick(j.store), '| cust_cur', pick(j.customer_currency), '| site', pick(j.site));
    for (const p of ['/store/categories', '/store/products?per_page=3', '/pages']) {
      const r = await fetchApp(ctx.request, info, p, l, false);
      const s = r.json; const items = s.items || s.categories || s.tabs || s;
      console.log('  ', p, r.status, JSON.stringify(Array.isArray(items) ? items.slice(0, 13).map(x => [x.name || x.title || x.label, x.price || x.price_label || x.currency || ''].join(':')) : s).slice(0, 600));
    }
  }
  await browser.close();
})();
