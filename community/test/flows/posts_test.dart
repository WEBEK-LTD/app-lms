import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/finders.dart';
import '../support/test_app.dart';

// 232.1 posts and the home feed; 232.2 stories.
void main() {
  testWidgets('Home mixes posts and questions; Following shows followed '
      'members only', (tester) async {
    final app = await TestApp.start(tester);
    expect(key('post-p-runway'), findsOneWidget);
    await tester.scrollUntilVisible(
      key('post-q-product-page'),
      300,
      scrollable: find
          .descendant(of: key('home-list'), matching: find.byType(Scrollable))
          .first,
    );
    expect(key('post-q-product-page'), findsOneWidget);
    expect(app.posts.calls, contains('feed:for_you'));

    await tap(tester, 'feed-tab-following');
    expect(app.posts.calls, contains('feed:following'));
    expect(key('post-p-runway'), findsOneWidget);
    expect(key('post-p-links'), findsNothing);
    expect(key('post-q-product-page'), findsNothing);
  });

  testWidgets('like and save change at once and reach the API', (tester) async {
    final app = await TestApp.start(tester);
    await tap(tester, 'post-like-p-runway');
    expect(find.text('129'), findsOneWidget);
    await tap(tester, 'post-save-p-runway');
    await tap(tester, 'post-like-p-runway');
    expect(find.text('128'), findsOneWidget);
    expect(app.posts.calls, [
      'feed:for_you',
      'like:p-runway',
      'save:p-runway',
      'unlike:p-runway',
    ]);
  });

  testWidgets('a post page: comment, then reply to a comment', (tester) async {
    final app = await TestApp.start(tester);
    await tap(tester, 'post-comments-p-runway');
    expect(key('comment-field'), findsOneWidget);
    expect(key('comment-c-1'), findsOneWidget);
    expect(key('comment-c-2'), findsOneWidget);

    await tester.enterText(key('comment-field'), 'Nice work');
    await tap(tester, 'comment-send');
    expect(app.posts.calls, contains('comment:p-runway:'));
    expect(find.text('Nice work'), findsOneWidget);

    await tap(tester, 'comment-reply-c-1');
    expect(find.text('Replying to Karim Samy'), findsOneWidget);
    await tester.enterText(key('comment-field'), 'Thanks');
    await tap(tester, 'comment-send');
    expect(app.posts.calls, contains('comment:p-runway:c-1'));
  });

  testWidgets('report a post from its menu', (tester) async {
    await TestApp.start(tester);
    await tap(tester, 'post-more-p-runway');
    await tap(tester, 'post-report');
    expect(key('report-sheet'), findsOneWidget);
  });

  testWidgets('+ → Write a post: words and photos, then it leads the feed', (
    tester,
  ) async {
    final app = await TestApp.start(tester);
    await tap(tester, 'tab-create');
    await tap(tester, 'create-post');
    expect(key('composer-text'), findsOneWidget);
    await tester.enterText(key('composer-text'), 'My first post');
    await tap(tester, 'composer-photos');
    expect(key('composer-photo-1'), findsOneWidget);
    await tap(tester, 'composer-post');
    expect(app.posts.calls, contains('create:2:false'));
    expect(key('composer-text'), findsNothing);
    expect(find.text('My first post'), findsOneWidget);
  });

  testWidgets('stories: watch a ring, then add your own', (tester) async {
    final app = await TestApp.start(tester);
    expect(key('story-row'), findsOneWidget);
    await tap(tester, 'story-m-nour');
    expect(key('story-viewer'), findsOneWidget);
    expect(app.posts.calls, contains('view:s-nour-1'));
    await tap(tester, 'story-close');
    expect(key('story-viewer'), findsNothing);

    await tap(tester, 'story-mine');
    await tap(tester, 'story-add-photo');
    expect(app.posts.calls, contains('story:photo'));
  });

  testWidgets('the feed in dark, Arabic: right to left', (tester) async {
    await TestApp.start(tester, language: 'ar', theme: ThemeMode.dark);
    expect(find.text('لك'), findsOneWidget);
    expect(key('post-p-runway'), findsOneWidget);
  });
}
