const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'http://localhost:3210';
const DIR = __dirname;
const STATE = DIR + '/state.json';
const HDR = { 'x-forwarded-for': '198.51.100.77' };
const problems = [];
function watch(page, tag = '') {
  page.on('pageerror', e => problems.push(`[pageerror] ${tag} ${page.url()} ${e.message}`));
  page.on('console', m => {
    const u = m.location().url || '';
    if (m.type() === 'error' && !u.includes('/api/v1/fonts/') && !/Failed to load resource/.test(m.text())) problems.push(`[console.error] ${tag} ${page.url()} ${m.text().slice(0, 400)}`);
  });
}
async function open(opts = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ baseURL: BASE, extraHTTPHeaders: HDR, viewport: opts.viewport || { width: 1440, height: 900 }, deviceScaleFactor: opts.dsf || 1, storageState: fs.existsSync(STATE) && !opts.fresh ? STATE : undefined });
  const page = await ctx.newPage();
  watch(page, opts.tag || '');
  return { browser, ctx, page };
}
const shot = (page, name, o = {}) => page.screenshot({ path: `${DIR}/shots/${name}.png`, ...o });
fs.mkdirSync(DIR + '/shots', { recursive: true });
module.exports = { open, BASE, STATE, problems, shot, watch, HDR };
async function useApp(page, name) {
  await page.goto('/studio');
  const form = page.locator('form').filter({ has: page.locator('input[name=appId]') });
  const n = await form.count();
  for (let i = 0; i < n; i++) {
    const card = form.nth(i).locator('xpath=..');
    const txt = await card.innerText();
    if (txt.includes(name)) { await form.nth(i).locator('button[value=project]').click(); await page.waitForURL(/\/studio\/project/); return; }
  }
  throw new Error('no app ' + name);
}
module.exports.useApp = useApp;
async function editor(page, app) {
  await useApp(page, app);
  await page.goto('/studio/editor');
  await page.locator('[data-studio-frame]').first().waitFor();
  await page.waitForLoadState('networkidle');
  const hide = page.locator('[data-first-steps-float] button[type=submit][aria-label]');
  if (await hide.count() && await hide.first().isVisible()) { await hide.first().click(); await page.waitForLoadState('networkidle'); await page.locator('[data-studio-frame]').first().waitFor(); }
}
async function layers(page) {
  return page.locator('[data-studio-layer]').evaluateAll(ls => ls.map(l => ({ id: l.getAttribute('data-studio-layer'), depth: Math.round(parseFloat(getComputedStyle(l).marginInlineStart) / 22), label: l.innerText.trim() })));
}
async function apiInfo(page) {
  await page.goto('/studio/project/setup?step=website');
  const api = (await page.locator('code').filter({ hasText: '/api/app/' }).first().textContent()).trim();
  const html = await (await page.request.get('/studio/project/preview?pages=draft')).text();
  const m = /<iframe[^>]*\ssrc="([^"]+)"[^>]*data-testid="app-preview"/.exec(html);
  const src = m ? m[1].replaceAll('&amp;', '&') : null;
  const token = src ? new URL(src, 'http://x').searchParams.get('token') : null;
  return { api, token, src };
}
async function fetchApp(request, info, path, lang, draft) {
  const headers = { 'Accept-Language': lang };
  if (draft) headers['x-yallapp-preview'] = info.token;
  const sep = path.includes('?') ? '&' : '?';
  const r = await request.get(`${info.api}${path}${sep}platform=android&app_version=1.0.0`, { headers });
  return { status: r.status(), json: r.ok() ? await r.json() : await r.text() };
}
module.exports.editor = editor; module.exports.layers = layers; module.exports.apiInfo = apiInfo; module.exports.fetchApp = fetchApp;
async function pick(page, id) {
  const l = page.locator(`[data-studio-layer="${id}"]`);
  if (!(await l.isVisible().catch(() => false))) {
    // open the Layers tab if needed
    const lt = page.getByRole('button', { name: 'Layers', exact: true });
    if (await lt.count()) await lt.first().click();
  }
  await l.locator('button').filter({ hasNot: page.locator('[aria-pressed]') }).nth(await l.locator('button').count() > 3 ? 1 : 0).click();
}
async function inspector(page) {
  const ins = page.locator('aside').last();
  return ins.innerText();
}
module.exports.pick = pick; module.exports.inspector = inspector;

