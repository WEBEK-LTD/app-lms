import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import 'learning_providers.dart';

/// 113.7 Under a lesson, for its enrolled student: a bookmark, their own
/// notes (private, at the place in the video maybe) and the lesson's
/// discussion.
class LessonTools extends ConsumerStatefulWidget {
  const LessonTools({super.key, required this.lesson, this.position});

  final Lesson lesson;

  /// Where the video is now, for a note written while watching.
  final int? Function()? position;

  @override
  ConsumerState<LessonTools> createState() => _LessonToolsState();
}

class _LessonToolsState extends ConsumerState<LessonTools> {
  late bool _bookmarked = widget.lesson.bookmarked;
  bool _saving = false;

  Future<void> _toggle() async {
    if (_saving) return;
    final on = !_bookmarked;
    setState(() {
      _bookmarked = on;
      _saving = true;
    });
    try {
      await ref
          .read(yallappApiProvider)
          .setLessonBookmark(widget.lesson.id, on: on);
      ref.invalidate(courseNotesProvider(widget.lesson.courseId));
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _bookmarked = !on);
      showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final features = ref.watch(appConfigProvider).features;
    final lesson = widget.lesson;
    final discussion = lesson.discussionCount;
    return Wrap(
      key: const ValueKey('lesson-tools'),
      spacing: 8,
      runSpacing: 8,
      children: [
        if (features.notes) ...[
          SecondaryButton(
            key: const ValueKey('lesson-bookmark'),
            label: _bookmarked ? l10n.removeBookmark : l10n.bookmarkLesson,
            icon: _bookmarked ? AppIcons.bookmark : AppIcons.bookmarkAdd,
            height: 42,
            onPressed: _toggle,
          ),
          SecondaryButton(
            key: const ValueKey('lesson-notes'),
            label: lesson.noteCount > 0
                ? '${l10n.notesTitle} · ${lesson.noteCount}'
                : l10n.notesTitle,
            icon: AppIcons.notes,
            height: 42,
            onPressed: () => showLessonNotes(
              context,
              lesson: lesson,
              position: widget.position?.call(),
            ),
          ),
        ],
        if (features.lessonDiscussion && discussion != null)
          SecondaryButton(
            key: const ValueKey('lesson-discussion'),
            label:
                '${l10n.lessonDiscussion} · ${l10n.discussionCount(discussion)}',
            icon: AppIcons.discussion,
            height: 42,
            onPressed: () => context.push(Paths.lessonDiscussion(lesson.id)),
          ),
      ],
    );
  }
}

/// The student's notes on a lesson, in a sheet: written, changed, deleted.
Future<void> showLessonNotes(
  BuildContext context, {
  required Lesson lesson,
  int? position,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  builder: (_) => LessonNotesSheet(lesson: lesson, position: position),
);

class LessonNotesSheet extends ConsumerStatefulWidget {
  const LessonNotesSheet({super.key, required this.lesson, this.position});

  final Lesson lesson;
  final int? position;

  @override
  ConsumerState<LessonNotesSheet> createState() => _LessonNotesSheetState();
}

class _LessonNotesSheetState extends ConsumerState<LessonNotesSheet> {
  final _text = TextEditingController();
  int? _editing;
  bool _saving = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  void _changed() {
    ref
      ..invalidate(lessonNotesProvider(widget.lesson.id))
      ..invalidate(courseNotesProvider(widget.lesson.courseId));
  }

  Future<void> _save() async {
    final text = _text.text.trim();
    if (text.isEmpty || _saving) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(yallappApiProvider);
      final editing = _editing;
      if (editing == null) {
        await api.addLessonNote(
          widget.lesson.id,
          text,
          positionSeconds: widget.position,
        );
      } else {
        await api.editLessonNote(editing, text);
      }
      _text.clear();
      setState(() => _editing = null);
      _changed();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete(LessonNote note) async {
    final l10n = context.l10n;
    final ok = await confirmAction(
      context,
      title: l10n.deleteNote,
      message: l10n.deleteConfirm,
      confirmLabel: l10n.deleteNote,
    );
    if (!ok || !mounted) return;
    try {
      await ref.read(yallappApiProvider).deleteLessonNote(note.id);
      _changed();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final notes = ref.watch(lessonNotesProvider(widget.lesson.id));
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * 0.8,
          ),
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            children: [
              Text(
                l10n.notesTitle,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text(
                l10n.notesPrivate,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
              const SizedBox(height: 12),
              switch (notes) {
                AsyncData(:final value) when value.items.isEmpty => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    l10n.noNotes,
                    style: TextStyle(fontSize: 14, color: p.textSecondary),
                  ),
                ),
                AsyncData(:final value) => Column(
                  children: [
                    for (final note in value.items)
                      NoteTile(
                        note: note,
                        onEdit: () => setState(() {
                          _editing = note.id;
                          _text.text = note.text;
                        }),
                        onDelete: () => _delete(note),
                      ),
                  ],
                ),
                AsyncError(:final error) => ErrorView(
                  error: error,
                  onRetry: () =>
                      ref.invalidate(lessonNotesProvider(widget.lesson.id)),
                ),
                _ => const SkeletonList(
                  layout: SkeletonLayout.text,
                  count: 2,
                  padding: EdgeInsets.zero,
                ),
              },
              const SizedBox(height: 12),
              TextField(
                key: const ValueKey('note-text'),
                controller: _text,
                minLines: 2,
                maxLines: 6,
                maxLength: 2000,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(hintText: l10n.noteHint),
              ),
              const SizedBox(height: 8),
              PrimaryButton(
                key: const ValueKey('note-save'),
                label: _editing == null ? l10n.addNote : l10n.editNote,
                loading: _saving,
                height: 50,
                onPressed: _save,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A note: its text, where in the video it was written, and its actions.
class NoteTile extends StatelessWidget {
  const NoteTile({
    super.key,
    required this.note,
    this.onEdit,
    this.onDelete,
    this.onTap,
    this.showLesson = false,
  });

  final LessonNote note;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback? onTap;
  final bool showLesson;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final at = note.positionSeconds;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: AppCard(
        key: ValueKey('note-${note.id}'),
        padding: const EdgeInsets.all(14),
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if ((showLesson && note.lessonTitle.isNotEmpty) || at != null)
              Text(
                [
                  if (showLesson && note.lessonTitle.isNotEmpty)
                    note.lessonTitle,
                  if (at != null)
                    l10n.noteAt(formatClock(Duration(seconds: at))),
                ].join(' · '),
                style: TextStyle(fontSize: 12, color: p.textSecondary),
              ),
            SelectableText(
              note.text,
              style: TextStyle(fontSize: 15, height: 1.45, color: p.text),
            ),
            if (onEdit != null || onDelete != null)
              Wrap(
                alignment: WrapAlignment.end,
                children: [
                  if (onEdit != null)
                    TextButton(onPressed: onEdit, child: Text(l10n.editNote)),
                  if (onDelete != null)
                    TextButton(
                      onPressed: onDelete,
                      child: Text(
                        l10n.deleteNote,
                        style: TextStyle(color: p.danger),
                      ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
