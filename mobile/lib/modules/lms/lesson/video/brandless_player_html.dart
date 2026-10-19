import 'dart:convert';

import 'hosted_video.dart';

/// 40 The JavaScript channel the player page reports to.
const playerChannel = 'YallappPlayer';

/// 40 The page that plays a YouTube, Vimeo or Bunny Stream video behind the
/// app's own controls, so the student never sees which site hosts it.
///
/// - The site's player loads with its own controls, title, logo, related
///   videos, sharing and keyboard turned off as far as the site allows
///   (YouTube's IFrame Player API, Vimeo's player.js, Bunny's Player.js
///   protocol).
/// - The player frame is five times as tall as what shows (51: three before):
///   the site keeps the picture in the middle and draws what it still shows
///   (title, logo, "More videos" when paused, buttons) along the frame's top
///   and bottom edges, two box heights outside the visible box, so even an
///   overlay that grows with the player's height stays out of sight. The
///   frame is as wide as the picture, so portrait and 4:3 videos show whole.
/// - A transparent layer covers the frame, so no touch ever reaches the
///   site's player, and a black cover hides it before it starts and after it
///   ends (end screens), and already in the last half second, before the
///   site's end screen can flash. `window.open` does nothing.
/// - Events go to the app through the `YallappPlayer` channel as JSON:
///   `ready` (duration, speeds, caption tracks, qualities), `state`
///   (loading, ready, playing, paused, buffering, ended), `time` (position,
///   duration, buffered fraction), `rate`, `tracks`, `captions`, `quality`
///   and `error`. In a browser frame (the app preview) they're posted to the
///   parent window as `{yallappChannel, message}`.
/// - The app sends commands as JSON to `window.yallappReceive(text)`:
///   `play`, `pause`, `seek` (seconds), `rate`, `captions` (language or
///   null), `quality`.
String brandlessPlayerHtml(
  HostedVideo video, {
  required String origin,
  int startSeconds = 0,
}) {
  final config = <String, Object?>{
    'host': video.host.name,
    'src': video.playerUrl(startSeconds: startSeconds).toString(),
    'start': startSeconds,
    'aspect': video.aspectRatio,
    'origin': origin,
  };
  // `</` can't end the script early.
  final json = jsonEncode(config).replaceAll('</', r'<\/');
  return '''
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style>
html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
#stage { position: absolute; left: 0; top: 0; right: 0; bottom: 0; overflow: hidden; background: #000; }
#frame { position: absolute; left: 0; top: -200%; width: 100%; height: 500%; border: 0; pointer-events: none; }
#cover { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: #000; z-index: 1; }
#cover.off { display: none; }
#shield { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: transparent; z-index: 2; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
</style>
</head>
<body>
<div id="stage">
<iframe id="frame" tabindex="-1" title="" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>
<div id="cover"></div>
<div id="shield"></div>
</div>
<script>
(function () {
  'use strict';
  var C = $json;
  var stage = document.getElementById('stage');
  var frame = document.getElementById('frame');
  var cover = document.getElementById('cover');
  var state = 'loading', duration = 0, position = 0, buffered = 0;
  var aspect = C.aspect || 16 / 9;
  var api = null, ticker = null, readyTimer = null;

  function send(message) {
    var text = JSON.stringify(message);
    if (window.YallappPlayer && window.YallappPlayer.postMessage) {
      window.YallappPlayer.postMessage(text);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage({ yallappChannel: 'YallappPlayer', message: text }, '*');
    }
  }
  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }
  function noop() {}
  function origin() {
    var o = window.location.origin;
    return o && o !== 'null' ? o : C.origin;
  }

  // No new windows or tabs from this page.
  window.open = function () { return null; };
  document.addEventListener('click', function (e) { e.preventDefault(); }, true);

  function layout() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    var width = Math.min(w, h * aspect);
    frame.style.width = width + 'px';
    frame.style.left = ((w - width) / 2) + 'px';
    frame.style.height = (h * 5) + 'px';
    frame.style.top = (-2 * h) + 'px';
  }
  window.addEventListener('resize', layout);
  layout();

  function time(p, d, b) {
    position = num(p);
    if (num(d)) duration = num(d);
    if (b !== undefined) buffered = Math.min(1, num(b));
    // 51 The last half second: covered before the site's end screen shows (and uncovered after a seek back).
    if (state === 'playing' || state === 'paused' || state === 'buffering') {
      cover.className = duration && duration - position < 0.5 && state === 'playing' ? '' : 'off';
    }
    send({ type: 'time', position: position, duration: duration, buffered: buffered });
  }
  function tick() { if (api && api.poll) api.poll(); }
  function setState(s) {
    if (!s || s === state) return;
    state = s;
    cover.className = (s === 'playing' || s === 'paused' || s === 'buffering') ? 'off' : '';
    tick();
    send({ type: 'state', state: s, position: position, duration: duration });
    if (s === 'playing' || s === 'buffering') {
      if (!ticker) ticker = setInterval(tick, 250);
    } else if (ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  }
  function ready(info) {
    clearTimeout(readyTimer);
    if (num(info.duration)) duration = num(info.duration);
    info.type = 'ready';
    info.duration = duration;
    send(info);
    setState('ready');
  }
  function fail(code) {
    clearTimeout(readyTimer);
    send({ type: 'error', code: String(code) });
    setState('error');
  }
  function load(src, done) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = function () { if (done) done(); };
    s.onerror = function () { fail('script'); };
    document.head.appendChild(s);
  }

  function receive(text) {
    var c;
    try { c = JSON.parse(text); } catch (e) { return; }
    if (!api || !c) return;
    switch (c.command) {
      case 'play':
        if (state === 'ended') api.seek(0);
        api.play();
        break;
      case 'pause': api.pause(); break;
      case 'seek':
        position = num(c.seconds);
        api.seek(position);
        send({ type: 'time', position: position, duration: duration, buffered: buffered });
        break;
      case 'rate': if (api.rate) api.rate(Number(c.rate) || 1); break;
      case 'captions': if (api.captions) api.captions(c.language || null); break;
      case 'quality': if (api.quality) api.quality(String(c.quality)); break;
    }
  }
  window.yallappReceive = receive;
  window.addEventListener('message', function (e) {
    if (window.parent !== window && e.source === window.parent && e.data &&
        typeof e.data.yallappMessage === 'string') {
      receive(e.data.yallappMessage);
    }
  });

  // ------------------------------------------------------------ YouTube
  function youtube() {
    var p = null;
    frame.src = C.src + '&origin=' + encodeURIComponent(origin()) +
      '&widget_referrer=' + encodeURIComponent(origin() + '/');
    function tracks() {
      try {
        var list = p.getOption('captions', 'tracklist') || [];
        send({ type: 'tracks', captions: list.map(function (t) {
          return { language: t.languageCode, label: t.displayName || t.languageName || t.languageCode };
        }) });
      } catch (e) {}
    }
    window.onYouTubeIframeAPIReady = function () {
      p = new YT.Player(frame, { events: {
        onReady: function () {
          api = {
            play: function () { p.playVideo(); },
            pause: function () { p.pauseVideo(); },
            seek: function (s) { p.seekTo(s, true); },
            rate: function (r) { p.setPlaybackRate(r); },
            captions: function (lang) {
              if (lang) {
                p.loadModule('captions');
                p.setOption('captions', 'track', { languageCode: lang });
              } else {
                p.unloadModule('captions');
              }
              send({ type: 'captions', language: lang });
            },
            poll: function () {
              time(p.getCurrentTime(), p.getDuration(), p.getVideoLoadedFraction());
            }
          };
          ready({ duration: p.getDuration(), rates: p.getAvailablePlaybackRates() || [], captions: [] });
        },
        onStateChange: function (e) {
          var s = { '-1': 'ready', '0': 'ended', '1': 'playing', '2': 'paused', '3': 'buffering', '5': 'ready' }[String(e.data)];
          if (s === 'ready' && state !== 'loading' && state !== 'ready') return;
          setState(s);
          if (s === 'playing') tracks();
        },
        onPlaybackRateChange: function (e) { send({ type: 'rate', rate: e.data }); },
        onApiChange: tracks,
        onError: function (e) { fail(e.data); }
      } });
    };
    load('https://www.youtube.com/iframe_api');
  }

  // -------------------------------------------------------------- Vimeo
  function vimeo() {
    frame.src = C.src;
    load('https://player.vimeo.com/api/player.js', function () {
      var p = new Vimeo.Player(frame);
      api = {
        play: function () { p.play().catch(noop); },
        pause: function () { p.pause().catch(noop); },
        seek: function (s) { p.setCurrentTime(s).catch(noop); },
        rate: function (r) {
          p.setPlaybackRate(r).then(function () {
            send({ type: 'rate', rate: r });
          }).catch(function () {
            // Speeds need a paid Vimeo plan.
            send({ type: 'rate', rate: 1, rates: [] });
          });
        },
        captions: function (lang) {
          (lang ? p.enableTextTrack(lang) : p.disableTextTrack()).then(function () {
            send({ type: 'captions', language: lang });
          }).catch(noop);
        },
        quality: function (q) {
          p.setQuality(q).then(function () { send({ type: 'quality', quality: q }); }).catch(noop);
        }
      };
      function safe(promise, fallback) { return promise.catch(function () { return fallback; }); }
      Promise.all([
        safe(p.getDuration(), 0), safe(p.getTextTracks(), []), safe(p.getQualities(), []),
        safe(p.getVideoWidth(), 0), safe(p.getVideoHeight(), 0)
      ]).then(function (r) {
        if (r[3] && r[4]) { aspect = r[3] / r[4]; layout(); }
        if (C.start > 0) p.setCurrentTime(C.start).catch(noop);
        var active = null;
        r[2].forEach(function (q) { if (q.active) active = q.id; });
        ready({
          duration: r[0],
          rates: [0.5, 0.75, 1, 1.25, 1.5, 2],
          captions: r[1].map(function (t) { return { language: t.language, label: t.label }; }),
          qualities: r[2].map(function (q) { return { id: q.id, label: q.label }; }),
          quality: active
        });
      });
      p.on('play', function () { setState('playing'); });
      p.on('playing', function () { setState('playing'); });
      p.on('pause', function () { if (state !== 'ended') setState('paused'); });
      p.on('ended', function () { setState('ended'); });
      p.on('bufferstart', function () { if (state === 'playing') setState('buffering'); });
      p.on('bufferend', function () { if (state === 'buffering') setState('playing'); });
      p.on('timeupdate', function (d) { time(d.seconds, d.duration); });
      p.on('progress', function (d) { buffered = Math.min(1, num(d.percent)); });
      p.on('playbackratechange', function (d) { send({ type: 'rate', rate: d.playbackRate }); });
      p.on('error', function (e) { fail(e && e.name ? e.name : 'player'); });
    });
  }

  // ---------------------------------------------- Player.js (Bunny Stream)
  function playerjs() {
    function post(method, value) {
      var m = { context: 'player.js', version: '0.0.11', method: method };
      if (value !== undefined) m.value = value;
      if (frame.contentWindow) frame.contentWindow.postMessage(JSON.stringify(m), '*');
    }
    window.addEventListener('message', function (e) {
      if (e.source !== frame.contentWindow) return;
      var d = e.data;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
      if (!d || d.context !== 'player.js') return;
      switch (d.event) {
        case 'ready':
          if (api) return;
          ['play', 'pause', 'ended', 'timeupdate', 'progress', 'error'].forEach(function (name) {
            post('addEventListener', name);
          });
          api = {
            play: function () { post('play'); },
            pause: function () { post('pause'); },
            seek: function (s) { post('setCurrentTime', s); }
          };
          if (C.start > 0) post('setCurrentTime', C.start);
          ready({ duration: 0, rates: [], captions: [] });
          break;
        case 'play': setState('playing'); break;
        case 'pause': if (state !== 'ended') setState('paused'); break;
        case 'ended': setState('ended'); break;
        case 'timeupdate': if (d.value) time(d.value.seconds, d.value.duration); break;
        case 'progress': if (d.value) buffered = Math.min(1, num(d.value.percent)); break;
        case 'error': fail('player'); break;
      }
    });
    frame.src = C.src;
  }

  readyTimer = setTimeout(function () { if (!api) fail('timeout'); }, 30000);
  send({ type: 'state', state: 'loading' });
  if (C.host === 'youtube') youtube();
  else if (C.host === 'vimeo') vimeo();
  else playerjs();
})();
</script>
</body>
</html>
''';
}
