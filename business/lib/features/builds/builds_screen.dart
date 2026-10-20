import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

final buildsProvider = FutureProvider.autoDispose<Builds>(
  (ref) => ref.watch(apiProvider).builds(ref.watch(appIdProvider)),
);

/// 59 Builds & publishing, read-only: the last builds with their downloads
/// (links signed for 15 minutes, so they're asked for each time) and each
/// store's status. Builds are started on the dashboard.
class BuildsScreen extends ConsumerWidget {
  const BuildsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final builds = ref.watch(buildsProvider);
    final me = ref.watch(meProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.buildsTitle)),
      body: RefreshIndicator(
        onRefresh: pullToRefresh(
          context,
          () => ref.refresh(buildsProvider.future),
        ),
        child: AsyncBody(
          value: builds,
          onRetry: () => ref.invalidate(buildsProvider),
          builder: (b) => ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              SectionTitle(l10n.publishing),
              Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      b.publishingMode == 'managed'
                          ? l10n.publishManaged
                          : l10n.publishSelf,
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    for (final s in b.stores)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(AppIcons.store),
                        title: Text(s.store),
                        subtitle: Text(s.status),
                        trailing: s.url == null
                            ? null
                            : const DirectionalIcon(AppIcons.web),
                        onTap: s.url == null
                            ? null
                            : () => openLink(context, ref, s.url),
                      ),
                  ],
                ),
              ),
              SectionTitle(l10n.builds),
              if (b.items.isEmpty)
                Text(l10n.noBuilds)
              else
                for (final build in b.items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _BuildCard(item: build),
                  ),
              const SizedBox(height: 8),
              Text(
                l10n.buildsOnDashboard,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              if (me != null)
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: TextButton.icon(
                    onPressed: () => openLink(context, ref, me.links.dashboard),
                    icon: const DirectionalIcon(AppIcons.web, size: 18),
                    label: Text(l10n.openDashboard),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BuildCard extends ConsumerWidget {
  const _BuildCard({required this.item});

  final Build item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final b = item;
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  l10n.buildVersion(b.version, b.number),
                  style: theme.textTheme.titleSmall,
                ),
              ),
              StatusChip(b.statusLabel, tone: StatusChip.toneOf(b.status)),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            b.finishedAt == null
                ? l10n.startedAt(context.dateTime(b.createdAt))
                : l10n.finishedAt(context.dateTime(b.finishedAt!)),
            style: theme.textTheme.bodySmall,
          ),
          if (b.status == 'building' || b.status == 'queued') ...[
            const SizedBox(height: 10),
            LinearProgressIndicator(semanticsLabel: b.statusLabel),
          ],
          if (b.message != null) ...[
            const SizedBox(height: 8),
            Text(
              b.message!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: b.status == 'failed' ? Brand.danger : null,
              ),
            ),
          ],
          if (b.files.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final f in b.files)
                  OutlinedButton.icon(
                    onPressed: f.url == null
                        ? null
                        : () => openLink(context, ref, f.url),
                    icon: const Icon(AppIcons.download),
                    label: Text(f.label),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
