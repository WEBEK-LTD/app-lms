const { open, problems, shot, editor, sel, right, draftNode, stored, diff } = require('./lib');
const fs = require('fs');
(async () => {
  const app = 'Leqaa', id = 'nsj89uho';
  const { browser, page, ctx } = await open({ tag: 'taps', dsf: 2 });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  await editor(page, app); await sel(page, id);
  const tapSel = () => right(page).locator('label').filter({ hasText: /^When the customer taps/ }).locator('select').first();
  const opts = await tapSel().evaluate(s => [...s.options].map(o => o.value + '=' + o.text));
  console.log('OPTIONS', opts.length, opts.join(' | '));
  let b = await draftNode(ctx.request, info, 'home', id);
  const want = [/^item$/];
  for (const re of want) {
    const o = opts.find(x => re.test(x.split('=')[0]));
    if (!o) { console.log('no option for', re); continue; }
    await tapSel().selectOption(o.split('=')[0]);
    await page.waitForTimeout(500);
    const sub = await right(page).locator('label').filter({ hasText: /^When the customer taps/ }).locator('xpath=..').locator('input,select').evaluateAll(es => es.map(e => (e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].innerText.split('\n')[0]) || e.placeholder || e.tagName) + (e.tagName === 'SELECT' ? '{' + [...e.options].slice(0, 6).map(x => x.text).join(',') + '}' : '')));
    console.log('\nchose', o, '→ sub-controls:', sub.join(' ; ').slice(0, 500));
    // fill sub choices
    const all = await right(page).locator('label').filter({ hasText: /^When the customer taps/ }).locator('xpath=..').locator('select').evaluateAll(ss => ss.map(s => (s.getAttribute('aria-label')||'') + ': ' + [...s.options].map(x => x.value + '=' + x.text).join(', ')));
    console.log('  ALL SELECTS:\n   ' + all.join('\n   ').slice(0, 2500));
    const srcSel = right(page).locator('label').filter({ hasText: /^When the customer taps/ }).locator('xpath=..').locator('select').nth(1);
    for (const v of ['categories', 'products']) { if (await srcSel.locator(`option[value="${v}"]`).count()) { await srcSel.selectOption(v); await page.waitForTimeout(600); const s3 = right(page).locator('label').filter({ hasText: /^When the customer taps/ }).locator('xpath=..').locator('select').nth(2); const os = await s3.evaluate(s => [...s.options].map(x => x.value + '=' + x.text)).catch(() => []); console.log('  source', v, 'entries:', os.join(', ').slice(0, 600)); const pick = os.map(x => x.split('=')[0]).filter(Boolean).pop(); if (pick) await s3.selectOption(pick); const a = await stored(ctx.request, info, 'home', id, b); console.log('  stored', JSON.stringify(a && a.action)); b = a; } }
    const subSel = right(page).locator('label').filter({ hasText: /^When the customer taps/ }).locator('xpath=..').locator('select').nth(1);
    if (await subSel.count()) { const v = await subSel.evaluate(s => [...s.options].map(x => x.value).filter(Boolean)[0]); if (v) await subSel.selectOption(v); }
    const txt = right(page).locator('label').filter({ hasText: /^When the customer taps/ }).locator('xpath=..').locator('input[type=url],input[type=text]').first();
    if (/link|url|web/.test(o) && await txt.count()) { await txt.fill('https://leqaa.qa.test/about'); await txt.press('Tab'); }
    const a = await stored(ctx.request, info, 'home', id, b); console.log('  stored action:', JSON.stringify(a && a.action)); b = a;
    if (/product/.test(o)) await shot(page, 'tap-product');
  }
  console.log(problems.join('\n'));
  await browser.close();
})();
