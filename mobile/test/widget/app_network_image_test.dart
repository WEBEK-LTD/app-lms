import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/images/app_image.dart';
import 'package:yallapp/core/images/decode_probe.dart';
import 'package:yallapp/core/images/image_store.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/widgets/common.dart';

/// AppNetworkImage: a picture decoded at about the size of its box (not the
/// full size of the photo), laid out exactly as before, and shown at once
/// when its box is built again.

class _Store implements ImageStore {
  _Store(this.files);

  final Map<String, Uint8List> files;
  final loads = <String>[];

  @override
  Future<Uint8List> load(
    String url,
    String key, {
    ImageProgress? onProgress,
  }) async {
    loads.add(url);
    final bytes = files[url];
    if (bytes == null) {
      throw NetworkImageLoadException(statusCode: 404, uri: Uri.parse(url));
    }
    return bytes;
  }

  @override
  Future<void> forget(String key) async {}
}

Future<Uint8List> _photo(int width, int height) async {
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  final all = Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble());
  canvas
    ..drawRect(all, Paint()..color = const Color(0xFF8844CC))
    ..drawCircle(
      all.center,
      height / 3,
      Paint()..color = const Color(0xFFFFCC00),
    );
  final image = await recorder.endRecording().toImage(width, height);
  final data = await image.toByteData(format: ui.ImageByteFormat.png);
  image.dispose();
  return data!.buffer.asUint8List();
}

Widget _wrap(Widget child) => MaterialApp(
  theme: buildAppTheme(
    primary: const Color(0xFF0E0D24),
    brightness: Brightness.light,
    template: AppTemplate.classic,
    fontFamily: 'Bricolage Grotesque',
  ),
  home: Scaffold(body: child),
);

/// The picture [finder]'s RawImage draws, once decoded.
Future<ui.Image?> _drawn(WidgetTester tester, Finder finder) async {
  for (var i = 0; i < 100; i++) {
    final raw = tester.widgetList<RawImage>(
      find.descendant(of: finder, matching: find.byType(RawImage)),
    );
    final image = raw.isEmpty ? null : raw.first.image;
    if (image != null) return image;
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 20)),
    );
    await tester.pump();
  }
  return null;
}

