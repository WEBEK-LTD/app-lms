import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/contact.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import 'order_actions.dart';

/// 132 A store order's delivery in stages: where it is (a coloured chip),
/// every change with who, when, why and the team's note, and the next
/// stages' buttons at the foot. Shipped asks for the courier and a
/// tracking link (both optional), Postpone and Delivery failed for why,
/// the new day and time, and what's next; Mark delivered completes the
/// order. The customer is told at shipped, postponed, failed and delivered,
/// never the team's note.

String stageLabel(BuildContext context, String stage, [String? server]) {
  final l10n = context.l10n;
  return switch (stage) {
    'preparing' => l10n.stagePreparing,
    'shipped' => l10n.stageShipped,
    'postponed' => l10n.stagePostponed,
    'failed' => l10n.stageFailed,
    'returned' => l10n.stageReturned,
    'delivered' => l10n.stageDelivered,
    _ => server ?? stage,
  };
}

Tone stageTone(String stage) => switch (stage) {
  'shipped' || 'preparing' => Tone.info,
  'postponed' => Tone.warn,
  'failed' => Tone.bad,
  'delivered' => Tone.good,
  _ => Tone.neutral,
};

IconData stageIcon(String stage) => switch (stage) {
  'preparing' => AppIcons.preparing,
  'shipped' => AppIcons.shipping,
  'postponed' => AppIcons.postpone,
  'failed' => AppIcons.deliveryFailed,
  'returned' => AppIcons.returned,
  _ => AppIcons.delivered,
};

String stageReason(BuildContext context, String code, [String? server]) {
  final l10n = context.l10n;
  return switch (code) {
    'customer_asked' => l10n.reasonCustomerAsked,
    'recipient_away' => l10n.reasonRecipientAway,
    'shop_asked' => l10n.reasonShopAsked,
    'weather' => l10n.reasonWeather,
    'wrong_address' => l10n.reasonWrongAddress,
    'refused' => l10n.reasonRefused,
    'unreachable' => l10n.reasonUnreachable,
    'other' => l10n.reasonOther,
    _ => server ?? code,
  };
}

String nextStepLabel(BuildContext context, String code, [String? server]) {
  final l10n = context.l10n;
  return switch (code) {
    'retry' => l10n.nextRetry,
    'return' => l10n.nextReturn,
    'cancel' => l10n.nextCancel,
    _ => server ?? code,
  };
}

String stageActionLabel(BuildContext context, String stage) {
  final l10n = context.l10n;
  return switch (stage) {
    'preparing' => l10n.doPreparing,
    'shipped' => l10n.doShipped,
    'postponed' => l10n.doPostpone,
    'failed' => l10n.doFailed,
    'returned' => l10n.doReturned,
    'delivered' => l10n.doDelivered,
    _ => stage,
  };
}

const _postponeReasons = [
  'customer_asked',
  'recipient_away',
  'shop_asked',
  'weather',
  'other',
];
const _failedReasons = [
  'recipient_away',
  'wrong_address',
  'refused',
  'unreachable',
  'other',
];

/// The day a stage moved the delivery to, with its time.
String stageDay(BuildContext context, OrderStage s) => [
  if (s.day != null) context.day(s.day!),
  if (s.slotLabel != null) isolate(s.slotLabel!),
].join(' · ');

/// Every change of the order's delivery, newest first.
class StageTimeline extends ConsumerWidget {
  const StageTimeline({super.key, required this.order});

