import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/providers.dart';
import 'package:yallapp/modules/lms/downloads/chunk_cipher.dart';
import 'package:yallapp/modules/lms/downloads/download_backend_io.dart';
import 'package:yallapp/modules/lms/downloads/download_keys.dart';
import 'package:yallapp/modules/lms/downloads/download_manager.dart';
import 'package:yallapp/modules/lms/downloads/download_models.dart';
import 'package:yallapp/modules/lms/downloads/lesson_snapshot.dart';
import 'package:yallapp/modules/lms/downloads/progress_queue.dart';

import '../support/fake_api.dart';
import '../support/fake_downloads.dart';
import '../support/fixtures.dart';

/// 45 A video lesson that can be saved.
Map<String, dynamic> savableLesson({
  int id = 107,
  bool available = true,
  String? reason,
}) => {
  ...videoLessonJson(),
  'id': id,
  'html':
      '<p>Notes</p><p><img src="https://your-academy.com/a.png?x=1&y=2"></p>',
  'attachments': [
    {
      'name': 'Slides.pdf',
      'url': 'https://your-academy.com/slides.pdf',
      'size_bytes': 4,
      'mime_type': 'application/pdf',
    },
  ],
  'offline': {'available': available, 'reason': reason, 'size_bytes': 30},
};

Map<String, dynamic> package(int id, {String suffix = ''}) => {
  'lesson_id': id,
  'course_id': 1,
  'files': [
    {'kind': 'video', 'url': 'https://dl.test/video$id$suffix'},
    {
      'kind': 'attachment',
      'url': 'https://dl.test/slides$id$suffix',
      'source_url': 'https://your-academy.com/slides.pdf',
      'name': 'Slides.pdf',
      'mime_type': 'application/pdf',
    },
    {
      'kind': 'image',
      'url': 'https://your-academy.com/a.png?x=1&y=2',
      'source_url': 'https://your-academy.com/a.png?x=1&y=2',
    },
  ],
  'expires_at': fromNow(const Duration(minutes: 15)),
  'keep_days': 30,
};

class Harness {
  Harness({FakeDownloadBackend? backend, DateTime? now})
    : backend = backend ?? FakeDownloadBackend(),
      api = FakeApi() {
    clock = now ?? DateTime.utc(2026, 10, 19, 9);
    container = ProviderContainer(
      overrides: [
        yallappApiProvider.overrideWithValue(api),
        downloadBackendProvider.overrideWithValue(this.backend),
        downloadClockProvider.overrideWithValue(() => clock),
      ],
    );
  }

  final FakeDownloadBackend backend;
  final FakeApi api;
  late DateTime clock;
  late final ProviderContainer container;

  DownloadManager get manager =>
      container.read(downloadManagerProvider.notifier);
  DownloadsState get state => container.read(downloadManagerProvider);

  Future<void> idle() async {
    for (var i = 0; i < 40; i++) {
      await Future<void>.delayed(Duration.zero);
    }
    await manager.flushWrites();
  }

  Future<void> save(Map<String, dynamic> json) async {
    api.lessons[json['id'] as int] = json;
    api.downloads[json['id'] as int] = package(json['id'] as int);
    await manager.saveLesson(
      Lesson.fromJson(json),
      courseTitle: 'UI Design Fundamentals',
    );
    await idle();
  }
}

