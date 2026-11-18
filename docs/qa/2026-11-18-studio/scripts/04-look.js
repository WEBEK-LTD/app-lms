const { open, problems, shot } = require('./lib');
(async () => {
  const { browser, page } = await open({ tag: 'look' });
  for (const u of process.argv.slice(2)) {
    await page.goto(u); await page.waitForLoadState('networkidle');
    const n = u.replace(/[^a-z0-9]+/gi, '_');
    await shot(page, 'look' + n, { fullPage: true });
    console.log('==', u, page.url());
    console.log((await page.locator('main').first().innerText().catch(() => page.locator('body').innerText())).slice(0, 1500));
    console.log('forms:', await page.locator('input,select,textarea,button').evaluateAll(es => es.filter(e => e.offsetParent).map(e => `${e.tagName}:${e.name || ''}:${e.getAttribute('aria-label') || ''}:${(e.innerText || e.value || '').slice(0, 30)}`).slice(0, 80).join(' | ')));
  }
  console.log(problems.join('\n'));
  await browser.close();
})();
