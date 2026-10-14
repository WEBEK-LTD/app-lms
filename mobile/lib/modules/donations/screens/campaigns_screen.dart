import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/donations_providers.dart';
import '../widgets/campaign_widgets.dart';

/// The Campaigns tab: open campaigns first, each with its progress.
class CampaignsScreen extends ConsumerWidget {
  const CampaignsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(campaignsProvider);
    final notifier = ref.read(campaignsProvider.notifier);

    final Widget list;
    if (state.isInitialLoading) {
      list = SkeletonList(
        layout: SkeletonLayout.media,
        label: l10n.loadingCampaigns,
      );
    } else if (state.error != null && state.items.isEmpty) {
      list = ErrorView(error: state.error!, onRetry: notifier.retry);
    } else if (state.items.isEmpty) {
      list = MessageView(
        icon: AppIcons.campaigns,
        title: l10n.noCampaignsTitle,
        message: l10n.noCampaignsMessage,
      );
    } else {
      final width = MediaQuery.sizeOf(context).width;
      final columns = width >= 900 ? 3 : (width >= 600 ? 2 : 1);
      list = RefreshIndicator(
        onRefresh: notifier.refresh,
        child: NotificationListener<ScrollNotification>(
          onNotification: (n) {
            if (n.metrics.extentAfter < 300 && state.hasMore) {
              notifier.loadMore();
            }
            return false;
          },
          child: columns == 1
              ? ListView.separated(
                  key: const ValueKey('campaigns-list'),
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                  itemCount: state.items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 14),
                  itemBuilder: (context, i) =>
                      CampaignCard(campaign: state.items[i]),
                )
              : GridView.builder(
                  key: const ValueKey('campaigns-list'),
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: columns,
                    crossAxisSpacing: 14,
                    mainAxisSpacing: 14,
                    mainAxisExtent:
                        (width - 40 - 14 * (columns - 1)) / columns * 9 / 16 +
                        MediaQuery.textScalerOf(context).scale(210),
                  ),
                  itemCount: state.items.length,
                  itemBuilder: (context, i) =>
                      CampaignCard(campaign: state.items[i]),
                ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.tabCampaigns),
            Expanded(child: list),
          ],
        ),
      ),
    );
  }
}
