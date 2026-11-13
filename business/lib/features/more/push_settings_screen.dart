import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

final pushPreferencesProvider = FutureProvider.autoDispose<PushPreferences>(
  (ref) => ref.watch(apiProvider).pushPreferences(),
);

/// 59 Which pushes this phone gets, kind by kind (all on at first).
class PushSettingsScreen extends ConsumerWidget {
  const PushSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final prefs = ref.watch(pushPreferencesProvider);
    final pushOn = ref.watch(pushServiceProvider).available;
    // 125 Studio apps' and Prime's pushes, when the person has such an app.
    final apps = ref.watch(meProvider)?.apps ?? const <AppSummary>[];
    bool any(bool Function(AppFeatures f) test) =>
        apps.any((a) => test(a.features));
    final kinds = [
      (PushKind.newOrder, l10n.pushNewOrder, l10n.pushNewOrderHelp),
      (PushKind.newBooking, l10n.pushNewBooking, l10n.pushNewBookingHelp),
      (PushKind.newMessage, l10n.pushNewMessage, l10n.pushNewMessageHelp),
      // 77 A message in the app's chat.
      (PushKind.newChatMessage, l10n.pushNewChat, l10n.pushNewChatHelp),
      // 63 A student reviewed a course.
      (PushKind.newReview, l10n.pushNewReview, l10n.pushNewReviewHelp),
      (PushKind.paymentReceived, l10n.pushPayment, l10n.pushPaymentHelp),
      (PushKind.buildFinished, l10n.pushBuild, l10n.pushBuildHelp),
      (PushKind.yallappUpdates, l10n.pushUpdates, l10n.pushUpdatesHelp),
      (PushKind.accountNotices, l10n.pushNotices, l10n.pushNoticesHelp),
      if (any((f) => f.foodOrders))
        (PushKind.newFoodOrder, l10n.pushFoodOrder, l10n.pushFoodOrderHelp),
      if (any((f) => f.shipments))
        (PushKind.shipmentWaiting, l10n.pushShipment, l10n.pushShipmentHelp),
      if (any((f) => f.market))
        (PushKind.newComplaint, l10n.pushComplaint, l10n.pushComplaintHelp),
      if (any((f) => f.prime)) ...[
        (PushKind.primeAlert, l10n.pushPrimeAlert, l10n.pushPrimeAlertHelp),
        (PushKind.morningBrief, l10n.pushBrief, l10n.pushBriefHelp),
      ],
    ];
    return Scaffold(
      appBar: AppBar(title: Text(l10n.notificationSettings)),
      body: AsyncBody(
        value: prefs,
        onRetry: () => ref.invalidate(pushPreferencesProvider),
        builder: (p) => ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            if (!pushOn)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Panel(
                  color: context.yb.warningBg,
                  child: Row(
                    children: [
                      Icon(AppIcons.warning, color: context.yb.warning),
                      const SizedBox(width: 10),
                      Expanded(child: Text(l10n.pushOff)),
                    ],
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
              child: Text(l10n.pushSettingsHelp),
            ),
            for (final (kind, title, help) in kinds)
              SwitchListTile(
                title: Text(title),
                subtitle: Text(help),
                value: p.isOn(kind),
                onChanged: (on) async {
                  try {
                    await ref
                        .read(apiProvider)
                        .setPushPreferences(PushPreferences({kind: on}));
                    ref.invalidate(pushPreferencesProvider);
                  } on Object catch (e) {
                    if (context.mounted) showError(context, e);
                  }
                },
              ),
          ],
        ),
      ),
    );
  }
}
