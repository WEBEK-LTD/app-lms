import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/analytics.dart' show randomUuid;
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../chat/data/chat_providers.dart';
import '../../lms/teachers/teacher_widgets.dart' show LabeledField;
import '../data/school_providers.dart';
import '../../../core/widgets/studio_screen_scope.dart';

/// 113.6 Messages between a school's teachers and its families, as the
/// school allows them: the school's administration (always), then the
/// teachers of a parent's children (or a student's own), or a teacher's
/// classes' parents and students; the hours and whether the school reads
/// the conversations. A conversation opens in the chat. A teacher writes
/// to a whole class here when the school allows it.
///
/// Opened from the School tab (parents and students) and the Classroom tab
/// (teachers): `/school/messages`.
class SchoolMessagesScreen extends ConsumerWidget {
  const SchoolMessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return Scaffold(
      appBar: studioBar(
        context,
        AppBar(leading: appBarBack(context), title: Text(l10n.schoolMessages)),
      ),
      body: SafeArea(
        top: false,
        child: switch (ref.watch(schoolMessagesProvider)) {
          AsyncValue(value: final messages?) => RefreshIndicator(
            onRefresh: () async => ref.invalidate(schoolMessagesProvider),
            child: _Contacts(messages: messages),
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(schoolMessagesProvider),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

/// "Sun, Mon, Tue", in the app's language, of 1 Monday … 7 Sunday.
String weekdayNames(List<int> days, String locale) {
  final names = DateFormat.E(locale);
  // 2024-01-01 was a Monday.
  return [for (final d in days) names.format(DateTime(2024, 1, d))]
      .join(locale.startsWith('ar') ? '، ' : ', ');
}

/// The hours note: when messages can be sent and, outside them, when again.
String hoursNote(
  BuildContext context,
  SchoolMessageHours hours, {
  DateTime? opensAt,
}) {
  final l10n = context.l10n;
  final locale = Localizations.localeOf(context).toLanguageTag();
  final note = l10n.schoolMessagesHours(
    weekdayNames(hours.days, locale),
    hours.from,
    hours.to,
  );
  if (opensAt == null) return note;
  final when = DateFormat.MMMEd(locale).add_Hm().format(opensAt.toLocal());
  return '$note ${l10n.schoolMessagesOpensAt(when)}';
}

class _Contacts extends ConsumerWidget {
  const _Contacts({required this.messages});

  final SchoolMessages messages;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final teachers = messages.contacts
        .where((c) => c.role == SchoolRole.teacher)
        .toList();
    final families = messages.contacts
        .where((c) => c.role != SchoolRole.teacher)
        .toList();
    final hours = messages.hours;
    return ListView(
      key: const ValueKey('school-messages'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        if (messages.officeConversationId != null)
          AppCard(
            child: SettingsTile(
              key: const ValueKey('school-office'),
              icon: AppIcons.school,
              title: l10n.schoolMessagesOffice,
              subtitle: l10n.schoolMessagesOfficeHint,
              onTap: () => context.push(
                Paths.chatConversation(messages.officeConversationId!),
              ),
            ),
          ),
        const SizedBox(height: 16),
        if (!messages.enabled)
          MessageView(
            key: const ValueKey('school-messages-off'),
            icon: AppIcons.chat,
            title: l10n.schoolMessagesOff,
            compact: true,
          )
        else ...[
          _Note(
            key: const ValueKey('school-privacy'),
            icon: messages.adminReads ? AppIcons.info : AppIcons.lock,
            text: messages.adminReads
                ? l10n.schoolMessagesAdminReads
                : l10n.schoolMessagesPrivate,
          ),
          if (hours != null)
            _Note(
              key: const ValueKey('school-hours'),
              icon: AppIcons.schedule,
              text: hoursNote(
                context,
                hours,
                opensAt: messages.openNow ? null : messages.opensAt,
              ),
            ),
          if (messages.classMessages && messages.classes.isNotEmpty) ...[
            const SizedBox(height: 4),
            SecondaryButton(
              key: const ValueKey('school-write-class'),
              label: l10n.schoolMessagesWriteClass,
              icon: AppIcons.campaignUpdate,
              height: 46,
              onPressed: () => _writeToClass(context, messages.classes),
            ),
          ],
          const SizedBox(height: 12),
          if (messages.contacts.isEmpty)
            Text(
              l10n.schoolMessagesNone,
              key: const ValueKey('school-no-contacts'),
              style: TextStyle(fontSize: 14, color: p.textSecondary),
            ),
          if (teachers.isNotEmpty) ...[
            SectionHeader(title: l10n.schoolMessagesTeachers, size: 16),
            const SizedBox(height: 4),
            for (final c in teachers) _ContactTile(contact: c),
          ],
          if (families.isNotEmpty) ...[
            const SizedBox(height: 12),
            SectionHeader(title: l10n.schoolMessagesFamilies, size: 16),
            const SizedBox(height: 4),
            for (final c in families) _ContactTile(contact: c),
          ],
        ],
      ],
    );
  }

  Future<void> _writeToClass(
    BuildContext context,
    List<ClassroomClassName> classes,
  ) => showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    builder: (_) => ClassMessageSheet(
      classes: classes,
      withStudents: messages.reach == SchoolMessagesWith.parentsStudents,
    ),
  );
}

class _Note extends StatelessWidget {
  const _Note({super.key, required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppIcon(icon, size: 18, color: p.textSecondary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

/// A teacher, or a parent or student: what links them, and opening the
/// conversation (made the first time).
class _ContactTile extends ConsumerStatefulWidget {
  const _ContactTile({required this.contact});

  final SchoolContact contact;

  @override
  ConsumerState<_ContactTile> createState() => _ContactTileState();
}

class _ContactTileState extends ConsumerState<_ContactTile> {
  bool _opening = false;

  String _about(BuildContext context) {
    final l10n = context.l10n;
    final c = widget.contact;
    return switch (c.role) {
      SchoolRole.teacher => [
        if (c.classTeacher) l10n.schoolMessagesClassTeacher,
        ...c.subjects,
        ...c.students,
      ].join(' · '),
      SchoolRole.parent => [
        if (c.students.isNotEmpty)
          l10n.schoolMessagesParentOf(c.students.join(', ')),
        ...c.classes,
      ].join(' · '),
      // 113.3 Staff aren't contacts (the school writes to them itself).
      SchoolRole.student || SchoolRole.staff => c.classes.join(' · '),
    };
  }

  Future<void> _open() async {
    final l10n = context.l10n;
    final c = widget.contact;
    if (!c.canWrite && c.conversationId == null) {
      showMessage(context, l10n.schoolMessagesTeacherFirst);
      return;
    }
    setState(() => _opening = true);
    try {
      final id =
          c.conversationId ??
          await ref.read(yallappApiProvider).openSchoolConversation(c.personId);
      if (!mounted) return;
      ref.invalidate(chatConversationsProvider);
      unawaited(context.push(Paths.chatConversation(id)));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final c = widget.contact;
    final about = _about(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: AppCard(
        key: ValueKey('contact-${c.role.name}-${c.personId}'),
        padding: const EdgeInsets.all(12),
        onTap: _opening ? null : _open,
        child: Row(
          children: [
            InitialsAvatar(name: c.name, imageUrl: c.photoUrl, size: 40),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    c.name,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  if (about.isNotEmpty)
                    Text(
                      about,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                ],
              ),
            ),
            if (_opening)
              const SizedBox.square(
                dimension: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else
              AppIcon(
                c.canWrite ? AppIcons.chat : AppIcons.lock,
                size: 20,
                color: p.textSecondary,
              ),
          ],
        ),
      ),
    );
  }
}

/// A teacher writes to a whole class at once: the same text to each parent
/// (or student) on their own; their answers come back one by one.
class ClassMessageSheet extends ConsumerStatefulWidget {
  const ClassMessageSheet({
    super.key,
    required this.classes,
    required this.withStudents,
  });

  final List<ClassroomClassName> classes;

  /// The school lets teachers write to students too.
  final bool withStudents;

  @override
  ConsumerState<ClassMessageSheet> createState() => _ClassMessageSheetState();
}

class _ClassMessageSheetState extends ConsumerState<ClassMessageSheet> {
  final _text = TextEditingController();
  late ClassroomClassName _class = widget.classes.first;
  ClassAudience _to = ClassAudience.parents;
  bool _sending = false;

  /// Kept for the whole sheet: sending again after a network error sends nothing twice.
  final String _clientId = 'class-${randomUuid()}';

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final l10n = context.l10n;
    final text = _text.text.trim();
    if (text.isEmpty) {
      showMessage(context, l10n.classMessageMissing);
      return;
    }
    setState(() => _sending = true);
    try {
      final sent = await ref
          .read(yallappApiProvider)
          .messageClass(_class.id, to: _to, clientId: _clientId, text: text);
      if (!mounted) return;
      ref.invalidate(chatConversationsProvider);
      showMessage(
        context,
        [
          l10n.classMessageSent(sent.sent),
          if (sent.notInApp > 0) l10n.classMessageNotInApp(sent.notInApp),
        ].join(' '),
      );
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
    final audiences = widget.withStudents
        ? ClassAudience.values
        : [ClassAudience.parents];
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            key: const ValueKey('class-message-sheet'),
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 16),
              Text(
                l10n.classMessageTitle(_class.name),
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 12),
              if (widget.classes.length > 1) ...[
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final c in widget.classes)
                      ChoiceChip(
                        key: ValueKey('class-message-class-${c.id}'),
                        label: Text(c.name),
                        selected: c.id == _class.id,
                        onSelected: (_) => setState(() => _class = c),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
              Text(
                l10n.classMessageTo,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final a in audiences)
                    ChoiceChip(
                      key: ValueKey('class-message-to-${a.name}'),
                      label: Text(switch (a) {
                        ClassAudience.parents => l10n.classMessageParents,
                        ClassAudience.students => l10n.classMessageStudents,
                        ClassAudience.families => l10n.classMessageFamilies,
                      }),
                      selected: a == _to,
                      onSelected: (_) => setState(() => _to = a),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              LabeledField(
                key: const ValueKey('class-message-text'),
                label: l10n.classroomMessage,
                controller: _text,
                lines: 5,
                maxLength: 4000,
              ),
              const SizedBox(height: 6),
              Text(
                l10n.classMessageHint,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
              const SizedBox(height: 16),
              PrimaryButton(
                key: const ValueKey('class-message-send'),
                label: l10n.send,
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

/// A row for Messages in the School and Classroom tabs.
class SchoolMessagesTile extends StatelessWidget {
  const SchoolMessagesTile({super.key, required this.teacher});

  /// For a teacher (their classes' families) or a family (their teachers).
  final bool teacher;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return SettingsTile(
      key: const ValueKey('school-messages-open'),
      icon: AppIcons.chat,
      title: l10n.schoolMessages,
      subtitle: teacher
          ? l10n.schoolMessagesWithFamilies
          : l10n.schoolMessagesWithTeachers,
      onTap: () => context.push(Paths.schoolMessages),
    );
  }
}
