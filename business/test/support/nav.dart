import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/routing/router.dart';

import 'test_app.dart';

/// Goes to a tab or a nested screen (as a link would).
Future<void> go(WidgetTester tester, TestApp app, String location) async {
  app.container.read(routerProvider).go(location);
  await settle(tester);
}

/// Opens a full screen over the current one.
Future<void> push(WidgetTester tester, TestApp app, String location) async {
  app.container.read(routerProvider).push(location);
  await settle(tester);
}
