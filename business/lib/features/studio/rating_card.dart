import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../inbox/reviews.dart' show ReplySheet, Stars;

/// 132 A customer's rating of a food or marketplace order or a ride, with
/// the business's reply under it: Reply, Change the reply, Remove the reply.
/// The customer sees the reply under their rating in the app, in the
/// business's name, and is told the first time.
class RatingCard extends ConsumerStatefulWidget {
  const RatingCard({
    super.key,
    required this.source,
    required this.id,
    required this.rating,
  });

  /// food, market or ride.
  final String source;
  final String id;
  final CustomerRating rating;

  @override
  ConsumerState<RatingCard> createState() => _RatingCardState();
}

class _RatingCardState extends ConsumerState<RatingCard> {
  late CustomerRating _rating = widget.rating;
  bool _busy = false;

  @override
  void didUpdateWidget(RatingCard old) {
    super.didUpdateWidget(old);
    if (old.rating != widget.rating) _rating = widget.rating;
  }

  Future<void> _run(Future<RatedItem> Function() call, String done) async {
    setState(() => _busy = true);
    try {
      final rated = await call();
      if (!mounted) return;
      setState(() => _rating = rated.rating);
      showMessage(context, done);
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
      builder: (_) =>
          ReplySheet(initial: _rating.reply ?? '', help: l10n.ratingReplyHelp),
    );
    if (text == null || text.trim().isEmpty || !mounted) return;
    final api = ref.read(apiProvider);
    final appId = ref.read(appIdProvider);
    await _run(
      () => api.replyRating(appId, widget.source, widget.id, text.trim()),
      l10n.replySaved,
    );
  }

  Future<void> _remove() async {
    final l10n = context.l10n;
    final ok = await confirm(
      context,
      title: l10n.removeReplyTitle,
      text: l10n.removeReplyText,
      action: l10n.removeReply,
      destructive: true,
    );
    if (!ok || !mounted) return;
    final api = ref.read(apiProvider);
    final appId = ref.read(appIdProvider);
    await _run(
      () => api.deleteRatingReply(appId, widget.source, widget.id),
      l10n.replyRemoved,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final c = context.yb;
    final r = _rating;
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Stars(rating: r.stars),
              const Spacer(),
              Text(context.ago(r.at), style: theme.textTheme.bodySmall),
            ],
          ),
          if (r.courier != null) ...[
            const SizedBox(height: 4),
            Text(
              l10n.ratingCourierLine('${r.courier}'),
              style: theme.textTheme.bodySmall,
            ),
          ],
          if (r.comment != null) ...[
            const SizedBox(height: 8),
            Text('“${isolate(r.comment!)}”', style: theme.textTheme.bodyLarge),
          ],
          if (r.reply != null) ...[
            const SizedBox(height: 12),
            Container(
              key: const ValueKey('rating-reply'),
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: c.muted,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    [
                      l10n.yourReply,
                      if (r.replyEditedAt != null) l10n.replyEdited,
                    ].join(' · '),
                    style: theme.textTheme.labelMedium,
                  ),
                  const SizedBox(height: 2),
                  Text(isolate(r.reply!), style: theme.textTheme.bodyMedium),
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
                  onPressed: _busy ? null : _remove,
                  child: Text(l10n.removeReply),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
