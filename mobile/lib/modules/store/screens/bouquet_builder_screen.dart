import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/money.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/premium_chrome.dart'
    show ChromeFloralLine, PetalEdgeClipper;
import '../data/bouquet_draft.dart';
import '../data/cart_controller.dart';
import '../data/store_providers.dart';
import '../widgets/gift_checkout.dart' show CardMessageEditor;
import '../widgets/gift_checkout_look.dart' show GiftStepBar;
import '../widgets/product_widgets.dart';

/// 162 Build your bouquet, opened by the Start of the template's section
/// (an action with `flow: bouquet`) when the shop has set it up: the
/// flowers of the owner's category chosen by the stem with the live price,
/// one wrap (or "No wrap", where the owner allows it), the card and its
/// words (the card messages by occasion, as at checkout; skipped where the
/// owner allows it), then the bouquet with its total, and "Send flowers"
/// (the gift checkout) or "Add to cart" puts it in the cart as one bouquet.
/// The shop's photos and prices only, each in the customer's currency as
/// the shop shows it; the server prices the cart. In the look of the
/// template: its colour (the checkout look's, else the main one), the
/// petal header with its floral line, light and dark, right to left.
class BouquetBuilderScreen extends ConsumerWidget {
  const BouquetBuilderScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final data = ref.watch(bouquetBuilderProvider);
    return data.when(
      data: (d) => _Builder(data: d),
      loading: () => Scaffold(
        appBar: AppBar(title: Text(l10n.bouquetTitle)),
        body: const LoadingView(),
      ),
      error: (error, _) {
        final e = unwrapError(error);
        // Not set up (or no longer): the shop, as the Start did before.
        final gone = e is ApiException && e.statusCode == 404;
        return Scaffold(
          appBar: AppBar(title: Text(l10n.bouquetTitle)),
          body: gone
              ? MessageView(
                  icon: AppIcons.florist,
                  title: l10n.bouquetUnavailable,
                  actionLabel: l10n.bouquetShopInstead,
                  onAction: () => openLocation(context, Paths.shop),
                )
              : ErrorView(
                  error: error,
                  onRetry: () => ref.invalidate(bouquetBuilderProvider),
                ),
        );
      },
    );
  }
}

class _Builder extends ConsumerStatefulWidget {
  const _Builder({required this.data});

  final BouquetBuilderData data;

  @override
  ConsumerState<_Builder> createState() => _BuilderState();
}

