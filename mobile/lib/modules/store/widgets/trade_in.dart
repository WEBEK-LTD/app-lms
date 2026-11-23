import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/money.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import 'tech_widgets.dart';

/// 211 Trade-in (`StoreConfig.trade_in`): what an old device is worth, from
/// the shop's own prices (each storage's top price, each grade's share),
/// and a request the shop sees in Store › Trade-in, with how to reach the
/// customer. The final value is the shop's, once it checks the device.

/// The trade-in card: what the shop pays at most, and a button that opens
/// the estimator ([TradeInScreen]).
class TradeInCard extends ConsumerWidget {
  const TradeInCard({super.key, required this.rules, this.accent, this.title});

  final TradeInRules rules;
  final Color? accent;
  final String? title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final tint = accent ?? p.primary;
    final currency = ref.watch(appConfigProvider).store?.currency ?? '';
    return Container(
      key: const ValueKey('trade-in-card'),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: p.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: tint.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: AppIcon(AppIcons.tradeIn, size: 24, color: tint),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  (title ?? '').trim().isEmpty
                      ? context.l10n.tradeInTitle
                      : title!.trim(),
                  style: TextStyle(
                    fontSize: 16.5,
                    fontWeight: FontWeight.w800,
                    height: 1.3,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  context.l10n.tradeInLine,
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.4,
                    color: p.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  context.l10n.tradeInUpTo(formatMoney(rules.top, currency)),
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 10),
                FilledButton.icon(
                  key: const ValueKey('trade-in-open'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 44),
                    backgroundColor: tint,
                    foregroundColor: _onColor(tint),
                    shape: const StadiumBorder(),
                  ),
                  onPressed: () => context.push(Paths.tradeIn),
                  icon: const AppIcon(AppIcons.tradeIn, size: 18),
                  label: Text(context.l10n.tradeInCheck),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// White or near-black, whichever reads on [c].
Color _onColor(Color c) =>
    c.computeLuminance() > 0.45 ? const Color(0xFF111111) : Colors.white;

/// The estimator: the device, its storage and its grade, then what it is
/// worth, and "Start trade-in" (the customer's name and phone, sent).
class TradeInEstimator extends ConsumerStatefulWidget {
  const TradeInEstimator({super.key, required this.rules, this.accent});

  final TradeInRules rules;
  final Color? accent;

  @override
  ConsumerState<TradeInEstimator> createState() => _TradeInEstimatorState();
}

class _TradeInEstimatorState extends ConsumerState<TradeInEstimator> {
  late TradeInModel _model = widget.rules.models.first;
  late String _storage = _model.storages.first.label;
  TradeInGrade _grade = TradeInGrade.likeNew;

  /// The estimate the shop has the request with, once sent.
  String? _sent;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final tint = widget.accent ?? p.primary;
    final currency = ref.watch(appConfigProvider).store?.currency ?? '';
    final cents = widget.rules.estimate(_model.name, _storage, _grade) ?? 0;
    final estimate = formatMoney(cents, currency);
    Widget label(String text) => Padding(
      padding: const EdgeInsets.only(top: 14, bottom: 8),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 13.5,
          fontWeight: FontWeight.w700,
          color: p.textSecondary,
        ),
      ),
    );
    Widget chip(String text, bool on, VoidCallback tap, Key key) => ChoiceChip(
      key: key,
      label: Text(text),
      selected: on,
      onSelected: (_) => tap(),
      showCheckmark: false,
      shape: const StadiumBorder(),
      selectedColor: tint,
      labelStyle: TextStyle(
        fontWeight: FontWeight.w700,
        color: on ? _onColor(tint) : p.text,
      ),
      side: BorderSide(color: on ? tint : p.border),
      backgroundColor: p.surface,
    );
    if (_sent != null) {
      return Container(
        key: const ValueKey('trade-in-sent'),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: p.successSoft,
          borderRadius: BorderRadius.circular(22),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppIcon(AppIcons.checkCircle, color: p.success, size: 26),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.l10n.tradeInSent,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    context.l10n.tradeInSentLine(_model.name, _sent!),
                    style: TextStyle(
                      fontSize: 13.5,
                      height: 1.4,
                      color: p.textBody,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }
    return Container(
      key: const ValueKey('trade-in-estimator'),
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 16),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          label(context.l10n.tradeInModel),
          DropdownButtonFormField<String>(
            key: const ValueKey('trade-in-model'),
            initialValue: _model.name,
            isExpanded: true,
            decoration: InputDecoration(
              filled: true,
              fillColor: p.surfaceMuted,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
            ),
            items: [
              for (final m in widget.rules.models)
                DropdownMenuItem(value: m.name, child: Text(m.name)),
            ],
            onChanged: (name) => setState(() {
              _model = widget.rules.models.firstWhere((m) => m.name == name);
              if (!_model.storages.any((s) => s.label == _storage)) {
                _storage = _model.storages.first.label;
              }
            }),
          ),
          label(context.l10n.tradeInStorage),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final s in _model.storages)
                chip(
                  s.label,
                  s.label == _storage,
                  () => setState(() => _storage = s.label),
                  ValueKey('trade-in-storage-${s.label}'),
                ),
            ],
          ),
          label(context.l10n.tradeInCondition),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final g in TradeInGrade.values)
                chip(
                  tradeInGradeName(context, g),
                  g == _grade,
                  () => setState(() => _grade = g),
                  ValueKey('trade-in-grade-${g.name}'),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Divider(color: p.divider, height: 1),
          const SizedBox(height: 14),
          // 211 The estimate on its own line, the button under it.
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.l10n.tradeInEstimate,
                    style: TextStyle(fontSize: 12.5, color: p.textSecondary),
                  ),
                  const SizedBox(height: 2),
                  // 211 On one line, smaller when the amount is long.
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: AlignmentDirectional.centerStart,
                    child: Text(
                      context.l10n.tradeInUpTo(estimate),
                      key: const ValueKey('trade-in-estimate'),
                      maxLines: 1,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                key: const ValueKey('trade-in-start'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, 44),
                  backgroundColor: tint,
                  foregroundColor: _onColor(tint),
                  shape: const StadiumBorder(),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 14,
                  ),
                ),
                onPressed: () async {
                  final sent = await showTradeInRequest(
                    context,
                    model: _model.name,
                    storage: _storage,
                    grade: _grade,
                  );
                  if (sent != null && mounted) setState(() => _sent = sent);
                },
                icon: const AppIcon(AppIcons.tradeIn, size: 18),
                label: Text(context.l10n.tradeInStart),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            context.l10n.tradeInFinal,
            style: TextStyle(fontSize: 12, color: p.textTertiary),
          ),
        ],
      ),
    );
  }
}

