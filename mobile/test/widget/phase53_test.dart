import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/services/pdf_pages.dart';
import 'package:yallapp/core/services/screen_security.dart';
import 'package:yallapp/core/theme/app_icons.dart';
import 'package:yallapp/core/widgets/file_viewer.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// `Config` with the owner's screen protection: `off`, `content`, `app`, or
/// null for an older server (then `block_screen_capture` decides).
Map<String, dynamic> protectionConfig(String? mode, {bool block = false}) {
  final config = configJson();
  (config['content'] as Map<String, dynamic>)['block_screen_capture'] = block;
  if (mode != null) {
    (config['app'] as Map<String, dynamic>)['screen_protection'] = mode;
  }
  return config;
}

/// A 1×1 PNG, as the platform's PDF renderer sends a page.
final _png = Uint8List.fromList([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, //
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
  0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
  0x00, 0x05, 0xFE, 0x02, 0xFE, 0xA7, 0x35, 0x81, 0x84, 0x00, 0x00, 0x00,
  0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
]);

/// The phone's PDF renderer, in memory.
class FakePdfPages implements PdfPages {
  final opened = <Uint8List>[];
  final rendered = <int>[];
  int closed = 0;

  @override
  Future<PdfDocumentHandle?> open(Uint8List bytes) async {
    opened.add(bytes);
    return PdfDocumentHandle(
      pageCount: 2,
      render: (index, width) async {
        rendered.add(index);
        return _png;
      },
      close: () async => closed++,
    );
  }
}

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized().platformDispatcher.views.first
      ..physicalSize = const Size(1170, 2532)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  final pdf = Uint8List.fromList('%PDF-1.7 slides'.codeUnits);

  Future<TestApp> start(
    WidgetTester tester,
    Map<String, dynamic> config, {
    AppType appType = AppType.lms,
    FakePdfPages? pages,
    List<String>? fetched,
  }) async {
    final app = TestApp(
      signedIn: true,
      appType: appType,
      api: FakeApi(
        config: config,
        course: courseDetailJson(enrolled: true, action: 'continue'),
        // A short text lesson: its attachment is on screen.
        lesson: {
          ...textLessonJson(),
          'html': '<p>A function is a reusable block of code.</p>',
          'embeds': <Object>[],
        },
      ),
      overrides: [
        pdfPagesProvider.overrideWithValue(pages ?? FakePdfPages()),
        attachmentFetcherProvider.overrideWithValue((url) async {
          fetched?.add(url);
          return pdf;
        }),
      ],
    );
    await app.pump(tester);
    return app;
  }

  Future<void> push(TestApp app, WidgetTester tester, String location) async {
    app.container.read(appRouterProvider).push(location);
    await TestApp.settle(tester);
  }

  Future<void> pop(TestApp app, WidgetTester tester) async {
    app.container.read(appRouterProvider).pop();
    await TestApp.settle(tester);
  }

  group('the owner chooses what is protected', () {
    testWidgets('course content: only while a lesson or quiz is open', (
      tester,
    ) async {
      final app = await start(tester, protectionConfig('content'));
      expect(app.security.calls, isEmpty, reason: 'home is not protected');
      expect(app.container.read(screenProtectedProvider), isFalse);

      await push(app, tester, '/course/1');
      expect(app.security.calls, isEmpty, reason: 'nor the course page');

      await push(app, tester, '/lesson/108');
      expect(app.security.calls, [true]);
      expect(app.container.read(screenProtectedProvider), isTrue);

      await pop(app, tester);
      expect(app.security.calls, [true, false]);

      await push(app, tester, '/quiz/301');
      expect(app.security.calls, [true, false, true]);
      await pop(app, tester);
      expect(app.security.calls, [true, false, true, false]);
      expect(tester.takeException(), isNull);
    });

    testWidgets('the whole app: from the start, and it stays on', (
      tester,
    ) async {
      final app = await start(tester, protectionConfig('app'));
      expect(app.security.calls, [true]);
      await push(app, tester, '/lesson/108');
      await pop(app, tester);
      expect(app.security.calls, [true]);
    });

    testWidgets('the whole app protects a store too', (tester) async {
      final app = await start(
        tester,
        protectionConfig('app'),
        appType: AppType.store,
      );
      expect(app.security.calls, [true]);
    });

    testWidgets('off: nothing, lessons included', (tester) async {
      final app = await start(tester, protectionConfig('off', block: true));
      await push(app, tester, '/lesson/108');
      expect(app.security.calls, isEmpty);
    });

    testWidgets('an older server protects lessons when it said so', (
      tester,
    ) async {
      final app = await start(tester, protectionConfig(null, block: true));
      expect(app.security.calls, isEmpty);
      await push(app, tester, '/lesson/108');
      expect(app.security.calls, [true]);
    });
  });

  group('iOS: recordings and screenshots', () {
    testWidgets('a recording covers protected screens, not the others', (
      tester,
    ) async {
      final app = await start(tester, protectionConfig('content'));
      app.security.captures.add(true);
      await tester.pump();
      await tester.pump();
      expect(find.byKey(const ValueKey('capture-shield')), findsNothing);

      await push(app, tester, '/lesson/108');
      expect(find.byKey(const ValueKey('capture-shield')), findsOneWidget);
      expect(
        find.text(
          "This content is protected. It's hidden while the screen is recorded or shared.",
        ),
        findsOneWidget,
      );
      // Over dialogs and full screen routes too: it's above the navigator.
      showDialog<void>(
        context: tester.element(find.text('Writing your first function')),
        builder: (_) => const AlertDialog(content: Text('A dialog')),
      );
      await tester.pump();
      await tester.pump();
      expect(find.byKey(const ValueKey('capture-shield')), findsOneWidget);
      final shield = tester.getRect(
        find.byKey(const ValueKey('capture-shield')),
      );
      expect(shield, tester.getRect(find.byType(Navigator).first));

      app.security.captures.add(false);
      await tester.pump();
      await tester.pump();
      expect(find.byKey(const ValueKey('capture-shield')), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('a screenshot of protected content gets a short notice', (
      tester,
    ) async {
      final app = await start(tester, protectionConfig('content'));
      const notice =
          "This content is protected: screenshots of it aren't allowed.";
      app.security.shots.add(null);
      await tester.pump();
      await tester.pump();
      expect(find.text(notice), findsNothing);

      await push(app, tester, '/lesson/108');
      app.security.shots.add(null);
      await tester.pump();
      await tester.pump();
      expect(find.text(notice), findsOneWidget);
    });
  });

  group('attachments while protection is on', () {
    testWidgets('a PDF opens in the app, with nothing to share or print', (
      tester,
    ) async {
      final pages = FakePdfPages();
      final fetched = <String>[];
      final app = await start(
        tester,
        protectionConfig('content'),
        pages: pages,
        fetched: fetched,
      );
      await push(app, tester, '/lesson/108');
      await tester.ensureVisible(find.text('Slides.pdf'));
      await tester.tap(find.text('Slides.pdf'));
      await TestApp.settle(tester);

      expect(find.byType(FileViewerScreen), findsOneWidget);
      expect(fetched, ['https://your-academy.com/slides.pdf']);
      expect(pages.opened.single, pdf);
      expect(find.byKey(const ValueKey('viewer-page-0')), findsOneWidget);
      expect(find.bySemanticsLabel('Page 1 of 2'), findsOneWidget);
      // No way to give the file to another app.
      expect(find.byIcon(AppIcons.share), findsNothing);
      expect(find.byIcon(AppIcons.download), findsNothing);
      expect(find.textContaining('Share'), findsNothing);
      expect(find.textContaining('Print'), findsNothing);
      expect(find.textContaining('Open in'), findsNothing);
      expect(app.downloads.opened, isEmpty);
      expect(app.container.read(screenProtectedProvider), isTrue);

      // A page on its own, to zoom.
      await tester.tap(find.byKey(const ValueKey('viewer-page-0')));
      await TestApp.settle(tester);
      expect(find.byType(InteractiveViewer), findsOneWidget);
      expect(find.text('Page 1 of 2'), findsOneWidget);

      Navigator.of(tester.element(find.byType(InteractiveViewer))).pop();
      await TestApp.settle(tester);
      Navigator.of(tester.element(find.byType(FileViewerScreen))).pop();
      await TestApp.settle(tester);
      expect(pages.closed, 1);
      expect(app.security.calls, [true], reason: 'still in the lesson');
    });

    testWidgets("a file it can't show stays in the app", (tester) async {
      final app = await start(tester, protectionConfig('app'));
      await tester.runAsync(() async {});
      final context = tester.element(find.byType(Navigator).first);
      openInViewer(
        context,
        name: 'Workbook.docx',
        load: () async => Uint8List.fromList([1, 2, 3, 4, 5]),
      );
      await TestApp.settle(tester);
      expect(find.text("This file can't be shown here"), findsOneWidget);
      expect(app.downloads.opened, isEmpty);
    });

    testWidgets('without protection, the attachment leaves the app as before', (
      tester,
    ) async {
      final fetched = <String>[];
      final app = await start(
        tester,
        protectionConfig('off'),
        fetched: fetched,
      );
      await push(app, tester, '/lesson/108');
      await tester.ensureVisible(find.text('Slides.pdf'));
      await tester.tap(find.text('Slides.pdf'));
      await TestApp.settle(tester);
      expect(find.byType(FileViewerScreen), findsNothing);
      expect(fetched, isEmpty);
    });
  });
}
