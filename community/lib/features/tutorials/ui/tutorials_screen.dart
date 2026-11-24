import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n.dart';
import '../../../core/theme/tokens.dart';
import '../../qa/data/qa_models.dart';
import '../data/tutorial_models.dart';
import '../data/tutorials_api.dart';
import 'tutorial_widgets.dart';

/// What the Learn tab shows: a kind, a level, a language, a section.
class TutorialsQuery {
  const TutorialsQuery({this.kind, this.level, this.language, this.section});

  final TutorialKind? kind;
  final TutorialLevel? level;
  final String? language;
  final String? section;

  @override
  bool operator ==(Object other) =>
      other is TutorialsQuery &&
      other.kind == kind &&
      other.level == level &&
      other.language == language &&
      other.section == section;

  @override
  int get hashCode => Object.hash(kind, level, language, section);
}

class _QueryController extends Notifier<TutorialsQuery> {
  @override
  TutorialsQuery build() => const TutorialsQuery();
  void set(TutorialsQuery q) => state = q;
}

final tutorialsQueryProvider =
    NotifierProvider<_QueryController, TutorialsQuery>(_QueryController.new);

final tutorialsProvider =
    FutureProvider.family<Paged<TutorialSummary>, TutorialsQuery>(
      (ref, q) => ref
          .watch(tutorialsApiProvider)
          .tutorials(
            kind: q.kind,
            level: q.level,
            language: q.language,
            section: q.section,
          ),
    );

final tutorialSectionsProvider = FutureProvider<List<SectionRef>>(
  (ref) => ref.watch(tutorialsApiProvider).sections(),
);

/// The Learn tab: official tutorials, articles and videos, by section,
/// level and language, in the design's featured cards.
class TutorialsScreen extends ConsumerWidget {
  const TutorialsScreen({super.key, this.header});

  final Widget? header;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final q = ref.watch(tutorialsQueryProvider);
    final page = ref.watch(tutorialsProvider(q));
    final sections = ref.watch(tutorialSectionsProvider).value ?? const [];
    void set(TutorialsQuery next) =>
        ref.read(tutorialsQueryProvider.notifier).set(next);
    TutorialsQuery copy({
      TutorialKind? Function()? kind,
      TutorialLevel? Function()? level,
      String? Function()? language,
      String? Function()? section,
    }) => TutorialsQuery(
      kind: kind == null ? q.kind : kind(),
      level: level == null ? q.level : level(),
      language: language == null ? q.language : language(),
      section: section == null ? q.section : section(),
    );
    return Scaffold(
      backgroundColor: p.screen,
      body: Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 330,
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(-.8, -.9),
                    radius: .9,
                    colors: [
                      Brand.lilac.withValues(alpha: p.dark ? .3 : .24),
                      Brand.lilac.withValues(alpha: 0),
                    ],
                    stops: const [0, .7],
                  ),
                ),
              ),
            ),
          ),
          SafeArea(
            bottom: false,
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(tutorialsProvider(q).future),
              child: CustomScrollView(
                slivers: [
                  if (header != null) SliverToBoxAdapter(child: header),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l.tutSubtitle,
                            style: TextStyle(fontSize: 13, color: p.muted),
                          ),
                          Text(
                            l.tutTitle,
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -.5,
                              color: p.ink,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: _Chips(
                      children: [
                        _Choice(
                          label: l.tutAllKinds,
                          on: q.kind == null,
                          onTap: () => set(copy(kind: () => null)),
                        ),
                        for (final k in TutorialKind.values)
                          _Choice(
                            label: k == TutorialKind.video
                                ? l.tutVideo
                                : l.tutArticle,
                            on: q.kind == k,
                            onTap: () => set(copy(kind: () => k)),
                          ),
                        for (final v in TutorialLevel.values)
                          _Choice(
                            label: levelLabel(context, v),
                            on: q.level == v,
                            quiet: true,
                            onTap: () =>
                                set(copy(level: () => q.level == v ? null : v)),
                          ),
                      ],
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: _Chips(
                      children: [
                        for (final s in sections)
                          _Choice(
                            label: s.name,
                            quiet: true,
                            on: q.section == s.slug,
                            onTap: () => set(
                              copy(
                                section: () =>
                                    q.section == s.slug ? null : s.slug,
                              ),
                            ),
                          ),
                        for (final code in const ['en', 'ar', 'tr'])
                          _Choice(
                            label: languageName(code),
                            quiet: true,
                            on: q.language == code,
                            onTap: () => set(
                              copy(
                                language: () =>
                                    q.language == code ? null : code,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  switch (page) {
                    AsyncData(:final value) when value.items.isEmpty =>
                      SliverFillRemaining(
                        hasScrollBody: false,
                        child: Center(
                          child: Text(
                            l.tutEmpty,
                            style: TextStyle(color: p.muted),
                          ),
                        ),
                      ),
                    AsyncData(:final value) => SliverList.builder(
                      itemCount: value.items.length,
                      itemBuilder: (_, i) => Padding(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 14),
                        child: TutorialCard(tutorial: value.items[i]),
                      ),
                    ),
                    AsyncError() => SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(
                        child: TextButton(
                          onPressed: () => ref.invalidate(tutorialsProvider(q)),
                          child: Text(l.commonRetry),
                        ),
                      ),
                    ),
                    _ => const SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  },
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 120 + MediaQuery.paddingOf(context).bottom,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Chips extends StatelessWidget {
  const _Chips({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 46,
    child: ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      itemCount: children.length,
      separatorBuilder: (_, _) => const SizedBox(width: 8),
      itemBuilder: (_, i) => children[i],
    ),
  );
}

class _Choice extends StatelessWidget {
  const _Choice({
    required this.label,
    required this.on,
    required this.onTap,
    this.quiet = false,
  });

  final String label;
  final bool on;
  final bool quiet;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      selected: on,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: on ? p.tabOn : null,
            color: on
                ? null
                : quiet
                ? (p.dark ? const Color(0x0BFFFFFF) : const Color(0x99FFFFFF))
                : (p.dark ? const Color(0x14FFFFFF) : Colors.white),
            borderRadius: BorderRadius.circular(13),
            border: on
                ? null
                : Border.all(
                    color: p.dark
                        ? const Color(0x14FFFFFF)
                        : const Color(0x0F141327),
                  ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: on ? FontWeight.w700 : FontWeight.w500,
              color: on ? Colors.white : p.ink,
            ),
          ),
        ),
      ),
    );
  }
}
