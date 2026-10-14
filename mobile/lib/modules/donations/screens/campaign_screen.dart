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

class _CampaignBody extends ConsumerWidget {
  const _CampaignBody({required this.campaign, required this.onRefresh});

  final Campaign campaign;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
        ],
      ),
    );

    final html = campaign.html ?? '';
    return RefreshIndicator(
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
                  DonationForm(campaign: campaign),
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

/// Choosing an amount and giving. The donation page opens in the system
/// browser on iPhone (App Store guideline 3.2.2), never inside the app, and
/// inside the app on Android when the server says so.
class DonationForm extends ConsumerStatefulWidget {
  const DonationForm({super.key, required this.campaign});

  final Campaign campaign;

  @override
  ConsumerState<DonationForm> createState() => _DonationFormState();
}

class _DonationFormState extends ConsumerState<DonationForm> {
  final _custom = TextEditingController();
  final _message = TextEditingController();
  String? _preset;
  bool _monthly = false;
  bool _anonymous = false;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final presets = widget.campaign.presetAmounts;
    if (presets.isNotEmpty) _preset = presets[presets.length > 1 ? 1 : 0];
  }

  @override
  void dispose() {
    _custom.dispose();
    _message.dispose();
    super.dispose();
  }

  Campaign get c => widget.campaign;

  /// The chosen amount as a decimal string, or null with the reason shown.
  String? _amount() {
    final l10n = context.l10n;
    final typed = _custom.text.trim();
    final amount = typed.isNotEmpty ? parseAmount(typed) : _preset;
    if (amount == null) {
      setState(() => _error = l10n.donateAmountInvalid);
      return null;
    }
    final cents = centsOf(amount);
    if (cents < centsOf(c.minAmount)) {
      setState(
        () =>
            _error = l10n.donateMinimum(formatAmount(c.minAmount, c.currency)),
      );
      return null;
    }
    if (!c.allowCustomAmount &&
        !c.presetAmounts.any((p) => centsOf(p) == cents)) {
      setState(() => _error = l10n.donateChooseOne);
      return null;
    }
    setState(() => _error = null);
    return amount;
  }

  Future<void> _donate() async {
    final amount = _amount();
    if (amount == null) return;
    final l10n = context.l10n;
    final env = ref.read(appEnvironmentProvider);
    setState(() => _busy = true);
    try {
      final link = await ref
          .read(yallappApiProvider)
          .createDonationLink(
            DonationRequest(
              campaignId: c.id,
              amount: amount,
              monthly: _monthly,
              anonymous: _anonymous,
              message: _message.text,
            ),
          );
      if (!mounted) return;
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
        if (done == true && mounted) {
          ref
            ..invalidate(campaignProvider(c.id))
            ..invalidate(myDonationsProvider)
            ..invalidate(campaignsProvider);
          showMessage(context, l10n.donateThanks);
        }
      } else {
        final opened = await ref.read(openExternalProvider)(link.url);
        if (!mounted) return;
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
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final env = ref.watch(appEnvironmentProvider);
    final config = ref.watch(donationsConfigProvider);
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    final typed = _custom.text.trim();
    final amount = typed.isNotEmpty ? parseAmount(typed) : _preset;
    final label = env.isIos
        ? l10n.donateOnWebsite
        : amount == null
        ? l10n.donateTitle
        : l10n.donateButton(formatAmount(amount, c.currency));

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
                  selected: typed.isEmpty && _preset == preset,
                  onTap: () => setState(() {
                    _preset = preset;
                    _custom.clear();
                    _error = null;
                  }),
                ),
            ],
          ),
        if (c.allowCustomAmount) ...[
          const SizedBox(height: 12),
          TextField(
            key: const ValueKey('donation-amount'),
            controller: _custom,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onChanged: (_) => setState(() => _error = null),
            decoration: InputDecoration(
              labelText: l10n.donateOtherAmount,
              helperText: l10n.donateMinimum(
                formatAmount(c.minAmount, c.currency),
              ),
              errorText: _error,
            ),
          ),
        ] else if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: TextStyle(fontSize: 13, color: p.danger)),
        ],
        if (config.monthly) ...[
          const SizedBox(height: 12),
          SegmentedTabs(
            labels: [l10n.donateOnce, l10n.donateMonthly],
            selected: _monthly ? 1 : 0,
            radio: true,
            onChanged: (i) => setState(() => _monthly = i == 1),
          ),
        ],
        const SizedBox(height: 8),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          value: _anonymous,
          onChanged: (v) => setState(() => _anonymous = v),
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
          controller: _message,
          maxLength: 280,
          minLines: 1,
          maxLines: 3,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(
            labelText: l10n.donateMessage,
            hintText: l10n.donateMessageHint,
          ),
        ),
        const SizedBox(height: 8),
        PrimaryButton(
          key: const ValueKey('donate-button'),
          label: label,
          icon: env.isIos ? AppIcons.openInNew : AppIcons.donate,
          loading: _busy,
          onPressed: _donate,
        ),
        const SizedBox(height: 10),
        if (env.isIos)
          _Note(text: l10n.donateOnWebsiteNote, icon: AppIcons.openInNew),
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
