const { open, problems, shot, editor, sel, right, lang, waitSaved, publish, served, apiInfo } = require('./lib');
const fs = require('fs');
(async () => {
  const app = 'Leqaa';
  const { browser, page, ctx } = await open({ tag: 'lang', dsf: 2 });
  await editor(page, app);
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  const R = {};
  const id = 'nkbvnh10'; // "Say it with roses." hero title
  R.before = await served(ctx.request, info, 'home', id, true);
  await sel(page, id);
  const ta = right(page).locator('textarea').first();
  R.taEN0 = await ta.inputValue();
  await ta.fill('QA rose headline EN');
  await waitSaved(page);
  R.canvasEN = await page.locator(`[data-studio-node="${id}"]`).first().innerText();
  for (const l of ['ar', 'tr']) {
    await lang(page, l);
    await sel(page, id);
    R['ta_' + l] = await right(page).locator('textarea').first().inputValue().catch(e => 'ERR ' + e.message);
    R['placeholder_' + l] = await right(page).locator('textarea').first().getAttribute('placeholder').catch(() => null);
    R['canvas_' + l] = await page.locator(`[data-studio-node="${id}"]`).first().innerText();
    R['htmlDir_' + l] = await page.locator('[data-studio-frame]').first().evaluate(e => getComputedStyle(e).direction);
    await shot(page, `lang-${app}-${l}`);
  }
  await lang(page, 'en');
  R.draftAfter = await served(ctx.request, info, 'home', id, true);
  await publish(page);
  R.publishedAfter = await served(ctx.request, info, 'home', id, false);
  const pick = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v && (v.text ?? v)]));
  console.log(JSON.stringify({ ...R, before: pick(R.before), draftAfter: pick(R.draftAfter), publishedAfter: pick(R.publishedAfter) }, null, 1));
  console.log('translations in draft node?', JSON.stringify(R.draftAfter.en && R.draftAfter.en.translations));
  console.log(problems.join('\n'));
  await browser.close();
})();
