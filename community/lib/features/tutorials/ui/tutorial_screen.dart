import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/auth/session.dart';
import '../../../core/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/feature_routes.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/glass.dart';
import '../../../core/widgets/images.dart';
import '../../../core/widgets/sym.dart';
import '../../qa/ui/content_direction.dart';
import '../../qa/ui/qa_format.dart';
import '../../qa/ui/widgets/qa_widgets.dart';
import '../data/tutorial_models.dart';
import '../data/tutorials_api.dart';
import 'tutorial_widgets.dart';

class _TutorialController extends AsyncNotifier<Tutorial> {
  _TutorialController(this.id);

  final String id;

  @override
  Future<Tutorial> build() => ref.read(tutorialsApiProvider).tutorial(id);

  Future<void> bookmark(bool saved) async {
    final t = state.value;
    if (t == null) return;
    state = AsyncData(
      Tutorial(
        summary: t.summary.copyWith(bookmarked: saved),
        body: t.body,
        videoUrl: t.videoUrl,
      ),
    );
    try {
      await ref.read(tutorialsApiProvider).bookmark(t.id, saved: saved);
    } catch (_) {
      state = AsyncData(t);
      rethrow;
    }
  }
}

final tutorialProvider =
    AsyncNotifierProvider.family<_TutorialController, Tutorial, String>(
      _TutorialController.new,
    );

/// A tutorial: its cover (a video's with Play), its kind, level, language
/// and length, its title and its text. Every tutorial is free.
class TutorialScreen extends ConsumerWidget {
  const TutorialScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final tutorial = ref.watch(tutorialProvider(id));
    final t = tutorial.value;
    return Scaffold(
      backgroundColor: p.screen,
      body: switch (tutorial) {
        AsyncError() => SafeArea(
          child: Center(
            child: TextButton(
              onPressed: () => ref.invalidate(tutorialProvider(id)),
              child: Text(l.commonRetry),
            ),
          ),
        ),
        _ when t == null => const Center(child: CircularProgressIndicator()),
        _ => CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _Cover(tutorial: t)),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        QaChip.section(t.summary.section.name),
                        QaChip.tag(levelLabel(context, t.summary.level)),
                        QaChip.tag(languageName(t.summary.language)),
                        for (final tag in t.summary.tags) QaChip.tag(tag.name),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      t.summary.title,
                      textDirection: contentDirection(t.summary.title),
                      style: TextStyle(
                        fontSize: 22,
                        height: 1.35,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -.4,
                        color: p.ink,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const Sym(
                          Symbols.verified_rounded,
                          size: 16,
                          fill: true,
                          color: Brand.mint,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          '${l.tutOfficial} · ${kindLine(context, t.summary)}'
                          ' · ${shortAge(context, t.summary.publishedAt)}',
                          style: TextStyle(fontSize: 12, color: p.muted),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (t.summary.kind == TutorialKind.video &&
                        t.videoUrl != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: _WatchButton(url: t.videoUrl!),
                      ),
                    if (t.body.isNotEmpty)
                      Text(
                        t.body,
                        textDirection: contentDirection(t.body),
                        style: TextStyle(
                          fontSize: 15,
                          height: 1.65,
                          color: p.soft,
                        ),
                      ),
                    SizedBox(
                      height: 120 + MediaQuery.paddingOf(context).bottom,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      },
    );
  }
}

class _Cover extends ConsumerWidget {
  const _Cover({required this.tutorial});

  final Tutorial tutorial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final t = tutorial.summary;
    final top = MediaQuery.paddingOf(context).top;
    final signedIn = ref.watch(meProvider) != null;
    return SizedBox(
      height: 300 + top,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Container(
            decoration: BoxDecoration(
              color: Brand.indigo,
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(34),
              ),
              image: t.coverUrl == null
                  ? null
                  : DecorationImage(
                      image: imageOf(t.coverUrl!),
                      fit: BoxFit.cover,
                    ),
            ),
          ),
          const DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(34)),
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x8C0E0D24),
                  Color(0x000E0D24),
                  Color(0x990E0D24),
                ],
                stops: [0, .45, 1],
              ),
            ),
          ),
          Positioned(
            top: top + 4,
            left: 18,
            right: 18,
            child: Row(
              children: [
                IconBtn(
                  icon: Directionality.of(context) == TextDirection.rtl
                      ? Symbols.arrow_forward_rounded
                      : Symbols.arrow_back_rounded,
                  label: l.commonBack,
                  onTap: () => context.canPop()
                      ? context.pop()
                      : context.go(FeatureLinks.learn),
                ),
                const Spacer(),
                if (signedIn)
                  IconBtn(
                    icon: Symbols.bookmark_rounded,
                    fill: t.bookmarked,
                    label: t.bookmarked ? l.qaSaved : l.qaSave,
                    onTap: () => ref
                        .read(tutorialProvider(t.id).notifier)
                        .bookmark(!t.bookmarked),
                  ),
              ],
            ),
          ),
          if (t.kind == TutorialKind.video)
            Center(
              child: Semantics(
                button: true,
                label: l.tutWatch,
                child: GestureDetector(
                  onTap: () => _watch(context, ref, tutorial.videoUrl),
                  child: const PhotoGlass(
                    radius: 36,
                    child: SizedBox(
                      width: 72,
                      height: 72,
                      child: Sym(
                        Symbols.play_arrow_rounded,
                        size: 40,
                        fill: true,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

Future<void> _watch(BuildContext context, WidgetRef ref, String? url) async {
  if (url == null) return;
  final ok = await ref.read(openExternalProvider)(Uri.parse(url));
  if (!ok && context.mounted) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(context.l10n.tutCannotOpen)));
  }
}

class _WatchButton extends ConsumerWidget {
  const _WatchButton({required this.url});

  final String url;

  @override
  Widget build(BuildContext context, WidgetRef ref) => SizedBox(
    height: 50,
    width: double.infinity,
    child: DecoratedBox(
      decoration: BoxDecoration(
        gradient: Brand.signUp,
        borderRadius: BorderRadius.circular(16),
      ),
      child: TextButton.icon(
        onPressed: () => _watch(context, ref, url),
        icon: const Sym(Symbols.play_circle_rounded, size: 22, fill: true),
        label: Text(
          context.l10n.tutWatch,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        style: TextButton.styleFrom(
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    ),
  );
}
