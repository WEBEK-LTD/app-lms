import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/palette.dart';

/// 123 The parts of the premium academy's Explore (`Config.screens.looks`
/// `catalog: explore`): a large title, the search with the filters in it,
/// the subjects as icons and the chips in ink, as the approved board has
/// them, in light and dark.

/// The tab's own name for the catalog (the owner's "Explore"), else the
/// app's words.
String exploreTitle(WidgetRef ref, BuildContext context) {
  for (final tab in ref.watch(navigationProvider)?.tabs ?? const <NavTab>[]) {
    if (tab.target.type == PageActionType.screen &&
        tab.target.screen == BuiltInScreen.courses) {
      return tab.label;
    }
  }
  return context.l10n.allCourses;
}

class ExploreTitle extends StatelessWidget {
  const ExploreTitle({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) => Semantics(
    header: true,
    child: Text(
      title,
      key: const ValueKey('explore-title'),
      style: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
        color: context.palette.text,
      ),
    ),
  );
}

class ExploreSearch extends StatelessWidget {
  const ExploreSearch({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.onChanged,
    required this.onFilters,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;
  final VoidCallback onFilters;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Container(
      height: 54,
      padding: const EdgeInsetsDirectional.only(start: 14, end: 8),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: p.divider),
      ),
      child: Row(
        children: [
          Icon(Symbols.search_rounded, color: p.textSecondary),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              key: const ValueKey('explore-search'),
              controller: controller,
              focusNode: focusNode,
              textInputAction: TextInputAction.search,
              onChanged: onChanged,
              onSubmitted: onChanged,
              decoration: InputDecoration(
                hintText: l10n.exploreSearchHint,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
                isDense: true,
              ),
            ),
          ),
          Semantics(
            button: true,
            label: l10n.filtersAndSorting,
            child: InkWell(
              key: const ValueKey('explore-filters'),
              borderRadius: BorderRadius.circular(12),
              onTap: onFilters,
              child: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: p.text,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Symbols.tune_rounded, size: 20, color: p.surface),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A subject's icon, from its name in the languages the app speaks.
IconData subjectIcon(String name) {
  final n = name.toLowerCase();
  bool has(List<String> words) => words.any(n.contains);
  if (has(['design', 'تصميم', 'tasarım', 'ui', 'ux'])) {
    return Symbols.palette_rounded;
  }
  if (has(['program', 'code', 'coding', 'برمج', 'kod', 'yazılım', 'python'])) {
    return Symbols.code_rounded;
  }
  if (has(['language', 'لغ', 'english', 'إنجليز', 'dil', 'türkçe', 'عربي'])) {
    return Symbols.translate_rounded;
  }
  if (has(['business', 'أعمال', 'iş', 'manage', 'إدار', 'finance', 'مال'])) {
    return Symbols.trending_up_rounded;
  }
  if (has(['market', 'تسويق', 'pazarlama'])) return Symbols.campaign_rounded;
  if (has(['photo', 'تصوير', 'fotoğraf', 'video'])) {
    return Symbols.photo_camera_rounded;
  }
  if (has(['music', 'موسيق', 'müzik'])) return Symbols.music_note_rounded;
  if (has(['math', 'رياض', 'matematik', 'science', 'علوم'])) {
    return Symbols.calculate_rounded;
  }
  return Symbols.category_rounded;
}

class ExploreSubjects extends StatelessWidget {
  const ExploreSubjects({
    super.key,
    required this.categories,
    required this.selected,
    required this.onTap,
  });

  final List<Category> categories;
  final int? selected;
  final ValueChanged<int?> onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final gold = dark ? const Color(0xFFE2BE74) : const Color(0xFFB8893A);
    return SizedBox(
      height: 96,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, _) => const SizedBox(width: 16),
        itemBuilder: (context, i) {
          final c = categories[i];
          final on = c.id == selected;
          return Semantics(
            button: true,
            selected: on,
            label: c.name,
            child: InkWell(
              key: ValueKey('explore-subject-${c.id}'),
              borderRadius: BorderRadius.circular(20),
              onTap: () => onTap(on ? null : c.id),
              child: SizedBox(
                width: 72,
                child: Column(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: on ? p.text : p.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: p.divider),
                      ),
                      child: Icon(
                        subjectIcon(c.name),
                        size: 28,
                        color: on ? p.surface : gold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      c.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// All, free, the best rated and the newest; the open one in ink.
class ExploreChips extends StatelessWidget {
  const ExploreChips({super.key, required this.query, required this.onChanged});

  final CourseQuery query;
  final ValueChanged<CourseQuery> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final rated = query.orderBy == CourseOrder.rating;
    final chips = <(String, IconData?, bool, CourseQuery)>[
      (
        l10n.filterAll,
        null,
        query.price == PriceFilter.all && !rated,
        query.copyWith(price: PriceFilter.all, orderBy: CourseOrder.newest),
      ),
      (
        l10n.freeCourses,
        null,
        query.price == PriceFilter.free,
        query.copyWith(price: PriceFilter.free),
      ),
      (
        l10n.sortTopRated,
        Symbols.star_rounded,
        rated,
        query.copyWith(price: PriceFilter.all, orderBy: CourseOrder.rating),
      ),
      (
        l10n.sortNewest,
        null,
        false,
        query.copyWith(price: PriceFilter.all, orderBy: CourseOrder.newest),
      ),
    ];
    return SizedBox(
      height: 34,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: chips.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final (label, icon, on, next) = chips[i];
          return Semantics(
            button: true,
            selected: on,
            child: InkWell(
              key: ValueKey('explore-chip-$i'),
              borderRadius: BorderRadius.circular(999),
              onTap: () => onChanged(next),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: on ? p.text : p.text.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (icon != null) ...[
                      Icon(icon, size: 15, color: on ? p.surface : p.text),
                      const SizedBox(width: 4),
                    ],
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: on ? p.surface : p.text,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
