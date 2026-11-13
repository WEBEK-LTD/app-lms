import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../food/food_sheets.dart';
import '../studio/studio_widgets.dart';
import 'market_screen.dart';

final complaintProvider = FutureProvider.autoDispose
    .family<ComplaintDetail, String>(
      (ref, id) =>
          ref.watch(apiProvider).complaint(ref.watch(appIdProvider), id),
    );

final marketOrderProvider = FutureProvider.autoDispose
    .family<MarketOrderDetail, String>(
      (ref, id) =>
          ref.watch(apiProvider).marketOrder(ref.watch(appIdProvider), id),
    );

/// Minor units from what the owner typed ("185" or "185.50").
int? minorUnits(String text) {
  final value = double.tryParse(text.trim().replaceAll(',', '.'));
  if (value == null || value <= 0) return null;
  return (value * 100).round();
}

/// The list's "Refund ₺185.00": the complaint's refund decision with the
/// amount suggested, after asking.
Future<ComplaintDetail?> refundSuggested(
  BuildContext context,
  WidgetRef ref,
  Complaint complaint,
) async {
  final l10n = context.l10n;
  final amount = complaint.refundSuggested;
  if (amount == null) return null;
  final ok = await confirm(
    context,
    title: l10n.refundConfirmTitle(isolate(amount.formatted)),
    text: l10n.refundConfirmText,
    action: l10n.refundOf(isolate(amount.formatted)),
  );
  if (!ok || !context.mounted) return null;
  final api = ref.read(apiProvider);
  final appId = ref.read(appIdProvider);
  try {
    final detail = await api.complaint(appId, complaint.id);
    // The whole of what is left is `refund` (its amount fixed); less is
    // `partial_refund` with the amount.
    ComplaintDecision? option(String id) =>
        detail.decisions.where((d) => d.id == id).firstOrNull;
    final full = option('refund');
    final part = option('partial_refund');
    final whole = full != null && full.max?.amountCents == amount.amountCents;
    final decision = whole ? full : (part ?? full);
    if (decision == null) {
      if (context.mounted) showMessage(context, l10n.errorGeneric);
      return null;
    }
    final after = await api.decideComplaint(
      appId,
      complaint.id,
      decision: decision.id,
      amountCents: decision.needsAmount ? amount.amountCents : null,
      to: decision.to.firstOrNull,
    );
    if (context.mounted) {
      showMessage(context, l10n.decidedAs(after.complaint.statusLabel));
    }
    return after;
  } on Object catch (e) {
    if (context.mounted) showError(context, e);
    return null;
  }
}

/// 125 A complaint: the order, what the customer, the vendor and support
/// wrote, a reply, and the decisions support may make.
class ComplaintScreen extends ConsumerStatefulWidget {
  const ComplaintScreen({super.key, required this.complaintId});

  final String complaintId;

  @override
  ConsumerState<ComplaintScreen> createState() => _ComplaintScreenState();
}

