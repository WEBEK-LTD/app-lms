import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../chat/data/chat_api.dart';
import '../../chat/data/chat_media.dart';
import '../../lms/teachers/teacher_widgets.dart' show LabeledField;
import '../../real_estate/widgets/listing_widgets.dart'
    show SignInPrompt, TabHeader;
import '../data/parent_providers.dart';
import '../data/school_providers.dart';
import '../data/university_providers.dart';
import '../widgets/school_widgets.dart';
import 'checkin_screens.dart' show checkinDayLine, checkinStateLabel;
import 'messages_screen.dart' show SchoolMessagesTile;
import 'student_screens.dart' show FileTile;
import 'university_screens.dart' show UniToday;

/// 113.4 The Parent tab, which only the school's parents see (added for
/// them, see `withParentTab`): one account for all their children, each
/// child's day at a glance (at the gate, today's lessons, homework due, the
/// latest grades, behaviour, the bus, library books, what is coming), and
/// every part of the child that is the parents': permission slips to sign,
/// absences to excuse, who picks the child up, fees and receipts, the
/// reports the school shared, messages with the teachers when the school
/// allows them, and the child's calendar.
class ParentScreen extends ConsumerWidget {
  const ParentScreen({super.key, this.student});

  /// The child a notification is about.
  final int? student;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.tabParent),
            Expanded(
              child: signedIn
                  ? _ParentGate(wanted: student)
                  : SignInPrompt(
                      icon: AppIcons.family,
                      title: l10n.schoolSignInTitle,
                      message: l10n.schoolSignInMessage,
                      from: Paths.parent,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ParentGate extends ConsumerWidget {
  const _ParentGate({this.wanted});

  final int? wanted;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return switch (ref.watch(parentMeProvider)) {
      AsyncValue(value: final me?) => switch (childOf(
        me,
        ref.watch(chosenStudentProvider),
        wanted: wanted,
      )) {
        final child? => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (me.children.length > 1)
              StudentSwitcher(
                students: [for (final c in me.children) c.student],
                selected: child.id,
              ),
            Expanded(
              child: _ChildDayView(me: me, child: child),
            ),
          ],
        ),
        null => MessageView(
          icon: AppIcons.family,
          title: l10n.schoolNoStudents,
          message: l10n.schoolNoStudentsMessage,
        ),
      },
      AsyncValue(error: final ApiException e) when e.code == 'not_parent' =>
        MessageView(
          key: const ValueKey('parent-not-parent'),
          icon: AppIcons.family,
          title: l10n.parentNotParentTitle,
          message: l10n.parentNotParentMessage,
        ),
      AsyncValue(error: final ApiException e)
          when e.code == 'not_school_member' =>
        MessageView(
          icon: AppIcons.school,
          title: l10n.schoolNotMemberTitle,
          message: l10n.schoolNotMemberMessage,
        ),
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(parentMeProvider),
      ),
      _ => const LoadingView(),
    };
  }
}

class _ChildDayView extends ConsumerWidget {
  const _ChildDayView({required this.me, required this.child});

  final ParentMe me;
  final ParentChild child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final id = child.id;
    return RefreshIndicator(
      onRefresh: () async {
        ref
          ..invalidate(childDayProvider(id))
          ..invalidate(parentMeProvider)
          ..invalidate(uniTimetableProvider(id));
      },
      child: switch (ref.watch(childDayProvider(id))) {
        AsyncValue(value: final day?) => _Day(me: me, day: day),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(childDayProvider(id)),
        ),
        _ => const LoadingView(),
      },
    );
  }
}

class _Day extends ConsumerWidget {
  const _Day({required this.me, required this.day});

