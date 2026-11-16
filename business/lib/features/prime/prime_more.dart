import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../food/food_sheets.dart';
import '../studio/studio_widgets.dart';
import 'prime_widgets.dart';

/// 132 Prime's second set in Yallapp Business: customer insights, product
/// insights, ratings and reviews, and quick actions from the phone (a
/// coupon, a flash sale, a delivery slot closed for a day, a restaurant's
/// busy time; prices, stock and what shows in Catalog). Each only where the
/// app has it; nothing sold.

final primeCustomersProvider = FutureProvider.autoDispose
    .family<PrimeCustomers, String>(
      (ref, period) => ref
          .watch(apiProvider)
          .primeCustomers(ref.watch(appIdProvider), period: period),
    );

final primeProductsProvider = FutureProvider.autoDispose
    .family<PrimeProducts, String>(
      (ref, period) => ref
          .watch(apiProvider)
          .primeProducts(ref.watch(appIdProvider), period: period),
    );

final primeReviewsProvider = FutureProvider.autoDispose<PrimeReviews>(
  (ref) => ref.watch(apiProvider).primeReviews(ref.watch(appIdProvider)),
);

final slotsProvider = FutureProvider.autoDispose<SlotsDay>(
  (ref) => ref.watch(apiProvider).deliverySlots(ref.watch(appIdProvider)),
);

/// A titled list of rows in one box.
class _ListBox extends StatelessWidget {
  const _ListBox({required this.title, required this.rows, this.empty});

  final String title;
  final List<Widget> rows;
  final String? empty;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionTitle(title),
        Box(
          radius: 18,
          padding: EdgeInsets.zero,
          child: rows.isEmpty
              ? Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    empty ?? '',
                    style: TextStyle(fontSize: 14, color: c.ink2),
                  ),
                )
              : Column(
                  children: [
                    for (var i = 0; i < rows.length; i++)
                      DecoratedBox(
                        decoration: BoxDecoration(
                          border: i == rows.length - 1
                              ? null
                              : Border(bottom: BorderSide(color: c.line)),
                        ),
                        child: rows[i],
                      ),
                  ],
                ),
        ),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.title, this.subtitle, this.trailing});

  final String title;
  final String? subtitle;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle!,
                    style: TextStyle(fontSize: 13, color: c.ink2),
                  ),
              ],
            ),
          ),
          if (trailing != null)
            Text(
              trailing!,
              textDirection: TextDirection.ltr,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
        ],
      ),
    );
  }
}

/// A big number with its word, on Prime's gold.
class _Stat extends StatelessWidget {
  const _Stat(this.value, this.label);

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return Expanded(
      child: MergeSemantics(
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: c.goldBg,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: c.gold,
                ),
              ),
              Text(label, style: TextStyle(fontSize: 12, color: c.ink)),
            ],
          ),
        ),
      ),
    );
  }
}

// Customers

class PrimeCustomersScreen extends ConsumerStatefulWidget {
  const PrimeCustomersScreen({super.key});

  @override
  ConsumerState<PrimeCustomersScreen> createState() =>
      _PrimeCustomersScreenState();
}

