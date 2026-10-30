import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/web/web_view.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/lesson/content/html_content.dart';
import '../data/donations_providers.dart';
import '../widgets/campaign_widgets.dart';
import '../../../core/services/review_prompt.dart';
import '../../../core/services/share_links.dart';
import '../../../core/format/bidi.dart';

/// A campaign: its pictures, progress and story, the donation form and the
/// latest donations.
class CampaignScreen extends ConsumerWidget {
  const CampaignScreen({super.key, required this.campaignId});

  final int campaignId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campaign = ref.watch(campaignProvider(campaignId));
    Future<void> refresh() => ref.refresh(campaignProvider(campaignId).future);
    return Scaffold(
      body: switch (campaign) {
        AsyncData(:final value) => _CampaignBody(
          campaign: value,
          onRefresh: refresh,
        ),
        AsyncError(:final error) => SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsetsDirectional.fromSTEB(16, 8, 16, 0),
                child: AppBackButton(),
              ),
              Expanded(
                child: ErrorView(error: error, onRetry: refresh),
              ),
            ],
          ),
        ),
        _ => SkeletonDetail(label: context.l10n.loadingCampaigns),
      },
    );
  }
}

class _CampaignBody extends ConsumerStatefulWidget {
  const _CampaignBody({required this.campaign, required this.onRefresh});

  final Campaign campaign;
  final Future<void> Function() onRefresh;

  @override
  ConsumerState<_CampaignBody> createState() => _CampaignBodyState();
}

class _CampaignBodyState extends ConsumerState<_CampaignBody> {
  /// 110 The donation being written: kept here, so the form scrolling out
  /// of view loses nothing and the pinned button reads it.
  late final _draft = DonationDraft(widget.campaign);

  @override
  void dispose() {
    _draft.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final campaign = widget.campaign;
    final onRefresh = widget.onRefresh;
    final p = context.palette;
    final l10n = context.l10n;
    final env = ref.watch(appEnvironmentProvider);
    final config = ref.watch(donationsConfigProvider);
    final top = MediaQuery.paddingOf(context).top;
    // 29 An iPhone app set to take no donations shows no button at all.
    final canGive = !(env.isIos && config.iosMode == IosDonationMode.off);
    final webview =
        campaign.renderMode == RenderMode.webview &&
        campaign.webviewUrl != null;

    final picture = AspectRatio(
      aspectRatio: MediaQuery.sizeOf(context).width >= 600 ? 21 / 9 : 16 / 10,
      child: Stack(
        fit: StackFit.expand,
        children: [
          AppNetworkImage(
            url: campaign.images.isNotEmpty
                ? campaign.images.first
                : campaign.imageUrl,
            seed: campaign.id,
            placeholderIcon: AppIcons.campaigns,
          ),
          const HeroScrim(),
          PositionedDirectional(
            top: top + 8,
            start: 16,
            child: const AppBackButton(),
          ),
          // 46 A link that opens the campaign in the app.
          PositionedDirectional(
            top: top + 8,
            end: 16,
            child: ShareLinkButton(
              kind: 'campaign',
              id: campaign.id,
              title: campaign.title,
            ),
          ),
        ],
      ),
    );

    final html = campaign.html ?? '';
    final list = RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        key: const ValueKey('campaign'),
        padding: EdgeInsets.zero,
        children: [
          picture,
          Padding(
            padding: readablePadding(context, top: 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (!campaign.isOpen) ...[
                  const Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: EndedBadge(),
                  ),
                  const SizedBox(height: 8),
                ],
                Semantics(
                  header: true,
                  child: Text(
                    campaign.title,
                    style: TextStyle(
                      fontSize: 24,
                      height: 1.25,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                ),
                if (campaign.endsAt != null && campaign.isOpen) ...[
                  const SizedBox(height: 6),
                  Text(
                    l10n.campaignEndsOn(shortDate(campaign.endsAt!)),
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                ],
                const SizedBox(height: 16),
                CampaignProgress(campaign: campaign, large: true),
                const SizedBox(height: 20),
                if (!campaign.isOpen)
                  _Note(text: l10n.donateClosed)
                else if (canGive)
                  DonationForm(campaign: campaign, draft: _draft),
              ],
            ),
          ),
          Padding(
            padding: readablePadding(context, top: 24, bottom: 8),
            child: webview
                ? SizedBox(
                    height: 480,
                    child: ref.watch(webViewBuilderProvider)(
                      WebViewRequest(
                        url: Uri.parse(campaign.webviewUrl!),
                        debugLabel: 'campaign',
                      ),
                    ),
                  )
                : html.trim().isNotEmpty
                ? HtmlContent(
                    html: html,
                    embeds: campaign.embeds,
                    title: campaign.title,
                  )
                : Text(
                    campaign.summary ?? '',
                    style: TextStyle(
                      fontSize: 16,
                      height: 1.5,
                      color: p.textBody,
                    ),
                  ),
          ),
          if (campaign.recentDonations.isNotEmpty)
            Padding(
              padding: readablePadding(context, top: 16, bottom: 32),
              child: _RecentDonations(donations: campaign.recentDonations),
            )
          else
            const SizedBox(height: 32),
        ],
      ),
    );
    // 110 The Donate button stays at the bottom, as other apps' main
    // buttons do.
    if (!campaign.isOpen || !canGive) return list;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(child: list),
        DonateBar(campaign: campaign, draft: _draft),
      ],
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.text, this.icon = AppIcons.info});

  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: p.surfaceMuted,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppIcon(icon, size: 20, color: p.textSecondary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(fontSize: 14, height: 1.4, color: p.textBody),
            ),
          ),
        ],
      ),
    );
  }
}

