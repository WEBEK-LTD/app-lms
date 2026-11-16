import 'package:flutter/widgets.dart';

import '../../core/widgets/l10n.dart';

/// 132 The Studio engines' statuses in the app's own words (Modern Standard
/// Arabic, Turkish), as the owner reads them; the API's label (already in the
/// person's language) only for a status the app doesn't know yet.

String foodStatusLabel(BuildContext context, String status, String server) {
  final l10n = context.l10n;
  return switch (status) {
    'awaiting_payment' => l10n.stAwaitingPayment,
    'placed' => l10n.stepNew,
    'accepted' => l10n.stepPreparing,
    'ready' => l10n.stReadyForCourier,
    'picked_up' => l10n.stPickedUp,
    'on_the_way' => l10n.stOnTheWay,
    'delivered' => l10n.stDelivered,
    'rejected' => l10n.stTurnedDown,
    'cancelled' => l10n.statusCancelled,
    'failed' => l10n.stNotDelivered,
    _ => server,
  };
}

String shipmentStatusLabel(BuildContext context, String status, String server) {
  final l10n = context.l10n;
  return switch (status) {
    'awaiting_payment' => l10n.stAwaitingPayment,
    'pending' => l10n.stWaitingCourier,
    'assigned' => l10n.stCourierToPickup,
    'picked_up' => l10n.stPickedUp,
    'on_the_way' => l10n.stOnTheWay,
    'delivered' => l10n.stDelivered,
    'failed' => l10n.stNotDelivered,
    'cancelled' => l10n.statusCancelled,
    _ => server,
  };
}

String rideStatusLabel(BuildContext context, String status, String server) {
  final l10n = context.l10n;
  return switch (status) {
    'scheduled' => l10n.stBookedLater,
    'searching' => l10n.stSearching,
    'accepted' => l10n.stDriverComing,
    'arrived' => l10n.stDriverAtPickup,
    'in_progress' => l10n.stOnRide,
    'completed' => l10n.statusCompleted,
    'cancelled' => l10n.statusCancelled,
    'no_driver' => l10n.stNoDriver,
    _ => server,
  };
}

String marketStatusLabel(BuildContext context, String status, String server) {
  final l10n = context.l10n;
  return switch (status) {
    'awaiting_payment' => l10n.stAwaitingPayment,
    'scheduled' => l10n.stForLater,
    'placed' => l10n.stepNew,
    'accepted' => l10n.stAccepted,
    'picking' => l10n.stPicking,
    'ready' => l10n.stepReady,
    'on_the_way' => l10n.stOnTheWay,
    'delivered' => l10n.stDelivered,
    'picked_up' => l10n.stPickedUp,
    'rejected' => l10n.stTurnedDown,
    'cancelled' => l10n.statusCancelled,
    _ => server,
  };
}

String complaintStatusLabel(
  BuildContext context,
  String status,
  String server,
) {
  final l10n = context.l10n;
  return switch (status) {
    'open' => l10n.csOpen,
    'in_review' => l10n.csInReview,
    'waiting_for_customer' => l10n.waitingCustomer,
    'resolved' => l10n.csResolved,
    'rejected' => l10n.csRejected,
    _ => server,
  };
}

/// 132 How it's paid, in the app's words: cash or card, and paid.
String payWords(
  BuildContext context,
  String method,
  String server, {
  bool paid = false,
}) {
  final l10n = context.l10n;
  return switch (method) {
    'cash' => l10n.payCash,
    'card' when paid => '${l10n.payCard} · ${l10n.payPaid}',
    'card' => l10n.payCard,
    _ => server,
  };
}
