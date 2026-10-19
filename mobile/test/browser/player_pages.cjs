// 40 Runs the lesson video player page in headless Chromium against fake
// YouTube / Vimeo / Bunny players that implement the same JS APIs (the real
// sites aren't reachable from this machine).
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PW_PATH);

const dumps = process.argv[2];
const shots = process.argv[3];
const ORIGIN = 'http://127.0.0.1:47011';

const fakeChrome = (site, color) => `<!doctype html><html><body style="margin:0;background:#000;height:100vh;position:relative;font-family:sans-serif;overflow:hidden">
<div id="video" style="position:absolute;left:0;width:100%;aspect-ratio:16/9;top:50%;transform:translateY(-50%);background:linear-gradient(135deg,#2b6,#16a);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px">picture <span id="t" style="margin-left:8px">0.0</span></div>
<div style="position:absolute;top:0;left:0;right:0;height:48px;background:rgba(0,0,0,.75);color:#fff;display:flex;align-items:center;padding:0 10px;font-size:14px">● Channel name · Video title &nbsp; [Watch later] [Share]</div>
<div style="position:absolute;bottom:48px;left:0;right:0;height:70px;background:#333;color:#fff;font-size:13px;padding:6px">More videos ▸ ▸ ▸</div>
<a id="watch" href="https://${site}/watch?v=dQw4w9WgXcQ" target="_blank" style="position:absolute;bottom:10px;left:10px;color:#fff;background:#000;padding:6px">Watch on ${site}</a>
<div style="position:absolute;bottom:10px;right:10px;color:#fff;background:${color};padding:6px;font-weight:bold">${site}</div>
<script>addEventListener('message', function (e) { if (e.data && e.data.t !== undefined) document.getElementById('t').textContent = Number(e.data.t).toFixed(1); });</script>
</body></html>`;

const fakeYouTubeApi = `
window.YT = { Player: function (el, opts) {
  var self = this, t = 0, rate = 1, timer = null;
  window.__site = { calls: [], frameSrc: el.src };
  function state(s) { opts.events.onStateChange({ data: s }); }
  function tick() { t += 0.25 * rate; try { el.contentWindow.postMessage({ t: t }, '*'); } catch (e) {}
    if (t >= 60) { clearInterval(timer); timer = null; t = 60; state(0); } }
  this.getDuration = function () { return 60; };
  this.getCurrentTime = function () { return t; };
  this.getVideoLoadedFraction = function () { return 0.5; };
  this.getAvailablePlaybackRates = function () { return [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]; };
  this.playVideo = function () { __site.calls.push('play'); state(3); setTimeout(function () { state(1); if (!timer) timer = setInterval(tick, 250); }, 50); };
  this.pauseVideo = function () { __site.calls.push('pause'); clearInterval(timer); timer = null; state(2); };
  this.seekTo = function (s) { __site.calls.push('seek:' + s); t = s; };
  this.setPlaybackRate = function (r) { __site.calls.push('rate:' + r); rate = r; opts.events.onPlaybackRateChange({ data: r }); };
  this.getOption = function () { return [{ languageCode: 'en', displayName: 'English' }]; };
  this.loadModule = function (m) { __site.calls.push('load:' + m); };
  this.unloadModule = function (m) { __site.calls.push('unload:' + m); };
  this.setOption = function (m, k, v) { __site.calls.push('option:' + k + ':' + v.languageCode); };
  setTimeout(function () { opts.events.onReady({ target: self }); state(5); }, 100);
} };
setTimeout(function () { window.onYouTubeIframeAPIReady(); }, 0);
`;

