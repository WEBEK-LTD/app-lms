const { open, problems, shot, editor, layers, apiInfo } = require('./lib');
const fs = require('fs');
(async () => {
  const app = process.argv[2] || 'Leqaa';
  const { browser, page } = await open({ tag: 'explore' });
  const info = await apiInfo(page);  // note: uses current app; switch first
  await editor(page, app);
  const i2 = await apiInfo(page);
  fs.writeFileSync(`api-${app}.json`, JSON.stringify(i2, null, 1));
  console.log(i2);
  await page.goto('/studio/editor'); await page.locator('[data-studio-frame]').first().waitFor();
  // bar
  console.log('BAR buttons:', await page.locator('header button, header select, [role=toolbar] button').evaluateAll(b => b.map(x => (x.getAttribute('aria-label') || x.title || x.innerText).replace(/\n/g, ' ')).join(' | ')));
  const pageBtn = page.getByRole('button', { name: /^Page:/ });
  console.log('page btn', await pageBtn.count());
  await pageBtn.first().click();
  await page.waitForTimeout(500);
  await shot(page, `explore-${app}-pages`);
  console.log('PAGES MENU:', (await page.locator('[role=menu], [role=listbox], [role=dialog]').filter({ visible: true }).allInnerTexts()).join('\n---\n').slice(0, 2000));
  await page.keyboard.press('Escape');
  const L = await layers(page);
  fs.writeFileSync(`layers-${app}-home.json`, JSON.stringify(L, null, 1));
  console.log('layers', L.length); console.log(L.map(l => '  '.repeat(l.depth) + l.label.replace(/\n/g, ' ') + ' ' + l.id).join('\n'));
  console.log(problems.join('\n'));
  await browser.close();
})();
