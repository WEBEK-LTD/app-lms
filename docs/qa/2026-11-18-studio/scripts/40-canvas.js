const { open, problems, shot, editor, sel, right, draftNode, diff, canvasState, stored, layers } = require('./lib');
const fs = require('fs');
const app = process.argv[2] || 'Leqaa';
(async () => {
  const { browser, page, ctx } = await open({ tag: 'canvas', dsf: 2 });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  await editor(page, app);
  const L = await layers(page);
  const find = re => L.find(l => re.test(l.label));
  // 1. select by clicking on the canvas
  for (const re of []) {
    const l = L.filter(x => re.test(x.label.replace(/\s*lock\s*visibility\s*$/, '').trim())).pop(); if (!l) { console.log('no layer', re); continue; }
    const box = await page.locator(`[data-studio-node="${l.id}"]`).first().boundingBox();
    await page.locator(`[data-studio-node="${l.id}"]`).first().scrollIntoViewIfNeeded();
    const b2 = await page.locator(`[data-studio-node="${l.id}"]`).first().boundingBox();
    await page.mouse.click(b2.x + Math.min(10, b2.width / 2), b2.y + Math.min(8, b2.height / 2));
    await page.waitForTimeout(300);
    const head = (await right(page).innerText()).split('\n').slice(0, 2).join(' / ');
    const layerSel = await page.locator(`[data-studio-layer="${l.id}"]`).evaluate(e => e.style.fontWeight === '700').catch(() => 'n/a');
    console.log('canvas click', l.label.split(' lock')[0], '→ inspector:', head, '| layer highlighted:', layerSel);
  }
  // 2. corner drag on "Start" button
  const start = { id: "nag67gh9" };
  await sel(page, start.id);
  const node = page.locator(`[data-studio-node="${start.id}"]`).first();
  await node.scrollIntoViewIfNeeded();
  let before = await draftNode(ctx.request, info, 'home', start.id);
  const c0 = await canvasState(page, start.id);
  const h = page.locator('[data-studio-resize="bottom-right"]').first();
  const hb = await h.boundingBox();
  console.log('handle', hb, 'node', c0);
  await page.mouse.move(hb.x + 5, hb.y + 5); await page.mouse.down();
  await page.mouse.move(hb.x - 40, hb.y + 20, { steps: 6 }); await page.mouse.up();
  let after = await stored(ctx.request, info, 'home', start.id, before);
  console.log('drag BR corner -40,+20: stored', JSON.stringify(diff(before, after)), 'canvas', JSON.stringify(await canvasState(page, start.id)));
  console.log('inspector width/height:', await right(page).locator('select[aria-label="Width"]').inputValue().catch(() => '?'), await right(page).locator('input[aria-label="Width"]').inputValue().catch(() => '-'), await right(page).locator('input[aria-label="Height"]').first().inputValue().catch(() => '-'));
  await shot(page, `canvas-${app}-drag`);
  before = after;
  const h2 = page.locator('[data-studio-resize="bottom-right"]').first(); const hb2 = await h2.boundingBox();
  await page.mouse.dblclick(hb2.x + 5, hb2.y + 5);
  after = await stored(ctx.request, info, 'home', start.id, before);
  console.log('double-click corner: stored', JSON.stringify(diff(before, after)), 'canvas', JSON.stringify(await canvasState(page, start.id)));
  // shift drag (keep ratio) on top-left
  before = after;
  const h3 = page.locator('[data-studio-resize="top-left"]').first(); const hb3 = await h3.boundingBox();
  await page.keyboard.down('Shift'); await page.mouse.move(hb3.x + 5, hb3.y + 5); await page.mouse.down(); await page.mouse.move(hb3.x + 30, hb3.y + 10, { steps: 5 }); await page.mouse.up(); await page.keyboard.up('Shift');
  after = await stored(ctx.request, info, 'home', start.id, before);
  console.log('shift-drag TL corner: stored', JSON.stringify(diff(before, after)));
  console.log('console:', problems.join('\n'));
  await browser.close();
})();
