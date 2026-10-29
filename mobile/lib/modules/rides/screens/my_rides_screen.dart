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
import '../data/rides_providers.dart';
import '../widgets/ride_widgets.dart';

/// 105.2 My rides: the signed-in rider's rides, newest first.
class MyRidesScreen extends ConsumerWidget {
  const MyRidesScreen({super.key});

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
            TabHeader(title: l10n.tabMyRides),
            Expanded(
              child: signedIn
                  ? const _RideList()
                  : SignInPrompt(
                      icon: AppIcons.receipt,
                      title: l10n.myRidesSignInTitle,
                      message: l10n.myRidesSignInMessage,
                      from: Paths.myRides,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RideList extends ConsumerWidget {
  const _RideList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(myRidesProvider);
    final notifier = ref.read(myRidesProvider.notifier);
    if (state.isInitialLoading) {
      return SkeletonList(
        layout: SkeletonLayout.text,
        label: l10n.loadingRides,
      );
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: notifier.retry);
    }
    if (state.items.isEmpty) {
      return MessageView(
        icon: AppIcons.ride,
        title: l10n.noRidesTitle,
        message: l10n.noRidesMessage,
        actionLabel: l10n.rideWhereTo,
        onAction: () => context.go(Paths.ride),
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
          key: const ValueKey('my-rides-list'),
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          itemCount: state.items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) => RideTile(
            ride: state.items[i],
            onTap: () => context.push(Paths.rideFollow(state.items[i].id)),
          ),
        ),
      ),
    );
  }
}
