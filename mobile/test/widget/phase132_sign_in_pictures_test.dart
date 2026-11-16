import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/widgets/buttons.dart';
import 'package:yallapp/core/widgets/common.dart';
import 'package:yallapp/modules/shared/auth/sign_in_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 132.9 Each of sign-in's own looks as Studio › Screens draws it in its
/// picture: Classic the app's own page, Full photo the form on a panel over
/// the photo filling the screen, Photo and card the form on a card under
/// the photo, Minimal the logo and the words in the middle, Premium the
/// welcome over the photo and the button in gold; by day, by night and
/// right to left.
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

  Future<void> open(
    WidgetTester tester,
    String style, {
    bool dark = false,
    String language = 'en',
  }) async {
    final app = TestApp(
      api: FakeApi(
        config: {
          ...configJson(languages: languagesJson()),
          'screens': {
            'sign_in': {
              'style': style,
              'image_url': photo,
              'title': {'en': 'Fresh flowers, today', 'ar': 'ورود طازجة اليوم'},
              'show_logo': true,
            },
          },
        },
      ),
      preferences: {
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    expect(find.byType(SignInScreen), findsOneWidget);
  }

  Finder photoImage() =>
      find.byWidgetPredicate((w) => w is AppNetworkImage && w.url == photo);
  Rect screen(WidgetTester tester) => tester.getRect(find.byType(SignInScreen));

  for (final (dark, language) in [(false, 'en'), (true, 'en'), (false, 'ar')]) {
    final mode =
        '${dark ? 'dark' : 'light'}${language == 'ar' ? ', right to left' : ''}';

    testWidgets('Classic: the app\'s own page, no photo, $mode', (
      tester,
    ) async {
      await open(tester, 'classic', dark: dark, language: language);
      expect(photoImage(), findsNothing);
      // The logo beside the app's name on top, the welcome under it.
      expect(find.byType(SignInLogo), findsOneWidget);
      expect(find.text('Your Academy'), findsOneWidget);
      expect(
        find.ancestor(
          of: find.byType(SignInLogo),
          matching: find.byType(Center),
        ),
        findsNothing,
      );
    });

    testWidgets('Full photo: the form over the photo, $mode', (tester) async {
      await open(tester, 'photo', dark: dark, language: language);
      final image = tester.getRect(photoImage());
      final panel = tester.getRect(
        find.byKey(const ValueKey('sign-in-photo-panel')),
      );
      // The photo fills the screen; the form's panel lies on it.
      expect(image.height, closeTo(screen(tester).height, 1));
      expect(image.contains(panel.center), isTrue);
    });

    testWidgets('Photo and card: the card under the photo, $mode', (
      tester,
    ) async {
      await open(tester, 'card', dark: dark, language: language);
      final image = tester.getRect(photoImage());
      final card = tester.getRect(find.byKey(const ValueKey('sign-in-card')));
      // The photo across the top, the card starting below its upper part.
      expect(image.top, closeTo(0, 1));
      expect(image.height, lessThan(screen(tester).height / 2));
      expect(card.top, greaterThan(image.top + image.height / 2));
    });

    testWidgets('Minimal: the logo and the words in the middle, $mode', (
      tester,
    ) async {
      await open(tester, 'minimal', dark: dark, language: language);
      expect(photoImage(), findsNothing);
      expect(
        find.ancestor(
          of: find.byType(SignInLogo),
          matching: find.byType(Center),
        ),
        findsOneWidget,
      );
      final title = tester.widget<Text>(
        find.text(
          language == 'ar' ? 'ورود طازجة اليوم' : 'Fresh flowers, today',
        ),
      );
      expect(title.textAlign, TextAlign.center);
      // No name on top.
      expect(find.text('Your Academy'), findsNothing);
    });

    testWidgets('Premium: the welcome over the photo, the button in gold, '
        '$mode', (tester) async {
      await open(tester, 'premium', dark: dark, language: language);
      expect(photoImage(), findsOneWidget);
      expect(
        find.byKey(const ValueKey('sign-in-premium-card')),
        findsOneWidget,
      );
      expect(
        find.ancestor(
          of: find.byKey(const ValueKey('sign-in-continue')),
          matching: find.byType(GoldButtons),
        ),
        findsOneWidget,
      );
      // The welcome above the card, over the photo.
      final title = tester.getRect(
        find.text(
          language == 'ar' ? 'ورود طازجة اليوم' : 'Fresh flowers, today',
        ),
      );
      final card = tester.getRect(
        find.byKey(const ValueKey('sign-in-premium-card')),
      );
      expect(title.bottom, lessThan(card.top));
    });
  }
}
