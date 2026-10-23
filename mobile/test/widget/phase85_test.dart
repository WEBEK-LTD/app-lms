import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/core/widgets/common.dart';

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
}
