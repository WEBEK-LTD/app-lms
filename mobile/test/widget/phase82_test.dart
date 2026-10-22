import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/preview/preview.dart';
import 'package:yallapp/modules/shared/pages/draft_reload.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 82.1 The app preview inside the Pages & look editor follows the draft:
/// each save the editor reports reloads the tabs and pages in place.
void main() {
  PreviewSession session({required bool draft}) => PreviewSession(
    appId: '11111111-2222-4333-8444-555555555555',
    platformUrl: 'https://yallapp.com.tr',
    contentSource: PreviewContentSource.hosted,
    apiToken: 'preview-token',
    draft: draft,
  );

  FakeApi api() => FakeApi()
    ..navigation = navigationJson()
    ..pages = {
      'home': appPageJson(
        blocks: [
          {
            'id': 'b1',
            'type': 'text',
            'visibility': 'everyone',
            'html': '<p>First draft</p>',
          },
        ],
      ),
    };

  int count(FakeApi api, String call) =>
      api.calls.where((c) => c == call).length;

  testWidgets('a saved draft reloads the tabs and the page on screen', (
    tester,
  ) async {
    final saves = StreamController<void>.broadcast();
    addTearDown(saves.close);
    final app = TestApp(
      api: api(),
      preview: session(draft: true),
      signedIn: true,
      overrides: [draftSavedProvider.overrideWithValue(saves.stream)],
    );
    await app.pump(tester);
    expect(find.text('Discover'), findsWidgets);
    expect(
      find.textContaining('First draft', findRichText: true),
      findsOneWidget,
    );
    final pagesBefore = count(app.api, 'getPages');
    final pageBefore = count(app.api, 'getPage');

    // The owner renames a tab and edits the home page; the editor saves twice in a row.
    app.api
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
      )
      ..pages['home'] = appPageJson(
        blocks: [
          {
            'id': 'b1',
            'type': 'text',
            'visibility': 'everyone',
            'html': '<p>Second draft</p>',
          },
        ],
      );
    saves
      ..add(null)
      ..add(null);
    await TestApp.settle(tester, 20);

    // Once for both saves, without starting the app again.
    expect(count(app.api, 'getPages'), pagesBefore + 1);
    expect(count(app.api, 'getPage'), greaterThan(pageBefore));
    expect(find.text('Welcome'), findsWidgets);
    expect(
      find.textContaining('Second draft', findRichText: true),
      findsOneWidget,
    );
    expect(
      find.textContaining('First draft', findRichText: true),
      findsNothing,
    );
  });

  testWidgets('the published preview and the phone apps listen to nothing', (
    tester,
  ) async {
    final app = TestApp(api: api(), preview: session(draft: false));
    await app.pump(tester);
    expect(app.container.read(draftSavedProvider), isA<Stream<void>>());
    final pagesBefore = count(app.api, 'getPages');
    await TestApp.settle(tester, 10);
    expect(count(app.api, 'getPages'), pagesBefore);
  });
}
