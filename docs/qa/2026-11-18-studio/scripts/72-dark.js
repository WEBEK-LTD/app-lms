const { open, problems, shot, editor, sel, right, draftNode, stored, diff, canvasState } = require('./lib');
const fs = require('fs');
(async () => {
  const app = 'KechFlora', id = 'nhnjiajo';
  const { browser, page, ctx } = await open({ tag: 'dark', dsf: 2 });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  await editor(page, app); await sel(page, id);
  const R = right(page);
  let b = await draftNode(ctx.request, info, 'home', id);
  const colourRows = async () => (await R.locator('button').evaluateAll(bs => bs.map(x => x.getAttribute('aria-label') || x.innerText).filter(t => /colour|Background/i.test(t)))).join(' | ');
  console.log('light rows:', await colourRows());
  await R.getByRole('button', { name: /^Text colour/ }).first().click(); await page.waitForTimeout(200);
  await R.getByRole('button', { name: '#E8A486', exact: true }).first().click().catch(async e => { const sw = await R.locator('button[aria-label^="#"]').evaluateAll(x => x.map(y => y.getAttribute('aria-label'))); console.log('swatches', sw.slice(0, 10)); await R.locator('button[aria-label^="#"]').nth(1).click(); });
  let a = await stored(ctx.request, info, 'home', id, b); console.log('LIGHT swatch → stored', JSON.stringify(diff(b, a)), 'canvas color', (await canvasState(page, id)).color); b = a;
  await page.getByRole('button', { name: /Light \/ dark/ }).click(); await page.waitForTimeout(600);
  console.log('dark toggle → canvas color', (await canvasState(page, id)).color, '| rows:', await colourRows());
  await R.getByRole('button', { name: /^Text colour/ }).first().click(); await page.waitForTimeout(200);
  await R.locator('button[aria-label^="#"]').nth(3).click();
  a = await stored(ctx.request, info, 'home', id, b); console.log('DARK swatch → stored', JSON.stringify(diff(b, a)), 'canvas color', (await canvasState(page, id)).color); b = a;
  // custom colour input
  const ci = R.locator('input[type=color]').first(); await ci.evaluate((e) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(e, '#123456'); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); });
  a = await stored(ctx.request, info, 'home', id, b); console.log('DARK custom #123456 → stored', JSON.stringify(diff(b, a))); b = a;
  await shot(page, 'dark-canvas');
  // background
  await R.getByRole('button', { name: /^Background/ }).first().click(); await page.waitForTimeout(200);
  await R.locator('button[aria-label^="#"]').nth(0).click();
  a = await stored(ctx.request, info, 'home', id, b); console.log('DARK background swatch → stored', JSON.stringify(diff(b, a))); b = a;
  await page.getByRole('button', { name: /Light \/ dark/ }).click();
  console.log(problems.join('\n'));
  await browser.close();
})();