  final ParentMe me;
  final ChildDay day;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final student = day.student;
    final id = student.id;
    final config = ref.watch(schoolConfigProvider);
    // 113.9 A university's student: their lectures, registration (read
    // only), results, transcript and plan instead of the classes' parts.
    final uni = ref.watch(isUniversityProvider);
    void open(String part) => context.push(Paths.schoolPart(part, student: id));
    void openParent(String part) =>
        context.push(Paths.parentPart(part, student: id));
    final small = TextStyle(fontSize: 13, color: p.textSecondary);
    final strong = TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w600,
      color: p.text,
    );
    final gate = day.checkin;
    final pickup = day.pickupToday;
    final busRunning = day.bus.any(
      (t) => t.run?.status == BusRunStatus.running,
    );
    return ListView(
      key: const ValueKey('parent-day'),
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      children: [
        AppCard(
          key: const ValueKey('parent-child'),
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              InitialsAvatar(
                name: student.name,
                imageUrl: student.photoUrl,
                size: 44,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      student.name,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                    if (student.className != null)
                      Text(student.className!, style: small),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (day.dayOff != null) ...[
          const SizedBox(height: 12),
          Text(
            l10n.parentDayOff(day.dayOff!),
            key: const ValueKey('parent-day-off'),
            style: strong,
          ),
        ],
        if (gate != null || pickup != null) ...[
          const SizedBox(height: 12),
          AppCard(
            key: const ValueKey('parent-gate'),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (gate != null) ...[
                  Row(
                    children: [
                      Expanded(
                        child: Text(l10n.parentAtTheGate, style: strong),
                      ),
                      SchoolPill(
                        label: checkinStateLabel(l10n, gate.state).$1,
                        tone: checkinStateLabel(l10n, gate.state).$2,
                      ),
                    ],
                  ),
                  if (checkinDayLine(l10n, gate).isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(checkinDayLine(l10n, gate), style: small),
                  ],
                ],
                if (pickup != null) ...[
                  if (gate != null) const SizedBox(height: 8),
                  Text(
                    l10n.parentPicksUpToday(
                      [
                        pickup.name,
                        if (pickup.relation != null) pickup.relation!,
                      ].join(' · '),
                    ),
                    key: const ValueKey('parent-pickup-today'),
                    style: strong,
                  ),
                ],
              ],
            ),
          ),
        ],
        const SizedBox(height: 20),
        SectionHeader(
          title: l10n.schoolToday,
          onSeeAll: () => open(uni ? 'uni-timetable' : 'timetable'),
        ),
        const SizedBox(height: 4),
        if (uni)
          UniToday(studentId: id)
        else if (day.lessons.isEmpty)
          Text(l10n.schoolNoLessonsToday, style: small)
        else
          AppCard(
            key: const ValueKey('parent-lessons'),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            child: Column(
              children: [
                for (final lesson in day.lessons) LessonRow(lesson: lesson),
              ],
            ),
          ),
        if (!uni) ...[
          const SizedBox(height: 20),
          SectionHeader(
            title: l10n.schoolHomework,
            onSeeAll: () => open('homework'),
          ),
          const SizedBox(height: 4),
          Text(
            l10n.parentHomeworkDue(day.homeworkDue),
            key: const ValueKey('parent-homework-due'),
            style: small,
          ),
          for (final h in day.homework)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                '${h.subject} · ${h.title} · ${isoDayLabel(h.dueOn)}',
                style: strong,
              ),
            ),
        ],
        if (day.grades.isNotEmpty) ...[
          const SizedBox(height: 20),
          SectionHeader(
            title: l10n.parentLatestGrades,
            onSeeAll: () => open('grades'),
          ),
          const SizedBox(height: 4),
          for (final g in day.grades)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      [
                        if (g.subject.isNotEmpty) g.subject,
                        g.title,
                      ].join(' · '),
                      style: strong,
                    ),
                  ),
                  Text(
                    '${scoreText(g.score)}/${scoreText(g.maxScore)}',
                    style: strong,
                  ),
                ],
              ),
            ),
        ],
        if (day.loans.isNotEmpty) ...[
          const SizedBox(height: 20),
          SectionHeader(
            title: l10n.parentLibraryBooks,
            onSeeAll: () => open('library-loans'),
          ),
          const SizedBox(height: 4),
          for (final loan in day.loans)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                '${loan.title} · ${loan.overdue ? l10n.parentBookOverdue(isoDayLabel(loan.dueOn)) : l10n.parentBookDue(isoDayLabel(loan.dueOn))}',
                style: strong.copyWith(color: loan.overdue ? p.danger : null),
              ),
            ),
        ],
        if (day.events.isNotEmpty || day.exams.isNotEmpty) ...[
          const SizedBox(height: 20),
          SectionHeader(
            title: l10n.parentComing,
            onSeeAll: () => open('calendar'),
          ),
          const SizedBox(height: 4),
          for (final e in day.events)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                '${isoDayLabel(e.startsOn)} · ${e.title}',
                style: strong,
              ),
            ),
          for (final e in day.exams)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                '${isoDayLabel(e.date)} · ${e.subject} · ${e.starts}',
                style: strong,
              ),
            ),
        ],
        const SizedBox(height: 20),
        SettingsGroup(
          title: l10n.parentEverything(student.name),
          children: [
            SettingsTile(
              key: const ValueKey('parent-slips'),
              icon: AppIcons.slip,
              title: l10n.parentSlips,
              subtitle: l10n.parentSlipsWaiting(day.slipsWaiting),
              onTap: () => context.push(Paths.parentSlips),
            ),
            SettingsTile(
              key: const ValueKey('parent-excuses'),
              icon: AppIcons.eventBusy,
              title: l10n.parentExcuses,
              subtitle: l10n.parentExcusesSubtitle,
              onTap: () => openParent('excuses'),
            ),
            SettingsTile(
              key: const ValueKey('parent-pickup'),
              icon: AppIcons.pickupPerson,
              title: l10n.parentPickup,
              subtitle: l10n.parentPickupPeople(day.pickupPeople),
              onTap: () => openParent('pickup'),
            ),
            SettingsTile(
              key: const ValueKey('parent-fees'),
              icon: AppIcons.cash,
              title: l10n.schoolFees,
              subtitle: day.feesDue > 0
                  ? l10n.feesDue(day.feesDueFormatted)
                  : null,
              onTap: () => open('fees'),
            ),
            SettingsTile(
              key: const ValueKey('parent-reports'),
              icon: AppIcons.assignment,
              title: l10n.schoolReports,
              subtitle: l10n.parentReportsCount(day.reports),
              onTap: () => open('reports'),
            ),
            // 113.6 Messages with the teachers, when the school allows them.
            if (me.messages) const SchoolMessagesTile(teacher: false),
            SettingsTile(
              key: const ValueKey('parent-behaviour'),
              icon: AppIcons.star,
              title: l10n.schoolBehaviour,
              subtitle: day.latestBehaviour != null
                  ? '${l10n.parentBehaviourPoints(day.points)} · ${day.latestBehaviour!.category}'
                  : l10n.parentBehaviourPoints(day.points),
              onTap: () => open('behaviour'),
            ),
            if ((config?.bus ?? false) || day.bus.isNotEmpty)
              SettingsTile(
                key: const ValueKey('parent-bus'),
                icon: AppIcons.bus,
                title: l10n.schoolBus,
                subtitle: busRunning ? l10n.parentBusOnTheWay : null,
                onTap: () => open('bus'),
              ),
            SettingsTile(
              key: const ValueKey('parent-calendar'),
              icon: AppIcons.event,
              title: l10n.schoolCalendar,
              onTap: () => open('calendar'),
            ),
            if (uni) ...[
              SettingsTile(
                key: const ValueKey('parent-uni-registration'),
                icon: AppIcons.assignment,
                title: l10n.uniRegister,
                onTap: () => open('uni-registration'),
              ),
              SettingsTile(
                key: const ValueKey('parent-uni-timetable'),
                icon: AppIcons.calendar,
                title: l10n.uniTimetable,
                onTap: () => open('uni-timetable'),
              ),
              SettingsTile(
                key: const ValueKey('parent-uni-results'),
                icon: AppIcons.certificate,
                title: l10n.uniResults,
                onTap: () => open('uni-results'),
              ),
              SettingsTile(
                key: const ValueKey('parent-uni-transcript'),
                icon: AppIcons.file,
                title: l10n.uniTranscript,
                onTap: () => open('uni-transcript'),
              ),
              SettingsTile(
                key: const ValueKey('parent-uni-plan'),
                icon: AppIcons.list,
                title: l10n.uniStudyPlan,
                onTap: () => open('uni-plan'),
              ),
            ] else ...[
              SettingsTile(
                key: const ValueKey('parent-exams'),
                icon: AppIcons.quiz,
                title: l10n.schoolExams,
                onTap: () => open('exams'),
              ),
              SettingsTile(
                key: const ValueKey('parent-attendance'),
                icon: AppIcons.attendance,
                title: l10n.schoolAttendance,
                onTap: () => open('attendance'),
              ),
              SettingsTile(
                key: const ValueKey('parent-grades'),
                icon: AppIcons.certificate,
                title: l10n.schoolGrades,
                onTap: () => open('grades'),
              ),
              SettingsTile(
                key: const ValueKey('parent-report-card'),
                icon: AppIcons.assignment,
                title: l10n.reportCard,
                onTap: () => open('report-card'),
              ),
            ],
            if (config?.library ?? false)
              SettingsTile(
                key: const ValueKey('parent-library'),
                icon: AppIcons.library,
                title: l10n.libraryBorrowed,
                onTap: () => open('library-loans'),
              ),
          ],
        ),
      ],
    );
  }
}

