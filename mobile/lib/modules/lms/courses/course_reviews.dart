import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/lms_providers.dart';
import 'community_widgets.dart';

/// The course page's Reviews tab: the rating summary, the student's own
/// review and everyone's reviews.
class CourseReviewsTab extends ConsumerWidget {
  const CourseReviewsTab({super.key, required this.courseId});

  final int courseId;

  Future<void> _write(BuildContext context, WidgetRef ref, Review? mine) {
    final rating = ValueNotifier<int>(mine?.rating ?? 0);
    return showTextSheet(
      context,
      title: mine == null ? 'Write a review' : 'Edit your review',
      hint: 'What did you like? What could be better? (optional)',
      sendLabel: 'Post review',
      initial: mine?.text ?? '',
      allowEmpty: true,
      header: ValueListenableBuilder<int>(
        valueListenable: rating,
        builder: (context, value, _) => StarRow(
          rating: value.toDouble(),
          size: 32,
          onChanged: (v) => rating.value = v,
        ),
      ),
      onSend: (text) async {
        if (rating.value == 0) {
          showMessage(context, 'Choose a rating from 1 to 5 stars.');
          return false;
        }
        try {
          final saved = await ref
              .read(yallappApiProvider)
              .saveMyReview(courseId, rating: rating.value, text: text);
          ref
            ..invalidate(courseReviewsProvider(courseId))
            ..invalidate(courseDetailProvider(courseId));
          if (context.mounted) {
            showMessage(
              context,
              saved.status == ReviewStatus.pending
                  ? 'Thanks! Your review will appear once the academy approves it.'
                  : 'Thanks for your review!',
            );
          }
          return true;
        } on ApiException catch (e) {
          if (context.mounted) showMessage(context, e.message);
          return false;
        }
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(courseReviewsProvider(courseId));
    final notifier = ref.read(courseReviewsProvider(courseId).notifier);
    final head = state.head;
    if (head == null) {
      if (state.error != null) {
        return ErrorView(error: state.error!, onRetry: notifier.refresh);
      }
      return const LoadingView(label: 'Loading reviews');
    }
    final p = context.palette;
    final mine = head.mine;
    final others = [
      for (final r in state.items)
        if (!r.mine) r,
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        RatingSummaryCard(summary: head.summary),
        if (head.canReview) ...[
          const SizedBox(height: 12),
          if (mine == null)
            SecondaryButton(
              label: 'Write a review',
              onPressed: () => _write(context, ref, null),
              height: 50,
            )
          else
            ReviewCard(review: mine, onEdit: () => _write(context, ref, mine)),
        ],
        const SizedBox(height: 12),
        if (others.isEmpty && head.summary.ratingCount == 0)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              head.canReview
                  ? 'No reviews yet. Be the first to share what you think.'
                  : 'No reviews yet.',
              textAlign: TextAlign.center,
              style: TextStyle(color: p.textSecondary),
            ),
          ),
        for (final review in others) ...[
          ReviewCard(review: review),
          const SizedBox(height: 10),
        ],
        if (state.hasMore)
          Center(
            child: TextButton(
              onPressed: state.loading ? null : notifier.loadMore,
              child: Text(state.loading ? 'Loading…' : 'Show more reviews'),
            ),
          ),
      ],
    );
  }
}

class RatingSummaryCard extends StatelessWidget {
  const RatingSummaryCard({super.key, required this.summary});

  final RatingSummary summary;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final rating = summary.rating;
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Column(
            children: [
              Text(
                rating == null ? '–' : rating.toStringAsFixed(1),
                style: TextStyle(
                  fontSize: 34,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
              StarRow(rating: rating ?? 0, size: 16),
              const SizedBox(height: 4),
              Text(
                plural(summary.ratingCount, 'rating'),
                style: TextStyle(fontSize: 12, color: p.textSecondary),
              ),
            ],
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              children: [
                for (var star = 5; star >= 1; star--)
                  _Bar(
                    star: star,
                    count: summary.counts[star] ?? 0,
                    total: summary.ratingCount,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Bar extends StatelessWidget {
  const _Bar({required this.star, required this.count, required this.total});

  final int star;
  final int count;
  final int total;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      label: '$star stars: $count',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          children: [
            SizedBox(
              width: 12,
              child: Text(
                '$star',
                style: TextStyle(fontSize: 12, color: p.textSecondary),
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: total == 0 ? 0 : count / total,
                  minHeight: 6,
                  color: p.star,
                  backgroundColor: p.divider,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ReviewCard extends StatelessWidget {
  const ReviewCard({super.key, required this.review, this.onEdit});

  final Review review;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          PersonLine(
            person: review.author,
            time: review.createdAt,
            you: review.mine,
          ),
          const SizedBox(height: 8),
          StarRow(rating: review.rating.toDouble(), size: 16),
          if (review.text.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              review.text,
              style: TextStyle(fontSize: 14, height: 1.5, color: p.textBody),
            ),
          ],
          if (review.status == ReviewStatus.pending) ...[
            const SizedBox(height: 6),
            Text(
              'Waiting for the academy to approve it.',
              style: TextStyle(fontSize: 12, color: p.textSecondary),
            ),
          ],
          if (onEdit != null)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: onEdit,
                child: const Text('Edit your review'),
              ),
            ),
        ],
      ),
    );
  }
}
