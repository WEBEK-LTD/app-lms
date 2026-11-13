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
import '../today/today_screen.dart' show todayProvider;
import 'prime_today.dart';
import 'prime_widgets.dart';

/// 125 Smart alerts (the PrimeAlerts board): each alert the app has with
/// its switch and its number or time, and the morning brief. Each person
/// sets their own; kept on the server.
class AlertsScreen extends ConsumerStatefulWidget {
  const AlertsScreen({super.key});

  @override
  ConsumerState<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends ConsumerState<AlertsScreen> {
  PrimeAlerts? _alerts;
  bool _saving = false;

  Future<void> _save(PrimeAlerts next) async {
    final before = _alerts;
    setState(() {
      _alerts = next;
      _saving = true;
    });
    try {
      final saved = await ref
          .read(apiProvider)
          .setPrimeAlerts(ref.read(appIdProvider), next);
      if (!mounted) return;
      setState(() => _alerts = saved);
      ref.invalidate(primeAlertsProvider);
    } on Object catch (e) {
      if (!mounted) return;
      setState(() => _alerts = before);
      showError(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  PrimeAlerts _with(PrimeAlerts all, AlertSetting a) => all.copyWith(
    items: [for (final x in all.items) x.kind == a.kind ? a : x],
  );

  String _currency() =>
      ref.read(todayProvider).value?.sales.firstOrNull?.currency ?? 'TRY';

  String _amount(int cents) {
    final sales = ref.read(todayProvider).value?.sales.firstOrNull;
    final number = context.number(cents / 100);
    if (sales == null) return number;
    // The symbol as the app's own money shows it ("₺18,420.00" → "₺").
    final symbol = RegExp(r'^[^\d\-]+').firstMatch(sales.formatted)?.group(0);
    return symbol == null ? '$number ${sales.currency}' : '$symbol$number';
  }

  static String _hm(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  static TimeOfDay _parse(String? text, TimeOfDay fallback) {
    final parts = text?.split(':');
    if (parts == null || parts.length != 2) return fallback;
    final h = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1]);
    return h == null || m == null ? fallback : TimeOfDay(hour: h, minute: m);
  }

  Future<void> _edit(PrimeAlerts all, AlertSetting a) async {
    final l10n = context.l10n;
    if (a.kind == 'sales_low') {
      final result = await showFootSheet<(int, String)>(
        context,
        (sheet) => _SalesForm(
          currency: _currency(),
          amountCents: a.amountCents ?? 0,
          byTime: _parse(a.byTime, const TimeOfDay(hour: 18, minute: 0)),
        ),
      );
      if (result == null || !mounted) return;
      await _save(
        _with(
          all,
          a.copyWith(on: true, amountCents: result.$1, byTime: result.$2),
        ),
      );
      return;
    }
    final stars = a.kind == 'low_rating';
    final picked = await showFootSheet<int>(
      context,
      (sheet) => _NumberForm(
        label: stars ? l10n.starsField : l10n.minutesField,
        value: (stars ? a.stars : a.minutes) ?? (stars ? 2 : 5),
        min: 1,
        max: stars ? 4 : 240,
      ),
    );
    if (picked == null || !mounted) return;
    await _save(
      _with(
        all,
        stars
            ? a.copyWith(on: true, stars: picked)
            : a.copyWith(on: true, minutes: picked),
      ),
    );
  }

  Future<void> _briefTime(PrimeAlerts all) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _parse(all.briefTime, const TimeOfDay(hour: 8, minute: 30)),
      helpText: context.l10n.chooseTime,
    );
    if (picked == null || !mounted) return;
    await _save(all.copyWith(briefOn: true, briefTime: _hm(picked)));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final value = ref.watch(primeAlertsProvider);
    // The sales currency for "Below ₺8,000".
    ref.watch(todayProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.smartAlerts),
        actions: const [PrimeChip()],
      ),
      body: AsyncBody(
        value: value,
        onRetry: () => ref.invalidate(primeAlertsProvider),
        builder: (loaded) {
          final all = _alerts ?? loaded;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 0, 4, 14),
                child: Text(
                  l10n.alertsIntro,
                  style: TextStyle(fontSize: 14, color: c.ink2),
                ),
              ),
              if (all.items.isNotEmpty)
                Box(
                  radius: 18,
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      for (var i = 0; i < all.items.length; i++)
                        _AlertRow(
                          alert: all.items[i],
                          last: i == all.items.length - 1,
                          when: _when(all.items[i]),
                          onTap: _saving
                              ? null
                              : () => _edit(all, all.items[i]),
                          onChanged: _saving
                              ? null
                              : (on) => _save(
                                  _with(all, all.items[i].copyWith(on: on)),
                                ),
                        ),
                    ],
                  ),
                ),
              const SizedBox(height: 12),
              Material(
                color: c.goldBg,
                borderRadius: BorderRadius.circular(18),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: _saving ? null : () => _briefTime(all),
                  child: Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(14, 4, 14, 4),
                    child: Row(
                      children: [
                        Icon(AppIcons.brief, color: c.gold),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l10n.morningBrief,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                l10n.briefWhen(all.briefTime),
                                style: TextStyle(fontSize: 13, color: c.ink),
                              ),
                            ],
                          ),
                        ),
                        PrimeSwitch(
                          value: all.briefOn,
                          label: l10n.morningBrief,
                          onChanged: _saving
                              ? null
                              : (on) => _save(all.copyWith(briefOn: on)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  l10n.alertsFooter,
                  style: TextStyle(fontSize: 13, color: c.ink2),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  String _when(AlertSetting a) {
    final l10n = context.l10n;
    return switch (a.kind) {
      'sales_low' => l10n.belowBy(
        _amount(a.amountCents ?? 0),
        a.byTime ?? '18:00',
      ),
      'low_rating' => l10n.starsOrLess(a.stars ?? 2),
      _ => l10n.afterMinutes(a.minutes ?? 5),
    };
  }
}

/// An alert's icon and title.
(IconData, String) alertLook(BuildContext context, String kind) {
  final l10n = context.l10n;
  return switch (kind) {
    'order_waiting' => (AppIcons.waiting, l10n.alertOrderWaiting),
    'shipment_unassigned' => (AppIcons.shipments, l10n.alertShipment),
    'sales_low' => (AppIcons.trendDown, l10n.alertSalesLow),
    'message_unanswered' => (AppIcons.inbox, l10n.alertMessage),
    'low_rating' => (AppIcons.lowRating, l10n.alertLowRating),
    'ride_no_driver' => (AppIcons.rides, l10n.alertNoDriver),
    _ => (AppIcons.smartAlerts, kind),
  };
}

class _AlertRow extends StatelessWidget {
  const _AlertRow({
    required this.alert,
    required this.last,
    required this.when,
    required this.onTap,
    required this.onChanged,
  });

  final AlertSetting alert;
  final bool last;
  final String when;
  final VoidCallback? onTap;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    final (icon, title) = alertLook(context, alert.kind);
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsetsDirectional.fromSTEB(14, 3, 14, 3),
        decoration: BoxDecoration(
          border: last ? null : Border(bottom: BorderSide(color: c.line)),
        ),
        child: Row(
          children: [
            Icon(icon, color: c.gold),
            const SizedBox(width: 12),
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
                  Text(when, style: TextStyle(fontSize: 13, color: c.ink2)),
                ],
              ),
            ),
            PrimeSwitch(value: alert.on, label: title, onChanged: onChanged),
          ],
        ),
      ),
    );
  }
}

