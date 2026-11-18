const { open, problems, shot } = require('./lib');
(async () => {
  const { browser, page } = await open({ fresh: true, tag: 'admin' });
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill('studio-setup-admin@yallapp.test');
  await page.getByLabel('Password', { exact: true }).fill('admin-password-for-e2e');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(u => u.pathname.startsWith('/admin'));
  await page.goto('/admin?q=' + encodeURIComponent('leqaa-owner@qa.test'));
  const acts = page.getByRole('link', { name: /Activate/ });
  console.log('activate links', await acts.count(), await acts.evaluateAll(a => a.map(x => x.getAttribute('href') + ' ' + x.textContent)));
  const hrefs = await acts.evaluateAll(a => a.map(x => x.getAttribute('href')));
  await page.goto(hrefs[0]);
  await page.getByRole('link', { name: /Open Salma Owner/ }).click();
  await page.waitForLoadState('networkidle');
  await shot(page, 'admin-client');
  const btns = page.getByRole('button', { name: /Activate/ });
  console.log('buttons', await btns.allInnerTexts());
  const forms = await page.locator('form').filter({ has: page.getByRole('button', { name: /Activate/ }) }).count();
  console.log('forms', forms, page.url());
  for (let i = 0; i < 2; i++) {
    const f = page.locator('form').filter({ has: page.getByRole('button', { name: /Activate & send/ }) }).first();
    const sel = await f.locator('select').evaluateAll(ss => ss.map(s => s.name + '=' + s.value + ' [' + [...s.options].map(o => o.value).join(',') + ']'));
    console.log('selects', sel);
    await f.getByRole('button', { name: /Activate & send/ }).click();
    await page.waitForTimeout(2500);
    await page.waitForLoadState('networkidle');
  }
  await shot(page, 'admin-client-after');
  console.log((await page.locator('main').innerText()).slice(0, 900));
  console.log(problems.join('\n'));
  await browser.close();
})();
