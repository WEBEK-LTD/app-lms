import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import 'today_screen.dart';

/// 59 Updates from Yallapp: the dashboard's bell, with the same read state.
/// What the list shows is marked read once it's on screen; the new ones
/// stay marked "New" until the screen closes.
class UpdatesScreen extends ConsumerStatefulWidget {
  const UpdatesScreen({super.key});

  @override
  ConsumerState<UpdatesScreen> createState() => _UpdatesScreenState();
}

class _UpdatesScreenState extends ConsumerState<UpdatesScreen> {
  final _marked = <String>{};
  late final ProviderContainer _container;

  @override
  void initState() {
    super.initState();
    _container = ProviderScope.containerOf(context, listen: false);
  }

  void _markShown(UpdatesList list) {
    final keys = [
      for (final u in list.items)
        if (u.unread && !_marked.contains(u.key)) u.key,
    ];
    if (keys.isEmpty) return;
    _marked.addAll(keys);
    ref
        .read(apiProvider)
        .markUpdatesRead(keys: keys)
        .then((_) {}, onError: (_) {});
  }

  Future<void> _markAll() async {
    try {
      await ref.read(apiProvider).markUpdatesRead(all: true);
      ref.invalidate(updatesProvider);
    } on Object catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  void dispose() {
    // The badge counts again without what was seen here.
    if (_marked.isNotEmpty) {
      final container = _container;
      Future.microtask(() => container.invalidate(updatesProvider));
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final updates = ref.watch(updatesProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.updatesTitle),
        actions: [
          if ((updates.value?.unread ?? 0) > 0)
            TextButton(onPressed: _markAll, child: Text(l10n.markAllRead)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: pullToRefresh(
          context,
          () => ref.refresh(updatesProvider.future),
        ),
        child: AsyncBody(
          value: updates,
          onRetry: () => ref.invalidate(updatesProvider),
          builder: (list) {
            if (list.items.isEmpty) {
              return EmptyState(
                icon: AppIcons.bell,
                title: l10n.noUpdates,
                text: l10n.noUpdatesText,
              );
            }
            WidgetsBinding.instance.addPostFrameCallback(
              (_) => _markShown(list),
            );
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, i) => _UpdateCard(update: list.items[i]),
            );
          },
        ),
      ),
    );
  }
}

class _UpdateCard extends ConsumerWidget {
  const _UpdateCard({required this.update});

  final Update update;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final kind =
        update.kindLabel ??
        switch (update.kind) {
          'update' => l10n.kindUpdate,
          'maintenance' => l10n.kindMaintenance,
          'offer' => l10n.kindOffer,
          'account' => l10n.kindAccount,
          _ => l10n.kindAnnouncement,
        };
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    StatusChip(kind),
                    if (update.unread)
                      StatusChip(l10n.newLabel, tone: Tone.accent),
                    if (!update.current) StatusChip(l10n.ended),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(context.ago(update.at), style: theme.textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 10),
          Text(update.title, style: theme.textTheme.titleSmall),
          const SizedBox(height: 4),
          Text(
            update.body,
            style: theme.textTheme.bodyMedium?.copyWith(color: Brand.ink2),
          ),
          if (update.link != null)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                onPressed: () => openLink(context, ref, update.link),
                icon: const DirectionalIcon(AppIcons.web, size: 18),
                label: Text(update.linkLabel ?? l10n.learnMore),
              ),
            ),
        ],
      ),
    );
  }
}

/// An announcement's small Markdown as plain text: emphasis marks go,
/// links keep their words, list items get a bullet.
String plainText(String markdown) => markdown
    .split('\n')
    .map((line) {
      var l = line.replaceFirst(RegExp(r'^\s{0,3}#{1,6}\s+'), '');
      l = l.replaceFirst(RegExp(r'^\s*[-*+]\s+'), '• ');
      l = l.replaceAllMapped(
        RegExp(r'\[([^\]]+)\]\([^)]*\)'),
        (m) => m.group(1)!,
      );
      return l.replaceAll(RegExp(r'(\*\*|__|`)'), '');
    })
    .join('\n')
    .trim();