class _NumberForm extends StatefulWidget {
  const _NumberForm({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
  });

  final String label;
  final int value;
  final int min;
  final int max;

  @override
  State<_NumberForm> createState() => _NumberFormState();
}

class _NumberFormState extends State<_NumberForm> {
  late final _text = TextEditingController(text: '${widget.value}');
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      TextField(
        controller: _text,
        autofocus: true,
        keyboardType: TextInputType.number,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        decoration: InputDecoration(
          labelText: widget.label,
          helperText: '${widget.min}–${widget.max}',
          errorText: _error,
        ),
      ),
      const SizedBox(height: 12),
      BigButton(
        label: context.l10n.save,
        onPressed: () {
          final n = int.tryParse(_text.text);
          if (n == null || n < widget.min || n > widget.max) {
            setState(() => _error = '${widget.min}–${widget.max}');
            return;
          }
          Navigator.pop(context, n);
        },
      ),
    ],
  );
}

class _SalesForm extends StatefulWidget {
  const _SalesForm({
    required this.currency,
    required this.amountCents,
    required this.byTime,
  });

  final String currency;
  final int amountCents;
  final TimeOfDay byTime;

  @override
  State<_SalesForm> createState() => _SalesFormState();
}

class _SalesFormState extends State<_SalesForm> {
  late final _amount = TextEditingController(
    text: '${widget.amountCents ~/ 100}',
  );
  late TimeOfDay _time = widget.byTime;
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final hm = _AlertsScreenState._hm(_time);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _amount,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: InputDecoration(
            labelText: l10n.amountField(widget.currency),
            errorText: _error,
          ),
        ),
        const SizedBox(height: 12),
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(l10n.byTimeField),
          trailing: Text(hm, style: const TextStyle(fontSize: 16)),
          onTap: () async {
            final picked = await showTimePicker(
              context: context,
              initialTime: _time,
              helpText: l10n.chooseTime,
            );
            if (picked != null) setState(() => _time = picked);
          },
        ),
        const SizedBox(height: 8),
        BigButton(
          label: l10n.save,
          onPressed: () {
            final n = int.tryParse(_amount.text);
            if (n == null || n < 0) {
              setState(() => _error = l10n.amountField(widget.currency));
              return;
            }
            Navigator.pop(context, (n * 100, hm));
          },
        ),
      ],
    );
  }
}
