const { open, fetchApp } = require('./lib'); const fs = require('fs');
(async () => { const { browser, ctx } = await open(); const info = JSON.parse(fs.readFileSync('api-Leqaa.json'));
 const r = await fetchApp(ctx.request, info, '/store/products?per_page=20', 'ar', false); console.log(JSON.stringify(r.json.items.map(p => [p.name, p.price, p.sale_price, p.currency])).slice(0, 1200));
 const h = await fetchApp(ctx.request, info, '/pages/home', 'ar', false); const s = JSON.stringify(h.json); console.log('home has ₺?', /₺|TRY/.test(s), (s.match(/"price[^,]{0,60}/g) || []).slice(0, 6));
 await browser.close(); })();
