import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../data/posts_api.dart';
import 'post_card.dart';

final _savedProvider = FutureProvider.autoDispose<List<FeedEntry>>(
  (ref) async => (await ref.watch(postsApiProvider).saved()).items,
);

/// The member's saved posts (`/me/saved`), newest saved first.
class SavedPostsPage extends ConsumerWidget {
  const SavedPostsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final saved = ref.watch(_savedProvider);
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(l.postSaved),
      ),
      body: switch (saved) {
        AsyncData(:final value) when value.isEmpty => Center(
          child: Text(l.postSavedEmpty, style: TextStyle(color: p.muted)),
        ),
        AsyncData(:final value) => ListView(
          padding: const EdgeInsets.only(top: 8),
          children: [
            for (final e in value)
              if (e.post case final post?) PostCard(post: post),
          ],
        ),
        AsyncError() => Center(child: Text(l.commonError)),
        _ => const Center(
          child: CircularProgressIndicator(color: Brand.orange),
        ),
      },
    );
  }
}
