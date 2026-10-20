import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

/// 63 Stars read aloud as "4 out of 5".
class Stars extends StatelessWidget {
  const Stars({super.key, required this.rating, this.size = 18});

  final int rating;
  final double size;

  @override
  Widget build(BuildContext context) => Semantics(
    label: context.l10n.ratingOutOf(context.number(rating)),
    excludeSemantics: true,
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= 5; i++)
          Icon(
            AppIcons.star,
            size: size,
            fill: i <= rating ? 1 : 0,
            color: i <= rating ? Brand.ember : context.yb.ink2,
          ),
      ],
    ),
  );
}

/// 63 A student's review of a course, with the business's reply under it,
/// Reply (or change it), Remove the reply, and Hide or Show again.
class ReviewCard extends ConsumerStatefulWidget {
  const ReviewCard({super.key, required this.review, required this.onChanged});

  final Review review;
  final VoidCallback onChanged;

  @override
  ConsumerState<ReviewCard> createState() => _ReviewCardState();
}

class _ReviewCardState extends ConsumerState<ReviewCard> {
  late Review _review = widget.review;
  bool _busy = false;

  @override
  void didUpdateWidget(ReviewCard old) {
    super.didUpdateWidget(old);
    if (old.review != widget.review) _review = widget.review;
  }

  Future<void> _run(Future<Review> Function() action, String done) async {
    setState(() => _busy = true);
    try {
      final updated = await action();
      if (!mounted) return;
      setState(() => _review = updated);
      showMessage(context, done);
      widget.onChanged();
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reply() async {
    final l10n = context.l10n;
    final text = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _ReplySheet(initial: _review.reply?.text ?? ''),
    );
    if (text == null || text.trim().isEmpty || !mounted) return;
    final api = ref.read(apiProvider);
    final appId = ref.read(appIdProvider);
    await _run(() => api.replyReview(appId, _review.id, text), l10n.replySaved);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final r = _review;
    final api = ref.read(apiProvider);
    final appId = ref.read(appIdProvider);
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(r.person, style: theme.textTheme.titleSmall),
              ),
              Text(context.ago(r.createdAt), style: theme.textTheme.bodySmall),
            ],
          ),
          Text(l10n.inCourse(r.courseTitle), style: theme.textTheme.bodySmall),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Stars(rating: r.rating),
              if (r.hidden) StatusChip(l10n.hiddenFromOthers, tone: Tone.warn),
            ],
          ),
          if (r.text.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(r.text, style: theme.textTheme.bodyMedium),
          ],
          if (r.reply != null) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: context.yb.muted,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.yourReply, style: theme.textTheme.labelMedium),
                  const SizedBox(height: 2),
                  Text(r.reply!.text, style: theme.textTheme.bodyMedium),
                ],
              ),
            ),
          ],
          const SizedBox(height: 4),
          Wrap(
            spacing: 4,
            children: [
              TextButton.icon(
                onPressed: _busy ? null : _reply,
                icon: const Icon(AppIcons.edit, size: 18),
                label: Text(
                  r.reply == null ? l10n.replyToReview : l10n.changeReply,
                ),
              ),
              if (r.reply != null)
                TextButton(
                  onPressed: _busy
                      ? null
                      : () => _run(
                          () => api.deleteReviewReply(appId, r.id),
                          l10n.replyRemoved,
                        ),
                  child: Text(l10n.removeReply),
                ),
              TextButton.icon(
                onPressed: _busy
                    ? null
                    : () => _run(
                        () => api.setReviewHidden(appId, r.id, !r.hidden),
                        r.hidden ? l10n.reviewShownDone : l10n.reviewHiddenDone,
                      ),
                icon: Icon(
                  r.hidden ? AppIcons.visible : AppIcons.hidden,
                  size: 18,
                ),
                label: Text(r.hidden ? l10n.showReview : l10n.hideReview),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ReplySheet extends StatefulWidget {
  const _ReplySheet({required this.initial});

  final String initial;

  @override
  State<_ReplySheet> createState() => _ReplySheetState();
}

class _ReplySheetState extends State<_ReplySheet> {
  late final _text = TextEditingController(text: widget.initial);

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.yourReply, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(l10n.replyPublicHelp),
          const SizedBox(height: 12),
          TextField(
            controller: _text,
            autofocus: true,
            minLines: 3,
            maxLines: 6,
            maxLength: 2000,
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: () => Navigator.pop(context, _text.text),
            child: Text(l10n.save),
          ),
        ],
      ),
    );
  }
}
