const { open, problems, useApp } = require('./lib');
(async () => {
  const { browser, page } = await open();
  await useApp(page, 'Leqaa');
  await page.goto('/studio/project/catalog/settings');
  const sel = page.locator('main select').first();
  console.log(await sel.evaluate(s => s.name + ' ' + s.options.length + ' ' + [...s.options].map(o => o.value + ':' + o.text).join(', ')));
  await page.locator('main input[placeholder="Name, code or sign"]').first().fill('MAD');
  await page.waitForTimeout(500);
  console.log(await sel.evaluate(s => s.options.length + ' ' + [...s.options].map(o => o.value + ':' + o.text).join(', ')));
  await page.locator('main input[placeholder="Name, code or sign"]').first().fill('Moroccan');
  await page.waitForTimeout(500);
  console.log(await sel.evaluate(s => s.options.length + ' ' + [...s.options].map(o => o.value + ':' + o.text).join(', ')));
  await browser.close();
})();
