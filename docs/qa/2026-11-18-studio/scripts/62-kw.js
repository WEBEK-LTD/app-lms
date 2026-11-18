const { open, problems, shot, editor, sel, right, draftNode, stored, served, lang } = require('./lib');
const fs = require('fs');
(async () => {
  const { browser, page, ctx } = await open({ tag: 'kw', dsf: 2 });
  const info = JSON.parse(fs.readFileSync('api-Leqaa.json'));
  await editor(page, 'Leqaa'); await sel(page, 'nznpg1yg');
  const R = right(page);

  console.log('textareas', await R.locator('textarea').count(), await R.locator('textarea').evaluateAll(t => t.map(x => (x.getAttribute('aria-label') || '') + '=' + x.value)));
  const q = n => (n.entries || []).map(e => (e.text || '').slice(0, 30));
  const step = async (label, fn) => { const b = await draftNode(ctx.request, info, 'home', 'nznpg1yg'); await fn(); await stored(ctx.request, info, 'home', 'nznpg1yg', b); const s = await served(ctx.request, info, 'home', 'nznpg1yg', true); console.log('-', label, JSON.stringify(Object.fromEntries(Object.entries(s).map(([l, n]) => [l, q(n)])))); };
  await step('quote 1 EN', async () => { const t = R.locator('textarea').first(); await t.fill('QA quote EN'); await t.press('Tab'); });
  await lang(page, 'ar'); await sel(page, 'nznpg1yg');

  console.log('AR field value:', await R.locator('textarea').first().inputValue().catch(e => 'n/a'), 'dir', await R.locator('textarea').first().evaluate(e => getComputedStyle(e).direction).catch(() => ''));
  await step('quote 1 in AR mode', async () => { const t = R.locator('textarea').first(); await t.fill('اقتباس QA'); await t.press('Tab'); });
  await shot(page, 'kw-ar');
  await lang(page, 'en');
  // Bento tile
  await sel(page, 'n3kwsf4f'); await page.waitForTimeout(400);
  const ins = await R.locator('input[type=text]').evaluateAll(t => t.map(x => (x.getAttribute('aria-label') || (x.labels[0] && x.labels[0].innerText) || '') + '=' + x.value));
  console.log('bento inputs', ins.slice(0, 6));
  console.log(problems.join('\n'));
  await browser.close();
})();
