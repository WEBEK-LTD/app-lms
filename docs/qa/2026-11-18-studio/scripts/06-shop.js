const { open, problems, shot, useApp } = require('./lib');
const path = require('path');
const PH = '/home/user/app-lms/platform/web/public/flower-photos/';
const app = process.argv[2];
(async () => {
  const { browser, page } = await open({ tag: 'shop-' + app });
  await useApp(page, app);
  // currency
  await page.goto('/studio/project/catalog/settings');
  const sel = page.locator('main select').first();
  const opt = await sel.locator('option').evaluateAll(os => os.map(o => o.value + '|' + o.textContent).filter(t => /MAD/.test(t)));
  console.log('MAD options', opt);
  await page.waitForLoadState('networkidle'); await sel.selectOption('MAD');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.waitForTimeout(2000);
  await page.reload();
  console.log('currency now', await page.locator('main select').first().evaluate(s => s.options[s.selectedIndex].text));
  await shot(page, `shop-${app}-currency`);
  // categories
  await page.goto('/studio/project/catalog/categories');
  for (const c of [`${app} Weddings`, `${app} Ramadan`]) {
    await page.locator('#f-name').fill(c);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForTimeout(1500);
  }
  console.log('categories', await page.locator('input[id^=cat-]').evaluateAll(i => i.map(x => x.value)));
  // products
  const prods = [['Atlas Red Roses', 'red-rose.jpg', '350', `${app} Weddings`], ['Majorelle Orchid', 'orchid.jpg', '520', `${app} Ramadan`], ['Medina Ranunculus', 'ranunculus.jpg', '280', `${app} Weddings`]];
  for (const [name, file, price, cat] of prods) {
    await page.goto('/studio/project/catalog/new');
    await page.locator('#f-name').fill(`${name}`);
    await page.locator('#f-description').fill(`${name}, hand-tied in Marrakech.`);
    await page.locator('input[name=images]').setInputFiles(PH + file);
    await page.waitForTimeout(1500);
    console.log('price label', await page.locator('label[for=f-price]').innerText());
    await page.locator('#f-price').fill(price);
    await page.locator('#f-stock').fill('20');
    await page.getByRole('checkbox', { name: cat }).check();
    await page.getByRole('button', { name: 'Add product' }).click();
    await page.waitForURL(u => !u.pathname.endsWith('/new'), { timeout: 30000 });
    console.log('added', name, page.url());
  }
  await page.goto('/studio/project/catalog');
  await shot(page, `shop-${app}-products`, { fullPage: true });
  console.log((await page.locator('main').innerText()).slice(0, 800));
  console.log(problems.join('\n'));
  await browser.close();
})();
