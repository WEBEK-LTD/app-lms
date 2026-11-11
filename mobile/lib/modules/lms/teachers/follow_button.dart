import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';

/// 123 Following a course's teacher from its page: "Follow", then
/// "Following"; the student hears of each new course of theirs.
class FollowButton extends ConsumerStatefulWidget {
  const FollowButton({
    super.key,
    required this.instructorId,
    required this.name,
    required this.following,
  });

  final int instructorId;
  final String name;
  final bool following;

  @override
  ConsumerState<FollowButton> createState() => _FollowButtonState();
}

class _FollowButtonState extends ConsumerState<FollowButton> {
  bool? _following;
  bool _busy = false;

  Future<void> _toggle() async {
    final l10n = context.l10n;
    final follow = !(_following ?? widget.following);
    setState(() => _busy = true);
    try {
      await ref
          .read(yallappApiProvider)
          .followTeacher(widget.instructorId, follow: follow);
      if (!mounted) return;
      setState(() => _following = follow);
      if (follow) showMessage(context, l10n.teacherFollowed(widget.name));
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
    final following = _following ?? widget.following;
    return Semantics(
      button: true,
      toggled: following,
      child: InkWell(
        key: const ValueKey('follow-teacher'),
        borderRadius: BorderRadius.circular(999),
        onTap: _busy ? null : _toggle,
        child: Container(
          height: 34,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: following ? p.text : p.text.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            following ? l10n.teacherFollowing : l10n.teacherFollow,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: following ? p.surface : p.text,
            ),
          ),
        ),
      ),
    );
  }
}
