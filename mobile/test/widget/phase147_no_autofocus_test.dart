import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/widgets/keyboard.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 147 A search opens without its keyboard: the owner (Kech Flora and
/// Leqaa) saw it come up by itself on the Bouquets tab, whose page sits
/// around the shop's search. In every kind of app the search's keyboard
/// comes up only when the customer taps the field.
void main() {
  final searches = <String, (AppType, Map<String, dynamic>, String)>{
    'a shop (Bouquets)': (
      AppType.store,
      {...configJson(lms: null), 'store': storeConfigJson()},
      '${Paths.shop}?focus=1',
    ),
    'an academy': (AppType.lms, configJson(), '${Paths.courses}?focus=1'),
    'real estate': (
      AppType.realEstate,
      configJson(lms: null, listings: listingsConfigJson()),
      '${Paths.search}?focus=1',
    ),
    'events': (
      AppType.events,
      {...configJson(lms: null), 'events': eventsConfigJson()},
      '${Paths.events}?focus=1',
    ),
    'news': (
      AppType.news,
      {...configJson(lms: null), 'news': newsConfigJson()},
      '${Paths.articles}?focus=1',
    ),
  };

  for (final search in searches.entries) {
    testWidgets('${search.key}: the search opens with the keyboard closed', (
      tester,
    ) async {
      final (type, config, location) = search.value;
      tester.view
        ..physicalSize = const Size(390, 844) * 2
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      final app = TestApp(
        api: FakeApi(config: config),
        appType: type,
        signedIn: true,
      );
      await app.pump(tester);
      app.container.read(appRouterProvider).go(location);
      await TestApp.settle(tester, 20);

      expect(find.byType(TextField), findsWidgets);
      expect(textFieldFocused(), isFalse);
      expect(tester.testTextInput.isVisible, isFalse);

      // A tap on the field brings it up.
      await tester.tap(find.byType(TextField).first);
      await TestApp.settle(tester, 20);
      expect(textFieldFocused(), isTrue);
      expect(tester.testTextInput.isVisible, isTrue);
    });
  }
}
