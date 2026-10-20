import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show ProviderOrFamily;
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../shell/home_shell.dart';

final productsProvider = FutureProvider.autoDispose<List<Product>>(
  (ref) => ref.watch(apiProvider).products(ref.watch(appIdProvider)),
);
final coursesProvider = FutureProvider.autoDispose<List<Course>>(
  (ref) => ref.watch(apiProvider).courses(ref.watch(appIdProvider)),
);
final articlesProvider = FutureProvider.autoDispose<List<Article>>(
  (ref) => ref.watch(apiProvider).articles(ref.watch(appIdProvider)),
);
final listingsProvider = FutureProvider.autoDispose<List<Listing>>(
  (ref) => ref.watch(apiProvider).listings(ref.watch(appIdProvider)),
);

/// 59 Quick edits from the phone: products or the menu (price, stock,
/// available or sold out), courses (publish, add a lesson), articles and
/// listings (publish, feature). Everything else stays on the dashboard.
class CatalogScreen extends ConsumerWidget {
  const CatalogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final app = ref.watch(currentAppProvider);
    if (app == null) return const SizedBox.shrink();
    final f = app.features;
    final tabs = [
      if (f.products)
        (app.isRestaurant ? l10n.menu : l10n.products, const _ProductsTab()),
      if (f.courses) (l10n.courses, const _CoursesTab()),
      if (f.articles) (l10n.articles, const _ArticlesTab()),
      if (f.listings) (l10n.listings, const _ListingsTab()),
    ];
    if (tabs.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.catalog)),
        body: EmptyState(title: l10n.errorNotAvailable),
      );
    }
    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: Text(catalogLabel(context, app)),
          bottom: tabs.length < 2
              ? null
              : TabBar(
                  isScrollable: true,
                  tabs: [for (final t in tabs) Tab(text: t.$1)],
                ),
        ),
        body: tabs.length < 2
            ? tabs.first.$2
            : TabBarView(children: [for (final t in tabs) t.$2]),
      ),
    );
  }
}

Widget _list<T>(
  WidgetRef ref,
  AsyncValue<List<T>> value,
  ProviderOrFamily provider,
  Future<void> Function() refresh,
  Widget empty,
  Widget Function(T item) item,
) => RefreshIndicator(
  onRefresh: pullToRefresh(ref.context, refresh),
  child: AsyncBody(
    value: value,
    onRetry: () => ref.invalidate(provider),
    builder: (items) => items.isEmpty
        ? empty
        : ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (_, i) => item(items[i]),
          ),
  ),
);

class _ProductsTab extends ConsumerWidget {
  const _ProductsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final restaurant = ref.watch(currentAppProvider)?.isRestaurant ?? false;
    return _list(
      ref,
      ref.watch(productsProvider),
      productsProvider,
      () => ref.refresh(productsProvider.future),
      EmptyState(icon: AppIcons.products, title: l10n.noProducts),
      (p) => _ProductTile(product: p, restaurant: restaurant),
    );
  }
}

class _ProductTile extends ConsumerWidget {
  const _ProductTile({required this.product, required this.restaurant});

  final Product product;
  final bool restaurant;

  Future<void> _patch(
    BuildContext context,
    WidgetRef ref,
    ProductPatch patch,
  ) async {
    try {
      await ref
          .read(apiProvider)
          .updateProduct(ref.read(appIdProvider), product.id, patch);
      ref.invalidate(productsProvider);
    } on Object catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final p = product;
    final price = p.salePrice == null
        ? p.price.formatted
        : '${p.salePrice!.formatted} (${p.price.formatted})';
    final stock = p.stock == null
        ? l10n.stockUnlimited
        : l10n.stockLeft(p.stock!);
    return Panel(
      onTap: () => showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (_) => ProductSheet(product: p, restaurant: restaurant),
      ),
      padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 8, 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p.name, style: theme.textTheme.titleSmall),
                const SizedBox(height: 2),
                Text('$price · $stock', style: theme.textTheme.bodySmall),
                if (!p.available) ...[
                  const SizedBox(height: 4),
                  StatusChip(
                    restaurant ? l10n.soldOut : l10n.hidden,
                    tone: Tone.bad,
                  ),
                ],
              ],
            ),
          ),
          Semantics(
            label: restaurant
                ? l10n.availableToOrder(p.name)
                : l10n.shownInApp(p.name),
            child: Switch(
              value: p.available,
              onChanged: (on) =>
                  _patch(context, ref, ProductPatch(available: on)),
            ),
          ),
        ],
      ),
    );
  }
}

