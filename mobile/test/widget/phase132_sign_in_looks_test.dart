import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/widgets/buttons.dart';
import 'package:yallapp/modules/shared/auth/sign_in_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 132.6–132.7 Every option of Studio › Screens' sign-in changes what the
/// app draws: the look (the system screens' look, or sign-in's own classic,
/// photo, card, minimal or premium) on sign-in, the code screen and a new
/// account; the words, the logo and the photo; and "Not now" (and the way
/// back) leaves sign-in in every look, by day, by night and right to left.
void main() {
  setUp(() {
    final binding = TestWidgetsFlutterBinding.ensureInitialized();
    binding.platformDispatcher.views.first
      ..physicalSize = const Size(1170, 2532)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  const photo = 'https://yallapp.test/media/garden.jpg';

  /// A Studio project with a home page, an account tab and [screens].
  FakeApi studio(Map<String, dynamic>? screens, {bool signup = false}) =>
      FakeApi(
          config: {
            ...configJson(languages: languagesJson()),
            'screens': ?screens,
          },
          verifyResult: signup
              ? {
                  'signup_required': true,
                  'signup_token': 'signup-1',
                  'fields': ['name'],
                }
              : null,
        )
        ..navigation = navigationJson(
          tabs: [
            navTabJson('home', 'Home', 'home', {
              'type': 'page',
              'page_slug': 'home',
            }),
            navTabJson('account', 'Account', 'person', {
              'type': 'screen',
              'screen': 'account',
            }),
          ],
        )
        ..pages = {
          'home': {
            ...appPageJson(blocks: []),
            'studio': {
              'header': {'type': 'title'},
              'body': {
                'id': 'root',
                'type': 'column',
                'children': [
                  {'id': 'hello', 'type': 'text', 'text': 'Studio home'},
                ],
              },
            },
          },
        };

  Map<String, dynamic> own(String style, {Map<String, dynamic>? extra}) => {
    'sign_in': {
      'style': style,
      'image_url': photo,
      'title': {'en': 'Fresh flowers, today', 'ar': 'ورود طازجة اليوم'},
      'subtitle': {'en': 'Sign in to send a bouquet.'},
      'show_logo': true,
    },
    ...?extra,
  };

  Map<String, dynamic> system(String look, {Map<String, String>? screens}) => {
    'sign_in': {
      'style': 'card',
      'image_url': photo,
      'title': {'en': 'Fresh flowers, today', 'ar': 'ورود طازجة اليوم'},
      'show_logo': true,
    },
    'system': {'look': look, 'screens': ?screens},
  };

  Future<TestApp> open(
    WidgetTester tester,
    FakeApi api, {
    bool dark = false,
    String language = 'en',
    bool guest = false,
  }) async {
    final app = TestApp(
      api: api,
      guest: guest,
      preferences: {
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    return app;
  }

  String location(TestApp app) => app.container
      .read(appRouterProvider)
      .routerDelegate
      .currentConfiguration
      .uri
      .toString();

  const modes = [(false, 'en'), (true, 'en'), (false, 'ar')];
  String named(bool dark, String language) =>
      '${dark ? 'dark' : 'light'}${language == 'ar' ? ', right to left' : ''}';

  /// Each look and the key of the screen it draws: sign-in, then the code
  /// screen and a new account.
  final looks = <String, (Map<String, dynamic>?, String?, String?)>{
    'classic (the app\'s own)': (null, null, null),
    'own classic': (own('classic'), null, null),
    'own photo': (own('photo'), 'sign-in-photo-panel', 'auth-look-photo'),
    'own card': (own('card'), 'sign-in-card', 'auth-look-card'),
    'own minimal': (own('minimal'), null, 'auth-look-minimal'),
    'own premium': (
      own('premium'),
      'sign-in-premium-card',
      'auth-look-premium',
    ),
    for (final look in ['large', 'glass', 'photo', 'brand', 'petal'])
      'system $look': (system(look), 'chrome-auth-$look', 'chrome-auth-$look'),
    // The owner gave sign-in its own look over the system screens' look.
    'system glass, sign-in its own card': (
      system('glass', screens: {'sign_in': 'classic', 'code': 'classic'}),
      'sign-in-card',
      'auth-look-card',
    ),
  };

  Finder notNow() => find.byWidgetPredicate(
    (w) =>
        w.key == const ValueKey('sign-in-not-now') ||
        w.key == const ValueKey('chrome-not-now') ||
        w.key == const ValueKey('premium-not-now'),
  );

  group('132.7 "Not now" leaves sign-in', () {
    for (final MapEntry(key: name, value: (screens, _, _)) in looks.entries) {
      for (final (dark, language) in modes) {
        testWidgets('$name, ${named(dark, language)}', (tester) async {
          final app = await open(
            tester,
            studio(screens),
            dark: dark,
            language: language,
          );
          expect(location(app), startsWith('/sign-in'));
          expect(notNow(), findsOneWidget);
          await tester.tap(notNow());
          await TestApp.settle(tester, 20);
          expect(location(app), isNot(startsWith('/sign-in')));
          expect(find.byType(SignInScreen), findsNothing);
          expect(find.text('Studio home'), findsOneWidget);
        });
      }
    }

    for (final MapEntry(key: name, value: (screens, _, _)) in looks.entries) {
      testWidgets('opened over a page, its way back: $name', (tester) async {
        final app = await open(tester, studio(screens), guest: true);
        expect(find.text('Studio home'), findsOneWidget);
        app.container.read(appRouterProvider).push('/sign-in');
        await TestApp.settle(tester, 20);
        expect(find.byType(SignInScreen), findsOneWidget);
        final back = find.byWidgetPredicate(
          (w) => w is AppBackButton || w.key == const ValueKey('chrome-back'),
        );
        expect(back, findsOneWidget);
        await tester.tap(back);
        await TestApp.settle(tester, 20);
        expect(find.byType(SignInScreen), findsNothing);
        expect(find.text('Studio home'), findsOneWidget);
      });
    }
  });

  group('132.6 sign-in, the code and a new account in the chosen look', () {
    for (final MapEntry(key: name, value: (screens, signInKey, nextKey))
        in looks.entries) {
      for (final (dark, language) in modes) {
        testWidgets('$name, ${named(dark, language)}', (tester) async {
          await open(
            tester,
            studio(screens, signup: true),
            dark: dark,
            language: language,
          );
          final keys = {
            for (final l in looks.values) ...[?l.$2, ?l.$3],
          };
          bool shown(String key) =>
              find.byKey(ValueKey(key)).evaluate().isNotEmpty;
          // Sign-in.
          if (signInKey != null) expect(shown(signInKey), isTrue);
          for (final other in keys.where((k) => k != signInKey)) {
            expect(shown(other), isFalse, reason: '$other on sign-in');
          }
          if (screens != null) {
            expect(
              find.text(
                language == 'ar' ? 'ورود طازجة اليوم' : 'Fresh flowers, today',
              ),
              findsOneWidget,
            );
          }
          // The code screen.
          await tester.enterText(find.byType(TextField).first, '5321234567');
          await tester.pump();
          await tester.tap(find.byType(PrimaryButton).first);
          await TestApp.settle(tester, 20);
          expect(find.byType(SignInScreen), findsNothing);
          if (nextKey != null) expect(shown(nextKey), isTrue);
          for (final other in keys.where((k) => k != nextKey)) {
            expect(shown(other), isFalse, reason: '$other on the code');
          }
          // A new account.
          await tester.enterText(find.byType(TextField).first, '123456');
          await TestApp.settle(tester, 20);
          expect(find.byType(TextFormField), findsOneWidget);
          if (nextKey != null) expect(shown(nextKey), isTrue);
          for (final other in keys.where((k) => k != nextKey)) {
            expect(shown(other), isFalse, reason: '$other on sign-up');
          }
        });
      }
    }
  });

  group('132.6 the words, the logo and the photo', () {
    testWidgets('the logo goes, and comes back', (tester) async {
      final on = own('classic');
      await open(tester, studio(on));
      expect(find.byType(SignInLogo), findsOneWidget);
      final off = own('classic');
      (off['sign_in'] as Map<String, dynamic>)['show_logo'] = false;
      await open(tester, studio(off));
      expect(find.byType(SignInLogo), findsNothing);
    });

    testWidgets('the minimal look leaves the name out', (tester) async {
      await open(tester, studio(own('classic')));
      expect(find.text('Your Academy'), findsOneWidget);
      await open(tester, studio(own('minimal')));
      expect(find.text('Your Academy'), findsNothing);
      expect(find.text('Fresh flowers, today'), findsOneWidget);
      expect(find.text('Sign in to send a bouquet.'), findsOneWidget);
    });

    testWidgets('the photo look\'s photo on the code screen too', (
      tester,
    ) async {
      await open(tester, studio(system('photo')));
      final network = find.byWidgetPredicate(
        (w) => w.runtimeType.toString() == 'AppNetworkImage',
      );
      expect(network, findsWidgets);
      await tester.enterText(find.byType(TextField).first, '5321234567');
      await tester.pump();
      await tester.tap(find.byType(PrimaryButton).first);
      await TestApp.settle(tester, 20);
      expect(find.byKey(const ValueKey('chrome-auth-photo')), findsOneWidget);
      expect(network, findsWidgets, reason: 'the photo, not the gradient');
    });
  });
}
