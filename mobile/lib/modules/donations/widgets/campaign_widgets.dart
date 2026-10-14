import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';

/// "₺12,450 of ₺50,000", or "₺12,450 raised" without a goal.
String raisedText(BuildContext context, CampaignSummary c) {
  final l10n = context.l10n;
  return c.goalFormatted == null
      ? l10n.campaignRaised(c.raisedFormatted)
      : l10n.campaignRaisedOf(c.raisedFormatted, c.goalFormatted!);
}

/// How far the campaign is, as a whole percent (0 without a goal).
int percentOf(CampaignSummary c) =>
    ((c.progress ?? 0) * 100).floor().clamp(0, 9999);

/// A campaign's progress: the bar (with a goal), what was raised and by how
/// many people.
class CampaignProgress extends StatelessWidget {
  const CampaignProgress({
    super.key,
    required this.campaign,
    this.large = false,
  });

  final CampaignSummary campaign;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final reached = (campaign.progress ?? 0) >= 1;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (campaign.progress != null) ...[
          ProgressTrack(
            percent: percentOf(campaign),
            height: large ? 10 : 6,
            fill: reached ? p.success : null,
          ),
          SizedBox(height: large ? 10 : 8),
        ],
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Text(
                raisedText(context, campaign),
                style: TextStyle(
                  fontSize: large ? 16 : 13,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
            ),
            if (campaign.progress != null)
              Text(
                reached ? l10n.campaignGoalReached : '${percentOf(campaign)}%',
                style: TextStyle(
                  fontSize: large ? 14 : 12,
                  fontWeight: FontWeight.w700,
                  color: reached ? p.success : p.textSecondary,
                ),
              ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          l10n.campaignDonors(campaign.donorCount),
          style: TextStyle(fontSize: large ? 14 : 12, color: p.textSecondary),
        ),
      ],
    );
  }
}

/// A small label on a campaign that takes no more donations.
class EndedBadge extends StatelessWidget {
  const EndedBadge({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: p.divider),
      ),
      child: Text(
        context.l10n.campaignEnded,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: p.textSecondary,
        ),
      ),
    );
  }
}

/// A campaign in the list: its cover, title, summary and progress.
class CampaignCard extends StatelessWidget {
  const CampaignCard({super.key, required this.campaign});

  final CampaignSummary campaign;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AppCard(
      radius: context.shapes.card,
      semanticLabel: [
        campaign.title,
        raisedText(context, campaign),
        if (!campaign.isOpen) context.l10n.campaignEnded,
      ].join(', '),
      onTap: () => context.push(Paths.campaign(campaign.id)),
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  AppNetworkImage(
                    url: campaign.imageUrl,
                    seed: campaign.id,
                    placeholderIcon: AppIcons.campaigns,
                  ),
                  if (!campaign.isOpen)
                    const PositionedDirectional(
                      top: 10,
                      start: 10,
                      child: EndedBadge(),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    campaign.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 17,
                      height: 1.25,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                  if (campaign.summary != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      campaign.summary!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.4,
                        color: p.textBody,
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  CampaignProgress(campaign: campaign),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
