import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/format/bidi.dart';
import 'package:yallapp/core/format/dates.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/widgets/buttons.dart';
import 'package:yallapp/l10n/app_localizations_ar.dart';
import 'package:yallapp/l10n/app_localizations_en.dart';
import 'package:yallapp/l10n/app_localizations_tr.dart';
import 'package:yallapp/modules/events/widgets/event_widgets.dart'
    show eventWhen;
import 'package:yallapp/modules/school/widgets/school_widgets.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

const _languages = {
  'default': 'en',
  'available': ['en', 'ar', 'tr'],
};

/// The Arabic-Indic and Persian digits.
final _nativeDigits = RegExp('[\u0660-\u0669\u06F0-\u06F9]');

Widget _host(Widget child, {TextDirection direction = TextDirection.ltr}) =>
    MaterialApp(
      theme: buildAppTheme(
        primary: const Color(0xFF0E0D24),
        brightness: Brightness.light,
        template: AppTemplate.classic,
        fontFamily: 'Bricolage Grotesque',
      ),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Directionality(
        textDirection: direction,
        child: Scaffold(body: child),
      ),
    );

void _phone(WidgetTester tester, Size size) {
  tester.view
    ..physicalSize = size * 2
    ..devicePixelRatio = 2;
  addTearDown(tester.view.reset);
}

/// Runs [body] with the app's strings in [code], then back in English.
T _inLanguage<T>(String code, T Function() body) {
  setCurrentLanguage(code);
  try {
    return body();
  } finally {
    setCurrentLanguage('en');
  }
}

Future<TestApp> _open(
  WidgetTester tester,
  FakeApi api, {
  AppType appType = AppType.lms,
  String language = 'en',
  bool signedIn = true,
  String? go,
  String? push,
}) async {
  final app = TestApp(
    api: api,
    appType: appType,
    signedIn: signedIn,
    guest: !signedIn,
    preferences: {'settings.language': language},
  );
  await app.pump(tester);
  final router = app.container.read(appRouterProvider);
  if (go != null) {
    router.go(go);
    await TestApp.settle(tester, 20);
  }
  if (push != null) {
    router.push(push);
    await TestApp.settle(tester, 20);
  }
  return app;
}

