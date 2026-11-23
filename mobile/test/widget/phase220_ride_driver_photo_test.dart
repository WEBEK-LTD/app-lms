import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/widgets/common.dart';

import '../screenshots/support/shot.dart' show loadAppFonts;
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 220 (178.13) Masar's "On the way" card: a driver without a photo of
/// their own gets a neutral icon, never the template's stock photo of a
/// stranger standing for them.
void main() {
  setUpAll(loadAppFonts);

  final served = jsonDecode(
    File('test/support/phase178_masar_pages.json').readAsStringSync(),
  ) as Map<String, dynamic>;

  FakeApi api(List<Map<String, dynamic>> rides) =>
      FakeApi(
          config: {
            ...configJson(lms: null),
            'rides': {
              ...ridesConfigJson(),
              'currency': 'TRY',
              'map': {'tiles_url': null, 'attribution': null},
            },
            'taxi': {
              'map': {
                'provider': 'osm',
                'tiles_url': null,
                'attribution': null,
                'search': false,
                'routes': false,
              },
              'live': null,
              'nearby_every_seconds': 5,
            },
          },
        )
        ..navigation = served['navigation'] as Map<String, dynamic>
        ..pages = {
          for (final slug in ['home', 'ride', 'rides'])
            slug: served[slug] as Map<String, dynamic>,
        }
        ..rides = rides
        ..nearbyTaxis = [];

  testWidgets('a driver without a photo: an icon, not the template\'s photo', (
    tester,
  ) async {
    tester.view
      ..physicalSize = const Size(360, 800) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    // The template's card still carries its photo (as served).
    expect(jsonEncode(served['home']), contains('rides-driver.jpg'));

    final app = TestApp(
      api: api([rideJson(status: 'accepted')]),
      appType: AppType.rides,
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    final card = find.byKey(const ValueKey('studio-tracking-driver'));
    expect(card, findsOneWidget);
    final photos = tester
        .widgetList<AppNetworkImage>(
          find.descendant(of: card, matching: find.byType(AppNetworkImage)),
        )
        .map((i) => i.url);
    expect(photos.where((u) => u?.contains('rides-driver') ?? false), isEmpty);
    expect(
      find.descendant(of: card, matching: find.byType(Icon)),
      findsWidgets,
    );
    expect(tester.takeException(), isNull);
  });
}
