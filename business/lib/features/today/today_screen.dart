import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../account/apps_screen.dart';

final todayProvider = FutureProvider.autoDispose<Today>(
  (ref) => ref.watch(apiProvider).today(ref.watch(appIdProvider)),
);

/// "Updates from Yallapp" (the bell): shared by Today's badge and the list.
final updatesProvider = FutureProvider<UpdatesList>(
  (ref) => ref.watch(apiProvider).updates(),
);

/// 59 Today: the numbers, what needs the owner now, and quick actions.
class TodayScreen extends ConsumerWidget {
  const TodayScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final app = ref.watch(currentAppProvider);
    final me = ref.watch(meProvider);
    // Signing out: the screen goes as the router moves on.
    if (me == null || app == null) return const SizedBox.shrink();
    final today = ref.watch(todayProvider);

    Future<void> refresh() async {
      ref.invalidate(updatesProvider);
      await ref.read(sessionProvider.notifier).refreshMe();
      return ref.refresh(todayProvider.future).then((_) {});
    }

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: pullToRefresh(context, refresh),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: _Header(app: app, me: me),
              ),
              if (app.state == AccountState.expired)
                SliverToBoxAdapter(
                  child: _ExpiredBanner(dashboard: me.links.dashboard),
                ),
              ...today.when(
                skipLoadingOnRefresh: true,
                skipError: true,
                data: (data) => [
                  SliverToBoxAdapter(
                    child: _Kpis(app: app, today: data),
                  ),
                  SliverToBoxAdapter(
                    child: SectionTitle(context.l10n.needsYouNow),
                  ),
                  SliverToBoxAdapter(child: _NeedsYou(items: data.needsYou)),
                ],
                loading: () => const [
                  SliverFillRemaining(child: LoadingState()),
                ],
                error: (e, _) => [
                  SliverFillRemaining(
                    child: ErrorState(
                      error: e,
                      onRetry: () => ref.invalidate(todayProvider),
                    ),
                  ),
                ],
              ),
              SliverToBoxAdapter(child: _QuickActions(app: app)),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.app, required this.me});

  final AppSummary app;
  final Me me;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? l10n.goodMorning(me.user.firstName)
        : hour < 18
        ? l10n.goodAfternoon(me.user.firstName)
        : l10n.goodEvening(me.user.firstName);
    final unread = ref.watch(updatesProvider).value?.unread ?? 0;
    final several = me.apps.length > 1;

    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(20, 12, 8, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(greeting, style: theme.textTheme.headlineSmall),
                ),
              ),
              IconButton(
                tooltip: unread > 0 ? l10n.bellUnread(unread) : l10n.bell,
                onPressed: () => context.push(Paths.updates),
                icon: Badge(
                  isLabelVisible: unread > 0,
                  backgroundColor: Brand.ember,
                  textColor: Brand.midnight,
                  label: Text(unread > 9 ? '9+' : '$unread'),
                  child: const Icon(AppIcons.bell),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Semantics(
            button: several,
            label: several ? l10n.switchAppLabel(app.name) : null,
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: several ? () => showAppSwitcher(context, ref) : null,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AppAvatar(app: app, size: 36),
                    const SizedBox(width: 10),
                    Flexible(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(app.name, style: theme.textTheme.titleSmall),
                          Text(app.typeName, style: theme.textTheme.bodySmall),
                        ],
                      ),
                    ),
                    if (several) ...[
                      const SizedBox(width: 4),
                      const Icon(AppIcons.expand),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ExpiredBanner extends ConsumerWidget {
  const _ExpiredBanner({required this.dashboard});

  final String dashboard;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Panel(
        color: Brand.warningBg,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(AppIcons.warning, color: Brand.warning),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.planEndedTitle,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 4),
                  Text(l10n.planEndedText),
                  TextButton(
                    onPressed: () => context.push(Paths.plan),
                    child: Text(l10n.seePlan),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class Kpi {
  const Kpi(this.icon, this.label, this.value);
  final IconData icon;
  final String label;
  final String value;
}

class _Kpis extends StatelessWidget {
  const _Kpis({required this.app, required this.today});

  final AppSummary app;
  final Today today;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = today.counts;
    String money(List<Money> list) =>
        list.isEmpty ? '0' : list.map((m) => m.formatted).join(' · ');
    String count(int? n) => n == null ? '—' : context.number(n);
    final tiles = [
      if (app.features.orders)
        Kpi(AppIcons.sales, l10n.salesToday, money(today.sales)),
      if (c.orders != null)
        Kpi(AppIcons.orders, l10n.ordersToday, count(c.orders)),
      if (c.appointments != null)
        Kpi(
          AppIcons.appointments,
          l10n.appointmentsToday,
          count(c.appointments),
        ),
      if (c.tickets != null)
        Kpi(AppIcons.events, l10n.ticketsToday, count(c.tickets)),
      if (c.checkIns != null)
        Kpi(AppIcons.checkIns, l10n.checkInsToday, count(c.checkIns)),
      if (app.features.donations)
        Kpi(AppIcons.donations, l10n.donationsToday, money(today.donations)),
      if (c.newUsers != null)
        Kpi(AppIcons.newUsers, l10n.newUsers, count(c.newUsers)),
      if (today.hasAppOpens)
        Kpi(AppIcons.opens, l10n.appOpens, count(c.appOpens)),
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: KpiGrid(tiles: tiles),
    );
  }
}

/// Two tiles a row (one with very large text).
class KpiGrid extends StatelessWidget {
  const KpiGrid({super.key, required this.tiles});

  final List<Kpi> tiles;

  @override
  Widget build(BuildContext context) {
    final large = MediaQuery.textScalerOf(context).scale(10) > 13;
    return LayoutBuilder(
      builder: (context, constraints) {
        final perRow = large || constraints.maxWidth < 300 ? 1 : 2;
        final width = (constraints.maxWidth - (perRow - 1) * 12) / perRow;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            for (final t in tiles)
              SizedBox(
                width: width,
                child: MergeSemantics(
                  child: Panel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(t.icon, size: 22, color: Brand.emberText),
                        const SizedBox(height: 10),
                        Text(
                          t.value,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          t.label,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _NeedsYou extends StatelessWidget {
  const _NeedsYou({required this.items});

  final List<NeedsYou> items;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (items.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Panel(
          child: Row(
            children: [
              const Icon(AppIcons.checkCircle, color: Brand.success),
              const SizedBox(width: 12),
              Expanded(child: Text(l10n.allCaughtUp)),
            ],
          ),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Panel(
                onTap: () => context.go(switch (item.kind) {
                  'orders_in_progress' => '${Paths.orders}?status=processing',
                  'appointments_to_confirm' => Paths.appointments,
                  'unanswered_messages' => Paths.inbox,
                  _ => Paths.updates,
                }),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Brand.sand,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(switch (item.kind) {
                        'orders_in_progress' => AppIcons.orders,
                        'appointments_to_confirm' => AppIcons.appointments,
                        'unanswered_messages' => AppIcons.inbox,
                        _ => AppIcons.notice,
                      }),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        item.title,
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ),
                    if (item.kind != 'notice')
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Brand.ember,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          context.number(item.count),
                          style: Theme.of(context).textTheme.labelMedium,
                        ),
                      ),
                    const SizedBox(width: 4),
                    const DirectionalIcon(AppIcons.forward),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.app});

  final AppSummary app;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final f = app.features;
    final actions = [
      if (f.kitchen) (AppIcons.kitchen, l10n.kitchenMode, Paths.kitchen),
      if (f.notifications) (AppIcons.notify, l10n.actionNotify, Paths.notify),
      if (f.checkIn) (AppIcons.scan, l10n.actionScan, Paths.scan()),
      if (f.media) (AppIcons.upload, l10n.actionUpload, Paths.media),
      if (f.preview) (AppIcons.preview, l10n.actionPreview, Paths.preview),
    ];
    if (actions.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(l10n.quickActions),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final (icon, label, path) in actions)
                SizedBox(
                  width: 96,
                  child: Semantics(
                    button: true,
                    label: label,
                    excludeSemantics: true,
                    child: Panel(
                      padding: const EdgeInsets.symmetric(
                        vertical: 14,
                        horizontal: 6,
                      ),
                      onTap: () => context.push(path),
                      child: Column(
                        children: [
                          Icon(icon, size: 26),
                          const SizedBox(height: 8),
                          Text(
                            label,
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.labelMedium,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
