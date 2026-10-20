import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import 'order_actions.dart';

final orderProvider = FutureProvider.autoDispose.family<Order, int>(
  (ref, id) => ref.watch(apiProvider).order(ref.watch(appIdProvider), id),
);

/// 59 One order: the customer, the address, the items, the payment and its
/// refunds; moving it on, and refunding it as the API allows.
class OrderScreen extends ConsumerWidget {
  const OrderScreen({super.key, required this.orderId});

  final int orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final order = ref.watch(orderProvider(orderId));
    return Scaffold(
      appBar: AppBar(title: Text(order.value?.label ?? l10n.order)),
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

class _OrderBody extends ConsumerWidget {
  const _OrderBody({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final c = order.customer;
    final refund = order.refund;
    void changed(Order _) => ref.invalidate(orderProvider(order.id));

    Widget row(String label, String value) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: theme.textTheme.bodyMedium)),
          Text(value, style: theme.textTheme.titleSmall),
        ],
      ),
    );

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  StatusChip(
                    orderStatusLabel(context, order),
                    tone: StatusChip.toneOf(orderTone(order)),
                  ),
                  if (order.kitchen != null) ...[
                    const SizedBox(width: 8),
                    StatusChip(
                      order.kitchen!.type == 'delivery'
                          ? l10n.delivery
                          : l10n.pickup,
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 10),
              Text(
                l10n.paidAt(context.dateTime(order.paidAt ?? order.createdAt)),
                style: theme.textTheme.bodySmall,
              ),
              if (order.nextStatuses.isNotEmpty) ...[
                const SizedBox(height: 14),
                OrderActions(order: order, onChanged: changed),
              ],
            ],
          ),
        ),
        if (c != null) ...[
          SectionTitle(l10n.customer),
          Panel(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: [
                if (c.name != null)
                  ListTile(
                    leading: const Icon(AppIcons.person),
                    title: Text(c.name!),
                  ),
                if (c.phone != null)
                  ListTile(
                    leading: const Icon(AppIcons.phone),
                    title: Text(c.phone!, textDirection: TextDirection.ltr),
                    onTap: () => openLink(
                      context,
                      ref,
                      'tel:${c.phone!.replaceAll(' ', '')}',
                    ),
                  ),
                if (c.email != null)
                  ListTile(
                    leading: const Icon(AppIcons.email),
                    title: Text(c.email!),
                    onTap: () => openLink(context, ref, 'mailto:${c.email}'),
                  ),
                if (c.address != null || c.city != null)
                  ListTile(
                    leading: const Icon(AppIcons.location),
                    title: Text(
                      [c.address, c.city].whereType<String>().join(', '),
                    ),
                  ),
              ],
            ),
          ),
        ],
        SectionTitle(l10n.items),
        Panel(
          child: Column(
            children: [
              for (final line in order.lines)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isolate('${line.quantity} ×'),
                        style: theme.textTheme.titleSmall,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(line.name, style: theme.textTheme.bodyLarge),
                            if (line.options.isNotEmpty)
                              Text(
                                line.options.join(', '),
                                style: theme.textTheme.bodySmall,
                              ),
                          ],
                        ),
                      ),
                      Text(isolate(line.unit.formatted)),
                    ],
                  ),
                ),
              const Divider(height: 20),
              row(l10n.total, order.total.formatted),
              if (order.refunded != null)
                row(l10n.refunded, order.refunded!.formatted),
            ],
          ),
        ),
        if (order.refunds.isNotEmpty) ...[
          SectionTitle(l10n.refunds),
          Panel(
            child: Column(
              children: [
                for (final r in order.refunds)
                  row(
                    '${context.date(r.createdAt)} · ${r.method == 'manual' ? l10n.refundManual : l10n.refundByProvider}',
                    r.amount.formatted,
                  ),
              ],
            ),
          ),
        ],
        if (refund != null) ...[
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
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: context.yb.ink2,
                    ),
                  ),
          ),
        ],
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
              amount: _amount.text.trim().replaceAll(',', '.'),
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
