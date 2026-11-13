import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/launch/launch_colors.dart';
import 'package:yallapp/core/launch/launch_screen.dart';
import 'package:yallapp/core/launch/launch_store.dart';
import 'package:yallapp/core/theme/app_look.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

const _navy = Color(0xFF1D2B4F);
const _gold = Color(0xFFB8893A);

/// A `/config` that waits until the test lets it answer, so the launch
/// screen stays on.
class _SlowApi extends FakeApi {
  _SlowApi();

  final answer = Completer<void>();

  @override
  Future<AppConfig> getConfig() async {
    await answer.future;
    return super.getConfig();
  }
}

Widget _host(
  Widget child, {
  bool dark = false,
  String language = 'en',
  bool still = false,
}) {
  final look = AppLook.resolve(testBuild, null);
  return MaterialApp(
    theme: look.theme(Brightness.light),
    darkTheme: look.theme(Brightness.dark),
    themeMode: dark ? ThemeMode.dark : ThemeMode.light,
    locale: Locale(language),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    builder: (context, app) => MediaQuery(
      data: MediaQuery.of(context).copyWith(disableAnimations: still),
      child: app!,
    ),
    home: child,
  );
}

LaunchScreen _screen(LaunchLook look, {String? logoUrl}) => LaunchScreen(
  look: look,
  appName: 'Ufuq Academy',
  main: _navy,
  second: _gold,
  logoUrl: logoUrl,
);

void _phone(WidgetTester tester) {
  tester.view
    ..physicalSize = const Size(1170, 2532)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);
}

