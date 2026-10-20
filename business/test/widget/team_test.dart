import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/features/team/team_screen.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 60 Team members: Staff see only what their role allows and "Ask the
/// owner" for the plan; the owner's Team screen invites, changes access and
/// removes; someone on several businesses switches between them.
/// Scrolls the invite or access sheet (the list behind it scrolls too).
Future<void> inSheet(WidgetTester tester, String text, [double delta = 200]) =>
    tester.scrollUntilVisible(
      find.text(text),
      delta,
      scrollable: find
          .descendant(
            of: find.byType(AccessSheet),
            matching: find.byType(Scrollable),
          )
          .first,
    );

void main() {
  testWidgets(
    'Staff with Orders only see Orders, and ask the owner for the plan',
    (tester) async {
      final api = FakeOwnerApi()
        ..joinAs(TeamRole.staff, areas: ['orders'])
        ..businesses = const [
          Business(
            id: 'b1',
            name: 'Layla Café',
            role: TeamRole.staff,
            state: AccountState.active,
          ),
        ];
      final app = TestApp(api: api);
      await app.pump(tester);
      await go(tester, app, '/more');
      expect(find.textContaining('Staff on Layla Café'), findsOneWidget);
      // No Team, no Media, no Builds, no Stats for this role.
      expect(find.text('Team'), findsNothing);
      expect(find.text('Media'), findsNothing);
      expect(find.text('Builds & publishing'), findsNothing);
      await tester.scrollUntilVisible(
        find.textContaining('Ask the owner'),
        200,
      );
      expect(
        find.textContaining('Only the owner of the business sees the plan'),
        findsOneWidget,
      );
      // A link to the plan says the same.
      await push(tester, app, '/plan');
      expect(find.text('Ask the owner'), findsOneWidget);
      expect(api.calls, isNot(contains('license')));
    },
  );

  testWidgets('The owner invites someone as Staff with chosen areas', (
    tester,
  ) async {
    final api = FakeOwnerApi();
    final app = TestApp(api: api);
    await app.pump(tester);
    await go(tester, app, '/more');
    await tester.scrollUntilVisible(find.text('Team'), 200);
    await tapOn(tester, find.text('Team'));
    expect(find.text('Layla Haddad (You)'), findsOneWidget);
    await tapOn(tester, find.text('Invite someone'));
    await tester.enterText(find.widgetWithText(TextField, 'Name'), 'Kerem');
    await tester.enterText(
      find.widgetWithText(TextField, 'Email'),
      'kerem@cafe.test',
    );
    // Staff needs at least one area.
    await tapOn(tester, find.text('Send invitation'));
    expect(
      find.text('Choose at least one thing Staff can work on.'),
      findsOneWidget,
    );
    await inSheet(tester, 'Orders & kitchen', -200);
    await tapOn(tester, find.text('Orders & kitchen'));
    await tapOn(tester, find.text('Send invitation'));
    expect(find.text('Invitation sent to kerem@cafe.test.'), findsOneWidget);
    expect(api.invitations.single.areas, ['orders']);
    expect(api.invitations.single.role, TeamRole.staff);
    expect(find.text('Invitations waiting'), findsOneWidget);
    await tapOn(tester, find.text('Cancel invitation'));
    expect(api.invitations, isEmpty);
  });

  testWidgets('The owner changes what someone can do and removes them', (
    tester,
  ) async {
    final api = FakeOwnerApi();
    api.teamMembers.add(
      const TeamMember(
        userId: 'u2',
        name: 'Kerem Aydın',
        email: 'kerem@cafe.test',
        role: TeamRole.staff,
        areas: ['orders'],
      ),
    );
    final app = TestApp(api: api);
    await app.pump(tester);
    await push(tester, app, '/team');
    expect(find.textContaining('Staff · Orders & kitchen'), findsOneWidget);
    await tapOn(tester, find.byTooltip('Change access'));
    await tapOn(tester, find.text('Change access').last);
    await tapOn(tester, find.text('Manager'));
    await tapOn(tester, find.text('Save changes'));
    expect(api.teamMembers.single.role, TeamRole.manager);
    expect(find.textContaining('Manager · Everything'), findsOneWidget);
    await tapOn(tester, find.byTooltip('Change access'));
    await tapOn(tester, find.text('Remove from the team'));
    expect(find.text('Remove Kerem Aydın?'), findsOneWidget);
    await tapOn(tester, find.text('Remove from the team').last);
    expect(api.teamMembers, isEmpty);
    expect(find.text('Kerem Aydın is off the team.'), findsOneWidget);
  });

  for (final (lang, title, invite) in [
    ('ar', 'الفريق', 'ادعُ شخصًا'),
    ('tr', 'Ekip', 'Birini davet edin'),
  ]) {
    testWidgets('The Team screen in $lang', (tester) async {
      final app = TestApp(language: lang);
      await app.pump(tester);
      await push(tester, app, '/team');
      expect(find.text(title), findsOneWidget);
      expect(find.text(invite), findsOneWidget);
    });
  }

  testWidgets('Someone on two businesses switches between them', (
    tester,
  ) async {
    final api = FakeOwnerApi()
      ..businesses = const [
        Business(
          id: 'own',
          name: 'Layla Café',
          role: TeamRole.owner,
          state: AccountState.active,
        ),
        Business(
          id: 'other',
          name: 'Omar Bakery',
          role: TeamRole.staff,
          state: AccountState.active,
        ),
      ];
    final app = TestApp(api: api);
    await app.pump(tester);
    await go(tester, app, '/more');
    await tester.scrollUntilVisible(find.text('Switch business'), 200);
    await tapOn(tester, find.text('Switch business'));
    expect(find.text('Your businesses'), findsOneWidget);
    await tapOn(tester, find.text('Omar Bakery'));
    expect(api.calls, contains('setBusiness'));
  });
}
