import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/services/media_picker.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

void main() {
  group('Catalog', () {
    testWidgets('a restaurant\'s menu: sold out, and a price with its rules', (
      tester,
    ) async {
      final app = TestApp();
      await app.pump(tester);
      await go(tester, app, '/catalog');
      expect(find.text('Menu'), findsOneWidget);
      expect(find.text('Kunafa'), findsOneWidget);
      expect(find.text('Sold out'), findsOneWidget);

      // Shawarma sold out.
      await tapOn(tester, find.byType(Switch).first);
      expect(app.api.calls, contains('updateProduct'));
      expect(find.text('Sold out'), findsNWidgets(2));

      await tapOn(tester, find.text('Falafel plate'));
      await tester.enterText(
        find.widgetWithText(TextField, 'Sale price (TRY)'),
        '150',
      );
      await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
      expect(
        find.text('The sale price must be lower than the price.'),
        findsOneWidget,
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Sale price (TRY)'),
        '',
      );
      await tester.enterText(find.widgetWithText(TextField, 'Stock'), '');
      await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
      expect(find.text('Saved'), findsOneWidget);
      expect(find.textContaining('₺120.00 · No stock limit'), findsOneWidget);
    });

    testWidgets('courses: publish, and add a lesson with a video from Media', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.academyId);
      await app.pump(tester);
      await go(tester, app, '/catalog');
      expect(find.text('Arabic for beginners'), findsOneWidget);
      expect(find.text('Draft'), findsOneWidget);
      await tapOn(tester, find.byType(Switch).last);
      expect(find.text('Draft'), findsNothing);

      await tapOn(tester, find.text('First words'));
      await tapOn(tester, find.text('Add a lesson'));
      await tapOn(tester, find.widgetWithText(FilledButton, 'Add a lesson'));
      expect(
        find.text('Give the lesson a title of 2 to 120 characters.'),
        findsOneWidget,
      );
      expect(find.text('Add a video or some text.'), findsOneWidget);

      await tester.enterText(
        find.widgetWithText(TextField, 'Lesson title'),
        'Greetings',
      );
      await tapOn(tester, find.text('Choose from Media'));
      await tapOn(tester, find.text('alphabet.mp4'));
      await tester.enterText(
        find.widgetWithText(TextField, 'Minutes (optional)'),
        '8',
      );
      await tapOn(tester, find.widgetWithText(FilledButton, 'Add a lesson'));
      expect(find.text('“Greetings” added'), findsOneWidget);
      final course = (await app.api.courses(FakeOwnerApi.academyId)).first;
      final lesson = course.topics[1].lessons.single;
      expect(lesson.mediaId, 'e0000000-0000-4000-8000-000000000001');
      expect(lesson.durationMinutes, 8);
    });

    testWidgets('a lesson with a video recorded now', (tester) async {
      final app = TestApp(appId: FakeOwnerApi.academyId);
      await app.pump(tester);
      await push(tester, app, '/lesson?course=61&topic=602');
      app.picker.next = MemoryFile('lesson.mp4', 'video/mp4', 6 * 1024 * 1024);
      await tapOn(tester, find.text('Record or upload'));
      await tapOn(tester, find.text('Record a video'));
      expect(app.picker.sources, [PickSource.cameraVideo]);
      expect(find.text('lesson.mp4'), findsOneWidget);
      expect(find.text('lesson.mp4 is in Media'), findsOneWidget);
    });

    testWidgets('articles: publish and feature', (tester) async {
      final app = TestApp(appId: FakeOwnerApi.newsId);
      await app.pump(tester);
      await go(tester, app, '/catalog');
      await tapOn(tester, find.byTooltip('More actions').last);
      await tapOn(tester, find.text('Publish'));
      expect(find.text('Draft'), findsNothing);
      await tapOn(tester, find.byTooltip('More actions').last);
      await tapOn(tester, find.text('Feature'));
      expect(find.text('Featured'), findsNWidgets(2));
    });

    testWidgets('listings: archive', (tester) async {
      final app = TestApp(appId: FakeOwnerApi.homesId);
      await app.pump(tester);
      await go(tester, app, '/catalog');
      expect(find.text('Sea-view flat in Beşiktaş'), findsOneWidget);
      await tapOn(tester, find.byTooltip('More actions').first);
      await tapOn(tester, find.text('Archive'));
      expect(find.text('Archived'), findsOneWidget);
    });
  });

  group('Media', () {
    testWidgets('the storage meter, read-only, and the files', (tester) async {
      final app = TestApp();
      await app.pump(tester);
      await push(tester, app, '/media');
      expect(find.text('0.0 GB of 20 GB used'), findsOneWidget);
      expect(find.text('menu-cover.jpg'), findsOneWidget);
      await tapOn(tester, find.text('Manage on yallapp.com.tr'));
      expect(app.opened, ['https://yallapp.com.tr/dashboard/media']);
      await tapOn(tester, find.widgetWithText(ChoiceChip, 'Videos'));
      expect(find.text('menu-cover.jpg'), findsNothing);
      expect(find.text('kitchen-tour.mp4'), findsOneWidget);
    });

    testWidgets('upload from the gallery in chunks', (tester) async {
      final app = TestApp();
      await app.pump(tester);
      await push(tester, app, '/media');
      app.picker.next = MemoryFile('dish.jpg', 'image/jpeg', 12 * 1024 * 1024);
      await tapOn(tester, find.text('Upload'));
      await tapOn(tester, find.text('Choose from the gallery'));
      expect(find.text('dish.jpg is in Media'), findsOneWidget);
      expect(find.text('dish.jpg'), findsOneWidget);
      expect(
        app.api.calls,
        containsAllInOrder(['startUpload', 'completeUpload']),
      );
    });

    testWidgets('a stopped upload carries on from where the gate is', (
      tester,
    ) async {
      final app = TestApp();
      await app.pump(tester);
      await push(tester, app, '/media');
      app.api.failChunksAt.add(5 * 1024 * 1024); // the second chunk
      app.picker.next = MemoryFile('tour.mp4', 'video/mp4', 12 * 1024 * 1024);
      await tapOn(tester, find.text('Upload'));
      await tapOn(tester, find.text('Record a video'));
      expect(find.text('Resume'), findsOneWidget);
      expect(find.text('42%'), findsOneWidget);
      await tapOn(tester, find.text('Resume'));
      expect(app.api.calls, contains('resumeUpload'));
      expect(find.text('tour.mp4'), findsOneWidget);
      expect(find.text('Upload not finished'), findsNothing);
      expect(find.text('Resume'), findsNothing);
      expect(app.api.uploads, isEmpty);
    });

    testWidgets('delete a file after asking', (tester) async {
      final app = TestApp();
      await app.pump(tester);
      await push(tester, app, '/media');
      await tapOn(tester, find.byTooltip('More actions').first);
      await tapOn(tester, find.text('Delete'));
      expect(find.text('Delete menu-cover.jpg?'), findsOneWidget);
      await tapOn(tester, find.widgetWithText(FilledButton, 'Delete'));
      expect(find.text('menu-cover.jpg'), findsNothing);
    });

    testWidgets('an app whose plan ended can\'t upload', (tester) async {
      final api = FakeOwnerApi();
      final app = TestApp(api: api, appId: FakeOwnerApi.academyId);
      await app.pump(tester);
      api.apps = [
        for (final a in api.apps)
          a.id == FakeOwnerApi.academyId ? expire(a) : a,
      ];
      await push(tester, app, '/media');
      app.picker.next = MemoryFile('x.jpg', 'image/jpeg', 100);
      await tapOn(tester, find.text('Upload'));
      await tapOn(tester, find.text('Take a photo'));
      expect(
        find.text("Uploads start once the app's plan is active."),
        findsOneWidget,
      );
    });
  });
}
