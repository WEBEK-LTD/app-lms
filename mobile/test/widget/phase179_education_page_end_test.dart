import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/yallapp_api.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/widgets/app_nav_bar.dart';
import 'package:yallapp/core/widgets/buttons.dart';

import '../screenshots/support/demo_api.dart';
import '../screenshots/support/shot.dart' show loadAppFonts;
import '../screenshots/support/studio_demo.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 179 The education templates' tabs reach their end (roadmap 158 on
/// Leqaa's, the same on Rawaq's and Nakhla's): each Signature look's tab
/// bar floats over the page, so a tab's list must end above it and the
/// phone's own bar. The student's My courses, the academy's Teachers, the
/// school's tabs, on a 360-wide phone, at text 1.0 and 1.3, in English and
/// Arabic: dragged to their end as a customer does, their last words are
/// above the bar.
void main() {
  setUpAll(loadAppFonts);

  const phones = <_Phone>[
    (name: '360x640', size: Size(360, 640), top: 24, bottom: 0),
    (name: '360x800 three buttons', size: Size(360, 800), top: 24, bottom: 48),
  ];
  const scales = [1.0, 1.3];

  testWidgets('179.6 a faculty entry opens its teacher\'s page', (
    tester,
  ) async {
    await _usePhone(tester, (
      name: '412',
      size: const Size(412, 915),
      top: 24,
      bottom: 24,
    ), 1);
    StudioDemo.language = 'en';
    final api = rawaqStudioApi(
      staffApp: true,
      look: StudioDemo.signature('teachers', 'a'),
    );
    // As hosted GET /pages serves Rawaq's faculty: each entry's tap with
    // its teacher; the second one as an older server sends it.
    void withTeacher(Object? node) {
      if (node is Map<String, dynamic>) {
        final action = node['action'];
        if (node['id'] == 'sig-10' && action is Map<String, dynamic>) {
          node['action'] = {...action, 'teacher_id': 1};
        }
        node.values.forEach(withTeacher);
      } else if (node is List) {
        node.forEach(withTeacher);
      }
    }

    withTeacher(api.pages['home']);
    final app = await _pumped(tester, api, AppType.lms, 'en');
    final router = app.container.read(appRouterProvider);
    await tester.tap(find.text('Hannah Clarke').first);
    await TestApp.settle(tester, 30);
    expect(router.state.uri.path, Paths.teacherPage(1));
    router.go(Paths.home);
    await TestApp.settle(tester, 30);
    await tester.tap(find.text('Deniz Kaya').first);
    await TestApp.settle(tester, 30);
    expect(router.state.uri.path, Paths.teachers);
    await _close(tester, app);
  });

  for (final look in ['a', 'b']) {
    for (final language in ['en', 'ar']) {
      testWidgets('Rawaq look $look, $language: every tab reaches its end', (
        tester,
      ) async {
        await _withoutOverflowErrors(() async {
          await _usePhone(tester, phones.first, 1);
          final app = await _rawaq(tester, look: look, language: language);
          await _everyTab(tester, phones, scales, 'Rawaq $look $language');
          await _close(tester, app);
        });
      });
      if (look == 'b') {
        testWidgets(
          'Rawaq look b, $language: its slides\' buttons fit at text 1.3',
          (tester) async {
            await _usePhone(tester, phones.first, 1.3);
            final app = await _rawaq(tester, look: look, language: language);
            // 179.11 Nothing runs past its card either: a long price
            // ("E£1,010.00") beside its course's title, in each grid card's
            // frosted label.
            expect(tester.takeException(), isNull);
            final rows = find.byWidgetPredicate(
              (w) =>
                  w.key is ValueKey<String> &&
                  (w.key! as ValueKey<String>).value.startsWith(
                    'studio-buttons-',
                  ),
            );
            expect(rows, findsWidgets);
            for (final e in rows.evaluate()) {
              // Nothing in the row of buttons runs past it.
              for (final row
                  in find
                      .descendant(
                        of: find.byElementPredicate((x) => x == e),
                        matching: find.byType(Row),
                      )
                      .evaluate()) {
                final flex = row.renderObject;
                if (flex is! RenderFlex || !flex.hasSize) continue;
                var width = 0.0;
                flex.visitChildren((c) => width += (c as RenderBox).size.width);
                expect(width, lessThanOrEqualTo(flex.size.width + 0.5));
              }
              final box = e.renderObject! as RenderBox;
              final left = box.localToGlobal(Offset.zero).dx;
              expect(left, greaterThanOrEqualTo(0));
              expect(left + box.size.width, lessThanOrEqualTo(360.5));
            }
            // As designed where they fit: one line, as tall as a button.
            await _usePhone(tester, (
              name: '412',
              size: const Size(412, 915),
              top: 24,
              bottom: 24,
            ), 1);
            final first = rows.evaluate().first.renderObject! as RenderBox;
            expect(first.size.height, lessThanOrEqualTo(48));
            await _close(tester, app);
          },
        );
      }
      testWidgets('Nakhla look $look, $language: every tab reaches its end', (
        tester,
      ) async {
        await _withoutOverflowErrors(() async {
          await _usePhone(tester, phones.first, 1);
          final app = await _nakhla(tester, look: look, language: language);
          await _everyTab(tester, phones, scales, 'Nakhla $look $language');
          await _close(tester, app);
        });
      });
    }
  }
}

typedef _Phone = ({String name, Size size, double top, double bottom});

/// Each tab of the bar, on each phone and text size, to its end.
Future<void> _everyTab(
  WidgetTester tester,
  List<_Phone> phones,
  List<double> scales,
  String why,
) async {
  final tabs = find
      .descendant(of: find.byType(AppNavBar), matching: find.byType(InkWell))
      .evaluate()
      .length;
  expect(tabs, greaterThan(1), reason: '$why: the tab bar');
  for (var i = 0; i < tabs; i++) {
    await _usePhone(tester, phones.first, 1);
    await tester.tap(
      find
          .descendant(
            of: find.byType(AppNavBar),
            matching: find.byType(InkWell),
          )
          .at(i),
    );
    await TestApp.settle(tester, 30);
    for (final phone in phones) {
      for (final scale in scales) {
        await _usePhone(tester, phone, scale);
        await _toTop(tester);
        await _toEnd(tester);
        _expectEndInReach(tester, '$why, tab $i, ${phone.name}, text x$scale');
      }
    }
  }
}

/// Rawaq Academy in its Signature look, signed in, with a dozen courses
/// of the student's and a dozen teachers.
Future<TestApp> _rawaq(
  WidgetTester tester, {
  required String look,
  required String language,
}) async {
  StudioDemo.language = language;
  addTearDown(() => StudioDemo.language = 'en');
  final api = rawaqStudioApi(
    staffApp: true,
    look: StudioDemo.signature('teachers', look),
    arabic: language == 'ar',
  );
  final mine = [
    for (var id = 1; id <= 12; id++)
      {
        ...myCourseJson(),
        'course': {
          ...courseSummaryJson(id: id, title: 'Course number $id'),
          'enrolled': true,
        },
      },
  ];
  api.myCourseLists = {
    MyCoursesStatus.inProgress: mine,
    MyCoursesStatus.completed: mine,
  };
  api.teachers = [
    for (var id = 1; id <= 12; id++)
      teacherSummaryJson(id: id, name: 'Teacher number $id', featured: false),
  ];
  return _pumped(tester, api, AppType.lms, language);
}

/// Nakhla School in its Signature look, a parent signed in.
Future<TestApp> _nakhla(
  WidgetTester tester, {
  required String look,
  required String language,
}) async {
  StudioDemo.language = language;
  addTearDown(() => StudioDemo.language = 'en');
  final api = nakhlaStudioApi(
    staffApp: true,
    look: StudioDemo.signature('school', look),
  );
  return _pumped(tester, api, AppType.school, language);
}

Future<TestApp> _pumped(
  WidgetTester tester,
  DemoApi api,
  AppType type,
  String language,
) async {
  final app = TestApp(
    api: api,
    appType: type,
    signedIn: true,
    preferences: {
      'settings.theme_mode': 'light',
      'settings.language': language,
    },
  );
  await app.pump(tester);
  await TestApp.settle(tester, 20);
  expect(find.byType(AppNavBar), findsOneWidget);
  return app;
}

Future<void> _usePhone(WidgetTester tester, _Phone phone, double scale) async {
  const ratio = 3.0;
  tester.view
    ..devicePixelRatio = ratio
    ..physicalSize = phone.size * ratio
    ..viewPadding = FakeViewPadding(
      top: phone.top * ratio,
      bottom: phone.bottom * ratio,
    )
    ..padding = FakeViewPadding(
      top: phone.top * ratio,
      bottom: phone.bottom * ratio,
    );
  tester.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

/// Large fonts make some elements of a set height overflow: not what
/// these tests look at.
Future<void> _withoutOverflowErrors(Future<void> Function() body) async {
  final previous = FlutterError.onError;
  FlutterError.onError = (details) {
    if (details.exceptionAsString().contains('A RenderFlex overflowed')) {
      return;
    }
    previous?.call(details);
  };
  try {
    await body();
  } finally {
    FlutterError.onError = previous;
  }
}

Future<void> _close(WidgetTester tester, TestApp app) async {
  await tester.pumpWidget(const SizedBox());
  app.container.dispose();
  await TestApp.settle(tester, 2);
}

final _vertical = find.byWidgetPredicate(
  (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
);

List<ScrollPosition> _positions(WidgetTester tester) => [
  for (final e in _vertical.evaluate())
    ((e as StatefulElement).state as ScrollableState).position,
];

Size _screen(WidgetTester tester) =>
    tester.view.physicalSize / tester.view.devicePixelRatio;

Future<void> _toTop(WidgetTester tester) async {
  for (final p in _positions(tester).reversed) {
    if (p.hasPixels && p.pixels != 0) p.jumpTo(0);
  }
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 300));
}

Future<void> _toEnd(WidgetTester tester) async {
  final size = _screen(tester);
  final from = Offset(size.width / 2, size.height * 0.5);
  List<double> now() => [for (final p in _positions(tester)) p.pixels];
  for (var i = 0; i < 60; i++) {
    final before = now();
    await tester.dragFrom(from, Offset(0, -size.height * 0.35));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    if (listEquals(before, now())) break;
  }
}

/// Where the foot of the screen is covered from: the tab bar over the
/// page, a screen's bottom bar, the phone's own bar.
double _clearAbove(WidgetTester tester) {
  final view = tester.view;
  final size = _screen(tester);
  var clear = size.height - view.viewPadding.bottom / view.devicePixelRatio;
  for (final finder in [find.byType(AppNavBar), find.byType(BottomActionBar)]) {
    for (final e in finder.evaluate()) {
      final top = tester.getRect(find.byElementPredicate((x) => x == e)).top;
      if (top < clear) clear = top;
    }
  }
  return clear;
}

void _expectEndInReach(WidgetTester tester, String why) {
  final size = _screen(tester);
  for (final p in _positions(tester)) {
    if (p.viewportDimension < size.height * 0.4) continue;
    expect(
      p.pixels,
      greaterThanOrEqualTo(p.maxScrollExtent - 1),
      reason: '$why: the page scrolled to its end',
    );
  }
  var lowest = 0.0;
  var what = '';
  for (final e
      in find
          .descendant(
            of: _vertical,
            matching: find.byWidgetPredicate(
              (w) => w is RichText || w is RawImage,
            ),
          )
          .evaluate()) {
    if (e.findAncestorWidgetOfExactType<BottomActionBar>() != null) continue;
    final box = e.renderObject as RenderBox?;
    if (box == null || !box.attached || !box.hasSize) continue;
    final bottom = box.localToGlobal(Offset(0, box.size.height)).dy;
    if (bottom > lowest) {
      lowest = bottom;
      what = e.widget is RichText
          ? (e.widget as RichText).text.toPlainText()
          : 'a picture';
    }
  }
  if (lowest == 0) return;
  final clear = _clearAbove(tester);
  expect(
    lowest,
    lessThanOrEqualTo(clear + 0.5),
    reason:
        '$why: the page\'s last words ("$what", down to $lowest) lie above '
        'what covers the foot of the screen (from $clear)',
  );
}
