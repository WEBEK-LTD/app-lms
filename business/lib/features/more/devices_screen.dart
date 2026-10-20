import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

final devicesProvider = FutureProvider.autoDispose<List<Device>>(
  (ref) => ref.watch(apiProvider).devices(),
);

/// 59 The phones signed in to Yallapp Business (also listed in the
/// dashboard): sign one out, or every one.
class DevicesScreen extends ConsumerWidget {
  const DevicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final devices = ref.watch(devicesProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.signedInDevices)),
      body: RefreshIndicator(
        onRefresh: pullToRefresh(
          context,
          () => ref.refresh(devicesProvider.future),
        ),
        child: AsyncBody(
          value: devices,
          onRetry: () => ref.invalidate(devicesProvider),
          builder: (list) => ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              Text(
                l10n.devicesHelp,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 12),
              for (final d in list)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Panel(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: ListTile(
                      leading: const Icon(AppIcons.preview),
                      title: Text(d.name),
                      subtitle: Text(
                        [
                          if (d.current) l10n.thisPhone,
                          d.platform == 'ios' ? 'iOS' : 'Android',
                          l10n.lastSeen(context.ago(d.lastSeenAt)),
                        ].join(' · '),
                      ),
                      trailing: d.current
                          ? null
                          : TextButton(
                              onPressed: () async {
                                final ok = await confirm(
                                  context,
                                  title: l10n.signOutDeviceTitle(d.name),
                                  action: l10n.signOut,
                                  destructive: true,
                                );
                                if (!ok) return;
                                try {
                                  await ref
                                      .read(apiProvider)
                                      .signOutDevice(d.id);
                                  ref.invalidate(devicesProvider);
                                } on Object catch (e) {
                                  if (context.mounted) showError(context, e);
                                }
                              },
                              child: Text(l10n.signOut),
                            ),
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: context.yb.danger,
                  side: BorderSide(color: context.yb.danger),
                ),
                onPressed: () async {
                  final ok = await confirm(
                    context,
                    title: l10n.signOutAllTitle,
                    text: l10n.signOutAllText,
                    action: l10n.signOutAll,
                    destructive: true,
                  );
                  if (!ok) return;
                  try {
                    await ref
                        .read(sessionProvider.notifier)
                        .signOutEverywhere();
                  } on Object catch (e) {
                    if (context.mounted) showError(context, e);
                  }
                },
                child: Text(l10n.signOutAll),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
