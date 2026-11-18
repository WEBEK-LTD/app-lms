const { open, problems, shot, editor, sel, right, fetchApp, findNode, layers } = require('./lib');
const fs = require('fs');
const app = 'KechFlora';
(async () => {
  const { browser, page, ctx } = await open({ tag: 'struct', dsf: 2 });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  await editor(page, app);
  const body = async () => { const r = await fetchApp(ctx.request, info, '/pages/home', 'en', true); return r.json.studio.body.children.map(c => c.id); };
  const waitChange = async (prev) => { const t0 = Date.now(); let b; while (Date.now() - t0 < 7000) { b = await body(); if (JSON.stringify(b) !== JSON.stringify(prev)) return b; await page.waitForTimeout(400); } return b; };
  const R = right(page);
  const id = 'nnaxbhbv';
  let b0 = await body(); console.log('body', b0.join(','));
  const idx = a => a.indexOf(id);
  await sel(page, id);
  await R.getByRole('button', { name: 'Move up', exact: true }).click();
  let b1 = await waitChange(b0); console.log('Move up: index', idx(b0), '→', idx(b1));
  await R.getByRole('button', { name: 'Move down', exact: true }).click();
  let b2 = await waitChange(b1); console.log('Move down: index →', idx(b2));
  await R.getByRole('button', { name: 'Duplicate', exact: true }).click();
  let b3 = await waitChange(b2); const dup = b3.find(x => !b2.includes(x)); console.log('Duplicate: count', b2.length, '→', b3.length, 'new', dup, 'at', b3.indexOf(dup), 'selected now:', (await R.innerText()).split('\n')[1]);
  await R.getByRole('button', { name: 'Delete', exact: true }).click();
  let b4 = await waitChange(b3); console.log('Delete: count →', b4.length, 'dup still there?', b4.includes(dup));
  await page.keyboard.press('Control+z');
  let b5 = await waitChange(b4); console.log('Ctrl+Z: count →', b5.length, 'dup back?', b5.includes(dup));
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  let b6 = await waitChange(b5); console.log('Redo (bar): count →', b6.length, 'dup back?', b6.includes(dup));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  let b7 = await waitChange(b6); console.log('Undo (bar): count →', b7.length);
  await page.keyboard.press('Control+Shift+z');
  let b8 = await waitChange(b7); console.log('Ctrl+Shift+Z: count →', b8.length);
  await page.keyboard.press('Control+y');
  // Ctrl+D duplicate
  await sel(page, id); await page.keyboard.press('Control+d');
  let b9 = await waitChange(b8); console.log('Ctrl+D: count', b8.length, '→', b9.length);
  const dup2 = b9.find(x => !b8.includes(x));
  if (dup2) { await sel(page, dup2); await page.keyboard.press('Delete'); const b10 = await waitChange(b9); console.log('Delete key: count →', b10.length); }
  // lock
  const lockBtn = page.locator(`[data-studio-layer="${id}"] button[aria-pressed]`).first();
  await lockBtn.click(); await page.waitForTimeout(1600);
  const nodeL = await fetchApp(ctx.request, info, '/pages/home', 'en', true).then(r => findNode(r.json.studio, id));
  await sel(page, id);
  const handles = await page.locator('[data-studio-resize]').count();
  const delDisabled = await R.getByRole('button', { name: 'Delete', exact: true }).isDisabled().catch(() => 'n/a');
  console.log('Lock: aria-pressed', await lockBtn.getAttribute('aria-pressed'), '| served locked:', nodeL && nodeL.locked, '| resize handles active:', handles, '| Delete disabled:', delDisabled, '| inspector inputs disabled:', await R.locator('input:disabled,select:disabled').count());
  await shot(page, 'struct-locked');
  await lockBtn.click();
  // hide via eye
  const eye = page.locator(`[data-studio-layer="${id}"] [data-studio-layer-tools] button`).nth(1);
  console.log('eye label', await eye.getAttribute('aria-label'));
  await eye.click(); await page.waitForTimeout(2000);
  const hid = await fetchApp(ctx.request, info, '/pages/home', 'en', true).then(r => findNode(r.json.studio, id));
  console.log('Hide: served node present?', !!hid, '| canvas opacity', await page.locator(`[data-studio-node="${id}"]`).first().evaluate(e => getComputedStyle(e).opacity).catch(() => 'not drawn'));
  await eye.click(); await page.waitForTimeout(2000);
  console.log('Unhide: served present?', !!(await fetchApp(ctx.request, info, '/pages/home', 'en', true).then(r => findNode(r.json.studio, id))));
  // drag reorder in layers: drag coupon layer above flash sale
  const before = await body();
  const src = page.locator(`[data-studio-layer="${id}"]`), dst = page.locator(`[data-studio-layer="ni0r6w8u"]`);
  await src.dragTo(dst, { targetPosition: { x: 20, y: 3 } });
  const after = await waitChange(before); console.log('Layer drag: index', before.indexOf(id), '→', after.indexOf(id));
  console.log('console:', problems.join('\n'));
  await browser.close();
})();