/// 124.15 Five launch screens chosen and made the owner's own in Studio.
void main() {
  group('Config.screens.launch', () {
    test('each look has its own loading sign and background', () {
      for (final (look, loader, background) in [
        ('signature', LaunchLoader.bar, LaunchBackgroundType.color),
        ('cinema', LaunchLoader.bar, LaunchBackgroundType.photo),
        ('aurora', LaunchLoader.dots, LaunchBackgroundType.color),
        ('editorial', LaunchLoader.steps, LaunchBackgroundType.photo),
        ('monogram', LaunchLoader.ring, LaunchBackgroundType.color),
      ]) {
        final launch = LaunchLook.fromJson({'look': look})!;
        expect(launch.loader, loader, reason: look);
        expect(launch.background.type, background, reason: look);
        expect(launch.logoSize, LaunchLogoSize.l);
        expect(launch.logoShape, LaunchLogoShape.rounded);
        expect(launch.theme, LaunchTheme.system);
      }
      expect(LaunchLook.fromJson('nope'), isNull);
    });

    test('reads the owner\'s choices and keeps them as they came', () {
      final json = {
        'look': 'cinema',
        'background': {
          'type': 'gradient',
          'from': '#112233',
          'to': '#aabbcc',
          'direction': 'radial',
          'text_color': '#FFFFFF',
        },
        'background_dark': {
          'type': 'photo',
          'image_url': 'https://yallapp.test/m/night.jpg',
          'overlay': 62,
        },
        'logo': 'picture',
        'logo_url': 'https://yallapp.test/m/mark.png',
        'logo_size': 'xl',
        'logo_shape': 'as_is',
        'title': {'en': 'Ufuq', 'ar': 'أفق'},
        'subtitle': {'en': 'Learn what changes your path.'},
        'loader': 'none',
        'theme': 'dark',
        'main_color': '#1D2B4F',
        'second_color': '#B8893A',
      };
      final launch = LaunchLook.fromJson(json)!;
      expect(launch.background.from, '#112233');
      expect(launch.background.to, '#AABBCC');
      expect(launch.background.direction, LaunchDirection.radial);
      expect(launch.backgroundDark!.overlay, 62);
      expect(launch.logoShape, LaunchLogoShape.asIs);
      expect(launch.logoSize, LaunchLogoSize.xl);
      expect(launch.loader, LaunchLoader.none);
      expect(launch.theme, LaunchTheme.dark);
      // What the phone keeps reads back the same.
      final again = LaunchLook.fromJson(
        jsonDecode(jsonEncode(launch.toJson())),
      )!;
      expect(again.toJson(), launch.toJson());
      expect(again.toJson()['logo_shape'], 'as_is');
    });

    test('unknown or unsafe values become the look\'s own', () {
      final launch = LaunchLook.fromJson({
        'look': 'editorial',
        'background': {
          'type': 'video',
          'color': 'red',
          'image_url': 'http://insecure.test/a.jpg',
          'overlay': 95,
        },
        'logo': 'picture',
        'logo_url': 'javascript:alert(1)',
        'loader': 'spinner',
        'title': {'en': 'x' * 60},
      })!;
      expect(launch.background.type, LaunchBackgroundType.photo);
      expect(launch.background.color, isNull);
      expect(launch.background.imageUrl, isNull);
      expect(launch.background.overlay, isNull);
      expect(launch.logo, LaunchLogo.logo);
      expect(launch.loader, LaunchLoader.steps);
      expect(launch.title['en']!.length, 40);
    });

    test('served with the other screens', () {
      final screens = StudioScreens.fromJson({
        'launch': {'look': 'monogram'},
      })!;
      expect(screens.launch!.look, LaunchStyle.monogram);
      expect(StudioScreens.fromJson(<String, dynamic>{})!.launch, isNull);
    });
  });

  group('the colours', () {
    test('dark words on a light background, light on a dark one', () {
      final sig = LaunchLook.fromJson({'look': 'signature'})!;
      final light = LaunchColors.resolve(
        sig,
        main: _navy,
        second: _gold,
        dark: false,
      );
      expect(light.onDark, isFalse);
      expect(light.accent, _gold);
      expect(light.tile, LaunchTile.brand);
      // The initials on the navy tile in the lighter gold.
      expect(light.onTile, glow(_gold));
      final dark = LaunchColors.resolve(
        sig,
        main: _navy,
        second: _gold,
        dark: true,
      );
      expect(dark.onDark, isTrue);
      expect(dark.tile, LaunchTile.card);
      // The second colour lighter on the dark page.
      expect(
        dark.accent.computeLuminance(),
        greaterThan(_gold.computeLuminance()),
      );
      // Monogram: the main colour in light, light words on it.
      final mono = LaunchColors.resolve(
        LaunchLook.fromJson({'look': 'monogram'})!,
        main: _navy,
        second: _gold,
        dark: false,
      );
      expect((mono.screen as LaunchColorFill).color, _navy);
      expect(mono.onDark, isTrue);
      // The owner's light colour: dark words; their own words' colour wins.
      LaunchColors of(Map<String, dynamic> bg) => LaunchColors.resolve(
        LaunchLook.fromJson({'look': 'aurora', 'background': bg})!,
        main: _navy,
        second: _gold,
        dark: false,
      );
      expect(of({'type': 'color', 'color': '#FFF4D6'}).onDark, isFalse);
      expect(of({'type': 'color', 'color': '#202020'}).onDark, isTrue);
      expect(
        of({'type': 'color', 'color': '#202020', 'text_color': '#FFCC00'}).text,
        const Color(0xFFFFCC00),
      );
      // A photo made darker reads as dark.
      expect(
        of({
          'type': 'photo',
          'image_url': 'https://a.test/p.jpg',
          'overlay': 40,
        }).onDark,
        isTrue,
      );
    });

    test('Cinema\'s photo in its frame, the gradient until there is one', () {
      final cinema = LaunchLook.fromJson({
        'look': 'cinema',
        'background': {'type': 'photo', 'image_url': 'https://a.test/p.jpg'},
      })!;
      final light = LaunchColors.resolve(
        cinema,
        main: _navy,
        second: _gold,
        dark: false,
      );
      expect((light.picture! as LaunchPhotoFill).overlay, 0);
      expect(light.onDark, isFalse);
      final dark = LaunchColors.resolve(
        cinema,
        main: _navy,
        second: _gold,
        dark: true,
      );
      expect((dark.picture! as LaunchPhotoFill).overlay, 25);
      final none = LaunchColors.resolve(
        LaunchLook.fromJson({'look': 'editorial'})!,
        main: _navy,
        second: _gold,
        dark: false,
      );
      expect(none.picture, isA<LaunchGradientFill>());
    });
  });

  group('the launch screen', () {
    for (final style in LaunchStyle.values) {
      for (final dark in [false, true]) {
        testWidgets('${style.name} in ${dark ? 'dark' : 'light'}', (
          tester,
        ) async {
          _phone(tester);
          final look = LaunchLook.fromJson({
            'look': style.name,
            'subtitle': {'en': 'Learn what changes your path.'},
          })!;
          await tester.pumpWidget(_host(_screen(look), dark: dark));
          await tester.pump(const Duration(milliseconds: 700));
          expect(find.byKey(ValueKey('launch-${style.name}')), findsOneWidget);
          expect(
            find.text(
              style == LaunchStyle.monogram ? 'UFUQ ACADEMY' : 'Ufuq Academy',
            ),
            findsOneWidget,
          );
          expect(find.text('Learn what changes your path.'), findsOneWidget);
          expect(find.byKey(const ValueKey('launch-logo')), findsOneWidget);
          expect(find.bySemanticsLabel('Loading'), findsOneWidget);
          final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
          final light = scaffold.backgroundColor!.computeLuminance() > 0.4;
          // Monogram's light page is the main colour.
          expect(light, !dark && style != LaunchStyle.monogram);
          expect(tester.takeException(), isNull);
          // Still moving.
          expect(tester.binding.hasScheduledFrame, isTrue);
        });
      }
    }

    testWidgets('right to left in Arabic, the owner\'s words', (tester) async {
      _phone(tester);
      final look = LaunchLook.fromJson({
        'look': 'editorial',
        'title': {'en': 'Ufuq', 'ar': 'أكاديمية أفق'},
        'subtitle': {'ar': 'تعلّم ما يغيّر طريقك.'},
      })!;
      await tester.pumpWidget(_host(_screen(look), language: 'ar'));
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('أكاديمية أفق'), findsOneWidget);
      expect(find.text('مرحبًا بكم في'), findsOneWidget);
      final title = tester.getRect(find.text('أكاديمية أفق'));
      final logo = tester.getRect(find.byKey(const ValueKey('launch-logo')));
      // From the right: the logo and the words start at the right edge.
      expect(logo.right, greaterThan(300));
      expect(title.right, closeTo(logo.right + 4, 6));
      expect(
        Directionality.of(tester.element(find.text('أكاديمية أفق'))),
        TextDirection.rtl,
      );
    });

    testWidgets('stands still when the phone asks for less movement', (
      tester,
    ) async {
      _phone(tester);
      for (final style in LaunchStyle.values) {
        await tester.pumpWidget(
          _host(
            _screen(LaunchLook.fromJson({'look': style.name})!),
            still: true,
          ),
        );
        for (var i = 0; i < 3; i++) {
          await tester.pump(const Duration(milliseconds: 300));
        }
        // Nothing left moving: no frame asked for.
        expect(tester.binding.hasScheduledFrame, isFalse, reason: style.name);
        expect(tester.binding.transientCallbackCount, 0, reason: style.name);
        expect(find.bySemanticsLabel('Loading'), findsOneWidget);
      }
    });

    testWidgets(
      'a picture of the owner\'s in each shape and size, and a photo',
      (tester) async {
        _phone(tester);
        for (final style in LaunchStyle.values) {
          for (final shape in ['rounded', 'circle', 'as_is']) {
            for (final size in ['s', 'xl']) {
              await tester.pumpWidget(
                _host(
                  _screen(
                    LaunchLook.fromJson({
                      'look': style.name,
                      'logo': 'picture',
                      'logo_url': 'https://yallapp.test/m/mark.png',
                      'logo_shape': shape,
                      'logo_size': size,
                      'background': {
                        'type': 'photo',
                        'image_url': 'https://yallapp.test/m/photo.jpg',
                        'overlay': 50,
                      },
                    })!,
                  ),
                  dark: size == 'xl',
                ),
              );
              await tester.pump(const Duration(milliseconds: 300));
              expect(
                find.byKey(const ValueKey('launch-logo')),
                findsOneWidget,
                reason: '${style.name} $shape $size',
              );
              expect(find.byType(Image), findsWidgets);
              expect(tester.takeException(), isNull);
            }
          }
        }
      },
    );

    testWidgets('the longest words fit a small phone', (tester) async {
      tester.view
        ..physicalSize = const Size(640, 1136)
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      for (final style in LaunchStyle.values) {
        await tester.pumpWidget(
          _host(
            _screen(
              LaunchLook.fromJson({
                'look': style.name,
                'logo_size': 'xl',
                'title': {'en': 'A long academy name for the small phone'},
                'subtitle': {'en': 'x ' * 40},
              })!,
            ),
          ),
        );
        await tester.pump(const Duration(milliseconds: 300));
        expect(tester.takeException(), isNull, reason: style.name);
      }
    });

    testWidgets('no loading sign still says it is loading', (tester) async {
      _phone(tester);
      await tester.pumpWidget(
        _host(
          _screen(LaunchLook.fromJson({'look': 'cinema', 'loader': 'none'})!),
        ),
      );
      await tester.pump();
      expect(find.bySemanticsLabel('Loading'), findsOneWidget);
    });

    testWidgets('always dark when the owner says so', (tester) async {
      _phone(tester);
      await tester.pumpWidget(
        _host(
          _screen(LaunchLook.fromJson({'look': 'signature', 'theme': 'dark'})!),
        ),
      );
      await tester.pump();
      final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
      expect(scaffold.backgroundColor!.computeLuminance(), lessThan(0.1));
    });
  });

  group('at start', () {
    testWidgets('with nothing kept: Signature with the build\'s name', (
      tester,
    ) async {
      _phone(tester);
      final api = _SlowApi();
      await TestApp(api: api).pump(tester);
      expect(find.byKey(const ValueKey('launch-signature')), findsOneWidget);
      expect(find.text('Your Academy'), findsOneWidget);
      expect(
        tester
            .widget<Semantics>(find.byKey(const ValueKey('launch-loader')))
            .properties
            .label,
        'Loading',
      );
      // The build's splash colour behind it.
      final scaffold = tester.widget<Scaffold>(
        find.byKey(const ValueKey('launch-signature')),
      );
      expect(scaffold.backgroundColor, Color(testBuild.splashColor));
      api.answer.complete();
      await TestApp.settle(tester);
    });

    testWidgets('the look kept from the last start', (tester) async {
      _phone(tester);
      final api = _SlowApi();
      final kept = KeptLaunch(
        look: LaunchLook.fromJson({
          'look': 'cinema',
          'title': {'en': 'Kept Academy'},
        }),
        main: _navy,
        second: _gold,
      );
      await TestApp(
        api: api,
        preferences: {LaunchStore.key: jsonEncode(kept.toJson())},
      ).pump(tester);
      expect(find.byKey(const ValueKey('launch-cinema')), findsOneWidget);
      expect(find.text('Kept Academy'), findsOneWidget);
      api.answer.complete();
      await TestApp.settle(tester);
    });

    testWidgets('a config that arrives is kept for the next start', (
      tester,
    ) async {
      _phone(tester);
      final config = configJson();
      config['screens'] = {
        'launch': {
          'look': 'aurora',
          'background': {'type': 'color', 'color': '#FFF4D6'},
          'title': {'en': 'Next time'},
        },
      };
      final app = TestApp(api: FakeApi(config: config));
      await app.pump(tester);
      final prefs = await SharedPreferences.getInstance();
      final kept = LaunchStore.read(prefs)!;
      expect(kept.look!.look, LaunchStyle.aurora);
      expect(kept.look!.background.color, '#FFF4D6');
      expect(kept.look!.title, {'en': 'Next time'});
      expect(kept.main, isNotNull);
      // Without one, nothing of the owner's is kept: the Signature look.
      config.remove('screens');
      final again = TestApp(api: FakeApi(config: config));
      await again.pump(tester);
      expect(
        LaunchStore.read(await SharedPreferences.getInstance())!.look,
        isNull,
      );
    });
  });
}
