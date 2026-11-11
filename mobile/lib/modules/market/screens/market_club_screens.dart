import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart' show signInFor;
import '../../store/screens/cart_screen.dart' show isOrderReceived;
import '../data/market_providers.dart' show marketConfigProvider;
import '../../../core/widgets/studio_screen_scope.dart';

final marketWalletProvider = FutureProvider.autoDispose<MarketWallet>(
  (ref) => ref.watch(yallappApiProvider).getMyWallet(),
);

final marketClubProvider = FutureProvider.autoDispose<MarketClubInfo>(
  (ref) => ref.watch(yallappApiProvider).getMarketClub(),
);

final myClubProvider = FutureProvider.autoDispose<ClubMembership?>((ref) {
  if (!ref.watch(authControllerProvider).isSignedIn) return null;
  return ref.watch(yallappApiProvider).getMyClub();
});

/// 115.10 The customer's wallet: the balance, then refunds, credit from
/// support and the orders it paid.
class MarketWalletScreen extends ConsumerWidget {
  const MarketWalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final wallet = ref.watch(marketWalletProvider);
    return Scaffold(
      backgroundColor: p.background,
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.marketWallet),
      ),
      body: wallet.when(
        loading: () => const SkeletonDetail(),
        error: (e, _) => MessageView(
          icon: Symbols.error,
          title: l10n.marketWallet,
          message: '$e',
          actionLabel: l10n.marketBrowse,
          onAction: () => ref.invalidate(marketWalletProvider),
        ),
        data: (w) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    p.primary,
                    Color.lerp(p.primary, Colors.black, 0.3)!,
                  ],
                ),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.marketWalletBalance,
                    style: TextStyle(
                      color: p.onPrimary.withValues(alpha: 0.85),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    w.balance.formatted,
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      color: p.onPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.marketWalletNote,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: p.onPrimary.withValues(alpha: 0.85),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (w.entries.isEmpty)
              Text(
                l10n.marketWalletEmpty,
                textAlign: TextAlign.center,
                style: TextStyle(color: p.textSecondary),
              ),
            for (final e in w.entries)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(switch (e.kind) {
                  'refund' => Symbols.undo,
                  'credit' => Symbols.redeem,
                  'payment' => Symbols.shopping_bag,
                  _ => Symbols.hourglass_bottom,
                }, color: p.primary),
                title: Text(e.label),
                subtitle: Text(
                  MaterialLocalizations.of(context)
                      .formatMediumDate(e.at.toLocal()),
                ),
                trailing: Text(
                  e.amount.formatted,
                  style: TextStyle(fontWeight: FontWeight.w800, color: p.text),
                ),
                onTap: e.orderId == null
                    ? null
                    : () => context.push(Paths.marketOrder(e.orderId!)),
              ),
          ],
        ),
      ),
    );
  }
}

/// 115.10 The delivery club: the owner's plans and their benefits, and the
/// customer's membership. Joining pays on the gateway's page (card, Apple
/// Pay or Google Pay); each period is paid on its own. 115 Also a
/// marketplace's Club tab, with the signed-in customer's wallet when the
/// app has one.
class MarketClubScreen extends ConsumerStatefulWidget {
  const MarketClubScreen({super.key});

  @override
  ConsumerState<MarketClubScreen> createState() => _MarketClubScreenState();
}

class _MarketClubScreenState extends ConsumerState<MarketClubScreen> {
  int? _joining;

