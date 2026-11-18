import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/modules/shared/pages/resume_reload.dart';

import '../support/fake_api.dart';
import '../support/test_app.dart';

/// 156 What the owner publishes in Studio is what the app shows: Leqaa's
/// home and shop exactly as hosted `GET /pages` and `GET /pages/{slug}`
/// serve them after the owner's edits (test/support/studio_publish.json,
/// written by platform/web/tests/unit/phase156-studio-publish.test.ts): the
/// "Kind words" heading renamed and a review written by the owner, in
/// English and on an Arabic phone (the template's Arabic placeholders were
/// shown before), the wordmark in its new colour, and a second publish
/// shown when the app is back on screen.
void main() {
  final fixture = jsonDecode(
    File('test/support/studio_publish.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  Map<String, dynamic> served(String publish, String lang) =>
      ((fixture[publish] as Map)[lang] as Map).cast<String, dynamic>();

  void answer(FakeApi api, Map<String, dynamic> served) {
    api
      ..navigation = (served['navigation'] as Map).cast<String, dynamic>()
      ..pages = {
        for (final MapEntry(:key, :value) in (served['pages'] as Map).entries)
          key as String: (value as Map).cast<String, dynamic>(),
      };
  }

  FakeApi apiFor(Map<String, dynamic> served) {
    final api = FakeApi(
      config: (fixture['config'] as Map).cast<String, dynamic>(),
    );
    answer(api, served);
    return api;
  }

  /// [body] with a box overflowing its fixed height left to the layout's own
  /// tests (the cover's rows at the test font's sizes, roadmap 163): this
  /// test is about which words reach the app.
  Future<void> drawing(Future<void> Function() body) async {
    final original = FlutterError.onError;
    FlutterError.onError = (details) {
      if (!details.exceptionAsString().contains('A RenderFlex overflowed')) {
        original?.call(details);
      }
    };
    try {
      await body();
    } finally {
      FlutterError.onError = original;
    }
  }

  Future<void> scrollTo(WidgetTester tester, Finder finder) async {
    await tester.scrollUntilVisible(
      finder,
      300,
      // The page's own list, not a slider across it.
      scrollable: find
          .byWidgetPredicate(
            (w) =>
                w is Scrollable &&
                axisDirectionToAxis(w.axisDirection) == Axis.vertical,
          )
          .first,
      maxScrolls: 80,
    );
    await tester.pump();
  }

  /// The colours [text] is drawn in, wherever it is (the cover's wordmark,
  /// a header's title).
  List<Color?> colorsOf(WidgetTester tester, Finder text) => [
    for (final element in text.evaluate())
      (element.renderObject as RenderParagraph?)?.text.style?.color,
  ];

  testWidgets("draws the owner's edits of Leqaa's home, in English", (
    tester,
  ) async {
    await drawing(() async {
      final app = TestApp(
        api: apiFor(served('first', 'en')),
        appType: AppType.store,
        // Signed in: the app opens on its home, not the sign-in screen it
        // asks for first.
        signedIn: true,
      );
      await app.pump(tester);
      await TestApp.settle(tester, 20);
      // The wordmark in the colour chosen in Studio.
      expect(
        colorsOf(tester, find.text('Leqaa')),
        contains(const Color(0xFF00A86B)),
      );
      await scrollTo(tester, find.text('What our customers say'));
      expect(find.text('Kind words'), findsNothing);
      await scrollTo(tester, find.text('Jakeer'));
      expect(
        find.text('The fact that every question was answered to.'),
        findsOneWidget,
      );
    });
  });

  testWidgets("on an Arabic phone: the owner's words, not the template's", (
    tester,
  ) async {
    await drawing(() async {
      final app = TestApp(
        api: apiFor(served('first', 'ar')),
        appType: AppType.store,
        signedIn: true,
        preferences: {LocalSettingsController.languageKey: 'ar'},
      );
      await app.pump(tester);
      await TestApp.settle(tester, 20);
      await scrollTo(tester, find.text('What our customers say'));
      expect(find.text('كلمات طيبة'), findsNothing);
      await scrollTo(tester, find.text('Jakeer'));
      expect(find.text('[رأي أحد العملاء فيك]'), findsNothing);
      expect(find.text('[اسم العميل]'), findsNothing);
    });
  });

  testWidgets('a second publish shows when the app is back on screen', (
    tester,
  ) async {
    await drawing(() async {
      final resumes = StreamController<void>.broadcast();
      addTearDown(resumes.close);
      var now = DateTime.utc(2026, 11, 18, 10);
      final api = apiFor(served('first', 'en'));
      final app = TestApp(
        api: api,
        appType: AppType.store,
        signedIn: true,
        overrides: [
          appResumedProvider.overrideWithValue(resumes.stream),
          resumeClockProvider.overrideWithValue(() {
            now = now.add(const Duration(minutes: 1));
            return now;
          }),
        ],
      );
      await app.pump(tester);
      await TestApp.settle(tester, 20);
      await scrollTo(tester, find.text('What our customers say'));
      // Published again in Studio meanwhile: a new version of the pages.
      answer(api, served('second', 'en'));
      resumes.add(null);
      await TestApp.settle(tester, 20);
      await scrollTo(tester, find.text("Our customers' words"));
      expect(find.text('What our customers say'), findsNothing);
    });
  });
}
