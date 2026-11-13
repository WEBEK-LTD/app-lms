import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart'
    show pageClockProvider;

import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'phase105_4_test.dart' show schoolApi, usePhone;

/// 128 A school's Studio home as Nakhla School's approved board has it: the
/// photo under a scrim with the family's greeting, the children to switch
/// between and today's card (in at the gate, the class now and next, the
/// bus home) from the parent's own children; signed out, the element's own
/// words and none of the family's parts.
void main() {
  final now = DateTime(2026, 11, 2, 8, 10);

  Map<String, dynamic> home() => {
    ...appPageJson(blocks: []),
    'studio': {
      'header': {
        'type': 'transparent',
        'buttons': ['notifications'],
      },
      'body': {
        'id': 'root',
        'type': 'column',
        'children': [
          {
            'id': 'hero',
            'type': 'stack',
            'height': 250,
            'image_background_url': 'https://cdn.test/school.jpg',
            'scrim': {
              'color': '#0A1E34',
              'from': 0.5,
              'middle': 0.15,
              'at': 40,
              'to': 0.9,
            },
            'children': [
              {
                'id': 'greeting',
                'type': 'school',
                'school': {'section': 'greeting'},
                'text': 'Welcome to Nakhla School',
              },
            ],
          },
          for (final s in ['children', 'today'])
            {
              'id': s,
              'type': 'school',
              'school': {'section': s},
              'visibility': 'signed_in',
            },
        ],
      },
    },
  };

  test('reads the school element and a scrim', () {
    final node = StudioNode.tryParse(home()['studio']['body'])!;
    final hero = node.children.first;
    expect(hero.scrim?.color, '#0A1E34');
    expect(
      (hero.scrim?.from, hero.scrim?.middle, hero.scrim?.to),
      (0.5, 0.15, 0.9),
    );
    expect(hero.children.single.school, StudioSchoolSection.greeting);
    expect(node.children.map((n) => n.school), [
      null,
      StudioSchoolSection.children,
      StudioSchoolSection.today,
    ]);
  });

  TestApp app({required bool signedIn}) {
    final api = schoolApi()
      ..navigation = navigationJson(
        tabs: [
          navTabJson('home', 'Home', 'home', {
            'type': 'page',
            'page_slug': 'home',
          }),
          navTabJson('account', 'Me', 'person', {
            'type': 'screen',
            'screen': 'account',
          }),
        ],
      )
      ..pages = {'home': home()};
    return TestApp(
      api: api,
      appType: AppType.school,
      signedIn: signedIn,
      guest: !signedIn,
      overrides: [pageClockProvider.overrideWithValue(() => now)],
    );
  }

  testWidgets("greets the family and shows the chosen child's day", (
    tester,
  ) async {
    usePhone(tester);
    final a = app(signedIn: true);
    await a.pump(tester);
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('studio-scrim-hero')), findsOneWidget);
    expect(find.text("Good morning,\nOmar's family"), findsOneWidget);
    expect(find.text('Omar · 5A'), findsOneWidget);
    expect(find.text('Laila · 3B'), findsOneWidget);
    expect(find.text('Omar checked in at 07:52'), findsOneWidget);
    expect(find.text('On time · the gate'), findsOneWidget);
    expect(find.text('Now · Mathematics with Sara Adel'), findsOneWidget);
  });

  testWidgets("signed out: the element's own words, none of the family's", (
    tester,
  ) async {
    usePhone(tester);
    final a = app(signedIn: false);
    await a.pump(tester);
    await TestApp.settle(tester, 20);
    expect(find.text('Welcome to Nakhla School'), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-school-children')), findsNothing);
    expect(find.byKey(const ValueKey('studio-school-today')), findsNothing);
  });
}
