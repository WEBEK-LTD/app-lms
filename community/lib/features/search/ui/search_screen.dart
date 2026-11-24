import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models.dart';
import '../../../core/l10n.dart';
import '../../../core/routing/feature_routes.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/badge_mark.dart';
import '../../../core/widgets/glass.dart';
import '../../../core/widgets/sym.dart';
import '../../qa/state/questions_controller.dart';
import '../../qa/ui/content_direction.dart';
import '../../qa/ui/questions_screen.dart';
import '../../qa/ui/widgets/member_avatar.dart';
import '../../tutorials/data/tutorial_models.dart';
import '../../tutorials/ui/tutorial_widgets.dart';
import '../data/search_api.dart';

/// The header's search: questions, tutorials, members and tags, as the
/// member types.
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _query = TextEditingController();
  Timer? _debounce;
  SearchResults? _results;
  var _searched = '';
  var _failed = false;

  @override
  void dispose() {
    _debounce?.cancel();
    _query.dispose();
    super.dispose();
  }

  void _changed(String text) {
    _debounce?.cancel();
    final q = text.trim();
    if (q.length < 2) {
      setState(() {
        _results = null;
        _searched = '';
      });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () async {
      try {
        final r = await ref.read(searchApiProvider).search(q);
        if (mounted && _query.text.trim() == q) {
          setState(() {
            _results = r;
            _searched = q;
            _failed = false;
          });
        }
      } on ApiException {
        if (mounted) setState(() => _failed = true);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final r = _results;
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
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _query,
                      autofocus: true,
                      onChanged: _changed,
                      textInputAction: TextInputAction.search,
                      decoration: InputDecoration(
                        hintText: l.qaSearchHint,
                        prefixIcon: const Padding(
                          padding: EdgeInsetsDirectional.only(
                            start: 12,
                            end: 6,
                          ),
                          child: Sym(Symbols.search, size: 22),
                        ),
                        prefixIconConstraints: const BoxConstraints(
                          minWidth: 40,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          vertical: 12,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: r == null
                  ? (_failed
                        ? Center(child: Text(l.commonError))
                        : const SizedBox.shrink())
                  : r.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Text(
                          l.qaSearchEmpty(_searched),
                          textAlign: TextAlign.center,
                          style: TextStyle(color: p.muted),
                        ),
                      ),
                    )
                  : ResultsList(results: r),
            ),
          ],
        ),
      ),
    );
  }
}

/// Search results or saved things, by kind.
class ResultsList extends ConsumerWidget {
  const ResultsList({super.key, required this.results});

  final SearchResults results;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    Widget heading(String text) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 8),
      child: Text(
        text.toUpperCase(),
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w600,
          letterSpacing: .6,
          color: p.muted,
        ),
      ),
    );
    return ListView(
      padding: EdgeInsets.only(
        bottom: 120 + MediaQuery.paddingOf(context).bottom,
      ),
      children: [
        if (results.questions.isNotEmpty) ...[
          heading(l.qaSearchQuestions),
          for (final q in results.questions)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: QuestionCard(question: q),
            ),
        ],
        if (results.tutorials.isNotEmpty) ...[
          heading(l.qaSearchTutorials),
          for (final t in results.tutorials) _TutorialRow(tutorial: t),
        ],
        if (results.members.isNotEmpty) ...[
          heading(l.qaSearchMembers),
          for (final m in results.members) _MemberRow(member: m),
        ],
        if (results.tags.isNotEmpty) ...[
          heading(l.qaSearchTags),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final t in results.tags)
                  ActionChip(
                    label: Text('#${t.name}'),
                    onPressed: () {
                      // The Q&A tab, on this tag.
                      ref
                          .read(questionsQueryProvider.notifier)
                          .set(QuestionsQuery(tag: t.slug));
                      context.go(FeatureLinks.qa);
                    },
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _TutorialRow extends StatelessWidget {
  const _TutorialRow({required this.tutorial});

  final TutorialSummary tutorial;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = tutorial;
    return InkWell(
      onTap: () => context.push(FeatureLinks.tutorial(t.id)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(
                  colors: [Brand.lilac, Color(0xFF3B2BD0)],
                ),
              ),
              child: Sym(
                t.kind == TutorialKind.video
                    ? Symbols.play_circle
                    : Symbols.menu_book,
                size: 24,
                fill: true,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textDirection: contentDirection(t.title),
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: p.ink,
                    ),
                  ),
                  Text(
                    '${kindLine(context, t)} · ${levelLabel(context, t.level)}',
                    style: TextStyle(fontSize: 12, color: p.muted),
                  ),
                ],
              ),
            ),
            if (t.locked)
              Sym(Symbols.lock, size: 18, fill: true, color: p.muted),
          ],
        ),
      ),
    );
  }
}

class _MemberRow extends StatelessWidget {
  const _MemberRow({required this.member});

  final MemberSummary member;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return InkWell(
      onTap: () => context.push(Paths.member(member.id)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        child: Row(
          children: [
            MemberAvatar(member: member, size: 40),
            const SizedBox(width: 12),
            Flexible(
              child: Text(
                member.name,
                style: TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                  color: p.ink,
                ),
              ),
            ),
            if (member.badge != null) ...[
              const SizedBox(width: 4),
              BadgeMark(member.badge),
            ],
            const SizedBox(width: 8),
            Text(
              '@${member.username}',
              style: TextStyle(fontSize: 12.5, color: p.muted),
            ),
          ],
        ),
      ),
    );
  }
}
