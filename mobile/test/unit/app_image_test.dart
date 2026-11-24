import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/images/app_image.dart';
import 'package:yallapp/core/images/image_store_io.dart';

/// Pictures in the app: kept on the phone, and decoded at about the size
/// they're shown (lib/core/images).

const _app = '0b8c3c5e-1f0e-4d47-9a43-1b1c3a6f9e10';
const _file = '5d2e7c1a-8b3f-4e6a-9c0d-2f4a6b8c0d1e';

void main() {
  group('the address a picture is kept under', () {
    test('a signed media link, without its signature', () {
      final a = imageCacheKey(
        'https://yallapp.com.tr/media/v/$_app/$_file/jpg?expires=1700000000&sig=abc',
      );
      final b = imageCacheKey(
        'https://yallapp.com.tr/media/v/$_app/$_file/jpg?expires=1700003600&sig=def',
      );
      expect(a, 'https://yallapp.com.tr/media/v/$_app/$_file/jpg');
      expect(b, a);
    });

    test('what changes the file stays', () {
      expect(
        imageCacheKey(
          'https://h.test/media/v/$_app/$_file/jpg?sig=x&t=42&expires=1&dl=1',
        ),
        'https://h.test/media/v/$_app/$_file/jpg?dl=1&t=42',
      );
    });

    test('other addresses as they are', () {
      for (final url in [
        'https://shop.test/wp-content/uploads/rose.jpg?ver=3&sig=1',
        'https://yallapp.com.tr/m/$_file',
        'https://yallapp.com.tr/api/v1/assets/$_file',
        'https://yallapp.com.tr/flower-photos/tulips.jpg',
      ]) {
        expect(imageCacheKey(url), url);
      }
    });
  });

  group('the size a picture is decoded at', () {
    test('a phone photo in a card: the card, not 4032 px', () {
      // A 120 × 90 pt card at 3 px a point: 360 × 270, in 64 px steps.
      final target = decodeTargetFor(
        BoxConstraints.tight(const Size(120, 90)),
        devicePixelRatio: 3,
      )!;
      expect(target, const DecodeTarget(width: 384, height: 320));
      final size = target.sizeFor(4032, 3024);
      // Covers the box: 427 × 320, about 0.55 MB decoded instead of 48.8 MB.
      expect(size.width, 427);
      expect(size.height, isNull);
      expect(4032 * 3024 * 4 / (427 * 320 * 4), greaterThan(89));
    });

    test('a picture that fits in its box (contain) only fits', () {
      final target = decodeTargetFor(
        BoxConstraints.tight(const Size(100, 100)),
        fit: BoxFit.contain,
        devicePixelRatio: 2,
      )!;
      expect(target.cover, isFalse);
      expect(target.sizeFor(2000, 1000).width, 256);
    });

    test('never bigger than the picture', () {
      const target = DecodeTarget(width: 1280, height: 1280);
      expect(target.sizeFor(800, 1000).width, isNull);
      expect(target.sizeFor(800, 1000).height, isNull);
    });

    test('a loose box: what it bounds, fitted', () {
      // A column 300 pt wide, as tall as the picture wants.
      final target = decodeTargetFor(
        const BoxConstraints(maxWidth: 300),
        devicePixelRatio: 3,
      )!;
      expect(target, const DecodeTarget(width: 960, cover: false));
      expect(target.sizeFor(4000, 3000).width, 960);
    });

    test('its own size, or nothing bounds it: full size', () {
      expect(
        decodeTargetFor(
          BoxConstraints.tight(const Size(50, 50)),
          fit: BoxFit.none,
          devicePixelRatio: 3,
        ),
        isNull,
      );
      expect(
        decodeTargetFor(const BoxConstraints(), devicePixelRatio: 3),
        isNull,
      );
    });

    test('the image\'s own width and height count, as Image applies them', () {
      final target = decodeTargetFor(
        const BoxConstraints(maxWidth: 400, maxHeight: 800),
        width: 34,
        height: 34,
        devicePixelRatio: 3,
      );
      expect(target, const DecodeTarget(width: 128, height: 128));
    });

    test('a bigger box needs a sharper picture; a smaller one doesn\'t', () {
      const card = DecodeTarget(width: 384, height: 320);
      const page = DecodeTarget(width: 1216, height: 1216);
      expect(page.covers(card), isTrue);
      expect(card.covers(page), isFalse);
      expect(card.union(page), page);
      expect(
        const DecodeTarget(
          width: 960,
          cover: false,
        ).union(const DecodeTarget(height: 640, cover: false)),
        isNull,
      );
    });
  });

  group('pictures kept on the phone', () {
    late Directory folder;
    late HttpServer server;
    late Map<String, List<int>> files;
    late List<String> asked;
    var failing = false;

    setUp(() async {
      folder = await Directory.systemTemp.createTemp('yallapp-images');
      files = {
        '/rose.jpg': List.filled(5000, 7),
        '/big.jpg': List.filled(60000, 1),
      };
      asked = [];
      failing = false;
      server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      server.listen((request) async {
        asked.add(request.uri.path);
        final body = files[request.uri.path];
        if (failing || body == null) {
          request.response.statusCode = failing ? 503 : 404;
        } else {
          request.response.add(body);
        }
        await request.response.close();
      });
    });

    tearDown(() async {
      await server.close(force: true);
      await folder.delete(recursive: true);
    });

    String url(String path) => 'http://127.0.0.1:${server.port}$path';

    FileImageStore store({DateTime Function()? now, int? maxBytes}) =>
        FileImageStore(
          folder: Future.value(folder),
          now: now,
          maxBytes: maxBytes ?? 200 * 1024 * 1024,
        );

    Future<void> settle() =>
        Future<void>.delayed(const Duration(milliseconds: 100));

    test(
      'downloaded once, then from the phone (after a restart too)',
      () async {
        final rose = url('/rose.jpg');
        final first = store();
        expect(await first.load(rose, rose), hasLength(5000));
        await settle();
        expect(await first.load(rose, rose), hasLength(5000));
        // The app opened again: a new store, the same folder.
        expect(await store().load(rose, rose), hasLength(5000));
        expect(asked, ['/rose.jpg']);
      },
    );

    test('one download for many boxes at once', () async {
      final rose = url('/rose.jpg');
      final s = store();
      final all = await Future.wait([
        for (var i = 0; i < 6; i++) s.load(rose, rose),
      ]);
      expect(all, everyElement(hasLength(5000)));
      expect(asked, ['/rose.jpg']);
    });

    test(
      'an old copy shows at once and is downloaded again for next time',
      () async {
        final rose = url('/rose.jpg');
        await store().load(rose, rose);
        await settle();
        files['/rose.jpg'] = List.filled(4000, 9);
        final later = store(
          now: () => DateTime.now().add(const Duration(days: 2)),
        );
        final shown = await later.load(rose, rose);
        expect(shown, hasLength(5000), reason: 'the kept copy, no waiting');
        // The new copy is written in the background: wait for it (up to
        // about 5 seconds) instead of a fixed pause, so a busy machine
        // does not fail the test.
        for (var i = 0; i < 50; i++) {
          await settle();
          if ((await store().load(rose, rose)).length == 4000) break;
        }
        expect(asked, ['/rose.jpg', '/rose.jpg']);
        expect(await store().load(rose, rose), hasLength(4000));
      },
    );

    test('offline or failing: the kept copy still shows', () async {
      final rose = url('/rose.jpg');
      await store().load(rose, rose);
      await settle();
      failing = true;
      final later = store(
        now: () => DateTime.now().add(const Duration(days: 9)),
      );
      expect(await later.load(rose, rose), hasLength(5000));
      await settle();
      expect(await store().load(rose, rose), hasLength(5000));
    });

    test('a failed download says so, and nothing is kept', () async {
      final missing = url('/missing.jpg');
      await expectLater(
        store().load(missing, missing),
        throwsA(isA<NetworkImageLoadException>()),
      );
      await settle();
      expect(folder.listSync(), isEmpty);
    });

    test('a broken copy is forgotten', () async {
      final rose = url('/rose.jpg');
      final s = store();
      await s.load(rose, rose);
      await settle();
      await s.forget(rose);
      await s.load(rose, rose);
      expect(asked, ['/rose.jpg', '/rose.jpg']);
    });

    test('Yallapp\'s own pictures stay fresh for 30 days, others a day', () {
      expect(
        FileImageStore.freshFor('https://yallapp.com.tr/api/v1/assets/$_file'),
        const Duration(days: 30),
      );
      expect(
        FileImageStore.freshFor('https://yallapp.com.tr/m/$_file'),
        const Duration(days: 30),
      );
      expect(
        FileImageStore.freshFor(
          'https://yallapp.com.tr/media/v/$_app/$_file/jpg',
        ),
        const Duration(days: 30),
      );
      expect(
        FileImageStore.freshFor('https://shop.test/wp-content/uploads/a.jpg'),
        const Duration(days: 1),
      );
    });

    test('a full folder drops the pictures used least lately', () async {
      final s = store(maxBytes: 100000);
      for (var i = 0; i < 4; i++) {
        files['/p$i.jpg'] = List.filled(30000, i);
      }
      for (var i = 0; i < 4; i++) {
        final u = url('/p$i.jpg');
        await s.load(u, u);
        await settle();
        // Each a minute after the one before.
        final kept = folder
            .listSync()
            .whereType<File>()
            .where((f) => !f.path.endsWith('.part'))
            .firstWhere((f) => f.path.endsWith(FileImageStore.fileNameFor(u)));
        final at = DateTime(2026, 1, 1, 0, i);
        kept
          ..setLastModifiedSync(at)
          ..setLastAccessedSync(at);
      }
      await s.trim();
      final left = folder.listSync().whereType<File>().map((f) => f.path);
      final total = folder.listSync().whereType<File>().fold<int>(
        0,
        (sum, f) => sum + f.lengthSync(),
      );
      expect(total, lessThanOrEqualTo(75000));
      // The newest stays.
      expect(
        left,
        contains(endsWith(FileImageStore.fileNameFor(url('/p3.jpg')))),
      );
      expect(
        left,
        isNot(contains(endsWith(FileImageStore.fileNameFor(url('/p0.jpg'))))),
      );
    });

    test('no folder (tests, a failing phone): downloaded each time', () async {
      final rose = url('/rose.jpg');
      final s = FileImageStore(folder: Future.value(null));
      await s.load(rose, rose);
      await s.load(rose, rose);
      expect(asked, ['/rose.jpg', '/rose.jpg']);
    });

    test('file names: stable, 16 hex digits, different for each address', () {
      final a = FileImageStore.fileNameFor('https://a.test/1.jpg');
      expect(a, matches(RegExp(r'^[0-9a-f]{16}$')));
      expect(FileImageStore.fileNameFor('https://a.test/1.jpg'), a);
      final names = {
        for (var i = 0; i < 5000; i++)
          FileImageStore.fileNameFor('https://a.test/$i.jpg'),
      };
      expect(names, hasLength(5000));
    });
  });

  test('the progress of a download is told', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    addTearDown(() => server.close(force: true));
    server.listen((request) async {
      request.response.contentLength = 3000;
      request.response.add(Uint8List(3000));
      await request.response.close();
    });
    final u = 'http://127.0.0.1:${server.port}/x.jpg';
    final seen = <int?>[];
    final s = FileImageStore(folder: Future.value(null));
    await s.load(u, u, onProgress: (loaded, total) => seen.add(total));
    expect(seen, isNotEmpty);
    expect(seen.last, 3000);
  });
}