const fakeVimeoApi = `
window.Vimeo = { Player: function (el) {
  var handlers = {}, t = 0, timer = null;
  window.__site = { calls: [], frameSrc: el.src };
  function emit(n, d) { (handlers[n] || []).forEach(function (h) { h(d || {}); }); }
  var ok = function (v) { return Promise.resolve(v); };
  this.on = function (n, h) { (handlers[n] = handlers[n] || []).push(h); };
  this.getDuration = function () { return ok(90); };
  this.getTextTracks = function () { return ok([{ language: 'en', label: 'English' }]); };
  this.getQualities = function () { return ok([{ id: 'auto', label: 'Auto', active: true }, { id: '720p', label: '720p', active: false }]); };
  this.getVideoWidth = function () { return ok(1440); };
  this.getVideoHeight = function () { return ok(1080); };
  this.play = function () { __site.calls.push('play'); emit('play'); timer = setInterval(function () { t += 0.25; emit('timeupdate', { seconds: t, duration: 90 }); emit('progress', { percent: 0.4 }); }, 250); return ok(); };
  this.pause = function () { __site.calls.push('pause'); clearInterval(timer); emit('pause'); return ok(); };
  this.setCurrentTime = function (s) { __site.calls.push('seek:' + s); t = s; return ok(s); };
  this.setPlaybackRate = function (r) { __site.calls.push('rate:' + r); return Promise.reject(new Error('plan')); };
  this.enableTextTrack = function (l) { __site.calls.push('cc:' + l); return ok(); };
  this.disableTextTrack = function () { __site.calls.push('cc:off'); return ok(); };
  this.setQuality = function (q) { __site.calls.push('quality:' + q); return ok(q); };
} };
`;

const fakeBunnyPage = `<!doctype html><html><body style="margin:0;background:#000;height:100vh">
<div style="position:absolute;left:0;width:100%;aspect-ratio:16/9;top:50%;transform:translateY(-50%);background:#a52"></div>
<script>
var t = 0, timer = null;
function post(m) { parent.postMessage(JSON.stringify(Object.assign({ context: 'player.js', version: '0.0.11' }, m)), '*'); }
addEventListener('message', function (e) {
  var d = JSON.parse(e.data);
  post({ event: '__log', value: d.method + (d.value !== undefined ? ':' + d.value : '') });
  if (d.method === 'play') { post({ event: 'play' }); timer = setInterval(function () { t += 0.25; post({ event: 'timeupdate', value: { seconds: t, duration: 30 } }); }, 250); }
  if (d.method === 'pause') { clearInterval(timer); post({ event: 'pause' }); }
  if (d.method === 'setCurrentTime') { t = d.value; }
});
post({ event: 'ready', value: { src: location.href, events: [], methods: [] } });
</script></body></html>`;

function assert(cond, message) {
  if (!cond) throw new Error('FAILED: ' + message);
  console.log('ok -', message);
}

async function openPlayer(browser, name) {
  const context = await browser.newContext({ viewport: { width: 390, height: 219 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const navigations = [];
  const popups = [];
  page.on('popup', (p) => popups.push(p.url()));
  page.on('request', (r) => { if (r.isNavigationRequest()) navigations.push(r.url()); });
  await page.addInitScript(() => {
    window.__msgs = [];
    window.YallappPlayer = { postMessage: (m) => window.__msgs.push(JSON.parse(m)) };
    addEventListener('message', (e) => { try { const d = JSON.parse(e.data); if (d.event === '__log') (window.__bunny = window.__bunny || []).push(d.value); } catch (x) {} });
  });
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (url === ORIGIN + '/') return route.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(dumps, name + '.html'), 'utf8') });
    if (url.startsWith('https://www.youtube.com/iframe_api')) return route.fulfill({ contentType: 'text/javascript', body: fakeYouTubeApi });
    if (url.startsWith('https://www.youtube.com/embed/')) return route.fulfill({ contentType: 'text/html', body: fakeChrome('YouTube', '#e00') });
    if (url.startsWith('https://player.vimeo.com/api/player.js')) return route.fulfill({ contentType: 'text/javascript', body: fakeVimeoApi });
    if (url.startsWith('https://player.vimeo.com/video/')) return route.fulfill({ contentType: 'text/html', body: fakeChrome('Vimeo', '#1ab7ea') });
    if (url.startsWith('https://iframe.mediadelivery.net/embed/')) return route.fulfill({ contentType: 'text/html', body: fakeBunnyPage });
    return route.fulfill({ status: 404, body: 'blocked in test: ' + url });
  });
  await page.goto(ORIGIN + '/');
  const msgs = () => page.evaluate(() => window.__msgs);
  const send = (c) => page.evaluate((c) => window.yallappReceive(JSON.stringify(c)), c);
  const calls = () => page.evaluate(() => window.__site ? window.__site.calls : window.__bunny);
  const wait = (ms) => page.waitForTimeout(ms);
  return { context, page, msgs, send, calls, wait, navigations, popups };
}

