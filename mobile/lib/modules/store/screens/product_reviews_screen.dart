import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/courses/course_reviews.dart'
    show RatingSummaryCard, ReviewCard;
import '../../shared/account/account_scaffold.dart';
import '../data/store_providers.dart';
import '../../../core/l10n/l10n.dart';

/// A product's reviews from the shop.
class ProductReviewsScreen extends ConsumerWidget {
  const ProductReviewsScreen({super.key, required this.productId});

  final int productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = productReviewsProvider(productId);
    final state = ref.watch(provider);
    final controller = ref.read(provider.notifier);
    final summary = controller.summary;
    final Widget body;
    if (state.isInitialLoading) {
      body = LoadingView(label: context.l10n.loadingReviews);
    } else if (state.error != null && state.items.isEmpty) {
      body = ErrorView(error: state.error!, onRetry: controller.retry);
    } else if (state.items.isEmpty) {
      body = MessageView(
        icon: AppIcons.star,
        title: context.l10n.noReviews,
        message: context.l10n.customerReviewsShowHere,
      );
    } else {
      body = RefreshIndicator(
        onRefresh: controller.refresh,
        child: NotificationListener<ScrollNotification>(
          onNotification: (n) {
            if (n.metrics.extentAfter < 400) controller.loadMore();
            return false;
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
            children: [
              if (summary != null) ...[
                RatingSummaryCard(summary: summary),
                const SizedBox(height: 12),
              ],
              for (final review in state.items) ...[
                ReviewCard(review: review),
                const SizedBox(height: 10),
              ],
            ],
          ),
        ),
      );
    }
    return AccountScaffold(
      title: context.l10n.reviews,
      scrollable: false,
      child: body,
    );
  }
}
