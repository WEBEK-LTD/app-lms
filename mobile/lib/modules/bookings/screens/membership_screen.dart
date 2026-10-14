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
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../store/screens/cart_screen.dart' show isOrderReceived;
import '../data/bookings_providers.dart';
import 'classes_screen.dart' show membershipCreditsText;

/// 27 "My membership": the member's memberships, and the plans on sale with
/// the hand-off to the payment page. On iOS too: a gym membership is a
/// service used in person, which Apple lets apps sell outside the App Store
/// (App Store Review Guideline 3.1.3(e)).
class MembershipScreen extends ConsumerStatefulWidget {
  const MembershipScreen({super.key});

  @override
  ConsumerState<MembershipScreen> createState() => _MembershipScreenState();
}

class _MembershipScreenState extends ConsumerState<MembershipScreen> {
  int? _buying;

  Future<void> _buy(MembershipPlan plan) async {
    if (!ref.read(authControllerProvider).isSignedIn) {
      context.push(
        Uri(
          path: Paths.signIn,
          queryParameters: {'from': Paths.memberships},
        ).toString(),
      );
      return;
    }
    setState(() => _buying = plan.id);
    try {
      final link = await ref
          .read(yallappApiProvider)
          .createMembershipCheckoutLink(plan.id);
      if (!mounted) return;
      if (link.openIn == CheckoutTarget.inApp) {
        final done = await context.push<bool>(
          Paths.web,
          extra: WebPageArgs(
            url: link.url,
            title: context.l10n.checkout,
            completesOn: isOrderReceived,
          ),
        );
        if (!mounted) return;
        invalidateClasses(ref);
        if (done == true) showMessage(context, context.l10n.membershipBought);
      } else {
        final opened = await openExternal(link.url);
        if (!opened && mounted) {
          showMessage(context, context.l10n.checkoutFailed);
        }
      }
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _buying = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    final mine = signedIn ? ref.watch(myMembershipsProvider) : null;
    final plans = ref.watch(membershipPlansProvider);

    final children = <Widget>[
      Semantics(
        header: true,
        child: Text(
          context.l10n.membershipTitle,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: p.text,
          ),
        ),
      ),
      const SizedBox(height: 16),
      SectionHeader(title: context.l10n.membershipMine),
      const SizedBox(height: 8),
    ];

    if (!signedIn) {
      children.add(
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                context.l10n.membershipSignIn,
                style: TextStyle(fontSize: 15, color: p.textSecondary),
              ),
              const SizedBox(height: 12),
              PrimaryButton(
                label: context.l10n.signIn,
                height: 48,
                onPressed: () => context.push(
                  Uri(
                    path: Paths.signIn,
                    queryParameters: {'from': Paths.memberships},
                  ).toString(),
                ),
              ),
            ],
          ),
        ),
      );
    } else {
      children.add(
        mine!.when(
          loading: () =>
              SkeletonList(count: 1, label: context.l10n.membershipLoading),
          error: (e, _) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(myMembershipsProvider),
          ),
          data: (list) {
            final shown = [
              ...list.where((m) => m.isActive),
              ...list.where((m) => !m.isActive).take(2),
            ];
            if (shown.isEmpty) {
              return AppCard(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    AppIcon(AppIcons.membership, color: p.textSecondary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.l10n.membershipNone,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: p.text,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            context.l10n.membershipNoneMessage,
                            style: TextStyle(
                              fontSize: 13,
                              color: p.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }
            return Column(
              children: [
                for (final m in shown) ...[
                  MembershipCard(membership: m),
                  const SizedBox(height: 10),
                ],
              ],
            );
          },
        ),
      );
    }

    children.addAll([
      const SizedBox(height: 24),
      SectionHeader(title: context.l10n.membershipPlans),
      const SizedBox(height: 8),
      plans.when(
        loading: () => const SkeletonList(count: 2),
        error: (e, _) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(membershipPlansProvider),
        ),
        data: (list) => list.isEmpty
            ? Text(
                context.l10n.membershipNoPlans,
                style: TextStyle(fontSize: 15, color: p.textSecondary),
              )
            : Column(
                children: [
                  for (final plan in list) ...[
                    PlanCard(
                      plan: plan,
                      busy: _buying == plan.id,
                      onBuy: _buying == null ? () => _buy(plan) : null,
                    ),
                    const SizedBox(height: 10),
                  ],
                ],
              ),
      ),
    ]);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () async {
            ref
              ..invalidate(membershipPlansProvider)
              ..invalidate(myMembershipsProvider);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            children: children,
          ),
        ),
      ),
    );
  }
}

/// One of the member's memberships: the plan, how many classes are left
/// and until when.
class MembershipCard extends StatelessWidget {
  const MembershipCard({super.key, required this.membership});

  final Membership membership;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final m = membership;
    final (String status, Color color) = switch (m.status) {
      MembershipStatus.active => (l10n.membershipActive, p.success),
      MembershipStatus.expired => (l10n.membershipEnded, p.textSecondary),
      MembershipStatus.cancelled => (l10n.membershipCancelled, p.danger),
    };
    final until = m.endsAt == null
        ? l10n.membershipNoEnd
        : l10n.membershipUntil(shortDate(m.endsAt!));
    return AppCard(
      padding: const EdgeInsets.all(16),
      color: m.isActive ? p.accentSoft : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppIcon(AppIcons.membership, color: p.text),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  m.planName,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              Text(
                status,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            membershipCreditsText(m),
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: p.text,
            ),
          ),
          const SizedBox(height: 2),
          Text(until, style: TextStyle(fontSize: 13, color: p.textSecondary)),
        ],
      ),
    );
  }
}

/// A plan on sale: its name, price for its period, the classes it
/// includes and Buy.
class PlanCard extends StatelessWidget {
  const PlanCard({
    super.key,
    required this.plan,
    required this.onBuy,
    this.busy = false,
  });

  final MembershipPlan plan;
  final VoidCallback? onBuy;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final per = switch (plan.period) {
      MembershipPeriod.month => l10n.membershipPerMonth,
      MembershipPeriod.quarter => l10n.membershipPerQuarter,
      MembershipPeriod.year => l10n.membershipPerYear,
      MembershipPeriod.pack => l10n.membershipPack,
      MembershipPeriod.unknown => null,
    };
    final classes = plan.credits == null
        ? l10n.membershipUnlimited
        : l10n.membershipClasses(plan.credits!);
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  plan.name,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  per == null
                      ? plan.price.formatted
                      : '${plan.price.formatted} · $per',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.primary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  classes,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                if (plan.description != null &&
                    plan.description!.trim().isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    plan.description!,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.5,
                      color: p.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 96,
            child: Semantics(
              label: l10n.membershipBuyName(plan.name),
              button: true,
              excludeSemantics: true,
              child: PrimaryButton(
                label: l10n.membershipBuy,
                height: 44,
                loading: busy,
                onPressed: onBuy,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
