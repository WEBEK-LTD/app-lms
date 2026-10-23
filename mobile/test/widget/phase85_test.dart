import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/core/widgets/common.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'events_test.dart' show usePhone;

/// 85.2 Campaigns: a picture shown in the inbox, and what a campaign opens:
/// one of the app's pages (an app link) or a web page in the browser.

const _picture = 'https://yallapp.com.tr/m/abc123';
const _web = 'https://shop.example/weekend-sale';
const _page = 'https://yallapp.com.tr/a/app-1/page/offers';

void main() {
  test(
    'a web address opens outside the app; the app\'s own links stay in it',
    () {
      expect(pushOutsideLink({'type': 'announcement', 'link': _web}), _web);
      expect(pushOutsideLink({'type': 'announcement', 'link': _page}), isNull);
      expect(
        pushTargetLocation({'type': 'announcement', 'link': _page}),
        '/a/app-1/page/offers',
      );
      expect(
        pushOutsideLink({
          'type': 'announcement',
          'link': 'http://shop.example/x',
        }),
        isNull,
      );
      expect(pushOutsideLink({'type': 'announcement'}), isNull);
      final inbox = InboxNotification.fromJson({
        ...notificationJson(),
        'image_url': _picture,
        'link': _web,
      });
      expect(inbox.imageUrl, _picture);
      // Older servers send no picture.
      expect(InboxNotification.fromJson(notificationJson()).imageUrl, isNull);
    },
  );

  testWidgets('the inbox shows the picture and opens the web page', (
    tester,
  ) async {
    usePhone(tester);
    final opened = <String>[];
    final api = FakeApi()
      ..notifications = [
        {
          ...notificationJson(id: 7),
          'title': 'Weekend sale',
          'image_url': _picture,
          'link': _web,
        },
      ];
    final app = TestApp(
      signedIn: true,
      appType: AppType.lms,
      api: api,
      overrides: [
        openExternalProvider.overrideWithValue((url) async {
          opened.add(url);
          return true;
        }),
      ],
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.notifications);
    await TestApp.settle(tester);
    expect(find.text('Weekend sale'), findsOneWidget);
    expect(
      find.byWidgetPredicate((w) => w is AppNetworkImage && w.url == _picture),
      findsOneWidget,
    );
    await tester.tap(find.text('Weekend sale'));
    await TestApp.settle(tester);
    expect(opened, [_web]);
    expect(tester.takeException(), isNull);
    expect(find.byType(Scaffold), findsWidgets);
  });

  test('85.3 the app\'s own notifications open their screens', () {
    expect(
      pushTargetLocation({
        'type': 'appointment_reminder',
        'appointment_id': '41',
      }),
      '/appointment/41',
    );
    expect(
      pushTargetLocation({'type': 'appointment_confirmed'}),
      Paths.appointments,
    );
    expect(pushTargetLocation({'type': 'class_soon'}), Paths.classes);
    expect(
      pushTargetLocation({'type': 'event_soon', 'event_id': '7'}),
      '/event/7',
    );
    expect(
      pushTargetLocation({'type': 'membership_ending'}),
      Paths.memberships,
    );
    expect(pushTargetLocation({'type': 'cart_left'}), Paths.cart);
    expect(pushTargetLocation({'type': 'study_reminder'}), Paths.myCourses);
    final inbox = InboxNotification.fromJson({
      ...notificationJson(),
      'type': 'appointment_confirmed',
      'appointment_id': 41,
    });
    expect(inbox.type, NotificationType.appointmentConfirmed);
    expect(pushTargetLocation(inbox.target), '/appointment/41');
  });

  testWidgets('85.3 the cart tells the server how many items it holds', (
    tester,
  ) async {
    final api = FakeApi();
    final app = TestApp(signedIn: true, appType: AppType.store, api: api);
    await app.pump(tester);
    final cart = app.container.read(cartProvider.notifier);
    cart.add(const CartItem(productId: 1, quantity: 2, name: 'Tulips'));
    await tester.pump();
    cart.add(const CartItem(productId: 2, quantity: 1, name: 'Roses'));
    await tester.pump();
    // The same count isn't sent twice; an empty cart is.
    cart.setQuantity(app.container.read(cartProvider).first.key, 2);
    await tester.pump();
    cart.clear();
    await tester.pump();
    expect(api.carts, [2, 3, 0]);
  });
}