// Permission slips

/// The permission slips for the parent's children, open ones first; each
/// child it is for signed yes or no with the parent's name.
class PermissionSlipsScreen extends ConsumerWidget {
  const PermissionSlipsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(permissionSlipsProvider);
    final controller = ref.read(permissionSlipsProvider.notifier);
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.parentSlips),
      ),
      body: SafeArea(
        top: false,
        child: PagedItems<PermissionSlip>(
          state: state,
          controller: controller,
          empty: Text(
            l10n.slipsNone,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: context.palette.textSecondary,
            ),
          ),
          item: (context, slip) => _SlipCard(
            slip: slip,
            onChanged: () async {
              await controller.refresh();
              ref.invalidate(parentMeProvider);
              ref.invalidate(childDayProvider);
            },
          ),
        ),
      ),
    );
  }
}

class _SlipCard extends ConsumerWidget {
  const _SlipCard({required this.slip, required this.onChanged});

  final PermissionSlip slip;
  final Future<void> Function() onChanged;

  Future<void> _sign(
    BuildContext context,
    SlipChild child,
    SlipAnswer answer,
  ) async {
    final done = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _SignSheet(slip: slip, child: child, answer: answer),
    );
    if (done == true) await onChanged();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    return AppCard(
      key: ValueKey('slip-${slip.id}'),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  slip.title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
              if (!slip.open)
                SchoolPill(label: l10n.slipClosed)
              else
                SchoolPill(
                  label: l10n.slipDue(isoDayLabel(slip.dueOn)),
                  tone: slip.waiting ? PillTone.warn : PillTone.good,
                ),
            ],
          ),
          if (slip.forName != null) ...[
            const SizedBox(height: 2),
            Text(
              slip.forName!,
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
          ],
          if (slip.details != null) ...[
            const SizedBox(height: 6),
            Text(
              slip.details!,
              style: TextStyle(fontSize: 14, color: p.textBody),
            ),
          ],
          if (slip.feeNote != null) ...[
            const SizedBox(height: 6),
            Text(
              l10n.slipFee(slip.feeNote!),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
          ],
          for (final child in slip.children) ...[
            const Divider(height: 20),
            Text(
              child.studentName,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              switch (child.answer) {
                SlipAnswer.yes => l10n.slipSignedYes(child.signedName ?? ''),
                SlipAnswer.no => l10n.slipSignedNo(child.signedName ?? ''),
                null => l10n.slipNotAnswered,
              },
              key: ValueKey('slip-${slip.id}-${child.studentId}-answer'),
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
            if (slip.open) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: PrimaryButton(
                      key: ValueKey('slip-${slip.id}-${child.studentId}-yes'),
                      label: l10n.slipYes,
                      height: 44,
                      onPressed: () => _sign(context, child, SlipAnswer.yes),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: SecondaryButton(
                      key: ValueKey('slip-${slip.id}-${child.studentId}-no'),
                      label: l10n.slipNo,
                      height: 44,
                      onPressed: () => _sign(context, child, SlipAnswer.no),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ],
      ),
    );
  }
}

/// Signs a slip for one child: what is signed, and the parent's name.
class _SignSheet extends ConsumerStatefulWidget {
  const _SignSheet({
    required this.slip,
    required this.child,
    required this.answer,
  });

  final PermissionSlip slip;
  final SlipChild child;
  final SlipAnswer answer;

  @override
  ConsumerState<_SignSheet> createState() => _SignSheetState();
}

class _SignSheetState extends ConsumerState<_SignSheet> {
  late final _name = TextEditingController(
    text:
        ref.read(parentMeProvider).value?.name ??
        ref.read(authControllerProvider).user?.name ??
        '',
  );
  bool _sending = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final l10n = context.l10n;
    final name = _name.text.trim();
    if (name.isEmpty) {
      showMessage(context, l10n.slipNameNeeded);
      return;
    }
    setState(() => _sending = true);
    try {
      await ref
          .read(yallappApiProvider)
          .answerPermissionSlip(
            widget.slip.id,
            studentId: widget.child.studentId,
            answer: widget.answer,
            signedName: name,
          );
      if (!mounted) return;
      showMessage(context, l10n.slipSigned);
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final yes = widget.answer == SlipAnswer.yes;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                yes
                    ? l10n.slipAgree(
                        widget.child.studentName,
                        widget.slip.title,
                      )
                    : l10n.slipDecline(
                        widget.child.studentName,
                        widget.slip.title,
                      ),
                key: const ValueKey('slip-sign-text'),
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 16),
              LabeledField(
                key: const ValueKey('slip-sign-name'),
                label: l10n.slipYourName,
                controller: _name,
                maxLength: 120,
              ),
              const SizedBox(height: 12),
              PrimaryButton(
                key: const ValueKey('slip-sign'),
                label: l10n.slipSign,
                loading: _sending,
                height: 52,
                onPressed: _send,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Absence excuses

(String, PillTone) excuseStatusLabel(AppLocalizations l10n, ExcuseStatus s) =>
    switch (s) {
      ExcuseStatus.pending => (l10n.excusePending, PillTone.warn),
      ExcuseStatus.accepted => (l10n.excuseAccepted, PillTone.good),
      ExcuseStatus.declined => (l10n.excuseDeclined, PillTone.bad),
      ExcuseStatus.cancelled => (l10n.excuseWithdrawn, PillTone.neutral),
    };

/// A child's absence excuses, newest first; a new one from the button.
class ExcusesScreen extends ConsumerWidget {
  const ExcusesScreen({super.key, required this.student});

  final int student;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(absenceExcusesProvider(student));
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.parentExcuses),
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const ValueKey('excuse-new'),
        onPressed: () async {
          final sent = await context.push<bool>(
            Paths.parentPart('excuses/new', student: student),
          );
          if (sent == true) {
            ref
              ..invalidate(absenceExcusesProvider(student))
              ..invalidate(childDayProvider(student));
          }
        },
        icon: const AppIcon(AppIcons.add),
        label: Text(l10n.excuseNew),
      ),
      body: SafeArea(
        top: false,
        child: switch (async) {
          AsyncValue(value: final list?) when list.isEmpty => Center(
            child: Text(
              l10n.excusesNone,
              style: TextStyle(fontSize: 14, color: p.textSecondary),
            ),
          ),
          AsyncValue(value: final list?) => ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 96),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, i) =>
                _ExcuseCard(excuse: list[i], student: student),
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(absenceExcusesProvider(student)),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

class _ExcuseCard extends ConsumerStatefulWidget {
  const _ExcuseCard({required this.excuse, required this.student});

  final AbsenceExcuse excuse;
  final int student;

  @override
  ConsumerState<_ExcuseCard> createState() => _ExcuseCardState();
}

class _ExcuseCardState extends ConsumerState<_ExcuseCard> {
  bool _busy = false;

  Future<void> _withdraw() async {
    setState(() => _busy = true);
    try {
      await ref
          .read(yallappApiProvider)
          .withdrawAbsenceExcuse(widget.excuse.id);
      ref
        ..invalidate(absenceExcusesProvider(widget.student))
        ..invalidate(childDayProvider(widget.student));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final excuse = widget.excuse;
    final (label, tone) = excuseStatusLabel(l10n, excuse.status);
    return AppCard(
      key: ValueKey('excuse-${excuse.id}'),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  [
                    l10n.leaveDates(
                      isoDayLabel(excuse.startsOn),
                      isoDayLabel(excuse.endsOn),
                    ),
                    l10n.leaveDays(excuse.days),
                  ].join(' · '),
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
              SchoolPill(label: label, tone: tone),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            excuse.reason,
            style: TextStyle(fontSize: 14, color: p.textBody),
          ),
          if (excuse.file != null) FileTile(file: excuse.file!),
          if (excuse.answer != null) ...[
            const SizedBox(height: 6),
            Text(
              l10n.excuseSchoolNote(excuse.answer!),
              key: ValueKey('excuse-answer-${excuse.id}'),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
          ],
          if (excuse.status == ExcuseStatus.pending) ...[
            const SizedBox(height: 10),
            SecondaryButton(
              key: ValueKey('excuse-withdraw-${excuse.id}'),
              label: l10n.excuseWithdraw,
              height: 40,
              onPressed: _busy ? null : _withdraw,
            ),
          ],
        ],
      ),
    );
  }
}

/// Excuses an absence: the first and last days, the reason and a photo or
/// PDF of a note (sent as homework files are).
class ExcuseFormScreen extends ConsumerStatefulWidget {
  const ExcuseFormScreen({super.key, required this.student});

  final int student;

  @override
  ConsumerState<ExcuseFormScreen> createState() => _ExcuseFormScreenState();
}

class _ExcuseFormScreenState extends ConsumerState<ExcuseFormScreen> {
  final _reason = TextEditingController();
  late DateTime _from = _today();
  late DateTime _to = _from;
  ChatFile? _file;
  bool _sending = false;
  double? _progress;
  bool _closed = false;

  static DateTime _today() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  static String _iso(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  void dispose() {
    _closed = true;
    _reason.dispose();
    super.dispose();
  }

  Future<void> _pickDay({required bool first}) async {
    final today = _today();
    final picked = await showDatePicker(
      context: context,
      initialDate: first ? _from : _to,
      firstDate: today.subtract(const Duration(days: 30)),
      lastDate: today.add(const Duration(days: 60)),
    );
    if (picked == null || !mounted) return;
    setState(() {
      if (first) {
        _from = picked;
        if (_to.isBefore(_from)) _to = _from;
      } else {
        _to = picked;
      }
    });
  }

  Future<void> _pick(ChatPickSource source) async {
    final l10n = context.l10n;
    final picked = await ref.read(chatPickerProvider).pick(source);
    if (!mounted || picked == null) return;
    switch (picked) {
      case ChatPicked(:final file) when homeworkFileOk(file):
        if (file.size > homeworkMaxBytes(file.type)) {
          showMessage(context, l10n.homeworkFileTooBig);
          return;
        }
        setState(() => _file = file);
      case ChatPicked() || ChatPickUnsupported():
        showMessage(context, l10n.homeworkFileType);
    }
  }

  Future<void> _send() async {
    final l10n = context.l10n;
    final reason = _reason.text.trim();
    if (_to.isBefore(_from)) {
      showMessage(context, l10n.leaveDatesOrder);
      return;
    }
    if (reason.isEmpty) {
      showMessage(context, l10n.excuseReasonNeeded);
      return;
    }
    setState(() => _sending = true);
    try {
      String? uploadId;
      final file = _file;
      if (file != null) {
        setState(() => _progress = 0);
        uploadId = await uploadChatFile(
          ref.read(schoolUploadsProvider),
          file,
          onProgress: (v) {
            if (mounted) setState(() => _progress = v);
          },
          cancelled: () => _closed,
        );
      }
      await ref
          .read(yallappApiProvider)
          .sendAbsenceExcuse(
            widget.student,
            startsOn: _iso(_from),
            endsOn: _iso(_to),
            reason: reason,
            uploadId: uploadId,
          );
      if (!mounted) return;
      showMessage(context, l10n.excuseSent);
      context.pop(true);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
          _progress = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final file = _file;
    final progress = _progress;
    return Scaffold(
      appBar: AppBar(leading: appBarBack(context), title: Text(l10n.excuseNew)),
      body: SafeArea(
        top: false,
        child: ListView(
          key: const ValueKey('excuse-form'),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            SettingsGroup(
              title: l10n.leaveDates(l10n.excuseFirstDay, l10n.excuseLastDay),
              children: [
                SettingsTile(
                  key: const ValueKey('excuse-from'),
                  icon: AppIcons.calendar,
                  title: l10n.excuseFirstDay,
                  subtitle: isoDayLabel(_iso(_from)),
                  onTap: _sending ? null : () => _pickDay(first: true),
                ),
                SettingsTile(
                  key: const ValueKey('excuse-to'),
                  icon: AppIcons.calendar,
                  title: l10n.excuseLastDay,
                  subtitle: isoDayLabel(_iso(_to)),
                  onTap: _sending ? null : () => _pickDay(first: false),
                ),
              ],
            ),
            const SizedBox(height: 16),
            LabeledField(
              key: const ValueKey('excuse-reason'),
              label: l10n.excuseReason,
              controller: _reason,
              lines: 3,
              maxLength: 1000,
            ),
            const SizedBox(height: 8),
            if (file != null)
              SettingsTile(
                icon: AppIcons.file,
                title: file.name,
                chevron: false,
                trailing: IconButton(
                  tooltip: l10n.homeworkRemoveFile,
                  onPressed: _sending
                      ? null
                      : () => setState(() => _file = null),
                  icon: AppIcon(AppIcons.close, size: 20, color: p.text),
                ),
              )
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  SecondaryButton(
                    key: const ValueKey('excuse-photo'),
                    label: l10n.excuseAddPhoto,
                    icon: AppIcons.photo,
                    height: 44,
                    onPressed: () => _pick(ChatPickSource.camera),
                  ),
                  SecondaryButton(
                    key: const ValueKey('excuse-file'),
                    label: l10n.excuseAddFile,
                    icon: AppIcons.file,
                    height: 44,
                    onPressed: () => _pick(ChatPickSource.file),
                  ),
                ],
              ),
            if (progress != null) ...[
              const SizedBox(height: 8),
              LinearProgressIndicator(value: progress),
            ],
            const SizedBox(height: 20),
            PrimaryButton(
              key: const ValueKey('excuse-send'),
              label: l10n.excuseSend,
              loading: _sending,
              height: 52,
              onPressed: _send,
            ),
          ],
        ),
      ),
    );
  }
}

