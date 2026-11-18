import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/gate/app_gate.dart';
import 'package:yallapp/core/theme/fonts/font_cache.dart';
import 'package:yallapp/core/theme/fonts/remote_fonts.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/shared/pages/screen_page.dart';

import 'test_app.dart';

import 'package:yallapp/core/widgets/app_nav_bar.dart';

import '../screenshots/support/leqaa.dart';
import '../screenshots/support/screens.dart';
import '../screenshots/support/studio_demo.dart';

/// 163 A phone's settings as a Samsung (and many other Android phones) can
/// have them: its width in points (display zoom), its density, the text
/// size (font scale) and the system bar under the app (three buttons: 48,
/// the gesture bar: 24).
class PhoneSettings {
  const PhoneSettings({
    required this.width,
    required this.height,
    required this.density,
    required this.fontScale,
    required this.bottom,
    this.top = 24,
  });

  final double width;
  final double height;
  final double density;
  final double fontScale;
  final double bottom;
  final double top;

  @override
  String toString() =>
      '${width.toStringAsFixed(0)}pt@${density}x font ${fontScale}x '
      '${bottom == 48 ? '3-button' : 'gesture'} bar';
}

/// Display zoom: a Galaxy's 1080-pixel-wide screen zoomed in (360 and 384
/// points at a higher density) and at its standard zoom (412 points).
const samsungScreens = [
  (width: 360.0, height: 780.0, density: 3.0),
  (width: 384.0, height: 832.0, density: 2.8125),
  (width: 412.0, height: 892.0, density: 2.625),
];

const samsungFontScales = [1.0, 1.15, 1.3, 1.5];

/// Three-button navigation, gesture navigation.
const samsungBottomBars = [48.0, 24.0];

/// Every combination of [samsungScreens], [samsungFontScales] and
/// [samsungBottomBars].
List<PhoneSettings> get samsungMatrix => [
  for (final s in samsungScreens)
    for (final f in samsungFontScales)
      for (final b in samsungBottomBars)
        PhoneSettings(
          width: s.width,
          height: s.height,
          density: s.density,
          fontScale: f,
          bottom: b,
        ),
];

/// The hardest of them (the narrowest screen, the largest text, three
/// buttons) and the commonest (standard zoom, standard text, gestures).
const samsungHardest = PhoneSettings(
  width: 360,
  height: 780,
  density: 3,
  fontScale: 1.5,
  bottom: 48,
);
const samsungCommon = PhoneSettings(
  width: 412,
  height: 892,
  density: 2.625,
  fontScale: 1,
  bottom: 24,
);

