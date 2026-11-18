import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/app_environment.dart';
import 'package:yallapp/core/auth/auth_controller.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/gate/app_gate.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/providers.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/widgets/app_nav_bar.dart';
import 'package:yallapp/modules/shared/pages/studio_page.dart';

import '../screenshots/support/shot.dart' show loadAppFonts;
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/market_fixtures.dart';
import '../support/test_app.dart';

/// 166 The template guard, on the phone: every Studio template's Home and
/// the pages its tabs open, as the platform serves them
/// (test/support/template_guard/<template>.json, written by
/// tool/template_guard_fixtures.sh from the platform's own pages), drawn by
/// the app's renderer ([StudioPageView]) in the app's fonts on a 360 and a
/// 412 point wide phone, at text sizes 1.0 and 1.3, left to right (English)
/// and right to left (Arabic), over a 48 point gesture bar. Nothing may
/// overflow, no element may be drawn outside its parent, and the page's
/// last element must scroll into view above the bar.
///
/// Some of these fail until the layout fixes (roadmap 163) land:
/// docs/qa/2026-11-18-guard/NOTES.md lists them. They are never skipped.
/// The app started: its config (test/support/fixtures.dart) and the
/// template's tabs and pages, as `GET /pages` gave them.
class _Gate extends AppGate {
  _Gate(this.navigation);

  final Navigation navigation;

  @override
  GateState build() =>
      GateReady(AppConfig.fromJson(configJson()), navigation: navigation);
}

/// The fixture's `GET /pages`: its tabs and bar, and the pages it serves.
Navigation _navigation(Map<String, dynamic> fixture) => Navigation.fromJson({
  'version': '1',
  'tabs': fixture['tabs'],
  'more': const <Object>[],
  'menu': const <Object>[],
  if (fixture['tab_bar'] != null) 'tab_bar': fixture['tab_bar'],
  'pages': [
    for (final MapEntry(:key, :value)
        in (fixture['pages']['en'] as Map<String, dynamic>).entries)
      {
        'slug': key,
        'title': key,
        'updated_at': '2026-11-18T10:00:00Z',
        if ((value as Map)['screen'] != null) 'screen': value['screen'],
      },
  ],
});

class _Auth extends AuthController {
  @override
  AuthState build() => const SignedOut();
}

const _widths = [360.0, 412.0];

/// Each width's phone height: a 360 x 780 and a 412 x 915 phone.
final _heights = {360.0: 780.0, 412.0: 915.0};
const _scales = [1.0, 1.3];
const _bottomInset = 48.0;
const _topInset = 24.0;
const _ratio = 2.0;

/// The tabs' bar's own height, over the phone's bottom inset.
const _barHeight = 64.0;
const _barKey = ValueKey('guard-tab-bar');

/// Whether the template's bar floats over the page (the shell's
/// `overBody`): a frosted bar with a margin, the floating pill, the dock and
/// the petal.
bool _barFloats(Map<String, dynamic>? bar) {
  final design = bar?['design'];
  final margin = (bar?['margin'] as num?) ?? 0;
  return (design == 'glass' && margin > 0) ||
      design == 'float' ||
      design == 'dock' ||
      design == 'petal';
}

/// How far a child may reach past its parent before it counts: rounding.
const _slack = 0.5;

AppType _appType(String wire) =>
    AppType.values.firstWhere((t) => t.wire == wire);

AppTemplate _template(String? name) => AppTemplate.values.firstWhere(
  (t) => t.name == name,
  orElse: () => AppTemplate.classic,
);

Color _color(String hex) =>
    Color(int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));

/// The app's own screen under a page drawn around it: a list taller than
/// the phone, as a screen of entries is.
Widget _hostedScreen() => ListView(
  key: const ValueKey('guard-hosted-screen'),
  children: [
    for (var i = 0; i < 12; i++)
      const SizedBox(height: 72, child: Placeholder(strokeWidth: 0.5)),
  ],
);

