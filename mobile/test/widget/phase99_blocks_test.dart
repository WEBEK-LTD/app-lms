import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/modules/chat/data/chat_providers.dart';
import 'package:yallapp/modules/shared/auth/sign_in_screen.dart';

import '../support/fake_api.dart';
import '../support/fake_chat_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import '../unit/phase99_blocks_test.dart' show formJson;
import 'events_test.dart' show usePhone;

/// 99.4 Cards, gallery, map, divider and form blocks on a page.

List<Map<String, dynamic>> newBlocksJson() => [
  {
    'id': 'c1',
    'type': 'cards',
    'title': 'What we offer',
    'columns': 2,
    'cards': [
      {
        'title': 'Yoga',
        'text': 'Every morning, for every level.',
        'image_url': 'https://cdn.example.com/yoga.jpg',
        'action': {'type': 'page', 'page_slug': 'home'},
      },
      {'title': 'Pilates', 'text': 'Small groups.'},
      {'title': 'A third card with a much longer title than the others'},
    ],
  },
  {
    'id': 'g1',
    'type': 'gallery',
    'title': 'Our studio',
    'columns': 3,
    'images': [
      {'image_url': 'https://cdn.example.com/1.jpg', 'caption': 'The hall'},
      {'image_url': 'https://cdn.example.com/2.jpg', 'caption': 'The garden'},
      {'image_url': 'https://cdn.example.com/3.jpg'},
    ],
  },
  {
    'id': 'm1',
    'type': 'map',
    'latitude': 40.98,
    'longitude': 29.03,
    'name': 'Moda branch',
    'address': 'Moda Cd. 1, Kadıköy, İstanbul',
  },
  {'id': 'd1', 'type': 'divider', 'style': 'line'},
  {'id': 'd2', 'type': 'divider', 'style': 'dashed'},
  {'id': 'd3', 'type': 'divider', 'style': 'dots'},
  formJson(),
];

FakeApi pageApi(List<Map<String, dynamic>> blocks, {bool chat = false}) =>
    FakeApi(config: {...configJson(), if (chat) 'chat': chatConfigJson()})
      ..navigation = navigationJson()
      ..pages = {'home': appPageJson(blocks: blocks)};

Future<void> scrollTo(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder,
    200,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.pump();
}

Finder field(String id) => find.byKey(ValueKey('form-f1-$id'));

final send = find.byKey(const ValueKey('form-send-f1'));