/// The pages of Leqaa's signature template (test/support/signatures/
/// flowers_`look`.json, as the platform makes the project).
List<String> leqaaPageSlugs(String look) {
  final project = jsonDecode(
    File('test/support/signatures/flowers_$look.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  return [
    for (final p in (project['layout'] as Map)['pages'] as List)
      (p as Map)['slug'] as String,
  ];
}

/// The app's screen the page [slug] is drawn around (null: a page of its
/// own). One that needs an id (a chat) opens as a page.
String? leqaaPageScreen(String look, String slug) {
  final project = jsonDecode(
    File('test/support/signatures/flowers_$look.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  for (final p in (project['layout'] as Map)['pages'] as List) {
    if ((p as Map)['slug'] != slug) continue;
    final screen = (p['studio'] as Map)['screen'] as String?;
    return screen == 'chat_conversation' ? null : screen;
  }
  return null;
}

/// A Leqaa order on its way (being arranged), for the Orders tab.
Map<String, dynamic> leqaaOrderJson({String lang = 'en'}) => {
  'id': 5107,
  'number': '5107',
  'status': 'processing',
  'status_label': lang == 'ar' ? 'قيد التنسيق' : 'Being arranged',
  'total': lang == 'ar' ? '2,050 ج.م' : 'E£ 2,050',
  'created_at': '2026-11-17T10:00:00Z',
  'items': [
    {'name': lang == 'ar' ? 'حديقة الورد' : 'Blush Garden', 'product_id': 101},
  ],
};

/// The look's own font (Fraunces, look A's display face) from the
/// platform's copy kept with the tests, as the phone downloads it.
final _fonts = [
  remoteFontDepsProvider.overrideWithValue(
    RemoteFontDeps(
      fetch: (url) async => url.path.toLowerCase().contains('fraunces')
          ? File('test/screenshots/support/fonts/Fraunces.ttf')
                .readAsBytesSync()
          : null,
      cache: _MemoryFonts(),
      register: flutterFontRegistrar,
    ),
  ),
];

class _MemoryFonts implements FontCache {
  final _files = <String, Uint8List>{};
  @override
  Future<Uint8List?> read(String key) async => _files[key];
  @override
  Future<void> write(String key, Uint8List bytes) async => _files[key] = bytes;
}

/// What's wrong with a page's layout, as [checkLayout] finds it.
class LayoutProblems {
  final list = <String>[];
  void add(String problem) {
    if (!list.contains(problem)) list.add(problem);
  }

  bool get isEmpty => list.isEmpty;
  @override
  String toString() => list.join('\n');
}

/// Opens Leqaa's app (look [look]'s template) on [slug] with [phone]'s
/// settings, and collects the layout errors it throws (a flex overflowing)
/// into [problems] instead of failing at the first.
Future<void> openLeqaaPage(
  WidgetTester tester, {
  required String look,
  required String slug,
  required PhoneSettings phone,
  required LayoutProblems problems,
  String language = 'en',
  bool dark = false,
  bool withOrder = false,
}) async {
  final demo = StudioDemo.signature('flowers', look);
  final screen = leqaaPageScreen(look, slug);
  tester.platformDispatcher.textScaleFactorTestValue = phone.fontScale;
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  final shown = FlutterError.onError;
  FlutterError.onError = (details) {
    final creator =
        details.informationCollector?.call().map((d) => '$d').join(' ') ?? '';
    final where = RegExp(r"studio-node-[\w-]+")
        .allMatches('$details $creator')
        .map((m) => m.group(0))
        .take(2)
        .join(' < ');
    problems.add(
      '${details.exceptionAsString().split('\n').first}'
      '${where.isEmpty ? '' : ' in $where'}',
    );
  };
  try {
    await Shot(
      'samsung',
      api: () {
        final api = leqaaStudioApi(
          look: demo,
          primaryColor: look == 'a' ? '#8E2445' : '#2F5D50',
          lang: language,
        );
        api.orders = withOrder ? [leqaaOrderJson(lang: language)] : [];
        return api;
      },
      appName: 'Leqaa',
      appType: AppType.store,
      overrides: _fonts,
      dark: dark,
      language: language,
      // A page drawn around one of the app's screens opens at the screen's
      // address (its tab, a link to it), as the app opens it.
      location: slug == 'home' || screen != null ? null : '/page/$slug',
      after: screen == null
          ? null
          : (tester, router) async {
              final app = tester.element(find.byType(MaterialApp));
              final container = ProviderScope.containerOf(app);
              final gate = container.read(appGateProvider);
              final at = screenLocation(
                screen,
                container.read(appModuleProvider),
                gate is GateReady ? gate.config : null,
              );
              router.push(at ?? '/page/$slug');
              await TestApp.settle(tester, 20);
            },
      size: Size(phone.width, phone.height),
      designPictures: true,
      shadows: true,
      prepare: (tester) async {
        await demo.prepare(tester, leqaaPhotoPaths);
        final d = phone.density;
        tester.view
          ..physicalSize = Size(phone.width, phone.height) * d
          ..devicePixelRatio = d
          ..padding = FakeViewPadding(
            top: phone.top * d,
            bottom: phone.bottom * d,
          )
          ..viewPadding = FakeViewPadding(
            top: phone.top * d,
            bottom: phone.bottom * d,
          );
      },
    ).render(tester);
  } finally {
    FlutterError.onError = shown;
  }
}

/// The view's height and the line nothing may sit under once every list is
/// at its end: the top of the app's tab bar, else of the system's bar.
double _floor(WidgetTester tester, PhoneSettings phone) {
  var floor = phone.height - phone.bottom;
  for (final e in find.byType(AppNavBar).evaluate()) {
    final box = e.renderObject;
    if (box is! RenderBox || !box.attached || !box.hasSize) continue;
    final top = box.localToGlobal(Offset.zero).dy;
    // The bar's own room under it is its, not the page's.
    if (top < floor) floor = top;
  }
  return floor;
}

/// Where [box] is on the screen, through its transforms (a mirrored icon
/// in right-to-left is flipped about its middle).
Rect _rect(RenderBox box) =>
    MatrixUtils.transformRect(box.getTransformTo(null), Offset.zero & box.size);

/// The nearest scrollable above [e] (null: none).
ScrollableState? _scrollOf(Element e) => Scrollable.maybeOf(e);

/// Scrolled to the end as a person would: the page dragged up until
/// nothing moves any more.
Future<void> scrollAllToEnd(WidgetTester tester, PhoneSettings phone) async {
  List<double> where() => [
    for (final e
        in find
            .byWidgetPredicate(
              (w) =>
                  w is Scrollable &&
                  axisDirectionToAxis(w.axisDirection) == Axis.vertical,
            )
            .evaluate())
      if (e.mounted &&
          ((e as StatefulElement).state as ScrollableState).position.hasPixels)
        ((e).state as ScrollableState).position.pixels,
  ];
  for (var i = 0; i < 30; i++) {
    final before = where();
    await tester.dragFrom(
      Offset(phone.width / 2, phone.height * 0.6),
      const Offset(0, -320),
    );
    await tester.pump(const Duration(milliseconds: 400));
    final after = where();
    if (before.length == after.length &&
        [for (var j = 0; j < before.length; j++) (before[j] - after[j]).abs()]
            .every((d) => d < 0.5)) {
      break;
    }
  }
  await tester.pump(const Duration(milliseconds: 600));
}

/// 163 The page's layout as a person sees it: [problems] gets each
/// - text outside the Studio element that holds it (its fixed height too
///   small for the text, a piece placed outside it);
/// - text outside the card (an element's background or border) it is drawn
///   in, or a card drawn away from what it holds (glass offset);
/// - text beyond the screen's sides;
/// - text left under the tab bar or the system's bar once every list is at
///   its end (cut off, out of reach).
Future<void> checkLayout(
  WidgetTester tester,
  PhoneSettings phone,
  LayoutProblems problems, {
  bool atEnd = true,
}) async {
  const slack = 1.0;
  final app = find.byType(MaterialApp);
  final texts = find.descendant(of: app, matching: find.byType(RichText));
  bool visible(RenderObject r) {
    if (!r.attached) return false;
    // In a list but scrolled out of its view (kept for later).
    for (RenderObject? o = r.parent; o != null; o = o.parent) {
      if (o is RenderSliver && !o.geometry!.visible) return false;
      if (o is RenderOffstage && o.offstage) return false;
      if (o is RenderOpacity && o.opacity == 0) return false;
      if (o is RenderAnimatedOpacity && o.opacity.value == 0) return false;
    }
    return true;
  }

  String said(RenderParagraph p) {
    final t = p.text.toPlainText().replaceAll('\n', ' ').trim();
    return t.length > 28 ? '${t.substring(0, 28)}…' : t;
  }

  final screen = Offset.zero & Size(phone.width, phone.height);
  // Each element's card, for the words drawn over another's.
  final cards = <(String, Element, Rect)>[];
  // Each Studio element and the text in it.
  for (final node
      in find
          .descendant(
            of: app,
            matching: find.byWidgetPredicate(
              (w) =>
                  w is KeyedSubtree &&
                  w.key is ValueKey<String> &&
                  (w.key! as ValueKey<String>).value.startsWith('studio-node-'),
            ),
          )
          .evaluate()) {
    final box = node.renderObject;
    if (box is! RenderBox || !box.hasSize || !visible(box)) continue;
    final id = ((node.widget as KeyedSubtree).key! as ValueKey<String>).value;
    final outer = _rect(box);
    final scroll = _scrollOf(node);
    // Its card: the first background or border inside it (after its
    // margin), not one of the elements it holds.
    RenderBox? card;
    void findCard(Element e) {
      if (card != null) return;
      final w = e.widget;
      if (w is KeyedSubtree && '${w.key}'.contains('studio-node-')) return;
      if (w is Flex || w is Stack || w is RichText) return;
      if (w is DecoratedBox && w.decoration is BoxDecoration) {
        final d = w.decoration as BoxDecoration;
        if (d.color != null || d.border != null || d.gradient != null) {
          card = e.renderObject as RenderBox?;
          return;
        }
      }
      e.visitChildElements(findCard);
    }

    node.visitChildElements(findCard);
    final cardRect = card != null && card!.hasSize ? _rect(card!) : null;
    if (cardRect != null) cards.add((id, node, cardRect));
    for (final t
        in find
            .descendant(
              of: find.byElementPredicate((e) => e == node),
              matching: find.byType(RichText),
            )
            .evaluate()) {
      final p = t.renderObject;
      if (p is! RenderParagraph || !p.hasSize || !visible(p)) continue;
      // Text in a list of its own inside (a carousel) moves inside it.
      if (_scrollOf(t) != scroll) continue;
      final r = _rect(p);
      if (r.isEmpty || said(p).isEmpty) continue;
      if (r.left < outer.left - slack ||
          r.right > outer.right + slack ||
          r.top < outer.top - slack ||
          r.bottom > outer.bottom + slack) {
        problems.add('"${said(p)}" spills out of $id ($r outside $outer)');
      }
      if (cardRect != null &&
          (r.left < cardRect.left - slack ||
              r.right > cardRect.right + slack ||
              r.top < cardRect.top - slack ||
              r.bottom > cardRect.bottom + slack)) {
        problems.add(
          '"${said(p)}" is outside the card of $id ($r outside $cardRect)',
        );
      }
    }
  }
  for (final t in texts.evaluate()) {
    final p = t.renderObject;
    if (p is! RenderParagraph || !p.hasSize || !visible(p)) continue;
    if (said(p).isEmpty) continue;
    final r = _rect(p);
    // Only what's on the screen (a list keeps some below its view).
    if (r.top >= screen.bottom || r.bottom <= screen.top) continue;
    if (_scrollOf(t)?.widget.axisDirection
        case AxisDirection.left || AxisDirection.right) {
      continue;
    }
    if (r.left < -slack || r.right > screen.right + slack) {
      problems.add('"${said(p)}" is beyond the screen\'s side ($r)');
    }
  }
  // Words whose letters reach beyond their line (a line height too tight
  // for the script: Arabic under a display face's 1.04) onto another
  // element's card: the words' colour inside the card's top or bottom edge,
  // as the screen shows it.
  final pixels = await _pixels(tester);
  for (final t in texts.evaluate()) {
    final p = t.renderObject;
    if (p is! RenderParagraph || !p.hasSize || !visible(p)) continue;
    if (said(p).isEmpty) continue;
    final ink = (p.text.style?.color);
    if (ink == null) continue;
    // The tab bar floats over the page: what scrolls under it isn't its.
    if (find
        .descendant(
          of: find.byType(AppNavBar),
          matching: find.byElementPredicate((e) => e == t),
        )
        .evaluate()
        .isNotEmpty) {
      continue;
    }
    final box = _rect(p);
    for (final (id, node, card) in cards) {
      // Its own card, or one it is drawn on.
      var inside = false;
      t.visitAncestorElements((a) => !(inside = a == node));
      if (inside) continue;
      if (box.overlaps(card)) continue;
      // Just over the card (its letters reaching down into it) or just
      // under it (up into it).
      // Within reach of its letters: the deepest of the app's faces
      // (Readex Pro) reach about a third of their size past their line.
      final reach =
          0.35 * (p.text.style?.fontSize ?? 14) * p.textScaler.scale(1);
      final below =
          card.top >= box.bottom - 0.5 && card.top - box.bottom < reach;
      final above =
          box.top >= card.bottom - 0.5 && box.top - card.bottom < reach;
      if (!below && !above) continue;
      final left = math.max(box.left, card.left + 14);
      final right = math.min(box.right, card.right - 14);
      if (right <= left) continue;
      final band =
          (below
                  ? Rect.fromLTRB(left, card.top - 1, right, card.top + 9)
                  : Rect.fromLTRB(
                      left,
                      card.bottom - 9,
                      right,
                      card.bottom + 1,
                    ))
              // On the screen, not under the phone's bars.
              .intersect(
                Rect.fromLTRB(
                  0,
                  phone.top,
                  phone.width,
                  phone.height - phone.bottom,
                ),
              );
      if (band.isEmpty) continue;
      final hits = pixels.count(band, ink, _cardColor(node));
      if (hits >= 2) {
        problems.add(
          '"${said(p)}" draws over the card of $id ($hits of its pixels in '
          "the card's ${below ? 'top' : 'bottom'} edge)",
        );
      }
    }
  }
  if (!atEnd) return;
  await scrollAllToEnd(tester, phone);
  final floor = _floor(tester, phone);
  final bars = find.byType(AppNavBar);
  for (final t in texts.evaluate()) {
    final p = t.renderObject;
    if (p is! RenderParagraph || !p.hasSize || !visible(p)) continue;
    if (said(p).isEmpty) continue;
    if (find
        .descendant(of: bars, matching: find.byElementPredicate((e) => e == t))
        .evaluate()
        .isNotEmpty) {
      continue;
    }
    final r = _rect(p);
    if (r.top >= screen.bottom + 400) continue;
    if (r.bottom > floor + slack && r.top < screen.bottom) {
      problems.add(
        '"${said(p)}" is cut off at the bottom: down to ${r.bottom.toStringAsFixed(1)}, under the bar at ${floor.toStringAsFixed(1)}',
      );
    }
  }
}

/// The colour of the card of [node] (its background, else white).
Color _cardColor(Element node) {
  Color? found;
  void look(Element e) {
    if (found != null) return;
    final w = e.widget;
    if (w is DecoratedBox && w.decoration is BoxDecoration) {
      final c = (w.decoration as BoxDecoration).color;
      if (c != null) {
        found = c;
        return;
      }
    }
    e.visitChildElements(look);
  }

  node.visitChildElements(look);
  return found ?? const Color(0xFFFFFFFF);
}

/// The screen as drawn, one pixel a point.
class _Screen {
  _Screen(this.width, this.height, this.rgba);
  final int width;
  final int height;
  final ByteData rgba;

  /// How many points in [band] are nearer [ink] than [paper], and near it.
  int count(Rect band, Color ink, Color paper) {
    double far(int i, Color c) {
      final r = rgba.getUint8(i) - (c.r * 255);
      final g = rgba.getUint8(i + 1) - (c.g * 255);
      final b = rgba.getUint8(i + 2) - (c.b * 255);
      return math.sqrt(r * r + g * g + b * b);
    }

    var n = 0;
    for (var y = band.top.ceil(); y < band.bottom.floor(); y++) {
      if (y < 0 || y >= height) continue;
      for (var x = band.left.ceil(); x < band.right.floor(); x++) {
        if (x < 0 || x >= width) continue;
        final i = (y * width + x) * 4;
        final toInk = far(i, ink);
        if (toInk < 90 && toInk < far(i, paper) / 2) n++;
      }
    }
    return n;
  }
}

Future<_Screen> _pixels(WidgetTester tester) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(shotKey),
  );
  return (await tester.runAsync(() async {
    final image = await boundary.toImage();
    final data = await image.toByteData();
    final screen = _Screen(image.width, image.height, data!);
    image.dispose();
    return screen;
  }))!;
}
