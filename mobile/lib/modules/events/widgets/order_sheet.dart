import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';

/// How many tickets and the name on each.
class TicketOrder {
  const TicketOrder({required this.quantity, required this.names});

  final int quantity;
  final List<String> names;
}

/// Asks how many tickets of [type] and the name on each (the user's own
/// name first); null when dismissed.
Future<TicketOrder?> showOrderSheet(
  BuildContext context, {
  required TicketType type,
  required bool paid,
  required String defaultName,
}) => showModalBottomSheet<TicketOrder>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (context) =>
      _OrderSheet(type: type, paid: paid, defaultName: defaultName),
);

class _OrderSheet extends StatefulWidget {
  const _OrderSheet({
    required this.type,
    required this.paid,
    required this.defaultName,
  });

  final TicketType type;
  final bool paid;
  final String defaultName;

  @override
  State<_OrderSheet> createState() => _OrderSheetState();
}

class _OrderSheetState extends State<_OrderSheet> {
  int _quantity = 1;
  late final List<TextEditingController> _names = [
    TextEditingController(text: widget.defaultName),
  ];

  int get _most {
    final remaining = widget.type.remaining;
    final most = widget.type.maxPerOrder.clamp(1, 20);
    return remaining == null ? most : most.clamp(1, remaining.clamp(1, 20));
  }

  void _set(int quantity) => setState(() {
    _quantity = quantity.clamp(1, _most);
    while (_names.length < _quantity) {
      _names.add(TextEditingController());
    }
  });

  @override
  void dispose() {
    for (final c in _names) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              widget.type.name,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
            Text(
              widget.type.price.label,
              style: TextStyle(fontSize: 15, color: p.textSecondary),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Text(
                    l10n.ticketsHowMany,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: p.text,
                    ),
                  ),
                ),
                StepIconButton(
                  icon: AppIcons.remove,
                  label: l10n.fewer,
                  onPressed: _quantity > 1 ? () => _set(_quantity - 1) : null,
                ),
                SizedBox(
                  width: 48,
                  child: Text(
                    '$_quantity',
                    key: const ValueKey('ticket-quantity'),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                ),
                StepIconButton(
                  icon: AppIcons.add,
                  label: l10n.more,
                  onPressed: _quantity < _most
                      ? () => _set(_quantity + 1)
                      : null,
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              l10n.ticketsNamesTitle,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
            for (var i = 0; i < _quantity; i++) ...[
              const SizedBox(height: 10),
              TextField(
                key: ValueKey('ticket-name-$i'),
                controller: _names[i],
                textCapitalization: TextCapitalization.words,
                maxLength: 80,
                decoration: InputDecoration(
                  labelText: l10n.ticketNameLabel(i + 1),
                  counterText: '',
                ),
              ),
            ],
            const SizedBox(height: 20),
            PrimaryButton(
              key: const ValueKey('order-confirm'),
              label: widget.paid
                  ? l10n.ticketsContinueToPayment
                  : l10n.ticketsGetFree(_quantity),
              icon: AppIcons.ticket,
              onPressed: () => Navigator.of(context).pop(
                TicketOrder(
                  quantity: _quantity,
                  names: [
                    for (var i = 0; i < _quantity; i++) _names[i].text.trim(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
