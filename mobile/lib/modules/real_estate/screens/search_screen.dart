import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/real_estate_providers.dart';
import '../widgets/listing_widgets.dart';

String sortLabel(AppLocalizations l10n, ListingSort sort) => switch (sort) {
  ListingSort.newest => l10n.sortNewest,
  ListingSort.priceAsc => l10n.sortPriceLowHigh,
  ListingSort.priceDesc => l10n.sortPriceHighLow,
  ListingSort.areaDesc => l10n.sortLargest,
};

/// The Home tab of Real estate apps: search words, purpose, filters, order
/// and the results, loading more as the user scrolls.
class ListingsSearchScreen extends ConsumerStatefulWidget {
  const ListingsSearchScreen({super.key, this.focusSearch = false});

  final bool focusSearch;

  @override
  ConsumerState<ListingsSearchScreen> createState() =>
      _ListingsSearchScreenState();
}

class _ListingsSearchScreenState extends ConsumerState<ListingsSearchScreen> {
  ListingQuery _query = const ListingQuery();
  final _search = TextEditingController();
  final _focus = FocusNode();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    if (widget.focusSearch) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _focus.requestFocus();
      });
    }
  }

  @override
  void didUpdateWidget(ListingsSearchScreen old) {
    super.didUpdateWidget(old);
    if (widget.focusSearch && !old.focusSearch) _focus.requestFocus();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onSearch(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted) setState(() => _query = _query.copyWith(search: text));
    });
  }

  Future<void> _chooseSort() async {
    final p = context.palette;
    final l10n = context.l10n;
    final chosen = await showModalBottomSheet<ListingSort>(
      context: context,
      backgroundColor: p.surface,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final sort in ListingSort.values)
              ListTile(
                title: Text(
                  sortLabel(l10n, sort),
                  style: TextStyle(color: p.text),
                ),
                trailing: sort == _query.sort
                    ? AppIcon(AppIcons.check, color: p.text)
                    : null,
                onTap: () => Navigator.of(context).pop(sort),
              ),
          ],
        ),
      ),
    );
    if (chosen != null && mounted) {
      setState(() => _query = _query.copyWith(sort: chosen));
    }
  }

  Future<void> _openFilters(ListingFilters filters) async {
    final chosen = await showModalBottomSheet<ListingQuery>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: context.palette.surface,
      builder: (context) => FiltersSheet(filters: filters, query: _query),
    );
    if (chosen != null && mounted) setState(() => _query = chosen);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final filters = ref.watch(listingFiltersProvider).value;
    final state = ref.watch(listingsProvider(_query));
    final controller = ref.read(listingsProvider(_query).notifier);
    final purposes = filters?.purposes ?? ListingPurpose.values;
    final count = _query.filterCount;
    final siteName = ref.watch(appConfigProvider).site.name;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: siteName),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _search,
                      focusNode: _focus,
                      textInputAction: TextInputAction.search,
                      onChanged: _onSearch,
                      onSubmitted: (text) {
                        _debounce?.cancel();
                        setState(() => _query = _query.copyWith(search: text));
                      },
                      decoration: InputDecoration(
                        hintText: l10n.searchListingsHint,
                        prefixIcon: AppIcon(
                          AppIcons.search,
                          size: 20,
                          color: p.textSecondary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Badge(
                    isLabelVisible: count > 0,
                    label: Text('$count'),
                    backgroundColor: p.accent,
                    textColor: p.onAccent,
                    child: SquareIconButton(
                      icon: AppIcons.filters,
                      label: count > 0
                          ? l10n.filtersActive(count)
                          : l10n.filters,
                      size: 50,
                      radius: context.shapes.button,
                      onPressed: filters == null
                          ? null
                          : () => _openFilters(filters),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SquareIconButton(
                    icon: AppIcons.sort,
                    label: l10n.sortBy(sortLabel(l10n, _query.sort)),
                    size: 50,
                    radius: context.shapes.button,
                    onPressed: _chooseSort,
                  ),
                ],
              ),
            ),
            SizedBox(
              height: chipRowHeight(context),
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  PillChip(
                    label: l10n.filterAll,
                    selected: _query.purpose == null,
                    onTap: () => setState(
                      () => _query = _query.copyWith(clearPurpose: true),
                    ),
                  ),
                  for (final purpose in purposes) ...[
                    const SizedBox(width: 8),
                    PillChip(
                      label: purposeLabel(l10n, purpose),
                      selected: _query.purpose == purpose,
                      onTap: () => setState(
                        () => _query = _query.copyWith(purpose: purpose),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(listingFiltersProvider);
                  await controller.refresh();
                },
                child: _results(context, state, controller),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _results(
    BuildContext context,
    PagedState<ListingSummary> state,
    ListingsController controller,
  ) {
    final l10n = context.l10n;
    final error = state.error;
    if (state.isInitialLoading) {
      return LoadingView(label: l10n.loadingListings);
    }
    if (error != null && state.items.isEmpty) {
      return ListView(
        children: [
          SizedBox(
            height: 400,
            child: ErrorView(error: error, onRetry: controller.retry),
          ),
        ],
      );
    }
    if (state.isEmpty) {
      return ListView(
        children: [
          SizedBox(
            height: 400,
            child: MessageView(
              icon: AppIcons.search,
              title: l10n.noListingsTitle,
              message: l10n.noListingsMessage,
            ),
          ),
        ],
      );
    }
    return ListingGrid(
      listings: state.items,
      loadingMore: state.hasMore && error == null,
      onNearEnd: controller.loadMore,
    );
  }
}

/// The filter sheet: type, place, price, area, bedrooms and bathrooms.
/// Pops with the new query, or nothing when dismissed.
class FiltersSheet extends ConsumerStatefulWidget {
  const FiltersSheet({super.key, required this.filters, required this.query});

  final ListingFilters filters;
  final ListingQuery query;

  @override
  ConsumerState<FiltersSheet> createState() => _FiltersSheetState();
}

class _FiltersSheetState extends ConsumerState<FiltersSheet> {
  late String? _type = widget.query.type;
  late String? _city = widget.query.city;
  late String? _district = widget.query.district;
  late int? _bedrooms = widget.query.bedrooms;
  late int? _bathrooms = widget.query.bathrooms;
  late final _minPrice = TextEditingController(
    text: _number(widget.query.minPrice),
  );
  late final _maxPrice = TextEditingController(
    text: _number(widget.query.maxPrice),
  );
  late final _minArea = TextEditingController(
    text: _number(widget.query.minArea),
  );
  late final _maxArea = TextEditingController(
    text: _number(widget.query.maxArea),
  );

  static String _number(double? value) => value == null
      ? ''
      : (value == value.roundToDouble()
            ? value.toStringAsFixed(0)
            : value.toString());

  static double? _parse(TextEditingController c) {
    final value = double.tryParse(c.text.trim().replaceAll(',', ''));
    return (value == null || value < 0) ? null : value;
  }

  @override
  void dispose() {
    _minPrice.dispose();
    _maxPrice.dispose();
    _minArea.dispose();
    _maxArea.dispose();
    super.dispose();
  }

  void _reset() => setState(() {
    _type = null;
    _city = null;
    _district = null;
    _bedrooms = null;
    _bathrooms = null;
    for (final c in [_minPrice, _maxPrice, _minArea, _maxArea]) {
      c.clear();
    }
  });

  void _apply() => Navigator.of(context).pop(
    widget.query.withFilters(
      type: _type,
      city: _city,
      district: _district,
      minPrice: _parse(_minPrice),
      maxPrice: _parse(_maxPrice),
      minArea: _parse(_minArea),
      maxArea: _parse(_maxArea),
      bedrooms: _bedrooms,
      bathrooms: _bathrooms,
    ),
  );

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final f = widget.filters;
    final config = ref.watch(listingsConfigProvider);
    final unit = config?.areaUnit ?? AreaUnit.m2;
    final currency = config?.currency ?? '';
    final city = f.cities.where((c) => c.name == _city).firstOrNull;
    final bedroomsMax = f.bedroomsMax.clamp(1, 5);

    Widget heading(String text) => Padding(
      padding: const EdgeInsets.only(top: 18, bottom: 10),
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

    Widget chips<T>({
      required List<T?> values,
      required T? selected,
      required String Function(T? value) label,
      required ValueChanged<T?> onSelected,
    }) => Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final value in values)
          PillChip(
            label: label(value),
            selected: value == selected,
            onTap: () => setState(() => onSelected(value)),
          ),
      ],
    );

    Widget range(
      TextEditingController min,
      TextEditingController max, {
      required String minHint,
      required String maxHint,
      required String suffix,
    }) {
      InputDecoration decoration(String label, String hint) =>
          InputDecoration(labelText: label, hintText: hint, suffixText: suffix);
      final keyboard = const TextInputType.numberWithOptions(decimal: true);
      final formatters = [
        FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
      ];
      return Row(
        children: [
          Expanded(
            child: TextField(
              controller: min,
              keyboardType: keyboard,
              inputFormatters: formatters,
              decoration: decoration(l10n.minimum, minHint),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: max,
              keyboardType: keyboard,
              inputFormatters: formatters,
              decoration: decoration(l10n.maximum, maxHint),
            ),
          ),
        ],
      );
    }

    final areaSuffix = unit == AreaUnit.m2 ? 'm²' : 'ft²';
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * 0.85,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        l10n.filters,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: _reset,
                      style: TextButton.styleFrom(foregroundColor: p.link),
                      child: Text(l10n.reset),
                    ),
                  ],
                ),
              ),
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (f.types.isNotEmpty) ...[
                        heading(l10n.propertyType),
                        chips<String>(
                          values: [null, for (final t in f.types) t.key],
                          selected: _type,
                          label: (key) => key == null
                              ? l10n.filterAny
                              : f.types.firstWhere((t) => t.key == key).label,
                          onSelected: (v) => _type = v,
                        ),
                      ],
                      if (f.cities.isNotEmpty) ...[
                        heading(l10n.city),
                        chips<String>(
                          values: [null, for (final c in f.cities) c.name],
                          selected: _city,
                          label: (name) => name ?? l10n.filterAny,
                          onSelected: (v) {
                            if (v != _city) _district = null;
                            _city = v;
                          },
                        ),
                      ],
                      if (city != null && city.districts.isNotEmpty) ...[
                        heading(l10n.district),
                        chips<String>(
                          values: [null, ...city.districts],
                          selected: _district,
                          label: (name) => name ?? l10n.filterAny,
                          onSelected: (v) => _district = v,
                        ),
                      ],
                      heading(l10n.priceRange),
                      range(
                        _minPrice,
                        _maxPrice,
                        minHint: _number(f.price.min),
                        maxHint: _number(f.price.max),
                        suffix: currency,
                      ),
                      heading(l10n.areaRange),
                      range(
                        _minArea,
                        _maxArea,
                        minHint: _number(f.area.min),
                        maxHint: _number(f.area.max),
                        suffix: areaSuffix,
                      ),
                      heading(l10n.bedrooms),
                      chips<int>(
                        values: [
                          null,
                          for (var i = 1; i <= bedroomsMax; i++) i,
                        ],
                        selected: _bedrooms,
                        label: (n) => n == null ? l10n.filterAny : '$n+',
                        onSelected: (v) => _bedrooms = v,
                      ),
                      heading(l10n.bathrooms),
                      chips<int>(
                        values: const [null, 1, 2, 3, 4],
                        selected: _bathrooms,
                        label: (n) => n == null ? l10n.filterAny : '$n+',
                        onSelected: (v) => _bathrooms = v,
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                child: PrimaryButton(
                  label: l10n.showResults,
                  onPressed: _apply,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
