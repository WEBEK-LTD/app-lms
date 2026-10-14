import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/purchase/purchase_rules.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/modules/events/data/events_providers.dart';
import 'package:yallapp/modules/events/widgets/event_widgets.dart';
import 'package:yallapp/modules/shared/pages/page_actions.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

FakeApi eventsApi() =>
    FakeApi(config: {...configJson(lms: null), 'events': eventsConfigJson()});

TestApp eventsApp(
  FakeApi api, {
  bool signedIn = true,
  AppTemplate template = AppTemplate.classic,
  DevicePlatform platform = DevicePlatform.android,
  Map<String, Object> preferences = const {},
  List<String>? shared,
  List<String>? calendar,
}) => TestApp(
  api: api,
  appType: AppType.events,
  signedIn: signedIn,
  guest: !signedIn,
  template: template,
  platform: platform,
  preferences: preferences,
  overrides: [
    if (shared != null)
      shareEventTextProvider.overrideWithValue(
        (text) async => shared.add(text),
      ),
    if (calendar != null)
      shareCalendarFileProvider.overrideWithValue(
        (name, ics) async => calendar
          ..add(name)
          ..add(ics),
      ),
  ],
);

void usePhone(WidgetTester tester, [Size size = const Size(390, 844)]) {
  final view = tester.view
    ..physicalSize = size * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

Future<void> openEvent(TestApp app, WidgetTester tester, int id) async {
  app.container.read(appRouterProvider).push(Paths.event(id));
  await TestApp.settle(tester);
}

void main() {
  const sizes = {
    'small phone': Size(320, 568),
    'phone': Size(390, 844),
    'tablet': Size(768, 1024),
  };

  // Every Events & tickets screen on each size, template and theme: any
  // overflow or build error fails.
  for (final size in sizes.entries) {
    for (final template in AppTemplate.values) {
      for (final dark in [false, true]) {
        final name =
            'events screens: ${size.key}, ${template.name}, '
            '${dark ? 'dark' : 'light'}';
        testWidgets(name, (tester) async {
          usePhone(tester, size.value);
          final app = eventsApp(
            eventsApi(),
            template: template,
            preferences: {'settings.theme_mode': dark ? 'dark' : 'light'},
          );
          final semantics = tester.ensureSemantics();
          void clean(String step) =>
              expect(tester.takeException(), isNull, reason: step);

          await app.pump(tester);
          clean('events');
          expect(find.text('Autumn Jazz Night'), findsOneWidget);
          expect(find.text('Saturday Film Club'), findsOneWidget);
          expect(find.text('Concerts'), findsWidgets);

          await tester.tap(find.bySemanticsLabel(RegExp('^Calendar')));
          await TestApp.settle(tester);
          clean('calendar');

          await tester.tap(find.bySemanticsLabel('My tickets').last);
          await TestApp.settle(tester);
          clean('tickets');
          expect(find.text('Autumn Jazz Night'), findsOneWidget);
          expect(find.text('Valid'), findsOneWidget);

          final router = app.container.read(appRouterProvider);
          router.push(Paths.ticket('K7QM4XP2HD9W'));
          await TestApp.settle(tester);
          clean('ticket');
          expect(find.byType(QrImageView), findsOneWidget);
          expect(find.text('K7QM-4XP2-HD9W'), findsOneWidget);
          router.pop();
          await TestApp.settle(tester);

          router.push(Paths.event(7));
          await TestApp.settle(tester);
          clean('event');
          expect(find.text('Main Hall'), findsOneWidget);
          await tester.scrollUntilVisible(
            find.byKey(const ValueKey('order-12')),
            200,
            scrollable: find.byType(Scrollable).first,
          );
          clean('event tickets');
          router.pop();
          await TestApp.settle(tester);
          semantics.dispose();
        });
      }
    }
  }

  testWidgets('free tickets: how many and the names, then My tickets', (
    tester,
  ) async {
    usePhone(tester);
    final api = eventsApi();
    final app = eventsApp(api);
    await app.pump(tester);
    await openEvent(app, tester, 7);
    expect(api.lastEventId, 7);

    final order = find.byKey(const ValueKey('order-12'));
    await tester.scrollUntilVisible(
      order,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.ensureVisible(order);
    await TestApp.settle(tester);
    await tester.tap(order);
    await TestApp.settle(tester);
    expect(find.text('Get 1 free ticket'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('More'));
    await TestApp.settle(tester);
    expect(find.text('Get 2 free tickets'), findsOneWidget);
    await tester.enterText(
      find.byKey(const ValueKey('ticket-name-1')),
      'Ali Aziz',
    );
    await tester.tap(find.byKey(const ValueKey('order-confirm')));
    await TestApp.settle(tester);
    expect(api.lastTicketOrder?.ticketTypeId, 12);
    expect(api.lastTicketOrder?.quantity, 2);
    // The first ticket has the user's own name.
    expect(api.lastTicketOrder?.names, ['Sara Yilmaz', 'Ali Aziz']);
    expect(
      find.text('Done. Your tickets are under My tickets.'),
      findsOneWidget,
    );
    // The message goes after a few seconds.
    await tester.pump(const Duration(seconds: 5));
    await TestApp.settle(tester);
    // Never more than are left (3) or than one person may take (4).
    await tester.tap(order);
    await TestApp.settle(tester);
    for (var i = 0; i < 5; i++) {
      await tester.tap(find.bySemanticsLabel('More'));
      await tester.pump();
    }
    expect(
      tester.widget<Text>(find.byKey(const ValueKey('ticket-quantity'))).data,
      '3',
    );
  });

  testWidgets('paid tickets open the payment page on Android', (tester) async {
    usePhone(tester);
    final api = eventsApi();
    final app = eventsApp(api);
    await app.pump(tester);
    await openEvent(app, tester, 7);
    final order = find.byKey(const ValueKey('order-11'));
    await tester.scrollUntilVisible(
      order,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Buy tickets'), findsOneWidget);
    await tester.tap(order);
    await TestApp.settle(tester);
    await tester.tap(find.byKey(const ValueKey('order-confirm')));
    await TestApp.settle(tester);
    expect(api.count('createEventCheckoutLink'), 1);
    expect(
      app.webViews.requests.map((r) => r.url.toString()),
      contains('https://yallapp.com.tr/pay/abc'),
    );
  });

  testWidgets(
    'iOS: tickets to a venue are sold; paid online-only tickets show no button',
    (tester) async {
      usePhone(tester);
      final api = eventsApi();
      final app = eventsApp(api, platform: DevicePlatform.ios);
      await app.pump(tester);
      await openEvent(app, tester, 7);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('order-11')),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Buy tickets'), findsOneWidget);
      app.container.read(appRouterProvider).pop();
      await TestApp.settle(tester);

      // Even when a server says checkout, an online-only paid ticket has no
      // button on iOS; its free ticket does.
      api.event = eventDetailJson(id: 9, venue: false, online: true);
      await openEvent(app, tester, 9);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('ticket-type-12')),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.byKey(const ValueKey('order-11')), findsNothing);
      expect(find.text('Buy tickets'), findsNothing);
      expect(find.text('Not sold in the app'), findsOneWidget);
      expect(find.byKey(const ValueKey('order-12')), findsOneWidget);
      expect(find.text('The link to join is on your ticket.'), findsOneWidget);
    },
  );

  testWidgets('the wallet shows saved tickets and their QR codes offline', (
    tester,
  ) async {
    usePhone(tester);
    final api = eventsApi();
    final app = eventsApp(api);
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel('My tickets').last);
    await TestApp.settle(tester);
    final saved = app.container
        .read(sharedPreferencesProvider)
        .getString(ticketWalletKey);
    expect(
      (jsonDecode(saved!) as List).single,
      containsPair('code', 'K7QM4XP2HD9W'),
    );

    // No connection: the copy on the phone, with a note.
    api.failures['listMyTickets'] = const ApiException(
      code: ApiException.networkError,
      message: 'No connection',
    );
    app.container.invalidate(ticketWalletProvider);
    await TestApp.settle(tester);
    expect(
      find.text("You're offline: these are the tickets saved on this phone."),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('ticket-K7QM4XP2HD9W')));
    await TestApp.settle(tester);
    final qr = tester.widget<QrImageView>(find.byType(QrImageView));
    expect(qr, isNotNull);
    expect(find.text('Mona Aziz'), findsOneWidget);
  });

  testWidgets('cancels a free ticket from the ticket page', (tester) async {
    usePhone(tester);
    final api = eventsApi();
    final app = eventsApp(api);
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel('My tickets').last);
    await TestApp.settle(tester);
    await tester.tap(find.byKey(const ValueKey('ticket-K7QM4XP2HD9W')));
    await TestApp.settle(tester);
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('ticket-cancel')),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const ValueKey('ticket-cancel')));
    await TestApp.settle(tester);
    await tester.tap(find.text('Cancel ticket').last);
    await TestApp.settle(tester);
    expect(api.lastCancelledTicket, 'K7QM4XP2HD9W');
    expect(find.text('Cancelled'), findsWidgets);
    expect(find.byKey(const ValueKey('ticket-cancel')), findsNothing);
  });

  testWidgets('signed out: browse events, sign in for tickets', (tester) async {
    usePhone(tester);
    final api = eventsApi();
    final app = eventsApp(api, signedIn: false);
    await app.pump(tester);
    expect(find.text('Autumn Jazz Night'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('My tickets').last);
    await TestApp.settle(tester);
    expect(find.text('Your tickets live here'), findsOneWidget);
    expect(api.count('listMyTickets'), 0);

    await openEvent(app, tester, 7);
    final order = find.byKey(const ValueKey('order-12'));
    await tester.scrollUntilVisible(
      order,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.ensureVisible(order);
    await TestApp.settle(tester);
    await tester.tap(order);
    await TestApp.settle(tester);
    expect(api.count('registerForEvent'), 0);
    expect(app.container.read(appRouterProvider).state.uri.path, Paths.signIn);
  });

  testWidgets('filters by category and adds an event to the calendar', (
    tester,
  ) async {
    usePhone(tester);
    final api = eventsApi();
    final calendar = <String>[];
    final shared = <String>[];
    final app = eventsApp(api, calendar: calendar, shared: shared);
    await app.pump(tester);
    await tester.tap(find.text('Film').first);
    await TestApp.settle(tester);
    expect(api.eventQueries.last.category, 'film');

    await openEvent(app, tester, 7);
    await tester.tap(find.bySemanticsLabel('Add to calendar'));
    await TestApp.settle(tester);
    expect(calendar.first, 'event-7.ics');
    expect(calendar.last, contains('SUMMARY:Autumn Jazz Night'));
    expect(
      calendar.last,
      contains('LOCATION:Main Hall\\, Moda Cd. 120\\, Kadıköy'),
    );
    await tester.tap(find.bySemanticsLabel('Share'));
    await TestApp.settle(tester);
    expect(shared.single, startsWith('Autumn Jazz Night\n'));
    expect(shared.single, contains('Main Hall'));
  });

  test('events models, rules, links and notifications', () {
    final event = EventDetail.fromJson(eventDetailJson());
    expect(event.startsLocal.hour, 20);
    expect(event.ticketTypes.map((t) => t.action), [
      TicketAction.checkout,
      TicketAction.register,
    ]);
    final ticket = Ticket.fromJson(ticketJson());
    expect(ticket.groupedCode, 'K7QM-4XP2-HD9W');
    final again = Ticket.fromJson(ticket.toJson());
    expect(again.event.startsLocal, ticket.event.startsLocal);
    expect(again.qrPayload, ticket.qrPayload);
    expect(
      EventsConfig.fromJson(eventsConfigJson(allowCancelHours: null))
          .allowCancelHours,
      isNull,
    );
    expect(
      const EventQuery(
        category: 'film',
        from: '2026-10-01',
        to: '2026-10-31',
      ).toQuery(),
      {
        'page': 1,
        'per_page': 20,
        'category': 'film',
        'from': '2026-10-01',
        'to': '2026-10-31',
      },
    );

    // Apple's rule: online-only paid tickets never get a button on iOS.
    final online = EventDetail.fromJson(
      eventDetailJson(venue: false, online: true),
    );
    final paid = online.ticketTypes.first;
    final free = online.ticketTypes.last;
    TicketAction action(EventSummary e, TicketType t, DevicePlatform p) =>
        resolveTicketAction(
          serverAction: t.action,
          platform: p,
          event: e,
          type: t,
        );
    expect(action(online, paid, DevicePlatform.ios), TicketAction.none);
    expect(action(online, paid, DevicePlatform.android), TicketAction.checkout);
    expect(action(online, free, DevicePlatform.ios), TicketAction.register);
    expect(action(event, paid, DevicePlatform.ios), TicketAction.checkout);

    expect(
      mapsUri(event.venue!).toString(),
      'https://www.google.com/maps/search/?api=1&query=40.9837%2C29.0262',
    );
    expect(
      mapsUri(const EventVenue(name: 'Hall', address: 'Moda Cd. 1')).toString(),
      'https://www.google.com/maps/search/?api=1&query=Hall%2C+Moda+Cd.+1',
    );
    final ics = eventIcs(event, host: 'example.com');
    expect(ics, contains('UID:event-7@example.com\r\n'));
    expect(ics, contains('DTSTART:${event.startsAt.toUtc().year}'));
    expect(ics, endsWith('END:VCALENDAR\r\n'));

    expect(pushTargetLocation({'type': 'event', 'event_id': '7'}), '/event/7');
    final inbox = InboxNotification.fromJson({
      'id': 3,
      'title': 'Changed: Autumn Jazz Night',
      'body': 'Now on Saturday.',
      'type': 'event',
      'event_id': 7,
      'created_at': '2026-10-13T08:00:00Z',
      'read': false,
    });
    expect(inbox.type, NotificationType.event);
    expect(pushTargetLocation(inbox.target), '/event/7');
    expect(
      itemLocation(
        const ItemRef(source: ItemSource.events, id: '7'),
        AppType.events,
      ),
      '/event/7',
    );
    expect(
      itemLocation(
        const ItemRef(source: ItemSource.events, id: '7'),
        AppType.lms,
      ),
      isNull,
    );
    expect(
      searchLocation(ItemSource.events, AppType.events),
      '/events?focus=1',
    );
    expect(Paths.requiresAuth(Paths.ticket('K7QM4XP2HD9W')), isTrue);
  });
}
