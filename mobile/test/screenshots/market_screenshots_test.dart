/// 115 A picture of the marketplace home, built from Studio `market`
/// elements with the sample marketplace, to review the look. Skipped unless
/// run with a folder for the picture:
///
///   flutter test test/screenshots/market_screenshots_test.dart \
///     --dart-define=YALLAPP_SHOTS_OUT=/path/out \
///     [--dart-define=YALLAPP_LANG=ar] [--dart-define=YALLAPP_DARK=true]
///
/// The pictures are the designs' drawn ones (platform/web/public/design-pictures).
@Tags(['screenshots'])
library;

import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/modules/market/data/market_samples.dart';
import 'package:yallapp/modules/shared/pages/studio_page.dart';

import '../support/market_fixtures.dart';
import 'support/shot.dart';

const _out = String.fromEnvironment('YALLAPP_SHOTS_OUT');
const _lang = String.fromEnvironment('YALLAPP_LANG', defaultValue: 'en');
const _dark = bool.fromEnvironment('YALLAPP_DARK');
const _pictures = String.fromEnvironment(
  'YALLAPP_PICTURES',
  defaultValue: '../platform/web/public/design-pictures',
);

final _images = <String, ui.Image>{};

void main() {
  final enabled = _out.isNotEmpty;

  setUpAll(() async {
    if (!enabled) return;
    await loadAppFonts();
    final folder = Directory(_pictures);
    for (final file in folder.listSync().whereType<File>()) {
      if (!file.path.endsWith('.png')) continue;
      final codec = await ui.instantiateImageCodec(file.readAsBytesSync());
      final frame = await codec.getNextFrame();
      _images[MarketSamples.picture(file.uri.pathSegments.last)] = frame.image;
    }
  });

  testWidgets('market home $_lang', skip: !enabled, (tester) async {
    usePhone(tester);
    final cache = PaintingBinding.instance.imageCache
      ..maximumSizeBytes = 1 << 30
      ..maximumSize = 2000;
    for (final MapEntry(:key, :value) in _images.entries) {
      cache.putIfAbsent(
        NetworkImage(key),
        () => OneFrameImageStreamCompleter(
          SynchronousFuture(ImageInfo(image: value.clone())),
        ),
      );
    }
    final page = StudioPage.tryParse(homePage())!;
    final theme = buildAppTheme(
      primary: const Color(0xFF0E7C66),
      secondary: const Color(0xFFF2994A),
      brightness: _dark ? Brightness.dark : Brightness.light,
      template: AppTemplate.bold,
      fontFamily: 'Plus Jakarta Sans',
    );
    final app = ProviderScope(
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: theme,
        locale: const Locale(_lang),
        supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        home: Scaffold(
          body: StudioPageView(page: page, pageSlug: 'home'),
          bottomNavigationBar: const _TabBar(),
        ),
      ),
    );
    await tester.pumpWidget(
      withStatusBar(app, lightIcons: ValueNotifier(_dark)),
    );
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }
    // The whole page in one picture: the phone as tall as the page.
    final list = find.descendant(
      of: find.byKey(const ValueKey('studio-home')),
      matching: find.byType(Scrollable),
    );
    final extent = tester
        .state<ScrollableState>(list.first)
        .position
        .maxScrollExtent;
    usePhone(tester, size: Size(shotSize.width, shotSize.height + extent));
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }
    final boundary =
        tester.renderObject(find.byKey(shotKey)) as RenderRepaintBoundary;
    await tester.runAsync(() async {
      final image = await boundary.toImage(pixelRatio: 2);
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      final name = 'market-home-$_lang${_dark ? '-dark' : ''}.png';
      Directory(_out).createSync(recursive: true);
      File('$_out/$name').writeAsBytesSync(Uint8List.view(data!.buffer));
    });
  });
}

/// The app's tabs for a marketplace: home, search, orders, club, account.
class _TabBar extends StatelessWidget {
  const _TabBar();

  @override
  Widget build(BuildContext context) => NavigationBar(
    selectedIndex: 0,
    height: 66,
    destinations: const [
      NavigationDestination(
        icon: Icon(Symbols.home_rounded, fill: 1),
        label: 'Home',
      ),
      NavigationDestination(
        icon: Icon(Symbols.search_rounded),
        label: 'Search',
      ),
      NavigationDestination(
        icon: Icon(Symbols.receipt_long_rounded),
        label: 'Orders',
      ),
      NavigationDestination(
        icon: Icon(Symbols.workspace_premium_rounded),
        label: 'Club',
      ),
      NavigationDestination(
        icon: Icon(Symbols.person_rounded),
        label: 'Account',
      ),
    ],
  );
}
