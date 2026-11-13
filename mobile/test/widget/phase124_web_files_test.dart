import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/web/web_files.dart';
import 'package:yallapp/core/web/web_view.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 124.14 The owner (13 November): an identity check opened as a tab, its
/// "Upload a file" and "Take a photo" did nothing (Android's web view shows
/// no chooser of its own). A page's file field now gets the camera, the
/// photos or the files.
void main() {
  test('the camera when the field asks for it, else the ways it takes', () {
    expect(
      webFileSources((accept: ['image/*'], multiple: false, capture: true)),
      [WebFileSource.camera],
    );
    expect(
      webFileSources((accept: ['video/*'], multiple: false, capture: true)),
      [WebFileSource.video],
    );
    expect(
      webFileSources((
        accept: ['image/*', '.pdf'],
        multiple: false,
        capture: false,
      )),
      [WebFileSource.camera, WebFileSource.gallery, WebFileSource.file],
    );
    expect(
      webFileSources((accept: <String>[], multiple: false, capture: false)),
      [WebFileSource.camera, WebFileSource.gallery, WebFileSource.file],
    );
    expect(
      webFileSources((
        accept: ['.pdf', 'application/msword'],
        multiple: false,
        capture: false,
      )),
      [WebFileSource.file],
    );
    expect(
      webFileSources((accept: ['.jpg'], multiple: false, capture: false)),
      [WebFileSource.camera, WebFileSource.gallery, WebFileSource.file],
    );
  });

  Future<(TestApp, _Picker)> openTab(WidgetTester tester) async {
    final picker = _Picker();
    final app = TestApp(
      api: FakeApi()
        ..navigation = navigationJson(
          tabs: [
            navTabJson('t1', 'Discover', 'explore', {
              'type': 'page',
              'page_slug': 'home',
            }),
            navTabJson('check', 'ID check', 'task_alt', {
              'type': 'url',
              'url': 'https://verify.example.com/',
              'open_in': 'in_app',
            }),
          ],
        )
        ..pages = {'home': appPageJson(blocks: [])},
      signedIn: true,
      overrides: [webFilePickerProvider.overrideWithValue(picker)],
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    await tester.tap(find.text('ID check').last);
    await TestApp.settle(tester, 10);
    return (app, picker);
  }

  WebViewRequest tab(TestApp app) =>
      app.webViews.requests.lastWhere((r) => r.debugLabel == 'web-tab');

  testWidgets('"Take a photo" opens the camera straight away', (tester) async {
    final (app, picker) = await openTab(tester);
    final files = await tab(app)
        .onFileSelect!((accept: ['image/*'], multiple: false, capture: true));
    expect(picker.asked, [WebFileSource.camera]);
    expect(files, [Uri.file('/phone/photo.jpg').toString()]);
  });

  testWidgets('"Upload a file" offers the camera, the photos and the files', (
    tester,
  ) async {
    final (app, picker) = await openTab(tester);
    final answer = tab(app).onFileSelect!((
      accept: ['image/*', '.pdf'],
      multiple: false,
      capture: false,
    ));
    await TestApp.settle(tester, 10);
    expect(find.byKey(const ValueKey('web-file-camera')), findsOneWidget);
    expect(find.byKey(const ValueKey('web-file-gallery')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('web-file-file')));
    await TestApp.settle(tester, 10);
    expect(await answer, [Uri.file('/phone/file.pdf').toString()]);
    expect(picker.asked, [WebFileSource.file]);
  });

  testWidgets('closing the sheet sends nothing', (tester) async {
    final (app, picker) = await openTab(tester);
    final answer = tab(app)
        .onFileSelect!((accept: <String>[], multiple: false, capture: false));
    await TestApp.settle(tester, 10);
    await tester.tapAt(const Offset(10, 10));
    await TestApp.settle(tester, 10);
    expect(await answer, isEmpty);
    expect(picker.asked, isEmpty);
  });
}

class _Picker implements WebFilePicker {
  final asked = <WebFileSource>[];

  @override
  Future<List<String>> pick(
    WebFileSource source, {
    required bool multiple,
  }) async {
    asked.add(source);
    return [
      source == WebFileSource.file ? '/phone/file.pdf' : '/phone/photo.jpg',
    ];
  }
}
