import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../studio/studio_widgets.dart';

/// 125 The panel at the foot of a screen, as the designs draw a sheet: 28
/// points round on top, a handle, a soft shadow.
class FootPanel extends StatelessWidget {
  const FootPanel({super.key, required this.child, this.gap = 14});

  final Widget child;
  final double gap;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return DecoratedBox(
      decoration: const BoxDecoration(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Color(0x1A0E0D24),
            blurRadius: 32,
            offset: Offset(0, -12),
          ),
        ],
      ),
      child: Material(
        color: c.surface,
        shape: RoundedRectangleBorder(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          side: BorderSide(color: c.line),
        ),
        clipBehavior: Clip.antiAlias,
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: c.line,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                SizedBox(height: gap),
                child,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Opens [child] as a modal sheet drawn like [FootPanel].
Future<T?> showFootSheet<T>(BuildContext context, WidgetBuilder child) =>
    showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      showDragHandle: false,
      backgroundColor: Colors.transparent,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: FootPanel(child: child(context)),
      ),
    );

/// "Ready in": the minutes to prepare, then Reject… or Accept · 15 min.
class AcceptPanel extends StatefulWidget {
  const AcceptPanel({
    super.key,
    required this.choices,
    required this.onAccept,
    required this.onReject,
    this.busy = false,
  });

  final List<int> choices;
  final ValueChanged<int> onAccept;
  final VoidCallback onReject;
  final bool busy;

  @override
  State<AcceptPanel> createState() => _AcceptPanelState();
}

class _AcceptPanelState extends State<AcceptPanel> {
  late int _minutes = widget.choices.contains(15)
      ? 15
      : widget.choices.isEmpty
      ? 15
      : widget.choices[widget.choices.length ~/ 2];

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Text(
            l10n.readyIn,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
          ),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final m in widget.choices)
              Semantics(
                selected: m == _minutes,
                button: true,
                child: Material(
                  color: m == _minutes ? c.ink : Colors.transparent,
                  shape: StadiumBorder(
                    side: m == _minutes
                        ? BorderSide.none
                        : BorderSide(color: c.line),
                  ),
                  child: InkWell(
                    customBorder: const StadiumBorder(),
                    onTap: () => setState(() => _minutes = m),
                    child: Container(
                      constraints: const BoxConstraints(minHeight: 44),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: Center(
                        widthFactor: 1,
                        child: Text(
                          l10n.minutesShort(m),
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: m == _minutes ? c.onInk : c.ink,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 14),
        Text(l10n.acceptNote, style: TextStyle(fontSize: 13, color: c.ink2)),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: BigButton(
                label: l10n.rejectMore,
                danger: true,
                onPressed: widget.busy ? null : widget.onReject,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              flex: 2,
              child: BigButton(
                label: l10n.acceptWith(l10n.minutesShort(_minutes)),
                busy: widget.busy,
                onPressed: () => widget.onAccept(_minutes),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// Accepts a new food order with the time to prepare (the sheet), or
/// rejects it from there. The order after, or null when nothing changed.
Future<FoodOrderDetail?> acceptFoodOrder(
  BuildContext context,
  WidgetRef ref,
  FoodOrderDetail detail,
) async {
  final choice = await showFootSheet<Object>(
    context,
    (sheet) => AcceptPanel(
      choices: detail.prepChoices,
      onAccept: (m) => Navigator.pop(sheet, m),
      onReject: () => Navigator.pop(sheet, 'reject'),
    ),
  );
  if (!context.mounted) return null;
  if (choice == 'reject') return rejectFoodOrder(context, ref, detail);
  if (choice is! int) return null;
  return foodStep(context, ref, detail, 'accept', prepMinutes: choice);
}

/// Asks why, then rejects the order.
Future<FoodOrderDetail?> rejectFoodOrder(
  BuildContext context,
  WidgetRef ref,
  FoodOrderDetail detail,
) async {
  final answer = await showFootSheet<(String, String)>(
    context,
    (sheet) => _RejectForm(detail: detail),
  );
  if (answer == null || !context.mounted) return null;
  return foodStep(
    context,
    ref,
    detail,
    'reject',
    reason: answer.$1,
    note: answer.$2,
  );
}

/// Cancels it after asking.
Future<FoodOrderDetail?> cancelFoodOrder(
  BuildContext context,
  WidgetRef ref,
  FoodOrderDetail detail,
) async {
  final l10n = context.l10n;
  final ok = await confirm(
    context,
    title: l10n.cancelTitle(detail.order.reference),
    text: l10n.cancelFoodText,
    action: l10n.cancelConfirm,
    destructive: true,
  );
  if (!ok || !context.mounted) return null;
  return foodStep(context, ref, detail, 'cancel');
}

/// One step of a food order, said in a snack bar.
Future<FoodOrderDetail?> foodStep(
  BuildContext context,
  WidgetRef ref,
  FoodOrderDetail detail,
  String step, {
  int? prepMinutes,
  String? reason,
  String? note,
}) async {
  final l10n = context.l10n;
  final reference = detail.order.reference;
  try {
    final after = await ref
        .read(apiProvider)
        .foodOrderStep(
          ref.read(appIdProvider),
          detail.order.id,
          step: step,
          prepMinutes: prepMinutes,
          reason: reason,
          note: note,
        );
    if (context.mounted) {
      showMessage(context, switch (step) {
        'accept' => l10n.foodAccepted(
          reference,
          l10n.minutesShort(prepMinutes ?? 0),
        ),
        'reject' => l10n.foodRejected(reference),
        'ready' => l10n.foodReadyDone(reference),
        _ => l10n.foodCancelled(reference),
      });
    }
    return after;
  } on Object catch (e) {
    if (context.mounted) showError(context, e);
    return null;
  }
}

class _RejectForm extends StatefulWidget {
  const _RejectForm({required this.detail});

  final FoodOrderDetail detail;

  @override
  State<_RejectForm> createState() => _RejectFormState();
}

class _RejectFormState extends State<_RejectForm> {
  String? _reason;
  final _note = TextEditingController();
  bool _tried = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    return ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.75,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.rejectTitle(widget.detail.order.reference),
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              l10n.rejectText,
              style: TextStyle(fontSize: 13, color: c.ink2),
            ),
            const SizedBox(height: 12),
            Text(
              l10n.rejectWhy,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            RadioGroup<String>(
              groupValue: _reason,
              onChanged: (v) => setState(() => _reason = v),
              child: Column(
                children: [
                  for (final r in widget.detail.rejectionReasons)
                    RadioListTile<String>(
                      value: r.id,
                      contentPadding: EdgeInsets.zero,
                      title: Text(r.label),
                    ),
                ],
              ),
            ),
            if (_tried && _reason == null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  l10n.chooseWhy,
                  style: TextStyle(color: c.danger, fontSize: 13),
                ),
              ),
            TextField(
              controller: _note,
              maxLength: 300,
              decoration: InputDecoration(labelText: l10n.noteOptional),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: BigButton(
                    label: l10n.keepIt,
                    filled: false,
                    onPressed: () => Navigator.pop(context),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(64, 52),
                      backgroundColor: c.danger,
                      foregroundColor: c.onDanger,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    onPressed: () {
                      if (_reason == null) {
                        setState(() => _tried = true);
                        return;
                      }
                      Navigator.pop(context, (_reason!, _note.text));
                    },
                    child: Text(l10n.rejectOrder),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
