import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../chat/data/chat_api.dart';
import '../../chat/data/chat_media.dart';
import '../../lms/courses/community_widgets.dart' show StarRow;
import '../../lms/downloads/download_widgets.dart' show formatBytes;
import '../../lms/courses/course_reviews.dart'
    show RatingSummaryCard, ReviewCard, ReviewPhotoRow, showReviewPhoto;
import '../data/store_providers.dart';
import '../data/wishlist.dart';

/// 212 A store's wishlist heart, "Notify me when it's back", the reviews
/// with photos on a product's page and their form, and the listing
/// filters: reusable by every store look and the Studio shop types.

/// The heart on a product's card and page: saves it to the wishlist.
class WishlistHeart extends ConsumerWidget {
  const WishlistHeart({
    super.key,
    required this.productId,
    this.size = 20,
    this.onImage = true,
    this.tile = false,
  });

  final int productId;
  final double size;

  /// Over a picture: on a round chip of the card's colour.
  final bool onImage;

  /// In a product page's top bar: the same bordered square tile as the
  /// back, share and cart buttons beside it, in both themes.
  final bool tile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final saved = ref.watch(
      shopWishlistProvider.select((ids) => ids.contains(productId)),
    );
    final label = saved
        ? context.l10n.removeFromWishlist
        : context.l10n.saveToWishlist;
    Future<void> toggle() async {
      try {
        await ref.read(shopWishlistProvider.notifier).toggle(productId);
      } on Object {
        if (context.mounted) {
          showMessage(context, context.l10n.wishlistFailed);
        }
      }
    }

    if (tile) {
      return Semantics(
        toggled: saved,
        child: SquareIconButton(
          key: ValueKey('wishlist-heart-$productId'),
          icon: AppIcons.favorite,
          label: label,
          iconSize: 21,
          filled: saved,
          foreground: saved ? p.danger : null,
          onPressed: toggle,
        ),
      );
    }
    final icon = AppIcon(
      AppIcons.favorite,
      size: size,
      filled: saved,
      color: saved ? p.danger : (onImage ? p.text : p.textSecondary),
    );
    return Semantics(
      button: true,
      toggled: saved,
      label: label,
      excludeSemantics: true,
      child: Tooltip(
        message: label,
        child: InkResponse(
          key: ValueKey('wishlist-heart-$productId'),
          radius: size + 6,
          onTap: toggle,
          // A tap target of at least 44 points.
          child: SizedBox.square(
            dimension: 44,
            child: Center(
              child: onImage
                  ? DecoratedBox(
                      decoration: BoxDecoration(
                        color: p.surface.withValues(alpha: 0.92),
                        shape: BoxShape.circle,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(6),
                        child: icon,
                      ),
                    )
                  : icon,
            ),
          ),
        ),
      ),
    );
  }
}

/// Whether the hearts show: a store app (its hearts are the phone's on an
/// older server).
bool wishlistShown(WidgetRef ref) {
  try {
    return ref.watch(appConfigProvider).store != null;
  } on Object {
    return false;
  }
}

/// "Notify me when it's back" for a product out of stock, or the choice
/// made ([variationId]); "We'll tell you" once asked, which stops it.
class BackInStockButton extends ConsumerStatefulWidget {
  const BackInStockButton({
    super.key,
    required this.productId,
    required this.waiting,
    this.variationId,
  });

  final int productId;
  final int? variationId;
  final bool waiting;

  @override
  ConsumerState<BackInStockButton> createState() => _BackInStockButtonState();
}

class _BackInStockButtonState extends ConsumerState<BackInStockButton> {
  late bool _waiting = widget.waiting;
  bool _busy = false;

  @override
  void didUpdateWidget(BackInStockButton old) {
    super.didUpdateWidget(old);
    if (old.variationId != widget.variationId ||
        old.waiting != widget.waiting) {
      _waiting = widget.waiting;
    }
  }

  Future<void> _press() async {
    final l10n = context.l10n;
    if (!ref.read(authControllerProvider).isSignedIn) {
      showMessage(context, l10n.notifyMeSignIn);
      await context.push(
        Uri(
          path: Paths.signIn,
          queryParameters: {'from': Paths.product(widget.productId)},
        ).toString(),
      );
      return;
    }
    setState(() => _busy = true);
    final api = ref.read(yallappApiProvider);
    try {
      if (_waiting) {
        await api.stopWaitingForStock(
          widget.productId,
          variationId: widget.variationId,
        );
      } else {
        await api.waitForStock(
          widget.productId,
          variationId: widget.variationId,
        );
      }
      if (!mounted) return;
      setState(() => _waiting = !_waiting);
      if (_waiting) showMessage(context, l10n.notifyMeSaved);
      ref.invalidate(productProvider(widget.productId));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return _waiting
        ? SecondaryButton(
            key: const ValueKey('back-in-stock-waiting'),
            label: l10n.notifyMeWaiting,
            icon: AppIcons.notifications,
            onPressed: _busy ? null : _press,
          )
        : PrimaryButton(
            key: const ValueKey('back-in-stock'),
            label: l10n.notifyMeBack,
            icon: AppIcons.notifications,
            onPressed: _busy ? null : _press,
          );
  }
}

/// A product page's reviews: the summary with its bars, the customers'
/// photos, the first reviews, the customer's own (or Write a review, for a
/// customer who bought it) and all of them.
class ProductReviewsSection extends ConsumerWidget {
  const ProductReviewsSection({
    super.key,
    required this.productId,
    required this.preview,
  });

