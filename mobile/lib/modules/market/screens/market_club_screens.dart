import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart' show DateFormat;
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/storage/local_settings.dart';
import '../../../core/format/bidi.dart';
import '../../../core/format/text_case.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart' show signInFor;
import '../../store/screens/cart_screen.dart' show isOrderReceived;
import '../data/market_providers.dart' show marketConfigProvider;
import '../widgets/market_look.dart' show marketDeeper;
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

/// 115.60 Whether the wallet pays first at checkout ("Use it at checkout
/// first"), kept on the phone; on by default. Checkout reads it.
final marketWalletFirstProvider = NotifierProvider<MarketWalletFirst, bool>(
  MarketWalletFirst.new,
);

class MarketWalletFirst extends Notifier<bool> {
  static const key = 'market.wallet_first';

  @override
  bool build() => ref.watch(sharedPreferencesProvider).getBool(key) ?? true;

  void set(bool on) {
    ref.read(sharedPreferencesProvider).setBool(key, on);
    state = on;
  }
}

/// The app's name, for "Credit from Zad" and "Zad Club".
String _appName(WidgetRef ref) =>
    ref.watch(appEnvironmentProvider).build.appName;

bool _arabic(BuildContext context) =>
    Localizations.localeOf(context).languageCode == 'ar';

/// 115.60 The currency as the designs write it: "ج.م" after the number in
/// Arabic for pounds, the code before it otherwise.
String _currencyMark(BuildContext context, String currency) =>
    _arabic(context) && currency == 'EGP' ? 'ج.م' : currency;

/// "EGP 203.25" or "203.25 ج.م" ([whole]: "EGP 49" for a round amount),
/// with a sign when asked ("+EGP 50.00", "−EGP 120.00").
String _money(
  BuildContext context,
  MarketMoney m,
  String currency, {
  bool whole = false,
  bool sign = false,
}) {
  final negative = m.amount.startsWith('-');
  var number = negative ? m.amount.substring(1) : m.amount;
  if (whole && RegExp(r'^\d+\.0+$').hasMatch(number)) {
    number = number.split('.').first;
  }
  final mark = _currencyMark(context, currency);
  final text = _arabic(context) ? '$number $mark' : '$mark $number';
  final signed = sign ? '${negative ? '−' : '+'}$text' : text;
  return ltrRun(signed);
}

String _dayLabel(BuildContext context, DateTime at, DateTime now) {
  final local = at.toLocal();
  if (DateUtils.isSameDay(local, now)) return context.l10n.marketWalletToday;
  final lang = Localizations.localeOf(context).languageCode;
  final format = DateFormat(
    local.year == now.year ? 'd MMMM' : 'd MMMM y',
    lang,
  )..useNativeDigits = false;
  return format.format(local);
}

String _date(BuildContext context, DateTime at) {
  final lang = Localizations.localeOf(context).languageCode;
  return (DateFormat(
    'd MMMM',
    lang,
  )..useNativeDigits = false).format(at.toLocal());
}

/// 115.10 The customer's wallet: the balance, then refunds, credit from
/// support and the orders it paid. 115.60 (07a) Credit only: filled by
/// refunds and the owner's credit, it pays all or part of an order, never
/// expires and is never cashed out; each entry says where its money came
/// from or went.
class MarketWalletScreen extends ConsumerWidget {
  const MarketWalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final wallet = ref.watch(marketWalletProvider);
    final currency = ref.watch(marketConfigProvider)?.currency ?? 'EGP';
    final app = _appName(ref);
    return Scaffold(
      backgroundColor: p.background,
      appBar: studioBar(
        context,
        AppBar(
          leading: appBarBack(context),
          title: Text(l10n.marketWallet),
          actions: [
            IconButton(
              tooltip: l10n.marketWalletAbout,
              icon: const Icon(Symbols.help),
              onPressed: () => _about(context),
            ),
          ],
        ),
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
        data: (w) {
          final now = DateTime.now();
          final days = <String, List<MarketWalletEntry>>{};
          for (final e in w.entries) {
            days.putIfAbsent(_dayLabel(context, e.at, now), () => []).add(e);
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
            children: [
              _BalanceCard(balance: w.balance, currency: currency, app: app),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: _Fact(
                      icon: Symbols.bolt,
                      text: l10n.marketWalletInstant,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _Fact(
                      icon: Symbols.all_inclusive,
                      text: l10n.marketWalletNeverExpires,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              if (w.entries.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 20),
                  child: Text(
                    l10n.marketWalletEmpty,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: p.textSecondary),
                  ),
                ),
              for (final day in days.entries) ...[
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(2, 12, 2, 6),
                  child: Text(
                    day.key,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: p.textSecondary,
                    ),
                  ),
                ),
                for (final e in day.value)
                  _EntryCard(
                    entry: e,
                    currency: currency,
                    app: app,
                    today: DateUtils.isSameDay(e.at.toLocal(), now),
                  ),
              ],
            ],
          );
        },
      ),
    );
  }

  void _about(BuildContext context) {
    final l10n = context.l10n;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.marketWallet,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(l10n.marketWalletNote),
              const SizedBox(height: 6),
              Text(l10n.marketWalletEmpty),
            ],
          ),
        ),
      ),
    );
  }
}

