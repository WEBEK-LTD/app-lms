import 'package:flutter/material.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';

/// 134 How a payment inside the app ended, from the payment page's last
/// address: `order-received` with `shop_order=placed` (the shop has the
/// order) or `shop_order=confirming` (paid; the shop confirms it); no such
/// page reached: not paid.
enum InAppPaymentOutcome { placed, confirming, notPaid }

InAppPaymentOutcome inAppPaymentOutcome(Uri? url) {
  if (url == null) return InAppPaymentOutcome.notPaid;
  return url.queryParameters['shop_order'] == 'placed'
      ? InAppPaymentOutcome.placed
      : InAppPaymentOutcome.confirming;
}

/// 134 The note after paying inside the app: the order placed, the payment
/// received while the shop confirms the order, or the payment not completed
/// (nothing charged, the cart kept). Pops with true to open the orders.
Future<bool> showInAppPaymentResult(
  BuildContext context,
  InAppPaymentOutcome outcome,
) async {
  final p = context.palette;
  final open = await showModalBottomSheet<bool>(
    context: context,
    backgroundColor: p.surface,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (context) => InAppPaymentResult(outcome: outcome),
  );
  return open ?? false;
}

class InAppPaymentResult extends StatelessWidget {
  const InAppPaymentResult({super.key, required this.outcome});

  final InAppPaymentOutcome outcome;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final (icon, color, soft, title, body) = switch (outcome) {
      InAppPaymentOutcome.placed => (
        AppIcons.checkCircle,
        p.success,
        p.successSoft,
        l10n.inAppPaidTitle,
        l10n.inAppPaidBody,
      ),
      InAppPaymentOutcome.confirming => (
        AppIcons.schedule,
        p.primary,
        p.primarySoft,
        l10n.inAppConfirmingTitle,
        l10n.inAppConfirmingBody,
      ),
      InAppPaymentOutcome.notPaid => (
        AppIcons.info,
        p.textSecondary,
        p.surfaceMuted,
        l10n.inAppNotPaidTitle,
        l10n.inAppNotPaidBody,
      ),
    };
    final paid = outcome != InAppPaymentOutcome.notPaid;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsetsDirectional.fromSTEB(24, 4, 24, 24),
        child: Column(
          key: ValueKey('in-app-payment-${outcome.name}'),
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(color: soft, shape: BoxShape.circle),
                child: Icon(icon, size: 38, color: color, fill: 1),
              ),
            ),
            const SizedBox(height: 16),
            Semantics(
              header: true,
              child: Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              body,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, height: 1.45, color: p.textBody),
            ),
            const SizedBox(height: 24),
            if (paid) ...[
              PrimaryButton(
                label: l10n.inAppViewOrders,
                icon: AppIcons.orders,
                onPressed: () => Navigator.of(context).pop(true),
              ),
              const SizedBox(height: 10),
              SecondaryButton(
                label: l10n.done,
                onPressed: () => Navigator.of(context).pop(false),
              ),
            ] else
              PrimaryButton(
                label: l10n.inAppBackToCart,
                icon: AppIcons.cart,
                onPressed: () => Navigator.of(context).pop(false),
              ),
          ],
        ),
      ),
    );
  }
}
