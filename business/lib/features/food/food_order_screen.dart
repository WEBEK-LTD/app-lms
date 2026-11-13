import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../studio/studio_widgets.dart';
import 'food_orders_screen.dart';
import 'food_sheets.dart';

final foodOrderProvider = FutureProvider.autoDispose
    .family<FoodOrderDetail, String>(
      (ref, id) =>
          ref.watch(apiProvider).foodOrder(ref.watch(appIdProvider), id),
    );

/// 125 A food order (the FoodOrder board): the restaurant and the customer,
/// the items and the money, and at the foot "Ready in" to accept it.
class FoodOrderScreen extends ConsumerStatefulWidget {
  const FoodOrderScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<FoodOrderScreen> createState() => _FoodOrderScreenState();
}

class _FoodOrderScreenState extends ConsumerState<FoodOrderScreen> {
  bool _busy = false;

  Future<void> _run(
    Future<FoodOrderDetail?> Function(FoodOrderDetail d) action,
    FoodOrderDetail detail,
  ) async {
    setState(() => _busy = true);
    final after = await action(detail);
    if (!mounted) return;
    setState(() => _busy = false);
    if (after != null) {
      ref.invalidate(foodOrderProvider(widget.orderId));
      ref.invalidate(restaurantsProvider);
    }
  }

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(foodOrderProvider(widget.orderId));
    final detail = value.value;
    final o = detail?.order;
    final l10n = context.l10n;
    Widget? foot;
    if (detail != null && o != null) {
      if (o.canAccept) {
        foot = FootPanel(
          child: AcceptPanel(
            choices: detail.prepChoices,
            busy: _busy,
            onAccept: (m) => _run(
              (d) => foodStep(context, ref, d, 'accept', prepMinutes: m),
              detail,
            ),
            onReject: () =>
                _run((d) => rejectFoodOrder(context, ref, d), detail),
          ),
        );
      } else if (o.steps.contains('ready') || o.steps.contains('cancel')) {
        foot = FootPanel(
          child: Row(
            children: [
              if (o.steps.contains('cancel'))
                Expanded(
                  child: BigButton(
                    label: l10n.cancelFoodOrder,
                    danger: true,
                    onPressed: _busy
                        ? null
                        : () => _run(
                            (d) => cancelFoodOrder(context, ref, d),
                            detail,
                          ),
                  ),
                ),
              if (o.steps.length > 1) const SizedBox(width: 10),
              if (o.steps.contains('ready'))
                Expanded(
                  flex: 2,
                  child: BigButton(
                    label: l10n.markReady,
                    busy: _busy,
                    onPressed: () =>
                        _run((d) => foodStep(context, ref, d, 'ready'), detail),
                  ),
                ),
            ],
          ),
        );
      }
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(o?.reference ?? ''),
        actions: [
          if (o != null)
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 16),
              child: Center(
                child: Tag(o.statusLabel, tone: foodTone(o.status), big: true),
              ),
            ),
        ],
      ),
      bottomNavigationBar: foot,
      body: AsyncBody(
        value: value,
        onRetry: () => ref.invalidate(foodOrderProvider(widget.orderId)),
        builder: (d) => RefreshIndicator(
          onRefresh: () =>
              ref.refresh(foodOrderProvider(widget.orderId).future),
          child: _Body(detail: d),
        ),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.detail});

  final FoodOrderDetail detail;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final o = detail.order;
    final customer = detail.customer;
    final address = [
      if (customer.address.isNotEmpty) isolate(customer.address),
      if (customer.note != null) '“${isolate(customer.note!)}”',
    ].join(' · ');
    final placed = context.time(o.placedAt);
    final history = o.status == 'placed'
        ? l10n.placedWaiting(placed)
        : [
            l10n.placedAt(placed),
            if (o.readyAt != null && o.status != 'delivered')
              l10n.readyAt(context.time(o.readyAt!))
            else
              o.statusLabel,
          ].join(' · ');
    const line = TextStyle(fontSize: 14);
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        Box(
          radius: 18,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            children: [
              _Place(
                icon: AppIcons.store,
                title: o.restaurant.name,
                text: detail.restaurantAddress,
              ),
              const SizedBox(height: 10),
              _Place(
                icon: AppIcons.location,
                title: [
                  isolate(
                    customer.name.isEmpty ? o.customerName : customer.name,
                  ),
                  if (o.distanceKm != null) km(context, o.distanceKm!),
                ].join(' · '),
                text: address,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Box(
          radius: 18,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final l in detail.lines) ...[
                Row(
                  children: [
                    Expanded(
                      child: Text.rich(
                        TextSpan(
                          style: line,
                          children: [
                            TextSpan(
                              text: '${context.number(l.quantity)} ×',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            TextSpan(text: ' ${l.name}'),
                          ],
                        ),
                      ),
                    ),
                    Text(l.total.formatted, style: line),
                  ],
                ),
                if (l.options.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      l.options.join(' · '),
                      style: TextStyle(fontSize: 13, color: c.ink2),
                    ),
                  ),
                const SizedBox(height: 8),
              ],
              Divider(color: c.line, height: 5),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      l10n.delivery,
                      style: line.copyWith(color: c.ink2),
                    ),
                  ),
                  Text(
                    detail.deliveryFee.formatted,
                    style: line.copyWith(color: c.ink2),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      l10n.totalLabel,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Text(
                    o.total.formatted,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              if (detail.cashToCollect != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(AppIcons.sales, size: 18, color: c.warning),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        l10n.cashCollect(
                          isolate(detail.cashToCollect!.formatted),
                        ),
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: c.warning,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            children: [
              Icon(AppIcons.history, size: 18, color: c.ink2),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  history,
                  style: TextStyle(fontSize: 13, color: c.ink2),
                ),
              ),
            ],
          ),
        ),
        if (detail.refundDue) ...[
          const SizedBox(height: 12),
          Panel(
            color: c.warningBg,
            child: Text(
              l10n.refundDue,
              style: TextStyle(color: c.warning, fontWeight: FontWeight.w600),
            ),
          ),
        ],
        if (o.courier != null) ...[
          const SizedBox(height: 12),
          Box(
            radius: 18,
            child: Row(
              children: [
                Initials(initialsOf(o.courier!.name)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.courierLabel,
                        style: TextStyle(fontSize: 12, color: c.ink2),
                      ),
                      Text(
                        o.courier!.name,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
        if (detail.timeline.length > 1 && o.status != 'placed') ...[
          SectionTitle(l10n.historyTitle),
          TimelineList(entries: detail.timeline),
        ],
        if (customer.phone != null) ...[
          const SizedBox(height: 16),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: SmallButton(
              label: l10n.callCustomer,
              icon: AppIcons.phone,
              quiet: true,
              onPressed: () => callNumber(context, ref, customer.phone),
            ),
          ),
        ],
      ],
    );
  }
}

class _Place extends StatelessWidget {
  const _Place({required this.icon, required this.title, required this.text});

  final IconData icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Icon(icon, color: context.yb.accentText),
      const SizedBox(width: 12),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
            ),
            if (text.isNotEmpty)
              Text(
                text,
                style: TextStyle(fontSize: 13, color: context.yb.ink2),
              ),
          ],
        ),
      ),
    ],
  );
}
