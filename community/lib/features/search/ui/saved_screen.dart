import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/glass.dart';
import '../data/search_api.dart';
import 'search_screen.dart';

final savedProvider = FutureProvider.autoDispose<SearchResults>(
  (ref) => ref.watch(searchApiProvider).saved(),
);

/// The menu's bookmark: the questions and tutorials the member saved.
class SavedScreen extends ConsumerWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final saved = ref.watch(savedProvider);
    return Scaffold(
      backgroundColor: p.screen,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 4, 18, 8),
              child: Row(
                children: [
                  IconBtn(
                    icon: Directionality.of(context) == TextDirection.rtl
                        ? Symbols.arrow_forward
                        : Symbols.arrow_back,
                    label: l.commonBack,
                    onTap: () =>
                        context.canPop() ? context.pop() : context.go('/'),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    l.menuSaved,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -.4,
                      color: p.ink,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: switch (saved) {
                AsyncData(:final value) when value.isEmpty => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(
                      l.savedEmpty,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: p.muted),
                    ),
                  ),
                ),
                AsyncData(:final value) => RefreshIndicator(
                  onRefresh: () => ref.refresh(savedProvider.future),
                  child: ResultsList(results: value),
                ),
                AsyncError() => Center(
                  child: TextButton(
                    onPressed: () => ref.invalidate(savedProvider),
                    child: Text(l.commonRetry),
                  ),
                ),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
          ],
        ),
      ),
    );
  }
}
