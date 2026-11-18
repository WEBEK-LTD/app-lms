const { open, problems, shot, editor, sel, right, draftNode, diff, stored, layers } = require('./lib');
const fs = require('fs');
const app = process.argv[2];
(async () => {
  const { browser, page, ctx } = await open({ tag: 'cover', dsf: 2 });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  await editor(page, app);
  const L = await layers(page);
  const word = L.find(l => l.label.includes(`Text «${app.slice(0, 20)}`));
  const i = L.indexOf(word);
  const row = [...L.slice(0, i)].reverse().find(l => l.depth < word.depth);
  const sibs = L.filter((l, j) => j > L.indexOf(row) && l.depth === word.depth).slice(0, 4);
  console.log('row', row.label.split('\n')[0], row.id, 'children', sibs.map(s => s.label.replace(/\s+/g, ' ').slice(0, 30) + ' ' + s.id).join(' | '));
  const frame = await page.locator('[data-studio-frame]').first().boundingBox();
  const pos = async () => { const o = {}; for (const s of [row, ...sibs.slice(0, 3)]) { const b = await page.locator(`[data-studio-node="${s.id}"]`).first().boundingBox(); o[s.id] = b ? `x=${Math.round(b.x - frame.x)} w=${Math.round(b.width)} y=${Math.round(b.y - frame.y)} h=${Math.round(b.height)}` : 'none'; } return o; };
  console.log('frame', frame);
  await sel(page, word.id);
  let before = await draftNode(ctx.request, info, 'home', word.id);
  console.log('wordmark stored', JSON.stringify({ width: before && before.width, height: before && before.height }), 'row node', JSON.stringify(await draftNode(ctx.request, info, 'home', row.id).then(n => n && { ...n, children: (n.children || []).map(c => ({ id: c.id, type: c.type, width: c.width, height: c.height })) })).slice(0, 700));
  console.log('initial', JSON.stringify(await pos()));
  for (const v of ['hug', 'fill', 'auto', 'fixed']) {
    await right(page).locator('select[aria-label="Width"]').selectOption(v);
    const after = await stored(ctx.request, info, 'home', word.id, before); before = after;
    await page.waitForTimeout(400);
    console.log('wordmark Width=' + v, '→', JSON.stringify(await pos()));
    if (v === 'fill') await shot(page, `cover-${app}-fill`, { clip: { x: frame.x - 10, y: frame.y - 10, width: frame.width + 20, height: 160 } });
  }
  await right(page).locator('select[aria-label="Width"]').selectOption('fill');
  await page.waitForTimeout(1500);
  console.log(problems.join('\n'));
  await browser.close();
})();
