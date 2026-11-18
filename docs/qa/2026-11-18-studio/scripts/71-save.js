const { open, problems, shot, editor, sel, right, fetchApp, findNode, publish, stored, draftNode } = require('./lib');
const fs = require('fs');
const app = 'KechFlora';
(async () => {
  const { browser, page, ctx } = await open({ tag: 'save', dsf: 2 });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  await editor(page, app);
  console.log('layer coupon exists?', await page.locator('[data-studio-layer="nd70hpkw"]').count());
  const id = 'nhnjiajo'; // "Who are the flowers for?"
  const txt = async (draft) => { const r = await fetchApp(ctx.request, info, '/pages/home', 'en', draft); return r.status === 200 ? (findNode(r.json.studio, id) || {}).text : 'status ' + r.status + ' ' + String(r.json).slice(0, 100); };
  // History
  await page.getByRole('button', { name: 'Published versions', exact: true }).click(); await page.waitForTimeout(600);
  console.log('buttons now:', (await page.getByRole('button').filter({ hasText: /./ }).allInnerTexts()).filter(t => /Restore|version|Publish|ago|AM|PM/i.test(t)).join(' | ').slice(0, 600));
  await shot(page, 'save-history');
  page.once('dialog', d => { console.log('confirm:', d.message().slice(0, 150)); d.accept(); });
  const restoreBtns = page.getByRole('button', { name: 'Bring back' });
  console.log('restore buttons', await restoreBtns.count());
  await restoreBtns.last().click(); await page.waitForTimeout(3000);
  console.log('after Restore (oldest) → draft:', await txt(true), '| published:', await txt(false), '| canvas:', await page.locator(`[data-studio-node="${id}"]`).first().innerText().catch(() => 'n/a'));
  // Changes panel
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Changes', exact: true }).click(); await page.waitForTimeout(500);
  await shot(page, 'save-changes');
  console.log('changes panel:', (await page.locator('[role=dialog]').last().innerText().catch(() => 'no dialog')).slice(0, 400));
  await page.keyboard.press('Escape');
  // device sizes
  for (const d of ['Small phone', 'Large phone', 'Tablet']) {
    await page.getByRole('button', { name: d, exact: true }).click(); await page.waitForTimeout(600);
    const fr = await page.locator(`[data-studio-node="${(await fetchApp(ctx.request, info, '/pages/home', 'en', true)).json.studio.body.id}"]`).first().boundingBox();
    console.log('device', d, 'page body width', fr && Math.round(fr.width), 'pressed', await page.getByRole('button', { name: d, exact: true }).getAttribute('aria-pressed'));
    await shot(page, 'device-' + d.replace(' ', '-'));
  }
  await page.getByRole('button', { name: 'Large phone', exact: true }).click();
  console.log('console:', problems.join('\n'));
  await browser.close();
})();
