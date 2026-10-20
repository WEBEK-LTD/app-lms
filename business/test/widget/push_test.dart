import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/services/push.dart';

import '../support/test_app.dart';

void main() {
  test('a push opens the screen of what it is about', () {
    PushTarget t(Map<String, dynamic> data) => pushTarget(data);
    expect(
      t({
        'type': 'owner',
        'kind': 'new_order',
        'app_id': 'a',
        'order_id': '1042',
      }).location,
      '/orders/1042',
    );
    expect(
      t({'kind': 'new_order', 'app_id': 'a', 'order_id': '1042'}).appId,
      'a',
    );
    expect(
      t({'kind': 'new_booking', 'appointment_id': '7'}).location,
      '/appointments',
    );
    expect(
      t({'kind': 'new_message', 'inquiry_id': '31'}).location,
      '/inbox/31',
    );
    expect(
      t({'kind': 'payment_received', 'donation_id': '9'}).location,
      '/donations',
    );
    expect(
      t({'kind': 'build_finished', 'build_id': 'b', 'update_key': 'build:b'})
          .location,
      '/builds',
    );
    expect(
      t({'kind': 'yallapp_updates', 'update_key': 'announcement:1'}).location,
      '/updates',
    );
    expect(
      t({'kind': 'account_notices', 'update_key': 'notice:3'}).location,
      '/updates',
    );
    expect(
      t({'kind': 'payment_received', 'update_key': 'payment:1'}).location,
      '/updates',
    );
    expect(t({'kind': 'new_order'}).location, '/orders');
    expect(t({}).location, '/today');
  });

  testWidgets('registers the push token after signing in', (tester) async {
    final push = FakePush();
    final app = TestApp(push: push);
    await app.pump(tester);
    expect(app.api.pushToken, 'fcm-token-1');
    push.refreshes.add('fcm-token-2');
    await settle(tester, 2);
    expect(app.api.pushToken, 'fcm-token-2');
  });

  testWidgets('tapping a push switches to its app and opens it', (
    tester,
  ) async {
    final push = FakePush();
    final app = TestApp(push: push);
    await app.pump(tester);
    push.openedController.add({
      'type': 'owner',
      'kind': 'new_booking',
      'app_id': FakeOwnerApi.clinicId,
      'appointment_id': '701',
    });
    await settle(tester);
    expect(find.text('Yusuf Kaya'), findsOneWidget);
  });

  testWidgets('a push that launched the app opens after the lock', (
    tester,
  ) async {
    final push = FakePush()
      ..launch = {
        'kind': 'new_order',
        'app_id': FakeOwnerApi.restaurantId,
        'order_id': '1041',
      };
    final bio = FakeBiometrics(succeed: false);
    final app = TestApp(push: push, biometrics: bio, biometricLock: true);
    await app.pump(tester);
    expect(find.text('Yallapp Business is locked'), findsOneWidget);
    bio.succeed = true;
    await tapOn(tester, find.text('Unlock'));
    expect(find.text('#1041'), findsOneWidget);
  });

  testWidgets('a push while the app is open shows with Open', (tester) async {
    final push = FakePush();
    final app = TestApp(push: push);
    await app.pump(tester);
    push.foregroundController.add(
      const RemoteNotice(
        title: 'New order',
        body: 'Order 1050 was paid.',
        data: {
          'kind': 'new_order',
          'app_id': FakeOwnerApi.restaurantId,
          'order_id': '1040',
        },
      ),
    );
    await settle(tester, 3);
    expect(find.text('New order: Order 1050 was paid.'), findsOneWidget);
    await tapOn(tester, find.text('Open'));
    expect(find.text('#1040'), findsOneWidget);
  });
}
