import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart'
    show SignInPrompt, TabHeader;
import '../data/delivery_providers.dart';
import '../widgets/delivery_widgets.dart';

/// 104 My shipments: what the signed-in customer sent, newest first.
class ShipmentsScreen extends ConsumerWidget {
  const ShipmentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.tabShipments),
            Expanded(
              child: signedIn
                  ? const _ShipmentList()
                  : SignInPrompt(
                      icon: AppIcons.parcel,
                      title: l10n.shipmentsSignInTitle,
                      message: l10n.shipmentsSignInMessage,
                      from: Paths.shipments,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ShipmentList extends ConsumerWidget {
  const _ShipmentList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(myShipmentsProvider);
    final notifier = ref.read(myShipmentsProvider.notifier);
    if (state.isInitialLoading) {
      return SkeletonList(
        layout: SkeletonLayout.text,
        label: l10n.loadingShipments,
      );
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: notifier.retry);
    }
    if (state.items.isEmpty) {
      return MessageView(
        icon: AppIcons.parcel,
        title: l10n.noShipmentsTitle,
        message: l10n.noShipmentsMessage,
        actionLabel: l10n.sendTitle,
        onAction: () => context.push(Paths.send),
      );
    }
    return RefreshIndicator(
      onRefresh: notifier.refresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.extentAfter < 300 && state.hasMore) notifier.loadMore();
          return false;
        },
        child: ListView.separated(
          key: const ValueKey('shipments-list'),
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          itemCount: state.items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) => ShipmentTile(
            shipment: state.items[i],
            onTap: () => context.push(Paths.shipment(state.items[i].id)),
          ),
        ),
      ),
    );
  }
}
