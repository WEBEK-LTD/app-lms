import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
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
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/school_providers.dart';
import '../widgets/school_widgets.dart';
import 'checkin_screens.dart';
import 'classroom_screens.dart' show BusDutyEntry, SchoolStaffEntries;
import 'student_screens.dart' show FileTile, NewsCard;

/// 113.3 The Staff tab, for the school's staff who don't teach (teachers
/// have the same in the Classroom tab): today's check-in, 113.10 bus duty
/// for a bus's crew, their job, hours and duties, their leave requests and
/// the staff's news, 113.8 the school's calendar and 113.11 the library.
class StaffScreen extends ConsumerWidget {
  const StaffScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final header = TabHeader(title: l10n.tabStaff);
    final staff = ref.watch(isSchoolStaffProvider) == true;
    final teacher = ref.watch(isSchoolTeacherProvider) == true;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            header,
            Expanded(
              child: !staff && !teacher
                  ? MessageView(
                      icon: AppIcons.staffBadge,
                      title: l10n.staffNotStaff,
                      message: l10n.staffNotStaffMessage,
                    )
                  : RefreshIndicator(
                      onRefresh: () async => ref
                        ..invalidate(staffMeProvider)
                        ..invalidate(checkinTodayProvider),
                      child: ListView(
                        key: const ValueKey('staff'),
                        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                        children: const [
                          CheckinCard(),
                          BusDutyEntry(),
                          StaffWorkCard(),
                          SizedBox(height: 20),
                          StaffTiles(),
                          SizedBox(height: 10),
                          SchoolStaffEntries(),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The person's job, department, days, hours and duties.
class StaffWorkCard extends ConsumerWidget {
  const StaffWorkCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    return switch (ref.watch(staffMeProvider)) {
      AsyncValue(value: final me?) => AppCard(
        key: const ValueKey('staff-work'),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                InitialsAvatar(name: me.name, imageUrl: me.photoUrl, size: 44),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        me.name,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                      if (me.jobTitle != null || me.department != null)
                        Text(
                          [?me.jobTitle, ?me.department].join(' · '),
                          style: TextStyle(
                            fontSize: 13,
                            color: p.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SectionHeader(title: l10n.staffWork, size: 15),
            Text(
              [
                l10n.staffDays(me.days.map(weekdayName).join(', ')),
                l10n.staffHours(
                  me.workHours?.starts ?? me.times.starts,
                  me.workHours?.ends ?? me.times.ends,
                ),
              ].join('\n'),
              style: TextStyle(fontSize: 14, color: p.textBody),
            ),
            if (me.duties != null) ...[
              const SizedBox(height: 10),
              Text(
                l10n.staffDuties,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
              Text(
                me.duties!,
                key: const ValueKey('staff-duties'),
                style: TextStyle(fontSize: 14, color: p.textBody),
              ),
            ],
          ],
        ),
      ),
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(staffMeProvider),
      ),
      _ => const SizedBox(height: 80),
    };
  }
}

/// Leave requests, the staff's news and 113.12 the person's payslips, on the
/// Staff and Classroom tabs.
class StaffTiles extends StatelessWidget {
  const StaffTiles({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return SettingsGroup(
      title: l10n.tabStaff,
      children: [
        SettingsTile(
          key: const ValueKey('staff-leave'),
          icon: AppIcons.leave,
          title: l10n.staffLeave,
          onTap: () => context.push(Paths.staffLeave),
        ),
        SettingsTile(
          key: const ValueKey('staff-news'),
          icon: AppIcons.campaignUpdate,
          title: l10n.staffNews,
          onTap: () => context.push(Paths.staffNews),
        ),
        // 113.12 Their own payslips.
        SettingsTile(
          key: const ValueKey('staff-payslips'),
          icon: AppIcons.payslip,
          title: l10n.staffPayslips,
          onTap: () => context.push(Paths.staffPayslips),
        ),
      ],
    );
  }
}

// Leave requests

String leaveKindLabel(AppLocalizations l10n, LeaveKind kind) => switch (kind) {
  LeaveKind.sick => l10n.leaveSick,
  LeaveKind.annual => l10n.leaveAnnual,
  LeaveKind.other => l10n.leaveOther,
};

(String, PillTone) leaveStatusLabel(AppLocalizations l10n, LeaveStatus s) =>
    switch (s) {
      LeaveStatus.pending => (l10n.leavePending, PillTone.warn),
      LeaveStatus.approved => (l10n.leaveApproved, PillTone.good),
      LeaveStatus.refused => (l10n.leaveRefused, PillTone.bad),
      LeaveStatus.cancelled => (l10n.leaveCancelled, PillTone.neutral),
    };

class LeaveScreen extends ConsumerWidget {
  const LeaveScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(leaveRequestsProvider);
    final controller = ref.read(leaveRequestsProvider.notifier);
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.staffLeave),
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const ValueKey('leave-ask'),
        onPressed: () async {
          final sent = await context.push<bool>(Paths.staffLeaveNew);
          if (sent == true) controller.refresh();
        },
        icon: const AppIcon(AppIcons.add),
        label: Text(l10n.leaveAsk),
      ),
      body: SafeArea(
        top: false,
        child: PagedItems<LeaveRequest>(
          state: state,
          controller: controller,
          empty: Text(
            l10n.leaveNone,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: context.palette.textSecondary,
            ),
          ),
          item: (context, leave) =>
              _LeaveCard(leave: leave, onChanged: controller.refresh),
        ),
      ),
    );
  }
}

class _LeaveCard extends ConsumerStatefulWidget {
  const _LeaveCard({required this.leave, required this.onChanged});

