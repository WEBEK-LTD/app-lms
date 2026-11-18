const { open, STATE, problems, shot } = require('./lib');
const [name, look, adding] = process.argv.slice(2);
(async () => {
  const { browser, ctx, page } = await open({ tag: 'make' });
  await page.goto(`/start?for=studio${adding ? '&new=1' : ''}`);
  await page.locator('a[href^="/start/flowers"]').first().click();
  await page.waitForURL(/\/start\/flowers/);
  // choose the look
  const lookLinks = await page.locator('a[href*="look="]').evaluateAll(as => as.map(a => a.getAttribute('href') + ' | ' + a.textContent.trim()));
  console.log('looks', lookLinks);
  const lk = page.locator(`a[href*="look=${look}"]:not([href*="/make"])`).first();
  if (await lk.count()) { await lk.click(); await page.waitForURL(new RegExp(`look=${look}`)); }
  await shot(page, `flowers-pick-${look}`);
  await page.locator('[data-start-look]').click(); console.log('start-look', await page.locator('[data-start-look]').getAttribute('data-start-look'));
  await page.waitForURL(/\/make/);
  console.log('make url', page.url());
  await page.locator('#app-name').fill(name);
  await shot(page, `flowers-make-${look}`);
  await page.getByRole('button', { name: /Create my app/ }).click();
  await page.waitForURL(u => !u.pathname.includes('/make'), { timeout: 90000 });
  await page.waitForLoadState('networkidle');
  console.log('after create', page.url());
  await shot(page, `flowers-created-${look}`);
  await ctx.storageState({ path: STATE });
  console.log(problems.join('\n'));
  await browser.close();
})();
