const { open, editor, sel, right, previewShot, stored, draftNode, shot } = require('./lib');
const fs = require('fs');
// usage: app id Width|Height value [num] previewName scrolls
(async () => {
  const [app, id, which, v, n, name, sc] = process.argv.slice(2);
  const { browser, page, ctx } = await open({ dsf: 2 });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  await editor(page, app);
  const b = await draftNode(ctx.request, info, 'home', id);
  await sel(page, id); await right(page).locator(`select[aria-label="${which}"]`).selectOption(v);
  if (n && n !== '-') { const i = right(page).locator(`input[aria-label="${which}"]`); await i.fill(n); await i.press('Tab'); }
  await stored(ctx.request, info, 'home', id, b); await page.waitForTimeout(1500);
  await page.locator(`[data-studio-node="${id}"]`).first().scrollIntoViewIfNeeded();
  await shot(page, name + '-canvas');
  console.log(await previewShot(ctx, app, 'en', +sc, name));
  await browser.close();
})();
