import 'package:flutter/material.dart';

import '../api/models.dart';
import 'states.dart';

/// 59 A list loaded a page at a time, with pull to refresh, "Load more",
/// and the loading, error and empty states. Give it a new key to start over
/// (another filter, after a change).
class PagedList<T> extends StatefulWidget {
  const PagedList({
    super.key,
    required this.load,
    required this.itemBuilder,
    required this.empty,
    this.header,
    this.padding = const EdgeInsets.fromLTRB(16, 12, 16, 24),
    this.spacing = 10,
  });

  final Future<Paged<T>> Function(int page) load;
  final Widget Function(BuildContext context, T item) itemBuilder;
  final Widget empty;

  /// Shown above the items once the first page is in (totals, a count).
  final Widget? header;
  final EdgeInsets padding;
  final double spacing;

  @override
  State<PagedList<T>> createState() => PagedListState<T>();
}

class PagedListState<T> extends State<PagedList<T>> {
  final _items = <T>[];
  Paged<T>? _last;
  Object? _error;
  bool _loading = true;
  bool _more = false;

  @override
  void initState() {
    super.initState();
    reload();
  }

  Future<void> reload() async {
    setState(() {
      _error = null;
      if (_last == null) _loading = true;
    });
    try {
      final page = await widget.load(1);
      if (!mounted) return;
      setState(() {
        _items
          ..clear()
          ..addAll(page.items);
        _last = page;
        _loading = false;
      });
    } on Object catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (_last == null) {
          _error = e;
        } else {
          showError(context, e);
        }
      });
    }
  }

  Future<void> _loadMore() async {
    final last = _last;
    if (last == null || !last.hasMore || _more) return;
    setState(() => _more = true);
    try {
      final page = await widget.load(last.page + 1);
      if (!mounted) return;
      setState(() {
        _items.addAll(page.items);
        _last = page;
      });
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _more = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final Widget body;
    if (_loading) {
      body = const LoadingState();
    } else if (_error != null) {
      body = ErrorState(error: _error!, onRetry: reload);
    } else if (_items.isEmpty) {
      body = ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          ?widget.header,
          SizedBox(height: 360, child: widget.empty),
        ],
      );
    } else {
      final hasMore = _last?.hasMore ?? false;
      final header = widget.header;
      final count =
          _items.length + (header == null ? 0 : 1) + (hasMore ? 1 : 0);
      body = ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: widget.padding,
        itemCount: count,
        itemBuilder: (context, i) {
          if (header != null) {
            if (i == 0) return header;
            i -= 1;
          }
          if (i == _items.length) {
            return LoadMore(onPressed: _loadMore, busy: _more);
          }
          return Padding(
            padding: EdgeInsets.only(bottom: widget.spacing),
            child: widget.itemBuilder(context, _items[i]),
          );
        },
      );
    }
    return RefreshIndicator(onRefresh: reload, child: body);
  }
}