class _PrimeCustomersScreenState extends ConsumerState<PrimeCustomersScreen> {
  String _period = 'month';

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final value = ref.watch(primeCustomersProvider(_period));
    String who(PrimePerson p) => p.name == null ? l10n.aCustomer : p.name!;
    String line(PrimePerson p) => [
      l10n.ordersCount(p.orders),
      l10n.lastOrder(context.ago(p.lastOrderAt)),
    ].join(' · ');
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.customersInsights),
        actions: const [PrimeChip()],
      ),
      body: Column(
        children: [
          Segments(
            labels: [l10n.thisWeek, l10n.thisMonth],
            selected: _period == 'week' ? 0 : 1,
            onSelected: (i) =>
                setState(() => _period = i == 0 ? 'week' : 'month'),
          ),
          Expanded(
            child: AsyncBody(
              value: value,
              onRetry: () => ref.invalidate(primeCustomersProvider(_period)),
              builder: (d) => ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                children: [
                  Row(
                    children: [
                      _Stat(context.number(d.customers), l10n.customersLabel),
                      const SizedBox(width: 8),
                      _Stat(context.number(d.fresh), l10n.newCustomers),
                      const SizedBox(width: 8),
                      _Stat(context.number(d.returning), l10n.cameBack),
                    ],
                  ),
                  _ListBox(
                    title: l10n.topCustomers,
                    empty: l10n.noCustomersYet,
                    rows: [
                      for (final p in d.top)
                        _Row(
                          title: who(p),
                          subtitle: line(p),
                          trailing: p.spend.formatted,
                        ),
                    ],
                  ),
                  _ListBox(
                    title: l10n.away30(d.lapsed30),
                    empty: l10n.nobodyAway,
                    rows: [
                      for (final p in d.lapsed30People)
                        _Row(
                          title: who(p),
                          subtitle: line(p),
                          trailing: p.spend.formatted,
                        ),
                    ],
                  ),
                  _ListBox(
                    title: l10n.away60(d.lapsed60),
                    empty: l10n.nobodyAway,
                    rows: [
                      for (final p in d.lapsed60People)
                        _Row(
                          title: who(p),
                          subtitle: line(p),
                          trailing: p.spend.formatted,
                        ),
                    ],
                  ),
                  if (!d.namesShown)
                    Padding(
                      padding: const EdgeInsets.all(8),
                      child: Text(
                        l10n.namesHidden,
                        style: TextStyle(fontSize: 13, color: context.yb.ink2),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Products

class PrimeProductsScreen extends ConsumerStatefulWidget {
  const PrimeProductsScreen({super.key});

  @override
  ConsumerState<PrimeProductsScreen> createState() =>
      _PrimeProductsScreenState();
}

class _PrimeProductsScreenState extends ConsumerState<PrimeProductsScreen> {
  String _period = 'month';

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final value = ref.watch(primeProductsProvider(_period));
    Widget stockTag(int? stock) => stock == null
        ? const SizedBox.shrink()
        : Tag(
            stock == 0 ? l10n.soldOutTag : l10n.leftCount(stock),
            tone: stock == 0 ? Tone.bad : Tone.warn,
          );
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.productsInsights),
        actions: const [PrimeChip()],
      ),
      body: Column(
        children: [
          Segments(
            labels: [l10n.thisWeek, l10n.thisMonth],
            selected: _period == 'week' ? 0 : 1,
            onSelected: (i) =>
                setState(() => _period = i == 0 ? 'week' : 'month'),
          ),
          Expanded(
            child: AsyncBody(
              value: value,
              onRetry: () => ref.invalidate(primeProductsProvider(_period)),
              builder: (d) => ListView(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                children: [
                  _ListBox(
                    title: l10n.bestSellers,
                    empty: l10n.nothingSoldYet,
                    rows: [
                      for (final p in d.best)
                        _Row(
                          title: p.name,
                          subtitle: l10n.unitsSold(p.units),
                          trailing: p.total.formatted,
                        ),
                    ],
                  ),
                  _ListBox(
                    title: l10n.slowMovers,
                    empty: l10n.nothingSlow,
                    rows: [
                      for (final p in d.slow)
                        _Row(title: p.name, subtitle: l10n.unitsSold(p.units)),
                    ],
                  ),
                  _ListBox(
                    title: l10n.runningLow,
                    empty: l10n.stockFine,
                    rows: [
                      for (final p in [...d.outOfStock, ...d.lowStock])
                        Padding(
                          padding: const EdgeInsetsDirectional.only(end: 14),
                          child: Row(
                            children: [
                              Expanded(child: _Row(title: p.name)),
                              stockTag(p.stock),
                            ],
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  BigButton(
                    label: l10n.priceAndStock,
                    filled: false,
                    icon: AppIcons.catalog,
                    onPressed: () => context.go(Paths.catalog),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.lowStockAlertHint(d.threshold),
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: c.ink2),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Reviews

class PrimeReviewsScreen extends ConsumerWidget {
  const PrimeReviewsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final value = ref.watch(primeReviewsProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.reviewsRatings),
        actions: const [PrimeChip()],
      ),
      body: AsyncBody(
        value: value,
        onRetry: () => ref.invalidate(primeReviewsProvider),
        builder: (d) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
          children: [
            Row(
              children: [
                _Stat(
                  d.average == null ? '–' : context.number(d.average!),
                  l10n.averageRating,
                ),
                const SizedBox(width: 8),
                _Stat(context.number(d.count), l10n.ratingsCount),
              ],
            ),
            const SizedBox(height: 12),
            if (d.items.isEmpty)
              EmptyState(icon: AppIcons.star, title: l10n.noReviewsYet),
            for (final r in d.items) ...[
              Box(
                radius: 18,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Semantics(
                          label: l10n.starsOf(r.rating),
                          child: ExcludeSemantics(
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                for (var i = 1; i <= 5; i++)
                                  Icon(
                                    AppIcons.star,
                                    size: 18,
                                    fill: i <= r.rating ? 1 : 0,
                                    color: i <= r.rating ? c.gold : c.line,
                                  ),
                              ],
                            ),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          context.ago(r.at),
                          style: TextStyle(fontSize: 12, color: c.ink2),
                        ),
                      ],
                    ),
                    if (r.comment != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        '“${isolate(r.comment!)}”',
                        style: const TextStyle(fontSize: 15),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Text(
                      [
                        if (r.name != null) isolate(r.name!),
                        if (r.about.isNotEmpty) isolate(r.about),
                      ].join(' · '),
                      style: TextStyle(fontSize: 13, color: c.ink2),
                    ),
                    if (r.canReply) ...[
                      const SizedBox(height: 8),
                      SmallButton(
                        label: r.reply == null
                            ? l10n.replyInInbox
                            : l10n.repliedInInbox,
                        icon: AppIcons.inbox,
                        quiet: true,
                        onPressed: () => context.go(Paths.inboxTab('reviews')),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }
}

// Quick actions

class QuickActionsScreen extends ConsumerWidget {
  const QuickActionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final app = ref.watch(currentAppProvider);
    if (app == null) return const SizedBox.shrink();
    final f = app.features;
    final store = f.products;
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.quickActions),
        actions: const [PrimeChip()],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          if (store) ...[
            TileGrid(
              tiles: [
                InfoTile(
                  icon: AppIcons.refund,
                  iconColor: c.gold,
                  title: l10n.newCoupon,
                  text: l10n.newCouponHelp,
                  onTap: () =>
                      showFootSheet<String>(
                        context,
                        (_) => const _CouponForm(),
                      ).then((code) {
                        if (code != null && context.mounted) {
                          showMessage(context, l10n.couponSaved(code));
                        }
                      }),
                ),
                InfoTile(
                  icon: AppIcons.flashSale,
                  iconColor: c.gold,
                  title: l10n.newFlashSale,
                  text: l10n.newFlashSaleHelp,
                  onTap: () =>
                      showFootSheet<String>(
                        context,
                        (_) => const _FlashSaleForm(),
                      ).then((title) {
                        if (title != null && context.mounted) {
                          showMessage(context, l10n.flashSaleSaved(title));
                        }
                      }),
                ),
                InfoTile(
                  icon: AppIcons.catalog,
                  iconColor: c.gold,
                  title: l10n.priceAndStock,
                  text: l10n.priceAndStockHelp,
                  onTap: () => context.go(Paths.catalog),
                ),
              ],
            ),
            const _SlotsToday(),
          ],
          if (f.restaurants) const _BusyMode(),
          if (!store && !f.restaurants)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(l10n.noQuickActions, style: TextStyle(color: c.ink2)),
            ),
        ],
      ),
    );
  }
}

/// Today's delivery slots, each closed or opened again with a switch.
class _SlotsToday extends ConsumerStatefulWidget {
  const _SlotsToday();

  @override
  ConsumerState<_SlotsToday> createState() => _SlotsTodayState();
}

class _SlotsTodayState extends ConsumerState<_SlotsToday> {
  bool _busy = false;

  Future<void> _set(SlotsDay day, String slotId, bool closed) async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiProvider)
          .setSlotClosed(
            ref.read(appIdProvider),
            slotId,
            date: day.date,
            closed: closed,
          );
      ref.invalidate(slotsProvider);
      if (mounted) {
        showMessage(context, closed ? l10n.slotClosed : l10n.slotOpened);
      }
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final value = ref.watch(slotsProvider);
    final day = value.value;
    if (day == null || day.slots.isEmpty) return const SizedBox.shrink();
    return _ListBox(
      title: l10n.deliveryToday,
      rows: [
        for (final s in day.slots)
          SwitchListTile(
            title: Text(
              s.label,
              textDirection: TextDirection.ltr,
              textAlign: Directionality.of(context) == TextDirection.rtl
                  ? TextAlign.right
                  : TextAlign.left,
            ),
            subtitle: Text(s.closed ? l10n.slotClosedToday : l10n.slotOpen),
            value: !s.closed,
            onChanged: _busy ? null : (open) => _set(day, s.id, !open),
          ),
      ],
    );
  }
}

/// Busy mode: a restaurant takes no new orders for a while.
class _BusyMode extends ConsumerStatefulWidget {
  const _BusyMode();

  @override
  ConsumerState<_BusyMode> createState() => _BusyModeState();
}

class _BusyModeState extends ConsumerState<_BusyMode> {
  final _until = <String, DateTime?>{};

  Future<void> _busy(Restaurant r) async {
    final l10n = context.l10n;
    final minutes = await showFootSheet<int>(
      context,
      (sheet) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.busyFor(r.name),
            style: Theme.of(sheet).textTheme.titleLarge,
          ),
          const SizedBox(height: 4),
          Text(l10n.busyHelp, style: TextStyle(color: sheet.yb.ink2)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final m in const [15, 30, 45, 60, 90])
                ChoiceChip(
                  label: Text(l10n.minutesShort(m)),
                  selected: false,
                  onSelected: (_) => Navigator.pop(sheet, m),
                ),
            ],
          ),
          const SizedBox(height: 12),
          BigButton(
            label: l10n.takeOrdersNow,
            filled: false,
            onPressed: () => Navigator.pop(sheet, 0),
          ),
        ],
      ),
    );
    if (minutes == null || !mounted) return;
    try {
      final until = await ref
          .read(apiProvider)
          .setRestaurantBusy(ref.read(appIdProvider), r.id, minutes);
      setState(() => _until[r.id] = until);
      if (mounted) {
        showMessage(
          context,
          until == null
              ? l10n.takingOrders(r.name)
              : l10n.busyUntil(r.name, context.time(until)),
        );
      }
    } on Object catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final appId = ref.watch(appIdProvider);
    final value = ref.watch(_restaurantsProvider(appId));
    final list = value.value ?? const <Restaurant>[];
    return _ListBox(
      title: l10n.busyMode,
      empty: l10n.noRestaurants,
      rows: [
        for (final r in list)
          ListTile(
            title: Text(r.name),
            subtitle: Text(
              _until.containsKey(r.id)
                  ? (_until[r.id] == null
                        ? l10n.takingOrdersShort
                        : l10n.busyUntilShort(context.time(_until[r.id]!)))
                  : r.stateLabel,
            ),
            trailing: const DirectionalIcon(AppIcons.forward),
            onTap: () => _busy(r),
          ),
      ],
    );
  }
}

final _restaurantsProvider = FutureProvider.autoDispose
    .family<List<Restaurant>, String>(
      (ref, appId) => ref.watch(apiProvider).restaurants(appId),
    );

class _CouponForm extends ConsumerStatefulWidget {
  const _CouponForm();

  @override
  ConsumerState<_CouponForm> createState() => _CouponFormState();
}

class _CouponFormState extends ConsumerState<_CouponForm> {
  final _code = TextEditingController();
  final _value = TextEditingController();
  bool _percent = true;
  bool _public = true;
  bool _busy = false;
  Map<String, String> _errors = const {};

  @override
  void dispose() {
    _code.dispose();
    _value.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _errors = const {};
    });
    try {
      final code = await ref.read(apiProvider).createCoupon(
        ref.read(appIdProvider),
        {
          'code': _code.text.trim(),
          'kind': _percent ? 'percent' : 'amount',
          'value': _value.text.trim(),
          'public': _public,
        },
      );
      if (mounted) Navigator.pop(context, code);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _errors = e.fieldErrors);
      if (e.fieldErrors.isEmpty) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l10n.newCoupon, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        TextField(
          controller: _code,
          textCapitalization: TextCapitalization.characters,
          decoration: InputDecoration(
            labelText: l10n.couponCode,
            hintText: 'SPRING10',
            errorText: _errors['code'],
          ),
        ),
        const SizedBox(height: 10),
        SegmentedButton<bool>(
          segments: [
            ButtonSegment(value: true, label: Text(l10n.percentOff)),
            ButtonSegment(value: false, label: Text(l10n.amountOff)),
          ],
          selected: {_percent},
          onSelectionChanged: (v) => setState(() => _percent = v.first),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _value,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
          ],
          decoration: InputDecoration(
            labelText: _percent
                ? l10n.percentValueField
                : l10n.amountValueField,
            errorText: _errors['value'],
          ),
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(l10n.showInApp),
          value: _public,
          onChanged: (v) => setState(() => _public = v),
        ),
        BigButton(label: l10n.save, busy: _busy, onPressed: _save),
      ],
    );
  }
}

