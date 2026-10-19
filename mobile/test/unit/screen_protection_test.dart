import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/services/pdf_pages.dart';
import 'package:yallapp/core/services/screen_security.dart';
import 'package:yallapp/core/widgets/file_viewer.dart';

import '../support/fixtures.dart';

AppConfig configWith({Object? mode, bool block = false}) {
  final json = configJson();
  (json['content'] as Map<String, dynamic>)['block_screen_capture'] = block;
  if (mode != null) {
    (json['app'] as Map<String, dynamic>)['screen_protection'] = mode;
  }
  return AppConfig.fromJson(json);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  group('Config.app.screen_protection (53)', () {
    test('reads the owner\'s choice', () {
      expect(
        configWith(mode: 'off', block: true).screenProtection,
        ScreenProtection.off,
      );
      expect(
        configWith(mode: 'content').screenProtection,
        ScreenProtection.content,
      );
      expect(configWith(mode: 'app').screenProtection, ScreenProtection.app);
    });

    test('an older server: lessons when block_screen_capture is true', () {
      expect(configWith(block: true).app.screenProtection, isNull);
      expect(
        configWith(block: true).screenProtection,
        ScreenProtection.content,
      );
      expect(configWith().screenProtection, ScreenProtection.off);
      // An unknown value from a newer server falls back the same way.
      expect(
        configWith(mode: 'everything', block: true).screenProtection,
        ScreenProtection.content,
      );
    });
  });

  group('the platform channels', () {
    tearDown(() {
      messenger
        ..setMockMethodCallHandler(
          const MethodChannel('yallapp/screen_security'),
          null,
        )
        ..setMockMethodCallHandler(const MethodChannel('yallapp/pdf'), null);
    });

    test('setSecure asks the platform to protect the window', () async {
      final calls = <MethodCall>[];
      messenger.setMockMethodCallHandler(
        const MethodChannel('yallapp/screen_security'),
        (call) async {
          calls.add(call);
          return null;
        },
      );
      await const ScreenSecurity().setSecure(true);
      await const ScreenSecurity().setSecure(false);
      expect(calls.map((c) => c.method), ['setSecure', 'setSecure']);
      expect(calls.map((c) => c.arguments), [
        {'enabled': true},
        {'enabled': false},
      ]);
    });

    test('a platform without the channel never breaks the lesson', () async {
      await const ScreenSecurity().setSecure(true);
      messenger.setMockMethodCallHandler(
        const MethodChannel('yallapp/screen_security'),
        (call) async => throw PlatformException(code: 'failed'),
      );
      await const ScreenSecurity().setSecure(true);
    });

    test('PDF pages come from the platform renderer, in memory', () async {
      final calls = <MethodCall>[];
      messenger.setMockMethodCallHandler(const MethodChannel('yallapp/pdf'), (
        call,
      ) async {
        calls.add(call);
        return switch (call.method) {
          'open' => {'id': 4, 'pages': 3},
          'render' => Uint8List.fromList([1, 2, 3]),
          _ => null,
        };
      });
      final bytes = Uint8List.fromList('%PDF-1.7'.codeUnits);
      final document = (await const PdfPages().open(bytes))!;
      expect(document.pageCount, 3);
      expect(await document.render(1, 1080), [1, 2, 3]);
      await document.close();
      expect(calls.map((c) => c.method), ['open', 'render', 'close']);
      expect((calls[0].arguments as Map)['bytes'], bytes);
      expect(calls[1].arguments, {'id': 4, 'page': 1, 'width': 1080});
      expect(calls[2].arguments, {'id': 4});
    });

    test('no renderer, or not a PDF: null', () async {
      expect(await const PdfPages().open(Uint8List(4)), isNull);
      messenger.setMockMethodCallHandler(
        const MethodChannel('yallapp/pdf'),
        (call) async => null,
      );
      expect(await const PdfPages().open(Uint8List(4)), isNull);
    });
  });

  test('the viewer knows PDFs, pictures and text', () {
    expect(viewerKindOf('Slides.pdf', null), ViewerKind.pdf);
    expect(viewerKindOf('file', 'application/pdf'), ViewerKind.pdf);
    expect(
      viewerKindOf('download', null, Uint8List.fromList('%PDF-1'.codeUnits)),
      ViewerKind.pdf,
    );
    expect(viewerKindOf('Map.PNG', null), ViewerKind.image);
    expect(viewerKindOf('x', 'image/jpeg'), ViewerKind.image);
    expect(viewerKindOf('Logo.svg', 'image/svg+xml'), ViewerKind.other);
    expect(viewerKindOf('Notes.txt', null), ViewerKind.text);
    expect(viewerKindOf('Workbook.docx', null), ViewerKind.other);
  });
}
