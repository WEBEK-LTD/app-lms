import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/states.dart';

/// 59 A charity's donations, newest first, and each campaign's totals.
class DonationsScreen extends ConsumerStatefulWidget {
  const DonationsScreen({super.key});

  @override
  ConsumerState<DonationsScreen> createState() => _DonationsScreenState();
}

class _DonationsScreenState extends ConsumerState<DonationsScreen> {
  int? _campaign;
  List<CampaignTotals> _campaigns = const [];

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final appId = ref.watch(appIdProvider);
    final api = ref.watch(apiProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.donations)),
      body: PagedList<Donation>(
        key: ValueKey('$appId-$_campaign'),
        load: (page) async {
          final result = await api.donations(
            appId,
            campaignId: _campaign,
            page: page,
          );
          if (page == 1 && mounted) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) setState(() => _campaigns = result.campaigns);
            });
          }
          return result.page;
        },
        header: _Campaigns(
          campaigns: _campaigns,
          selected: _campaign,
          onSelect: (id) => setState(() => _campaign = id),
        ),
        empty: EmptyState(icon: AppIcons.donations, title: l10n.noDonations),
        itemBuilder: (context, d) => _DonationTile(donation: d),
      ),
    );
  }
}

class _Campaigns extends StatelessWidget {
  const _Campaigns({
    required this.campaigns,
    required this.selected,
    required this.onSelect,
  });

  final List<CampaignTotals> campaigns;
  final int? selected;
  final void Function(int? id) onSelect;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    if (campaigns.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final c in campaigns)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.title, style: theme.textTheme.titleSmall),
                    const SizedBox(height: 6),
                    Text(c.raised.formatted, style: theme.textTheme.titleLarge),
                    Text(
                      c.goal == null
                          ? l10n.donorsCount(c.donors)
                          : '${l10n.ofGoal(c.goal!.formatted)} · ${l10n.donorsCount(c.donors)}',
                      style: theme.textTheme.bodySmall,
                    ),
                    if (c.progress != null) ...[
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                        value: c.progress,
                        minHeight: 8,
                        borderRadius: BorderRadius.circular(8),
                        semanticsLabel: l10n.ofGoal(c.goal!.formatted),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ChoiceChip(
                label: Text(l10n.allCampaigns),
                selected: selected == null,
                onSelected: (_) => onSelect(null),
              ),
              for (final c in campaigns)
                ChoiceChip(
                  label: Text(c.title),
                  selected: selected == c.id,
                  onSelected: (_) => onSelect(c.id),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DonationTile extends StatelessWidget {
  const _DonationTile({required this.donation});

  final Donation donation;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final d = donation;
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  (d.donorName == null || d.donorName!.isEmpty)
                      ? l10n.anonymous
                      : d.donorName!,
                  style: theme.textTheme.titleSmall,
                ),
              ),
              Text(d.amount.formatted, style: theme.textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Text(
                  [
                    d.campaignTitle,
                    if (d.paidAt != null) context.ago(d.paidAt!),
                  ].join(' · '),
                  style: theme.textTheme.bodySmall,
                ),
              ),
              if (d.status == 'refunded')
                StatusChip(l10n.statusRefunded, tone: Tone.bad),
            ],
          ),
          if (d.message != null) ...[
            const SizedBox(height: 6),
            Text('“${d.message}”', style: theme.textTheme.bodyMedium),
          ],
        ],
      ),
    );
  }
}
