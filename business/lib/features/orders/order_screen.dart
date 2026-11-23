import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/pharaonic_widgets.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/contact.dart';
import '../../core/widgets/digits.dart';
import '../../core/widgets/l10n.dart';
import '../../l10n/app_localizations.dart';
import '../../core/widgets/states.dart';
import '../food/food_sheets.dart' show FootPanel;
import '../studio/studio_widgets.dart' show IconLine;
import 'order_actions.dart';
import 'order_stages.dart';
import 'order_text.dart';
import 'ship_sheet.dart';

final orderProvider = FutureProvider.autoDispose.family<Order, int>(
  (ref, id) => ref.watch(apiProvider).order(ref.watch(appIdProvider), id),
);

/// 59 One order: the customer, the address, the items, the payment and its
/// refunds; moving it on, and refunding it as the API allows. 132 In clear
/// parts: who ordered, where it goes (Open in Maps, Copy address), when,
/// the gift card, the items with their add-ons under them, the payment
/// with the discounts and fees, the notes; the next steps at the foot.
class OrderScreen extends ConsumerStatefulWidget {
  const OrderScreen({super.key, required this.orderId, this.accept = false});

  final int orderId;

  /// 214 Opened by Accept on the new order's notification: a restaurant's
  /// new order goes to the kitchen at once (other orders have no accept
  /// step and just open).
  final bool accept;

  @override
  ConsumerState<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends ConsumerState<OrderScreen> {
  bool _accepting = false;

  int get orderId => widget.orderId;

  @override
  void initState() {
    super.initState();
    _accepting = widget.accept;
    // 214 Opened: the new order's ongoing notification goes.
    ref.read(ringNativeProvider).orderDone({
      'order_id': '$orderId',
      'kind': 'new_order',
    });
  }

  Future<void> _accept(Order order) async {
    _accepting = false;
    final isNew = order.kitchen?.step == 'received';
    if (!isNew || !order.nextStatuses.contains('preparing')) return;
    final updated = await changeOrderStatus(context, ref, order, 'preparing');
    if (updated != null && mounted) ref.invalidate(orderProvider(orderId));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final order = ref.watch(orderProvider(orderId));
    final loaded = order.value;
    if (_accepting && loaded != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _accept(loaded));
      _accepting = false;
    }
    return Scaffold(
      appBar: AppBar(
        // 215 The Pharaonic theme: the order's number in a cartouche.
        title: context.ornaments != null && loaded != null
            ? Align(
                alignment: AlignmentDirectional.centerStart,
                child: Cartouche(
                  child: Text(
                    isolate(loaded.label),
                    style: Theme.of(context).textTheme.titleLarge
                        ?.copyWith(color: context.yb.gold),
                  ),
                ),
              )
            : Text(loaded?.label ?? l10n.order),
        // 207 Copy or send the order's details.
        actions: [if (loaded != null) OrderShareButton(order: loaded)],
      ),
      bottomNavigationBar: loaded == null
          ? null
          // 132 A store order's delivery stages, Cancel order with them.
          : loaded.nextStages.isNotEmpty
          ? FootPanel(
              child: StageActions(
                order: loaded,
                onChanged: (_) => ref.invalidate(orderProvider(orderId)),
              ),
            )
          : loaded.nextStatuses.isEmpty
          ? null
          : FootPanel(
              child: OrderActions(
                order: loaded,
                large: true,
                onChanged: (_) => ref.invalidate(orderProvider(orderId)),
              ),
            ),
      body: RefreshIndicator(
        onRefresh: pullToRefresh(
          context,
          () => ref.refresh(orderProvider(orderId).future),
        ),
        child: AsyncBody(
          value: order,
          onRetry: () => ref.invalidate(orderProvider(orderId)),
          builder: (order) => _OrderBody(order: order),
        ),
      ),
    );
  }
}

/// 132 "Tue, Oct 13 · 13:00–16:00", the day in the person's language.
String deliveryWhen(BuildContext context, OrderDelivery d) => [
  if (d.date != null) context.day(d.date!),
  if (d.slotLabel != null) isolate(d.slotLabel!),
].join(' · ');

