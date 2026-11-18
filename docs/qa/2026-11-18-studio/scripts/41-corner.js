const { open, problems, shot, editor, sel, right, draftNode, diff, canvasState, stored } = require('./lib');
const fs = require('fs');
const [app, ...ids] = process.argv.slice(2);
(async () => {
  const { browser, page, ctx } = await open({ tag: 'corner', dsf: 2 });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  await editor(page, app);
  for (const id of ids) {
    await sel(page, id);
    await page.locator(`[data-studio-node="${id}"]`).first().scrollIntoViewIfNeeded();
    let before = await draftNode(ctx.request, info, 'home', id);
    const c0 = await canvasState(page, id);
    const hs = await page.locator('[data-studio-resize]').evaluateAll(h => h.map(x => x.dataset.studioResize + '@' + Math.round(x.getBoundingClientRect().x) + ',' + Math.round(x.getBoundingClientRect().y)));
    console.log('==', id, 'box', c0.x, c0.y, c0.w, c0.h, 'handles', hs.join(' '));
    const h = page.locator('[data-studio-resize="bottom-right"]').first(); const hb = await h.boundingBox();
    if (!hb) { console.log('  no BR handle'); continue; }
    const evs = [];
    await page.evaluate(() => { window.__ev = []; for (const t of ['pointerdown', 'pointermove', 'pointerup']) document.addEventListener(t, e => window.__ev.push(t + ':' + (e.target.dataset && e.target.dataset.studioResize || e.target.tagName)), true); });
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down();
    await page.mouse.move(hb.x - 30, hb.y + 30, { steps: 8 }); await page.mouse.up();
    console.log('  events', (await page.evaluate(() => window.__ev)).slice(0, 6).join(' '));
    const after = await stored(ctx.request, info, 'home', id, before);
    const c1 = await canvasState(page, id);
    console.log('  drag BR (-30,+30): stored', JSON.stringify(diff(before, after)), 'canvas', c0.w + 'x' + c0.h, '→', c1.w + 'x' + c1.h);
    const hb2 = await page.locator('[data-studio-resize="bottom-right"]').first().boundingBox();
    await page.mouse.dblclick(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2);
    const after2 = await stored(ctx.request, info, 'home', id, after);
    const c2 = await canvasState(page, id);
    console.log('  dblclick BR: stored', JSON.stringify(diff(after, after2)), 'canvas →', c2.w + 'x' + c2.h);
  }
  console.log(problems.join('\n'));
  await browser.close();
})();
