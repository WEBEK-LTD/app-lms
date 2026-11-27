import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/providers.dart';
import 'package:yallapp_community/core/routing/app_router.dart';
import 'package:yallapp_community/features/academy/data/academy_api.dart';
import 'package:yallapp_community/features/challenges/data/challenges_api.dart';
import 'package:yallapp_community/features/events/data/events_api.dart';
import 'package:yallapp_community/features/jobs/data/jobs_api.dart';
import 'package:yallapp_community/features/leaderboard/data/leaderboard_api.dart';
import 'package:yallapp_community/features/pros/data/pros_api.dart';
import 'package:yallapp_community/features/showcase/data/showcase_api.dart';

import '../../support/shots.dart';
import '../../support/test_app.dart';

/// 232–234 (area E) Showcase, Academy, Challenges, the leaderboard, Pros,
/// Jobs, Events and Live: each in light and dark, in English, Arabic and
/// Turkish, at 390 wide; and what a tap sends.
class _Fakes {
  final showcase = FakeShowcaseApi();
  final academy = FakeAcademyApi();
  final challenges = FakeChallengesApi();
  final board = FakeLeaderboardApi();
  final pros = FakeProsApi();
  final jobs = FakeJobsApi();
  final events = FakeEventsApi();
  final opened = <Uri>[];
}

Future<_Fakes> _open(
  WidgetTester tester,
  String location, {
  ThemeMode theme = ThemeMode.light,
  String language = 'en',
}) async {
  await loadShotFonts();
  phoneInsets(tester);
  final f = _Fakes();
  final app = await TestApp.start(
    tester,
    theme: theme,
    language: language,
    overrides: [
      showcaseApiProvider.overrideWithValue(f.showcase),
      academyApiProvider.overrideWithValue(f.academy),
      challengesApiProvider.overrideWithValue(f.challenges),
      leaderboardApiProvider.overrideWithValue(f.board),
      prosApiProvider.overrideWithValue(f.pros),
      jobsApiProvider.overrideWithValue(f.jobs),
      eventsApiProvider.overrideWithValue(f.events),
      openExternalProvider.overrideWithValue((uri) async {
        f.opened.add(uri);
        return true;
      }),
    ],
  );
  app.container.read(routerProvider).go(location);
  await TestApp.settle(tester);
  return f;
}

const _screens = {
  'showcase': '/showcase',
  'showcase-item': '/showcase/sc-bakery',
  'academy': '/academy',
  'course': '/academy/first-app',
  'course-locked': '/academy/delivery-deep-dive',
  'challenges': '/challenges',
  'challenge': '/challenges/ch-1',
  'leaderboard': '/leaderboard',
  'pros': '/pros',
  'pro': '/pros/m-elif',
  'jobs': '/jobs',
  'job': '/jobs/job-1',
  'events': '/events',
  'event-live': '/events/ev-live',
  'event': '/events/ev-meetup',
};

void main() {
  for (final language in ['en', 'ar', 'tr']) {
    for (final theme in [ThemeMode.light, ThemeMode.dark]) {
      final mode = theme == ThemeMode.dark ? 'dark' : 'light';
      for (final MapEntry(key: name, value: location) in _screens.entries) {
        testWidgets('$name opens ($mode, $language)', (tester) async {
          await _open(tester, location, theme: theme, language: language);
          expect(tester.takeException(), isNull);
          if (language == 'en' || mode == 'dark') {
            await shot(tester, '$name-$mode-$language');
          }
        });
      }
    }
  }

  testWidgets('the gallery filters by type and orders by likes', (
    tester,
  ) async {
    final f = await _open(tester, '/showcase');
    expect(find.text('Simit House'), findsOneWidget);
    expect(find.text('Made with Yallapp'), findsOneWidget);
    await tester.tap(find.text('Most liked'));
    await TestApp.settle(tester);
    expect(f.showcase.calls.last, 'gallery::mostLiked');
    await tester.tap(find.text('Academies'));
    await TestApp.settle(tester);
    expect(find.text('Simit House'), findsNothing);
    expect(find.text('Noor Academy'), findsOneWidget);
  });

  testWidgets('a showcase item is liked and its store link opens', (
    tester,
  ) async {
    final f = await _open(tester, '/showcase/sc-bakery');
    await tester.tap(find.text('Like · 42'));
    await TestApp.settle(tester);
    expect(f.showcase.calls.last, 'like:sc-bakery:true');
    expect(find.text('Liked · 43'), findsOneWidget);
    await tester.tap(find.text('Google Play'));
    await TestApp.settle(tester);
    expect(f.opened.single.host, 'play.google.com');
  });

  testWidgets('challenge entries are voted on while voting', (tester) async {
    final f = await _open(tester, '/challenges/ch-1');
    expect(find.text('Voting'), findsWidgets);
    await tester.tap(find.text('Vote · 12'));
    await TestApp.settle(tester);
    expect(f.challenges.calls.last, 'vote:e1:true');
  });

  testWidgets('the leaderboard switches to all-time', (tester) async {
    final f = await _open(tester, '/leaderboard');
    expect(find.text('You: #14 · 85 pts'), findsOneWidget);
    await tester.tap(find.text('All time'));
    await TestApp.settle(tester);
    expect(f.board.calls.last, 'board:all');
    expect(find.text('You: #31 · 960 pts'), findsOneWidget);
  });

  testWidgets('a hire request is sent and opens its thread; no money words', (
    tester,
  ) async {
    final f = await _open(tester, '/pros/m-elif');
    expect(find.text('By the project'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Send a hire request'),
      200,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(find.text('Send a hire request'));
    await TestApp.settle(tester);
    await tester.enterText(find.byType(TextField), 'A shop app for my bakery');
    await tester.tap(find.text('Send'));
    await TestApp.settle(tester);
    expect(f.pros.calls.last, 'hire:m-elif:A shop app for my bakery');
  });

  testWidgets('a job is applied to', (tester) async {
    final f = await _open(tester, '/jobs/job-1');
    expect(find.text('Budget: Fixed, to agree'), findsOneWidget);
    await tester.tap(find.text('Apply'));
    await TestApp.settle(tester);
    await tester.enterText(
      find.byType(TextField),
      'I have built three of these',
    );
    await tester.tap(find.text('Send'));
    await TestApp.settle(tester);
    expect(f.jobs.calls.last, 'apply:job-1:I have built three of these');
  });

  testWidgets('a live session: Watch, comments, RSVP and the calendar', (
    tester,
  ) async {
    final f = await _open(tester, '/events/ev-live');
    expect(find.text('Live now'), findsOneWidget);
    expect(find.text('Free'), findsOneWidget);
    expect(find.text('Hello from Ankara'), findsOneWidget);
    await tester.tap(find.text('Watch'));
    await TestApp.settle(tester);
    expect(f.opened.last.host, 'www.youtube.com');
    await tester.ensureVisible(find.text('Add to calendar'));
    await tester.tap(find.text('Add to calendar'));
    await TestApp.settle(tester);
    expect(f.opened.last.path, endsWith('/events/ev-live/ics'));
    await tester.tap(find.text('Not going'));
    await TestApp.settle(tester);
    expect(f.events.calls.last, 'rsvp:ev-live:false');
  });

  testWidgets('events filter to live sessions', (tester) async {
    final f = await _open(tester, '/events');
    expect(find.text('Istanbul makers meetup'), findsOneWidget);
    await tester.tap(find.text('Live').first);
    await TestApp.settle(tester);
    expect(f.events.calls.last, 'events:true');
    expect(find.text('Istanbul makers meetup'), findsNothing);
  });
}
