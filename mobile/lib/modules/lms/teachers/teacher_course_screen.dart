import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../chat/data/chat_api.dart';
import '../../chat/data/chat_media.dart';
import '../courses/community_widgets.dart' show showTextSheet;
import 'lesson_upload.dart';
import 'teacher_widgets.dart';
import 'teachers_providers.dart';

/// 105.3 A teacher's course: its details, sections and lessons, and sending
/// it to the academy. A draft (or one the academy returned) is the
/// teacher's to change; a published course takes new lessons at once; one
/// in review waits. [courseId] null: a new course.
class TeacherCourseScreen extends ConsumerWidget {
  const TeacherCourseScreen({super.key, this.courseId});

  final int? courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final id = courseId;
    if (id == null) {
      return Scaffold(
        appBar: AppBar(
          leading: appBarBack(context),
          title: Text(l10n.teacherNewCourse),
        ),
        body: const _DetailsForm(),
      );
    }
    final async = ref.watch(teacherCourseProvider(id));
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(async.value?.title ?? ''),
      ),
      body: switch (async) {
        AsyncValue(value: final course?) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(teacherCourseProvider(id)),
          child: _CourseView(course: course),
        ),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(teacherCourseProvider(id)),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

/// A course's title, description, price, level and category: a new
/// course's, or one to change.
class _DetailsForm extends ConsumerStatefulWidget {
  const _DetailsForm({this.course});

  final TeacherCourse? course;

  @override
  ConsumerState<_DetailsForm> createState() => _DetailsFormState();
}

class _DetailsFormState extends ConsumerState<_DetailsForm> {
  final _form = GlobalKey<FormState>();
  late final _title = TextEditingController(text: widget.course?.title);
  late final _description = TextEditingController(
    text: widget.course?.description,
  );
  late final _price = TextEditingController(
    text: widget.course == null || widget.course!.free
        ? ''
        : widget.course!.price,
  );
  late CourseLevel? _level = widget.course?.level;
  late int? _category = widget.course?.categoryId;
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _price.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    final input = TeacherCourseInput(
      title: _title.text,
      description: _description.text,
      price: _price.text.replaceAll(',', '.'),
      level: _level,
      categoryId: _category,
    );
    setState(() => _saving = true);
    final api = ref.read(yallappApiProvider);
    try {
      final existing = widget.course;
      if (existing == null) {
        final made = await api.createTeacherCourse(input);
        ref.invalidate(teacherCoursesProvider);
        if (mounted) context.pushReplacement(Paths.teacherCourse(made.id));
      } else {
        await api.updateTeacherCourse(existing.id, input);
        ref
          ..invalidate(teacherCourseProvider(existing.id))
          ..invalidate(teacherCoursesProvider);
        if (mounted) Navigator.of(context).pop();
      }
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final list = ref.watch(teacherCoursesProvider).value;
    final categories = list?.categories ?? const <Category>[];
    final currency = list?.currency ?? '';
    return Form(
      key: _form,
      child: ListView(
        key: const ValueKey('teacher-course-form'),
        shrinkWrap: widget.course != null,
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          if (widget.course != null) ...[
            Text(
              l10n.courseEditDetails,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
          ],
          LabeledField(
            key: const ValueKey('course-title'),
            label: l10n.courseFieldTitle,
            controller: _title,
            maxLength: 200,
            validator: (v) =>
                (v ?? '').trim().isEmpty ? l10n.intakeRequired : null,
          ),
          const SizedBox(height: 12),
          LabeledField(
            key: const ValueKey('course-description'),
            label: l10n.courseFieldDescription,
            controller: _description,
            lines: 4,
            maxLength: 5000,
          ),
          const SizedBox(height: 12),
          LabeledField(
            key: const ValueKey('course-price'),
            label: l10n.courseFieldPrice(currency),
            hint: l10n.courseFieldPriceHint,
            controller: _price,
            keyboard: const TextInputType.numberWithOptions(decimal: true),
            validator: (v) {
              final text = (v ?? '').trim().replaceAll(',', '.');
              if (text.isEmpty) return null;
              final value = double.tryParse(text);
              return value == null || value < 0 ? l10n.intakeRequired : null;
            },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<CourseLevel?>(
            key: const ValueKey('course-level'),
            initialValue: _level,
            isExpanded: true,
            decoration: InputDecoration(labelText: l10n.courseFieldLevel),
            items: [
              DropdownMenuItem(value: null, child: Text(l10n.courseNoCategory)),
              DropdownMenuItem(
                value: CourseLevel.beginner,
                child: Text(l10n.levelBeginner),
              ),
              DropdownMenuItem(
                value: CourseLevel.intermediate,
                child: Text(l10n.levelIntermediate),
              ),
              DropdownMenuItem(
                value: CourseLevel.advanced,
                child: Text(l10n.levelAdvanced),
              ),
            ],
            onChanged: (v) => setState(() => _level = v),
          ),
          if (categories.isNotEmpty) ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<int?>(
              key: const ValueKey('course-category'),
              initialValue: categories.any((c) => c.id == _category)
                  ? _category
                  : null,
              isExpanded: true,
              decoration: InputDecoration(labelText: l10n.courseFieldCategory),
              items: [
                DropdownMenuItem(
                  value: null,
                  child: Text(l10n.courseNoCategory),
                ),
                for (final c in categories)
                  DropdownMenuItem(value: c.id, child: Text(c.name)),
              ],
              onChanged: (v) => setState(() => _category = v),
            ),
          ],
          const SizedBox(height: 20),
          PrimaryButton(
            key: const ValueKey('course-save'),
            label: widget.course == null ? l10n.courseCreate : l10n.courseSave,
            loading: _saving,
            onPressed: _save,
          ),
        ],
      ),
    );
  }
}