void main() {
  const sizes = {'small phone': Size(320, 568), 'tablet': Size(768, 1024)};

  for (final size in sizes.entries) {
    for (final template in AppTemplate.values) {
      for (final dark in [false, true]) {
        final name =
            '99.4 blocks: ${size.key}, ${template.name}, '
            '${dark ? 'dark' : 'light'}';
        testWidgets(name, (tester) async {
          usePhone(tester, size.value);
          final app = TestApp(
            api: pageApi(newBlocksJson()),
            signedIn: true,
            template: template,
            preferences: {'settings.theme_mode': dark ? 'dark' : 'light'},
          );
          await app.pump(tester);
          expect(tester.takeException(), isNull, reason: 'first frame');
          for (final marker in [
            find.text('Yoga'),
            find.text('Small groups.'),
            find.byKey(const ValueKey('gallery-g1-2')),
            find.text('Moda branch'),
            find.text('Directions'),
            find.byKey(const ValueKey('divider-line')),
            find.byKey(const ValueKey('divider-dashed')),
            find.byKey(const ValueKey('divider-dots')),
            field('note'),
            send,
          ]) {
            await scrollTo(tester, marker);
            expect(marker, findsOneWidget);
            expect(tester.takeException(), isNull, reason: '$marker');
          }
          expect(find.text('Send'), findsOneWidget);
        });
      }
    }
  }

  testWidgets('a photo opens full screen, to swipe through with its '
      'caption', (tester) async {
    usePhone(tester);
    final app = TestApp(api: pageApi(newBlocksJson()), signedIn: true);
    await app.pump(tester);
    final thumbnail = find.byKey(const ValueKey('gallery-g1-1'));
    await scrollTo(tester, thumbnail);
    await tester.tap(thumbnail);
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('gallery-viewer')), findsOneWidget);
    expect(find.text('The garden'), findsOneWidget);
    expect(find.text('2 / 3'), findsOneWidget);

    await tester.drag(
      find.byKey(const ValueKey('gallery-viewer')),
      const Offset(-300, 0),
    );
    await TestApp.settle(tester);
    expect(find.text('3 / 3'), findsOneWidget);
    // The last photo has no caption.
    expect(find.text('The garden'), findsNothing);

    await tester.tap(find.byKey(const ValueKey('gallery-close')));
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('gallery-viewer')), findsNothing);
    expect(tester.takeException(), isNull);
  });

  group('directions', () {
    Future<List<String>> directions(
      WidgetTester tester, {
      DevicePlatform platform = DevicePlatform.android,
      bool geo = true,
      String? label,
    }) async {
      usePhone(tester);
      final opened = <String>[];
      final app = TestApp(
        api: pageApi([
          {
            'id': 'm1',
            'type': 'map',
            'latitude': 40.98,
            'longitude': 29.03,
            'name': 'Moda branch',
            'label': label,
          },
        ]),
        signedIn: true,
        platform: platform,
        overrides: [
          openExternalProvider.overrideWithValue((url) async {
            opened.add(url);
            return geo || !url.startsWith('geo:');
          }),
        ],
      );
      await app.pump(tester);
      await tester.tap(find.text(label ?? 'Directions'));
      await TestApp.settle(tester);
      return opened;
    }

    testWidgets("Android opens the phone's maps", (tester) async {
      expect(await directions(tester), [
        'geo:40.98,29.03?q=40.98,29.03(Moda%20branch)',
      ]);
    });

    testWidgets('without a maps app, Google Maps on the web', (tester) async {
      expect(await directions(tester, geo: false, label: 'Find us'), [
        'geo:40.98,29.03?q=40.98,29.03(Moda%20branch)',
        'https://www.google.com/maps/dir/?api=1&destination=40.98,29.03',
      ]);
    });

    testWidgets('an iPhone opens Apple Maps', (tester) async {
      expect(await directions(tester, platform: DevicePlatform.ios), [
        'https://maps.apple.com/?daddr=40.98,29.03',
      ]);
    });
  });

  group('form by email', () {
    Future<TestApp> pumpForm(WidgetTester tester) async {
      usePhone(tester, const Size(390, 1600));
      final app = TestApp(api: pageApi([formJson()]), signedIn: true);
      await app.pump(tester);
      return app;
    }

    testWidgets('answers are checked on the phone, then sent; the text for '
        'after takes the form\'s place', (tester) async {
      final app = await pumpForm(tester);
      expect(find.text('Book a visit'), findsOneWidget);

      await tapSend(tester);
      expect(find.text('This field is required'), findsOneWidget);
      expect(app.api.count('sendFormAnswers'), 0);

      await tester.enterText(field('name'), ' Ayşe ');
      await tester.enterText(field('email'), 'ayse@');
      await tester.enterText(field('phone'), '12');
      await tester.enterText(field('people'), 'four');
      await tapSend(tester);
      expect(find.text('This field is required'), findsNothing);
      expect(find.text('Enter a valid email'), findsOneWidget);
      expect(find.text('Enter a valid phone number'), findsOneWidget);
      expect(find.text('Enter a number'), findsOneWidget);
      expect(app.api.count('sendFormAnswers'), 0);

      // Changing an answer clears its message.
      await tester.enterText(field('email'), 'ayse@example.com');
      await tester.pump();
      expect(find.text('Enter a valid email'), findsNothing);
      await tester.enterText(field('phone'), '+90 532 123 45 67');
      await tester.enterText(field('people'), '2');
      await tester.tap(find.text('Sunday'));
      await tester.pump();
      await tapSend(tester);

      expect(app.api.formAnswers['home/f1'], {
        'name': 'Ayşe',
        'email': 'ayse@example.com',
        'phone': '+90 532 123 45 67',
        'people': '2',
        'day': 'Sunday',
      });
      expect(find.byKey(const ValueKey('form-sent-f1')), findsOneWidget);
      expect(find.text('Thanks, we will call you.'), findsOneWidget);
      expect(field('name'), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets("the server's word for a field shows under it", (tester) async {
      final app = await pumpForm(tester);
      app.api.failures['sendFormAnswers'] = const ApiException(
        code: 'invalid_answers',
        message: 'Some answers need a change.',
        statusCode: 400,
        details: {
          'fields': {'email': 'This address can not receive email.'},
        },
      );
      await tester.enterText(field('name'), 'Ayşe');
      await tester.enterText(field('email'), 'ayse@example.com');
      await tapSend(tester);
      expect(find.text('This address can not receive email.'), findsOneWidget);
      expect(find.text('Some answers need a change.'), findsNothing);
      expect(find.byKey(const ValueKey('form-sent-f1')), findsNothing);
    });

    testWidgets('when the answers do not go, they stay and the button tries '
        'again', (tester) async {
      final app = await pumpForm(tester);
      await tester.enterText(field('name'), 'Ayşe');

      app.api.failures['sendFormAnswers'] = const ApiException(
        code: 'rate_limited',
        message: 'Too many answers from here. Try again later.',
        statusCode: 429,
      );
      await tapSend(tester);
      expect(
        find.text('Too many answers from here. Try again later.'),
        findsOneWidget,
      );

      app.api.failures['sendFormAnswers'] = const ApiException(
        code: 'send_failed',
        message: 'The answers could not be sent. Please try again.',
        statusCode: 503,
      );
      await tapSend(tester);
      expect(
        find.text('The answers could not be sent. Please try again.'),
        findsOneWidget,
      );
      expect(find.text('Try again'), findsOneWidget);
      expect(tester.widget<TextField>(field('name')).controller!.text, 'Ayşe');

      await tester.tap(find.text('Try again'));
      await TestApp.settle(tester);
      expect(app.api.count('sendFormAnswers'), 3);
      expect(app.api.formAnswers['home/f1'], {'name': 'Ayşe'});
      expect(find.text('Thanks, we will call you.'), findsOneWidget);
    });
  });

  group('form to the chat', () {
    final chatForm = formJson(
      sendTo: 'chat',
      fields: [
        {'id': 'name', 'kind': 'text', 'label': 'Name', 'required': true},
        {
          'id': 'day',
          'kind': 'choice',
          'label': 'Day',
          'required': true,
          'options': ['Saturday', 'Sunday'],
        },
      ],
    );

    testWidgets('an app without chat leaves it out', (tester) async {
      usePhone(tester);
      final app = TestApp(api: pageApi([chatForm]), signedIn: true);
      await app.pump(tester);
      expect(find.byKey(const ValueKey('block-f1')), findsNothing);
      expect(find.text('Book a visit'), findsNothing);
    });

    testWidgets('signed out, the button signs in first', (tester) async {
      usePhone(tester);
      final app = TestApp(
        api: pageApi([chatForm], chat: true),
        guest: true,
        overrides: [chatApiProvider.overrideWithValue(null)],
      );
      await app.pump(tester);
      expect(find.text('Sign in to send'), findsOneWidget);
      await tester.ensureVisible(send);
      await TestApp.settle(tester);
      await tester.tap(send);
      await TestApp.settle(tester);
      // Sign-in opens on top of the page, to come back to it.
      expect(find.byType(SignInScreen), findsOneWidget);
    });

    testWidgets('signed in, one message to the business: the title, then a '
        'line per answer', (tester) async {
      usePhone(tester, const Size(390, 1200));
      final chat = FakeChatApi();
      final app = TestApp(
        api: pageApi([chatForm], chat: true),
        signedIn: true,
        overrides: [chatApiProvider.overrideWithValue(chat)],
      );
      await app.pump(tester);
      await tester.enterText(field('name'), 'Ayşe');
      await tapSend(tester);
      expect(find.text('Choose one'), findsOneWidget);
      expect(chat.count('send'), 0);

      await tester.tap(find.text('Sunday'));
      await tester.pump();
      await tester.tap(send);
      await TestApp.settle(tester);
      expect(chat.count('send'), 1);
      expect(
        chat.threads[businessConversation]!.last.text,
        'Book a visit\nName: Ayşe\nDay: Sunday',
      );
      expect(app.api.count('sendFormAnswers'), 0);
      expect(find.text('Thanks, we will call you.'), findsOneWidget);
    });
  });
}

Future<void> tapSend(WidgetTester tester) async {
  await tester.tap(send);
  await TestApp.settle(tester);
}
