/// 162 Build your bouquet's pictures on Leqaa, drawn by the real app with
/// the shop's photos (public/flower-photos): each step and the cart, look A
/// by day, by night and in Arabic. With
/// `--dart-define=YALLAPP_GALLERY=<folder>` (not kept in the repository).
@Tags(['screenshots'])
library;

import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/theme/app_icons.dart';

import 'leqaa_screenshots_test.dart' show leqaaFontOverrides;
import 'support/leqaa.dart';
import 'support/screens.dart';
import 'support/studio_demo.dart';

const _gallery = String.fromEnvironment('YALLAPP_GALLERY');

Future<void> _tap(WidgetTester tester, Finder target) async {
  await tester.ensureVisible(target);
  await tester.pump();
  await tester.tap(target);
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump(const Duration(milliseconds: 400));
}

Future<void> _stems(WidgetTester tester, int id, int count) async {
  final plus = find.descendant(
    of: find.byKey(ValueKey('bouquet-flower-$id')),
    matching: find.byIcon(AppIcons.add),
  );
  for (var i = 0; i < count; i++) {
    await _tap(tester, plus);
  }
}

/// The steps as a customer goes through them, up to [step].
Future<void> _goTo(WidgetTester tester, String step, String language) async {
  await _stems(tester, 301, 6);
  await _stems(tester, 302, 3);
  await _stems(tester, 305, 2);
  if (step == 'flowers') {
    await _scrollTop(tester);
    return;
  }
  await _tap(tester, find.byKey(const ValueKey('bouquet-next')));
  await _tap(tester, find.byKey(const ValueKey('bouquet-wrap-402')));
  if (step == 'wrap') return;
  await _tap(tester, find.byKey(const ValueKey('bouquet-next')));
  await _tap(tester, find.byKey(const ValueKey('bouquet-card-203')));
  final birthday = find.byKey(const ValueKey('gift-occasion-birthday'));
  if (birthday.evaluate().isNotEmpty) {
    await _tap(tester, birthday);
    final ready = find.byWidgetPredicate(
      (w) =>
          w.key is ValueKey<String> &&
          (w.key! as ValueKey<String>).value.startsWith(
            'gift-template-birthday-',
          ),
    );
    if (ready.evaluate().isNotEmpty) await _tap(tester, ready.first);
  } else {
    await tester.enterText(
      find.byKey(const ValueKey('gift-message')),
      language == 'ar' ? 'كل عام وأنتِ بخير يا أمي.' : 'Happy birthday, Mama.',
    );
  }
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pump(const Duration(milliseconds: 400));
  if (step == 'card') return;
  await _tap(tester, find.byKey(const ValueKey('bouquet-next')));
  if (step == 'summary') return;
  // Into the cart, as one bouquet.
  await _tap(tester, find.byKey(const ValueKey('bouquet-next')));
  await tester.pump(const Duration(seconds: 2));
}

Future<void> _scrollTop(WidgetTester tester) async {
  for (final e in find.byType(Scrollable).evaluate()) {
    final state = (e as StatefulElement).state as ScrollableState;
    if (state.position.axis == Axis.vertical) state.position.jumpTo(0);
  }
  await tester.pump(const Duration(milliseconds: 400));
}

Shot _shot(String step, String mode, bool dark, String language) {
  final look = StudioDemo.signature('flowers', 'a');
  return Shot(
    'bouquet-$step-$mode',
    api: () {
      final api = leqaaStudioApi(look: look, lang: language);
      api.config = {
        ...api.config,
        'store': {
          ...(api.config['store'] as Map<String, dynamic>),
          'bouquet': {...leqaaBouquetBuilder(look.base, lang: language)}
            ..removeWhere(
              (k, _) => k == 'flowers' || k == 'wraps' || k == 'cards',
            ),
        },
      };
      return api..bouquet = leqaaBouquetBuilder(look.base, lang: language);
    },
    appName: 'Leqaa',
    appType: AppType.store,
    dark: dark,
    language: language,
    location: '/bouquet',
    overrides: leqaaFontOverrides,
    designPictures: true,
    prepare: (tester) => look.prepare(tester, leqaaPhotoPaths),
    shadows: true,
    after: (tester, _) => _goTo(tester, step, language),
  );
}

Future<Uint8List> _png(WidgetTester tester) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(shotKey),
  );
  return (await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: shotPixelRatio);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    return Uint8List.view(data!.buffer);
  }))!;
}

void main() {
  setUpAll(() async {
    if (_gallery.isNotEmpty) await loadAppFonts();
  });
  for (final (mode, dark, language) in [
    ('light', false, 'en'),
    ('dark', true, 'en'),
    ('ar', false, 'ar'),
  ]) {
    for (final step in ['flowers', 'wrap', 'card', 'summary', 'cart']) {
      testWidgets(
        'gallery bouquet $step $mode',
        skip: _gallery.isEmpty || !leqaaPhotosReady,
        (tester) async {
          debugDisableShadows = false;
          final shot = _shot(step, mode, dark, language);
          await shot.render(tester);
          final png = await _png(tester);
          await tester.runAsync(() async {
            await Directory(_gallery).create(recursive: true);
            await File('$_gallery/${shot.name}.png').writeAsBytes(png);
          });
          debugDisableShadows = true;
        },
      );
    }
  }
}
