const { open, problems, shot, editor, sel, right, draftNode, diff, canvasState, stored } = require('./lib');
const fs = require('fs');
const app = process.argv[2], slug = process.argv[3], id = process.argv[4], kind = process.argv[5];
const R = page => right(page);
const num = (label) => async page => { const i = R(page).getByLabel(label, { exact: true }).first(); await i.fill(''); await i.type(String(arguments[1] ?? '')); };
function setNum(label, v) { return async page => { const i = R(page).getByLabel(label, { exact: true }).first(); await i.click(); await i.fill(String(v)); await i.press('Tab'); }; }
function selOpt(label, v) { return async page => {
  let s = R(page).locator(`select[aria-label="${label}"]`);
  if (!(await s.count())) s = R(page).locator('label').filter({ hasText: new RegExp('^\\s*' + label) }).locator('select');
  if (!(await s.count())) s = R(page).locator('select').filter({ has: page.locator('xpath=.') }).and(R(page).getByLabel(new RegExp('^' + label)));
  await s.first().selectOption(v, { timeout: 5000 }); }; }
function btn(name) { return async page => { await R(page).getByRole('button', { name, exact: true }).first().click(); }; }
function chk(label) { return async page => { await R(page).getByLabel(label, { exact: true }).first().click(); }; }
function typeIn(label, v) { return async page => { const i = R(page).getByLabel(label, { exact: true }).first(); await i.fill(v); await i.press('Tab'); }; }
function tab(n) { return async page => { await R(page).getByRole('tab', { name: n, exact: true }).first().click(); }; }
const SETS = {
  text: [
    ['Width → Fill', selOpt('Width', 'fill')], ['Width → Hug', selOpt('Width', 'hug')], ['Width → Fixed', selOpt('Width', 'fixed')], ['Width number → 150', setNum('Width', 150)], ['Width → Auto', selOpt('Width', 'auto')],
    ['Height → Fixed', selOpt('Height', 'fixed')], ['Height number → 60', setNum('Height', 60)], ['Height → Hug', selOpt('Height', 'hug')], ['Height → Fill', selOpt('Height', 'fill')], ['Height → Auto', selOpt('Height', 'auto')],
    ['Space inside top/bottom 12', setNum('Space inside: Top and bottom', 12)], ['Space inside sides 8', setNum('Space inside: Sides', 8)],
    ['Space outside top/bottom 10', setNum('Space outside: Top and bottom', 10)], ['Lowest height 40', setNum('Lowest height', 40)],
    ['Align: To the end', btn('To the end')], ['Align: To the start', btn('To the start')],
    ['Font → Outfit', typeIn('Font', 'Outfit')], ['Weight 800', selOpt('Weight', '800')], ['Size 30', setNum('Size', 30)], ['Line height 1.5', setNum('Line height', 1.5)], ['Letter spacing 2', setNum('Letter spacing', 2)],
    ['Italic', chk('Italic')], ['Underline', chk('Underline')], ['Capitals', chk('Capitals')], ['Lines at most 2', setNum('Lines at most', 2)],
    ['Corners 16', setNum('Corners', 16)], ['Corners Pill', btn('Pill')], ['Turn 90°', btn('90°')], ['Turn 0°', btn('0°')], ['Shadow Medium', btn('Medium')], ['Border 2', setNum('Border', 2)], ['Opacity 50', setNum('Opacity', 50)],
    ['Text style heading', selOpt('Text style', 'heading')],
    ['Android off', chk('Android')], ['Android on', chk('Android')], ['Who sees: signed in', selOpt('Who sees it', 'signed_in')], ['Who sees: everyone', selOpt('Who sees it', 'everyone')], ['Name in layers', typeIn('Name in the layers', 'QA name')],
    ['Motion: enter fade', async p => { await tab('Motion')(p); await R(p).getByLabel('When it shows', { exact: true }).first().selectOption('fade'); }], ['Motion: Pulse', btn('Pulse')], ['Motion: Play it', btn('play_arrow Play it')],
    ['back to Design', tab('Design')],
  ],
  text2: [
    ['Width → Auto', selOpt('Width', 'auto')], ['Height → Hug', selOpt('Height', 'hug')], ['Height → Fill', selOpt('Height', 'fill')], ['Height → Auto', selOpt('Height', 'auto')],
    ['Font → Outfit', typeIn('Font', 'Outfit')], ['Weight 800', selOpt('Weight', '800')], ['Lines at most 2', setNum('Lines at most', 2)],
    ['Turn 90°', btn('90°')], ['Shadow Medium', btn('Medium')], ['Border 2', setNum('Border', 2)], ['Opacity 50', setNum('Opacity', 50)],
    ['Text style heading', selOpt('Text style', 'heading')],
    ['Android off', chk('Android')], ['iOS off', chk('iOS')], ['Android on', chk('Android')], ['iOS on', chk('iOS')], ['Hide in the app', chk('Hide in the app (kept here)')], ['Unhide', chk('Hide in the app (kept here)')], ['Who sees: signed in', selOpt('Who sees it', 'signed_in')], ['Who sees: everyone', selOpt('Who sees it', 'everyone')], ['Name in layers', typeIn('Name in the layers', 'QA name')],
    ['Motion: enter fade', async p => { await tab('Motion')(p); await selOpt('When it shows', 'fade')(p); }], ['Motion: Pulse', btn('Pulse')], ['Motion: Play it', btn('play_arrow Play it')],
    ['back to Design', tab('Design')],
    ['Corners Pill (999)', btn('Pill')],
  ],
  row: [
    ['Space between 20', setNum('Space between', 20)], ['Spread: between', selOpt('Spread', 'between')], ['Line up: center', selOpt('Line up', 'center')],
    ['Scrolls sideways', chk('Scrolls sideways')], ['Ratio 4:3', btn('4:3')], ['Ratio Free', btn('Free')],
    ['Space outside: Top 18', setNum('Space outside: Top', 18)], ['Width → Hug', selOpt('Width', 'hug')], ['Width → Fill', selOpt('Width', 'fill')], ['Height → Fixed', selOpt('Height', 'fixed')], ['Height → Auto', selOpt('Height', 'auto')],
  ],
};
(async () => {
  const { browser, page, ctx } = await open({ tag: 'design' });
  const info = JSON.parse(fs.readFileSync(`api-${app}.json`));
  await editor(page, app);
  if (slug !== 'home') { await page.getByRole('button', { name: /^Page:/ }).click(); await page.getByRole('button', { name: new RegExp(process.argv[6] || slug, 'i') }).first().click(); await page.waitForTimeout(800); }
  await sel(page, id);
  const results = [];
  let before = await draftNode(ctx.request, info, slug, id);
  for (const [name, act] of SETS[kind]) {
    const c0 = await canvasState(page, id);
    const nErr = problems.length;
    let err = null;
    try { await act(page); } catch (e) { err = e.message.split('\n')[0].slice(0, 150); }
    await page.waitForTimeout(300);
    const c1 = await canvasState(page, id);
    const after = name.startsWith('Motion: Play') || name.startsWith('back') ? before : await stored(ctx.request, info, slug, id, before, 6000);
    const d = diff(before, after);
    const cd = typeof c0 === 'object' && typeof c1 === 'object' ? Object.fromEntries(Object.keys(c1).filter(k => c0[k] !== c1[k]).map(k => [k, `${c0[k]} → ${c1[k]}`])) : { c0, c1 };
    results.push({ name, err, stored: d, canvas: cd, console: problems.slice(nErr) });
    console.log(`- ${name}${err ? ' ERR ' + err : ''}\n    stored: ${JSON.stringify(d).slice(0, 300)}\n    canvas: ${JSON.stringify(cd).slice(0, 300)}${problems.length > nErr ? '\n    CONSOLE: ' + problems.slice(nErr).join(' | ').slice(0, 400) : ''}`);
    before = after;
  }
  await shot(page, `design-${app}-${id}`);
  fs.writeFileSync(`design-${app}-${id}.json`, JSON.stringify(results, null, 1));
  await browser.close();
})();