class _FlashSaleForm extends ConsumerStatefulWidget {
  const _FlashSaleForm();

  @override
  ConsumerState<_FlashSaleForm> createState() => _FlashSaleFormState();
}

class _FlashSaleFormState extends ConsumerState<_FlashSaleForm> {
  final _title = TextEditingController();
  final _value = TextEditingController(text: '20');
  final _picked = <int>{};
  int _hours = 24;
  bool _busy = false;
  Map<String, String> _errors = const {};

  @override
  void dispose() {
    _title.dispose();
    _value.dispose();
    super.dispose();
  }

  static String _local(DateTime t) =>
      '${t.year.toString().padLeft(4, '0')}-${t.month.toString().padLeft(2, '0')}-${t.day.toString().padLeft(2, '0')}'
      'T${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _errors = const {};
    });
    final start = DateTime.now();
    try {
      final title = await ref.read(apiProvider).createFlashSale(
        ref.read(appIdProvider),
        {
          'title': _title.text.trim(),
          'product_ids': [..._picked],
          'kind': 'percent',
          'value': _value.text.trim(),
          'starts_at': _local(start),
          'ends_at': _local(start.add(Duration(hours: _hours))),
        },
      );
      if (mounted) Navigator.pop(context, title);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _errors = e.fieldErrors);
      if (e.fieldErrors.isEmpty) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final products = ref.watch(_productsProvider(ref.watch(appIdProvider)));
    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.newFlashSale,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _title,
            decoration: InputDecoration(
              labelText: l10n.saleName,
              errorText: _errors['title'],
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _value,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: InputDecoration(
              labelText: l10n.percentValueField,
              errorText: _errors['value'],
            ),
          ),
          const SizedBox(height: 10),
          Text(l10n.saleLasts, style: Theme.of(context).textTheme.titleSmall),
          Wrap(
            spacing: 8,
            children: [
              for (final h in const [6, 24, 48, 72])
                ChoiceChip(
                  label: Text(l10n.hoursShort(h)),
                  selected: _hours == h,
                  onSelected: (_) => setState(() => _hours = h),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            l10n.saleProducts,
            style: Theme.of(context).textTheme.titleSmall,
          ),
          if (_errors['product_ids'] != null)
            Text(
              _errors['product_ids']!,
              style: TextStyle(color: context.yb.danger, fontSize: 13),
            ),
          for (final p in products.value ?? const <Product>[])
            if (!p.addon)
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: _picked.contains(p.id),
                title: Text(p.name),
                onChanged: (on) => setState(
                  () => on == true ? _picked.add(p.id) : _picked.remove(p.id),
                ),
              ),
          const SizedBox(height: 8),
          BigButton(label: l10n.save, busy: _busy, onPressed: _save),
        ],
      ),
    );
  }
}

