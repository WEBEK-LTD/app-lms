const { open, editor, sel, right, previewShot, stored, draftNode } = require('./lib');
const fs = require('fs');
(async () => {
  const { browser, page, ctx } = await open({ dsf: 1 });
  const info = JSON.parse(fs.readFileSync('api-Leqaa.json'));
  await editor(page, 'Leqaa');
  const steps = [
    ['col-fill', async () => { await sel(page, 'n9b2bink'); await right(page).locator('select[aria-label="Width"]').selectOption('fill'); }, 'n9b2bink'],
    ['text-height-auto', async () => { await sel(page, 'n8hptapu'); await right(page).locator('select[aria-label="Height"]').selectOption('auto'); }, 'n8hptapu'],
    ['text-width-auto', async () => { await sel(page, 'n8hptapu'); await right(page).locator('select[aria-label="Width"]').selectOption('auto'); }, 'n8hptapu'],
  ];
  console.log('errs before', await previewShot(ctx, 'Leqaa', 'en', 2, 'bisect-0'));
  for (const [name, fn, id] of steps) {
    const b = await draftNode(ctx.request, info, 'home', id);
    await fn(); await stored(ctx.request, info, 'home', id, b);
    console.log(name, 'errs', await previewShot(ctx, 'Leqaa', 'en', 2, 'bisect-' + name));
  }
  await browser.close();
})();
