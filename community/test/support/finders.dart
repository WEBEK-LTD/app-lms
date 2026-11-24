import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/routing/app_router.dart';

import 'test_app.dart';

Finder key(String k) => find.byKey(ValueKey(k));

extension TestAppPath on TestApp {
  /// Where the router is.
  String get path => container
      .read(routerProvider)
      .routerDelegate
      .currentConfiguration
      .uri
      .path;

  void go(String location) => container.read(routerProvider).go(location);
}

/// Taps [k] (scrolling to it first) and lets the screen settle.
Future<void> tap(WidgetTester tester, String k) async {
  await tester.ensureVisible(key(k));
  await tester.pump();
  await tester.tap(key(k));
  await TestApp.settle(tester);
}
