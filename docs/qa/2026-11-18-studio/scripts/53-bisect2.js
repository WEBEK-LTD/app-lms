const { open, editor, sel, right, previewShot, stored, draftNode } = require('./lib');
const fs = require('fs');
(async () => {
  const { browser, page, ctx } = await open({ dsf: 1 });
  const info = JSON.parse(fs.readFileSync('api-Leqaa.json'));
  await editor(page, 'Leqaa');
  const setH = async (id, which, v, n) => { await sel(page, id); await right(page).locator(`select[aria-label="${which}"]`).selectOption(v); if (n) { const i = right(page).locator(`input[aria-label="${which}"]`); await i.fill(String(n)); await i.press('Tab'); } };
  const steps = [
    ['A-text-height-60', () => setH('n8hptapu', 'Height', 'fixed', 60), 'n8hptapu'],
    ['B-text-height-auto+col-auto', async () => { await setH('n8hptapu', 'Height', 'auto'); await setH('n9b2bink', 'Width', 'auto'); }, 'n9b2bink'],
    ['C-text-width-150', () => setH('n8hptapu', 'Width', 'fixed', 150), 'n8hptapu'],
  ];
  for (const [name, fn, id] of steps) {
    const b = await draftNode(ctx.request, info, 'home', id);
    await fn(); await stored(ctx.request, info, 'home', id, b); await page.waitForTimeout(1500);
    console.log(name, JSON.stringify(await draftNode(ctx.request, info, 'home', 'n9b2bink')).slice(0, 400));
    console.log('  errs', await previewShot(ctx, 'Leqaa', 'en', 1, 'bisect2-' + name));
  }
  await browser.close();
})();