class _OrderBody extends ConsumerWidget {
  const _OrderBody({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final c = context.yb;
    final customer = order.customer;
    final to = order.deliverTo;
    final d = order.delivery;
    final kitchen = order.kitchen;
    final refund = order.refund;
    void changed(Order _) => ref.invalidate(orderProvider(order.id));

    // Who ordered: a gift's sender is marked as such, an account's too.
    final customerLabel = d?.recipient != null
        ? l10n.giftSender
        : customer?.source == 'account'
        ? l10n.fromAccount
        : null;
    final buyerPhone = customer?.phone ?? d?.sender?.phone;
    final buyerEmail = customer?.email ?? d?.sender?.email;
    // An address with nothing to deliver (a course bought) stays with the customer.
    final customerAddress = to == null
        ? [customer?.address, customer?.city].whereType<String>().join(', ')
        : '';

    final when = d != null && d.hasWhen
        ? deliveryWhen(context, d)
        : kitchen != null
        ? (kitchen.scheduledFor != null
              ? context.dateTime(kitchen.scheduledFor!)
              : l10n.asSoonAsPossible)
        : null;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  StatusChip(
                    orderStatusLabel(context, order),
                    tone: StatusChip.toneOf(orderTone(order)),
                  ),
                  if (kitchen != null)
                    StatusChip(
                      kitchen.type == 'delivery' ? l10n.delivery : l10n.pickup,
                    ),
                  if (to?.isRecipient ?? false)
                    StatusChip(l10n.giftOrder, tone: Tone.accent),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                order.paidAt == null
                    ? l10n.placedAt(context.dateTime(order.createdAt))
                    : l10n.paidAt(context.dateTime(order.paidAt!)),
                style: theme.textTheme.bodySmall,
              ),
              if (order.payOutside != null) ...[
                const SizedBox(height: 8),
                Text(
                  order.payOutside!.dueAt == null
                      ? l10n.payOutsideWaiting(isolate(order.payOutside!.name))
                      : l10n.payOutsideDue(
                          isolate(order.payOutside!.name),
                          context.date(order.payOutside!.dueAt!),
                        ),
                  style: TextStyle(
                    color: c.warning,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (customer != null || d?.sender != null) ...[
          SectionTitle(l10n.customer),
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                PersonCard(
                  name: order.buyerName,
                  label: customerLabel,
                  phone: buyerPhone,
                  email: buyerEmail,
                ),
                if (customerAddress.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  IconLine(AppIcons.location, customerAddress),
                ],
              ],
            ),
          ),
        ],
        if (to != null) ...[
          SectionTitle(l10n.deliverTo),
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (to.isRecipient) ...[
                  PersonCard(
                    name: to.name,
                    label: l10n.recipientLabel,
                    phone: to.phone,
                    icon: AppIcons.gift,
                  ),
                  Divider(height: 28, color: c.line),
                ],
                PlaceCard(
                  address: to.line,
                  lat: to.lat,
                  lng: to.lng,
                  detail: [
                    if (d?.zone != null)
                      l10n.zoneLabel(zoneWords(context, d!.zone!)),
                    if (to.lat != null && to.lng != null) l10n.pinnedOnMap,
                  ].join(' · ').emptyToNull,
                ),
              ],
            ),
          ),
        ],
        if (when != null) ...[
          SectionTitle(l10n.whenTitle),
          Panel(child: IconText(AppIcons.when, when)),
        ],
        // 132 Where its delivery is, and every change of it.
        if (order.stage != null || order.nextStages.isNotEmpty) ...[
          SectionTitle(
            l10n.stageTitle,
            trailing: order.stage == null
                ? null
                : StatusChip(
                    stageLabel(context, order.stage!.stage, order.stage!.label),
                    tone: stageTone(order.stage!.stage),
                  ),
          ),
          Panel(child: StageTimeline(order: order)),
        ],
        // 132 The money back after a failed delivery cancelled it.
        if (order.refundDue != null) ...[
          SectionTitle(
            l10n.refund,
            trailing: order.needsRefund
                ? StatusChip(l10n.needsRefund, tone: Tone.warn)
                : null,
          ),
          Panel(
            child: RefundDuePanel(order: order, onChanged: changed),
          ),
        ],
        if (d != null && d.hasCard) ...[
          SectionTitle(l10n.giftCardTitle),
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (d.giftMessage != null)
                  Text(
                    '“${isolate(d.giftMessage!)}”',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontStyle: FontStyle.italic,
                      height: 1.4,
                    ),
                  ),
                const SizedBox(height: 10),
                // 175 Signed with no sender's or customer's name: said so, never "Signed by " alone.
                IconText(
                  d.anonymous ? AppIcons.hidden : AppIcons.giftCard,
                  d.anonymous
                      ? l10n.sentAnonymously
                      : signerOf(d.signedBy, order.buyerName) == null
                      ? l10n.signedNoName
                      : l10n.signedBy(
                          isolate(signerOf(d.signedBy, order.buyerName)!),
                        ),
                  color: d.anonymous ? c.warning : c.ink2,
                ),
              ],
            ),
          ),
        ],
        SectionTitle(l10n.items),
        Panel(child: OrderLines(order: order)),
        SectionTitle(l10n.paymentLabel),
        Panel(child: OrderPayment(order: order)),
        if (to?.notes != null) ...[
          SectionTitle(l10n.notes),
          Panel(child: IconText(AppIcons.note, to!.notes!)),
        ],
        // 207 Shipped with any carrier from the phone, as on the dashboard.
        if (order.shipment == null &&
            order.shippable &&
            order.status == 'processing') ...[
          SectionTitle(l10n.shippingTitle),
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(l10n.shipWithTrackingHelp),
                const SizedBox(height: 10),
                FilledButton.icon(
                  key: const ValueKey('ship-order'),
                  icon: const Icon(AppIcons.shipping),
                  label: Text(l10n.shipWithTracking),
                  onPressed: () => _ship(context, ref, order),
                ),
              ],
            ),
          ),
        ],
        if (order.shipment != null) ...[
          SectionTitle(l10n.shippedTitle),
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                IconText(
                  AppIcons.shipping,
                  [
                    order.shipment!.carrier,
                    order.shipment!.trackingNumber,
                    if (order.shipment!.shippedAt != null)
                      context.date(order.shipment!.shippedAt!),
                  ].whereType<String>().map(isolate).join(' · '),
                ),
                if (order.shipment!.trackingUrl != null) ...[
                  const SizedBox(height: 10),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: ActionPill(
                      icon: AppIcons.web,
                      label: l10n.trackShipment,
                      onPressed: () =>
                          openLink(context, ref, order.shipment!.trackingUrl),
                    ),
                  ),
                ],
                if (order.shippable && order.status == 'processing') ...[
                  const SizedBox(height: 6),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: TextButton(
                      key: const ValueKey('ship-change'),
                      onPressed: () => _ship(context, ref, order),
                      child: Text(l10n.changeTracking),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
        if (order.refunds.isNotEmpty) ...[
          SectionTitle(l10n.refunds),
          Panel(
            child: Column(
              children: [
                for (final r in order.refunds)
                  AmountRow(
                    '${context.date(r.createdAt)} · ${r.method == 'manual' ? l10n.refundManual : l10n.refundByProvider}',
                    r.amount.formatted,
                  ),
              ],
            ),
          ),
        ],
        if (refund != null && order.refundDue == null) ...[
          SectionTitle(l10n.refund),
          Panel(
            child: refund.refundable
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(l10n.refundLeft(refund.left.formatted)),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        icon: const Icon(AppIcons.refund),
                        label: Text(l10n.refundButton),
                        onPressed: () async {
                          final updated = await showModalBottomSheet<Order>(
                            context: context,
                            isScrollControlled: true,
                            builder: (_) =>
                                RefundSheet(order: order, options: refund),
                          );
                          if (updated != null) changed(updated);
                        },
                      ),
                    ],
                  )
                : Text(
                    refund.why ?? l10n.notRefundable,
                    style: theme.textTheme.bodyMedium?.copyWith(color: c.ink2),
                  ),
          ),
        ],
      ],
    );
  }
}