class _CourseView extends ConsumerStatefulWidget {
  const _CourseView({required this.course});

  final TeacherCourse course;

  @override
  ConsumerState<_CourseView> createState() => _CourseViewState();
}

class _CourseViewState extends ConsumerState<_CourseView> {
  bool _sending = false;

  TeacherCourse get course => widget.course;

  void _changed() {
    ref
      ..invalidate(teacherCourseProvider(course.id))
      ..invalidate(teacherCoursesProvider);
  }

  Future<void> _editDetails() => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (context) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(child: _DetailsForm(course: course)),
    ),
  );

  Future<void> _addSection() => showTextSheet(
    context,
    title: context.l10n.courseAddSection,
    hint: context.l10n.courseSectionTitle,
    sendLabel: context.l10n.courseAddSection,
    onSend: (title) async {
      try {
        await ref.read(yallappApiProvider).addTeacherSection(course.id, title);
        _changed();
        return true;
      } on ApiException catch (e) {
        if (mounted) showMessage(context, e.message);
        return false;
      }
    },
  );

  Future<void> _addLesson(TeacherSection section) async {
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _LessonSheet(course: course, section: section),
    );
    if (added ?? false) _changed();
  }

  Future<void> _removeLesson(TeacherLesson lesson) async {
    try {
      await ref
          .read(yallappApiProvider)
          .deleteTeacherLesson(course.id, lesson.id);
      _changed();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    }
  }

  Future<void> _submit() async {
    setState(() => _sending = true);
    try {
      await ref.read(yallappApiProvider).submitTeacherCourse(course.id);
      _changed();
      if (mounted) showMessage(context, context.l10n.courseSentForReview);
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
    final note = switch (course.stage) {
      CourseStage.returned when (course.reviewNote ?? '').isNotEmpty =>
        l10n.teachNote(course.reviewNote!),
      CourseStage.inReview => l10n.courseInReviewNote,
      CourseStage.published => l10n.coursePublishedNote,
      _ => null,
    };
    final submittable =
        course.editable && course.sections.any((s) => s.lessons.isNotEmpty);
    return ListView(
      key: const ValueKey('teacher-course'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        Row(
          children: [
            Flexible(child: StagePill(stage: course.stage)),
            const Spacer(),
            if (course.editable)
              Flexible(
                child: TextButton(
                  key: const ValueKey('course-edit'),
                  onPressed: _editDetails,
                  child: Text(
                    l10n.courseEditDetails,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          [
            course.free ? l10n.free : course.priceFormatted,
            l10n.lessonCount(course.lessonCount),
          ].join(' · '),
          style: TextStyle(fontSize: 13, color: p.textSecondary),
        ),
        if (note != null) ...[
          const SizedBox(height: 8),
          AppCard(
            key: const ValueKey('course-note'),
            color: p.surfaceMuted,
            padding: const EdgeInsets.all(12),
            child: Text(
              note,
              style: TextStyle(fontSize: 14, height: 1.4, color: p.textBody),
            ),
          ),
        ],
        if (course.description.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text(
            course.description,
            style: TextStyle(fontSize: 15, height: 1.5, color: p.textBody),
          ),
        ],
        const SizedBox(height: 16),
        for (final section in course.sections) ...[
          AppCard(
            key: ValueKey('section-${section.id}'),
            padding: const EdgeInsets.fromLTRB(14, 12, 6, 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsetsDirectional.only(end: 8),
                  child: Text(
                    section.title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                ),
                for (final lesson in section.lessons)
                  _LessonRow(
                    lesson: lesson,
                    onRemove: course.editable
                        ? () => _removeLesson(lesson)
                        : null,
                  ),
                if (course.growable)
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: TextButton.icon(
                      key: ValueKey('add-lesson-${section.id}'),
                      onPressed: () => _addLesson(section),
                      icon: AppIcon(AppIcons.add, size: 18, color: p.link),
                      label: Text(l10n.courseAddLesson),
                      style: TextButton.styleFrom(foregroundColor: p.link),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 10),
        ],
        if (course.growable)
          SecondaryButton(
            key: const ValueKey('add-section'),
            label: l10n.courseAddSection,
            icon: AppIcons.add,
            height: 48,
            onPressed: _addSection,
          ),
        if (submittable) ...[
          const SizedBox(height: 20),
          PrimaryButton(
            key: const ValueKey('course-submit'),
            label: l10n.courseSendForReview,
            icon: AppIcons.send,
            loading: _sending,
            onPressed: _submit,
          ),
        ],
      ],
    );
  }
}

class _LessonRow extends StatelessWidget {
  const _LessonRow({required this.lesson, this.onRemove});

  final TeacherLesson lesson;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final (icon, kind) = switch (lesson.kind) {
      TeacherLessonKind.video => (AppIcons.video, l10n.lessonKindVideo),
      TeacherLessonKind.pdf => (AppIcons.file, l10n.lessonKindPdf),
      TeacherLessonKind.text => (AppIcons.article, l10n.lessonKindText),
    };
    return Padding(
      key: ValueKey('lesson-${lesson.id}'),
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          AppIcon(icon, size: 20, color: p.textSecondary, semanticLabel: kind),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              lesson.title,
              style: TextStyle(fontSize: 14, color: p.text),
            ),
          ),
          if (lesson.durationMinutes != null)
            Text(
              l10n.durationMinutes(lesson.durationMinutes!),
              style: TextStyle(fontSize: 12, color: p.textSecondary),
            ),
          if (onRemove != null)
            IconButton(
              tooltip: l10n.lessonRemove,
              onPressed: onRemove,
              icon: AppIcon(AppIcons.delete, size: 20, color: p.textSecondary),
            )
          else
            const SizedBox(width: 8),
        ],
      ),
    );
  }
}

/// A new lesson: its title, then a video link, a video or PDF from the
/// phone, or text. The file is sent first; the lesson is added with it.
class _LessonSheet extends ConsumerStatefulWidget {
  const _LessonSheet({required this.course, required this.section});

  final TeacherCourse course;
  final TeacherSection section;

  @override
  ConsumerState<_LessonSheet> createState() => _LessonSheetState();
}

class _LessonSheetState extends ConsumerState<_LessonSheet> {
  final _title = TextEditingController();
  final _video = TextEditingController();
  final _text = TextEditingController();
  final _minutes = TextEditingController();
  bool _preview = false;
  ChatFile? _file;
  double? _progress;
  bool _saving = false;
  bool _closed = false;

  @override
  void dispose() {
    _closed = true;
    _title.dispose();
    _video.dispose();
    _text.dispose();
    _minutes.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    final l10n = context.l10n;
    final picked = await ref.read(lessonFilePickerProvider).pick();
    if (!mounted || picked == null) return;
    switch (picked) {
      case ChatPickUnsupported():
        showMessage(context, l10n.lessonFileType);
      case ChatPicked(:final file):
        if (file.size > lessonMaxBytes(file.type)) {
          showMessage(context, l10n.lessonFileTooBig);
          return;
        }
        setState(() => _file = file);
    }
  }

  Future<void> _save() async {
    final l10n = context.l10n;
    final title = _title.text.trim();
    if (title.isEmpty) {
      showMessage(context, l10n.lessonFieldTitle);
      return;
    }
    final video = _video.text.trim();
    final text = _text.text.trim();
    if (_file == null && video.isEmpty && text.isEmpty) {
      showMessage(context, l10n.lessonNeedsContent);
      return;
    }
    setState(() => _saving = true);
    try {
      String? uploadId;
      final file = _file;
      if (file != null) {
        setState(() => _progress = 0);
        uploadId = await uploadChatFile(
          ref.read(teacherUploadsProvider),
          file,
          onProgress: (v) {
            if (mounted) setState(() => _progress = v);
          },
          cancelled: () => _closed,
        );
      }
      await ref
          .read(yallappApiProvider)
          .addTeacherLesson(
            widget.course.id,
            TeacherLessonInput(
              sectionId: widget.section.id,
              title: title,
              text: text,
              videoUrl: file == null && video.isNotEmpty ? video : null,
              uploadId: uploadId,
              durationMinutes: int.tryParse(_minutes.text.trim()),
              preview: _preview,
            ),
          );
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
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
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.courseAddLesson,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              LabeledField(
                key: const ValueKey('lesson-title'),
                label: l10n.lessonFieldTitle,
                controller: _title,
                maxLength: 200,
              ),
              const SizedBox(height: 8),
              if (file == null) ...[
                LabeledField(
                  key: const ValueKey('lesson-video'),
                  label: l10n.lessonFieldVideo,
                  hint: 'https://',
                  controller: _video,
                  keyboard: TextInputType.url,
                ),
                const SizedBox(height: 8),
              ],
              SecondaryButton(
                key: const ValueKey('lesson-pick'),
                label: file?.name ?? l10n.lessonPickFile,
                icon: file == null ? AppIcons.upload : AppIcons.checkCircle,
                height: 48,
                onPressed: _saving ? null : _pick,
              ),
              if (_progress != null) ...[
                const SizedBox(height: 8),
                LinearProgressIndicator(value: _progress),
                const SizedBox(height: 4),
                Text(
                  l10n.lessonUploading(((_progress ?? 0) * 100).round()),
                  key: const ValueKey('lesson-progress'),
                  style: TextStyle(fontSize: 12, color: p.textSecondary),
                ),
              ],
              const SizedBox(height: 12),
              LabeledField(
                key: const ValueKey('lesson-text'),
                label: l10n.lessonFieldText,
                controller: _text,
                lines: 3,
              ),
              const SizedBox(height: 12),
              LabeledField(
                key: const ValueKey('lesson-minutes'),
                label: l10n.lessonFieldMinutes,
                controller: _minutes,
                keyboard: TextInputType.number,
              ),
              SwitchListTile(
                key: const ValueKey('lesson-preview'),
                contentPadding: EdgeInsets.zero,
                value: _preview,
                onChanged: (v) => setState(() => _preview = v),
                title: Text(
                  l10n.lessonFieldPreview,
                  style: TextStyle(fontSize: 14, color: p.text),
                ),
              ),
              const SizedBox(height: 8),
              PrimaryButton(
                key: const ValueKey('lesson-save'),
                label: l10n.courseAddLesson,
                loading: _saving,
                height: 52,
                onPressed: _save,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
