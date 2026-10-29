import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'screens/classroom_screens.dart';
import 'screens/school_screen.dart';
import 'screens/student_screens.dart';

/// 105.4 The School module (hosted API): the school and the account as
/// tabs, for students and parents (a parent switches between their
/// children), and each part of it as a page; for the school's teachers a
/// Classroom tab (added for them only, see `withClassroomTab`) with their
/// classes, attendance, homework and scores.
final schoolModule = AppModule(
  tabPaths: {Paths.school, Paths.classroom, Paths.account},
  screens: _screens,
  defaultTabs: (_) => _defaultTabs,
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.school => Paths.school,
    BuiltInScreen.classroom => Paths.classroom,
    BuiltInScreen.account => Paths.account,
    BuiltInScreen.settings => Paths.settings,
    BuiltInScreen.notifications => Paths.notifications,
    BuiltInScreen.courses ||
    BuiltInScreen.myCourses ||
    BuiltInScreen.search ||
    BuiltInScreen.favorites ||
    BuiltInScreen.orders ||
    BuiltInScreen.messages ||
    BuiltInScreen.cart ||
    BuiltInScreen.services ||
    BuiltInScreen.appointments ||
    BuiltInScreen.articles ||
    BuiltInScreen.bookmarks ||
    BuiltInScreen.classes ||
    BuiltInScreen.memberships ||
    BuiltInScreen.events ||
    BuiltInScreen.tickets ||
    BuiltInScreen.campaigns ||
    BuiltInScreen.myDonations ||
    BuiltInScreen.sendParcel ||
    BuiltInScreen.shipments ||
    BuiltInScreen.courier ||
    BuiltInScreen.restaurants ||
    BuiltInScreen.foodOrders ||
    BuiltInScreen.restaurant ||
    BuiltInScreen.ride ||
    BuiltInScreen.myRides ||
    BuiltInScreen.driver ||
    BuiltInScreen.teachers ||
    BuiltInScreen.teacher => null,
  },
  routes: _pushedRoutes,
);

final _defaultTabs = [
  ShellTab(
    icon: AppIcons.school,
    label: (c) => c.l10n.tabSchool,
    location: Paths.school,
  ),
  ShellTab(
    icon: AppIcons.account,
    label: (c) => c.l10n.tabAccount,
    location: Paths.account,
  ),
];

/// The Classroom tab, for the school's teachers only.
final classroomTab = ShellTab(
  icon: AppIcons.staff,
  label: (c) => c.l10n.tabClassroom,
  location: Paths.classroom,
);

List<TabScreen> _screens() => [
  TabScreen(Paths.school, (state) => const SchoolScreen()),
  TabScreen(Paths.classroom, (state) => const ClassroomScreen()),
  TabScreen(
    Paths.account,
    (state) => const ProfileScreen(),
    routes: accountSubRoutes(),
  ),
];

GoRoute _byId(String path, Widget Function(int id) build) => GoRoute(
  path: path,
  pageBuilder: (context, state) {
    final id = int.tryParse(state.pathParameters['id'] ?? '');
    return appPage(
      state,
      id == null || id < 1 ? const NotFoundScreen() : build(id),
    );
  },
);

/// The school's parts, for the student in `?student=` (a notification's).
GoRoute _part(String part, Widget Function(int? student) build) => GoRoute(
  path: '${Paths.school}/$part',
  pageBuilder: (context, state) => appPage(
    state,
    build(int.tryParse(state.uri.queryParameters['student'] ?? '')),
  ),
);

List<RouteBase> _pushedRoutes() => [
  _part('timetable', (student) => TimetableScreen(student: student)),
  _part('homework', (student) => HomeworkScreen(student: student)),
  _part('grades', (student) => GradesScreen(student: student)),
  _part('attendance', (student) => AttendanceScreen(student: student)),
  _part('fees', (student) => FeesScreen(student: student)),
  _part('news', (student) => const SchoolNewsScreen()),
  _byId(
    '${Paths.classroom}/class/:id/attendance',
    (id) => TakeAttendanceScreen(classId: id),
  ),
  _byId('${Paths.classroom}/class/:id', (id) => ClassScreen(classId: id)),
  _byId(
    '${Paths.classroom}/homework/:id',
    (id) => ClassroomHomeworkScreen(homeworkId: id),
  ),
  _byId(
    '${Paths.classroom}/assessment/:id',
    (id) => ScoresScreen(assessmentId: id),
  ),
];
