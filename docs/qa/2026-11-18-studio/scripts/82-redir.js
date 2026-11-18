const { open } = require('./lib');
(async () => { const { browser, page } = await open(); await page.goto('/dashboard/catalog?samples=products'); console.log('final URL', page.url(), '| studio frame?', await page.locator('[data-studio-back], [data-studio-account]').count()); await browser.close(); })();