/// 132 A part of the delivery fee in the person's language: the server
/// words the shop's rules in English ("Base fee", "Minimum fee") and the
/// rest are the shop's own (a city, "4.2 km", "2.5 kg").
String breakdownLabel(BuildContext context, String label, String? rule) {
  final l10n = context.l10n;
  return switch ((rule, label)) {
    ('free', _) => l10n.feeFree,
    ('minimum', _) => l10n.feeMinimum,
    ('flat', _) || ('other_city', 'Delivery') => l10n.deliveryFeeLabel,
    ('distance', 'Base fee') => l10n.feeBase,
    ('distance', _) when _km.hasMatch(label) => l10n.feeDistance(
      _km.firstMatch(label)!.group(1)!,
    ),
    ('weight', _) when _kg.hasMatch(label) => _weight(l10n, label),
    _ => isolate(label),
  };
}

/// 132 The delivery zone as the API writes it ("Cairo · 4.2 km", "4.2 km"),
/// with the distance in the app's words.
String zoneWords(BuildContext context, String zone) {
  final m = _zoneKm.firstMatch(zone);
  if (m == null) return isolate(zone);
  final km = context.l10n.kmShort(m.group(2)!);
  final city = m.group(1);
  return city == null ? km : '${isolate(city)} · $km';
}