  final int productId;
  final ReviewsPreview preview;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final mine = preview.mine;
    final others = [
      for (final r in preview.items)
        if (!r.mine) r,
    ];
    void write() => Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            ProductReviewComposer(productId: productId, mine: preview.mine),
      ),
    );
    return Column(
      key: const ValueKey('product-reviews'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(title: l10n.reviews),
        const SizedBox(height: 10),
        if (preview.summary.ratingCount > 0)
          RatingSummaryCard(summary: preview.summary),
        if (preview.photos.isNotEmpty) ...[
          const SizedBox(height: 14),
          Text(
            l10n.reviewPhotosTitle,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          const SizedBox(height: 8),
          ReviewPhotoRow(
            key: const ValueKey('product-review-photos'),
            urls: [for (final ph in preview.photos) ph.url],
            size: 84,
          ),
        ],
        const SizedBox(height: 12),
        if (mine != null)
          ReviewCard(review: mine, onEdit: write)
        else if (preview.canReview)
          SecondaryButton(
            key: const ValueKey('write-product-review'),
            label: l10n.writeReview,
            icon: AppIcons.star,
            onPressed: write,
          )
        else if (preview.summary.ratingCount == 0)
          Text(
            l10n.reviewOnlyBuyers,
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        for (final review in others) ...[
          const SizedBox(height: 10),
          ReviewCard(review: review),
        ],
        if (preview.summary.ratingCount >
            others.length + (mine == null ? 0 : 1))
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton(
              onPressed: () => context.push(Paths.productReviews(productId)),
              child: Text(l10n.reviewsSeeAll(preview.summary.ratingCount)),
            ),
          ),
      ],
    );
  }
}

/// A review's photos sent to the shop's Media library in chunks
/// (`/store/review-uploads`), as chat files are.
class ReviewUploads implements ChunkedUploads {
  ReviewUploads(this._api, this._gate);

  final YallappApi _api;
  final MediaGate _gate;

  @override
  Future<ChatUpload> startUpload({
    required String name,
    required int size,
    required String type,
    int? durationSeconds,
  }) => _api.startReviewUpload(name: name, size: size, type: type);

  @override
  Future<ChatUpload> resumeUpload(String uploadId) =>
      _api.resumeReviewUpload(uploadId);

  @override
  Future<void> completeUpload(String uploadId) =>
      _api.completeReviewUpload(uploadId);

  @override
  Future<int> uploadOffset(String uploadUrl) => _gate.uploadOffset(uploadUrl);

  @override
  Future<int> sendChunk(String uploadUrl, int offset, List<int> bytes) =>
      _gate.sendChunk(uploadUrl, offset, bytes);
}

final reviewUploadsProvider = Provider<ChunkedUploads>(
  (ref) => ReviewUploads(ref.watch(yallappApiProvider), MediaGate.standalone()),
);

/// Writing or editing a review of a product: the stars, the words and up
/// to the shop's number of photos (kept ones stay, new ones are sent first).
class ProductReviewComposer extends ConsumerStatefulWidget {
  const ProductReviewComposer({super.key, required this.productId, this.mine});

  final int productId;
  final Review? mine;

  @override
  ConsumerState<ProductReviewComposer> createState() =>
      _ProductReviewComposerState();
}

class _ProductReviewComposerState extends ConsumerState<ProductReviewComposer> {
  late int _rating = widget.mine?.rating ?? 0;
  late final _text = TextEditingController(text: widget.mine?.text ?? '');

  /// Photos already on the review (their links) and the new ones picked.
  late final List<String> _kept = [...?widget.mine?.photos];
  final List<ChatFile> _picked = [];
  bool _sending = false;
  bool _closed = false;

  @override
  void dispose() {
    _closed = true;
    _text.dispose();
    super.dispose();
  }

  ReviewPhotoRules? get _rules {
    try {
      return ref.read(appConfigProvider).store?.reviewPhotos;
    } on Object {
      return null;
    }
  }

  int get _count => _kept.length + _picked.length;

