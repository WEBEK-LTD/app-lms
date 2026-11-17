import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/modules/shared/pages/resume_reload.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// App audit: what the owner changes in Studio and publishes shows in the
/// app when it comes back to the screen, not only after it's started again
/// (Kech Flora's home: the bag at the top changed in Studio, the app kept
/// the old one). The reload itself is [resumeReloadProvider]; a page whose
/// reload fails keeps what it shows.
void main() {
  Map<String, dynamic> home(String icon) => {
    ...appPageJson(blocks: []),
    'studio': {
      'body': {
        'id': 'root',
        'type': 'column',
        'children': [
          {
            'id': 'top',
            'type': 'row',
            'height': 68,
            'cross': 'center',
            'children': [
              {
                'id': 'search-disc',
                'type': 'row',
                'width': 42,
                'height': 42,
                'radius': 21,
                'align': 'center',
                'cross': 'center',
                'border_color': '#FFFFFF',
                'border_width': 1,
                'surface': {'glass': 16, 'tint': 0.18},
                'children': [
                  {
                    'id': 'search',
                    'type': 'icon',
                    'icon': 'search',
                    'icon_size': 21,
                    'color': '#FFFFFF',
                  },
                ],
              },
              {
                'id': 'wordmark',
                'type': 'text',
                'text': 'KechFlora',
                'width': 'fill',
                'text_align': 'center',
              },
              {
                'id': 'bag-disc',
                'type': 'row',
                'width': 42,
                'height': 42,
                'radius': 21,
                'align': 'center',
                'cross': 'center',
                'surface': {'glass': 16, 'tint': 0.18},
                'children': [
                  {
                    'id': 'bag',
                    'type': 'icon',
                    'icon': icon,
                    'icon_size': 21,
                    'color': '#FFFFFF',
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  };

  ({TestApp app, StreamController<void> resumes}) start() {
    final resumes = StreamController<void>.broadcast();
    addTearDown(resumes.close);
    var now = DateTime.utc(2026, 11, 17, 9);
    final app = TestApp(
      api: FakeApi()
        ..navigation = navigationJson()
        ..pages = {'home': home('shopping_bag')},
      signedIn: true,
      overrides: [
        appResumedProvider.overrideWithValue(resumes.stream),
        resumeClockProvider.overrideWithValue(() {
          // Each look is a minute after the one before: past the wait.
          now = now.add(const Duration(minutes: 1));
          return now;
        }),
      ],
    );
    return (app: app, resumes: resumes);
  }

  int count(FakeApi api, String call) =>
      api.calls.where((c) => c == call).length;

  Future<void> away(WidgetTester tester, StreamController<void> resumes) async {
    resumes.add(null);
    await TestApp.settle(tester, 20);
  }

  testWidgets('a publish made while the app was away shows when it is back', (
    tester,
  ) async {
    final t = start();
    await t.app.pump(tester);
    expect(find.byIcon(Symbols.shopping_bag_rounded), findsOneWidget);
    expect(find.byIcon(Symbols.send_rounded), findsNothing);

    // The owner changes the bag in Studio and publishes: a new version.
    t.app.api
      ..navigation = {...navigationJson(), 'version': '2026-11-17T09:00:00Z.5'}
      ..pages['home'] = home('send');
    final pageBefore = count(t.app.api, 'getPage');
    await away(tester, t.resumes);

    expect(count(t.app.api, 'getPage'), greaterThan(pageBefore));
    expect(find.byIcon(Symbols.send_rounded), findsOneWidget);
    expect(find.byIcon(Symbols.shopping_bag_rounded), findsNothing);
    expect(find.text('KechFlora'), findsOneWidget);
  });

  testWidgets('a reload that fails keeps the page on screen', (tester) async {
    final t = start();
    await t.app.pump(tester);
    t.app.api
      ..navigation = {...navigationJson(), 'version': '2026-11-17T09:00:00Z.5'}
      ..failures['getPage'] = const ApiException(
        code: 'network',
        message: 'No connection.',
      );
    await away(tester, t.resumes);

    expect(find.byIcon(Symbols.shopping_bag_rounded), findsOneWidget);
    expect(find.text('KechFlora'), findsOneWidget);
  });
}