  final Order order;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final theme = Theme.of(context);
    final history = order.stageHistory;
    if (history.isEmpty) {
      return Text(l10n.stageNotStarted, style: theme.textTheme.bodyMedium);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, s) in history.indexed)
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Column(
                  children: [
                    Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: i == 0 ? c.ink : c.muted,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        stageIcon(s.stage),
                        size: 17,
                        color: i == 0 ? c.onInk : c.ink2,
                      ),
                    ),
                    if (i < history.length - 1)
                      Expanded(child: Container(width: 2, color: c.line)),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(
                      bottom: i < history.length - 1 ? 18 : 0,
                    ),
                    child: _Entry(
                      stage: s,
                      onLink: (url) => openLink(context, ref, url),
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

class _Entry extends StatelessWidget {
  const _Entry({required this.stage, required this.onLink});

  final OrderStage stage;
  final void Function(String url) onLink;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final theme = Theme.of(context);
    final s = stage;
    final courier = [
      s.courierName,
      s.courierPhone,
    ].whereType<String>().map(isolate).join(' · ');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          [
            stageLabel(context, s.stage, s.label),
            if (s.reason != null)
              stageReason(context, s.reason!, s.reasonLabel),
          ].join(' · '),
          style: theme.textTheme.titleSmall,
        ),
        const SizedBox(height: 2),
        Text(
          [
            context.dateTime(s.at),
            if (s.by != null) isolate(s.by!),
          ].join(' · '),
          style: theme.textTheme.bodySmall,
        ),
        if (s.day != null) ...[
          const SizedBox(height: 4),
          Text(l10n.stageNewDayLine(stageDay(context, s))),
        ],
        if (s.nextStep != null) ...[
          const SizedBox(height: 4),
          Text(
            l10n.stageNextLine(
              nextStepLabel(context, s.nextStep!, s.nextStepLabel),
            ),
          ),
        ],
        if (courier.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(l10n.stageCourierLine(courier)),
        ],
        if (s.trackingUrl != null) ...[
          const SizedBox(height: 8),
          ActionPill(
            icon: AppIcons.web,
            label: l10n.trackShipment,
            onPressed: () => onLink(s.trackingUrl!),
          ),
        ],
        if (s.note != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: c.muted,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(AppIcons.note, size: 18, color: c.ink2),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    // In the team's own words, whatever their direction.
                    isolate(s.note!),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// The stage the foot offers first: delivered once it is out, else shipped.
String primaryStage(Order order) {
  final next = order.nextStages;
  if (order.stage?.stage == 'shipped' && next.contains('delivered')) {
    return 'delivered';
  }
  if (next.contains('shipped')) return 'shipped';
  return next.first;
}

/// The foot of a store order with stages: the next stage filled, the
/// others outlined, Cancel order last.
class StageActions extends ConsumerWidget {
  const StageActions({super.key, required this.order, required this.onChanged});

  final Order order;
  final void Function(Order updated) onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final primary = primaryStage(order);
    final others = order.nextStages.where((s) => s != primary).toList();
    final cancel = order.nextStatuses.contains('cancelled');

    Future<void> run(String stage) async {
      final updated = await moveStage(context, ref, order, stage);
      if (updated != null) onChanged(updated);
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton.icon(
          style: FilledButton.styleFrom(minimumSize: const Size(64, 56)),
          icon: Icon(stageIcon(primary)),
          onPressed: () => run(primary),
          label: Text(stageActionLabel(context, primary)),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final s in others)
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(48, 44),
                  foregroundColor: s == 'failed' ? context.yb.danger : null,
                ),
                onPressed: () => run(s),
                child: Text(stageActionLabel(context, s)),
              ),
            if (cancel)
              TextButton(
                style: TextButton.styleFrom(minimumSize: const Size(48, 44)),
                onPressed: () async {
                  final updated = await changeOrderStatus(
                    context,
                    ref,
                    order,
                    'cancelled',
                  );
                  if (updated != null) onChanged(updated);
                },
                child: Text(l10n.cancelOrder),
              ),
          ],
        ),
      ],
    );
  }
}

/// Moves the order's delivery to [stage]: a sheet for what it asks, a
/// question before Delivered; null when it didn't change.
Future<Order?> moveStage(
  BuildContext context,
  WidgetRef ref,
  Order order,
  String stage,
) async {
  final l10n = context.l10n;
  switch (stage) {
    case 'shipped' || 'postponed' || 'failed':
      return showModalBottomSheet<Order>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (_) => StageSheet(order: order, stage: stage),
      );
    case 'delivered':
      final ok = await confirm(
        context,
        title: l10n.deliveredConfirmTitle(order.label),
        text: l10n.deliveredConfirmText,
        action: l10n.doDelivered,
      );
      if (!ok || !context.mounted) return null;
  }
  try {
    return await sendStage(context, ref, order, StageRequest(stage));
  } on Object {
    return null;
  }
}