/// The deep green balance card with its arches and the checkout switch.
class _BalanceCard extends ConsumerWidget {
  const _BalanceCard({
    required this.balance,
    required this.currency,
    required this.app,
  });

  final MarketMoney balance;
  final String currency;
  final String app;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final first = ref.watch(marketWalletFirstProvider);
    final mark = _currencyMark(context, currency);
    final amber = p.accent;
    final number = balance.amount;
    final big = Text.rich(
      TextSpan(
        children: [
          if (!_arabic(context))
            TextSpan(
              text: '$mark ',
              style: TextStyle(
                fontSize: 20,
                letterSpacing: 0,
                color: Colors.white.withValues(alpha: 0.7),
              ),
            ),
          TextSpan(text: number),
          if (_arabic(context))
            TextSpan(
              text: ' $mark',
              style: TextStyle(
                fontSize: 20,
                letterSpacing: 0,
                color: Colors.white.withValues(alpha: 0.7),
              ),
            ),
        ],
      ),
      textDirection: TextDirection.ltr,
      style: const TextStyle(
        fontSize: 44,
        height: 1,
        fontWeight: FontWeight.w800,
        letterSpacing: -2,
        color: Colors.white,
      ),
    );
    return Container(
      key: const ValueKey('wallet-balance'),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: marketDeeper(p.primary),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Stack(
        children: [
          PositionedDirectional(
            end: -20,
            bottom: -40,
            child: _Arch(width: 150, height: 170, color: amber, alpha: 0.35),
          ),
          PositionedDirectional(
            end: 5,
            bottom: -40,
            child: _Arch(width: 100, height: 120, color: amber, alpha: 0.6),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.upper(l10n.marketWalletBalance),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 2,
                    color: Color(0xFFFFD27A),
                  ),
                ),
                const SizedBox(height: 8),
                Align(alignment: AlignmentDirectional.centerStart, child: big),
                const SizedBox(height: 6),
                Text(
                  l10n.marketWalletPays(app),
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withValues(alpha: 0.8),
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsetsDirectional.fromSTEB(12, 6, 6, 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Symbols.account_balance_wallet,
                        fill: 1,
                        color: amber,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          l10n.marketWalletUseFirst,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      Switch(
                        value: first,
                        activeThumbColor: Colors.white,
                        activeTrackColor: amber,
                        onChanged: (on) => ref
                            .read(marketWalletFirstProvider.notifier)
                            .set(on),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// An arch outline (the look's photos are cut as arches).
class _Arch extends StatelessWidget {
  const _Arch({
    required this.width,
    required this.height,
    required this.color,
    required this.alpha,
  });

  final double width;
  final double height;
  final Color color;
  final double alpha;

  @override
  Widget build(BuildContext context) => Container(
    width: width,
    height: height,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.vertical(top: Radius.circular(width / 2)),
      border: Border(
        top: BorderSide(color: color.withValues(alpha: alpha), width: 2),
        left: BorderSide(color: color.withValues(alpha: alpha), width: 2),
        right: BorderSide(color: color.withValues(alpha: alpha), width: 2),
      ),
    ),
  );
}

class _Fact extends StatelessWidget {
  const _Fact({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: p.border),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, fill: 1, color: p.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 11.5,
                height: 1.25,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// One entry: where its money came from or went.
class _EntryCard extends StatelessWidget {
  const _EntryCard({
    required this.entry,
    required this.currency,
    required this.app,
    required this.today,
  });

  final MarketWalletEntry entry;
  final String currency;
  final String app;
  final bool today;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final e = entry;
    final ref = e.orderReference == null ? null : ltrRun(e.orderReference!);
    final how = switch (e.restPaidBy) {
      'card' => l10n.marketWalletByCard,
      'cash' => l10n.marketWalletByCash,
      'apple_pay' => l10n.marketWalletByApplePay,
      'google_pay' => l10n.marketWalletByGooglePay,
      _ => null,
    };
    final title = switch (e.kind) {
      'refund' when e.complaintReference != null =>
        l10n.marketWalletRefundComplaint(ltrRun(e.complaintReference!)),
      'refund' when ref != null && e.label == 'Order cancelled' =>
        l10n.marketWalletRefundCancelled(ref),
      'payment' when ref != null => l10n.marketWalletPaidToward(ref),
      'payment' => l10n.marketWalletPaid,
      'credit' => l10n.marketWalletCreditFrom(app),
      'taken_back' => l10n.marketWalletTakenBack(app),
      'expired' => l10n.marketWalletExpiredEntry,
      _ => e.label,
    };
    final time = DateFormat('HH:mm').format(e.at.toLocal());
    final sub = switch (e.kind) {
      'credit' || 'taken_back' => [e.label],
      'payment' => [
        ?e.vendorName,
        if (how != null) l10n.marketWalletRestBy(how),
      ],
      _ => [
        ?e.vendorName,
        if (e.complaintReference != null && ref != null)
          l10n.marketWalletOrderRef(ref),
        if (today) ltrRun(time),
      ],
    };
    final (tile, ink, icon) = switch (e.kind) {
      'payment' || 'taken_back' || 'expired' => (
        p.surfaceMuted,
        p.textSecondary,
        e.kind == 'payment' ? Symbols.shopping_bag : Symbols.remove_circle,
      ),
      'credit' => (p.accentSoft, marketDeeper(p.accent, 0.45), Symbols.redeem),
      _ => (p.successSoft, p.success, Symbols.undo),
    };
    final card = Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: tile,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(icon, fill: 1, color: ink),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                if (sub.isNotEmpty)
                  Text(
                    sub.join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11.5, color: p.textSecondary),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            _money(context, e.amount, currency, sign: true),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: e.isIn ? p.success : p.text,
            ),
          ),
        ],
      ),
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: e.orderId == null
          ? card
          : InkWell(
              borderRadius: BorderRadius.circular(18),
              onTap: () => context.push(Paths.marketOrder(e.orderId!)),
              child: card,
            ),
    );
  }
}

/// 115.10 The delivery club: the owner's plans and their benefits, and the
/// customer's membership. Joining pays on the gateway's page (card, Apple
/// Pay or Google Pay); each period is paid on its own. 115 Also a
/// marketplace's Club tab, with the signed-in customer's wallet when the
/// app has one. 115.61 and 115.62 (07b) For a member: the club's card, what
/// it saved them (this month and since they joined), the plans, and D6's
/// renewal: a reminder with a payment link 3 days before the end and on the
/// last day, nothing charged by itself; and how to end it.
class MarketClubScreen extends ConsumerStatefulWidget {
  const MarketClubScreen({super.key});

