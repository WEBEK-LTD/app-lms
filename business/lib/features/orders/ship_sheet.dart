import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/widgets/digits.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

/// 207 Marks a shop order shipped with any carrier, as the dashboard does
/// (80.4): the carrier, the tracking number or waybill, the tracking link.
/// The customer is emailed. Opened again, it changes the tracking.
class ShipSheet extends ConsumerStatefulWidget {
  const ShipSheet({super.key, required this.order});

  final Order order;

  @override
  ConsumerState<ShipSheet> createState() => _ShipSheetState();
}

class _ShipSheetState extends ConsumerState<ShipSheet> {
  late final _carrier = TextEditingController(
    text: widget.order.shipment?.carrier ?? '',
  );
  late final _number = TextEditingController(
    text: widget.order.shipment?.trackingNumber ?? '',
  );
  late final _url = TextEditingController(
    text: widget.order.shipment?.trackingUrl ?? '',
  );
  Map<String, String> _errors = const {};
  bool _busy = false;

  @override
  void dispose() {
    _carrier.dispose();
    _number.dispose();
    _url.dispose();
    super.dispose();
  }

  String? _text(TextEditingController c) {
    final t = latinDigits(c.text).trim();
    return t.isEmpty ? null : t;
  }

  Future<void> _save() async {
    final l10n = context.l10n;
    if (_text(_number) == null && _text(_url) == null) {
      setState(() => _errors = {'tracking_number': l10n.shipNeedsTracking});
      return;
    }
    setState(() {
      _busy = true;
      _errors = const {};
    });
    try {
      final updated = await ref
          .read(apiProvider)
          .shipOrder(
            ref.read(appIdProvider),
            widget.order.id,
            ShipmentInput(
              carrier: _text(_carrier),
              trackingNumber: _text(_number),
              trackingUrl: _text(_url),
            ),
          );
      if (!mounted) return;
      showMessage(context, l10n.shippedDone);
      Navigator.pop(context, updated);
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.fieldErrors.isNotEmpty) {
        setState(() => _errors = e.fieldErrors);
      } else {
        showError(context, e);
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
    final theme = Theme.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.shipSheetTitle(widget.order.label),
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 6),
            Text(l10n.shipWithTrackingHelp),
            const SizedBox(height: 16),
            TextField(
              key: const ValueKey('ship-carrier'),
              controller: _carrier,
              maxLength: 80,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(
                labelText: l10n.carrierField,
                errorText: _errors['carrier'],
              ),
            ),
            TextField(
              key: const ValueKey('ship-number'),
              controller: _number,
              maxLength: 100,
              textDirection: TextDirection.ltr,
              decoration: InputDecoration(
                labelText: l10n.trackingNumberField,
                errorText: _errors['tracking_number'] ?? _errors['waybill'],
              ),
            ),
            TextField(
              key: const ValueKey('ship-url'),
              controller: _url,
              maxLength: 500,
              keyboardType: TextInputType.url,
              textDirection: TextDirection.ltr,
              decoration: InputDecoration(
                labelText: l10n.trackingLinkField,
                errorText: _errors['tracking_url'],
              ),
            ),
            const SizedBox(height: 8),
            FilledButton(
              key: const ValueKey('ship-save'),
              style: FilledButton.styleFrom(minimumSize: const Size(64, 52)),
              onPressed: _busy ? null : _save,
              child: Text(
                widget.order.shipment == null
                    ? l10n.markShipped
                    : l10n.saveTracking,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