class _ComplaintScreenState extends ConsumerState<ComplaintScreen> {
  final _reply = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _reply.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _reply.text.trim();
    if (text.isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiProvider)
          .replyComplaint(ref.read(appIdProvider), widget.complaintId, text);
      if (!mounted) return;
      _reply.clear();
      showMessage(context, context.l10n.replySent);
      ref.invalidate(complaintProvider(widget.complaintId));
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _decide(ComplaintDetail detail, ComplaintDecision d) async {
    final answer = await showFootSheet<(int?, String, String?)>(
      context,
      (sheet) => _DecisionForm(detail: detail, decision: d),
    );
    if (answer == null || !mounted) return;
    setState(() => _busy = true);
    try {
      final after = await ref
          .read(apiProvider)
          .decideComplaint(
            ref.read(appIdProvider),
            widget.complaintId,
            decision: d.id,
            amountCents: answer.$1,
            note: answer.$2,
            to: answer.$3,
          );
      if (!mounted) return;
      showMessage(context, context.l10n.decidedAs(after.complaint.statusLabel));
      ref.invalidate(complaintProvider(widget.complaintId));
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final value = ref.watch(complaintProvider(widget.complaintId));
    final detail = value.value;
    final open = detail?.complaint.waitingFor != null;
    return Scaffold(
      appBar: AppBar(title: Text(detail?.complaint.orderReference ?? '')),
      bottomNavigationBar: detail == null || !open
          ? null
          : FootPanel(
              gap: 10,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _reply,
                    minLines: 1,
                    maxLines: 4,
                    maxLength: 2000,
                    decoration: InputDecoration(
                      hintText: l10n.replyToCustomer,
                      counterText: '',
                      suffixIcon: IconButton(
                        tooltip: l10n.send,
                        icon: const DirectionalIcon(AppIcons.send),
                        onPressed: _busy ? null : _send,
                      ),
                    ),
                  ),
                  if (detail.decisions.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final d in detail.decisions)
                          SmallButton(
                            label: d.label,
                            filled: d.needsAmount,
                            onPressed: _busy ? null : () => _decide(detail, d),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
      body: AsyncBody(
        value: value,
        onRetry: () => ref.invalidate(complaintProvider(widget.complaintId)),
        builder: (d) {
          final k = d.complaint;
          final (label, tone) = complaintTag(context, k);
          return RefreshIndicator(
            onRefresh: () =>
                ref.refresh(complaintProvider(widget.complaintId).future),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              children: [
                Box(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Tag(label, tone: tone),
                      const SizedBox(height: 8),
                      Text(
                        k.subject,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        [
                          k.orderReference,
                          k.vendor.name,
                          k.customerName,
                          k.orderTotal.formatted,
                        ].map(isolate).join(' · '),
                        style: TextStyle(fontSize: 13, color: c.ink2),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                for (final m in d.messages)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _Message(message: m),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.message});

  final ComplaintMessage message;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final m = message;
    final support = m.from == 'support';
    final who = switch (m.from) {
      'customer' => l10n.fromCustomer,
      'vendor' => l10n.fromVendor,
      _ => l10n.fromSupport,
    };
    return Align(
      alignment: support
          ? AlignmentDirectional.centerEnd
          : AlignmentDirectional.centerStart,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.82,
        ),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: support ? c.ink : c.surface,
            borderRadius: BorderRadius.circular(16),
            border: support ? null : Border.all(color: c.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                support
                    ? '${isolate(m.name)} · ${context.time(m.at)}'
                    : '${isolate(m.name)} · $who · ${context.time(m.at)}',
                style: TextStyle(
                  fontSize: 12,
                  color: support ? c.onInk : c.ink2,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                m.text,
                style: TextStyle(
                  fontSize: 14,
                  color: support ? c.onInk : c.ink,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DecisionForm extends StatefulWidget {
  const _DecisionForm({required this.detail, required this.decision});

  final ComplaintDetail detail;
  final ComplaintDecision decision;

  @override
  State<_DecisionForm> createState() => _DecisionFormState();
}

class _DecisionFormState extends State<_DecisionForm> {
  late final _amount = TextEditingController(
    text: widget.detail.complaint.refundSuggested?.major ?? '',
  );
  final _note = TextEditingController();
  late String? _to = widget.decision.to.firstOrNull;
  String? _error;
  String? _noteError;

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  void _done() {
    final l10n = context.l10n;
    final d = widget.decision;
    int? cents;
    if (d.needsAmount) {
      cents = minorUnits(_amount.text);
      final max = d.max;
      if (cents == null || (max != null && cents > max.amountCents)) {
        setState(
          () => _error = max == null
              ? l10n.amountIn(widget.detail.complaint.orderTotal.currency)
              : l10n.enterAmountUpTo(isolate(max.formatted)),
        );
        return;
      }
    }
    // No refund: the customer reads why.
    if (d.needsNote && _note.text.trim().isEmpty) {
      setState(() => _noteError = l10n.writeWhy);
      return;
    }
    Navigator.pop(context, (cents, _note.text, _to));
  }

  String _toLabel(String to) {
    final l10n = context.l10n;
    return switch (to) {
      'payment' => l10n.toPayment,
      'wallet' => l10n.toWallet,
      'coupon' => l10n.toCoupon,
      _ => to,
    };
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final d = widget.decision;
    final currency = widget.detail.complaint.orderTotal.currency;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          d.label,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        if (d.amount == 'fixed' && d.max != null) ...[
          Text(
            d.max!.formatted,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
        ],
        if (d.needsAmount) ...[
          TextField(
            controller: _amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
            ],
            decoration: InputDecoration(
              labelText: l10n.amountIn(currency),
              helperText: d.max == null
                  ? null
                  : l10n.upToAmount(isolate(d.max!.formatted)),
              errorText: _error,
            ),
          ),
          const SizedBox(height: 12),
        ],
        if (d.to.length > 1) ...[
          Text(l10n.moneyGoesTo, style: TextStyle(fontSize: 13, color: c.ink2)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final t in d.to)
                ChoiceChip(
                  label: Text(_toLabel(t)),
                  selected: t == _to,
                  onSelected: (_) => setState(() => _to = t),
                ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        TextField(
          controller: _note,
          maxLength: 500,
          decoration: InputDecoration(
            labelText: d.needsNote ? l10n.noteToCustomer : l10n.noteOptional,
            errorText: _noteError,
          ),
        ),
        const SizedBox(height: 8),
        BigButton(label: d.label, onPressed: _done),
      ],
    );
  }
}

/// 125 A marketplace order, read only: the vendor moves it.
class MarketOrderScreen extends ConsumerWidget {
  const MarketOrderScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final value = ref.watch(marketOrderProvider(orderId));
    final o = value.value?.order;
    return Scaffold(
      appBar: AppBar(
        title: Text(o?.reference ?? ''),
        actions: [
          if (o != null)
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 16),
              child: Center(
                child: Tag(
                  o.statusLabel,
                  tone: marketTone(o.status),
                  big: true,
                ),
              ),
            ),
        ],
      ),
      body: AsyncBody(
        value: value,
        onRetry: () => ref.invalidate(marketOrderProvider(orderId)),
        builder: (d) {
          final order = d.order;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
            children: [
              Box(
                radius: 18,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.l10n.foodRoute(
                        isolate(order.vendor.name),
                        isolate(order.customerName),
                      ),
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      [
                        order.fulfilment == 'pickup'
                            ? l10n.fulfilmentPickup
                            : l10n.fulfilmentDelivery,
                        if (order.deliveryBy != null)
                          l10n.deliveryBy(isolate(order.deliveryBy!)),
                        context.dateTime(order.placedAt),
                      ].join(' · '),
                      style: TextStyle(fontSize: 13, color: c.ink2),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Box(
                radius: 18,
                child: Column(
                  children: [
                    for (final l in d.lines)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${context.number(l.quantity)} × ${l.name}',
                                style: const TextStyle(fontSize: 14),
                              ),
                            ),
                            Text(
                              l.total.formatted,
                              style: const TextStyle(fontSize: 14),
                            ),
                          ],
                        ),
                      ),
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
                          order.total.formatted,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (d.timeline.isNotEmpty) ...[
                SectionTitle(l10n.historyTitle),
                TimelineList(entries: d.timeline),
              ],
            ],
          );
        },
      ),
    );
  }
}