  @override
  ConsumerState<MarketClubScreen> createState() => _MarketClubScreenState();
}

class _MarketClubScreenState extends ConsumerState<MarketClubScreen> {
  int? _joining;

  /// The plan the member picked for their next period (null: their own).
  int? _chosen;
  bool _renewing = false;

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

  /// 115.62 The next period on the app's payment page (every gateway the app has).
  Future<void> _renew(ClubMembership mine, ClubPlan plan) async {
    final l10n = context.l10n;
    setState(() => _renewing = true);
    try {
      final renewed = await ref
          .read(yallappApiProvider)
          .renewClub(planId: plan.id == mine.plan.id ? null : plan.id);
      if (!mounted) return;
      final payUrl = renewed.payUrl;
      final paid = payUrl == null
          ? true
          : await context.push<bool>(
              Paths.web,
              extra: WebPageArgs(
                url: payUrl,
                title: l10n.checkout,
                completesOn: isOrderReceived,
              ),
            );
      if (paid == true && mounted) showMessage(context, l10n.marketClubRenewed);
      ref.invalidate(myClubProvider);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _renewing = false);
    }
  }

  Future<void> _end(ClubMembership mine) async {
    final l10n = context.l10n;
    final end = mine.periodEnd == null ? '' : _date(context, mine.periodEnd!);
    final yes = await confirmAction(
      context,
      title: l10n.marketClubEndAsk,
      message: l10n.marketClubEndText(end),
      confirmLabel: l10n.marketClubEnd,
      destructive: true,
    );
    if (!yes || !mounted) return;
    try {
      await ref.read(yallappApiProvider).cancelClub();
      ref.invalidate(myClubProvider);
      if (mounted) showMessage(context, l10n.marketClubEndedNote(end));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
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
    final app = _appName(ref);
    String named(MarketClubInfo c) =>
        c.name == 'Club' ? l10n.marketClubNamed(app) : c.name;
    // 115.61 A member with what the club saved them: the member's page (07b).
    final member =
        mine != null &&
        mine.savings != null &&
        mine.status != 'awaiting_payment';
    final title = club.value != null ? named(club.value!) : l10n.tabClub;
    return Scaffold(
      backgroundColor: p.background,
      // 120 Under a Studio page's header, the header is the title.
      appBar: StudioScreenScope.hidesTitleOf(context)
          ? null
          : AppBar(
              leading: appBarBack(context),
              title: Text(member ? title : l10n.tabClub),
              actions: [
                if (member && mine.active)
                  Padding(
                    padding: const EdgeInsetsDirectional.only(end: 16),
                    child: _MemberPill(label: l10n.marketClubMemberBadge),
                  ),
              ],
            ),
      body: club.when(
        loading: () => const SkeletonDetail(),
        error: (e, _) => MessageView(
          icon: Symbols.workspace_premium,
          title: l10n.marketClub,
          message: l10n.marketClubNone,
          actionLabel: l10n.marketBrowse,
          onAction: () => context.go(Paths.home),
        ),
        data: (c) => member
            ? _memberView(c, mine, named(c), wallet)
            : _plansView(c, mine, wallet),
      ),
    );
  }

  Widget _memberView(
    MarketClubInfo c,
    ClubMembership mine,
    String name,
    bool wallet,
  ) {
    final p = context.palette;
    final l10n = context.l10n;
    final currency = ref.watch(marketConfigProvider)?.currency ?? 'EGP';
    final plans = c.plans.isEmpty ? [mine.plan] : c.plans;
    final chosen =
        plans.where((x) => x.id == (_chosen ?? mine.plan.id)).firstOrNull ??
        mine.plan;
    final end = mine.periodEnd;
    final now = DateTime.now();
    final ended = mine.status == 'ended' || (end != null && !end.isAfter(now));
    final due = end != null && end.difference(now).inHours <= 72;
    final button =
        !_renewing &&
        (ended || (mine.renews && due) || chosen.id != mine.plan.id);
    final price = _money(context, chosen.price, currency, whole: true);
    final label = ended
        ? l10n.marketClubRenewAgainWith(price)
        : chosen.id != mine.plan.id
        ? l10n.marketClubSwitchWith(_planName(chosen), price)
        : l10n.marketClubRenewWith(price);
    final monthly = plans.where((x) => !x.yearly).firstOrNull;
    final yearly = plans.where((x) => x.yearly).firstOrNull;
    final monthsFree = monthly == null || yearly == null
        ? 0
        : (12 -
                  (double.parse(yearly.price.amount) /
                      double.parse(monthly.price.amount)))
              .round();
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        _MemberCard(membership: mine, name: name, currency: currency),
        const SizedBox(height: 12),
        _SavingsCard(savings: mine.savings!, currency: currency),
        const SizedBox(height: 12),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final (i, plan) in plans.take(2).indexed) ...[
                if (i > 0) const SizedBox(width: 10),
                Expanded(
                  child: _PlanChoice(
                    plan: plan,
                    currency: currency,
                    selected: plan.id == chosen.id,
                    tag: plan.yearly && monthsFree > 0
                        ? l10n.marketClubMonthsFree(monthsFree)
                        : null,
                    onTap: () => setState(() => _chosen = plan.id),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        for (final perk in _perks(chosen, currency))
          Padding(
            padding: const EdgeInsets.only(bottom: 7),
            child: Row(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: p.primarySoft,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    perk.$1,
                    size: 18,
                    fill: 1,
                    color: p.onPrimarySoft,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    perk.$2,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: p.text,
                    ),
                  ),
                ),
              ],
            ),
          ),
        if (button || _renewing) ...[
          const SizedBox(height: 8),
          PrimaryButton(
            key: const ValueKey('club-renew'),
            label: label,
            loading: _renewing,
            onPressed: _renewing ? null : () => _renew(mine, chosen),
          ),
        ],
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                mine.renews && mine.remindAt != null
                    ? l10n.marketClubRemindOn(_date(context, mine.remindAt!))
                    : ended || end == null
                    ? l10n.marketClubNoRenew
                    : l10n.marketClubEndedNote(_date(context, end)),
                style: TextStyle(fontSize: 11.5, color: p.textSecondary),
              ),
            ),
            if (mine.renews && !ended) ...[
              const SizedBox(width: 8),
              InkWell(
                onTap: () => _end(mine),
                child: Text(
                  l10n.marketClubEnd,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: p.link,
                  ),
                ),
              ),
            ],
          ],
        ),
        if (wallet) ...[const SizedBox(height: 16), const _WalletRow()],
      ],
    );
  }

  String _planName(ClubPlan plan) => plan.yearly
      ? context.l10n.marketClubYearly
      : context.l10n.marketClubMonthly;

  /// The plan's benefit in the app's words, then the owner's own perks.
  List<(IconData, String)> _perks(ClubPlan plan, String currency) {
    final l10n = context.l10n;
    final over = plan.freeDeliveryOver;
    return [
      if (over != null)
        (
          Symbols.local_shipping,
          over.isZero
              ? l10n.marketClubFreeAlways
              : l10n.marketClubFreeByCouriersOver(
                  _money(context, over, currency, whole: true),
                ),
        )
      else if (plan.deliveryPercentOff != null)
        (
          Symbols.local_shipping,
          percentText(l10n.marketClubPercentOff('${plan.deliveryPercentOff}')),
        ),
      for (final perk in plan.perks) (Symbols.sell, perk),
    ];
  }

  Widget _plansView(MarketClubInfo c, ClubMembership? mine, bool wallet) {
    final p = context.palette;
    final l10n = context.l10n;
    return ListView(
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
                          child: Text(b, style: TextStyle(color: p.textBody)),
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
    );
  }
}

