import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'screens/classroom_reports_screens.dart';
import 'screens/checkin_screens.dart';
import 'screens/bus_screens.dart';
import 'screens/calendar_screens.dart';
import 'screens/classroom_screens.dart';
import 'screens/messages_screen.dart';
import 'screens/library_screens.dart';
import 'screens/school_screen.dart';
import 'screens/shared_reports_screen.dart';
import 'screens/payslip_screens.dart';
import 'screens/staff_screens.dart';
import 'screens/student_screens.dart';

/// 105.4 The School module (hosted API): the school and the account as
/// tabs, for students and parents (a parent switches between their
/// children), and each part of it as a page; for the school's teachers a
/// Classroom tab (added for them only, see `withClassroomTab`) with their
/// classes, attendance, homework and scores. 113.2 Checking in and out for
/// students, teachers and staff; 113.3 a Staff tab for the staff who don't
/// teach (added for them only, see `withStaffTab`).
final schoolModule = AppModule(
  tabPaths: {Paths.school, Paths.classroom, Paths.staff, Paths.account},
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

/// 113.3 The Staff tab, for the school's staff who don't teach.
final staffTab = ShellTab(
  icon: AppIcons.staffBadge,
  label: (c) => c.l10n.tabStaff,
  location: Paths.staff,
);

List<TabScreen> _screens() => [
  TabScreen(Paths.school, (state) => const SchoolScreen()),
  TabScreen(Paths.classroom, (state) => const ClassroomScreen()),
  TabScreen(Paths.staff, (state) => const StaffScreen()),
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

GoRoute _page(String path, Widget screen) => GoRoute(
  path: path,
  pageBuilder: (context, state) => appPage(state, screen),
);

List<RouteBase> _pushedRoutes() => [
  // 113.2 Checking in and out; 113.3 leave and the staff's news.
  _page(Paths.checkin, const CheckinScreen()),
  _page(Paths.staffLeaveNew, const LeaveFormScreen()),
  _page(Paths.staffLeave, const LeaveScreen()),
  _page(Paths.staffNews, const StaffNewsScreen()),
  _page(Paths.staffCalendar, const SchoolCalendarScreen(classroom: true)),
  // 113.12 Payslips.
  _page(Paths.staffPayslips, const PayslipsScreen()),
  _byId('/staff/payslip/:id', (id) => PayslipScreen(id: id)),
  _part('timetable', (student) => TimetableScreen(student: student)),
  _part('homework', (student) => HomeworkScreen(student: student)),
  _part('grades', (student) => GradesScreen(student: student)),
  // 112.5 The report card, and a class's gradebook for its teachers.
  _part('report-card', (student) => ReportCardScreen(student: student)),
  _byId(
    '${Paths.classroom}/class/:id/gradebook',
    (id) => ClassGradebookScreen(classId: id),
  ),
  _part('attendance', (student) => AttendanceScreen(student: student)),
  _part('fees', (student) => FeesScreen(student: student)),
  _part('news', (student) => const SchoolNewsScreen()),
  // 113.6 Messages with teachers and families.
  _part('messages', (student) => const SchoolMessagesScreen()),
  // 113.10 The child's bus, and the bus's crew; 113.11 the library.
  _part('bus', (student) => StudentBusScreen(student: student)),
  _part('library', (student) => const LibraryScreen()),
  _part('library-loans', (student) => const LibraryLoansScreen()),
  _byId(
    '${Paths.school}/library/book/:id',
    (id) => LibraryBookScreen(bookId: id),
  ),
  GoRoute(
    path: Paths.busDuty,
    pageBuilder: (context, state) => appPage(state, const BusDutyScreen()),
  ),
  _byId('${Paths.busDuty}/run/:id', (id) => BusRunScreen(runId: id)),
  // 113.8 The calendar, the exams' timetable and behaviour; the teacher's
  // calendar and exams, and a class's behaviour.
  _part('calendar', (student) => SchoolCalendarScreen(student: student)),
  _part('exams', (student) => SchoolExamsScreen(student: student)),
  _part('behaviour', (student) => BehaviourScreen(student: student)),
  GoRoute(
    path: '${Paths.classroom}/calendar',
    pageBuilder: (context, state) =>
        appPage(state, const SchoolCalendarScreen(classroom: true)),
  ),
  GoRoute(
    path: '${Paths.classroom}/exams',
    pageBuilder: (context, state) =>
        appPage(state, const SchoolExamsScreen(classroom: true)),
  ),
  _byId(
    '${Paths.classroom}/class/:id/behaviour',
    (id) => ClassBehaviourScreen(classId: id),
  ),
  _byId(
    '${Paths.classroom}/class/:id/attendance',
    (id) => TakeAttendanceScreen(classId: id),
  ),
  // 113.5 A class's syllabus, the teacher's reports to the school, and the
  // reports the school shared with a student's parents.
  _byId(
    '${Paths.classroom}/class/:id/syllabus',
    (id) => SyllabusScreen(classId: id),
  ),
  GoRoute(
    path: Paths.classroomReports,
    pageBuilder: (context, state) =>
        appPage(state, const TeacherReportsScreen()),
  ),
  _byId(
    '${Paths.classroom}/report/:id',
    (id) => TeacherReportScreen(reportId: id),
  ),
  _part('reports', (student) => SharedReportsScreen(student: student)),
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
