const { open, problems, shot, editor, pick } = require('./lib');
(async () => {
  const [app, ...ids] = process.argv.slice(2);
  const { browser, page } = await open({ tag: 'inspect' });
  await editor(page, app);
  console.log('asides', await page.locator('aside').count());
  for (const id of ids) {
    await page.locator(`[data-studio-layer="${id}"] button`).filter({ hasText: /./ }).first().click();
    await page.waitForTimeout(300);
    const sel = await page.locator(`[data-studio-node="${id}"]`).first().boundingBox();
    const right = page.locator('aside').last();
    console.log('=====', id, 'canvas box', sel);
    const ctrls = await right.locator('input,select,textarea,button').evaluateAll(es => es.filter(e => e.offsetParent).map(e => {
      const lab = e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].innerText) || e.title || e.innerText || e.placeholder || '';
      return `${e.tagName.toLowerCase()}${e.type ? ':' + e.type : ''}[${lab.replace(/\s+/g, ' ').slice(0, 40)}]${e.value !== undefined && e.tagName !== 'BUTTON' ? '=' + String(e.value).slice(0, 30) : ''}${e.getAttribute('aria-pressed') === 'true' ? '*' : ''}`;
    }));
    console.log((await right.innerText()).split('\n').filter(Boolean).slice(0, 12).join(' / '));
    console.log(ctrls.join('\n'));
    await shot(page, `inspect-${app}-${id}`);
  }
  console.log(problems.join('\n'));
  await browser.close();
})();