async function sel(page, id) {
  const L = page.locator(`[data-studio-layer="${id}"]`);
  if (!(await L.count())) { console.log('  (layer row missing for', id, ', expanding all)'); const ex = page.getByRole('button', { name: /Unfold all/i }); if (await ex.count()) await ex.first().click(); await page.waitForTimeout(300); }
  if (!(await L.count())) throw new Error('layer row missing ' + id);
  await L.locator('button:has(span.truncate)').first().click();
  await page.waitForTimeout(250);
}
const right = page => page.locator('aside').last();
async function lang(page, code) { // EN | عربي | TR
  const name = code === 'en' ? 'EN' : code === 'ar' ? 'عربي' : 'TR';
  await page.getByRole('button', { name, exact: true }).first().click();
  await page.waitForTimeout(400);
}
async function waitSaved(page) {
  await page.waitForTimeout(1600);
  await page.getByText(/Saved/).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);
}
async function publish(page) {
  await page.getByRole('button', { name: /Publish$/ }).first().click();
  await page.waitForTimeout(500);
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    const busy = await page.getByRole('button', { name: /Publish/ }).first().isDisabled().catch(() => false);
    if (!busy) break; await page.waitForTimeout(300);
  }
  await page.waitForTimeout(800);
}
function findNode(tree, id) {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.id === id) return tree;
  for (const v of Object.values(tree)) {
    if (Array.isArray(v)) { for (const x of v) { const r = findNode(x, id); if (r) return r; } }
    else if (v && typeof v === 'object') { const r = findNode(v, id); if (r) return r; }
  }
  return null;
}
async function served(request, info, slug, id, draft) {
  const out = {};
  for (const l of ['en', 'ar', 'tr']) {
    const r = await fetchApp(request, info, '/pages/' + slug, l, draft);
    out[l] = r.status === 200 ? findNode(r.json.studio, id) : { status: r.status, body: String(r.json).slice(0, 200) };
  }
  return out;
}
Object.assign(module.exports, { sel, right, lang, waitSaved, publish, findNode, served });
async function draftNode(request, info, slug, id, l = 'en') {
  const r = await fetchApp(request, info, '/pages/' + slug, l, true);
  return r.status === 200 ? findNode(r.json.studio, id) : null;
}
function shallow(n) { if (!n) return n; const o = { ...n }; delete o.children; return o; }
function diff(a, b) {
  const out = {}; const A = shallow(a) || {}, B = shallow(b) || {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) out[k] = [A[k], B[k]];
  return out;
}
async function canvasState(page, id) {
  return page.locator(`[data-studio-node="${id}"]`).first().evaluate(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bg: s.backgroundColor, color: s.color, op: s.opacity, rad: s.borderRadius, pad: s.padding, font: s.fontFamily.split(',')[0] + ' ' + s.fontWeight + ' ' + s.fontSize, tr: s.transform, gap: s.gap, shadow: s.boxShadow.slice(0, 30), border: s.borderWidth, jc: s.justifyContent, ai: s.alignItems, ta: s.textAlign }; }).catch(e => 'ERR ' + e.message.slice(0, 80));
}
async function stored(request, info, slug, id, before, ms = 7000) {
  const t0 = Date.now(); let n;
  while (Date.now() - t0 < ms) { n = await draftNode(request, info, slug, id); if (JSON.stringify(shallow(n)) !== JSON.stringify(shallow(before))) return n; await new Promise(r => setTimeout(r, 500)); }
  return n;
}
Object.assign(module.exports, { draftNode, diff, canvasState, stored, shallow });
async function previewShot(ctx, app, l, scrolls, name, draft = true) {
  const info = JSON.parse(fs.readFileSync(`${DIR}/api-${app}.json`));
  const pctx = await ctx.browser().newContext({ baseURL: BASE, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await pctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/fonts|503/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push('pageerror ' + e.message.slice(0, 200)));
  let url = info.src.replace(/lang=[a-z]+/, 'lang=' + l) + (process.env.THEME ? '&theme=' + process.env.THEME : '');
  if (!draft) url = info.pubSrc.replace(/lang=[a-z]+/, 'lang=' + l);
  await page.goto(url);
  await page.waitForTimeout(12000);
  await page.mouse.click(l === 'ar' ? 49 : 341, 32); await page.waitForTimeout(5000);
  const parts = [];
  await page.screenshot({ path: `${DIR}/shots/${name}-p0.png` }); parts.push(`${DIR}/shots/${name}-p0.png`);
  for (let k = 1; k <= scrolls; k++) { await page.mouse.move(195, 400); await page.mouse.wheel(0, 300); await page.waitForTimeout(1300); const f = `${DIR}/shots/${name}-p${k}.png`; await page.screenshot({ path: f }); parts.push(f); }
  require('child_process').execFileSync('python3', [`${DIR}/stitch.py`, `${DIR}/shots/${name}.png`, ...parts]);
  await pctx.close();
  return errs;
}
module.exports.previewShot = previewShot;
