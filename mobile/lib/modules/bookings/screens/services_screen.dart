import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/bookings_providers.dart';
import '../widgets/booking_widgets.dart';

/// The Book tab: every service customers can book, by category and search.
class ServicesScreen extends ConsumerStatefulWidget {
  const ServicesScreen({super.key, this.initialCategory});

  final int? initialCategory;

  @override
  ConsumerState<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends ConsumerState<ServicesScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  late ServicesQuery _query = (search: '', category: widget.initialCategory);

  @override
  void didUpdateWidget(ServicesScreen old) {
    super.didUpdateWidget(old);
    if (old.initialCategory != widget.initialCategory) {
      _query = (search: _query.search, category: widget.initialCategory);
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _searchChanged(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      setState(() => _query = (search: text.trim(), category: _query.category));
    });
  }

  void _category(int? id) =>
      setState(() => _query = (search: _query.search, category: id));

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final categories = ref.watch(serviceCategoriesProvider).value ?? const [];
    final state = ref.watch(servicesProvider(_query));
    final notifier = ref.read(servicesProvider(_query).notifier);

    final Widget list;
    if (state.isInitialLoading) {
      list = const LoadingView(label: 'Loading services');
    } else if (state.error != null && state.items.isEmpty) {
      list = ErrorView(error: state.error!, onRetry: notifier.retry);
    } else if (state.items.isEmpty) {
      list = MessageView(
        icon: AppIcons.book,
        title: _query.search.isEmpty ? 'No services yet' : 'No matches',
        message: _query.search.isEmpty
            ? 'Services you can book will show up here.'
            : 'Try another word.',
      );
    } else {
      list = RefreshIndicator(
        onRefresh: notifier.refresh,
        child: NotificationListener<ScrollNotification>(
          onNotification: (n) {
            if (n.metrics.extentAfter < 300 && state.hasMore) {
              notifier.loadMore();
            }
            return false;
          },
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            itemCount: state.items.length + (state.hasMore ? 1 : 0),
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              if (i >= state.items.length) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              final service = state.items[i];
              return ServiceTile(
                service: service,
                onTap: () => context.push(Paths.service(service.id)),
              );
            },
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Semantics(
                header: true,
                child: Text(
                  'Book',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: TextField(
                controller: _search,
                onChanged: _searchChanged,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Search services',
                  prefixIcon: AppIcon(AppIcons.search, color: p.textSecondary),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(context.shapes.button),
                  ),
                ),
              ),
            ),
            if (categories.isNotEmpty)
              SizedBox(
                height: chipRowHeight(context),
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    PillChip(
                      label: 'All',
                      selected: _query.category == null,
                      onTap: () => _category(null),
                    ),
                    for (final c in categories) ...[
                      const SizedBox(width: 8),
                      PillChip(
                        label: c.name,
                        selected: _query.category == c.id,
                        onTap: () => _category(c.id),
                      ),
                    ],
                  ],
                ),
              ),
            const SizedBox(height: 4),
            Expanded(child: list),
          ],
        ),
      ),
    );
  }
}