/// Render boxes that place children outside themselves on purpose: a stack
/// that doesn't clip, what
/// scrolls (a carousel's cards past the phone's edge), what moves while it
/// animates, what is laid out but not drawn, and the boxes that report their
/// own overflow (a Flex's yellow and black stripes are caught as errors).
bool _placesOutside(RenderObject parent) =>
    // A stack that doesn't clip lets a badge reach past it on purpose; one
    // that clips cuts off what reaches past it, which is reported.
    (parent is RenderStack && parent.clipBehavior == Clip.none) ||
    parent is RenderViewportBase ||
    parent is RenderTransform ||
    parent is RenderFractionalTranslation ||
    parent is RenderOffstage ||
    parent is RenderIndexedStack ||
    parent is RenderFlex ||
    parent is RenderConstrainedOverflowBox ||
    parent is RenderConstraintsTransformBox ||
    parent is RenderSizedOverflowBox ||
    parent is RenderFollowerLayer;

/// Every box drawn past its parent's edges, by the widget that made it,
/// except decorations that ignore taps. What a scroll view lays out (its slivers' children) has no box offset
/// and isn't checked: a carousel's cards go on past the phone on purpose.
List<String> _outside(RenderObject root) {
  final out = <String>[];
  void visit(RenderObject node) {
    node.visitChildren((child) {
      // A shape drawn behind an element that ignores taps (a card's
      // decorative circle) is neither read nor tapped: its edge may be cut.
      if (child is RenderIgnorePointer && child.ignoring) return;
      if (child is RenderBox &&
          node is RenderBox &&
          !_placesOutside(node) &&
          child.hasSize &&
          node.hasSize &&
          child.parentData is BoxParentData) {
        final offset = (child.parentData! as BoxParentData).offset;
        final rect = offset & child.size;
        final bounds = Offset.zero & node.size;
        final drawn = child.size.width > 0 && child.size.height > 0;
        if (drawn &&
            (rect.left < bounds.left - _slack ||
                rect.top < bounds.top - _slack ||
                rect.right > bounds.right + _slack ||
                rect.bottom > bounds.bottom + _slack)) {
          out.add(
            '${child.runtimeType} ${_rect(rect)} outside its '
            '${node.runtimeType} ${_rect(bounds)}${_madeBy(child)}',
          );
        }
      }
      visit(child);
    });
  }

  visit(root);
  return out;
}

/// The widget that made [box], and the Studio element it is in.
String _madeBy(RenderObject box) {
  final made = box.debugCreator?.toString().split('\n').first ?? '';
  String? element;
  final creator = box.debugCreator;
  if (creator is DebugCreator && creator.element.mounted) {
    creator.element.visitAncestorElements((e) {
      final w = e.widget;
      if (w is StudioNodeView) {
        element = '${w.node.type.name} ${w.node.id}';
        return false;
      }
      return true;
    });
  }
  return ' (${made.split('←').first.trim()}${element == null ? '' : ' in $element'})';
}

String _rect(Rect r) =>
    '[${r.left.toStringAsFixed(1)}, ${r.top.toStringAsFixed(1)}, '
    '${r.width.toStringAsFixed(1)} x ${r.height.toStringAsFixed(1)}]';

/// An error in one line: what happened, and the Studio element it
/// happened in (by the render object the error names).
String _errorText(FlutterErrorDetails e) {
  final what = e.exceptionAsString().split('\n').first;
  final info = e.informationCollector?.call() ?? const <DiagnosticsNode>[];
  for (final node in info) {
    final value = node.value;
    if (value is RenderObject) return '$what${_madeBy(value)}';
  }
  return what;
}

/// Whether [error] is the app failing to draw (an overflow, a layout or
/// build error), not a sample picture the test can't download.
bool _isLayoutError(FlutterErrorDetails error) {
  final library = error.library ?? '';
  if (library.contains('image resource service')) return false;
  final text = error.exceptionAsString();
  if (text.contains('HTTP request failed') || text.contains('NetworkImage')) {
    return false;
  }
  return true;
}

/// Every page's problems, appended to YALLAPP_GUARD_REPORT when set (one
/// JSON line each; docs/qa/2026-11-18-guard/NOTES.md is made from it).
void _report(String template, String slug, String lang, List<String> problems) {
  final path = Platform.environment['YALLAPP_GUARD_REPORT'];
  if (path == null || problems.isEmpty) return;
  File(path).writeAsStringSync(
    '${jsonEncode({'template': template, 'slug': slug, 'lang': lang, 'problems': problems})}\n',
    mode: FileMode.append,
  );
}