final _zoneKm = RegExp(r'^(?:(.+) · )?([\d.]+) km$');

// The API's English rows for the computed fee: "4.2 km", "2.5 kg" and
// "2.5 kg (1 kg included)".
final _km = RegExp(r'^([\d.]+) km$');
final _kg = RegExp(r'^([\d.]+) kg(?: \(([\d.]+) kg included\))?$');

String _weight(AppLocalizations l10n, String label) {
  final m = _kg.firstMatch(label)!;
  final included = m.group(2);
  return included == null
      ? l10n.feeWeight(m.group(1)!)
      : l10n.feeWeightIncluded(m.group(1)!, included);
}

extension on String {
  String? get emptyToNull => isEmpty ? null : this;
}

/// An icon and a line of text beside it.
class IconText extends StatelessWidget {
  const IconText(this.icon, this.text, {super.key, this.color});

  final IconData icon;
  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Icon(icon, size: 20, color: color ?? context.yb.ink2),
      const SizedBox(width: 10),
      Expanded(
        child: Text(text, style: TextStyle(fontSize: 15, color: color)),
      ),
    ],
  );
}

/// A label and its amount on one line; [strong] for the total.
class AmountRow extends StatelessWidget {
  const AmountRow(
    this.label,
    this.amount, {
    super.key,
    this.strong = false,
    this.quiet = false,
    this.indent = false,
  });

  final String label;
  final String amount;
  final bool strong;
  final bool quiet;
  final bool indent;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    final style = TextStyle(
      fontSize: strong ? 16 : (quiet ? 13 : 14),
      fontWeight: strong ? FontWeight.w700 : FontWeight.w400,
      color: quiet ? c.ink2 : null,
    );
    return Padding(
      padding: EdgeInsetsDirectional.only(
        top: 4,
        bottom: 4,
        start: indent ? 16 : 0,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(label, style: style)),
          const SizedBox(width: 12),
          // An amount reads left to right in Arabic too ("−E£209.50").
          Text(amount, style: style, textDirection: TextDirection.ltr),
        ],
      ),
    );
  }
}