// Pick-up

/// Who may pick a child up (the school sees the list at the gate), and a
/// one-day note when someone else picks up.
class PickupScreen extends ConsumerWidget {
  const PickupScreen({super.key, required this.student});

  final int student;

  Future<void> _save(
    BuildContext context,
    WidgetRef ref,
    List<PickupPersonInput> people,
  ) async {
    final l10n = context.l10n;
    try {
      await ref.read(yallappApiProvider).saveChildPickup(student, people);
      ref
        ..invalidate(childPickupProvider(student))
        ..invalidate(childDayProvider(student));
      if (context.mounted) showMessage(context, l10n.pickupSaved);
    } on ApiException catch (e) {
      if (context.mounted) showMessage(context, e.message);
    }
  }

  Future<void> _add(
    BuildContext context,
    WidgetRef ref,
    ChildPickup pickup,
  ) async {
    final person = await showModalBottomSheet<PickupPersonInput>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _PersonSheet(),
    );
    if (person == null || !context.mounted) return;
    await _save(context, ref, [
      for (final p in pickup.people) p.toInput(),
      person,
    ]);
  }

  Future<void> _note(BuildContext context, WidgetRef ref) async {
    final done = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _NoteSheet(student: student),
    );
    if (done == true) {
      ref
        ..invalidate(childPickupProvider(student))
        ..invalidate(childDayProvider(student));
    }
  }

  Future<void> _takeBack(
    BuildContext context,
    WidgetRef ref,
    PickupNote note,
  ) async {
    try {
      await ref
          .read(yallappApiProvider)
          .deletePickupNote(student, date: note.date);
      ref
        ..invalidate(childPickupProvider(student))
        ..invalidate(childDayProvider(student));
    } on ApiException catch (e) {
      if (context.mounted) showMessage(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(childPickupProvider(student));
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.parentPickup),
      ),
      body: SafeArea(
        top: false,
        child: switch (async) {
          AsyncValue(value: final pickup?) => ListView(
            key: const ValueKey('pickup-list'),
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            children: [
              Text(
                l10n.pickupIntro(pickup.student.name),
                style: TextStyle(fontSize: 14, color: p.textSecondary),
              ),
              const SizedBox(height: 12),
              if (pickup.people.isEmpty)
                Text(
                  l10n.pickupNone,
                  style: TextStyle(fontSize: 14, color: p.textSecondary),
                ),
              for (final (i, person) in pickup.people.indexed)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: AppCard(
                    key: ValueKey('pickup-person-$i'),
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        InitialsAvatar(
                          name: person.name,
                          imageUrl: person.photo?.url,
                          size: 44,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                person.name,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: p.text,
                                ),
                              ),
                              if (person.relation != null ||
                                  person.phone != null)
                                Text(
                                  [?person.relation, ?person.phone].join(' · '),
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: p.textSecondary,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        IconButton(
                          key: ValueKey('pickup-remove-$i'),
                          tooltip: l10n.pickupRemove,
                          onPressed: () => _save(context, ref, [
                            for (final (j, other) in pickup.people.indexed)
                              if (j != i) other.toInput(),
                          ]),
                          icon: AppIcon(
                            AppIcons.close,
                            size: 20,
                            color: p.text,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              if (pickup.people.length < 10) ...[
                const SizedBox(height: 4),
                SecondaryButton(
                  key: const ValueKey('pickup-add'),
                  label: l10n.pickupAdd,
                  icon: AppIcons.add,
                  height: 44,
                  onPressed: () => _add(context, ref, pickup),
                ),
              ],
              const SizedBox(height: 24),
              SectionHeader(title: l10n.pickupOneDay),
              const SizedBox(height: 4),
              Text(
                l10n.pickupOneDayIntro,
                style: TextStyle(fontSize: 14, color: p.textSecondary),
              ),
              for (final note in pickup.notes)
                SettingsTile(
                  key: ValueKey('pickup-note-${note.date}'),
                  icon: AppIcons.pickupPerson,
                  title: l10n.pickupNoteLine(
                    isoDayLabel(note.date),
                    [note.name, ?note.relation].join(' · '),
                  ),
                  subtitle: note.note,
                  chevron: false,
                  trailing: TextButton(
                    key: ValueKey('pickup-note-delete-${note.date}'),
                    onPressed: () => _takeBack(context, ref, note),
                    child: Text(l10n.pickupTakeBack),
                  ),
                ),
              const SizedBox(height: 8),
              PrimaryButton(
                key: const ValueKey('pickup-note-new'),
                label: l10n.pickupTell,
                height: 48,
                onPressed: () => _note(context, ref),
              ),
            ],
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(childPickupProvider(student)),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

/// A person added to the pick-up list: their name, relation, phone and a
/// photo (sent as homework files are).
class _PersonSheet extends ConsumerStatefulWidget {
  const _PersonSheet();

  @override
  ConsumerState<_PersonSheet> createState() => _PersonSheetState();
}

class _PersonSheetState extends ConsumerState<_PersonSheet> {
  final _name = TextEditingController();
  final _relation = TextEditingController();
  final _phone = TextEditingController();
  ChatFile? _photo;
  bool _sending = false;
  bool _closed = false;

  @override
  void dispose() {
    _closed = true;
    _name.dispose();
    _relation.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final l10n = context.l10n;
    final picked = await ref
        .read(chatPickerProvider)
        .pick(ChatPickSource.camera);
    if (!mounted || picked == null) return;
    switch (picked) {
      case ChatPicked(:final file) when file.type.startsWith('image/'):
        if (file.size > homeworkMaxBytes(file.type)) {
          showMessage(context, l10n.homeworkFileTooBig);
          return;
        }
        setState(() => _photo = file);
      case ChatPicked() || ChatPickUnsupported():
        showMessage(context, l10n.homeworkFileType);
    }
  }

  Future<void> _done() async {
    final l10n = context.l10n;
    final name = _name.text.trim();
    if (name.isEmpty) {
      showMessage(context, l10n.pickupNameNeeded);
      return;
    }
    setState(() => _sending = true);
    try {
      String? photoId;
      final photo = _photo;
      if (photo != null) {
        photoId = await uploadChatFile(
          ref.read(schoolUploadsProvider),
          photo,
          cancelled: () => _closed,
        );
      }
      if (!mounted) return;
      String? optional(TextEditingController c) =>
          c.text.trim().isEmpty ? null : c.text.trim();
      Navigator.of(context).pop(
        PickupPersonInput(
          name: name,
          relation: optional(_relation),
          phone: optional(_phone),
          photoId: photoId,
        ),
      );
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              LabeledField(
                key: const ValueKey('pickup-name'),
                label: l10n.pickupName,
                controller: _name,
                maxLength: 120,
              ),
              const SizedBox(height: 8),
              LabeledField(
                key: const ValueKey('pickup-relation'),
                label: l10n.pickupRelation,
                controller: _relation,
                maxLength: 60,
              ),
              const SizedBox(height: 8),
              LabeledField(
                key: const ValueKey('pickup-phone'),
                label: l10n.pickupPhone,
                controller: _phone,
                maxLength: 30,
                keyboard: TextInputType.phone,
              ),
              const SizedBox(height: 8),
              SecondaryButton(
                key: const ValueKey('pickup-photo'),
                label: _photo?.name ?? l10n.pickupPhoto,
                icon: AppIcons.photo,
                height: 44,
                onPressed: _sending ? null : _pickPhoto,
              ),
              const SizedBox(height: 12),
              PrimaryButton(
                key: const ValueKey('pickup-person-save'),
                label: l10n.save,
                loading: _sending,
                height: 52,
                onPressed: _done,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// "Today X picks up": the day (today unless changed), who and a note.
class _NoteSheet extends ConsumerStatefulWidget {
  const _NoteSheet({required this.student});

  final int student;

  @override
  ConsumerState<_NoteSheet> createState() => _NoteSheetState();
}

class _NoteSheetState extends ConsumerState<_NoteSheet> {
  final _name = TextEditingController();
  final _relation = TextEditingController();
  final _phone = TextEditingController();
  final _note = TextEditingController();
  DateTime? _day;
  bool _sending = false;

  @override
  void dispose() {
    _name.dispose();
    _relation.dispose();
    _phone.dispose();
    _note.dispose();
    super.dispose();
  }

  static String _iso(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _pickDay() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: _day ?? today,
      firstDate: today,
      lastDate: today.add(const Duration(days: 30)),
    );
    if (picked != null && mounted) setState(() => _day = picked);
  }

  Future<void> _send() async {
    final l10n = context.l10n;
    final name = _name.text.trim();
    if (name.isEmpty) {
      showMessage(context, l10n.pickupNameNeeded);
      return;
    }
    String? optional(TextEditingController c) =>
        c.text.trim().isEmpty ? null : c.text.trim();
    setState(() => _sending = true);
    try {
      final day = _day;
      await ref
          .read(yallappApiProvider)
          .savePickupNote(
            widget.student,
            date: day == null ? null : _iso(day),
            name: name,
            relation: optional(_relation),
            phone: optional(_phone),
            note: optional(_note),
          );
      if (!mounted) return;
      showMessage(context, l10n.pickupTold);
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final day = _day;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SettingsTile(
                key: const ValueKey('pickup-note-day'),
                icon: AppIcons.calendar,
                title: l10n.pickupDay,
                subtitle: day == null
                    ? l10n.schoolToday
                    : isoDayLabel(_iso(day)),
                onTap: _sending ? null : _pickDay,
              ),
              const SizedBox(height: 8),
              LabeledField(
                key: const ValueKey('pickup-note-name'),
                label: l10n.pickupName,
                controller: _name,
                maxLength: 120,
              ),
              const SizedBox(height: 8),
              LabeledField(
                key: const ValueKey('pickup-note-relation'),
                label: l10n.pickupRelation,
                controller: _relation,
                maxLength: 60,
              ),
              const SizedBox(height: 8),
              LabeledField(
                key: const ValueKey('pickup-note-phone'),
                label: l10n.pickupPhone,
                controller: _phone,
                maxLength: 30,
                keyboard: TextInputType.phone,
              ),
              const SizedBox(height: 8),
              LabeledField(
                key: const ValueKey('pickup-note-note'),
                label: l10n.pickupNote,
                controller: _note,
                maxLength: 300,
              ),
              const SizedBox(height: 12),
              PrimaryButton(
                key: const ValueKey('pickup-note-send'),
                label: l10n.pickupTell,
                loading: _sending,
                height: 52,
                onPressed: _send,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