void main() {
  final dir = Directory('test/support/template_guard');
  final fixtures = dir.existsSync()
      ? (dir
                .listSync()
                .whereType<File>()
                .where((f) => f.path.endsWith('.json'))
                .toList()
              ..sort((a, b) => a.path.compareTo(b.path)))
            .map(
              (f) => jsonDecode(f.readAsStringSync()) as Map<String, dynamic>,
            )
            .toList()
      : <Map<String, dynamic>>[];

  setUpAll(loadAppFonts);

  test('has the fixtures of every Studio template', () {
    // tool/template_guard_fixtures.sh writes one for each of the platform's
    // templates; the platform's check fails when they're stale.
    expect(fixtures.length, greaterThanOrEqualTo(60));
    expect(
      fixtures.map((f) => f['template']),
      containsAll(['flowers_signature_a', 'flowers_signature_b', 'shop']),
    );
  });

  for (final fixture in fixtures) {
    final template = fixture['template'] as String;
    final pages = fixture['pages'] as Map<String, dynamic>;
    for (final lang in ['en', 'ar']) {
      final served = pages[lang] as Map<String, dynamic>;
      for (final MapEntry(key: slug, value: entry) in served.entries) {
        final json = (entry as Map<String, dynamic>)['studio'];
        final screen = entry['screen'] as String?;
        final page = StudioPage.tryParse(json);
        testWidgets(
          '$template /pages/$slug in $lang: fits every phone, its end in reach',
          (tester) async {
            expect(page, isNotNull, reason: 'the app reads the served page');
            final problems = <String>[];
            for (final width in _widths) {
              for (final scale in _scales) {
                final at =
                    '${width.toInt()} pt, text ${scale}x, '
                    '${lang == 'ar' ? 'RTL' : 'LTR'}';
                problems.addAll(
                  (await _draw(
                    tester,
                    fixture,
                    page!,
                    slug,
                    screen,
                    lang,
                    width,
                    scale,
                  )).map((p) => '$at: $p'),
                );
              }
            }
            _report(template, slug, lang, problems);
            expect(problems.join('\n'), isEmpty);
          },
        );
      }
    }
  }
}

/// Draws [page] as the phone does and returns what's wrong with it.
Future<List<String>> _draw(
  WidgetTester tester,
  Map<String, dynamic> fixture,
  StudioPage page,
  String slug,
  String? screen,
  String lang,
  double width,
  double scale,
) async {
  final height = _heights[width]!;
  tester.view
    ..physicalSize = Size(width, height) * _ratio
    ..devicePixelRatio = _ratio
    ..padding = const FakeViewPadding(
      top: _topInset * _ratio,
      bottom: _bottomInset * _ratio,
    )
    ..viewPadding = const FakeViewPadding(
      top: _topInset * _ratio,
      bottom: _bottomInset * _ratio,
    );
  tester.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final appearance = fixture['appearance'] as Map<String, dynamic>;
  final appType = _appType(fixture['app_type'] as String);
  final over = _barFloats(fixture['tab_bar'] as Map<String, dynamic>?);
  // Each error said as it happens, while its element is still in the tree.
  final errors = <String>[];
  final previous = FlutterError.onError;
  FlutterError.onError = (e) {
    if (_isLayoutError(e)) errors.add(_errorText(e));
  };
  final problems = <String>[];
  try {
    await tester.pumpWidget(
      ProviderScope(
        key: UniqueKey(),
        overrides: [
          ...marketSampleOverrides,
          sharedPreferencesProvider.overrideWithValue(prefs),
          yallappApiProvider.overrideWithValue(FakeApi()),
          authControllerProvider.overrideWith(_Auth.new),
          appGateProvider.overrideWith(() => _Gate(_navigation(fixture))),
          appEnvironmentProvider.overrideWithValue(
            AppEnvironment(
              build: testBuild.copyWith(
                appName: 'Guard Shop',
                appType: appType,
              ),
              platform: DevicePlatform.android,
              appVersion: '1.0.0',
              deviceId: 'device-1',
              deviceName: 'Test phone',
            ),
          ),
        ],
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: buildAppTheme(
            primary: _color(fixture['primary_color'] as String),
            brightness: Brightness.light,
            template: _template(appearance['template'] as String?),
            fontFamily: appearance['font'] as String? ?? 'Bricolage Grotesque',
          ),
          locale: Locale(lang),
          supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          // As the shell has it (lib/modules/shared/shared_routes.dart): the
          // tabs' bar under the page, ending at the phone's foot; a bar that
          // floats lets the page go on under it, and the page ends above it.
          home: Scaffold(
            extendBody: over,
            body: TabBarOverBody(
              over: over,
              child: StudioPageView(
                page: page,
                pageSlug: slug,
                screen: screen == null ? null : _hostedScreen(),
              ),
            ),
            bottomNavigationBar: Builder(
              builder: (context) => SizedBox(
                key: _barKey,
                height: _barHeight + MediaQuery.paddingOf(context).bottom,
              ),
            ),
          ),
        ),
      ),
    );
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    problems.addAll(_outside(tester.renderObject(find.byType(StudioPageView))));
    problems.addAll(await _endInReach(tester, page, screen != null, height));
    // Done with the page: no timers left running after it.
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 1));
  } finally {
    FlutterError.onError = previous;
  }
  problems.insertAll(0, errors);
  // Once each: nested boxes of one element repeat the same problem.
  return problems.toSet().toList();
}