/// 132 The order's lines: each item with its options, and its add-ons
/// indented under it ("Add-on"); a flash sale's price marked.
class OrderLines extends StatelessWidget {
  const OrderLines({super.key, required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final lines = order.lines;
    final placed = <OrderLine>{};
    final rows = <Widget>[];
    // 162 Each bouquet the customer built, as one: its stems, its flowers,
    // its wrap and its card, the card's words.
    final bouquets = <String, List<OrderLine>>{};
    for (final l in lines) {
      if (l.bouquet case final b?) (bouquets[b.id] ??= []).add(l);
    }
    for (final group in bouquets.values) {
      rows.add(_BouquetRows(lines: group));
      placed.addAll(group);
    }
    // 175 Each add-on under the line it was chosen with.
    final owners = addonOwners(lines);
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].addonOf != null || placed.contains(lines[i])) continue;
      rows.add(_LineRow(line: lines[i]));
      placed.add(lines[i]);
      for (var j = 0; j < lines.length; j++) {
        if (owners[j] == i && !placed.contains(lines[j])) {
          rows.add(_LineRow(line: lines[j], addon: true));
          placed.add(lines[j]);
        }
      }
    }
    // An add-on whose item isn't on the order (older orders): still listed.
    for (final rest in lines.where((l) => !placed.contains(l))) {
      rows.add(_LineRow(line: rest, addon: rest.addonOf != null));
    }
    return Column(children: rows);
  }
}

/// 175 Which line each add-on goes under (its index; null: its item isn't
/// on the order). The order keeps an add-on after the item it was chosen
/// with, so with two sizes of one bouquet each add-on goes under the size
/// before it, not always under the first one; an add-on before any of its
/// product's lines goes under the first.
List<int?> addonOwners(List<OrderLine> lines) {
  return [
    for (var j = 0; j < lines.length; j++)
      if (lines[j].addonOf == null) null else _ownerOf(lines, j),
  ];
}

int? _ownerOf(List<OrderLine> lines, int j) {
  final product = lines[j].addonOf;
  bool mine(int i) => lines[i].addonOf == null && lines[i].productId == product;
  for (var i = j - 1; i >= 0; i--) {
    if (mine(i)) return i;
  }
  for (var i = 0; i < lines.length; i++) {
    if (mine(i)) return i;
  }
  return null;
}

/// 162 A bouquet the customer built: a heading with its stems, then its
/// flowers, its wrap and its card indented under it, and the card's words.
class _BouquetRows extends StatelessWidget {
  const _BouquetRows({required this.lines});

