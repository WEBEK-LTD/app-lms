const { open, fetchApp } = require('./lib');
const fs = require('fs');
(async () => {
  const [app, slug, l = 'en', pub] = process.argv.slice(2);
  const { browser, ctx } = await open();
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  const r = await fetchApp(ctx.request, info, '/pages/' + slug, l, !pub);
  const walk = (n, d) => { const bits = [n.type, n.id, n.name && 'name=' + n.name, n.text && 'text=' + JSON.stringify(n.text.slice(0, 40)), n.title && 'title=' + n.title, n.source && 'source=' + n.source, n.query && 'q=' + JSON.stringify(n.query), n.items && 'items=' + n.items.length, n.categories && 'cats=' + n.categories.length, n.action && 'action=' + JSON.stringify(n.action), n.entries && 'entries=' + n.entries.length + ':' + JSON.stringify(n.entries.map(e => [e.title || e.text, e.action && (e.action.page_slug || e.action.screen || e.action.type)])).slice(0, 300), n.chips && 'chips=' + JSON.stringify(n.chips).slice(0, 200)].filter(Boolean); console.log('  '.repeat(d) + bits.join(' ')); (n.children || []).forEach(c => walk(c, d + 1)); };
  console.log(r.status, 'title', r.json.title, 'header', JSON.stringify(r.json.studio && r.json.studio.header).slice(0, 200));
  walk(r.json.studio.body, 0);
  await browser.close();
})();