/// Sends the change and says so; null (and the error shown) when refused.
Future<Order?> sendStage(
  BuildContext context,
  WidgetRef ref,
  Order order,
  StageRequest request,
) async {
  final l10n = context.l10n;
  try {
    final updated = await ref
        .read(apiProvider)
        .setOrderStage(ref.read(appIdProvider), order.id, request);
    if (context.mounted) {
      final stage = stageLabel(context, request.stage);
      final told = const [
        'shipped',
        'postponed',
        'failed',
        'delivered',
      ].contains(request.stage);
      showMessage(
        context,
        told
            ? l10n.stageToldCustomer(order.label, stage)
            : l10n.stageSaved(order.label, stage),
      );
    }
    return updated;
  } on Object catch (e) {
    if (context.mounted && (e is! ApiException || e.fieldErrors.isEmpty)) {
      showError(context, e);
    }
    rethrow;
  }
}

/// Shipped (the courier, a tracking link), Postpone (why, the new day and
/// time) or Delivery failed (why, what's next, the day for another try).
class StageSheet extends ConsumerStatefulWidget {
  const StageSheet({super.key, required this.order, required this.stage});

  final Order order;
  final String stage;

  @override
  ConsumerState<StageSheet> createState() => _StageSheetState();
}

class _StageSheetState extends ConsumerState<StageSheet> {
  final _courierName = TextEditingController();
  final _courierPhone = TextEditingController();
  final _tracking = TextEditingController();
  final _note = TextEditingController();
  String? _reason;
  String? _next;
  String? _day;
  String? _slot;
  DeliveryDay? _times;
  bool _busy = false;
  Map<String, String> _errors = const {};

  bool get _needsDay =>
      widget.stage == 'postponed' ||
      (widget.stage == 'failed' && _next == 'retry');

  @override
  void dispose() {
    _courierName.dispose();
    _courierPhone.dispose();
    _tracking.dispose();
    _note.dispose();
    super.dispose();
  }

  String _iso(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _pickDay(String day) async {
    setState(() {
      _day = day;
      _slot = null;
      _times = null;
    });
    try {
      final times = await ref
          .read(apiProvider)
          .stageSlots(ref.read(appIdProvider), date: day);
      if (mounted && _day == day) setState(() => _times = times);
    } on Object catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _otherDay() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(const Duration(days: 60)),
      initialDate: now.add(const Duration(days: 3)),
    );
    if (picked != null) await _pickDay(_iso(picked));
  }

