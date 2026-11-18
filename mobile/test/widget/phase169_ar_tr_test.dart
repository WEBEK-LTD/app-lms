import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/generated/build_config.g.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/format/text_case.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/l10n/vertical_wording.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';

import 'dart:convert';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 169 Arabic and Turkish in the flower shop's apps (Leqaa's looks, Kech
/// Flora): the shared screens' words follow the app's kind, not an
/// academy's; capitals as the language writes them (Turkish İ); the card's
/// beginnings in the customer's language.
void main() {
  group('169.2 capitals and small letters as the language writes them', () {
    test('Turkish and Azeri keep the dotted İ and the dotless I', () {
      expect(upperIn('aşk için', 'tr'), 'AŞK İÇİN');
      expect(upperIn('ışık', 'tr'), 'IŞIK');
      expect(upperIn('istanbul', 'az'), 'İSTANBUL');
      expect(upperIn('aşk için', 'tr_TR'), 'AŞK İÇİN');
      expect(lowerIn('IŞIK İZMİR', 'tr'), 'ışık izmir');
      expect(lowerIn('İSTANBUL', 'az'), 'istanbul');
    });

    test('English and Arabic as before; a capital İ is a plain i', () {
      expect(upperIn('aşk için', 'en'), 'AŞK IÇIN');
      expect(upperIn('with love', 'en'), 'WITH LOVE');
      expect(upperIn('مع الحب', 'ar'), 'مع الحب');
      expect(lowerIn('LIGHT', 'en'), 'light');
      expect(lowerIn('İstanbul', 'en'), 'istanbul');
      expect(dottedILanguage('tr'), isTrue);
      expect(dottedILanguage('en'), isFalse);
    });

    test('without a language, the app\'s', () {
      addTearDown(() => setCurrentLanguage('en'));
      setCurrentLanguage('tr');
      expect(upperIn('için'), 'İÇİN');
      setCurrentLanguage('en');
      expect(upperIn('için'), 'IÇIN');
    });

    for (final (language, kicker) in [('tr', 'AŞK İÇİN'), ('en', 'AŞK IÇIN')]) {
      testWidgets('a widget\'s capitals in $language', (tester) async {
        await tester.pumpWidget(
          Localizations(
            locale: Locale(language),
            delegates: appLocalizationsDelegates(),
            child: Builder(
              builder: (context) => Text(
                'aşk için'.toUpperCaseIn(context),
                textDirection: TextDirection.ltr,
              ),
            ),
          ),
        );
        expect(find.text(kicker), findsOneWidget);
      });
    }

    testWidgets('a Studio element in capitals in Turkish (the kicker)', (
      tester,
    ) async {
      final app = TestApp(
        appType: AppType.store,
        api:
            FakeApi(
                config: {
                  ...configJson(lms: null, languages: languagesJson()),
                  'store': storeConfigJson(),
                },
              )
              ..navigation = navigationJson()
              ..pages = {'home': studioKickerPage()},
        signedIn: true,
        preferences: const {'settings.language': 'tr'},
      );
      await app.pump(tester);
      await TestApp.settle(tester, 10);
      expect(find.text('AŞK İÇİN'), findsOneWidget);
      expect(find.text('AŞK IÇIN'), findsNothing);
    });
  });

  group('169.1 the shared screens in the app\'s kind\'s words', () {
    // Words of lessons and courses, from the start of a word.
    final learningWords = RegExp(
      r'(^|[\s(])(lesson|course|learn|academy|enrol|teacher|ders|kurs|eğitmen|'
      r'akademi|öğren|الدرس|الدروس|دروس|الدورة|دورة|الأكاديمية|التعلّم|المدرّس)',
    );

    test('the kind from the app type, the business and the gift checkout', () {
      BuildConfigData build(AppType type) =>
          buildConfig.copyWith(appType: type);
      AppConfig config({
        bool gift = false,
        bool look = false,
        String? vertical,
      }) => AppConfig.fromJson({
        ...configJson(lms: null),
        'vertical': ?vertical,
        'store': {...storeConfigJson(), if (gift) 'checkout_mode': 'gift'},
        if (look)
          'screens': {
            'checkout': {'look': 'gift'},
          },
      });
      expect(appKindOf(build(AppType.lms), null), AppKind.courses);
      expect(appKindOf(build(AppType.store), config()), AppKind.store);
      expect(
        appKindOf(build(AppType.store), config(gift: true)),
        AppKind.flowers,
      );
      expect(
        appKindOf(build(AppType.store), config(look: true)),
        AppKind.flowers,
      );
      expect(
        appKindOf(build(AppType.store), config(vertical: 'restaurant')),
        AppKind.food,
      );
      expect(appKindOf(build(AppType.booking), null), AppKind.bookings);
      expect(appKindOf(build(AppType.school), null), AppKind.school);
      expect(appKindOf(build(AppType.travel), null), AppKind.travel);
    });

    for (final language in ['en', 'ar', 'tr']) {
      test('every kind has its own words in $language', () {
        final l10n = lookupAppLocalizations(Locale(language));
        for (final kind in AppKind.values) {
          final w = VerticalWording(l10n, null, kind: kind);
          final texts = [
            w.noNotificationsMessage,
            w.updateRequiredMessage(language == 'ar' ? 'لقاء' : 'Kech Flora'),
            w.deleteAccountMessage,
            w.noAccountForNumber,
            w.fileInAppOnlyMessage,
          ];
          for (final text in texts) {
            expect(text.trim(), isNotEmpty);
            if (language == 'ar') {
              expect(text, isNot(matches(RegExp('[A-Za-z]{3,}(?<!PDF)'))));
            }
            if (!w.isLearning) {
              expect(
                lowerIn(text, language),
                isNot(matches(learningWords)),
                reason: '$kind in $language: "$text"',
              );
            }
          }
        }
        // An academy keeps its words.
        expect(
          VerticalWording(l10n, null).noNotificationsMessage,
          l10n.noNotificationsMessage,
        );
      });
    }

    for (final (language, words) in [
      ('en', 'orders and their delivery'),
      ('ar', 'تحديثات طلباتك وتوصيلها'),
      ('tr', 'teslimatlarıyla'),
    ]) {
      testWidgets('a flower shop\'s empty notifications in $language', (
        tester,
      ) async {
        final api =
            FakeApi(
                config: {
                  ...configJson(lms: null, languages: languagesJson()),
                  'store': {...storeConfigJson(), 'checkout_mode': 'gift'},
                },
              )
              ..pages = {'home': appPageJson(blocks: [])}
              ..notifications = [];
        final app = TestApp(
          appType: AppType.store,
          signedIn: true,
          api: api,
          preferences: {'settings.language': language},
        );
        await app.pump(tester);
        GoRouter.of(tester.element(find.byType(Scaffold).first))
            .push(Paths.notifications);
        await TestApp.settle(tester, 10);
        expect(find.textContaining(words), findsOneWidget);
        expect(
          find.textContaining(
            RegExp(r'\blessons?\b|الدروس|\bders', caseSensitive: false),
          ),
          findsNothing,
        );
      });
    }
  });

  group('169.3 the card\'s beginnings in the customer\'s language', () {
    test('reads them by language; the main ones for the others', () {
      final rules = GiftMessageRules.fromJson({
        'enabled': true,
        'max_length': 300,
        'starters': ['Happy birthday!', 'Eid Mubarak!'],
        'starters_by_language': {
          'ar': ['عيد ميلاد سعيد!', ' ', 'عيد مبارك!'],
          'tr': <String>[],
          'fr': 'nope',
        },
      });
      expect(rules.startersIn('ar'), ['عيد ميلاد سعيد!', 'عيد مبارك!']);
      expect(rules.startersIn('tr'), ['Happy birthday!', 'Eid Mubarak!']);
      expect(rules.startersIn('en'), ['Happy birthday!', 'Eid Mubarak!']);
      expect(rules.startersByLanguage.keys, ['ar']);
    });

    test('an older config without them: the main ones', () {
      final rules = GiftMessageRules.fromJson({
        'enabled': true,
        'max_length': 300,
        'starters': ['With love'],
      });
      expect(rules.startersIn('tr'), ['With love']);
    });
  });

  group('169.4 the flower shop\'s screens in Arabic and Turkish', () {
    // The gift checkout's fee is a delivery to the recipient, not shipping
    // ("Kargo", "الشحن"); a standard shop keeps its shipping.
    for (final (language, gift, label) in [
      ('tr', true, 'Teslimat ücreti · Kahire'),
      ('ar', true, 'رسوم التوصيل · Kahire'),
      ('en', true, 'Delivery fee · Kahire'),
      ('tr', false, 'Kargo · Kahire'),
    ]) {
      testWidgets('the cart\'s fee in $language${gift ? ' (gift)' : ''}', (
        tester,
      ) async {
        tester.view
          ..physicalSize = const Size(1080, 4800)
          ..devicePixelRatio = 3;
        addTearDown(tester.view.reset);
        final api =
            FakeApi(
                config: {
                  ...configJson(lms: null, languages: languagesJson()),
                  'store': {
                    ...storeConfigJson(),
                    if (gift) 'checkout_mode': 'gift',
                  },
                },
              )
              ..pages = {'home': appPageJson(blocks: [])}
              ..cartQuote = {
                ...cartQuoteJson(),
                'shipping': '₺95.00',
                'delivery_zone': 'Kahire',
              };
        final app = TestApp(
          appType: AppType.store,
          signedIn: true,
          api: api,
          preferences: {
            'settings.language': language,
            CartController.storageKey: jsonEncode([
              const CartItem(
                productId: 21,
                quantity: 2,
                name: 'Sunflower Basket',
                price: '₺200.00',
                maxQuantity: 5,
              ).toJson(),
            ]),
          },
        );
        await app.pump(tester);
        GoRouter.of(tester.element(find.byType(Scaffold).first))
            .push(Paths.cart);
        await TestApp.settle(tester, 10);
        final fee = find.text(label);
        await tester.scrollUntilVisible(
          fee,
          300,
          scrollable: find.byType(Scrollable).first,
        );
        expect(fee, findsOneWidget);
      });
    }
  });
}

/// A Studio home page with a kicker in capitals (Leqaa's hero).
Map<String, dynamic> studioKickerPage() => {
  ...appPageJson(blocks: []),
  'studio': {
    'body': {
      'id': 'root',
      'type': 'column',
      'children': [
        {
          'id': 'kicker',
          'type': 'text',
          'text': 'aşk için',
          'font': {'uppercase': true},
        },
      ],
    },
  },
};