  final LeaveRequest leave;
  final Future<void> Function() onChanged;

  @override
  ConsumerState<_LeaveCard> createState() => _LeaveCardState();
}

class _LeaveCardState extends ConsumerState<_LeaveCard> {
  bool _busy = false;

  Future<void> _withdraw() async {
    setState(() => _busy = true);
    try {
      await ref.read(yallappApiProvider).withdrawLeaveRequest(widget.leave.id);
      await widget.onChanged();
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
    final leave = widget.leave;
    final (label, tone) = leaveStatusLabel(l10n, leave.status);
    return AppCard(
      key: ValueKey('leave-${leave.id}'),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  leaveKindLabel(l10n, leave.kind),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
              SchoolPill(label: label, tone: tone),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            [
              l10n.leaveDates(
                isoDayLabel(leave.startsOn),
                isoDayLabel(leave.endsOn),
              ),
              l10n.leaveDays(leave.days),
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          if (leave.note != null) ...[
            const SizedBox(height: 6),
            Text(
              leave.note!,
              style: TextStyle(fontSize: 14, color: p.textBody),
            ),
          ],
          if (leave.file != null) FileTile(file: leave.file!),
          if (leave.answer != null) ...[
            const SizedBox(height: 6),
            Text(
              l10n.leaveSchoolNote(leave.answer!),
              key: ValueKey('leave-answer-${leave.id}'),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
          ],
          if (leave.status == LeaveStatus.pending) ...[
            const SizedBox(height: 10),
            SecondaryButton(
              key: ValueKey('leave-withdraw-${leave.id}'),
              label: l10n.leaveWithdraw,
              height: 40,
              onPressed: _busy ? null : _withdraw,
            ),
          ],
        ],
      ),
    );
  }
}

/// Asks for leave: its kind, first and last days, a note and a photo or
/// PDF of a document (sent as homework files are).
class LeaveFormScreen extends ConsumerStatefulWidget {
  const LeaveFormScreen({super.key});

  @override
  ConsumerState<LeaveFormScreen> createState() => _LeaveFormScreenState();
}

class _LeaveFormScreenState extends ConsumerState<LeaveFormScreen> {
  final _note = TextEditingController();
  LeaveKind _kind = LeaveKind.sick;
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
    _note.dispose();
    super.dispose();
  }

  Future<void> _pickDay({required bool first}) async {
    final today = _today();
    final picked = await showDatePicker(
      context: context,
      initialDate: first ? _from : _to,
      firstDate: today.subtract(const Duration(days: 30)),
      lastDate: today.add(const Duration(days: 365)),
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
    if (_to.isBefore(_from)) {
      showMessage(context, l10n.leaveDatesOrder);
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
      final note = _note.text.trim();
      await ref
          .read(yallappApiProvider)
          .requestLeave(
            LeaveInput(
              kind: _kind,
              startsOn: _iso(_from),
              endsOn: _iso(_to),
              note: note.isEmpty ? null : note,
              uploadId: uploadId,
            ),
          );
      if (!mounted) return;
      showMessage(context, l10n.leaveSent);
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
      appBar: AppBar(leading: appBarBack(context), title: Text(l10n.leaveAsk)),
      body: SafeArea(
        top: false,
        child: ListView(
          key: const ValueKey('leave-form'),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            Text(
              l10n.leaveKind,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final kind in LeaveKind.values)
                  ChoiceChip(
                    key: ValueKey('leave-kind-${kind.name}'),
                    label: Text(leaveKindLabel(l10n, kind)),
                    selected: _kind == kind,
                    onSelected: _sending
                        ? null
                        : (_) => setState(() => _kind = kind),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            SettingsGroup(
              title: l10n.leaveDates(l10n.leaveFirstDay, l10n.leaveLastDay),
              children: [
                SettingsTile(
                  key: const ValueKey('leave-from'),
                  icon: AppIcons.calendar,
                  title: l10n.leaveFirstDay,
                  subtitle: isoDayLabel(_iso(_from)),
                  onTap: _sending ? null : () => _pickDay(first: true),
                ),
                SettingsTile(
                  key: const ValueKey('leave-to'),
                  icon: AppIcons.calendar,
                  title: l10n.leaveLastDay,
                  subtitle: isoDayLabel(_iso(_to)),
                  onTap: _sending ? null : () => _pickDay(first: false),
                ),
              ],
            ),
            const SizedBox(height: 16),
            LabeledField(
              key: const ValueKey('leave-note'),
              label: l10n.leaveNote,
              controller: _note,
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
                    key: const ValueKey('leave-photo'),
                    label: l10n.leaveAddPhoto,
                    icon: AppIcons.photo,
                    height: 44,
                    onPressed: () => _pick(ChatPickSource.camera),
                  ),
                  SecondaryButton(
                    key: const ValueKey('leave-file'),
                    label: l10n.leaveAddFile,
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
              key: const ValueKey('leave-send'),
              label: l10n.leaveSend,
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

// The staff's news

class StaffNewsScreen extends ConsumerWidget {
  const StaffNewsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return Scaffold(
      appBar: AppBar(leading: appBarBack(context), title: Text(l10n.staffNews)),
      body: SafeArea(
        top: false,
        child: PagedItems<SchoolAnnouncement>(
          state: ref.watch(staffNewsProvider),
          controller: ref.read(staffNewsProvider.notifier),
          empty: Text(
            l10n.staffNoNews,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: context.palette.textSecondary,
            ),
          ),
          item: (context, a) => NewsCard(item: a),
        ),
      ),
    );
  }
}