  Future<void> _pick() async {
    final l10n = context.l10n;
    final rules = _rules;
    if (rules == null) return;
    final picked = await ref
        .read(chatPickerProvider)
        .pick(ChatPickSource.gallery);
    if (!mounted || picked == null) return;
    switch (picked) {
      case ChatPicked(:final file)
          when rules.types.isEmpty || rules.types.contains(file.type):
        if (file.size > rules.maxBytes) {
          showMessage(
            context,
            l10n.reviewPhotoTooBig(formatBytes(rules.maxBytes)),
          );
          return;
        }
        setState(() => _picked.add(file));
      default:
        showMessage(context, l10n.reviewPhotoType);
    }
  }

  /// The id of a kept photo from its link (`…/m/<id>`).
  static String? _idOf(String url) {
    final last = Uri.tryParse(url)?.pathSegments.lastOrNull;
    return last != null && RegExp(r'^[0-9a-f-]{36}$').hasMatch(last)
        ? last
        : null;
  }

  Future<void> _send() async {
    final l10n = context.l10n;
    if (_rating == 0) {
      showMessage(context, l10n.chooseRating);
      return;
    }
    setState(() => _sending = true);
    try {
      final ids = [for (final url in _kept) ?_idOf(url)];
      for (final file in _picked) {
        ids.add(
          await uploadChatFile(
            ref.read(reviewUploadsProvider),
            file,
            cancelled: () => _closed,
          ),
        );
      }
      await ref
          .read(yallappApiProvider)
          .saveProductReview(
            widget.productId,
            rating: _rating,
            text: _text.text.trim(),
            photoIds: ids,
          );
      ref
        ..invalidate(productProvider(widget.productId))
        ..invalidate(productReviewsProvider(widget.productId));
      if (!mounted) return;
      showMessage(context, l10n.reviewThanks);
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final rules = _rules;
    return Scaffold(
      appBar: AppBar(
        leading: const AppBarBackButton(),
        title: Text(widget.mine == null ? l10n.writeReview : l10n.editReview),
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(20, 8, 20, endRoom(context, 20)),
        children: [
          Center(
            child: StarRow(
              rating: _rating.toDouble(),
              size: 36,
              onChanged: (v) => setState(() => _rating = v),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            key: const ValueKey('review-text'),
            controller: _text,
            minLines: 4,
            maxLines: 8,
            maxLength: 2000,
            decoration: InputDecoration(hintText: l10n.reviewHint),
          ),
          if (rules != null) ...[
            const SizedBox(height: 8),
            Text(
              l10n.reviewPhotosCount(_count, rules.max),
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final (i, url) in _kept.indexed)
                  _PhotoTile(
                    label: l10n.reviewPhotoRemove,
                    onRemove: () => setState(() => _kept.removeAt(i)),
                    child: InkWell(
                      onTap: () => showReviewPhoto(context, url),
                      child: AppNetworkImage(url: url, width: 84, height: 84),
                    ),
                  ),
                for (final (i, file) in _picked.indexed)
                  _PhotoTile(
                    label: l10n.reviewPhotoRemove,
                    onRemove: () => setState(() => _picked.removeAt(i)),
                    child: ColoredBox(
                      color: p.surfaceMuted,
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(6),
                          child: Text(
                            file.name,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 11, color: p.textBody),
                          ),
                        ),
                      ),
                    ),
                  ),
                if (_count < rules.max)
                  Semantics(
                    button: true,
                    label: l10n.reviewAddPhotos,
                    excludeSemantics: true,
                    child: InkWell(
                      key: const ValueKey('review-add-photo'),
                      borderRadius: BorderRadius.circular(12),
                      onTap: _sending ? null : _pick,
                      child: Container(
                        width: 84,
                        height: 84,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: p.divider),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            AppIcon(AppIcons.photo, color: p.textSecondary),
                            const SizedBox(height: 4),
                            Text(
                              l10n.reviewAddPhotos,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 11,
                                color: p.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 20),
          PrimaryButton(
            key: const ValueKey('review-send'),
            label: l10n.postReview,
            onPressed: _sending ? null : _send,
          ),
        ],
      ),
    );
  }
}

class _PhotoTile extends StatelessWidget {
  const _PhotoTile({
    required this.child,
    required this.onRemove,
    required this.label,
  });

  final Widget child;
  final VoidCallback onRemove;
  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return SizedBox(
      width: 84,
      height: 84,
      child: Stack(
        children: [
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: child,
            ),
          ),
          PositionedDirectional(
            top: 2,
            end: 2,
            child: Semantics(
              button: true,
              label: label,
              excludeSemantics: true,
              child: InkResponse(
                onTap: onRemove,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: p.surface,
                    shape: BoxShape.circle,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: AppIcon(AppIcons.close, size: 16, color: p.text),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// What a listing can be filtered by (`GET /store/filters`); nothing on an
/// older server or a site without it (the sort only).
final shopFiltersProvider = FutureProvider.autoDispose
    .family<ShopFilters, ({int? category, String? search})>((ref, of) async {
      try {
        return await ref
            .watch(yallappApiProvider)
            .getShopFilters(category: of.category, search: of.search);
      } on ApiException {
        return ShopFilters.none;
      }
    });

/// The listing filters as a sheet: the sizes, colours and other choices,
/// the price range and the brands; the filters chosen (their query
/// parameters), or null when closed without Show results.
Future<Map<String, String>?> showListingFilters(
  BuildContext context, {
  required ShopFilters filters,
  required Map<String, String> current,
}) => showModalBottomSheet<Map<String, String>>(
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  backgroundColor: context.palette.surface,
  builder: (_) => _FilterSheet(filters: filters, current: current),
);

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({required this.filters, required this.current});

  final ShopFilters filters;
  final Map<String, String> current;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late final Map<String, Set<String>> _chosen = {
    for (final e in widget.current.entries)
      if (e.key != 'min_price' && e.key != 'max_price')
        e.key: e.value.split(',').where((v) => v.isNotEmpty).toSet(),
  };
  late RangeValues? _price = _initialPrice();

  RangeValues? _initialPrice() {
    final range = widget.filters.price;
    if (range == null) return null;
    final min = double.tryParse(widget.current['min_price'] ?? '') ?? range.min;
    final max = double.tryParse(widget.current['max_price'] ?? '') ?? range.max;
    return RangeValues(
      min.clamp(range.min, range.max),
      max.clamp(range.min, range.max),
    );
  }

  Map<String, String> _result() {
    final range = widget.filters.price;
    return {
      for (final e in _chosen.entries)
        if (e.value.isNotEmpty) e.key: e.value.join(','),
      if (range != null && _price != null && _price!.start > range.min)
        'min_price': _price!.start.round().toString(),
      if (range != null && _price != null && _price!.end < range.max)
        'max_price': _price!.end.round().toString(),
    };
  }

  void _toggle(String param, String value) => setState(() {
    final set = _chosen.putIfAbsent(param, () => {});
    if (!set.remove(value)) set.add(value);
  });

  Color? _swatch(String? hex) {
    if (hex == null || !RegExp(r'^#[0-9a-fA-F]{6}$').hasMatch(hex)) return null;
    return Color(int.parse('ff${hex.substring(1)}', radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final f = widget.filters;
    final range = f.price;
    final title = TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w700,
      color: p.text,
    );
    Widget chip(String param, String value, String label, {Color? swatch}) {
      final on = _chosen[param]?.contains(value) ?? false;
      return FilterChip(
        key: ValueKey('filter-$param-$value'),
        selected: on,
        showCheckmark: swatch == null,
        avatar: swatch == null
            ? null
            : DecoratedBox(
                decoration: BoxDecoration(
                  color: swatch,
                  shape: BoxShape.circle,
                  border: Border.all(color: p.divider),
                ),
                child: const SizedBox.square(dimension: 18),
              ),
        label: Text(label),
        onSelected: (_) => _toggle(param, value),
      );
    }

    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * 0.85,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Flexible(
              child: ListView(
                key: const ValueKey('filter-sheet'),
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                children: [
                  Text(l10n.filters, style: title.copyWith(fontSize: 18)),
                  for (final c in f.choices) ...[
                    const SizedBox(height: 16),
                    Text(c.name, style: title),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final v in c.values)
                          chip(
                            c.param,
                            v.value,
                            v.label,
                            swatch: c.kind == FilterKind.colour
                                ? _swatch(v.swatch)
                                : null,
                          ),
                      ],
                    ),
                  ],
                  if (range != null && _price != null) ...[
                    const SizedBox(height: 16),
                    Text(l10n.filterPrice, style: title),
                    RangeSlider(
                      key: const ValueKey('filter-price'),
                      min: range.min,
                      max: range.max,
                      values: _price!,
                      labels: RangeLabels(
                        '${_price!.start.round()}',
                        '${_price!.end.round()}',
                      ),
                      onChanged: (v) => setState(() => _price = v),
                    ),
                    Text(
                      l10n.filterPriceRange(
                        '${_price!.start.round()} ${range.currency}',
                        '${_price!.end.round()} ${range.currency}',
                      ),
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                  ],
                  if (f.brands.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(l10n.filterBrand, style: title),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [for (final b in f.brands) chip('brand', b, b)],
                    ),
                  ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
              child: Row(
                children: [
                  Expanded(
                    child: SecondaryButton(
                      label: l10n.clearFilters,
                      onPressed: () =>
                          Navigator.of(context).pop(const <String, String>{}),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: PrimaryButton(
                      key: const ValueKey('filter-apply'),
                      label: l10n.showResults,
                      onPressed: () => Navigator.of(context).pop(_result()),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