void main() {
  late Uint8List photo;
  late _Store store;
  final before = imageStore;

  setUp(() {
    DecodeMemory.clear();
    PaintingBinding.instance.imageCache.clear();
  });
  tearDown(() => debugSetImageStore(before));

  Future<void> start(WidgetTester tester) async {
    tester.view
      ..devicePixelRatio = 3
      ..physicalSize = const Size(1200, 2400);
    addTearDown(tester.view.reset);
    photo = (await tester.runAsync(() => _photo(2000, 1500)))!;
    store = _Store({
      for (final name in ['a', 'b', 'c', 'd', 'e'])
        'https://p.test/$name.png': photo,
    });
    debugSetImageStore(store);
  }

  testWidgets('a big photo is decoded at the size of its box', (tester) async {
    await start(tester);
    await tester.pumpWidget(
      _wrap(
        const Center(
          child: SizedBox(
            width: 200,
            height: 150,
            child: AppNetworkImage(url: 'https://p.test/a.png'),
          ),
        ),
      ),
    );
    final image = await _drawn(tester, find.byType(AppNetworkImage));
    // 200 × 150 pt at 3 px a point: 600 × 450, in 64 px steps 640 × 512;
    // the photo covers that at 683 × 512 (1.4 MB decoded, not 12 MB).
    expect(image!.width, 683);
    expect(image.height, 512);
    expect(tester.getSize(find.byType(Image)), const Size(200, 150));
    expect(tester.takeException(), isNull);
  });

  testWidgets('laid out exactly as the full photo is, in a loose box', (
    tester,
  ) async {
    await start(tester);
    const full = ValueKey('full');
    await tester.pumpWidget(
      _wrap(
        Align(
          alignment: Alignment.topLeft,
          child: SizedBox(
            width: 300,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const AppNetworkImage(url: 'https://p.test/b.png'),
                Image.memory(photo, key: full),
              ],
            ),
          ),
        ),
      ),
    );
    final image = await _drawn(tester, find.byType(AppNetworkImage));
    await _drawn(tester, find.byKey(full));
    expect(image!.width, 960);
    expect(
      tester.getSize(find.byType(AppNetworkImage)),
      tester.getSize(find.byKey(full)),
    );
    expect(tester.getSize(find.byKey(full)), const Size(300, 225));
  });

  testWidgets('built again, it shows in the first frame, loaded once', (
    tester,
  ) async {
    await start(tester);
    Widget card(Key key) => _wrap(
      Center(
        child: SizedBox(
          width: 160,
          height: 120,
          child: AppNetworkImage(key: key, url: 'https://p.test/c.png'),
        ),
      ),
    );
    await tester.pumpWidget(card(UniqueKey()));
    expect(await _drawn(tester, find.byType(AppNetworkImage)), isNotNull);
    await tester.pumpWidget(_wrap(const SizedBox()));
    // A list scrolled back, a page opened again: a new box.
    await tester.pumpWidget(card(UniqueKey()));
    final raw = tester.widget<RawImage>(find.byType(RawImage));
    expect(raw.image, isNotNull);
    expect(store.loads, ['https://p.test/c.png']);
  });

  testWidgets('a bigger box: a sharper picture, the old one shown meanwhile', (
    tester,
  ) async {
    await start(tester);
    var side = 100.0;
    late StateSetter grow;
    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) {
            grow = setState;
            return Center(
              child: SizedBox.square(
                dimension: side,
                child: const AppNetworkImage(url: 'https://p.test/d.png'),
              ),
            );
          },
        ),
      ),
    );
    final small = await _drawn(tester, find.byType(AppNetworkImage));
    expect(small!.height, 320);
    grow(() => side = 300);
    await tester.pump();
    await tester.pump();
    // Still on screen, fully, while the sharper one decodes.
    final raw = tester.widget<RawImage>(find.byType(RawImage));
    expect(raw.image, isNotNull);
    for (final fade in tester.widgetList<AnimatedOpacity>(
      find.ancestor(
        of: find.byType(RawImage),
        matching: find.byType(AnimatedOpacity),
      ),
    )) {
      expect(fade.opacity, 1);
    }
    ui.Image? sharp;
    for (var i = 0; i < 100 && (sharp?.height ?? 0) < 960; i++) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 20)),
      );
      await tester.pump();
      sharp = tester.widget<RawImage>(find.byType(RawImage)).image;
    }
    expect(sharp!.height, 960);
    expect(tester.getSize(find.byType(Image)), const Size(300, 300));
    // Smaller again: the sharp one stays, nothing decoded again.
    grow(() => side = 120);
    await tester.pump();
    await tester.pump();
    expect(tester.widget<RawImage>(find.byType(RawImage)).image!.height, 960);
  });

  testWidgets('a picture that can\'t load: the placeholder, no error', (
    tester,
  ) async {
    await start(tester);
    await tester.pumpWidget(
      _wrap(
        const SizedBox(
          width: 120,
          height: 120,
          child: AppNetworkImage(url: 'https://p.test/missing.png'),
        ),
      ),
    );
    for (var i = 0; i < 5; i++) {
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 20)),
      );
      await tester.pump();
    }
    expect(tester.takeException(), isNull);
    expect(find.byType(RawImage), findsNothing);
    expect(store.loads, ['https://p.test/missing.png']);
  });

  testWidgets('with an explicit size, the size is asked for at once', (
    tester,
  ) async {
    await start(tester);
    await tester.pumpWidget(
      _wrap(
        const Center(
          child: AppNetworkImage(
            url: 'https://p.test/e.png',
            width: 34,
            height: 34,
          ),
        ),
      ),
    );
    final image = tester.widget<Image>(find.byType(Image)).image as AppImage;
    expect(image.target, const DecodeTarget(width: 128, height: 128));
    expect((await _drawn(tester, find.byType(AppNetworkImage)))!.height, 128);
  });

  testWidgets('on the web and in screenshots: Flutter\'s NetworkImage', (
    tester,
  ) async {
    debugPlainNetworkImages = true;
    addTearDown(() => debugPlainNetworkImages = false);
    await tester.pumpWidget(
      _wrap(const AppNetworkImage(url: 'https://p.test/a.png')),
    );
    final image = tester.widget<Image>(find.byType(Image)).image;
    expect(image, isA<NetworkImage>());
    expect((image as NetworkImage).url, 'https://p.test/a.png');
    expect(find.byType(DecodeProbe), findsNothing);
  });
}
