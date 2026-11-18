const { open, draftNode, fetchApp, findNode } = require('./lib');
const fs = require('fs');
(async () => {
  const [app, slug, id, l, pub] = process.argv.slice(2);
  const { browser, ctx } = await open();
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  const r = await fetchApp(ctx.request, info, '/pages/' + slug, l || 'en', !pub);
  console.log(r.status, JSON.stringify(id === '-' ? r.json : findNode(r.json.studio, id), null, 0).slice(0, 3000));
  await browser.close();
})();