  Future<void> _submit() async {
    final l10n = context.l10n;
    final note = _note.text.trim();
    final errors = <String, String>{
      if (widget.stage != 'shipped' && _reason == null)
        'reason': l10n.stageChooseWhy,
      if (widget.stage == 'failed' && _next == null)
        'next_step': l10n.stageChooseNext,
      if (_reason == 'other' && note.isEmpty) 'note': l10n.stageWriteNote,
      if (_needsDay && _day == null) 'date': l10n.stageChooseDay,
    };
    if (errors.isNotEmpty) {
      setState(() => _errors = errors);
      return;
    }
    setState(() {
      _busy = true;
      _errors = const {};
    });
    String? text(TextEditingController c) =>
        c.text.trim().isEmpty ? null : c.text.trim();
    try {
      final updated = await sendStage(
        context,
        ref,
        widget.order,
        StageRequest(
          widget.stage,
          reason: _reason,
          note: note.isEmpty ? null : note,
          courierName: text(_courierName),
          courierPhone: text(_courierPhone),
          trackingUrl: text(_tracking),
          date: _needsDay ? _day : null,
          slotId: _needsDay ? _slot : null,
          nextStep: _next,
        ),
      );
      if (mounted) Navigator.pop(context, updated);
    } on ApiException catch (e) {
      if (mounted) setState(() => _errors = e.fieldErrors);
    } on Object {
      // Shown already.
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _chips(
    List<String> values,
    String? selected,
    String Function(String) label,
    void Function(String) onSelected,
  ) => Wrap(
    spacing: 8,
    runSpacing: 8,
    children: [
      for (final v in values)
        ChoiceChip(
          label: Text(label(v)),
          selected: v == selected,
          onSelected: (_) => onSelected(v),
        ),
    ],
  );

  Widget _error(String field) {
    final text = _errors[field];
    if (text == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Text(
        text,
        style: TextStyle(color: context.yb.danger, fontSize: 13),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final order = widget.order;
    final stage = widget.stage;
    final now = DateTime.now();
    final days = [for (var i = 0; i < 4; i++) now.add(Duration(days: i))];
    final title = switch (stage) {
      'shipped' => l10n.shipSheetTitle(order.label),
      'postponed' => l10n.postponeSheetTitle(order.label),
      _ => l10n.failedSheetTitle(order.label),
    };
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: theme.textTheme.titleLarge),
            const SizedBox(height: 16),
            if (stage == 'shipped') ...[
              TextField(
                controller: _courierName,
                maxLength: 80,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(labelText: l10n.courierNameField),
              ),
              TextField(
                controller: _courierPhone,
                maxLength: 30,
                keyboardType: TextInputType.phone,
                textDirection: TextDirection.ltr,
                decoration: InputDecoration(
                  labelText: l10n.courierPhoneField,
                  errorText: _errors['courier_phone'],
                ),
              ),
              TextField(
                controller: _tracking,
                maxLength: 500,
                keyboardType: TextInputType.url,
                textDirection: TextDirection.ltr,
                decoration: InputDecoration(
                  labelText: l10n.trackingLinkField,
                  errorText: _errors['tracking_url'],
                ),
              ),
            ] else ...[
              Text(l10n.stageWhy, style: theme.textTheme.titleSmall),
              const SizedBox(height: 8),
              _chips(
                stage == 'postponed' ? _postponeReasons : _failedReasons,
                _reason,
                (v) => stageReason(context, v),
                (v) => setState(() => _reason = v),
              ),
              _error('reason'),
              if (stage == 'failed') ...[
                const SizedBox(height: 16),
                Text(l10n.stageNextStep, style: theme.textTheme.titleSmall),
                const SizedBox(height: 8),
                _chips(
                  const ['retry', 'return', 'cancel'],
                  _next,
                  (v) => nextStepLabel(context, v),
                  (v) => setState(() => _next = v),
                ),
                _error('next_step'),
                if (_next == 'cancel') ...[
                  const SizedBox(height: 8),
                  Text(
                    l10n.stageCancelNoRefund,
                    style: TextStyle(color: context.yb.warning),
                  ),
                ],
              ],
              if (_needsDay) ...[
                const SizedBox(height: 16),
                Text(l10n.stageNewDay, style: theme.textTheme.titleSmall),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final d in days)
                      ChoiceChip(
                        label: Text(context.day(_iso(d))),
                        selected: _day == _iso(d),
                        onSelected: (_) => _pickDay(_iso(d)),
                      ),
                    ActionChip(
                      avatar: const Icon(AppIcons.when, size: 18),
                      label: Text(
                        _day != null && !days.map(_iso).contains(_day)
                            ? context.day(_day!)
                            : l10n.stageAnotherDay,
                      ),
                      onPressed: _otherDay,
                    ),
                  ],
                ),
                _error('date'),
                if (_times != null && _times!.slots.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text(l10n.stageTime, style: theme.textTheme.titleSmall),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final t in _times!.slots)
                        ChoiceChip(
                          label: Text(
                            t.full
                                ? l10n.stageSlotFull(isolate(t.label))
                                : isolate(t.label),
                          ),
                          selected: _slot == t.id,
                          onSelected: t.open
                              ? (_) => setState(() => _slot = t.id)
                              : null,
                        ),
                    ],
                  ),
                  _error('slot_id'),
                ],
              ],
            ],
            const SizedBox(height: 16),
            TextField(
              controller: _note,
              maxLength: 500,
              minLines: 1,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: l10n.stageTeamNote,
                helperText: l10n.stageTeamNoteHint,
                errorText: _errors['note'],
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(64, 52)),
              onPressed: _busy ? null : _submit,
              child: Text(l10n.save),
            ),
          ],
        ),
      ),
    );
  }
}
