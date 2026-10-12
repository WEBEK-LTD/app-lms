import 'package:flutter_test/flutter_test.dart';
import 'package:html/parser.dart' as html_parser;
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/modules/lms/lesson/content/lesson_html.dart';
import 'package:yallapp/modules/lms/lesson/embeds/embed_frame.dart';
import 'package:yallapp/modules/lms/lesson/embeds/framing.dart';

Embed e(String placeholder) => Embed(
  placeholder: placeholder,
  src: 'https://x.test/$placeholder',
  provider: EmbedProvider.other,
);

int embedCount(String html) =>
    html_parser.parseFragment(html).querySelectorAll(embedTag).length;

void main() {
  group('prepareLessonHtml', () {
    test('replaces elements referencing the placeholder', () {
      for (final html in [
        '<p>a</p><div data-yallapp-embed="p1"></div>',
        '<p>a</p><div id="p1">fallback</div>',
        '<p>a</p><span data-placeholder="p1"></span>',
        '<p>a</p><p1></p1>',
      ]) {
        final out = prepareLessonHtml(html, [e('p1')]);
        expect(embedCount(out), 1, reason: html);
        expect(out, contains('data-placeholder="p1"'));
        expect(out, contains('<p>a</p>'));
        expect(out, isNot(contains('fallback')));
      }
    });

    test('replaces comments and text tokens', () {
      expect(
        embedCount(prepareLessonHtml('<p>x</p><!-- p1 -->', [e('p1')])),
        1,
      );
      final block = prepareLessonHtml('<p>[p1]</p><p>after</p>', [e('p1')]);
      expect(embedCount(block), 1);
      expect(block, isNot(contains('<p></p>')));
      final inline = prepareLessonHtml('<p>Before {{p1}} after</p>', [e('p1')]);
      expect(embedCount(inline), 1);
      expect(inline, contains('Before '));
      expect(inline, contains(' after'));
    });

    test('does not match a longer placeholder', () {
      final out = prepareLessonHtml('<p>p10</p>', [e('p1')]);
      // Not found in the HTML, so it is appended rather than splitting "p10".
      expect(out, startsWith('<p>p10</p>'));
      expect(embedCount(out), 1);
    });

    test('appends embeds that are missing from the HTML', () {
      final out = prepareLessonHtml('<p>text</p>', [e('a'), e('b')]);
      expect(embedCount(out), 2);
    });
  });

  group('code blocks', () {
    String? lang(String html) => detectCodeLanguage(
      html_parser.parseFragment(html).querySelector('pre')!,
    );

    test('detects the language from common conventions', () {
      expect(
        lang('<pre><code class="language-python">x</code></pre>'),
        'python',
      );
      expect(lang('<pre class="lang-js"><code>x</code></pre>'), 'javascript');
      expect(lang('<pre class="brush: php; gutter: false">x</pre>'), 'php');
      expect(lang('<pre><code class="hljs dart">x</code></pre>'), 'dart');
      expect(lang('<pre data-lang="HTML"><code>x</code></pre>'), 'xml');
      expect(lang('<pre class="wp-block-code"><code>x</code></pre>'), isNull);
    });
  });

  group('framing', () {
    final site = Uri.parse('https://your-academy.com');

    bool allowed(
      Map<String, List<String>> headers, [
      String src = 'https://tools.test/x',
    ]) => framingAllowed(
      headers: headers,
      embedUrl: Uri.parse(src),
      parentOrigin: site,
    );

    test('X-Frame-Options', () {
      expect(allowed({}), isTrue);
      expect(
        allowed({
          'X-Frame-Options': ['DENY'],
        }),
        isFalse,
      );
      expect(
        allowed({
          'x-frame-options': ['SAMEORIGIN'],
        }),
        isFalse,
      );
      expect(
        allowed({
          'x-frame-options': ['SAMEORIGIN'],
        }, 'https://your-academy.com/page'),
        isTrue,
      );
    });

    test('CSP frame-ancestors wins over X-Frame-Options', () {
      expect(
        allowed({
          'content-security-policy': ["frame-ancestors 'none'"],
        }),
        isFalse,
      );
      expect(
        allowed({
          'content-security-policy': [
            "default-src 'self'; frame-ancestors https://your-academy.com",
          ],
          'x-frame-options': ['DENY'],
        }),
        isTrue,
      );
      expect(
        allowed({
          'content-security-policy': ['frame-ancestors *.your-academy.com'],
        }),
        isFalse,
      );
      expect(
        allowed({
          'content-security-policy': ['frame-ancestors *'],
        }),
        isTrue,
      );
      expect(
        allowed({
          'content-security-policy': ["frame-ancestors 'self'"],
        }),
        isFalse,
      );
    });
  });

  group('video embeds', () {
    test('YouTube and Vimeo links become player URLs', () {
      expect(
        embeddableVideoUrl('https://www.youtube.com/watch?v=abc123&t=10'),
        'https://www.youtube.com/embed/abc123?playsinline=1&rel=0',
      );
      expect(
        embeddableVideoUrl('https://youtu.be/abc123'),
        'https://www.youtube.com/embed/abc123?playsinline=1&rel=0',
      );
      expect(
        embeddableVideoUrl('https://vimeo.com/76979871'),
        'https://player.vimeo.com/video/76979871?playsinline=1',
      );
      expect(
        embeddableVideoUrl('https://x.test/v.mp4'),
        'https://x.test/v.mp4',
      );
    });

    test('the wrapper page frames the source and reports heights', () {
      final html = embedWrapperHtml(
        src: 'https://x.test/a?b=1&c="2"',
        measure: true,
      );
      expect(html, contains('src="https://x.test/a?b=1&amp;c=&quot;2&quot;"'));
      expect(html, contains('YallappHeight.postMessage'));
      expect(html, contains('[iFrameSizer]'));
      expect(html, contains('if (true)'));
      expect(
        embedWrapperHtml(src: 'https://x.test', measure: false),
        contains('if (false)'),
      );
    });
  });
}
