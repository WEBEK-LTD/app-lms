import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/news_providers.dart';
import '../widgets/article_widgets.dart';

/// The Saved tab: articles the reader bookmarked, kept on this device (no
/// account needed).
class SavedScreen extends ConsumerWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final saved = ref.watch(bookmarksProvider);
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.tabSaved),
            Expanded(
              child: saved.isEmpty
                  ? MessageView(
                      icon: AppIcons.bookmark,
                      title: l10n.noSavedTitle,
                      message: l10n.noSavedMessage,
                    )
                  : ListView.separated(
                      key: const ValueKey('saved-list'),
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                      itemCount: saved.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, i) =>
                          ArticleTile(article: saved[i]),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