void main() {
  group('110 one kind of digits', () {
    test('dates in Arabic use the digits the prices use', () {
      final day = DateTime(2026, 10, 19, 10, 5);
      _inLanguage('ar', () {
        for (final text in [
          dayLabel(day),
          shortDayLabel(day),
          shortDate(day),
          dayAndTime(day),
          clockTime(day),
          longDate(day),
          monthLabel(day),
        ]) {
          expect(text, isNot(contains(_nativeDigits)), reason: text);
        }
        expect(shortDate(day), contains('19'));
        expect(shortDate(day), contains('2026'));
        expect(dayLabel(day), contains('أكتوبر'));
      });
    });

    test("a day picker's chip has a short weekday in every language", () {
      final wednesday = DateTime(2026, 10, 28);
      expect(chipWeekday(wednesday), 'Wed');
      _inLanguage('ar', () {
        expect(shortWeekday(wednesday), 'الأربعاء');
        expect(chipWeekday(wednesday).characters.length, lessThanOrEqualTo(4));
      });
    });

    test('a time zone is its city', () {
      expect(zoneName('Europe/Istanbul'), 'Istanbul');
      expect(zoneName('America/New_York'), 'New York');
      expect(zoneName('UTC'), 'UTC');
    });
  });

  group('110 text of either direction', () {
    test('isolates only in a right-to-left app', () {
      expect(isolate('12 Main St'), '12 Main St');
      expect(ltrRun('20:30'), '20:30');
      expect(toArrow(), '→');
      _inLanguage('ar', () {
        expect(isolate('12 Main St'), '\u206812 Main St\u2069');
        expect(ltrRun('20:30'), '\u206620:30\u2069');
        expect(toArrow(), '←');
        expect(isolate(''), '');
      });
    });

    test("a name's direction comes from its first letter", () {
      expect(directionOfText('Dr. Kerem Aksoy'), TextDirection.ltr);
      expect(directionOfText('د. كريم'), TextDirection.rtl);
      expect(
        directionOfText('12 ', fallback: TextDirection.rtl),
        TextDirection.rtl,
      );
    });

    test("an event's times stay in order and together in Arabic", () {
      final event = EventSummary.fromJson(eventSummaryJson());
      final english = eventWhen(event);
      expect(english, contains('\u2060–\u2060'));
      expect(english, isNot(contains('\u2066')));
      _inLanguage('ar', () {
        final arabic = eventWhen(event);
        expect(
          arabic,
          contains(RegExp('\u2066[0-9:]+\u2060–\u2060[0-9:]+\u2069')),
        );
        expect(arabic, isNot(contains(_nativeDigits)));
      });
    });

    test('the chat says in the language in use why a file did not go', () {
      for (final l10n in [
        AppLocalizationsEn(),
        AppLocalizationsAr(),
        AppLocalizationsTr(),
      ]) {
        expect(l10n.chatUploadRefused, isNotEmpty);
        expect(l10n.chatUploadExpired, isNotEmpty);
      }
      expect(
        AppLocalizationsAr().chatUploadRefused,
        isNot(AppLocalizationsEn().chatUploadRefused),
      );
    });
  });

  testWidgets('110 the dial code reads "+90" in Arabic', (tester) async {
    _phone(tester, const Size(360, 780));
    await _open(
      tester,
      FakeApi(config: configJson(languages: _languages)),
      language: 'ar',
      signedIn: false,
      push: '/sign-in',
    );
    final code = tester.widget<Text>(find.text('+90'));
    expect(code.textDirection, TextDirection.ltr);
  });

  testWidgets("110 a driver's screen with an offer fits a 320 x 640 phone", (
    tester,
  ) async {
    _phone(tester, const Size(320, 640));
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'rides': {
          ...ridesConfigJson(),
          'map': {'tiles_url': null, 'attribution': null},
        },
      },
    );
    api
      ..me = {
        ...userJson(),
        'roles': ['driver'],
      }
      ..driver = driverJson(online: true)
      ..driverOffers = [
        driverRideJson(
          id: 7,
          status: 'searching',
          offerExpiresAt: DateTime.now()
              .add(const Duration(seconds: 14))
              .toUtc()
              .toIso8601String(),
        ),
      ];
    await _open(tester, api, appType: AppType.rides, go: '/driver');
    expect(tester.takeException(), isNull);
    expect(find.byKey(const ValueKey('driver-offer')), findsOneWidget);
    // The tabs and the list scroll up under the offer.
    await tester.drag(find.byType(NestedScrollView), const Offset(0, -500));
    await TestApp.settle(tester);
    expect(tester.takeException(), isNull);
    expect(find.text('Current'), findsOneWidget);
  });

  testWidgets('110 a one-word button is made smaller, not broken in two', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        Center(
          child: SizedBox(
            width: 110,
            child: PrimaryButton(
              label: 'Accept',
              icon: Icons.check,
              onPressed: () {},
            ),
          ),
        ),
      ),
    );
    expect(
      find.ancestor(of: find.text('Accept'), matching: find.byType(FittedBox)),
      findsOneWidget,
    );
    final text = tester.widget<Text>(find.text('Accept'));
    expect(text.maxLines, 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('110 five tabs keep their names apart on a phone', (
    tester,
  ) async {
    _phone(tester, const Size(360, 780));
    final config = configJson(lms: null, bookings: true);
    config['vertical'] = 'fitness';
    (config['bookings'] as Map<String, dynamic>)['classes'] =
        classesConfigJson();
    await _open(tester, FakeApi(config: config), appType: AppType.booking);
    final rects = [
      for (final t in ['Home', 'Classes', 'Membership', 'Appointments'])
        if (find.text(t).evaluate().isNotEmpty)
          tester.getRect(find.text(t).last),
    ];
    expect(rects.length, greaterThanOrEqualTo(3));
    for (var i = 1; i < rects.length; i++) {
      final a = rects[i - 1];
      final b = rects[i];
      expect(a.right <= b.left || b.right <= a.left, isTrue);
    }
  });

  testWidgets("110 a school lesson's time keeps its gap in Arabic", (
    tester,
  ) async {
    const lesson = SchoolLesson(
      id: 1,
      starts: '08:00',
      ends: '08:45',
      subject: 'Mathematics',
      classId: 1,
      className: '5 A',
    );
    await tester.pumpWidget(
      _host(const LessonRow(lesson: lesson), direction: TextDirection.rtl),
    );
    final time = tester.widget<Text>(find.text('08:00–08:45'));
    expect(time.textDirection, TextDirection.ltr);
    expect(time.textAlign, TextAlign.right);
  });

  testWidgets('110 the services that failed to load can be asked again', (
    tester,
  ) async {
    _phone(tester, const Size(390, 1400));
    final api = FakeApi(
      config: {...configJson(lms: null), 'delivery': deliveryConfigJson()},
    );
    api.failures['listDeliveryServices'] = const ApiException(
      code: ApiException.networkError,
      message: 'No connection',
    );
    await _open(tester, api, appType: AppType.delivery);
    expect(find.byKey(const ValueKey('send-services-error')), findsOneWidget);
    await tester.tap(find.text('Try again'));
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('send-services-error')), findsNothing);
    expect(api.count('listDeliveryServices'), 2);
  });

  testWidgets('110 a dish on the menu is not "In stock"', (tester) async {
    _phone(tester, const Size(390, 1400));
    final api = FakeApi(config: restaurantConfigJson())..product = dishJson();
    await _open(tester, api, appType: AppType.store, push: '/product/31');
    expect(find.text('Defne Burger'), findsWidgets);
    expect(find.text('In stock'), findsNothing);
  });

  testWidgets('110 a store product still says "In stock"', (tester) async {
    _phone(tester, const Size(390, 1400));
    final api = FakeApi(config: configJson(lms: null, store: true));
    await _open(tester, api, appType: AppType.store, push: '/product/21');
    expect(find.text('In stock'), findsOneWidget);
  });
}
