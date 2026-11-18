const { open, editor, sel, right } = require('./lib');
(async () => {
  const { browser, page } = await open();
  await editor(page, 'Leqaa'); await sel(page, 'nlv2q5it');
  await right(page).getByRole('tab', { name: 'Motion' }).click();
  console.log('after reload enter =', await right(page).locator('label').filter({ hasText: /^When it shows/ }).locator('select').inputValue());
  console.log('press checked', await right(page).locator('[role=radio][aria-checked=true]').allInnerTexts());
  await browser.close();
})();
