import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/gate/app_gate.dart';
import 'package:yallapp/modules/shared/pages/resume_reload.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// What the owner publishes (Studio › Screens, the dashboard's look and
/// store settings, the pages) reaches an app that stays open: back on
/// screen, it asks for its config and pages again, in place.
void main() {
  Map<String, dynamic> page(String text) => appPageJson(
    blocks: [
      {
        'id': 'b1',
        'type': 'text',
        'visibility': 'everyone',
        'html': '<p>$text</p>',
      },
    ],
  );

  ({TestApp app, StreamController<void> resumes, void Function(Duration) wait})
  start({required bool pages}) {
    final resumes = StreamController<void>.broadcast();
    addTearDown(resumes.close);
    var now = DateTime.utc(2026, 11, 17, 9);
    final api = FakeApi();
    if (pages) {
      api
        ..navigation = navigationJson()
        ..pages = {'home': page('Before the publish')};
    }
    final app = TestApp(
      api: api,
      signedIn: true,
      overrides: [
        appResumedProvider.overrideWithValue(resumes.stream),
        resumeClockProvider.overrideWithValue(() => now),
      ],
    );
    return (app: app, resumes: resumes, wait: (Duration d) => now = now.add(d));
  }

  testWidgets('back on screen, the app shows what the owner published', (
    tester,
  ) async {
    final t = start(pages: true);
    await t.app.pump(tester);
    expect(
      find.textContaining('Before the publish', findRichText: true),
      findsOneWidget,
    );
    final api = t.app.api;
    final configs = api.count('getConfig');
    final navs = api.count('getPages');

    // The owner publishes: a new page, a new tab name, a new shop name.
    api
      ..pages['home'] = page('After the publish')
      ..navigation = navigationJson(
        tabs: [
          navTabJson('t1', 'Welcome', 'explore', {
            'type': 'page',
            'page_slug': 'home',
          }),
          navTabJson('t4', 'Me', 'person', {
            'type': 'screen',
            'screen': 'account',
          }),
        ],
      );
    (api.config['site'] as Map)['name'] = 'Rose hour';

    t.wait(const Duration(minutes: 5));
    t.resumes.add(null);
    await TestApp.settle(tester, 20);

    expect(api.count('getConfig'), configs + 1);
    expect(api.count('getPages'), navs + 1);
    expect(t.app.container.read(appConfigProvider).site.name, 'Rose hour');
    expect(find.text('Welcome'), findsWidgets);
    expect(
      find.textContaining('After the publish', findRichText: true),
      findsOneWidget,
    );
    // In place: the app never went back to its loading screen.
    expect(t.app.container.read(appGateProvider), isA<GateReady>());
  });

  testWidgets('back on screen again within the wait, nothing is asked', (
    tester,
  ) async {
    final t = start(pages: true);
    await t.app.pump(tester);
    final api = t.app.api;
    final configs = api.count('getConfig');

    t.wait(const Duration(seconds: 5));
    t.resumes.add(null);
    await TestApp.settle(tester);
    expect(api.count('getConfig'), configs);

    // Once the wait is over, it asks; right after, it doesn't again.
    t.wait(resumeReloadGap);
    t.resumes.add(null);
    await TestApp.settle(tester);
    expect(api.count('getConfig'), configs + 1);
    t.resumes.add(null);
    await TestApp.settle(tester);
    expect(api.count('getConfig'), configs + 1);
  });

  testWidgets('nothing published meanwhile: nothing on screen changes', (
    tester,
  ) async {
    final t = start(pages: false);
    await t.app.pump(tester);
    final api = t.app.api;
    final before = t.app.container.read(appGateProvider);
    final configs = api.count('getConfig');
    final homes = api.count('getHome');

    t.wait(const Duration(minutes: 5));
    t.resumes.add(null);
    await TestApp.settle(tester);

    expect(api.count('getConfig'), configs + 1);
    // The same config: the state kept, so nothing is rebuilt or asked again
    // because of it; the courses' home is asked again (its courses may be
    // new).
    expect(identical(t.app.container.read(appGateProvider), before), isTrue);
    expect(api.count('getHome'), homes + 1);
  });

  testWidgets('an app that could not open tries again on resume', (
    tester,
  ) async {
    final t = start(pages: false);
    t.app.api.config = configJson(maintenance: true);
    await t.app.pump(tester);
    expect(t.app.container.read(appGateProvider), isA<GateMaintenance>());

    // The owner ends the maintenance; the customer comes back to the app.
    t.app.api.config = configJson();
    t.wait(const Duration(minutes: 5));
    t.resumes.add(null);
    await TestApp.settle(tester);
    expect(t.app.container.read(appGateProvider), isA<GateReady>());
  });
}
