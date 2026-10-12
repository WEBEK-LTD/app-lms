import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/lms_providers.dart';
import '../../../core/data/paged_controller.dart';
import '../navigation.dart';
import '../widgets/course_cards.dart';

String orderLabel(CourseOrder order) => switch (order) {
  CourseOrder.newest => 'Newest',
  CourseOrder.popular => 'Popular',
  CourseOrder.title => 'A to Z',
};

/// The course catalog with search, price filters, sorting and categories
/// (design: Courses).
class CoursesScreen extends ConsumerStatefulWidget {
  const CoursesScreen({
    super.key,
    this.initialCategory,
    this.initialSearch,
    this.initialOrder,
    this.focusSearch = false,
  });

  final int? initialCategory;
  final String? initialSearch;
  final CourseOrder? initialOrder;
  final bool focusSearch;

  @override
  ConsumerState<CoursesScreen> createState() => _CoursesScreenState();
}

class _CoursesScreenState extends ConsumerState<CoursesScreen> {
  late final TextEditingController _search;
  final _searchFocus = FocusNode();
  final _scroll = ScrollController();
  Timer? _debounce;
  late CourseQuery _query;

  @override
  void initState() {
    super.initState();
    _search = TextEditingController(text: widget.initialSearch ?? '');
    _query = CourseQuery(
      search: widget.initialSearch,
      category: widget.initialCategory,
      orderBy: widget.initialOrder ?? CourseOrder.newest,
    );
    _scroll.addListener(_onScroll);
    if (widget.focusSearch) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _searchFocus.requestFocus();
      });
    }
  }

  @override
  void didUpdateWidget(CoursesScreen old) {
    super.didUpdateWidget(old);
    if (old.initialCategory != widget.initialCategory ||
        old.initialOrder != widget.initialOrder) {
      setState(() {
        _query = _query.copyWith(
          category: widget.initialCategory,
          clearCategory: widget.initialCategory == null,
          orderBy: widget.initialOrder ?? _query.orderBy,
        );
      });
    }
    if (widget.focusSearch && !old.focusSearch) _searchFocus.requestFocus();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _searchFocus.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scroll.position.extentAfter < 600) {
      ref.read(coursesProvider(_query).notifier).loadMore();
    }
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      setState(
        () => _query = CourseQuery(
          search: value.trim(),
          category: _query.category,
          price: _query.price,
          orderBy: _query.orderBy,
        ),
      );
    });
  }

  void _setPrice(PriceFilter price) =>
      setState(() => _query = _query.copyWith(price: price));

  Future<void> _openFilters() async {
    final result = await showModalBottomSheet<CourseQuery>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _FilterSheet(query: _query),
    );
    if (result != null) setState(() => _query = result);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final state = ref.watch(coursesProvider(_query));
    final categories = ref.watch(categoriesProvider).value ?? const [];
    final category = categories
        .where((c) => c.id == _query.category)
        .firstOrNull;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () => ref.read(coursesProvider(_query).notifier).refresh(),
          child: CustomScrollView(
            controller: _scroll,
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                sliver: SliverList.list(
                  children: [
                    Semantics(
                      header: true,
                      child: Text(
                        category?.name ?? 'All courses',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _search,
                            focusNode: _searchFocus,
                            textInputAction: TextInputAction.search,
                            onChanged: _onSearchChanged,
                            onSubmitted: (v) {
                              _debounce?.cancel();
                              _onSearchChanged(v);
                            },
                            decoration: InputDecoration(
                              hintText: 'Course or instructor name',
                              prefixIcon: AppIcon(
                                AppIcons.search,
                                size: 20,
                                color: p.textSecondary,
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                vertical: 14,
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: BorderSide(color: p.border),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SquareIconButton(
                          icon: AppIcons.filters,
                          label: 'Filters and sorting',
                          size: 50,
                          radius: 14,
                          onPressed: _openFilters,
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 44,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          for (final price in PriceFilter.values) ...[
                            PillChip(
                              label: switch (price) {
                                PriceFilter.all => 'All',
                                PriceFilter.free => 'Free',
                                PriceFilter.paid => 'Paid',
                              },
                              selected: _query.price == price,
                              onTap: () => _setPrice(price),
                            ),
                            const SizedBox(width: 8),
                          ],
                          PillChip(
                            label: orderLabel(_query.orderBy),
                            selected: false,
                            onTap: _openFilters,
                          ),
                          if (category != null) ...[
                            const SizedBox(width: 8),
                            PillChip(
                              label: '${category.name}  ×',
                              selected: true,
                              onTap: () => setState(
                                () => _query = _query.copyWith(
                                  clearCategory: true,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
              ..._results(context, state),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _results(BuildContext context, PagedState<CourseSummary> s) {
    final items = s.items;
    final notifier = ref.read(coursesProvider(_query).notifier);
    if (s.isInitialLoading) {
      return const [
        SliverFillRemaining(hasScrollBody: false, child: LoadingView()),
      ];
    }
    if (s.error != null && items.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: ErrorView(error: s.error!, onRetry: notifier.retry),
        ),
      ];
    }
    if (items.isEmpty) {
      final filtered =
          (_query.search?.isNotEmpty ?? false) ||
          _query.category != null ||
          _query.price != PriceFilter.all;
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: MessageView(
            icon: AppIcons.search,
            title: 'No courses found',
            message: filtered
                ? 'Try a different search or clear the filters.'
                : 'Courses will show up here when they are published.',
            actionLabel: filtered ? 'Clear filters' : null,
            onAction: filtered
                ? () {
                    _search.clear();
                    setState(() => _query = const CourseQuery());
                  }
                : null,
          ),
        ),
      ];
    }
    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        sliver: SliverList.separated(
          itemCount: items.length + 1,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, i) {
            if (i < items.length) {
              return CourseListCard(
                course: items[i],
                onTap: () => openCourse(context, items[i].id),
              );
            }
            if (s.error != null) {
              return Center(
                child: TextButton(
                  onPressed: notifier.retry,
                  child: const Text('Couldn\'t load more. Try again'),
                ),
              );
            }
            if (s.hasMore) {
              return const Padding(
                padding: EdgeInsets.all(16),
                child: LoadingView(label: 'Loading more courses'),
              );
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    ];
  }
}

class _FilterSheet extends ConsumerStatefulWidget {
  const _FilterSheet({required this.query});

  final CourseQuery query;

  @override
  ConsumerState<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends ConsumerState<_FilterSheet> {
  late CourseOrder _order = widget.query.orderBy;
  late int? _category = widget.query.category;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final categories = ref.watch(categoriesProvider);
    Widget heading(String text) => Padding(
      padding: const EdgeInsets.fromLTRB(0, 8, 0, 10),
      child: Semantics(
        header: true,
        child: Text(
          text,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: p.text,
          ),
        ),
      ),
    );

    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * 0.8,
        ),
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          children: [
            heading('Sort by'),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final order in CourseOrder.values)
                  PillChip(
                    label: orderLabel(order),
                    selected: _order == order,
                    onTap: () => setState(() => _order = order),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            heading('Category'),
            switch (categories) {
              AsyncData(:final value) => Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  PillChip(
                    label: 'All',
                    selected: _category == null,
                    onTap: () => setState(() => _category = null),
                  ),
                  for (final c in value)
                    PillChip(
                      label: c.name,
                      selected: _category == c.id,
                      onTap: () => setState(() => _category = c.id),
                    ),
                ],
              ),
              AsyncError() => Text(
                "Categories couldn't be loaded.",
                style: TextStyle(color: p.textSecondary),
              ),
              _ => const LoadingView(),
            },
            const SizedBox(height: 24),
            PrimaryButton(
              label: 'Show courses',
              onPressed: () => Navigator.of(context).pop(
                CourseQuery(
                  search: widget.query.search,
                  price: widget.query.price,
                  orderBy: _order,
                  category: _category,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