async function noSiteReachable(p, label) {
  // Every point of the visible box hits our transparent layer, never the site.
  const hits = await p.page.evaluate(() => {
    const ids = new Set();
    for (let x = 2; x < innerWidth; x += 24) for (let y = 2; y < innerHeight; y += 24) {
      const el = document.elementFromPoint(x, y);
      ids.add(el ? el.id || el.tagName : 'none');
    }
    return [...ids];
  });
  assert(hits.length === 1 && hits[0] === 'shield', `${label}: every tap lands on our layer (${hits})`);
  // Taps everywhere open nothing.
  for (const [x, y] of [[20, 20], [195, 110], [360, 200], [20, 200]]) await p.page.mouse.click(x, y);
  await p.wait(300);
  assert(p.popups.length === 0, `${label}: no popup`);
  assert(p.navigations.filter((u) => !u.startsWith(ORIGIN) && !/\/(embed|video)\//.test(u)).length === 0, `${label}: no navigation to the site (${p.navigations})`);
  assert(await p.page.evaluate(() => window.open('https://www.youtube.com/') === null), `${label}: window.open does nothing`);
}

(async () => {
  const browser = await chromium.launch();
  try {
    // ------------------------------------------------------------ YouTube
    let p = await openPlayer(browser, 'youtube');
    await p.wait(400);
    let m = await p.msgs();
    const ready = m.find((e) => e.type === 'ready');
    assert(m[0].type === 'state' && m[0].state === 'loading', 'YouTube: loading first');
    assert(ready && ready.duration === 60 && ready.rates.length === 8, 'YouTube: ready with duration and speeds');
    assert(m.some((e) => e.type === 'state' && e.state === 'ready'), 'YouTube: state ready');
    const src = await p.page.evaluate(() => window.__site.frameSrc);
    const q = new URL(src).searchParams;
    for (const [k, v] of Object.entries({ controls: '0', rel: '0', iv_load_policy: '3', disablekb: '1', fs: '0', playsinline: '1', modestbranding: '1', enablejsapi: '1', start: '5', origin: ORIGIN })) {
      assert(q.get(k) === v, `YouTube: ${k}=${v}`);
    }
    assert(await p.page.evaluate(() => getComputedStyle(document.getElementById('cover')).display !== 'none'), 'YouTube: our cover hides the player before it starts');
    await p.page.screenshot({ path: path.join(shots, 'youtube-1-ready-covered.png') });
    await noSiteReachable(p, 'YouTube');
    await p.send({ command: 'play' });
    await p.wait(1200);
    m = await p.msgs();
    assert(m.some((e) => e.type === 'state' && e.state === 'buffering'), 'YouTube: buffering');
    assert(m.some((e) => e.type === 'state' && e.state === 'playing'), 'YouTube: playing');
    const times = m.filter((e) => e.type === 'time');
    assert(times.length >= 3 && times[times.length - 1].position > 0.5 && times[times.length - 1].buffered === 0.5, 'YouTube: time, duration and buffered reported while playing');
    assert(tracksOk(m), 'YouTube: caption tracks reported');
    await p.page.screenshot({ path: path.join(shots, 'youtube-2-playing-cropped.png') });
    await p.send({ command: 'seek', seconds: 30 });
    await p.send({ command: 'rate', rate: 1.5 });
    await p.send({ command: 'captions', language: 'en' });
    await p.send({ command: 'pause' });
    await p.wait(200);
    m = await p.msgs();
    assert(m.some((e) => e.type === 'state' && e.state === 'paused'), 'YouTube: paused');
    assert(m.some((e) => e.type === 'rate' && e.rate === 1.5), 'YouTube: rate reported');
    assert(await p.page.evaluate(() => getComputedStyle(document.getElementById('cover')).display === 'none'), 'YouTube: paused frame stays visible');
    let c = await p.calls();
    assert(['play', 'seek:30', 'rate:1.5', 'load:captions', 'option:track:en', 'pause'].every((x) => c.includes(x)), 'YouTube: commands reach the API ' + c);
    await p.page.screenshot({ path: path.join(shots, 'youtube-3-paused.png') });
    await p.send({ command: 'seek', seconds: 59.5 });
    await p.send({ command: 'play' });
    await p.wait(1200);
    m = await p.msgs();
    assert(m.some((e) => e.type === 'state' && e.state === 'ended'), 'YouTube: ended');
    assert(await p.page.evaluate(() => getComputedStyle(document.getElementById('cover')).display !== 'none'), 'YouTube: our cover hides the end screen');
    await p.page.screenshot({ path: path.join(shots, 'youtube-4-ended-covered.png') });
    await p.send({ command: 'play' });
    await p.wait(100);
    c = await p.calls();
    assert(c.slice(-2).join() === 'seek:0,play', 'YouTube: play after the end starts over');
    await p.context.close();

    // What the site's frame looks like uncropped, for comparison.
    const raw = await browser.newPage({ viewport: { width: 390, height: 219 }, deviceScaleFactor: 2 });
    await raw.setContent(fakeChrome('YouTube', '#e00'));
    await raw.screenshot({ path: path.join(shots, 'youtube-0-site-player-uncropped-fake.png') });
    await raw.close();

    // -------------------------------------------------------------- Vimeo
    p = await openPlayer(browser, 'vimeo');
    await p.wait(400);
    m = await p.msgs();
    const vready = m.find((e) => e.type === 'ready');
    assert(vready && vready.duration === 90 && vready.captions.length === 1 && vready.qualities.length === 2 && vready.quality === 'auto', 'Vimeo: ready with tracks and qualities');
    const vsrc = new URL(await p.page.evaluate(() => window.__site.frameSrc)).searchParams;
    for (const k of ['title', 'byline', 'portrait', 'badge', 'controls', 'transparent', 'pip', 'autopause']) assert(vsrc.get(k) === '0', `Vimeo: ${k}=0`);
    assert(vsrc.get('dnt') === '1', 'Vimeo: dnt=1');
    // 4:3 video: the frame is as wide as the picture, centred.
    const box = await p.page.evaluate(() => { const f = document.getElementById('frame'); return [f.offsetWidth, f.offsetLeft, f.offsetHeight]; });
    assert(Math.abs(box[0] - 219 * 4 / 3) < 1 && Math.abs(box[1] - (390 - 292) / 2) < 1 && box[2] === 219 * 5, 'Vimeo: 4:3 picture fits the box, the frame five boxes tall ' + box);
    await noSiteReachable(p, 'Vimeo');
    await p.send({ command: 'play' });
    await p.wait(800);
    await p.send({ command: 'rate', rate: 2 });
    await p.send({ command: 'captions', language: 'en' });
    await p.send({ command: 'quality', quality: '720p' });
    await p.wait(200);
    m = await p.msgs();
    assert(m.some((e) => e.type === 'state' && e.state === 'playing'), 'Vimeo: playing');
    assert(m.some((e) => e.type === 'time' && e.position > 0 && e.duration === 90), 'Vimeo: time reported');
    assert(m.some((e) => e.type === 'rate' && Array.isArray(e.rates) && e.rates.length === 0), 'Vimeo: speeds refused by the plan are reported');
    assert(m.some((e) => e.type === 'captions' && e.language === 'en'), 'Vimeo: captions on');
    assert(m.some((e) => e.type === 'quality' && e.quality === '720p'), 'Vimeo: quality set');
    await p.page.screenshot({ path: path.join(shots, 'vimeo-playing-4x3.png') });
    c = await p.calls();
    assert(c.includes('seek:5'), 'Vimeo: resumes at the start second');
    await p.context.close();

    // ---------------------------------------------- Bunny (Player.js)
    p = await openPlayer(browser, 'bunny');
    await p.wait(400);
    m = await p.msgs();
    assert(m.some((e) => e.type === 'ready'), 'Bunny: ready');
    await p.send({ command: 'play' });
    await p.wait(700);
    await p.send({ command: 'pause' });
    await p.wait(100);
    m = await p.msgs();
    assert(m.some((e) => e.type === 'state' && e.state === 'playing'), 'Bunny: playing');
    assert(m.some((e) => e.type === 'time' && e.duration === 30), 'Bunny: time reported');
    assert(m.some((e) => e.type === 'state' && e.state === 'paused'), 'Bunny: paused');
    c = await p.calls();
    assert(c.includes('addEventListener:timeupdate') && c.includes('setCurrentTime:5') && c.includes('play'), 'Bunny: Player.js commands ' + c);
    await noSiteReachable(p, 'Bunny');
    await p.context.close();
    console.log('ALL PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });

function tracksOk(m) {
  return m.some((e) => e.type === 'tracks' && e.captions.length === 1 && e.captions[0].language === 'en');
}
