import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/l10n.dart';
import '../../../core/routing/feature_routes.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/sym.dart';
import '../data/qa_models.dart';
import '../state/questions_controller.dart';
import 'content_direction.dart';
import 'qa_format.dart';
import 'widgets/qa_widgets.dart';
import 'widgets/stand_ins.dart';

/// The Q&A tab: the questions, with filters (all, unanswered, answered,
/// official answers, following), sections and an order, and a way to ask.
/// In the design's style: the Home's soft glows, white cards with the
/// section and tag chips, the asker, the score and the answers.
class QuestionsScreen extends ConsumerWidget {
  const QuestionsScreen({super.key, this.header});

  /// The shell's header (menu, logo, search, messages, bell, the member).
  final Widget? header;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final query = ref.watch(questionsQueryProvider);
    final page = ref.watch(questionsProvider(query));
    final sections = ref.watch(qaSectionsProvider).value ?? const [];
    void set(QuestionsQuery q) =>
        ref.read(questionsQueryProvider.notifier).set(q);
    return Scaffold(
      backgroundColor: p.screen,
      body: Stack(
        children: [
          const _HomeGlow(),
          SafeArea(
            bottom: false,
            child: NotificationListener<ScrollNotification>(
              onNotification: (n) {
                if (n.metrics.extentAfter < 400) {
                  ref.read(questionsProvider(query).notifier).more();
                }
                return false;
              },
              child: RefreshIndicator(
                onRefresh: () => ref.refresh(questionsProvider(query).future),
                child: CustomScrollView(
                  slivers: [
                    if (header != null) SliverToBoxAdapter(child: header),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                l.qaTitle,
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -.5,
                                  color: p.ink,
                                ),
                              ),
                            ),
                            _AskButton(
                              onTap: () => context.push(FeatureLinks.ask),
                            ),
                          ],
                        ),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: _ChipRow(
                        children: [
                          for (final f in QuestionFilter.values)
                            _FilterChip(
                              label: _filterLabel(context, f),
                              on: query.filter == f,
                              onTap: () => set(query.copyWith(filter: f)),
                            ),
                        ],
                      ),
                    ),
                    if (sections.isNotEmpty)
                      SliverToBoxAdapter(
                        child: _ChipRow(
                          children: [
                            for (final s in sections)
                              _FilterChip(
                                label: s.name,
                                quiet: true,
                                on: query.section == s.slug,
                                onTap: () => set(
                                  query.copyWith(
                                    section: () =>
                                        query.section == s.slug ? null : s.slug,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 0, 12, 4),
                        child: Row(
                          children: [
                            if (query.tag != null)
                              InputChip(
                                label: Text('#${query.tag}'),
                                onDeleted: () =>
                                    set(query.copyWith(tag: () => null)),
                              ),
                            const Spacer(),
                            _SortMenu(
                              sort: query.sort,
                              onSort: (s) => set(query.copyWith(sort: s)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    switch (page) {
                      AsyncData(:final value) when value.items.isEmpty =>
                        SliverFillRemaining(
                          hasScrollBody: false,
                          child: Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Text(
                                l.qaEmpty,
                                textAlign: TextAlign.center,
                                style: TextStyle(color: p.muted),
                              ),
                            ),
                          ),
                        ),
                      AsyncData(:final value) => SliverList.builder(
                        itemCount: value.items.length,
                        itemBuilder: (context, i) => Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                          child: QuestionCard(
                            question: value.items[i],
                            onTag: (t) => set(query.copyWith(tag: () => t)),
                          ),
                        ),
                      ),
                      AsyncError() => SliverFillRemaining(
                        hasScrollBody: false,
                        child: Center(
                          child: TextButton(
                            onPressed: () =>
                                ref.invalidate(questionsProvider(query)),
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
          ),
        ],
      ),
    );
  }
}

String _filterLabel(BuildContext context, QuestionFilter f) {
  final l = context.l10n;
  return switch (f) {
    QuestionFilter.all => l.qaFilterAll,
    QuestionFilter.unanswered => l.qaFilterUnanswered,
    QuestionFilter.answered => l.qaFilterAnswered,
    QuestionFilter.official => l.qaFilterOfficial,
    QuestionFilter.following => l.qaFilterFollowing,
  };
}

/// The Home's glows (mobile.html `.home-bg`): orange at the top end, violet
/// at the start.
class _HomeGlow extends StatelessWidget {
  const _HomeGlow();

  @override
  Widget build(BuildContext context) {
    final dark = context.palette.dark;
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      height: 330,
      child: IgnorePointer(
        child: Stack(
          fit: StackFit.expand,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(.7, -.8),
                  radius: .8,
                  colors: [
                    Brand.orange2.withValues(alpha: dark ? .3 : .32),
                    Brand.orange2.withValues(alpha: 0),
                  ],
                  stops: const [0, .7],
                ),
              ),
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(-1, -.2),
                  radius: .9,
                  colors: [
                    Brand.lilac.withValues(alpha: dark ? .26 : .22),
                    Brand.lilac.withValues(alpha: 0),
                  ],
                  stops: const [0, .7],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AskButton extends StatelessWidget {
  const _AskButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      gradient: Brand.signUp,
      borderRadius: BorderRadius.circular(14),
      boxShadow: const [
        BoxShadow(
          color: Color(0x59FF5A1F),
          blurRadius: 18,
          offset: Offset(0, 8),
        ),
      ],
    ),
    child: Material(
      type: MaterialType.transparency,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 9, 14, 9),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Sym(Symbols.add, size: 20, color: Colors.white),
              const SizedBox(width: 4),
              Text(
                context.l10n.qaAskQuestion,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 13.5,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _ChipRow extends StatelessWidget {
  const _ChipRow({required this.children});

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

/// A filter or section chip: on, it is the tab bar's navy by day (orange
/// by night); off, quiet glass.
class _FilterChip extends StatelessWidget {
  const _FilterChip({
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
      selected: on,
      button: true,
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

class _SortMenu extends StatelessWidget {
  const _SortMenu({required this.sort, required this.onSort});

  final QuestionSort sort;
  final ValueChanged<QuestionSort> onSort;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    String label(QuestionSort s) => switch (s) {
      QuestionSort.active => l.qaSortActive,
      QuestionSort.newest => l.qaSortNewest,
      QuestionSort.votes => l.qaSortVotes,
    };
    return PopupMenuButton<QuestionSort>(
      initialValue: sort,
      onSelected: onSort,
      itemBuilder: (_) => [
        for (final s in QuestionSort.values)
          PopupMenuItem(value: s, child: Text(label(s))),
      ],
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Sym(Symbols.sort, size: 18, color: context.palette.muted),
            const SizedBox(width: 4),
            Text(
              label(sort),
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: context.palette.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A question in a list: white card (`.post`'s corners 28 and shadow), its
/// chips, title, two lines of it, the asker, and its score and answers.
class QuestionCard extends StatelessWidget {
  const QuestionCard({super.key, required this.question, this.onTag});

  final QuestionSummary question;
  final ValueChanged<String>? onTag;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final q = question;
    final quiet = p.dark ? const Color(0xFF9C98B5) : p.muted;
    // The design's card (`.post`): white, corners 28, a soft shadow; by
    // night, the question's quiet glass. An answered one has a green edge.
    return DecoratedBox(
      decoration: BoxDecoration(
        color: p.dark ? const Color(0x0BFFFFFF) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: q.accepted
            ? Border.all(color: const Color(0x592FD392))
            : p.dark
            ? Border.all(color: const Color(0x12FFFFFF))
            : null,
        boxShadow: p.dark
            ? null
            : const [
                BoxShadow(
                  color: Color(0x14141327),
                  blurRadius: 34,
                  offset: Offset(0, 14),
                ),
              ],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: () => context.push(FeatureLinks.question(q.id)),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    QaChip.section(q.section.name),
                    for (final t in q.tags)
                      QaChip.tag(t.name, onTap: () => onTag?.call(t.slug)),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  q.title,
                  textDirection: contentDirection(q.title),
                  style: TextStyle(
                    fontSize: 16.5,
                    height: 1.35,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -.3,
                    color: p.ink,
                  ),
                ),
                if (q.excerpt.isNotEmpty) ...[
                  const SizedBox(height: 5),
                  Text(
                    q.excerpt,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textDirection: contentDirection(q.excerpt),
                    style: TextStyle(fontSize: 13, height: 1.5, color: quiet),
                  ),
                ],
                if (q.status == ContentStatus.pending) ...[
                  const SizedBox(height: 6),
                  Text(
                    l.qaPending,
                    style: const TextStyle(fontSize: 11.5, color: Brand.amber),
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    MemberAvatar(member: q.author.member, size: 24),
                    const SizedBox(width: 8),
                    // The name in its own direction, then the age in the app's.
                    Flexible(
                      child: Text(
                        q.author.member.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textDirection: contentDirection(q.author.member.name),
                        style: TextStyle(fontSize: 12, color: quiet),
                      ),
                    ),
                    Text(
                      ' · ${shortAge(context, q.createdAt)}',
                      style: TextStyle(fontSize: 12, color: quiet),
                    ),
                    const Spacer(),
                    const SizedBox(width: 10),
                    Sym(Symbols.arrow_upward, size: 17, color: quiet),
                    Text(
                      '${q.score}',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: p.ink,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Sym(
                      q.accepted ? Symbols.check_circle : Symbols.chat_bubble,
                      size: 17,
                      fill: q.accepted,
                      color: q.accepted ? const Color(0xFF22C483) : quiet,
                    ),
                    const SizedBox(width: 3),
                    Text(
                      '${q.answerCount}',
                      semanticsLabel: l.qaAnswerCount(q.answerCount),
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: q.accepted ? const Color(0xFF22C483) : p.ink,
                      ),
                    ),
                    if (q.hasOfficialAnswer) ...[
                      const SizedBox(width: 10),
                      const Sym(
                        Symbols.verified,
                        size: 17,
                        fill: true,
                        color: Brand.mint,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
