const { open, problems, shot, editor, sel, right, draftNode, stored, previewShot } = require('./lib');
const fs = require('fs');
(async () => {
  const { browser, page, ctx } = await open({ dsf: 2 });
  const infoK = JSON.parse(fs.readFileSync('api-KechFlora.json'));
  // A. Pill on KechFlora's "Today" chip row
  await editor(page, 'KechFlora');
  await sel(page, 'nnjcv7sc'); // Text «Pick a date»
  const R = right(page);
  await R.getByRole('button', { name: 'Pill', exact: true }).click();
  await page.waitForTimeout(4000);
  const bar = await page.getByText(/Not saved/).first().innerText().catch(() => 'no notice');
  console.log('PILL notice:', bar);
  await page.screenshot({ path: 'ev/01-pill-not-saved.png' });
  // follow-up edit is lost?
  await sel(page, 'nhnjiajo'); await R.locator('textarea').first().fill('After pill edit'); await page.waitForTimeout(4000);
  const n = await draftNode(ctx.request, infoK, 'home', 'nhnjiajo'); console.log('later edit stored?', n.text);
  // undo pill → recovers?
  await sel(page, 'nnjcv7sc'); await R.getByRole('button', { name: '24', exact: true }).first().click(); await page.waitForTimeout(5000);
  const n2 = await draftNode(ctx.request, infoK, 'home', 'nhnjiajo'); console.log('after corners 24, later edit stored?', n2.text, '| notice:', await page.getByText(/Not saved|Saved/).first().innerText().catch(() => ''));
  // B. clipped handles on the "Start"-like button in KechFlora? use Leqaa Start
  await editor(page, 'Leqaa'); await sel(page, 'nag67gh9');
  const el = page.locator('[data-studio-node="nag67gh9"]').first(); await el.scrollIntoViewIfNeeded();
  const bb = await el.boundingBox();
  await page.screenshot({ path: 'ev/02-handles-clipped.png', clip: { x: bb.x - 60, y: bb.y - 60, width: bb.width + 120, height: bb.height + 120 } });
  // C. column auto → row vanishes in app
  await sel(page, 'n9b2bink'); const infoL = JSON.parse(fs.readFileSync('api-Leqaa.json'));
  let b = await draftNode(ctx.request, infoL, 'home', 'n9b2bink');
  await R.locator('select[aria-label="Width"]').selectOption('auto'); await stored(ctx.request, infoL, 'home', 'n9b2bink', b);
  await sel(page, 'n8hptapu'); const t = page.locator('[data-studio-node="nyupi0na"]').first(); await t.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  const tb = await t.boundingBox();
  await page.screenshot({ path: 'ev/03a-row-canvas.png', clip: { x: tb.x - 20, y: tb.y - 80, width: tb.width + 40, height: tb.height + 300 } });
  console.log('app errs', await previewShot(ctx, 'Leqaa', 'en', 5, '../ev/03b-row-app'));
  // restore column fill
  b = await draftNode(ctx.request, infoL, 'home', 'n9b2bink'); await sel(page, 'n9b2bink'); await R.locator('select[aria-label="Width"]').selectOption('fill'); await stored(ctx.request, infoL, 'home', 'n9b2bink', b);
  // D. Arabic app after English edit (draft)
  console.log('ar errs', await previewShot(ctx, 'Leqaa', 'ar', 0, '../ev/04-app-ar'));
  console.log('tr errs', await previewShot(ctx, 'Leqaa', 'tr', 0, '../ev/04-app-tr'));
  // E. Our bouquet page canvas
  await page.getByRole('button', { name: /^Page:/ }).click(); await page.getByRole('button', { name: /Our bouquet/ }).first().click(); await page.waitForTimeout(1500);
  await page.screenshot({ path: 'ev/05-our-bouquet.png' });
  console.log(problems.join('\n'));
  await browser.close();
})();