  final List<OrderLine> lines;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final theme = Theme.of(context);
    const order = {'flower': 0, 'wrap': 1, 'card': 2};
    final sorted = [...lines]
      ..sort(
        (a, b) => (order[a.bouquet!.part] ?? 3) - (order[b.bouquet!.part] ?? 3),
      );
    final stems = lines
        .where((l) => l.bouquet!.part == 'flower')
        .fold(0, (sum, l) => sum + l.quantity);
    final message = lines
        .map((l) => l.bouquet!.message)
        .whereType<String>()
        .firstOrNull;
    return Padding(
      key: const ValueKey('order-bouquet'),
      padding: const EdgeInsets.only(top: 6, bottom: 2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(AppIcons.bouquet, size: 18, color: c.accentText),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  l10n.bouquetGroup(stems),
                  style: theme.textTheme.titleSmall,
                ),
              ),
            ],
          ),
          for (final l in sorted)
            _LineRow(
              line: l,
              addon: false,
              indent: true,
              part: switch (l.bouquet!.part) {
                'wrap' => l10n.bouquetWrap,
                'card' => l10n.bouquetCard,
                _ => null,
              },
            ),
          if (message != null)
            Padding(
              padding: const EdgeInsetsDirectional.only(start: 22, bottom: 6),
              child: Text(
                l10n.bouquetMessage(message),
                style: TextStyle(
                  fontSize: 13,
                  fontStyle: FontStyle.italic,
                  color: c.ink2,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _LineRow extends StatelessWidget {
  const _LineRow({
    required this.line,
    this.addon = false,
    this.indent = false,
    this.part,
  });

  /// 162 Under a bouquet's heading; [part], a wrap's or card's word.
  final bool indent;
  final String? part;

  final OrderLine line;
  final bool addon;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final theme = Theme.of(context);
    final sale = line.flashSale;
    final details = [
      if (line.variant != null && !line.name.contains(line.variant!))
        line.variant!,
      ...line.options,
    ];
    return Padding(
      padding: EdgeInsetsDirectional.only(
        top: 6,
        bottom: 6,
        start: addon || indent ? 22 : 0,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (addon) ...[
            DirectionalIcon(AppIcons.addon, size: 18, color: c.ink2),
            const SizedBox(width: 6),
          ],
          Text(
            isolate('${context.number(line.quantity)} ×'),
            style: theme.textTheme.titleSmall,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(line.name, style: theme.textTheme.bodyLarge),
                if (details.isNotEmpty)
                  Text(details.join(', '), style: theme.textTheme.bodySmall),
                if (addon || part != null)
                  Text(
                    part ?? l10n.addonLine,
                    style: TextStyle(fontSize: 12, color: c.ink2),
                  ),
                if (sale != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(AppIcons.flashSale, size: 16, color: c.accentText),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            [
                              sale.title == null
                                  ? l10n.flashSaleTag
                                  : isolate(sale.title!),
                              if (sale.percent != null)
                                isolate('−${context.number(sale.percent!)}%'),
                            ].join(' · '),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: c.accentText,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(
            (line.total ?? line.unit).formatted,
            textDirection: TextDirection.ltr,
          ),
        ],
      ),
    );
  }
}

/// 132 What the total is made of: the products, the coupon and points
/// taken off, the delivery fee with what made it up (the zone, the
/// distance, the time slot), the tax; the total and what was refunded.
class OrderPayment extends StatelessWidget {
  const OrderPayment({super.key, required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final a = order.amounts;
    final d = order.delivery;
    String minus(Money m) => '−${m.formatted.replaceFirst('-', '')}';
    final parts = <Widget>[
      if (a != null) ...[
        AmountRow(l10n.subtotalLabel, a.subtotal.formatted),
        if (a.discount != null)
          AmountRow(
            a.couponCode == null
                ? l10n.discountLabel
                : l10n.couponLabel(isolate(a.couponCode!)),
            minus(a.discount!),
          ),
        if (a.points != null)
          AmountRow(
            l10n.pointsLabel(context.number(a.pointsUsed ?? 0)),
            minus(a.points!),
          ),
        if (a.shipping != null) ...[
          AmountRow(l10n.deliveryFeeLabel, a.shipping!.formatted),
          if (d != null) ...[
            for (final b in d.breakdown)
              AmountRow(
                breakdownLabel(context, b.label, b.rule),
                b.amount.formatted,
                quiet: true,
                indent: true,
              ),
            if (d.fee != null)
              AmountRow(
                l10n.slotFeeLabel,
                d.fee!.formatted,
                quiet: true,
                indent: true,
              ),
          ],
        ],
        if (a.tax != null)
          AmountRow(
            a.taxIncluded
                ? l10n.taxIncludedLabel(isolate(a.taxLabel ?? ''))
                : (a.taxLabel ?? ''),
            a.tax!.formatted,
            quiet: a.taxIncluded,
          ),
      ],
    ];
    return Column(
      children: [
        ...parts,
        if (parts.isNotEmpty) const Divider(height: 20),
        AmountRow(l10n.total, order.total.formatted, strong: true),
        if (order.refunded != null)
          AmountRow(l10n.refunded, order.refunded!.formatted),
      ],
    );
  }
}

/// Refund all of an order or part, through the provider or recording one
/// made in its panel (roadmap 47's rules, from `OrderDetail.refund`).
class RefundSheet extends ConsumerStatefulWidget {
  const RefundSheet({super.key, required this.order, required this.options});

  final Order order;
  final RefundOptions options;

  @override
  ConsumerState<RefundSheet> createState() => _RefundSheetState();
}

class _RefundSheetState extends ConsumerState<RefundSheet> {
  late final _amount = TextEditingController(text: widget.options.left.major);
  final _note = TextEditingController();
  final _reference = TextEditingController();
  late String _reason = widget.options.reasons.isEmpty
      ? 'buyer_request'
      : widget.options.reasons.first.id;
  late String _method = widget.options.byApi ? 'api' : 'manual';
  final _take = <String, Set<int>>{
    'tickets': {},
    'courses': {},
    'memberships': {},
  };
  bool _busy = false;
  Map<String, String> _errors = const {};

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    _reference.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _errors = const {};
    });
    try {
      final result = await ref
          .read(apiProvider)
          .refundOrder(
            ref.read(appIdProvider),
            widget.order.id,
            RefundRequest(
              // 175 Typed on an Arabic keyboard too.
              amount: typedAmount(_amount.text),
              reason: _reason,
              note: _note.text.trim(),
              method: _method,
              reference: _method == 'manual' ? _reference.text.trim() : null,
              tickets: _take['tickets']!.toList(),
              courses: _take['courses']!.toList(),
              memberships: _take['memberships']!.toList(),
            ),
          );
      if (!mounted) return;
      showMessage(context, result.message);
      Navigator.pop(context, result.order);
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
    final o = widget.options;
    final takeable = {
      'tickets': o.tickets,
      'courses': o.courses,
      'memberships': o.memberships,
    };
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.refundTitle(widget.order.label),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 4),
            Text(
              l10n.refundLeft(o.left.formatted),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _amount,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: InputDecoration(
                labelText: l10n.refundAmount(o.left.currency),
                errorText: _errors['amount'],
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _reason,
              decoration: InputDecoration(
                labelText: l10n.refundReason,
                errorText: _errors['reason'],
              ),
              items: [
                for (final r in o.reasons)
                  DropdownMenuItem(value: r.id, child: Text(r.label)),
              ],
              onChanged: (v) => setState(() => _reason = v ?? _reason),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _note,
              maxLength: 300,
              decoration: InputDecoration(
                labelText: l10n.refundNote,
                errorText: _errors['note'],
              ),
            ),
            if (o.byApi && o.manual) ...[
              Text(
                l10n.refundHow,
                style: Theme.of(context).textTheme.titleSmall,
              ),
              RadioGroup<String>(
                groupValue: _method,
                onChanged: (v) => setState(() => _method = v ?? _method),
                child: Column(
                  children: [
                    RadioListTile(
                      value: 'api',
                      title: Text(l10n.refundByProvider),
                    ),
                    RadioListTile(
                      value: 'manual',
                      title: Text(l10n.refundManual),
                    ),
                  ],
                ),
              ),
            ],
            if (_method == 'manual')
              TextField(
                controller: _reference,
                maxLength: 191,
                decoration: InputDecoration(
                  labelText: l10n.refundReference,
                  errorText: _errors['reference'],
                ),
              ),
            for (final e in takeable.entries)
              if (e.value.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  l10n.refundTakeBack,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                for (final item in e.value)
                  CheckboxListTile(
                    value: _take[e.key]!.contains(item.id),
                    title: Text(item.label),
                    onChanged: (on) => setState(() {
                      on == true
                          ? _take[e.key]!.add(item.id)
                          : _take[e.key]!.remove(item.id);
                    }),
                  ),
              ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: Text(
                _method == 'manual' ? l10n.refundRecord : l10n.refundButton,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 175 Who signs the card: the sender's name, else the customer's; null
/// when neither has one (blank names don't count).
String? signerOf(String? signedBy, String? buyer) {
  for (final name in [signedBy, buyer]) {
    final trimmed = name?.trim() ?? '';
    if (trimmed.isNotEmpty) return trimmed;
  }
  return null;
}

/// 207 The ship sheet; the order shows what changed.
Future<void> _ship(BuildContext context, WidgetRef ref, Order order) async {
  final updated = await showModalBottomSheet<Order>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => ShipSheet(order: order),
  );
  if (updated != null) ref.invalidate(orderProvider(order.id));
}
