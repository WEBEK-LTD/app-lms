import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_symbols_icons/symbols.dart';

/// The screenshots are 360 x 780 points at 3x: 1080 x 2340 pixels.
const shotSize = Size(360, 780);
const shotPixelRatio = 3.0;

/// The height of the drawn status bar, also the view's top inset.
const statusBarHeight = 28.0;

/// The gesture bar at the bottom of a modern phone.
const gestureBarHeight = 12.0;

/// Loads every font the app bundles (FontManifest.json), so text and
/// Material Symbols render as on a phone instead of in the test font.
Future<void> loadAppFonts() async {
  final manifest =
      json.decode(await rootBundle.loadString('FontManifest.json')) as List;
  for (final entry in manifest.cast<Map<String, dynamic>>()) {
    final loader = FontLoader(entry['family'] as String);
    for (final font in (entry['fonts'] as List).cast<Map<String, dynamic>>()) {
      loader.addFont(rootBundle.load(font['asset'] as String));
    }
    await loader.load();
  }
}

/// Sizes the test view like a 360 x 780 phone with a status bar and a
/// gesture bar.
void usePhone(WidgetTester tester, {Size size = shotSize}) {
  tester.view
    ..physicalSize = size * shotPixelRatio
    ..devicePixelRatio = shotPixelRatio
    ..padding = const FakeViewPadding(
      top: statusBarHeight * shotPixelRatio,
      bottom: gestureBarHeight * shotPixelRatio,
    )
    ..viewPadding = const FakeViewPadding(
      top: statusBarHeight * shotPixelRatio,
      bottom: gestureBarHeight * shotPixelRatio,
    );
  addTearDown(tester.view.reset);
}

/// The key of the boundary the screenshot is taken from.
const shotKey = ValueKey('website-screenshot');

/// Draws a phone's status bar (time, signal, Wi-Fi, battery) over the app,
/// light or dark as [lightIcons] says (the app's status bar style).
Widget withStatusBar(Widget app, {required ValueListenable<bool> lightIcons}) =>
    ValueListenableBuilder<bool>(
      valueListenable: lightIcons,
      child: app,
      builder: (context, light, app) => _withStatusBar(app!, light: light),
    );

/// Whether the app asks for light status bar icons where the bar is.
bool appWantsLightStatusBar(WidgetTester tester) {
  final view = tester.binding.renderViews.first;
  // The same lookup RenderView makes to set the real status bar.
  // ignore: invalid_use_of_protected_member
  final style = view.layer?.find<SystemUiOverlayStyle>(
    Offset(view.size.width / 2, statusBarHeight / 2),
  );
  return style?.statusBarIconBrightness == Brightness.light;
}

Widget _withStatusBar(Widget app, {required bool light}) {
  final color = light ? const Color(0xFFF4EFE6) : const Color(0xFF0E0D24);
  return RepaintBoundary(
    key: shotKey,
    child: Directionality(
      textDirection: TextDirection.ltr,
      child: Stack(
        children: [
          Positioned.fill(child: app),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: statusBarHeight,
            child: IgnorePointer(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(22, 4, 18, 0),
                child: Row(
                  children: [
                    Text(
                      '9:41',
                      style: TextStyle(
                        fontFamily: 'Manrope',
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: color,
                      ),
                    ),
                    const Spacer(),
                    for (final icon in const [
                      Symbols.signal_cellular_4_bar_rounded,
                      Symbols.wifi_rounded,
                      Symbols.battery_full_rounded,
                    ])
                      Padding(
                        padding: const EdgeInsets.only(left: 4),
                        child: Icon(icon, size: 16, color: color, fill: 1),
                      ),
                  ],
                ),
              ),
            ),
          ),
          // The gesture bar.
          Positioned(
            left: 0,
            right: 0,
            bottom: 4,
            child: IgnorePointer(
              child: Center(
                child: Container(
                  width: 108,
                  height: 4,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.85),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}
