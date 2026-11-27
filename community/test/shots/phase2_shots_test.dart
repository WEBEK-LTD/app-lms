import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/app_shots.dart';
import '../support/finders.dart';
import '../support/test_app.dart';

/// Area D's phase 2 screens at 390 × 844 in English, Arabic and Turkish,
/// light and dark: `YC_SHOTS_DIR=<dir> flutter test test/shots` writes
/// them as `p2/<screen>-<lang>[-dark].png`.
void main() {
  final screens = <(String, Future<void> Function(WidgetTester, TestApp))>[
    ('feed', (t, app) async {}),
    (
      'post',
      (t, app) async {
        app.go('/posts/p-runway');
      },
    ),
    (
      'composer',
      (t, app) async {
        app.go('/posts/new');
      },
    ),
    (
      'story',
      (t, app) async {
        await tap(t, 'story-m-nour');
      },
    ),
    (
      'inbox',
      (t, app) async {
        app.go('/messages');
      },
    ),
    (
      'thread',
      (t, app) async {
        app.go('/messages/c-team');
      },
    ),
    (
      'groups',
      (t, app) async {
        app.go('/groups');
      },
    ),
    (
      'group',
      (t, app) async {
        app.go('/groups/g-studio');
      },
    ),
    (
      'push-settings',
      (t, app) async {
        app.go('/settings/push');
      },
    ),
  ];
  for (final lang in ['en', 'ar', 'tr']) {
    for (final dark in [false, true]) {
      for (final (name, open) in screens) {
        final shot = 'p2/$name-$lang${dark ? '-dark' : ''}';
        testWidgets(shot, (tester) async {
          designInsets(tester);
          final app = await TestApp.start(
            tester,
            language: lang,
            theme: dark ? ThemeMode.dark : ThemeMode.light,
          );
          await open(tester, app);
          await TestApp.settle(tester, 20);
          await appShot(tester, shot);
        });
      }
    }
  }
}