/// "✓ Member", beside the club's title.
class _MemberPill extends StatelessWidget {
  const _MemberPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: p.successSoft,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Symbols.check_circle, size: 18, fill: 1, color: p.success),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: p.success,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The club's card: its name, the benefit, since when, and the next payment.
class _MemberCard extends StatelessWidget {
  const _MemberCard({
    required this.membership,
    required this.name,
    required this.currency,
  });

  final ClubMembership membership;
  final String name;
  final String currency;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final m = membership;
    final over = m.plan.freeDeliveryOver;
    final benefit = over != null
        ? (over.isZero
              ? l10n.marketClubFreeAlways
              : l10n.marketClubFreeOver(
                  _money(context, over, currency, whole: true),
                ))
        : m.plan.deliveryPercentOff != null
        ? percentText(l10n.marketClubPercentOff('${m.plan.deliveryPercentOff}'))
        : (m.plan.benefits.firstOrNull ?? '');
    final end = m.periodEnd;
    final next = end == null
        ? ''
        : m.status == 'ended' || !end.isAfter(DateTime.now())
        ? l10n.marketClubEndedOn(_date(context, end))
        : m.renews
        ? l10n.marketClubNextPayment(_date(context, end))
        : l10n.marketClubEndsOn(_date(context, end));
    final plan =
        '${m.plan.yearly ? l10n.marketClubYearly : l10n.marketClubMonthly} · ${_money(context, m.plan.price, currency, whole: true)}';
    final poster = marketDeeper(p.primary);
    return Container(
      key: const ValueKey('club-card'),
      constraints: const BoxConstraints(minHeight: 192),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [poster, marketDeeper(poster, 0.4), p.primary],
          stops: const [0, 0.55, 1],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.18),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          PositionedDirectional(
            top: -60,
            end: -80,
            child: Container(
              width: 230,
              height: 230,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: p.accent.withValues(alpha: 0.16),
                  width: 26,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: p.accent,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Symbols.bolt,
                        fill: 1,
                        size: 20,
                        color: Color(0xFF241700),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        name,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 250),
                  child: Text(
                    benefit,
                    style: const TextStyle(
                      fontSize: 16,
                      height: 1.25,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.marketClubSince,
                            style: TextStyle(
                              fontSize: 11.5,
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                          ),
                          if (m.startedAt != null)
                            Text(
                              _date(context, m.startedAt!),
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            next,
                            textAlign: TextAlign.end,
                            style: TextStyle(
                              fontSize: 11.5,
                              color: Colors.white.withValues(alpha: 0.9),
                            ),
                          ),
                          Text(
                            plan,
                            textAlign: TextAlign.end,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFFFD27A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 115.61 What the club saved the member, and what they paid for it.
class _SavingsCard extends StatelessWidget {
  const _SavingsCard({required this.savings, required this.currency});

  final ClubSavings savings;
  final String currency;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final s = savings;
    final total = double.tryParse(s.total.amount) ?? 0;
    final paid = double.tryParse(s.paid.amount) ?? 0;
    final times = paid > 0 && total > 0 ? total / paid : 0.0;
    final timesText = times >= 10
        ? times.round().toString()
        : times.toStringAsFixed(1);
    Widget bar(String label, String value) => Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: p.surfaceMuted,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: p.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 11, color: p.textSecondary)),
            const SizedBox(height: 2),
            Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
          ],
        ),
      ),
    );
    return Container(
      key: const ValueKey('club-savings'),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  context.upper(l10n.marketClubYouSaved),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 2,
                    color: p.textSecondary,
                  ),
                ),
              ),
              if (times >= 1)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: p.accentSoft,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    l10n.marketClubTimesPaid(ltrRun(timesText)),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: marketDeeper(p.accent, 0.45),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            _money(context, s.total, currency),
            style: TextStyle(
              fontSize: 34,
              height: 1.1,
              fontWeight: FontWeight.w800,
              letterSpacing: -1.2,
              color: p.primary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            l10n.marketClubSinceJoinedFor(_money(context, s.paid, currency)),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          const SizedBox(height: 12),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                bar(
                  l10n.marketClubThisMonth,
                  _money(context, s.thisMonth, currency),
                ),
                const SizedBox(width: 8),
                bar(
                  l10n.marketClubFreeDeliveries,
                  l10n.marketClubOfCount(
                    '${s.freeDeliveries}',
                    '${s.deliveries}',
                  ),
                ),
                const SizedBox(width: 8),
                bar(
                  l10n.marketClubMembersOffers,
                  _money(context, s.offers, currency),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A plan to pay the next period on, with its price and its radio.
class _PlanChoice extends StatelessWidget {
  const _PlanChoice({
    required this.plan,
    required this.currency,
    required this.selected,
    required this.onTap,
    this.tag,
  });

  final ClubPlan plan;
  final String currency;
  final bool selected;
  final String? tag;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Semantics(
      selected: selected,
      button: true,
      child: GestureDetector(
        onTap: onTap,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                color: p.surface,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: selected ? p.primary : p.border,
                  width: selected ? 2.5 : 1.5,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          plan.yearly
                              ? l10n.marketClubYearly
                              : l10n.marketClubMonthly,
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: p.text,
                          ),
                        ),
                      ),
                      Icon(
                        selected
                            ? Symbols.radio_button_checked
                            : Symbols.radio_button_unchecked,
                        size: 22,
                        color: selected ? p.primary : p.border,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: _money(
                            context,
                            plan.price,
                            currency,
                            whole: true,
                          ),
                        ),
                        TextSpan(
                          text:
                              ' / ${plan.yearly ? l10n.marketClubSlashYear : l10n.marketClubSlashMonth}',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0,
                            color: p.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.6,
                      color: p.text,
                    ),
                  ),
                ],
              ),
            ),
            if (tag != null)
              PositionedDirectional(
                top: -10,
                end: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: p.accent,
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: Text(
                    tag!,
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF241700),
                    ),
                  ),
                ),
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
