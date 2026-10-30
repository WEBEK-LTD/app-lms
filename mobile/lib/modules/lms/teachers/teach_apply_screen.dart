import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import 'teacher_widgets.dart';
import 'teachers_providers.dart';

/// 105.3 Applying to teach at the academy: who they are and what they'd
/// teach; then the academy's answer. Once approved, the Teacher tab opens.
class TeachApplyScreen extends ConsumerStatefulWidget {
  const TeachApplyScreen({super.key});

  @override
  ConsumerState<TeachApplyScreen> createState() => _TeachApplyScreenState();
}

class _TeachApplyScreenState extends ConsumerState<TeachApplyScreen> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(
    text: ref.read(authControllerProvider).user?.name ?? '',
  );
  final _bio = TextEditingController();
  final _subjects = TextEditingController();
  bool _again = false;
  bool _sending = false;
  bool _reloaded = false;

  @override
  void dispose() {
    _name.dispose();
    _bio.dispose();
    _subjects.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(yallappApiProvider)
          .applyToTeach(
            name: _name.text.trim(),
            bio: _bio.text.trim(),
            subjects: splitSubjects(_subjects.text),
          );
      if (!mounted) return;
      setState(() => _again = false);
      ref.invalidate(teacherApplicationProvider);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _fill(TeacherApplication? last) {
    if (last == null) return;
    _name.text = last.name;
    _bio.text = last.bio;
    _subjects.text = last.subjects.join(', ');
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final async = ref.watch(teacherApplicationProvider);
    return Scaffold(
      appBar: AppBar(leading: appBarBack(context), title: Text(l10n.teachHere)),
      body: switch (async) {
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(teacherApplicationProvider),
        ),
        AsyncValue(hasValue: true, :final value) => _body(context, value),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }

  Widget _body(BuildContext context, TeacherApplication? application) {
    final l10n = context.l10n;
    if (ref.watch(isTeacherProvider) ||
        application?.status == ApplicationStatus.approved) {
      // The account learns of its new role, so the Teacher tab shows.
      if (!_reloaded && !ref.read(isTeacherProvider)) {
        _reloaded = true;
        ref.read(authControllerProvider.notifier).reloadUser();
      }
      return MessageView(
        key: const ValueKey('teach-approved'),
        icon: AppIcons.teacher,
        title: l10n.teachApproved,
        actionLabel: ref.watch(isTeacherProvider) ? l10n.tabTeacher : null,
        onAction: () => context.go(Paths.teacherDesk),
      );
    }
    if (application?.status == ApplicationStatus.pending) {
      return MessageView(
        key: const ValueKey('teach-pending'),
        icon: AppIcons.teacher,
        title: l10n.teachPending,
      );
    }
    if (application?.status == ApplicationStatus.declined && !_again) {
      final note = application!.note;
      return MessageView(
        key: const ValueKey('teach-declined'),
        icon: AppIcons.teacher,
        title: l10n.teachDeclined,
        message: note == null || note.isEmpty ? null : l10n.teachNote(note),
        actionLabel: l10n.teachApplyAgain,
        onAction: () {
          _fill(application);
          setState(() => _again = true);
        },
      );
    }
    final p = context.palette;
    String? required(String? v) =>
        (v ?? '').trim().isEmpty ? l10n.intakeRequired : null;
    return Form(
      key: _form,
      child: ListView(
        key: const ValueKey('teach-form'),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Text(
            l10n.teachIntro,
            style: TextStyle(fontSize: 15, height: 1.5, color: p.textBody),
          ),
          const SizedBox(height: 20),
          LabeledField(
            key: const ValueKey('teach-name'),
            label: l10n.teachName,
            controller: _name,
            maxLength: 120,
            validator: required,
          ),
          const SizedBox(height: 12),
          LabeledField(
            key: const ValueKey('teach-bio'),
            label: l10n.teachBio,
            hint: l10n.teachBioHint,
            controller: _bio,
            lines: 4,
            maxLength: 1000,
            validator: required,
          ),
          const SizedBox(height: 12),
          LabeledField(
            key: const ValueKey('teach-subjects'),
            label: l10n.teachSubjects,
            hint: l10n.teachSubjectsHint,
            controller: _subjects,
          ),
          const SizedBox(height: 20),
          PrimaryButton(
            key: const ValueKey('teach-send'),
            label: l10n.teachSend,
            loading: _sending,
            onPressed: _send,
          ),
        ],
      ),
    );
  }
}
