import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:yallapp_community/core/routing/app_router.dart';
import 'package:yallapp_community/core/routing/paths.dart';

import 'support/test_app.dart';

void main() {
  testWidgets('signed out, the app opens on the welcome screen', (
    tester,
  ) async {
    final app = await TestApp.start(tester, signedIn: false);
    final GoRouter router = app.container.read(routerProvider);
    expect(router.routerDelegate.currentConfiguration.uri.path, Paths.welcome);
  });

  testWidgets('signed in, the app opens on Home', (tester) async {
    final app = await TestApp.start(tester);
    expect(
      app.container
          .read(routerProvider)
          .routerDelegate
          .currentConfiguration
          .uri
          .path,
      Paths.home,
    );
  });
}
