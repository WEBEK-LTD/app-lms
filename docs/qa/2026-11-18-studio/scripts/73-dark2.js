const { open, shot, editor, sel, right, draftNode, stored, diff, canvasState } = require('./lib');
const fs = require('fs');
(async () => {
  const app = 'KechFlora', id = 'nhnjiajo';
  const { browser, page, ctx } = await open({ dsf: 2 });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  await editor(page, app); await sel(page, id);
  const R = right(page);
  await page.getByRole('button', { name: /Light \/ dark/ }).click(); await page.waitForTimeout(500);
  let b = await draftNode(ctx.request, info, 'home', id);
  await R.locator('summary').filter({ hasText: /^In dark mode/ }).first().click();
  const det = R.locator('details').filter({ has: page.locator('summary', { hasText: /^In dark mode/ }) }).first();
  await det.getByRole('button', { name: /^Text colour/ }).click(); await page.waitForTimeout(200);
  await det.locator('button[aria-label^="#"]').nth(4).click();
  const a = await stored(ctx.request, info, 'home', id, b);
  console.log('In dark mode → Text colour swatch: stored', JSON.stringify(diff(b, a)), '| dark canvas colour', (await canvasState(page, id)).color);
  await shot(page, 'dark-section');
  await browser.close();
})();