/// Price, sale price and stock, with the dashboard's rules.
class ProductSheet extends ConsumerStatefulWidget {
  const ProductSheet({
    super.key,
    required this.product,
    required this.restaurant,
  });

  final Product product;
  final bool restaurant;

  @override
  ConsumerState<ProductSheet> createState() => _ProductSheetState();
}

class _ProductSheetState extends ConsumerState<ProductSheet> {
  late final _price = TextEditingController(text: widget.product.price.major);
  late final _sale = TextEditingController(
    text: widget.product.salePrice?.major ?? '',
  );
  late final _stock = TextEditingController(
    text: widget.product.stock?.toString() ?? '',
  );
  late bool _available = widget.product.available;
  Map<String, String> _errors = const {};
  bool _busy = false;

  @override
  void dispose() {
    _price.dispose();
    _sale.dispose();
    _stock.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = context.l10n;
    final stockText = _stock.text.trim();
    final stock = int.tryParse(stockText);
    if (stockText.isNotEmpty && stock == null) {
      setState(() => _errors = {'stock': l10n.stockInvalid});
      return;
    }
    final sale = _sale.text.trim().replaceAll(',', '.');
    setState(() {
      _busy = true;
      _errors = const {};
    });
    try {
      await ref
          .read(apiProvider)
          .updateProduct(
            ref.read(appIdProvider),
            widget.product.id,
            ProductPatch(
              price: _price.text.trim().replaceAll(',', '.'),
              salePrice: sale.isEmpty ? null : sale,
              clearSalePrice: sale.isEmpty && widget.product.salePrice != null,
              stock: stock,
              unlimitedStock: stockText.isEmpty,
              available: _available,
            ),
          );
      ref.invalidate(productsProvider);
      if (mounted) {
        showMessage(context, l10n.saved);
        Navigator.pop(context);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _errors = e.fieldErrors);
      if (e.fieldErrors.isEmpty) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final currency = widget.product.price.currency;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.product.name,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _price,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: InputDecoration(
                labelText: l10n.priceIn(currency),
                errorText: _errors['price'],
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _sale,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: InputDecoration(
                labelText: l10n.salePriceIn(currency),
                helperText: l10n.salePriceHelp,
                errorText: _errors['sale_price'],
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _stock,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: l10n.stock,
                helperText: l10n.stockHelp,
                errorText: _errors['stock'],
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _available,
              onChanged: (v) => setState(() => _available = v),
              title: Text(
                widget.restaurant ? l10n.availableNotSoldOut : l10n.showInApp,
              ),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: Text(l10n.save),
            ),
          ],
        ),
      ),
    );
  }
}

class _CoursesTab extends ConsumerWidget {
  const _CoursesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return _list(
      ref,
      ref.watch(coursesProvider),
      coursesProvider,
      () => ref.refresh(coursesProvider.future),
      EmptyState(icon: AppIcons.courses, title: l10n.noCourses),
      (c) => _CourseCard(course: c),
    );
  }
}

class _CourseCard extends ConsumerWidget {
  const _CourseCard({required this.course});