class _BuilderState extends ConsumerState<_Builder> {
  late final BouquetDraft _draft = BouquetDraft(widget.data);
  final _message = TextEditingController();
  BouquetStep _step = BouquetStep.flowers;

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  void _go(BouquetStep step) {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _step = step);
  }

  void _next() {
    if (!_draft.done(_step)) return;
    if (_step == BouquetStep.summary) return _addToCart();
    _go(BouquetStep.values[_step.index + 1]);
  }

  void _addToCart() {
    final lines = _draft.cartLines(newBouquetId());
    if (lines.isEmpty) return;
    final added = ref.read(cartProvider.notifier).addBouquet(lines);
    if (!added) {
      showMessage(context, context.l10n.cartFull);
      return;
    }
    showMessage(context, context.l10n.bouquetInCart);
    openLocation(context, Paths.cart);
  }

  /// Why the step can't go on yet; null when it can.
  String? _problem() {
    final l10n = context.l10n;
    final d = _draft;
    return switch (_step) {
      BouquetStep.flowers when d.stemCount < d.rules.minStems =>
        l10n.bouquetNeedStems(d.rules.minStems),
      BouquetStep.wrap when !d.wrapDone => l10n.bouquetChooseWrap,
      BouquetStep.card when !d.cardDone =>
        d.hasCards ? l10n.bouquetChooseCard : l10n.bouquetWriteMessage,
      _ => null,
    };
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final config = ref.watch(appConfigProvider);
    final look = config.screens?.checkout;
    final store = config.store;
    final tone = parseHexColor(look?.accentFor(dark: p.isDark)) ?? p.primary;
    final page = Color.alphaBlend(
      tone.withValues(alpha: p.isDark ? 0.10 : 0.05),
      p.background,
    );
    final gift = (store?.giftCheckout ?? false) || (look?.gift ?? false);
    final labels = [
      l10n.bouquetStepFlowers,
      l10n.bouquetStepWrap,
      l10n.bouquetStepCard,
      l10n.bouquetStepSummary,
    ];
    final lines = [
      l10n.bouquetFlowersLine,
      l10n.bouquetWrapLine,
      _draft.hasCards ? l10n.bouquetCardLine : l10n.bouquetMessageOnlyLine,
      l10n.bouquetStemsRange(_draft.rules.minStems, _draft.rules.maxStems),
    ];
    final body = switch (_step) {
      BouquetStep.flowers => _flowers(tone),
      BouquetStep.wrap => _wraps(tone),
      BouquetStep.card => _cards(tone, look, store),
      BouquetStep.summary => _summary(tone),
    };
    final problem = _problem();
    final last = _step == BouquetStep.summary;
    return PopScope(
      canPop: _step == BouquetStep.flowers,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _go(BouquetStep.values[_step.index - 1]);
      },
      child: Scaffold(
        backgroundColor: page,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _PetalHeader(
              tone: tone,
              title: l10n.bouquetTitle,
              line: _step == BouquetStep.summary
                  ? l10n.bouquetStems(_draft.stemCount)
                  : lines[_step.index],
              stepLabel: l10n.bouquetStepOf(_step.index + 1, labels.length),
              onBack: () => _step == BouquetStep.flowers
                  ? context.pop()
                  : _go(BouquetStep.values[_step.index - 1]),
            ),
            GiftStepBar(
              key: const ValueKey('bouquet-steps'),
              step: _step.index,
              labels: labels,
              accent: tone,
              done: [
                for (final s in BouquetStep.values)
                  s != BouquetStep.summary && _draft.done(s),
              ],
            ),
            Expanded(
              child: ListView(
                key: ValueKey('bouquet-step-${_step.name}'),
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                children: body,
              ),
            ),
          ],
        ),
        bottomNavigationBar: BottomActionBar(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Said once something is chosen (an empty start says nothing).
              if (problem != null &&
                  (_draft.stemCount > 0 || _step != BouquetStep.flowers)) ...[
                Text(
                  problem,
                  key: const ValueKey('bouquet-problem'),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: p.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
              ],
              Row(
                children: [
                  Expanded(flex: 4, child: _TotalLabel(draft: _draft)),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 5,
                    child: PrimaryButton(
                      key: const ValueKey('bouquet-next'),
                      label: !last
                          ? l10n.continueAction
                          : gift
                          ? l10n.bouquetSendFlowers
                          : l10n.addToCart,
                      trailingIcon: last ? null : AppIcons.forward,
                      icon: last ? AppIcons.florist : null,
                      onPressed: _draft.done(_step) ? _next : null,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ——— 1 The flowers, by the stem ———

  List<Widget> _flowers(Color tone) {
    final l10n = context.l10n;
    final p = context.palette;
    final d = _draft;
    final flowers = d.flowers;
    final cards = [
      for (final f in flowers)
        _FlowerCard(
          key: ValueKey('bouquet-flower-${f.id}'),
          flower: f,
          tone: tone,
          stems: d.stemsOf(f.id),
          max: d.canAddStem(f) || d.stemsOf(f.id) > 0
              ? d.stemsOf(f.id) + (d.rules.maxStems - d.stemCount)
              : 0,
          onChanged: (q) => setState(() => d.setStems(f, q)),
        ),
    ];
    return [
      Row(
        children: [
          AppIcon(AppIcons.florist, size: 18, color: tone, filled: true),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              l10n.bouquetStemsRange(d.rules.minStems, d.rules.maxStems),
              style: TextStyle(fontSize: 13.5, color: p.textSecondary),
            ),
          ),
          _Pill(
            key: const ValueKey('bouquet-stem-count'),
            text: l10n.bouquetStems(d.stemCount),
            tone: tone,
            filled: d.flowersDone,
          ),
        ],
      ),
      if (d.stemCount >= d.rules.maxStems) ...[
        const SizedBox(height: 8),
        Text(
          l10n.bouquetMaxStems(d.rules.maxStems),
          style: TextStyle(fontSize: 13, color: p.textSecondary),
        ),
      ],
      const SizedBox(height: 14),
      for (var i = 0; i < cards.length; i += 2) ...[
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: cards[i]),
              const SizedBox(width: 12),
              Expanded(
                child: i + 1 < cards.length
                    ? cards[i + 1]
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
      ],
    ];
  }

  // ——— 2 The wrap ———

  List<Widget> _wraps(Color tone) {
    final l10n = context.l10n;
    final d = _draft;
    return [
      if (d.rules.wrapOptional) ...[
        _ChoiceTile(
          key: const ValueKey('bouquet-no-wrap'),
          tone: tone,
          icon: AppIcons.florist,
          title: l10n.bouquetNoWrap,
          subtitle: l10n.bouquetNoWrapLine,
          selected: d.noWrap,
          onTap: () => setState(() => d.chooseWrap(null)),
        ),
        const SizedBox(height: 10),
      ],
      for (final w in d.data.wraps) ...[
        _ChoiceTile(
          key: ValueKey('bouquet-wrap-${w.id}'),
          tone: tone,
          product: w,
          icon: AppIcons.bouquetWrap,
          title: w.name,
          selected: d.wrapId == w.id,
          onTap: w.purchasable
              ? () => setState(() => d.chooseWrap(w.id))
              : null,
        ),
        const SizedBox(height: 10),
      ],
    ];
  }

  // ——— 3 The card and its words ———

  List<Widget> _cards(Color tone, CheckoutLook? look, StoreConfig? store) {
    final l10n = context.l10n;
    final p = context.palette;
    final d = _draft;
    final writing = !d.noCard && (!d.hasCards || d.card != null);
    return [
      if (d.hasCards) ...[
        if (d.rules.cardOptional) ...[
          _ChoiceTile(
            key: const ValueKey('bouquet-no-card'),
            tone: tone,
            icon: AppIcons.bouquetNone,
            title: l10n.bouquetNoCard,
            selected: d.noCard,
            onTap: () => setState(() => d.chooseCard(null)),
          ),
          const SizedBox(height: 10),
        ],
        for (final c in d.data.cards) ...[
          _ChoiceTile(
            key: ValueKey('bouquet-card-${c.id}'),
            tone: tone,
            product: c,
            icon: AppIcons.bouquetCard,
            title: c.name,
            selected: d.cardId == c.id,
            onTap: c.purchasable
                ? () => setState(() => d.chooseCard(c.id))
                : null,
          ),
          const SizedBox(height: 10),
        ],
      ],
      if (writing)
        Container(
          key: const ValueKey('bouquet-message'),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: p.surface,
            borderRadius: BorderRadius.circular(look?.radius ?? 22),
            border: Border.all(color: tone.withValues(alpha: 0.18)),
          ),
          child: Material(
            type: MaterialType.transparency,
            child: CardMessageEditor(
              message: _message,
              maxLength: d.rules.maxMessage,
              // 169 The beginnings in the customer's language, else the
              // main one's.
              starters:
                  store?.giftMessage.startersIn(
                    Localizations.localeOf(context).languageCode,
                  ) ??
                  const [],
              look: look,
              label: l10n.giftCardTitle,
              onChanged: () => setState(() => d.message = _message.text),
            ),
          ),
        ),
      // A card of words only, where the owner lets it be left out.
      if (!d.hasCards && d.rules.cardOptional) ...[
        const SizedBox(height: 8),
        Align(
          alignment: AlignmentDirectional.centerEnd,
          child: TextButton.icon(
            key: const ValueKey('bouquet-skip-card'),
            onPressed: () {
              setState(() {
                d.noCard = true;
                d.message = '';
                _message.clear();
              });
              _go(BouquetStep.summary);
            },
            icon: AppIcon(AppIcons.forward, size: 18, color: tone),
            label: Text(
              l10n.bouquetSkipCard,
              style: TextStyle(color: tone, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ],
    ];
  }

  // ——— 4 The bouquet, before the cart ———

  List<Widget> _summary(Color tone) {
    final l10n = context.l10n;
    final p = context.palette;
    final d = _draft;
    final photos = [
      for (final (f, _) in d.chosenFlowers)
        if (f.imageUrl != null) f.imageUrl!,
    ].take(3).toList();
    Widget change(BouquetStep step, String part) => TextButton(
      key: ValueKey('bouquet-change-${step.name}'),
      onPressed: () {
        // Skipped on the way here: chosen again from the card's step.
        if (step == BouquetStep.card) setState(() => d.noCard = false);
        _go(step);
      },
      child: Text(
        l10n.edit,
        semanticsLabel: l10n.bouquetChange(part),
        style: TextStyle(color: tone, fontWeight: FontWeight.w700),
      ),
    );
    Widget head(String title, BouquetStep step) => Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
              color: tone,
            ),
          ),
        ),
        change(step, title),
      ],
    );
    return [
      Container(
        key: const ValueKey('bouquet-summary'),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: tone.withValues(alpha: 0.16)),
          boxShadow: [
            BoxShadow(
              color: p.isDark
                  ? Colors.black.withValues(alpha: 0.3)
                  : tone.withValues(alpha: 0.10),
              blurRadius: 26,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (photos.isNotEmpty) ...[
              Center(
                child: _PhotoCluster(urls: photos, tone: tone),
              ),
              const SizedBox(height: 12),
            ],
            Center(
              child: Text(
                l10n.bouquetStepSummary,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                  color: p.text,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Center(
              child: ChromeFloralLine(
                color: tone.withValues(alpha: 0.3),
                flower: tone,
                width: 130,
              ),
            ),
            const SizedBox(height: 10),
            head(l10n.bouquetStepFlowers, BouquetStep.flowers),
            for (final (f, q) in d.chosenFlowers)
              _SummaryLine(
                key: ValueKey('bouquet-line-${f.id}'),
                name: l10n.lineQuantity(f.name, q),
                product: f,
                quantity: q,
              ),
            const Divider(height: 20),
            head(l10n.bouquetStepWrap, BouquetStep.wrap),
            if (d.wrap case final w?)
              _SummaryLine(name: w.name, product: w, quantity: 1)
            else
              _SummaryLine(name: l10n.bouquetNoWrap),
            const Divider(height: 20),
            head(l10n.bouquetStepCard, BouquetStep.card),
            if (d.card case final c? when !d.noCard)
              _SummaryLine(name: c.name, product: c, quantity: 1)
            else if (d.noCard || d.cardMessage == null)
              _SummaryLine(name: l10n.bouquetNoCard),
            if (d.cardMessage case final words?)
              Padding(
                padding: const EdgeInsets.only(top: 4, bottom: 8),
                child: Text(
                  l10n.bouquetMessage(words),
                  key: const ValueKey('bouquet-summary-message'),
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.35,
                    fontStyle: FontStyle.italic,
                    color: p.text,
                  ),
                ),
              ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      Text(
        l10n.bouquetTotalNote,
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 12.5, color: p.textSecondary),
      ),
    ];
  }
}

/// The petal header: the look's soft wash, the title in the middle between
/// the round back button and its space, the step's line, the floral line,
/// and the petal's curved foot.
class _PetalHeader extends StatelessWidget {
  const _PetalHeader({
    required this.tone,
    required this.title,
    required this.line,
    required this.stepLabel,
    required this.onBack,
  });

  final Color tone;
  final String title;
  final String line;
  final String stepLabel;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final top = MediaQuery.paddingOf(context).top;
    final wash = Color.alphaBlend(
      tone.withValues(alpha: p.isDark ? 0.28 : 0.14),
      p.background,
    );
    final second = Color.alphaBlend(
      p.accent.withValues(alpha: p.isDark ? 0.16 : 0.18),
      p.background,
    );
    return ClipPath(
      clipper: const PetalEdgeClipper(16),
      child: Container(
        key: const ValueKey('bouquet-header'),
        padding: EdgeInsetsDirectional.fromSTEB(12, top + 8, 12, 26),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: AlignmentDirectional.topStart,
            end: AlignmentDirectional.bottomEnd,
            colors: [wash, second],
          ),
        ),
        child: Column(
          children: [
            Row(
              children: [
                SquareIconButton(
                  icon: AppIcons.back,
                  label: context.l10n.back,
                  onPressed: onBack,
                  radius: 22,
                  background: p.surface.withValues(alpha: 0.7),
                  bordered: false,
                ),
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        stepLabel.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.6,
                          color: tone,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Semantics(
                        header: true,
                        child: Text(
                          title,
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w600,
                            color: p.text,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 44),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              line,
              key: const ValueKey('bouquet-line'),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13.5, color: p.textSecondary),
            ),
            const SizedBox(height: 10),
            ChromeFloralLine(color: tone.withValues(alpha: 0.32), flower: tone),
          ],
        ),
      ),
    );
  }
}

/// A flower to choose by the stem: its photo, name, price, and its stems.
class _FlowerCard extends StatelessWidget {
  const _FlowerCard({
    super.key,
    required this.flower,
    required this.tone,
    required this.stems,
    required this.max,
    required this.onChanged,
  });

  final ProductSummary flower;
  final Color tone;
  final int stems;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final chosen = stems > 0;
    return AnimatedContainer(
      duration: MediaQuery.disableAnimationsOf(context)
          ? Duration.zero
          : const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: chosen ? tone : tone.withValues(alpha: 0.14),
          width: chosen ? 2 : 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: Stack(
              fit: StackFit.expand,
              children: [
                AppNetworkImage(
                  url: flower.imageUrl,
                  seed: flower.id,
                  placeholderIcon: AppIcons.florist,
                ),
                if (chosen)
                  PositionedDirectional(
                    top: 8,
                    end: 8,
                    child: _Pill(text: '× $stems', tone: tone, filled: true),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 10, 10, 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  flower.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 2),
                ProductPriceLabel(flower.price, size: 13.5),
              ],
            ),
          ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: QuantityControl(
                quantity: stems,
                min: 0,
                max: max,
                compact: true,
                onChanged: onChanged,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A wrap or a card to choose (or none): its photo, else its icon on a
/// soft tile, its name and price, a round mark when chosen.
class _ChoiceTile extends StatelessWidget {
  const _ChoiceTile({
    super.key,
    required this.tone,
    required this.icon,
    required this.title,
    required this.selected,
    required this.onTap,
    this.product,
    this.subtitle,
  });

  final Color tone;
  final IconData icon;
  final String title;
  final String? subtitle;
  final ProductSummary? product;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final photo = product?.imageUrl;
    return Semantics(
      button: true,
      selected: selected,
      enabled: onTap != null,
      child: Material(
        color: p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: selected ? tone : tone.withValues(alpha: 0.14),
            width: selected ? 2 : 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: SizedBox(
                    width: 64,
                    height: 64,
                    child: photo != null
                        ? AppNetworkImage(url: photo, seed: product?.id ?? 0)
                        : ColoredBox(
                            color: tone.withValues(
                              alpha: p.isDark ? 0.22 : 0.10,
                            ),
                            child: Center(
                              child: AppIcon(icon, size: 28, color: tone),
                            ),
                          ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: onTap == null ? p.textTertiary : p.text,
                        ),
                      ),
                      if (subtitle != null)
                        Text(
                          subtitle!,
                          style: TextStyle(
                            fontSize: 13,
                            color: p.textSecondary,
                          ),
                        ),
                      if (product != null) ...[
                        const SizedBox(height: 2),
                        ProductPriceLabel(product!.price, size: 13.5),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                AnimatedContainer(
                  duration: MediaQuery.disableAnimationsOf(context)
                      ? Duration.zero
                      : const Duration(milliseconds: 180),
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: selected ? tone : Colors.transparent,
                    border: Border.all(
                      color: selected ? tone : p.border,
                      width: 2,
                    ),
                  ),
                  child: selected
                      ? AppIcon(
                          AppIcons.check,
                          size: 16,
                          color: tone.computeLuminance() > 0.5
                              ? const Color(0xFF1A0D13)
                              : Colors.white,
                        )
                      : null,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A line of the summary: its name, and what it comes to in the customer's
/// currency (the shop's under it), as the shop's prices show.
class _SummaryLine extends StatelessWidget {
  const _SummaryLine({
    super.key,
    required this.name,
    this.product,
    this.quantity = 1,
  });

  final String name;
  final ProductSummary? product;
  final int quantity;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final price = product?.price;
    final shop = price == null
        ? null
        : formatMoney(centsOf(price.amount) * quantity, price.currency);
    final shownAmount = price?.display?.values['amount'];
    final shown = price?.display == null || shownAmount == null
        ? null
        : context.l10n.approxPrice(
            formatMoney(
              centsOf(shownAmount) * quantity,
              price!.display!.currency,
            ),
          );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(name, style: TextStyle(fontSize: 15, color: p.text)),
          ),
          if (shop != null) ...[
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  shown ?? shop,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                if (shown != null)
                  Text(
                    shop,
                    style: TextStyle(fontSize: 12, color: p.textSecondary),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// The bouquet's total so far: in the customer's currency first when the
/// shop shows prices in it (approximate), the shop's own under it.
class _TotalLabel extends StatelessWidget {
  const _TotalLabel({required this.draft});

  final BouquetDraft draft;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final shown = draft.displayTotal;
    final shop = draft.totalFormatted;
    return Semantics(
      container: true,
      label:
          '${l10n.bouquetTotal}, ${shown != null ? '${l10n.approxPrice(shown)}, ' : ''}$shop',
      excludeSemantics: true,
      child: Column(
        key: const ValueKey('bouquet-total'),
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            l10n.bouquetTotal,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, color: p.textSecondary),
          ),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: AlignmentDirectional.centerStart,
            child: Text(
              shown != null ? l10n.approxPrice(shown) : shop,
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
          ),
          if (shown != null)
            Text(
              shop,
              maxLines: 1,
              style: TextStyle(fontSize: 12, color: p.textSecondary),
            ),
        ],
      ),
    );
  }
}

/// A small rounded label in the look's colour.
class _Pill extends StatelessWidget {
  const _Pill({
    super.key,
    required this.text,
    required this.tone,
    this.filled = false,
  });

  final String text;
  final Color tone;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final onTone = tone.computeLuminance() > 0.5
        ? const Color(0xFF1A0D13)
        : Colors.white;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: filled ? tone : tone.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w800,
          color: filled ? onTone : tone,
        ),
      ),
    );
  }
}

/// The chosen flowers' photos as overlapping rounds, ringed in the page.
class _PhotoCluster extends StatelessWidget {
  const _PhotoCluster({required this.urls, required this.tone});

  final List<String> urls;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    const size = 74.0;
    const step = 52.0;
    return ExcludeSemantics(
      child: SizedBox(
        width: size + step * (urls.length - 1),
        height: size,
        child: Stack(
          children: [
            for (final (i, url) in urls.indexed)
              PositionedDirectional(
                start: step * i,
                top: 0,
                child: Container(
                  width: size,
                  height: size,
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: p.surface,
                    boxShadow: [
                      BoxShadow(
                        color: tone.withValues(alpha: 0.18),
                        blurRadius: 12,
                      ),
                    ],
                  ),
                  child: ClipOval(
                    child: AppNetworkImage(url: url, seed: i),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
