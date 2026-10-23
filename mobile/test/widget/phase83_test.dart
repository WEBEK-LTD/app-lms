import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 83.3 The Yallapp team's switches for an app's modules and new features,
/// read from `Config.switches` at every start: no new build.
void main() {
  test('reads the switches; a missing one is on', () {
    final config = AppConfig.fromJson({
      ...configJson(),
      'switches': {'side_menu': false, 'chat': true, 'odd': 'no'},
    });
    expect(config.switchOn('side_menu'), isFalse);
    expect(config.switchOn('chat'), isTrue);
    expect(config.switchOn('block_looks'), isTrue);
    expect(config.switches.containsKey('odd'), isFalse);
    // Older servers send none: everything on.
    expect(AppConfig.fromJson(configJson()).switchOn('side_menu'), isTrue);
  });

  FakeApi api({required Map<String, bool> switches}) =>
      FakeApi(config: {...configJson(), 'switches': switches})
        ..navigation = {
          ...navigationJson(),
          'menu': [
            navTabJson('m1', 'About us', 'info', {
              'type': 'page',
              'page_slug': 'home',
            }),
          ],
        }
        ..pages = {
          'home': appPageJson(
            blocks: [
              {
                'id': 'b1',
                'type': 'text',
                'visibility': 'everyone',
                'html': '<p>Hello</p>',
                'look': {'background': 'tint', 'spacing': 'large'},
              },
            ],
          ),
        };

  testWidgets('switched off, the side menu and block looks are left out', (
    tester,
  ) async {
    final app = TestApp(
      api: api(switches: {'side_menu': false, 'block_looks': false}),
      signedIn: true,
    );
    await app.pump(tester);
    expect(find.bySemanticsLabel('Open the menu'), findsNothing);
    expect(find.byKey(const ValueKey('look-tint-large')), findsNothing);
    expect(find.textContaining('Hello', findRichText: true), findsOneWidget);
  });

  testWidgets('switched on, they show', (tester) async {
    final app = TestApp(
      api: api(switches: {'side_menu': true}),
      signedIn: true,
    );
    await app.pump(tester);
    expect(find.bySemanticsLabel('Open the menu'), findsOneWidget);
    expect(find.byKey(const ValueKey('look-tint-large')), findsOneWidget);
  });
}
