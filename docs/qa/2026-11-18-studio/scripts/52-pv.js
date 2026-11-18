const { open, previewShot } = require('./lib');
(async () => { const [app, l, sc, name] = process.argv.slice(2); const { browser, ctx } = await open(); console.log(await previewShot(ctx, app, l, +sc, name)); await browser.close(); })();
