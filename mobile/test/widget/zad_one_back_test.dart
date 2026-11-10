import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/widgets/buttons.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// The marketplace's Search and Club opened on top of the tabs (when the
/// client's tabs don't include them) show one back button, in their own
/// bar, never a second one above it.
void main() {
  FakeApi marketApi() =>
      FakeApi(
          config: {
            ...configJson(lms: null),
            'market': {
              'currency': 'EGP',
              'kinds': ['restaurant'],
              'payment': {'cash': true},
              'club': true,
              'wallet': true,
            },
          },
        )
        ..me = userJson()
        ..navigation = navigationJson(
          tabs: [
            navTabJson('t1', 'Home', 'home', {
              'type': 'page',
              'page_slug': 'home',
            }),
            navTabJson('t2', 'Me', 'person', {
              'type': 'screen',
              'screen': 'account',
            }),
          ],
        )
        ..pages = {'home': appPageJson(blocks: const [])};

  for (final (name, path) in [
    ('Search', Paths.marketSearch),
    ('Club', Paths.marketClub),
  ]) {
    testWidgets('$name pushed has one back button', (tester) async {
      tester.view
        ..physicalSize = const Size(390, 900) * 2
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      final app = TestApp(
        api: marketApi(),
        appType: AppType.food,
        signedIn: true,
      );
      await app.pump(tester);
      app.container.read(appRouterProvider).push(path);
      await TestApp.settle(tester, 20);
      expect(tester.takeException(), isNull);
      expect(find.byType(AppBackButton), findsOneWidget);
      expect(find.byType(BackButton), findsNothing);
    });
  }
}
