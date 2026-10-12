import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/modules/lms/lesson/embeds/embed_sizing.dart';

Embed embed({
  EmbedProvider provider = EmbedProvider.other,
  String? width,
  String? height,
  double? aspectRatio,
}) => Embed(
  placeholder: 'e',
  src: 'https://x.test/e',
  provider: provider,
  width: width,
  height: height,
  aspectRatio: aspectRatio,
);

/// Common phone sizes (content width, visible height).
const screens = {
  'small phone': (320.0, 480.0),
  'phone': (350.0, 674.0),
  'large phone': (390.0, 760.0),
  'landscape phone': (804.0, 250.0),
  'tablet': (728.0, 900.0),
};

void main() {
  group('width always matches the content width', () {
    for (final entry in screens.entries) {
      final (w, h) = entry.value;
      for (final setWidth in ['100%', '640', '1920', '320px', null, 'auto']) {
        test('${entry.key}, width "$setWidth"', () {
          for (final mode in EmbedHeightMode.values) {
            final size = computeEmbedSize(
              embed: embed(width: setWidth, height: '900'),
              contentWidth: w,
              viewportHeight: h,
              mode: mode,
            );
            expect(size.width, w);
          }
        });
      }
    }
  });

  group('auto: order of preference', () {
    test('1. measured height for same-site embeds', () {
      final size = computeEmbedSize(
        embed: embed(provider: EmbedProvider.sameSite, height: '400'),
        contentWidth: 350,
        viewportHeight: 674,
        measuredHeight: 1830,
        reportedHeight: 500,
      );
      expect(size.height, 1830);
      expect(size.source, EmbedHeightSource.measured);
      expect(size.sizedToContent, isTrue);
    });

    test('a measured height is ignored for other sites', () {
      final size = computeEmbedSize(
        embed: embed(height: '400'),
        contentWidth: 350,
        viewportHeight: 674,
        measuredHeight: 1830,
      );
      expect(size.source, isNot(EmbedHeightSource.measured));
    });

    test('2. height reported through postMessage', () {
      final size = computeEmbedSize(
        embed: embed(provider: EmbedProvider.sameSite, height: '400'),
        contentWidth: 350,
        viewportHeight: 674,
        reportedHeight: 812.4,
      );
      expect(size.height, 812.4);
      expect(size.source, EmbedHeightSource.reported);
    });

    test('3. provider aspect ratio: YouTube and Vimeo are 16:9', () {
      for (final provider in [EmbedProvider.youtube, EmbedProvider.vimeo]) {
        final size = computeEmbedSize(
          embed: embed(provider: provider, height: '315', width: '560'),
          contentWidth: 350,
          viewportHeight: 674,
        );
        expect(size.height, closeTo(350 * 9 / 16, 1e-9));
        expect(size.source, EmbedHeightSource.aspectRatio);
      }
    });

    test("3. the lesson's aspect_ratio for other providers", () {
      final size = computeEmbedSize(
        embed: embed(aspectRatio: 4 / 3, height: '900'),
        contentWidth: 360,
        viewportHeight: 674,
      );
      expect(size.height, 270);
      expect(size.source, EmbedHeightSource.aspectRatio);
    });

    test('3. an aspect ratio taller than the screen is capped', () {
      final size = computeEmbedSize(
        embed: embed(aspectRatio: 9 / 16),
        contentWidth: 390,
        viewportHeight: 600,
      );
      expect(size.height, 600);
      expect(size.capped, isTrue);
    });

    test('4. lesson height, capped to the visible screen', () {
      final small = computeEmbedSize(
        embed: embed(height: '400'),
        contentWidth: 350,
        viewportHeight: 674,
      );
      expect(small.height, 400);
      expect(small.source, EmbedHeightSource.lessonHeight);
      expect(small.capped, isFalse);

      final tall = computeEmbedSize(
        embed: embed(height: '900px'),
        contentWidth: 350,
        viewportHeight: 674,
      );
      expect(tall.height, 674);
      expect(tall.capped, isTrue);
    });

    test('5. otherwise the visible screen height', () {
      for (final height in [null, '100%', 'auto', 'abc']) {
        final size = computeEmbedSize(
          embed: embed(height: height),
          contentWidth: 350,
          viewportHeight: 674,
        );
        expect(size.height, 674, reason: 'height "$height"');
        expect(size.source, EmbedHeightSource.viewport);
      }
    });
  });

  test('fit_screen always uses the visible screen', () {
    final size = computeEmbedSize(
      embed: embed(provider: EmbedProvider.youtube, height: '315'),
      contentWidth: 350,
      viewportHeight: 674,
      mode: EmbedHeightMode.fitScreen,
      reportedHeight: 300,
    );
    expect(size.height, 674);
    expect(size.source, EmbedHeightSource.viewport);
  });

  test('as_set uses the lesson height, ignoring measurements', () {
    final size = computeEmbedSize(
      embed: embed(provider: EmbedProvider.sameSite, height: '500'),
      contentWidth: 350,
      viewportHeight: 674,
      mode: EmbedHeightMode.asSet,
      measuredHeight: 2000,
    );
    expect(size.height, 500);
    expect(size.source, EmbedHeightSource.lessonHeight);

    final noHeight = computeEmbedSize(
      embed: embed(provider: EmbedProvider.youtube),
      contentWidth: 320,
      viewportHeight: 674,
      mode: EmbedHeightMode.asSet,
    );
    expect(noHeight.height, 180, reason: 'falls back to the aspect ratio');
  });

  test('rotation: the same embed is resized for the new screen', () {
    final e = embed(height: '900');
    final portrait = computeEmbedSize(
      embed: e,
      contentWidth: 350,
      viewportHeight: 674,
    );
    final landscape = computeEmbedSize(
      embed: e,
      contentWidth: 804,
      viewportHeight: 250,
    );
    expect(portrait.height, 674);
    expect(landscape.width, 804);
    expect(landscape.height, 250);
  });

  test('the keyboard shrinks the visible height', () {
    final open = visibleViewportHeight(
      screenHeight: 844,
      topPadding: 47,
      bottomPadding: 34,
      keyboardInset: 336,
      chrome: 170,
    );
    final closed = visibleViewportHeight(
      screenHeight: 844,
      topPadding: 47,
      bottomPadding: 34,
      keyboardInset: 0,
      chrome: 170,
    );
    expect(closed, 844 - 47 - 34 - 170);
    expect(open, 844 - 47 - 336 - 170);
    final e = embed(height: '900');
    expect(
      computeEmbedSize(
        embed: e,
        contentWidth: 350,
        viewportHeight: open,
      ).height,
      open,
    );
  });

  test('never collapses or runs away', () {
    final tiny = computeEmbedSize(
      embed: embed(height: '10'),
      contentWidth: 350,
      viewportHeight: 674,
    );
    expect(tiny.height, minEmbedHeight);
    final huge = computeEmbedSize(
      embed: embed(provider: EmbedProvider.sameSite),
      contentWidth: 350,
      viewportHeight: 674,
      measuredHeight: 1e9,
    );
    expect(huge.height, maxMeasuredHeight);
    final noViewport = computeEmbedSize(
      embed: embed(),
      contentWidth: 350,
      viewportHeight: 0,
    );
    expect(noViewport.height, minEmbedHeight);
  });

  test('parsePixels', () {
    expect(parsePixels('640'), 640);
    expect(parsePixels(' 640px '), 640);
    expect(parsePixels('56.25%'), isNull);
    expect(parsePixels('0'), isNull);
    expect(parsePixels(null), isNull);
  });
}