/// The request sheet: name, phone and a note, sent to the shop. Returns the
/// estimate the shop has it with, or null when closed.
Future<String?> showTradeInRequest(
  BuildContext context, {
  required String model,
  required String storage,
  required TradeInGrade grade,
}) => showModalBottomSheet<String>(
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  builder: (context) =>
      _TradeInRequestSheet(model: model, storage: storage, grade: grade),
);

class _TradeInRequestSheet extends ConsumerStatefulWidget {
  const _TradeInRequestSheet({
    required this.model,
    required this.storage,
    required this.grade,
  });

  final String model;
  final String storage;
  final TradeInGrade grade;

  @override
  ConsumerState<_TradeInRequestSheet> createState() =>
      _TradeInRequestSheetState();
}

class _TradeInRequestSheetState extends ConsumerState<_TradeInRequestSheet> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _note = TextEditingController();
  Map<String, String> _errors = const {};
  String? _failure;
  bool _sending = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final l10n = context.l10n;
    final name = _name.text.trim();
    final phone = _phone.text.trim();
    final digits = phone.replaceAll(RegExp(r'\D'), '').length;
    setState(() {
      _failure = null;
      _errors = {
        if (name.isEmpty) 'name': l10n.pageFormRequired,
        if (phone.isEmpty)
          'phone': l10n.pageFormRequired
        else if (!RegExp(r'^\+?[0-9 ()-]{6,30}$').hasMatch(phone) ||
            digits < 6 ||
            digits > 20)
          'phone': l10n.pageFormInvalidPhone,
      };
    });
    if (_errors.isNotEmpty) return;
    setState(() => _sending = true);
    try {
      final estimate = await ref
          .read(yallappApiProvider)
          .sendTradeIn(
            model: widget.model,
            storage: widget.storage,
            grade: widget.grade,
            name: name,
            phone: phone,
            note: _note.text,
          );
      if (mounted) Navigator.of(context).pop(estimate);
    } on ApiException catch (e) {
      if (!mounted) return;
      final fields = e.details?['fields'];
      setState(() {
        _sending = false;
        if (fields is Map && fields.isNotEmpty) {
          _errors = {
            for (final f in fields.entries)
              if (f.value is String) '${f.key}': f.value as String,
          };
          if (!_errors.containsKey('name') && !_errors.containsKey('phone')) {
            _failure = e.message;
          }
        } else {
          _failure = e.message;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    InputDecoration field(String label, String key) => InputDecoration(
      labelText: label,
      errorText: _errors[key],
      filled: true,
      fillColor: p.surfaceMuted,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
    );
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          key: const ValueKey('trade-in-sheet'),
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                header: true,
                child: Text(
                  context.l10n.tradeInContact,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${widget.model} · ${widget.storage} · '
                '${tradeInGradeName(context, widget.grade)}',
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
              const SizedBox(height: 16),
              TextField(
                key: const ValueKey('trade-in-name'),
                controller: _name,
                textInputAction: TextInputAction.next,
                decoration: field(context.l10n.tradeInName, 'name'),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const ValueKey('trade-in-phone'),
                controller: _phone,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                decoration: field(context.l10n.tradeInPhone, 'phone'),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const ValueKey('trade-in-note'),
                controller: _note,
                maxLines: 3,
                minLines: 1,
                maxLength: 500,
                decoration: field(context.l10n.tradeInNote, 'note'),
              ),
              if (_failure != null) ...[
                const SizedBox(height: 4),
                Text(_failure!, style: TextStyle(color: p.danger)),
              ],
              const SizedBox(height: 12),
              PrimaryButton(
                key: const ValueKey('trade-in-send'),
                label: context.l10n.tradeInSend,
                loading: _sending,
                onPressed: _sending ? null : _send,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The estimator on its own screen (the trade-in card's button, a `flow:
/// trade_in` action).
class TradeInScreen extends ConsumerWidget {
  const TradeInScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final rules = ref.watch(appConfigProvider).store?.tradeIn;
    return Scaffold(
      backgroundColor: p.background,
      appBar: AppBar(
        leading: const AppBarBackButton(),
        title: Text(context.l10n.tradeInTitle),
      ),
      body: rules == null
          ? const SizedBox.shrink()
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                Text(
                  context.l10n.tradeInLine,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.45,
                    color: p.textSecondary,
                  ),
                ),
                const SizedBox(height: 12),
                TradeInEstimator(rules: rules),
              ],
            ),
    );
  }
}