  final Course course;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final c = course;
    return Panel(
      padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.title, style: theme.textTheme.titleSmall),
                    Text(
                      '${l10n.studentsCount(c.students)} · ${l10n.lessonsCount(c.lessonCount)} · ${c.price.amountCents == 0 ? l10n.free : c.price.formatted}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Semantics(
                label: l10n.publishedSwitch(c.title),
                child: Switch(
                  value: c.published,
                  onChanged: (on) async {
                    try {
                      await ref
                          .read(apiProvider)
                          .updateCourse(
                            ref.read(appIdProvider),
                            c.id,
                            published: on,
                          );
                      ref.invalidate(coursesProvider);
                    } on Object catch (e) {
                      if (context.mounted) showError(context, e);
                    }
                  },
                ),
              ),
            ],
          ),
          StatusChip(
            c.published ? l10n.statusPublished : l10n.statusDraft,
            tone: c.published ? Tone.good : Tone.warn,
          ),
          for (final topic in c.topics)
            Theme(
              data: theme.copyWith(dividerColor: Colors.transparent),
              child: ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: Text(topic.title, style: theme.textTheme.titleSmall),
                subtitle: Text(l10n.lessonsCount(topic.lessons.length)),
                children: [
                  for (final lesson in topic.lessons)
                    ListTile(
                      dense: true,
                      leading: Icon(
                        lesson.video == 'none'
                            ? AppIcons.articles
                            : AppIcons.movie,
                        size: 20,
                      ),
                      title: Text(lesson.title),
                      subtitle: lesson.durationMinutes == null
                          ? null
                          : Text(l10n.minutes(lesson.durationMinutes!)),
                      trailing: lesson.preview
                          ? StatusChip(l10n.freePreview)
                          : null,
                    ),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: TextButton.icon(
                      onPressed: () =>
                          context.push(Paths.addLesson(c.id, topic.id)),
                      icon: const Icon(AppIcons.add),
                      label: Text(l10n.addLesson),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ArticlesTab extends ConsumerWidget {
  const _ArticlesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    Future<void> update(Article a, {String? status, bool? featured}) async {
      try {
        await ref
            .read(apiProvider)
            .updateArticle(
              ref.read(appIdProvider),
              a.id,
              status: status,
              featured: featured,
            );
        ref.invalidate(articlesProvider);
      } on Object catch (e) {
        if (context.mounted) showError(context, e);
      }
    }

    return _list(
      ref,
      ref.watch(articlesProvider),
      articlesProvider,
      () => ref.refresh(articlesProvider.future),
      EmptyState(icon: AppIcons.articles, title: l10n.noArticles),
      (a) => Panel(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 4, 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(a.title, style: theme.textTheme.titleSmall),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    children: [
                      StatusChip(switch (a.status) {
                        'published' => l10n.statusPublished,
                        'scheduled' => l10n.statusScheduled,
                        _ => l10n.statusDraft,
                      }, tone: StatusChip.toneOf(a.status)),
                      if (a.featured)
                        StatusChip(l10n.featured, tone: Tone.info),
                    ],
                  ),
                ],
              ),
            ),
            PopupMenuButton<String>(
              tooltip: l10n.moreActions,
              onSelected: (v) => switch (v) {
                'publish' => update(a, status: 'published'),
                'draft' => update(a, status: 'draft'),
                'feature' => update(a, featured: true),
                _ => update(a, featured: false),
              },
              itemBuilder: (_) => [
                if (a.status != 'published')
                  PopupMenuItem(value: 'publish', child: Text(l10n.publish)),
                if (a.status != 'draft')
                  PopupMenuItem(value: 'draft', child: Text(l10n.unpublish)),
                PopupMenuItem(
                  value: a.featured ? 'unfeature' : 'feature',
                  child: Text(a.featured ? l10n.unfeature : l10n.feature),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ListingsTab extends ConsumerWidget {
  const _ListingsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    Future<void> update(Listing l, {String? status, bool? featured}) async {
      try {
        await ref
            .read(apiProvider)
            .updateListing(
              ref.read(appIdProvider),
              l.id,
              status: status,
              featured: featured,
            );
        ref.invalidate(listingsProvider);
      } on Object catch (e) {
        if (context.mounted) showError(context, e);
      }
    }

    return _list(
      ref,
      ref.watch(listingsProvider),
      listingsProvider,
      () => ref.refresh(listingsProvider.future),
      EmptyState(icon: AppIcons.listings, title: l10n.noListings),
      (l) => Panel(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 4, 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l.title, style: theme.textTheme.titleSmall),
                  Text(
                    '${l.price} · ${l.city}',
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    children: [
                      StatusChip(switch (l.status) {
                        'published' => l10n.statusPublished,
                        'archived' => l10n.statusArchived,
                        _ => l10n.statusDraft,
                      }, tone: StatusChip.toneOf(l.status)),
                      if (l.featured)
                        StatusChip(l10n.featured, tone: Tone.info),
                    ],
                  ),
                ],
              ),
            ),
            PopupMenuButton<String>(
              tooltip: l10n.moreActions,
              onSelected: (v) => switch (v) {
                'publish' => update(l, status: 'published'),
                'draft' => update(l, status: 'draft'),
                'archive' => update(l, status: 'archived'),
                'feature' => update(l, featured: true),
                _ => update(l, featured: false),
              },
              itemBuilder: (_) => [
                if (l.status != 'published')
                  PopupMenuItem(value: 'publish', child: Text(l10n.publish)),
                if (l.status == 'published')
                  PopupMenuItem(value: 'draft', child: Text(l10n.unpublish)),
                if (l.status != 'archived')
                  PopupMenuItem(value: 'archive', child: Text(l10n.archive)),
                PopupMenuItem(
                  value: l.featured ? 'unfeature' : 'feature',
                  child: Text(l.featured ? l10n.unfeature : l10n.feature),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
