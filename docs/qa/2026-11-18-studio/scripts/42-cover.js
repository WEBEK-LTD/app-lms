const { open, editor, sel } = require('./lib');
const [app, ...ids] = process.argv.slice(2);
(async () => {
  const { browser, page } = await open();
  await editor(page, app);
  for (const id of ids) {
    await sel(page, id);
    await page.locator(`[data-studio-node="${id}"]`).first().scrollIntoViewIfNeeded();
    const r = await page.evaluate(() => [...document.querySelectorAll('[data-studio-resize]')].map(h => {
      const b = h.getBoundingClientRect(); const x = b.x + b.width / 2, y = b.y + b.height / 2;
      const top = document.elementFromPoint(x, y);
      const desc = el => el ? `${el.tagName}${el.dataset.studioNode ? '[node=' + el.dataset.studioNode + ']' : ''}${el.dataset.studioResize ? '[handle]' : ''} z=${getComputedStyle(el).zIndex} pos=${getComputedStyle(el).position}` : 'null';
      let anc = top, chain = []; for (let i = 0; i < 4 && anc; i++) { chain.push(desc(anc)); anc = anc.parentElement; }
      // check clipping
      let p = h.parentElement, clip = null; while (p) { const s = getComputedStyle(p); if (s.overflow !== 'visible' || s.overflowX !== 'visible') { clip = desc(p) + ' overflow=' + s.overflow; break; } p = p.parentElement; }
      return h.dataset.studioResize + ': top=' + chain.join(' < ') + ' | first clip ancestor: ' + clip + ' | handle parent=' + desc(h.parentElement);
    }));
    console.log('==', id); r.forEach(x => console.log('  ' + x));
  }
  await browser.close();
})();
