const { open, problems, shot, editor, sel, right, draftNode, stored, served, lang, publish, fetchApp, findNode } = require('./lib');
const fs = require('fs');
const app = 'Leqaa';
(async () => {
  const { browser, page, ctx } = await open({ tag: 'lists', dsf: 2 });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  await editor(page, app);
  const R = () => right(page);
  const show = async (id, f) => { const s = await served(ctx.request, info, 'home', id, true); return Object.fromEntries(Object.entries(s).map(([l, n]) => [l, n ? f(n) : n])); };
  const step = async (label, id, fn, f) => { const b = await draftNode(ctx.request, info, 'home', id); const n0 = problems.length; let err = ''; try { await fn(); } catch (e) { err = ' ERR ' + e.message.split('\n')[0].slice(0, 120); } await stored(ctx.request, info, 'home', id, b); console.log('-', label + err, JSON.stringify(await show(id, f)).slice(0, 700), problems.slice(n0).join('|').slice(0, 200)); };
  // Kind words (testimonials)
  const tw = 'nznpg1yg'; await sel(page, tw);
  const q = n => (n.entries || []).map(e => (e.text || '').slice(0, 30) + '/' + (e.title || ''));
  console.log('Kind words start', JSON.stringify(await show(tw, q)));
  await step('KW edit quote 1 (EN)', tw, async () => { await R().getByRole('button', { name: /^1\./ }).first().click(); await page.waitForTimeout(300); const t = R().getByLabel('Quote', { exact: true }).first(); await t.fill('QA quote EN'); await t.press('Tab'); }, q);
  //await step('KW add one', tw, async () => { await R().getByRole('button', { name: /Add/ }).last().click(); }, q);
  await shot(page, 'list-kindwords');
  // Stories rings
  const st = 'ncz19evr'; await sel(page, st);
  const sq = n => (n.slides || []).map(e => (e.heading || '') + '|' + (e.text || '').slice(0, 20) + '|' + JSON.stringify(e.action || null).slice(0,50));
  console.log('Stories start', JSON.stringify(await show(st, sq)).slice(0, 900));
  await step('Stories: title 1 EN', st, async () => { const i = R().getByLabel('Title under the ring', { exact: true }).first(); await i.fill('QA ring'); await i.press('Tab'); }, sq);
  const ctrls = await R().locator('select').evaluateAll(ss => ss.map(s => (s.getAttribute('aria-label') || (s.labels[0] && s.labels[0].innerText.split('\n')[0]) || '?') + '{' + [...s.options].slice(0, 5).map(o => o.value).join(',') + '}'));
  console.log('  story selects:', ctrls.slice(0, 12).join(' ; '));
  await step('Stories: add a story', st, async () => { await R().getByRole('button', { name: /Add a story/ }).click(); }, sq);
  await shot(page, 'list-stories');
  // Marquee
  const mq = 'nxfnyloe'; await sel(page, mq);
  const mf = n => n.text;
  console.log('Marquee start', JSON.stringify(await show(mq, mf)).slice(0, 600));
  await step('Marquee: words (EN)', mq, async () => { const t = R().getByLabel('Words, a line each'); await t.fill('Roses\nTulips\nQA word'); await t.press('Tab'); }, mf);
  // Bento collections
  const bn = 'n3kwsf4f'; await sel(page, bn);
  const bf = n => (n.entries || []).map(e => (e.title || '') + '|' + (e.subtitle || ''));
  console.log('Bento start', JSON.stringify(await show(bn, bf)).slice(0, 900));
  await step('Bento: tile 1 title EN', bn, async () => { await R().getByRole('button', { name: /^1\./ }).first().click().catch(()=>{}); await page.waitForTimeout(300); const i = R().getByLabel('Title', { exact: true }).first(); await i.fill('QA tile'); await i.press('Tab'); }, bf);
  await step('Bento: add one', bn, async () => { await R().getByRole('button', { name: /Add one/ }).click(); }, bf);
  console.log(problems.join('\n'));
  await browser.close();
})();
