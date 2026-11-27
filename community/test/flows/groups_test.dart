import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/features/groups/data/groups_api.dart';

import '../support/finders.dart';
import '../support/test_app.dart';

// 232.5 Groups.
void main() {
  testWidgets('the Groups tab: mine, then the others to discover', (
    tester,
  ) async {
    await TestApp.start(tester);
    await tap(tester, 'tab-groups');
    expect(key('group-g-studio'), findsOneWidget);
    expect(key('group-g-sellers'), findsOneWidget);
    expect(key('group-g-istanbul'), findsOneWidget);
  });

  testWidgets('"Your groups" in the side menu opens a group', (tester) async {
    await TestApp.start(tester);
    await tap(tester, 'header-menu');
    await tap(tester, 'menu-group-g-studio');
    expect(key('group-page'), findsOneWidget);
    expect(find.text('Studio makers'), findsOneWidget);
  });

  testWidgets('join a public group; ask to join a private one', (tester) async {
    final app = await TestApp.start(tester);
    await tap(tester, 'tab-groups');
    await tap(tester, 'group-g-sellers');
    expect(find.text('Join'), findsOneWidget);
    await tap(tester, 'group-join');
    expect(app.groups.calls, ['join:g-sellers']);
    expect(find.text('Leave'), findsOneWidget);
    expect(key('group-write'), findsOneWidget);

    app.go('/groups/g-istanbul');
    await TestApp.settle(tester);
    expect(key('group-closed'), findsOneWidget);
    await tap(tester, 'group-join');
    expect(find.text('Requested'), findsOneWidget);
  });

  testWidgets('create a private group, or be told no by the policy', (
    tester,
  ) async {
    final groups = FakeGroupsApi()..mayCreate = false;
    final app = await TestApp.start(tester, groups: groups);
    await tap(tester, 'tab-groups');
    await tap(tester, 'group-create');
    await tester.enterText(key('group-name'), 'Bursa makers');
    await tap(tester, 'group-private');
    await tap(tester, 'group-create-go');
    expect(app.groups.calls, ['create:Bursa makers:true']);
    expect(
      find.text("Creating groups isn't open to your account yet."),
      findsOneWidget,
    );

    groups.mayCreate = true;
    await tap(tester, 'group-create-go');
    expect(key('group-page'), findsOneWidget);
  });

  testWidgets('the owner accepts a request and makes a moderator', (
    tester,
  ) async {
    final groups = FakeGroupsApi();
    final app = await TestApp.start(tester, groups: groups);
    app.go('/groups/g-studio/members');
    await TestApp.settle(tester);
    expect(key('member-m-nour'), findsOneWidget);
    await tap(tester, 'member-menu-m-nour');
    await tap(tester, 'member-make-moderator');
    expect(groups.calls, contains('role:g-studio:m-nour:moderator'));
    expect(find.text('Moderator'), findsOneWidget);
  });
}
