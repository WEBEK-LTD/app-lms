const { open, problems, editor, sel, right, draftNode, publish, fetchApp, findNode } = require('./lib');
const fs = require('fs');
(async () => {
  const { browser, page, ctx } = await open({ dsf: 2 });
  const infoK = JSON.parse(fs.readFileSync('api-KechFlora.json'));
  await editor(page, 'KechFlora');
  console.log('on reload, text in canvas:', await page.locator('[data-studio-node="nhnjiajo"]').first().innerText().catch(() => ''), '| server draft:', (await draftNode(ctx.request, infoK, 'home', 'nhnjiajo')).text);
  await sel(page, 'nnjcv7sc');
  const R = right(page);
  await R.getByRole('button', { name: 'Pill', exact: true }).click(); await page.waitForTimeout(3000);
  console.log('notice after pill:', await page.getByText(/Not saved|Saved/).first().innerText());
  // try Publish while broken
  console.log('Publish disabled?', await page.getByRole('button', { name: /Publish$/ }).first().isDisabled());

  const c = R.getByLabel('Corners', { exact: true }).first(); await c.click(); await c.fill('24'); await c.press('Tab'); await page.waitForTimeout(5000);
  console.log('after Corners=24:', await page.getByText(/Not saved|Saved/).first().innerText(), '| stored radius', (await draftNode(ctx.request, infoK, 'home', 'nnjcv7sc')).radius);
  await page.getByRole('button', { name: /^Page:/ }).click(); await page.waitForTimeout(300);
  await page.getByText('Our bouquet', { exact: true }).first().click(); await page.waitForTimeout(1500);
  await page.screenshot({ path: 'ev/05-our-bouquet.png' });
  await browser.close();
})();
