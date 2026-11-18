import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 164 A list of the shop's products with nothing to show leaves no section:
/// the list hides and its title (`heads`, as the servers mark it) with it.
void main() {
  Map<String, dynamic> studio(List<Map<String, dynamic>> children) => {
    'body': {'id': 'root', 'type': 'column', 'gap': 8, 'children': children},
  };

  TestApp appWith(List<Map<String, dynamic>> children) => TestApp(
    api:
        FakeApi(
            config: {
              ...configJson(lms: null, orders: true),
              'store': storeConfigJson(),
            },
          )
          ..navigation = navigationJson()
          ..pages = {
            'home': {...appPageJson(blocks: []), 'studio': studio(children)},
          },
    appType: AppType.store,
    signedIn: true,
  );

  /// "Picked for you" with its "Shop all", as Leqaa's template makes it.
  Map<String, dynamic> title(String list, String text) => {
    'id': '$list-title',
    'type': 'row',
    'heads': list,
    'children': [
      {'id': '$list-words', 'type': 'text', 'text': text},
      {'id': '$list-all', 'type': 'text', 'text': 'Shop all'},
    ],
  };

  Map<String, dynamic> picked(List<Map<String, dynamic>> items) => {
    'id': 'picked',
    'type': 'items',
    'source': 'products',
    'layout': 'grid',
    'columns': 2,
    'card': {
      'id': 'card',
      'type': 'column',
      'children': [
        {'id': 'card-title', 'type': 'text', 'bind': 'title'},
      ],
    },
    'items': items,
  };

  Map<String, dynamic> product(String id, String name) => {
    'source': 'products',
    'id': id,
    'title': name,
    'action': {
      'type': 'item',
      'item': {'source': 'products', 'id': id},
    },
  };

  test('reads the title of a list', () {
    final page = AppPage.fromJson({
      ...appPageJson(blocks: []),
      'studio': studio([title('picked', 'Picked for you'), picked([])]),
    });
    expect(page.studio!.body.children.first.heads, 'picked');
    expect(page.studio!.body.children.last.heads, isNull);
  });

  testWidgets('an empty list hides with its title and its "Shop all"', (
    tester,
  ) async {
    await appWith([
      {'id': 'hello', 'type': 'text', 'text': 'Welcome'},
      title('picked', 'Picked for you'),
      picked([]),
    ]).pump(tester);
    await TestApp.settle(tester, 10);

    expect(find.text('Welcome'), findsOneWidget);
    expect(find.text('Picked for you'), findsNothing);
    expect(find.text('Shop all'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a title whose list the servers left out hides too', (
    tester,
  ) async {
    await appWith([
      {'id': 'hello', 'type': 'text', 'text': 'Welcome'},
      title('picked', 'Picked for you'),
    ]).pump(tester);
    await TestApp.settle(tester, 10);

    expect(find.text('Welcome'), findsOneWidget);
    expect(find.text('Picked for you'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('what was seen lately: its title hidden until there is some', (
    tester,
  ) async {
    await appWith([
      {'id': 'hello', 'type': 'text', 'text': 'Welcome'},
      title('seen', 'Lately viewed'),
      {
        'id': 'seen',
        'type': 'items',
        'source': 'products',
        'layout': 'carousel',
        'recent': true,
        'items': <Object>[],
      },
    ]).pump(tester);
    await TestApp.settle(tester, 10);

    expect(find.text('Welcome'), findsOneWidget);
    expect(find.text('Lately viewed'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('with products, the list shows under its title', (tester) async {
    await appWith([
      title('picked', 'Picked for you'),
      picked([product('21', 'Red Roses'), product('22', 'White Lilies')]),
    ]).pump(tester);
    await TestApp.settle(tester, 10);

    expect(find.text('Picked for you'), findsOneWidget);
    expect(find.text('Shop all'), findsOneWidget);
    expect(find.text('Red Roses'), findsOneWidget);
    expect(find.text('White Lilies'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
