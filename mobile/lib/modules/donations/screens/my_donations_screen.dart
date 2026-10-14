import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart'
    show SignInPrompt, TabHeader;
import '../data/donations_providers.dart';

/// My donations: the signed-in user's confirmed donations, each with its
/// receipt (a web page, opened in the browser).
class MyDonationsScreen extends ConsumerWidget {
  const MyDonationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.tabMyDonations),
            Expanded(
              child: signedIn
                  ? const _DonationList()
                  : SignInPrompt(
                      icon: AppIcons.receipt,
                      title: l10n.myDonationsSignInTitle,
                      message: l10n.myDonationsSignInMessage,
                      from: Paths.myDonations,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DonationList extends ConsumerWidget {
  const _DonationList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(myDonationsProvider);
    final notifier = ref.read(myDonationsProvider.notifier);
    if (state.isInitialLoading) {
      return SkeletonList(
        layout: SkeletonLayout.text,
        label: l10n.loadingDonations,
      );
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: notifier.retry);
    }
    if (state.items.isEmpty) {
      return MessageView(
        icon: AppIcons.campaigns,
        title: l10n.noDonationsTitle,
        message: l10n.noDonationsMessage,
        actionLabel: l10n.tabCampaigns,
        onAction: () => context.go(Paths.campaigns),
      );
    }
    return RefreshIndicator(
      onRefresh: notifier.refresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.extentAfter < 300 && state.hasMore) notifier.loadMore();
          return false;
        },
        child: ListView.separated(
          key: const ValueKey('donations-list'),
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          itemCount: state.items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) => DonationTile(donation: state.items[i]),
        ),
      ),
    );
  }
}

/// A donation: the campaign, the amount and date, and its receipt.
class DonationTile extends ConsumerWidget {
  const DonationTile({super.key, required this.donation});

  final Donation donation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final meta = [
      shortDate(donation.createdAt),
      donation.reference,
      if (donation.monthly) l10n.donateMonthly,
    ].join(' · ');
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  donation.campaignTitle,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                donation.amountFormatted,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(meta, style: TextStyle(fontSize: 13, color: p.textSecondary)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 4,
            children: [
              TextButton.icon(
                onPressed: () =>
                    ref.read(openExternalProvider)(donation.receiptUrl),
                icon: AppIcon(AppIcons.receipt, size: 18, color: p.link),
                label: Text(l10n.donationReceipt),
                style: TextButton.styleFrom(foregroundColor: p.link),
              ),
              if (donation.campaignId != null)
                TextButton(
                  onPressed: () =>
                      context.push(Paths.campaign(donation.campaignId!)),
                  style: TextButton.styleFrom(foregroundColor: p.link),
                  child: Text(l10n.donationSeeCampaign),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
