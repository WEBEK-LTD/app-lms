{{flutter_js}}
{{flutter_build_config}}

// 38 Flutter reads the browser's languages with Intl.Locale, which throws on
// a tag that isn't one ("en-US@posix" from some systems, or an empty one),
// and the app never starts. Keep the valid tags, or English without any.
(function () {
  try {
    var tags = Array.prototype.slice.call(navigator.languages || []);
    var valid = tags.filter(function (tag) {
      try {
        return Boolean(tag) && Boolean(new Intl.Locale(tag).language);
      } catch (e) {
        return false;
      }
    });
    var changed = valid.length !== tags.length || tags.length === 0;
    if (valid.length === 0) valid = ["en"];
    if (changed) {
      Object.defineProperty(navigator, "languages", { configurable: true, get: function () { return valid; } });
      Object.defineProperty(navigator, "language", { configurable: true, get: function () { return valid[0]; } });
    }
  } catch (e) {
    // Leave the browser's languages as they are.
  }
})();

// The app preview (roadmap 17): no service worker, so a new deploy of the
// platform always serves the new app, and nothing stays in the browser.
_flutter.loader.load();
