import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../account/apps_screen.dart';

final licenseProvider = FutureProvider.autoDispose<License>(
  (ref) => ref.watch(apiProvider).license(ref.watch(appIdProvider)),
);

/// 59 The plan, its end and the storage: read-only. Nothing is bought in
/// the app on any platform; "Manage on yallapp.com.tr" opens the browser.
class PlanScreen extends ConsumerWidget {
  const PlanScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    // 60 The plan is the owner's; someone on the team is told to ask them.
    if (ref.watch(currentAppProvider)?.access.license == false) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.planAndStorage)),
        body: MessageState(
          icon: AppIcons.lock,
          title: l10n.askOwner,
          text: l10n.planOwnerOnly,
        ),
      );
    }
    final license = ref.watch(licenseProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.planAndStorage)),
      body: RefreshIndicator(
        onRefresh: pullToRefresh(
          context,
          () => ref.refresh(licenseProvider.future),
        ),
        child: AsyncBody(
          value: license,
          onRetry: () => ref.invalidate(licenseProvider),
          builder: (lic) {
            final theme = Theme.of(context);
            final plan = lic.plan;
            final storage = lic.storage;
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                Panel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              plan?.name ?? l10n.noPlan,
                              style: theme.textTheme.titleLarge,
                            ),
                          ),
                          StatusChip(
                            appStateLabel(context, lic.state),
                            tone: StatusChip.toneOf(lic.state.name),
                          ),
                        ],
                      ),
                      if (plan != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          plan.daysLeft >= 0
                              ? l10n.planEnds(
                                  context.date(plan.expiresAt),
                                  plan.daysLeft,
                                )
                              : l10n.planEnded(context.date(plan.expiresAt)),
                        ),
                      ],
                      if (lic.nextPlan != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          l10n.nextPlan(
                            lic.nextPlan!.name,
                            context.date(lic.nextPlan!.startsAt),
                          ),
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                      if (lic.features.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        for (final feature in lic.features)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Row(
                              children: [
                                Icon(
                                  AppIcons.check,
                                  size: 18,
                                  color: context.yb.success,
                                ),
                                const SizedBox(width: 8),
                                Expanded(child: Text(feature)),
                              ],
                            ),
                          ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Panel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.storage, style: theme.textTheme.titleSmall),
                      const SizedBox(height: 6),
                      Text(
                        storage.limit == null
                            ? l10n.storageUsedNoPlan(storage.used)
                            : l10n.storageUsed(storage.used, storage.limit!),
                      ),
                      if (storage.share != null) ...[
                        const SizedBox(height: 8),
                        LinearProgressIndicator(
                          value: storage.share,
                          minHeight: 8,
                          borderRadius: BorderRadius.circular(8),
                          semanticsLabel: l10n.storage,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                // 65 iOS shows no way to pay or manage the plan outside the
                // App Store (App Review 3.1.1, 3.1.3): read-only, no link.
                if (defaultTargetPlatform == TargetPlatform.iOS)
                  Text(l10n.planReadOnlyText, style: theme.textTheme.bodyMedium)
                else ...[
                  Text(
                    l10n.manageOnWebsiteText,
                    style: theme.textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () => openLink(context, ref, lic.manageUrl),
                    icon: const DirectionalIcon(AppIcons.web),
                    label: Text(l10n.manageOnWebsite),
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}