  Future<void> _join(ClubPlan plan) async {
    final l10n = context.l10n;
    if (!ref.read(authControllerProvider).isSignedIn) {
      signInFor(context, Paths.marketClub);
      return;
    }
    setState(() => _joining = plan.id);
    try {
      final joined = await ref.read(yallappApiProvider).joinClub(plan.id);
      if (!mounted) return;
      final payUrl = joined.payUrl;
      if (payUrl != null) {
        final paid = await context.push<bool>(
          Paths.web,
          extra: WebPageArgs(
            url: payUrl,
            title: l10n.checkout,
            completesOn: isOrderReceived,
          ),
        );
        if (paid == true && mounted) {
          showMessage(context, l10n.marketClubJoined);
        }
      } else {
        showMessage(context, l10n.marketClubJoined);
      }
      ref.invalidate(myClubProvider);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _joining = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final club = ref.watch(marketClubProvider);
    final mine = ref.watch(myClubProvider).value;
    final wallet =
        (ref.watch(marketConfigProvider)?.wallet ?? false) &&
        ref.watch(authControllerProvider).isSignedIn;
    return Scaffold(
      backgroundColor: p.background,
      // 120 Under a Studio page's header, the header is the title.
      appBar: StudioScreenScope.hidesTitleOf(context)
          ? null
          : AppBar(leading: appBarBack(context), title: Text(l10n.tabClub)),
      body: club.when(
        loading: () => const SkeletonDetail(),
        error: (e, _) => MessageView(
          icon: Symbols.workspace_premium,
          title: l10n.marketClub,
          message: l10n.marketClubNone,
          actionLabel: l10n.marketBrowse,
          onAction: () => context.go(Paths.home),
        ),
        data: (c) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: const Color(0xFF17152E),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Symbols.workspace_premium,
                    color: Color(0xFFF2994A),
                    size: 34,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    c.name,
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  if (c.description != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      c.description!,
                      style: const TextStyle(color: Colors.white70),
                    ),
                  ],
                ],
              ),
            ),
            if (mine != null) ...[
              const SizedBox(height: 12),
              _Membership(membership: mine),
            ],
            if (wallet) ...[const SizedBox(height: 12), const _WalletRow()],
            const SizedBox(height: 12),
            for (final plan in c.plans) ...[
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: p.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: mine?.plan.id == plan.id && mine!.active
                        ? p.primary
                        : p.border,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      plan.name,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                    Text(
                      '${plan.price.formatted} · ${plan.yearly ? l10n.marketClubPerYear : l10n.marketClubPerMonth}',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: p.primary,
                      ),
                    ),
                    const SizedBox(height: 10),
                    for (final b in plan.benefits)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Symbols.check, size: 18, color: p.success),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                b,
                                style: TextStyle(color: p.textBody),
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (!(mine?.active ?? false)) ...[
                      const SizedBox(height: 12),
                      PrimaryButton(
                        label: l10n.marketClubJoinWith(plan.price.formatted),
                        loading: _joining == plan.id,
                        onPressed: _joining == null ? () => _join(plan) : null,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            Text(
              l10n.marketClubNoRenew,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12.5, color: p.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

/// The customer's wallet balance; a tap opens its history.
class _WalletRow extends ConsumerWidget {
  const _WalletRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final balance = ref.watch(marketWalletProvider).value?.balance.formatted;
    return Material(
      color: p.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: p.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        leading: Icon(Symbols.account_balance_wallet, color: p.primary),
        title: Text(
          l10n.marketWallet,
          style: TextStyle(fontWeight: FontWeight.w800, color: p.text),
        ),
        subtitle: balance == null ? null : Text(l10n.marketWalletBalance),
        trailing: Text(
          balance ?? '',
          style: TextStyle(fontWeight: FontWeight.w800, color: p.text),
        ),
        onTap: () => context.push(Paths.marketWallet),
      ),
    );
  }
}

class _Membership extends StatelessWidget {
  const _Membership({required this.membership});

  final ClubMembership membership;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final end = membership.periodEnd;
    final line = switch (membership.status) {
      'awaiting_payment' => l10n.marketClubWaiting,
      'payment_failed' => l10n.marketClubPayAgain,
      _ when end != null => l10n.marketClubActiveUntil(
        MaterialLocalizations.of(context).formatMediumDate(end.toLocal()),
      ),
      _ => l10n.marketClubMember,
    };
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: membership.active ? p.successSoft : p.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            membership.plan.name,
            style: TextStyle(fontWeight: FontWeight.w800, color: p.text),
          ),
          const SizedBox(height: 4),
          Text(line, style: TextStyle(color: p.textBody)),
          if (membership.active) ...[
            const SizedBox(height: 4),
            Text(
              l10n.marketClubSaved(membership.saved.formatted),
              style: TextStyle(color: p.textSecondary),
            ),
          ],
        ],
      ),
    );
  }
}
