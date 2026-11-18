const { open, problems, shot } = require('./lib');
(async () => {
  const { browser, page } = await open({ tag: 'forms' });
  await page.goto('/studio');
  console.log(await page.locator('button[name=to]').evaluateAll(b => b.map(x => x.value + ' ' + x.innerText.replace(/\n/g, ' ') + ' form=' + (x.form && x.form.action))));
  for (const u of ['/studio/project/catalog/new', '/studio/project/catalog/categories']) {
    await page.goto(u); await page.waitForLoadState('networkidle');
    await shot(page, 'form' + u.replace(/\W+/g, '_'), { fullPage: true });
    console.log('==', u);
    console.log(await page.locator('main input, main select, main textarea, main button').evaluateAll(es => es.map(e => `${e.tagName}#${e.id}:${e.name}:${e.type}:${e.getAttribute('aria-label') || ''}:${(e.labels && e.labels[0] ? e.labels[0].innerText : '').slice(0, 30)}:${(e.innerText || '').slice(0, 25)}`).join('\n')));
  }
  console.log(problems.join('\n'));
  await browser.close();
})();