/// 110 What the donor chose: the amount, once or monthly, anonymous and a
/// message. [DonationForm] edits it; [DonateBar] gives it.
class DonationDraft extends ChangeNotifier {
  DonationDraft(Campaign campaign) {
    final presets = campaign.presetAmounts;
    if (presets.isNotEmpty) preset = presets[presets.length > 1 ? 1 : 0];
  }

  final custom = TextEditingController();
  final message = TextEditingController();
  String? preset;
  bool monthly = false;
  bool anonymous = false;
  bool busy = false;
  String? error;

  /// The amount chosen or typed, as a decimal string (null when unreadable).
  String? get amount {
    final typed = custom.text.trim();
    return typed.isNotEmpty ? parseAmount(typed) : preset;
  }

  void update(VoidCallback change) {
    change();
    notifyListeners();
  }

  @override
  void dispose() {
    custom.dispose();
    message.dispose();
    super.dispose();
  }
}

/// Choosing an amount: presets, an amount of one's own, once or monthly,
/// anonymous and a message. The button is [DonateBar], pinned below.
class DonationForm extends ConsumerWidget {
  const DonationForm({super.key, required this.campaign, required this.draft});

  final Campaign campaign;
  final DonationDraft draft;

  @override
  Widget build(BuildContext context, WidgetRef ref) => ListenableBuilder(
    listenable: draft,
    builder: (context, _) => _form(context, ref),
  );

  Widget _form(BuildContext context, WidgetRef ref) {
    final c = campaign;
    final p = context.palette;
    final l10n = context.l10n;
    final env = ref.watch(appEnvironmentProvider);
    final config = ref.watch(donationsConfigProvider);
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    final typed = draft.custom.text.trim();
    return Column(
      key: const ValueKey('donation-form'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l10n.donateChooseAmount,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: p.text,
          ),
        ),
        const SizedBox(height: 10),
        if (c.presetAmounts.isNotEmpty)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final preset in c.presetAmounts)
                PillChip(
                  label: formatAmount(preset, c.currency),
                  selected: typed.isEmpty && draft.preset == preset,
                  onTap: () => draft.update(() {
                    draft.preset = preset;
                    draft.custom.clear();
                    draft.error = null;
                  }),
                ),
            ],
          ),
        if (c.allowCustomAmount) ...[
          const SizedBox(height: 12),
          TextField(
            key: const ValueKey('donation-amount'),
            controller: draft.custom,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onChanged: (_) => draft.update(() => draft.error = null),
            decoration: InputDecoration(
              labelText: l10n.donateOtherAmount,
              helperText: l10n.donateMinimum(
                isolate(formatAmount(c.minAmount, c.currency)),
              ),
              errorText: draft.error,
            ),
          ),
        ] else if (draft.error != null) ...[
          const SizedBox(height: 8),
          Text(draft.error!, style: TextStyle(fontSize: 13, color: p.danger)),
        ],
        if (config.monthly) ...[
          const SizedBox(height: 12),
          SegmentedTabs(
            labels: [l10n.donateOnce, l10n.donateMonthly],
            selected: draft.monthly ? 1 : 0,
            radio: true,
            onChanged: (i) => draft.update(() => draft.monthly = i == 1),
          ),
        ],
        const SizedBox(height: 8),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          value: draft.anonymous,
          onChanged: (v) => draft.update(() => draft.anonymous = v),
          title: Text(
            l10n.donateAnonymous,
            style: TextStyle(fontSize: 15, color: p.text),
          ),
          subtitle: Text(
            l10n.donateAnonymousHint,
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ),
        TextField(
          key: const ValueKey('donation-message'),
          controller: draft.message,
          maxLength: 280,
          minLines: 1,
          maxLines: 3,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(
            labelText: l10n.donateMessage,
            hintText: l10n.donateMessageHint,
          ),
        ),
        if (env.isIos) ...[
          const SizedBox(height: 8),
          _Note(text: l10n.donateOnWebsiteNote, icon: AppIcons.openInNew),
        ],
        if (!signedIn) ...[
          const SizedBox(height: 8),
          Text(
            l10n.donateSignInHint,
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
      ],
    );
  }
}

