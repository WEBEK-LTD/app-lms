const { open, problems, shot, editor, sel, right, draftNode, diff, canvasState, stored } = require('./lib');
const fs = require('fs');
(async () => {
  const app = 'Leqaa', id = 'nlv2q5it'; // Text «Kind words»
  const { browser, page, ctx } = await open({ tag: 'probe' });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  await editor(page, app); await sel(page, id);
  const R = right(page);
  let b = await draftNode(ctx.request, info, 'home', id);
  console.log('start', JSON.stringify(b).slice(0, 300));
  const step = async (name, fn) => { const c0 = await canvasState(page, id); const n0 = problems.length; let err = null; try { await fn(); } catch (e) { err = e.message.split('\n')[0]; } const a = await stored(ctx.request, info, 'home', id, b, 6000); const c1 = await canvasState(page, id); console.log('-', name, err || '', '\n   stored', JSON.stringify(diff(b, a)).slice(0, 300), '\n   canvas', JSON.stringify(Object.fromEntries(Object.keys(c1).filter(k => c0[k] !== c1[k]).map(k => [k, c0[k] + ' → ' + c1[k]]))), problems.slice(n0).join('|').slice(0, 300)); b = a; };
  await step('Lines at most 1 (typed)', async () => { const i = R.locator('input[aria-label="Lines at most"]'); console.log('   lines inputs', await i.count(), await i.first().inputValue()); await i.first().click(); await i.first().pressSequentially('1'); await i.first().press('Tab'); });
  await step('Font → Outfit via list', async () => { const f = R.getByRole('combobox', { name: 'Font' }); await f.click(); await f.fill('Outfit'); await page.waitForTimeout(400); const o = page.getByRole('option', { name: /Outfit/ }); console.log('   options', await o.count()); await o.first().click(); });
  await step('Shadow Medium', async () => { await R.getByRole('radiogroup', { name: 'Shadow' }).getByRole('radio', { name: 'Medium' }).click(); });
  await R.getByRole('tab', { name: 'Motion' }).click();
  await step('Enter: Rise', async () => { await R.locator('label').filter({ hasText: /^When it shows/ }).locator('select').selectOption('slide_up'); });
  await step('Press: Bounce', async () => { await R.getByRole('radio', { name: 'Bounce' }).click(); });
  await step('Loop: Pulse', async () => { await R.getByRole('radio', { name: 'Pulse' }).click(); });
  await step('Play it', async () => { await R.getByRole('button', { name: /Play it/ }).click(); await page.waitForTimeout(500); });
  await shot(page, 'probe-motion');
  await browser.close();
})();