/// After scrolling to the end, the page's last element (the last one drawn
/// for a visitor not signed in) is above the gesture bar and any bar pinned
/// at the page's foot.
Future<List<String>> _endInReach(
  WidgetTester tester,
  StudioPage page,
  bool aroundScreen,
  double height,
) async {
  final children = [
    for (final n in page.body.children)
      if (n.pin == StudioPin.none) n,
  ];
  if (children.isEmpty) return const [];
  Finder nodeOf(String id) => find.byWidgetPredicate(
    (w) => w is StudioNodeView && w.node.id == id,
    skipOffstage: false,
  );
  final pinned = [
    for (final n in page.body.children)
      if (n.pin == StudioPin.bottom) n.id,
  ];
  if (aroundScreen) {
    // The page's elements sit over the screen: the last one scrolls into view.
    for (final n in children.reversed) {
      final f = nodeOf(n.id);
      if (f.evaluate().isEmpty) continue;
      await tester.ensureVisible(f.first);
      await tester.pump(const Duration(milliseconds: 100));
      return _reachProblems(tester, f.first, n.id, pinned, nodeOf, height);
    }
    return const [];
  }
  final scrollables = find.byWidgetPredicate(
    (w) =>
        w is Scrollable &&
        axisDirectionToAxis(w.axisDirection) == Axis.vertical,
  );
  if (scrollables.evaluate().isNotEmpty) {
    final state = tester.state<ScrollableState>(scrollables.first);
    for (var i = 0; i < 4; i++) {
      state.position.jumpTo(state.position.maxScrollExtent);
      await tester.pump(const Duration(milliseconds: 100));
    }
  }
  for (final n in children.reversed) {
    final f = nodeOf(n.id);
    if (f.evaluate().isEmpty) continue;
    final box = tester.renderObject(f.first) as RenderBox;
    if (!box.hasSize || box.size.height == 0) continue;
    return _reachProblems(tester, f.first, n.id, pinned, nodeOf, height);
  }
  return ['no element of the page is drawn'];
}

List<String> _reachProblems(
  WidgetTester tester,
  Finder last,
  String id,
  List<String> pinned,
  Finder Function(String id) nodeOf,
  double height,
) {
  final rect = tester.getRect(last);
  // Above the tabs' bar (which covers the phone's bottom inset).
  var floor = tester.getRect(find.byKey(_barKey)).top;
  for (final p in pinned) {
    final f = nodeOf(p);
    if (f.evaluate().isNotEmpty) {
      final top = tester.getRect(f.first).top;
      if (top < floor) floor = top;
    }
  }
  if (rect.bottom > floor + 1) {
    return [
      'its last element ($id) ends at ${rect.bottom.toStringAsFixed(1)}, '
          'under ${floor.toStringAsFixed(1)} after scrolling to the end',
    ];
  }
  return const [];
}
