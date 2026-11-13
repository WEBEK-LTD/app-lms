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
import '../studio/studio_widgets.dart';
import 'prime_widgets.dart';

/// 125 A Prime app's smart alerts (Today's tile and their screen).
final primeAlertsProvider = FutureProvider.autoDispose<PrimeAlerts>((ref) {
  final app = ref.watch(currentAppProvider);
  if (app == null || !app.features.prime) {
    return const PrimeAlerts(items: [], briefOn: false, briefTime: '08:30');
  }
  return ref.watch(apiProvider).primeAlerts(app.id);
});

/// 125 The last morning brief this phone was sent while open, per app (when
/// Today has none of its own).
class LastBrief extends Notifier<Map<String, String>> {
  @override
  Map<String, String> build() => const {};

  void put(String appId, String text) => state = {...state, appId: text};
}

final lastBriefProvider = NotifierProvider<LastBrief, Map<String, String>>(
  LastBrief.new,
);

String greetingFor(BuildContext context, Me me) {
  final l10n = context.l10n;
  final hour = DateTime.now().hour;
  return hour < 12
      ? l10n.goodMorning(me.user.firstName)
      : hour < 18
      ? l10n.goodAfternoon(me.user.firstName)
      : l10n.goodEvening(me.user.firstName);
}

/// 125 The Prime header on Today (the PrimeToday board): the greeting with
/// Prime, the app, and today's sales and orders against the same weekday
/// last week.
class PrimeHeader extends ConsumerWidget {
  const PrimeHeader({
    super.key,
    required this.app,
    required this.me,
    required this.today,
    required this.unread,
  });

  final AppSummary app;
  final Me me;
  final Today? today;
  final int unread;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final several = me.apps.length > 1;
    final t = today;
    final compare = t?.compare;
    String money(List<Money> list) => list.isEmpty
        ? '0'
        : list.length == 1
        ? list.single.formatted
        : list.map((m) => isolate(m.formatted)).join(' · ');
    final tiles = [
      if (t != null && (t.sales.isNotEmpty || app.features.orders))
        (money(t.sales), l10n.salesToday, compare?.salesChangePct),
      if (t?.counts.orders != null)
        (
          context.number(t!.counts.orders!),
          l10n.ordersToday,
          compare?.ordersChangePct,
        ),
    ];
    return Container(
      color: c.head,
      padding: EdgeInsets.fromLTRB(
        20,
        MediaQuery.paddingOf(context).top + 14,
        12,
        14,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(
                    greetingFor(context, me),
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: c.onHead,
                    ),
                  ),
                ),
              ),
              const PrimeBadge(),
              IconButton(
                tooltip: unread > 0 ? l10n.bellUnread(unread) : l10n.bell,
                onPressed: () => context.push(Paths.updates),
                icon: Badge(
                  isLabelVisible: unread > 0,
                  backgroundColor: Brand.ember,
                  textColor: Brand.midnight,
                  label: Text(unread > 9 ? '9+' : '$unread'),
                  child: Icon(AppIcons.bell, color: c.onHead),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Semantics(
            button: several,
            label: several ? l10n.switchAppLabel(app.name) : null,
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: several ? () => showAppSwitcher(context, ref) : null,
              child: Padding(
                padding: const EdgeInsetsDirectional.only(
                  top: 4,
                  bottom: 4,
                  end: 8,
                ),
                child: Row(
                  children: [
                    AppAvatar(app: app, size: 36),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            app.name,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: c.onHead,
                            ),
                          ),
                          Text(
                            app.typeName,
                            style: TextStyle(fontSize: 12, color: c.onHead2),
                          ),
                        ],
                      ),
                    ),
                    if (several) Icon(AppIcons.expand, color: c.onHead),
                  ],
                ),
              ),
            ),
          ),
          if (tiles.isNotEmpty) ...[
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 8),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = 0; i < tiles.length; i++) ...[
                      if (i > 0) const SizedBox(width: 8),
                      Expanded(
                        child: MergeSemantics(
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: c.headSurface,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  tiles[i].$1,
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w700,
                                    color: c.onHead,
                                  ),
                                ),
                                Text(
                                  tiles[i].$2,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: c.onHead2,
                                  ),
                                ),
                                if (compare != null &&
                                    changeText(
                                          context,
                                          tiles[i].$3,
                                          compare.label,
                                        ) !=
                                        null)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Text(
                                      changeText(
                                        context,
                                        tiles[i].$3,
                                        compare.label,
                                      )!,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: (tiles[i].$3 ?? 0) < 0
                                            ? c.headDown
                                            : c.headUp,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// The morning brief card.
class BriefCard extends StatelessWidget {
  const BriefCard({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return MergeSemantics(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.goldBg,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(AppIcons.brief, color: c.gold),
            const SizedBox(width: 12),
            Expanded(
              child: Text.rich(
                TextSpan(
                  style: TextStyle(fontSize: 14, height: 1.4, color: c.ink),
                  children: [
                    TextSpan(
                      text: context.l10n.morningBrief,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: c.gold,
                      ),
                    ),
                    TextSpan(text: '\n$text'),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Insights and Smart alerts, side by side.
class PrimeTiles extends ConsumerWidget {
  const PrimeTiles({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final alerts = ref.watch(primeAlertsProvider).value;
    return TileGrid(
      tiles: [
        InfoTile(
          icon: AppIcons.insights,
          iconColor: c.gold,
          title: l10n.insightsTitle,
          text: l10n.insightsTileText,
          onTap: () => context.push(Paths.insights),
        ),
        InfoTile(
          icon: AppIcons.smartAlerts,
          iconColor: c.gold,
          title: l10n.smartAlerts,
          text: alerts == null
              ? l10n.alertsHelp
              : l10n.alertsOnCount(alerts.onCount),
          onTap: () => context.push(Paths.smartAlerts),
        ),
      ],
    );
  }
}

/// "Your account manager · VIP · replies first · Message".
class ManagerCard extends ConsumerWidget {
  const ManagerCard({super.key, required this.manager});

  final AccountManager manager;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    return Box(
      radius: 18,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      onTap: () => context.push(Paths.vip),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: c.goldBg, shape: BoxShape.circle),
            child: Icon(AppIcons.manager, color: c.gold),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.accountManagerTitle,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  l10n.vipRepliesFirst,
                  style: TextStyle(fontSize: 12, color: c.ink2),
                ),
              ],
            ),
          ),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(48, 40),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              side: BorderSide(color: c.ink),
              foregroundColor: c.ink,
              textStyle: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            onPressed: () => manager.whatsappUrl == null
                ? context.push(Paths.vip)
                : openLink(context, ref, manager.whatsappUrl),
            child: Text(l10n.messageAction),
          ),
        ],
      ),
    );
  }
}
