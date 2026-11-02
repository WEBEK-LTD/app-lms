import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/courier_hub.dart';
import '../data/courier_hub_api.dart';
import '../widgets/company_widgets.dart';

/// 104.8.4 The companies the person delivers for on Yallapp Courier
/// (`GET /companies`): one tap opens its courier screens. None yet: what to
/// ask the company.
class CompaniesScreen extends ConsumerWidget {
  const CompaniesScreen({super.key, required this.state});

  final HubCompanies state;

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final ok = await confirmAction(
      context,
      title: context.l10n.logOutTitle,
      message: context.l10n.hubSignOutMessage,
      confirmLabel: context.l10n.logOut,
      destructive: true,
    );
    if (ok) await ref.read(courierHubProvider.notifier).signOut();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final hub = ref.read(courierHubProvider.notifier);
    final items = state.items;
    final notice = state.notice;
    final Widget body;
    if (items == null) {
      body = state.error != null
          ? ErrorView(error: state.error!, onRetry: hub.loadCompanies)
          : const LoadingView();
    } else if (items.isEmpty) {
      body = MessageView(
        key: const ValueKey('hub-no-companies'),
        icon: AppIcons.courier,
        title: l10n.hubNoCompaniesTitle,
        message: l10n.hubNoCompaniesMessage,
        actionLabel: l10n.hubCheckAgain,
        onAction: state.loading ? null : hub.loadCompanies,
      );
    } else {
      body = RefreshIndicator(
        onRefresh: hub.loadCompanies,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          children: [
            Text(
              l10n.hubCompaniesIntro,
              style: TextStyle(fontSize: 15, color: p.textSecondary),
            ),
            const SizedBox(height: 14),
            for (final company in items) ...[
              _CompanyCard(company: company, onTap: () => hub.open(company)),
              const SizedBox(height: 10),
            ],
          ],
        ),
      );
    }
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(
              title: l10n.hubCompaniesTitle,
              trailing: TextButton(
                key: const ValueKey('hub-sign-out'),
                onPressed: () => _signOut(context, ref),
                child: Text(l10n.logOut),
              ),
            ),
            if (state.loading && items != null)
              const LinearProgressIndicator(minHeight: 2),
            if (notice != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                child: AppCard(
                  key: const ValueKey('hub-notice'),
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      AppIcon(AppIcons.info, size: 20, color: p.text),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Semantics(
                          liveRegion: true,
                          child: Text(
                            notice,
                            style: TextStyle(
                              fontSize: 14,
                              height: 1.5,
                              color: p.text,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }
}

class _CompanyCard extends StatelessWidget {
  const _CompanyCard({required this.company, required this.onTap});

  final CourierCompany company;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final status = company.paused
        ? l10n.hubPaused
        : '${company.onDuty ? l10n.courierOnDuty : l10n.hubOffDuty}'
              ' · ${l10n.hubJobsWaiting(company.jobsWaiting)}';
    return AppCard(
      key: ValueKey('hub-company-${company.appId}'),
      padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
      onTap: onTap,
      child: Row(
        children: [
          CompanyLogo(company: company),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  company.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  status,
                  style: TextStyle(
                    fontSize: 13,
                    color: company.paused ? p.danger : p.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          AppIcon(
            company.paused ? AppIcons.paused : AppIcons.forward,
            size: 22,
            color: p.textSecondary,
          ),
        ],
      ),
    );
  }
}

/// 104.8.4 While a company's courier screens open.
class CompanyOpeningScreen extends StatelessWidget {
  const CompanyOpeningScreen({super.key, required this.company});

  final CourierCompany company;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final label = context.l10n.hubOpening(company.name);
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CompanyLogo(company: company, size: 64),
            const SizedBox(height: 18),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
            const SizedBox(height: 18),
            CircularProgressIndicator(semanticsLabel: label),
          ],
        ),
      ),
    );
  }
}
