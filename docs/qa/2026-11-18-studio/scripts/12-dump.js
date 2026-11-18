const { open, problems, shot, editor, sel, right } = require('./lib');
const fs = require('fs');
(async () => {
  const [app, ...ids] = process.argv.slice(2);
  const { browser, page } = await open({ tag: 'dump' });
  await editor(page, app);
  const seen = new Set(); const out = {};
  for (const id of ids) {
    await sel(page, id);
    const tabs = ['Design', 'Motion', 'Data'];
    out[id] = { head: (await right(page).innerText()).split('\n')[1] };
    for (const tb of tabs) {
      const b = right(page).getByRole('tab', { name: tb, exact: true });
      if (!(await b.count())) continue;
      await b.first().click(); await page.waitForTimeout(200);
      const ctrls = await right(page).locator('input,select,textarea,button').evaluateAll(es => es.filter(e => e.offsetParent).map(e => {
        let lab = e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].innerText) || e.title || e.innerText || e.placeholder || '';
        lab = lab.replace(/\s+/g, ' ').slice(0, 45);
        const opts = e.tagName === 'SELECT' ? '{' + [...e.options].map(o => o.value).join(',').slice(0, 120) + '}' : '';
        return `${e.tagName.toLowerCase()}${e.type && e.tagName !== 'SELECT' ? ':' + e.type : ''}[${lab}]${opts}`;
      }));
      const fresh = ctrls.filter(c => !/^button:button\[(#[0-9A-F]{6}|\d+|)\]$/.test(c) && !seen.has(c));
      fresh.forEach(c => seen.add(c));
      out[id][tb] = fresh;
    }
    await right(page).getByRole('tab', { name: 'Design', exact: true }).first().click().catch(() => {});
  }
  fs.writeFileSync('dump.json', JSON.stringify(out, null, 1));
  for (const [id, o] of Object.entries(out)) { console.log('##', id, o.head); for (const t of ['Design', 'Motion', 'Data']) if (o[t] && o[t].length) console.log(' ' + t + ': ' + o[t].join(' ; ')); }
  console.log(problems.join('\n'));
  await browser.close();
})();