/// 110 The Donate button, pinned at the bottom of the campaign. The donation
/// page opens in the system browser on iPhone (App Store guideline 3.2.2),
/// never inside the app, and inside the app on Android when the server
/// says so.
class DonateBar extends ConsumerWidget {
  const DonateBar({super.key, required this.campaign, required this.draft});

  final Campaign campaign;
  final DonationDraft draft;

  /// The chosen amount as a decimal string, or null with the reason shown.
  String? _amount(BuildContext context) {
    final c = campaign;
    final l10n = context.l10n;
    final amount = draft.amount;
    if (amount == null) {
      draft.update(() => draft.error = l10n.donateAmountInvalid);
      return null;
    }
    final cents = centsOf(amount);
    if (cents < centsOf(c.minAmount)) {
      draft.update(
        () => draft.error = l10n.donateMinimum(
          isolate(formatAmount(c.minAmount, c.currency)),
        ),
      );
      return null;
    }
    if (!c.allowCustomAmount &&
        !c.presetAmounts.any((p) => centsOf(p) == cents)) {
      draft.update(() => draft.error = l10n.donateChooseOne);
      return null;
    }
    draft.update(() => draft.error = null);
    return amount;
  }

  Future<void> _donate(BuildContext context, WidgetRef ref) async {
    final c = campaign;
    final amount = _amount(context);
    if (amount == null) return;
    final l10n = context.l10n;
    final env = ref.read(appEnvironmentProvider);
    draft.update(() => draft.busy = true);
    try {
      final link = await ref
          .read(yallappApiProvider)
          .createDonationLink(
            DonationRequest(
              campaignId: c.id,
              amount: amount,
              monthly: draft.monthly,
              anonymous: draft.anonymous,
              message: draft.message.text,
            ),
          );
      if (!context.mounted) return;
      // 29 App Store guideline 3.2.2: an iPhone app never takes a donation
      // itself, whatever the server says; the system browser does.
      final inApp = !env.isIos && link.openIn == CheckoutTarget.inApp;
      if (inApp) {
        final done = await context.push<bool>(
          Paths.web,
          extra: WebPageArgs(
            url: link.url,
            title: l10n.donateTitle,
            completesOn: isDonationDone,
          ),
        );
        if (done == true && context.mounted) {
          ref
            ..invalidate(campaignProvider(c.id))
            ..invalidate(myDonationsProvider)
            ..invalidate(campaignsProvider);
          showMessage(context, l10n.donateThanks);
          // 46 A good moment to ask for a rating.
          reportGoodMoment(ref, GoodMoment.donationMade);
        }
      } else {
        final opened = await ref.read(openExternalProvider)(link.url);
        if (!context.mounted) return;
        if (!opened) {
          showMessage(context, l10n.donateFailed);
        } else {
          // Back from the browser, the campaign and the history are fresh.
          ref
            ..invalidate(campaignProvider(c.id))
            ..invalidate(myDonationsProvider);
        }
      }
    } on ApiException catch (e) {
      if (context.mounted) showMessage(context, e.message);
    } finally {
      if (context.mounted) draft.update(() => draft.busy = false);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final env = ref.watch(appEnvironmentProvider);
    return BottomActionBar(
      child: ListenableBuilder(
        listenable: draft,
        builder: (context, _) {
          final amount = draft.amount;
          final label = env.isIos
              ? l10n.donateOnWebsite
              : amount == null
              ? l10n.donateTitle
              : l10n.donateButton(
                  isolate(formatAmount(amount, campaign.currency)),
                );
          return PrimaryButton(
            key: const ValueKey('donate-button'),
            label: label,
            icon: env.isIos ? AppIcons.openInNew : AppIcons.donate,
            loading: draft.busy,
            onPressed: () => _donate(context, ref),
          );
        },
      ),
    );
  }
}

class _RecentDonations extends StatelessWidget {
  const _RecentDonations({required this.donations});

  final List<RecentDonation> donations;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Text(
            l10n.recentDonations,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: p.text,
            ),
          ),
        ),
        const SizedBox(height: 10),
        AppCard(
          child: Column(
            children: [
              for (final (i, d) in donations.indexed) ...[
                if (i > 0) Divider(height: 1, color: p.divider),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      AppIcon(AppIcons.donate, size: 20, color: p.accent),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              d.name ?? l10n.anonymousDonor,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: p.text,
                              ),
                            ),
                            if (d.message != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                d.message!,
                                style: TextStyle(
                                  fontSize: 14,
                                  height: 1.4,
                                  color: p.textBody,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        d.amountFormatted,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
