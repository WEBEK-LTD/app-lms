const { open, problems, shot, editor, sel, right, draftNode, stored, diff } = require('./lib');
const fs = require('fs');
(async () => {
  const app = 'Leqaa', id = 'nr0waivs';
  const { browser, page, ctx } = await open({ tag: 'img', dsf: 2 });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  await editor(page, app); await sel(page, id);
  const R = right(page);
  console.log('photo buttons:', (await R.getByRole('button').allInnerTexts()).filter(t => /photo|picture/i.test(t)).join(' | '));
  let b = await draftNode(ctx.request, info, 'home', id);
  console.log('image before', b.image_url);
  const btn = R.getByRole('button', { name: /Change the photo|Choose a picture|photo_library/ }).first();
  await btn.click(); await page.waitForTimeout(800);
  await shot(page, 'img-dialog');
  const dlg = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Your pictures' }) }).last();
  console.log('dialog:', (await dlg.innerText().catch(() => 'no dialog')).slice(0, 400).replace(/\n/g, ' / '));
  const fi = dlg.locator('input[type=file]');
  if (await fi.count()) { await fi.first().setInputFiles('/home/user/app-lms/platform/web/public/flower-photos/orchid.jpg'); await page.waitForTimeout(3000); }
  const imgs = page.locator('button:has(img)').filter({ visible: true });
  console.log('choices in dialog', await imgs.count());
  if (await imgs.count()) { await imgs.first().click(); await page.waitForTimeout(500); const use = dlg.getByRole('button', { name: /Use|Choose|Insert|Done/ }); if (await use.count()) await use.first().click(); }
  const a = await stored(ctx.request, info, 'home', id, b, 8000);
  console.log('stored diff', JSON.stringify(diff(b, a)).slice(0, 300));
  await shot(page, 'img-after');
  console.log(problems.join('\n'));
  await browser.close();
})();