void main() {
  group('ChunkCipher', () {
    final cipher = ChunkCipher(chunkSize: 16);

    test('seals and opens files of every size with the stored key', () async {
      final keys = MemoryDownloadKeyStore();
      for (final size in [0, 1, 15, 16, 17, 100]) {
        final plain = Uint8List.fromList(List.generate(size, (i) => i % 251));
        final sealed = await cipher.seal(await keys.key(), plain);
        expect(sealed.length, ChunkCipher.sealedLength(size, 16));
        if (size >= 16) {
          // The plain bytes aren't in the file.
          final text = sealed.sublist(
            ChunkCipher.headerLength + 12,
            ChunkCipher.headerLength + 28,
          );
          expect(text, isNot(plain.sublist(0, 16)));
        }
        expect(await cipher.open(await keys.key(), sealed), plain);
      }
    });

    test('refuses a changed byte, another key and swapped chunks', () async {
      final key = SecretKey(ChunkCipher.newKey());
      final plain = List.generate(40, (i) => i);
      final sealed = await cipher.seal(key, plain);
      final changed = Uint8List.fromList(sealed)..[30] ^= 1;
      await expectLater(
        cipher.open(key, changed),
        throwsA(isA<SecretBoxAuthenticationError>()),
      );
      await expectLater(
        cipher.open(SecretKey(ChunkCipher.newKey()), sealed),
        throwsA(isA<SecretBoxAuthenticationError>()),
      );
      // The first two chunks swapped.
      final a = ChunkCipher.chunkOffset(0, 16);
      final b = ChunkCipher.chunkOffset(1, 16);
      final c = ChunkCipher.chunkOffset(2, 16);
      final swapped = Uint8List.fromList([
        ...sealed.sublist(0, a),
        ...sealed.sublist(b, c),
        ...sealed.sublist(a, b),
        ...sealed.sublist(c),
      ]);
      await expectLater(
        cipher.open(key, swapped),
        throwsA(isA<SecretBoxAuthenticationError>()),
      );
      // Cut short.
      await expectLater(
        cipher.open(key, sealed.sublist(0, sealed.length - 1)),
        throwsA(isA<SecretBoxAuthenticationError>()),
      );
    });

    test('a forgotten key makes a new one: old files no longer open', () async {
      final keys = MemoryDownloadKeyStore();
      final sealed = await cipher.seal(await keys.key(), [1, 2, 3]);
      await keys.forget();
      await expectLater(
        cipher.open(await keys.key(), sealed),
        throwsA(isA<SecretBoxAuthenticationError>()),
      );
    });
  });

  group('the phone backend', () {
    late Directory dir;
    late IoDownloadBackend backend;

    setUp(() async {
      dir = await Directory.systemTemp.createTemp('yallapp-downloads');
      backend = IoDownloadBackend(
        MemoryDownloadKeyStore(),
        root: Directory('${dir.path}/root'),
        cache: Directory('${dir.path}/cache'),
        cipher: ChunkCipher(chunkSize: 1024),
      );
    });

    tearDown(() => dir.delete(recursive: true));

    test(
      'seals a downloaded file, deletes the plain copy, keeps nothing readable',
      () async {
        final plain = List.generate(5000, (i) => (i * 7) % 256);
        final source = File('${dir.path}/download.tmp')
          ..writeAsBytesSync(plain);
        final key = ChunkCipher.newKey();
        final target = '${dir.path}/sealed.bin';
        expect(await sealFileSync(source.path, target, key, 1024), 5000);
        expect(source.existsSync(), isFalse);
        final sealed = File(target).readAsBytesSync();
        expect(sealed.length, ChunkCipher.sealedLength(5000, 1024));
        expect(
          await ChunkCipher(chunkSize: 1024).open(SecretKey(key), sealed),
          plain,
        );
      },
    );

    test(
      'serves a saved video by ranges to this app only, decrypting as it reads',
      () async {
        final plain = List.generate(5000, (i) => (i * 13) % 256);
        final temp = File('${dir.path}/v.tmp')..writeAsBytesSync(plain);
        expect(await backend.sealFile(temp.path, 'l1_0'), 5000);
        final stored = File('${dir.path}/root/l1_0').readAsBytesSync();
        expect(stored.length, greaterThan(5000));
        final url = (await backend.serve('l1_0', mimeType: 'video/mp4'))!;
        expect(url, startsWith('http://127.0.0.1:'));
        final client = HttpClient();
        addTearDown(client.close);

        Future<(int, List<int>, String?)> get(
          String address, [
          String? range,
        ]) async {
          final request = await client.getUrl(Uri.parse(address));
          if (range != null) request.headers.set('range', range);
          final response = await request.close();
          final body = await response.fold<List<int>>(
            [],
            (a, b) => a..addAll(b),
          );
          return (
            response.statusCode,
            body,
            response.headers.value('content-range'),
          );
        }

        final whole = await get(url);
        expect(whole.$1, 200);
        expect(whole.$2, plain);
        final middle = await get(url, 'bytes=1000-3071');
        expect(middle.$1, 206);
        expect(middle.$3, 'bytes 1000-3071/5000');
        expect(middle.$2, plain.sublist(1000, 3072));
        final tail = await get(url, 'bytes=-10');
        expect(tail.$2, plain.sublist(4990));
        expect((await get(url, 'bytes=6000-')).$1, 416);
        // Another path (no token) gets nothing.
        final other = Uri.parse(url).replace(path: '/l1_0').toString();
        expect((await get(other)).$1, 404);
      },
    );

    test(
      'keeps the index and small files sealed, and deletes everything',
      () async {
        await backend.writeIndex('{"title":"Ders · درس"}');
        expect(await backend.readIndex(), '{"title":"Ders · درس"}');
        final raw = File('${dir.path}/root/index.bin').readAsBytesSync();
        expect(
          utf8.decode(raw, allowMalformed: true),
          isNot(contains('title')),
        );
        await backend.sealBytes('l1.json', Uint8List.fromList([1, 2, 3]));
        expect(await backend.openBytes('l1.json'), [1, 2, 3]);
        await backend.deleteAll();
        expect(await backend.readIndex(), isNull);
      },
    );
  });

  group('the download manager', () {
    test(
      'saves a lesson: queued, downloading, then done, every file sealed',
      () async {
        final h = Harness();
        final states = <SavedStatus>[];
        h.container.listen(
          downloadManagerProvider.select((s) => s.lesson(107)?.status),
          (_, next) {
            if (next != null && (states.isEmpty || states.last != next)) {
              states.add(next);
            }
          },
        );
        await h.manager.ready;
        await h.save(savableLesson());
        expect(states, [
          SavedStatus.queued,
          SavedStatus.downloading,
          SavedStatus.done,
        ]);
        final saved = h.state.lesson(107)!;
        expect(saved.files.map((f) => f.kind), [
          DownloadFileKind.video,
          DownloadFileKind.attachment,
          DownloadFileKind.image,
        ]);
        expect(saved.bytes, 30);
        expect(h.state.index.courses[1]!.title, 'UI Design Fundamentals');
        expect(h.state.index.checkedAt, h.clock);
        expect(
          h.backend.stored.keys,
          containsAll(['l107_0', 'l107_1', 'l107_2', 'l107.json', 'index.bin']),
        );
        // Sealed: the lesson's text isn't in the stored file.
        expect(
          utf8.decode(h.backend.stored['l107.json']!, allowMalformed: true),
          isNot(contains('Notes')),
        );
        // The last file says the lessons are saved.
        expect(h.backend.requests.map((r) => r.notifyWhenDone), [
          false,
          false,
          true,
        ]);
        expect(h.backend.requests.every((r) => r.wifiOnly), isTrue);

        // A new start reads the sealed index back.
        final again = Harness(backend: h.backend);
        await again.manager.ready;
        expect(again.state.isSaved(107), isTrue);
      },
    );

    test('opens a saved lesson without a connection, with its saved files in place', () async {
      final h = Harness();
      await h.manager.ready;
      await h.save(savableLesson());
      final lesson = (await h.manager.offlineLesson(107))!;
      expect(lesson.video!.url, 'http://127.0.0.1:9/saved/l107_0');
      expect(lesson.video!.source, VideoSource.upload);
      expect(lesson.html, contains('http://127.0.0.1:9/saved/l107_2'));
      expect(lesson.html, isNot(contains('your-academy.com/a.png')));
      expect(lesson.attachments.single.url, '$savedFileScheme:l107_1');
      expect(await h.manager.openSaved(lesson.attachments.single.url), isTrue);
      expect(h.backend.opened, ['Slides.pdf']);
    });

    test(
      'a lesson whose video plays from a video site says it needs the internet',
      () async {
        final h = Harness();
        await h.manager.ready;
        final lesson = Lesson.fromJson(
          savableLesson(available: false, reason: 'video_site'),
        );
        await expectLater(
          h.manager.saveLesson(lesson, courseTitle: 'C'),
          throwsA(
            isA<DownloadRefused>().having(
              (e) => e.message,
              'message',
              contains('video site'),
            ),
          ),
        );
        expect(h.state.index.isEmpty, isTrue);
      },
    );

    test('pauses, resumes and cancels a download', () async {
      final h = Harness();
      await h.manager.ready;
      h.backend.hold = true;
      await h.save(savableLesson());
      expect(h.state.lesson(107)!.status, SavedStatus.downloading);
      expect(h.state.lesson(107)!.progress, closeTo(0.5 / 3, 0.01));
      await h.manager.pause(107);
      await h.idle();
      expect(h.state.lesson(107)!.status, SavedStatus.paused);
      await h.manager.resume(107);
      await h.idle();
      expect(h.state.lesson(107)!.status, SavedStatus.downloading);
      h.backend.release();
      await h.idle();
      expect(h.state.isSaved(107), isTrue);

      // Cancelled while downloading: nothing is kept.
      h.backend.hold = true;
      await h.save(savableLesson(id: 108));
      expect(h.state.lesson(108)!.status, SavedStatus.downloading);
      await h.manager.delete(108);
      await h.idle();
      expect(h.state.lesson(108), isNull);
      expect(h.backend.stored.keys.where((k) => k.startsWith('l108')), isEmpty);
    });

    test('asks for new links once when they expired', () async {
      final h = Harness();
      await h.manager.ready;
      h.backend.failing['https://dl.test/video107'] = true;
      h.api.lessons[107] = savableLesson();
      h.api.downloads[107] = package(107);
      await h.manager.saveLesson(
        Lesson.fromJson(savableLesson()),
        courseTitle: 'C',
      );
      // The second ask gives new addresses.
      await Future<void>.delayed(Duration.zero);
      h.api.downloads[107] = package(107, suffix: '-new');
      await h.idle();
      expect(h.api.count('downloadLesson'), 2);
      expect(h.state.isSaved(107), isTrue);
      expect(
        h.backend.requests.map((r) => r.url),
        contains('https://dl.test/video107-new'),
      );
    });

    test('a failed download says so and can be tried again', () async {
      final h = Harness();
      await h.manager.ready;
      h.backend.failing['https://dl.test/video107'] = false;
      await h.save(savableLesson());
      expect(h.state.lesson(107)!.status, SavedStatus.failed);
      expect(
        h.state.lesson(107)!.error,
        "The download didn't finish. Try again.",
      );
      await h.manager.resume(107);
      await h.idle();
      expect(h.state.isSaved(107), isTrue);
    });

    test('saves a whole course, skipping locked lessons and those that need the internet', () async {
      final h = Harness();
      await h.manager.ready;
      final topics = [
        Topic.fromJson({
          'id': 1,
          'title': 'One',
          'items': [
            for (final (id, locked) in [
              (301, false),
              (302, false),
              (303, true),
            ])
              {
                'id': id,
                'type': 'lesson',
                'title': 'Lesson $id',
                'locked': locked,
                'completed': false,
              },
            {
              'id': 304,
              'type': 'quiz',
              'title': 'Quiz',
              'locked': false,
              'completed': false,
            },
          ],
        }),
      ];
      h.api.lessons[301] = savableLesson(id: 301);
      h.api.lessons[302] = savableLesson(
        id: 302,
        available: false,
        reason: 'video_site',
      );
      h.api.downloads[301] = package(301);
      final added = await h.manager.saveCourse(
        CourseDetail.fromJson(
          courseDetailJson(enrolled: true, action: 'continue'),
        ),
        topics,
      );
      expect(added, 2);
      await h.idle();
      expect(h.state.isSaved(301), isTrue);
      expect(h.state.lesson(302), isNull);
      expect(h.state.lesson(303), isNull);
      expect(h.state.notice, contains("1 lesson wasn't saved"));
      expect(h.state.course(1), (saved: 1, total: 1, active: false, bytes: 30));
    });

    test(
      'deletes lessons whose access ended, at the next start online',
      () async {
        final h = Harness();
        await h.manager.ready;
        await h.save(savableLesson());
        await h.save(savableLesson(id: 108));
        h.api.refusedDownloads.add(108);
        h.clock = h.clock.add(const Duration(days: 3));
        await h.manager.verify(downloadsOn: true);
        await h.idle();
        expect(h.state.isSaved(107), isTrue);
        expect(h.state.lesson(108), isNull);
        expect(
          h.backend.stored.keys.where((k) => k.startsWith('l108')),
          isEmpty,
        );
        expect(
          h.state.notice,
          '1 saved lesson was deleted because your access to it ended.',
        );
        expect(h.state.index.checkedAt, h.clock);
      },
    );

    test('deletes everything when downloads are turned off', () async {
      final h = Harness();
      await h.manager.ready;
      await h.save(savableLesson());
      await h.manager.verify(downloadsOn: false);
      await h.idle();
      expect(h.state.index.isEmpty, isTrue);
      expect(h.backend.stored.keys.where((k) => k != 'index.bin'), isEmpty);
      expect(h.state.notice, contains('no longer available'));

      await h.save(savableLesson());
      h.api.downloadsOn = false;
      await h.manager.verify(downloadsOn: true);
      expect(h.state.index.isEmpty, isTrue);
    });

    test('keeps saved lessons offline for 30 days without a check, then deletes them', () async {
      final h = Harness();
      await h.manager.ready;
      await h.save(savableLesson());
      h.api.failures['checkDownloads'] = const ApiException(
        code: ApiException.networkError,
        message: 'offline',
      );
      h.clock = h.clock.add(const Duration(days: 29));
      await h.manager.verify(downloadsOn: true);
      expect(h.state.isSaved(107), isTrue);
      expect(h.state.index.daysLeft(h.clock), 1);
      expect(await h.manager.offlineLesson(107), isNotNull);

      h.clock = h.clock.add(const Duration(days: 2));
      expect(await h.manager.offlineLesson(107), isNull);
      expect(h.state.index.isEmpty, isTrue);
      expect(
        h.state.notice,
        contains("couldn't check your access for 30 days"),
      );
    });

    test('the backend on the web saves nothing', () async {
      final h = Harness(backend: FakeDownloadBackend(supported: false));
      await h.manager.ready;
      await h.manager.saveLesson(
        Lesson.fromJson(savableLesson()),
        courseTitle: 'C',
      );
      expect(h.state.supported, isFalse);
      expect(h.state.index.isEmpty, isTrue);
    });
  });

  group('the saved lesson', () {
    test('keeps the contract shape, without the signed video link', () {
      final lesson = Lesson.fromJson(savableLesson());
      final json = lessonToJson(lesson);
      expect((json['video'] as Map)['url'], isNull);
      final back = Lesson.fromJson(
        jsonDecode(jsonEncode(json)) as Map<String, dynamic>,
      );
      expect(back.title, lesson.title);
      expect(back.attachments.single.name, 'Slides.pdf');
      expect(back.video!.durationSeconds, 750);
    });
  });

  group('progress made offline', () {
    late ProgressQueue queue;
    late FakeApi api;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      queue = ProgressQueue(await SharedPreferences.getInstance());
      api = FakeApi();
    });

    test('keeps the latest place and the highest share per lesson', () async {
      await queue.addProgress(7, positionSeconds: 100, watchedPercent: 40);
      await queue.addProgress(7, positionSeconds: 20, watchedPercent: 10);
      await queue.addComplete(7);
      await queue.addComplete(7);
      expect(
        queue.items.map(
          (i) => (i.lessonId, i.complete, i.positionSeconds, i.watchedPercent),
        ),
        [(7, false, 20, 40.0), (7, true, 0, 0.0)],
      );
      expect(queue.completedOffline(7), isTrue);
    });

    test('sends places first, then completions, when back online', () async {
      await queue.addComplete(7);
      await queue.addProgress(7, positionSeconds: 300, watchedPercent: 90);
      expect(await queue.flush(api), 2);
      expect(api.calls, ['saveLessonProgress', 'completeLesson']);
      expect(api.savedProgress, [(300, 90.0)]);
      expect(queue.isEmpty, isTrue);
    });

    test('waits while offline and drops what the server refuses', () async {
      await queue.addProgress(7, positionSeconds: 30, watchedPercent: 5);
      await queue.addComplete(8);
      api.failures['saveLessonProgress'] = const ApiException(
        code: ApiException.networkError,
        message: 'offline',
      );
      expect(await queue.flush(api), 0);
      expect(queue.items, hasLength(2));
      api.failures['completeLesson'] = const ApiException(
        code: 'not_enrolled',
        message: 'No',
        statusCode: 403,
      );
      expect(await queue.flush(api), 1);
      expect(queue.isEmpty, isTrue);
    });
  });

  group('a finished course', () {
    CourseDetail course({
      Map<String, dynamic>? progress,
      bool enrolled = true,
    }) => CourseDetail.fromJson({
      ...courseDetailJson(enrolled: enrolled, action: 'continue'),
      'progress': ?progress,
    });

    List<Topic> topics(List<bool> done) => [
      Topic.fromJson({
        'id': 1,
        'title': 'T',
        'items': [
          for (final (i, d) in done.indexed)
            {
              'id': i,
              'type': 'lesson',
              'title': 'L$i',
              'locked': false,
              'completed': d,
            },
          {
            'id': 99,
            'type': 'assignment',
            'title': 'A',
            'locked': false,
            'completed': false,
          },
        ],
      }),
    ];

    test("follows the server's progress, else every lesson and quiz done", () {
      final done = {
        'course_id': 1,
        'completed_items': 3,
        'total_items': 3,
        'percent': 100,
        'course_completed': true,
        'completed_at': '2026-10-12T09:30:00Z',
      };
      expect(courseFinished(course(progress: done), null), isTrue);
      expect(
        course(progress: done).progress!.completedAt,
        DateTime.utc(2026, 10, 12, 9, 30),
      );
      expect(
        courseFinished(
          course(progress: {...done, 'course_completed': false}),
          topics([true, true]),
        ),
        isFalse,
      );
      // An older server: the curriculum decides; assignments don't count.
      expect(courseFinished(course(), topics([true, true])), isTrue);
      expect(courseFinished(course(), topics([true, false])), isFalse);
      expect(courseFinished(course(), null), isFalse);
      expect(
        courseFinished(course(enrolled: false), topics([true, true])),
        isFalse,
      );
    });
  });
}