final _productsProvider = FutureProvider.autoDispose
    .family<List<Product>, String>(
      (ref, appId) => ref.watch(apiProvider).products(appId),
    );

/// 132 Today's sales goal as a ring: how far, the amount and the goal.
class GoalCard extends StatelessWidget {
  const GoalCard({super.key, required this.goal, this.onTap});

  final TodayGoal goal;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    return Box(
      radius: 18,
      onTap: onTap,
      color: c.goldBg,
      border: BorderSide.none,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          SizedBox.square(
            dimension: 64,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox.square(
                  dimension: 64,
                  child: CircularProgressIndicator(
                    value: goal.pct / 100,
                    strokeWidth: 7,
                    strokeCap: StrokeCap.round,
                    backgroundColor: c.surface,
                    color: goal.reached ? c.success : c.gold,
                    semanticsLabel: goal.label,
                  ),
                ),
                Text(
                  l10n.percentValue(context.number(goal.pct)),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: c.ink,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  goal.reached ? l10n.goalReached : goal.label,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: goal.reached ? c.success : c.gold,
                  ),
                ),
                Text(
                  l10n.goalProgress(
                    isolate(goal.current.formatted),
                    isolate(goal.target.formatted),
                  ),
                  style: TextStyle(fontSize: 14, color: c.ink),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 132 "Prime · Gift from Yallapp" for an app given Prime as a gift.
class GiftBadge extends StatelessWidget {
  const GiftBadge({super.key, this.until, this.onDark = false});

  final DateTime? until;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final text = until == null
        ? l10n.primeGift
        : l10n.primeGiftUntil(context.date(until!));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: onDark ? c.headSurface : c.goldBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(AppIcons.gift, size: 16, color: onDark ? c.headBadge : c.gold),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: onDark ? c.onHead : c.gold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
