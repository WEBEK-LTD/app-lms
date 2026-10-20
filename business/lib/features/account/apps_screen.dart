import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

/// 59 The app switcher: an account can run several apps.
class AppsScreen extends ConsumerWidget {
  const AppsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    final l10n = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.chooseApp)),
      body: RefreshIndicator(
        onRefresh: ref.read(sessionProvider.notifier).refreshMe,
        child: AppList(
          apps: me?.apps ?? const [],
          onPick: (app) {
            ref.read(selectedAppProvider.notifier).select(app.id);
            context.go(Paths.today);
          },
        ),
      ),
    );
  }
}

/// Opens the switcher as a sheet (Today's header, More).
Future<void> showAppSwitcher(BuildContext context, WidgetRef ref) async {
  final me = ref.read(meProvider);
  if (me == null) return;
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (sheet) => SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(sheet).height * 0.8,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SectionTitle(context.l10n.yourApps),
            Flexible(
              child: AppList(
                apps: me.apps,
                current: ref.read(currentAppProvider)?.id,
                onPick: (app) {
                  ref.read(selectedAppProvider.notifier).select(app.id);
                  Navigator.pop(sheet);
                  GoRouter.of(context).go(Paths.today);
                },
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class AppList extends StatelessWidget {
  const AppList({
    super.key,
    required this.apps,
    required this.onPick,
    this.current,
  });

  final List<AppSummary> apps;
  final String? current;
  final void Function(AppSummary app) onPick;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      shrinkWrap: true,
      itemCount: apps.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, i) {
        final app = apps[i];
        final selected = app.id == current;
        return Panel(
          onTap: () => onPick(app),
          color: selected ? context.yb.muted : null,
          child: Row(
            children: [
              AppAvatar(app: app),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      app.name,
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [
                        app.typeName,
                        appStateLabel(context, app.state),
                      ].join(' · '),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              if (selected)
                Icon(
                  AppIcons.checkCircle,
                  semanticLabel: context.l10n.currentApp,
                )
              else
                const DirectionalIcon(AppIcons.forward),
            ],
          ),
        );
      },
    );
  }
}

String appStateLabel(BuildContext context, AccountState state) {
  final l10n = context.l10n;
  return switch (state) {
    AccountState.active => l10n.stateActive,
    AccountState.pending => l10n.statePending,
    AccountState.expired => l10n.stateExpired,
    AccountState.suspended => l10n.stateSuspended,
  };
}

/// The app's icon, or its first letter.
class AppAvatar extends StatelessWidget {
  const AppAvatar({super.key, required this.app, this.size = 44});

  final AppSummary app;
  final double size;

  @override
  Widget build(BuildContext context) {
    final url = app.iconUrl;
    final letter = app.name.isEmpty
        ? '?'
        : app.name.characters.first.toUpperCase();
    final fallback = Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      color: context.yb.ink,
      child: Text(
        letter,
        style: Theme.of(context).textTheme.titleMedium
            ?.copyWith(color: context.yb.onInk),
      ),
    );
    return ExcludeSemantics(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(size * 0.26),
        child: url == null
            ? fallback
            : Image.network(
                url,
                width: size,
                height: size,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => fallback,
              ),
      ),
    );
  }
}
