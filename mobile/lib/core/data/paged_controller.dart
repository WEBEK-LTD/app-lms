import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/models.dart';

/// A list that loads page by page.
class PagedState<T> {
  const PagedState({
    this.items = const [],
    this.page = 0,
    this.totalPages = 1,
    this.total = 0,
    this.loading = false,
    this.error,
  });

  final List<T> items;
  final int page;
  final int totalPages;
  final int total;
  final bool loading;
  final Object? error;

  bool get hasMore => page < totalPages;
  bool get isInitialLoading => loading && items.isEmpty;
  bool get isEmpty => !loading && error == null && items.isEmpty && page > 0;

  PagedState<T> copyWith({
    List<T>? items,
    int? page,
    int? totalPages,
    int? total,
    bool? loading,
    Object? error,
    bool clearError = false,
  }) => PagedState<T>(
    items: items ?? this.items,
    page: page ?? this.page,
    totalPages: totalPages ?? this.totalPages,
    total: total ?? this.total,
    loading: loading ?? this.loading,
    error: clearError ? null : (error ?? this.error),
  );
}

/// Loads [fetch] pages on demand. Subclasses say how to fetch a page.
abstract class PagedController<T> extends Notifier<PagedState<T>> {
  int _generation = 0;

  Future<Paged<T>> fetch(int page);

  @override
  PagedState<T> build() {
    Future.microtask(refresh);
    return PagedState<T>(loading: true);
  }

  /// Reloads from the first page.
  Future<void> refresh() async {
    final generation = ++_generation;
    state = PagedState<T>(loading: true);
    await _load(1, generation, replace: true);
  }

  /// Loads the next page, if there is one and nothing is loading.
  Future<void> loadMore() async {
    if (state.loading || !state.hasMore || state.error != null) return;
    state = state.copyWith(loading: true);
    await _load(state.page + 1, _generation, replace: false);
  }

  Future<void> retry() => state.items.isEmpty ? refresh() : _retryMore();

  Future<void> _retryMore() async {
    state = state.copyWith(loading: true, clearError: true);
    await _load(state.page + 1, _generation, replace: false);
  }

  Future<void> _load(int page, int generation, {required bool replace}) async {
    try {
      final result = await fetch(page);
      if (!ref.mounted || generation != _generation) return;
      state = PagedState<T>(
        items: replace ? result.items : [...state.items, ...result.items],
        page: result.meta.page,
        totalPages: result.meta.totalPages,
        total: result.meta.total,
      );
    } on Object catch (e) {
      if (!ref.mounted || generation != _generation) return;
      state = state.copyWith(loading: false, error: e);
    }
  }
}
