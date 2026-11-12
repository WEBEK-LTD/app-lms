import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/lms_providers.dart';
import 'course_cart.dart';

/// 123 The academy's cart: the courses the student chose with their
/// pictures and prices, a coupon of the site's, the card they saved with
/// the site's payment gateway, the totals, and one checkout for all of
/// them. In the premium academy's look (`looks` `cart: premium`) the
/// payment is in gold, as the approved board has it.
class CourseCartScreen extends ConsumerStatefulWidget {
  const CourseCartScreen({super.key});

  @override
  ConsumerState<CourseCartScreen> createState() => _CourseCartScreenState();
}

class _CourseCartScreenState extends ConsumerState<CourseCartScreen>
    with WidgetsBindingObserver {
  final _coupon = TextEditingController();
  String? _code;
  CourseCart? _cart;
  List<SavedCard> _cards = const [];
  String? _cardId;
  bool _loading = true;
  bool _paying = false;
  bool _awaitingCheckout = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_load());
    unawaited(_loadCards());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _coupon.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _awaitingCheckout) {
      _awaitingCheckout = false;
      unawaited(_afterCheckout());
    }
  }

  Future<void> _load() async {
    final ids = ref.read(courseCartProvider);
    if (ids.isEmpty) {
      setState(() {
        _cart = null;
        _loading = false;
      });
      return;
    }
    setState(() => _loading = true);
    try {
      final cart = await ref
          .read(yallappApiProvider)
          .quoteCourseCart(ids, coupon: _code);
      if (!mounted) return;
      setState(() {
        _cart = cart;
        _error = null;
        // A coupon that doesn't apply says why, and stays out of the total.
        if (cart.coupon?.status == CourseCouponStatus.invalid) {
          showMessage(
            context,
            cart.coupon?.message ??
                context.l10n.couponNotApplied(cart.coupon!.code),
          );
          _code = null;
        }
      });
    } on Object catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadCards() async {
    try {
      final cards = await ref.read(yallappApiProvider).listSavedCards();
      if (!mounted) return;
      setState(() {
        _cards = cards;
        _cardId =
            cards.where((c) => c.isDefault).firstOrNull?.id ??
            cards.firstOrNull?.id;
      });
    } on Object {
      // Without saved cards the card is entered on the checkout.
    }
  }

  void _applyCoupon() {
    final code = _coupon.text.trim();
    if (code.isEmpty) return;
    FocusScope.of(context).unfocus();
    _code = code;
    unawaited(_load());
  }

  void _removeCoupon() {
    _coupon.clear();
    _code = null;
    unawaited(_load());
  }

  void _remove(int courseId) {
    ref.read(courseCartProvider.notifier).remove(courseId);
    unawaited(_load());
  }

  Future<void> _pay() async {
    final cart = _cart;
    if (cart == null || cart.available.isEmpty || _paying) return;
    setState(() => _paying = true);
    try {
      final link = await ref
          .read(yallappApiProvider)
          .createCourseCartCheckoutLink(
            [for (final l in cart.available) l.courseId],
            coupon: _code,
            cardId: _cardId,
          );
      if (!mounted) return;
      final rules = ref.read(appConfigProvider).purchases;
      final inApp =
          link.openIn == CheckoutTarget.inApp &&
          rules.checkoutOpensIn != CheckoutOpensIn.browser;
      if (inApp) {
        await context.push(
          Paths.web,
          extra: WebPageArgs(url: link.url, title: context.l10n.checkout),
        );
        if (mounted) await _afterCheckout();
      } else {
        _awaitingCheckout = true;
        final opened = await openExternal(link.url);
        if (!opened && mounted) {
          _awaitingCheckout = false;
          showMessage(context, context.l10n.checkoutFailed);
        }
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      showMessage(context, e.message);
      // A course that can't be bought any more: the cart priced again.
      if (e.statusCode == 409) unawaited(_load());
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  /// Back from the checkout: the courses bought leave the cart.
  Future<void> _afterCheckout() async {
    for (final id in ref.read(courseCartProvider)) {
      invalidateCourse(ref, id);
    }
    try {
      final cart = await ref
          .read(yallappApiProvider)
          .quoteCourseCart(ref.read(courseCartProvider));
      ref.read(courseCartProvider.notifier).keep([
        for (final l in cart.lines)
          if (l.available) l.courseId,
      ]);
    } on Object {
      // Kept as it was; priced again when the cart opens.
    }
    if (mounted) unawaited(_load());
  }

  Future<void> _chooseCard() async {
    final l10n = context.l10n;
    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (sheet) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                l10n.chooseCard,
                style: Theme.of(sheet).textTheme.titleMedium,
              ),
            ),
            for (final c in _cards)
              ListTile(
                key: ValueKey('card-${c.id}'),
                leading: const Icon(Symbols.credit_card_rounded),
                title: Text(
                  '${_brand(c.brand)} •••• ${c.last4}',
                  textDirection: TextDirection.ltr,
                ),
                subtitle: Text(c.expiry, textDirection: TextDirection.ltr),
                trailing: c.id == _cardId
                    ? const Icon(Symbols.check_rounded)
                    : null,
                onTap: () => Navigator.of(sheet).pop(c.id),
              ),
            ListTile(
              key: const ValueKey('card-other'),
              leading: const Icon(Symbols.add_card_rounded),
              title: Text(l10n.anotherCard),
              trailing: _cardId == null
                  ? const Icon(Symbols.check_rounded)
                  : null,
              onTap: () => Navigator.of(sheet).pop(''),
            ),
          ],
        ),
      ),
    );
    if (picked == null || !mounted) return;
    setState(() => _cardId = picked.isEmpty ? null : picked);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final gate = ref.watch(appGateProvider);
    final premium =
        gate is GateReady &&
        (gate.config.screens?.has(ScreenLookKey.cart) ?? false);
    final gold = Theme.of(context).colorScheme.secondary;
    final accent = premium ? gold : p.primary;
    final ids = ref.watch(courseCartProvider);
    final cart = _cart;
    final card = _cards.where((c) => c.id == _cardId).firstOrNull;
    final name = ref.watch(authControllerProvider).user?.name ?? '';

    Widget body;
    if (ids.isEmpty) {
      body = MessageView(
        icon: Symbols.shopping_bag_rounded,
        title: l10n.cartEmptyTitle,
        message: l10n.courseCartEmpty,
      );
    } else if (cart == null && _loading) {
      body = const LoadingView();
    } else if (cart == null) {
      body = ErrorView(error: _error ?? '', onRetry: _load);
    } else {
      body = ListView(
        key: const ValueKey('course-cart'),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          for (final (i, line) in cart.lines.indexed) ...[
            if (i > 0) Divider(height: 1, color: p.divider),
            _Line(
              line: line,
              accent: accent,
              onRemove: () => _remove(line.courseId),
            ),
          ],
          const SizedBox(height: 14),
          _CouponField(
            controller: _coupon,
            accent: accent,
            applied: cart.coupon?.status == CourseCouponStatus.applied
                ? cart.coupon
                : null,
            onApply: _applyCoupon,
            onRemove: _removeCoupon,
          ),
          const SizedBox(height: 14),
          _CardFace(
            card: card,
            holder: name,
            onTap: _cards.isEmpty ? null : _chooseCard,
          ),
          const SizedBox(height: 14),
          Container(
            key: const ValueKey('course-cart-totals'),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: p.divider),
            ),
            child: Column(
              children: [
                _Row(l10n.subtotalShort, cart.subtotal, p.text),
                if (cart.discount != null) ...[
                  const SizedBox(height: 10),
                  _Row(l10n.cartDiscount, '− ${cart.discount}', p.success),
                ],
              ],
            ),
          ),
        ],
      );
    }

    final pay = cart != null && cart.available.isNotEmpty
        ? Container(
            padding: EdgeInsets.fromLTRB(
              20,
              12,
              20,
              12 + MediaQuery.paddingOf(context).bottom,
            ),
            decoration: BoxDecoration(
              color: p.background,
              border: Border(top: BorderSide(color: p.divider)),
            ),
            child: PrimaryButton(
              key: const ValueKey('course-cart-pay'),
              label: l10n.payAmountSecurely(cart.total),
              icon: Symbols.lock_rounded,
              loading: _paying,
              onPressed: _pay,
            ),
          )
        : null;

    final page = Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
              child: Row(
                children: [
                  if (context.canPop()) ...[
                    const AppBackButton(),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: Semantics(
                      header: true,
                      child: Text(
                        l10n.courseCartTitle,
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                    ),
                  ),
                  if (ids.isNotEmpty)
                    Container(
                      key: const ValueKey('course-cart-count'),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: p.text.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        l10n.courseCartCount(ids.length),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(child: body),
            ?pay,
          ],
        ),
      ),
    );
    return premium ? GoldButtons(color: gold, child: page) : page;
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value, this.color);

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Text(
          label,
          style: TextStyle(fontSize: 13, color: context.palette.textSecondary),
        ),
      ),
      Text(
        value,
        style: TextStyle(
          fontSize: 13.5,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    ],
  );
}

class _Line extends StatelessWidget {
  const _Line({
    required this.line,
    required this.accent,
    required this.onRemove,
  });

  final CourseCartLine line;
  final Color accent;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    // Swiped away, or removed from the screen reader's actions.
    return Semantics(
      customSemanticsActions: {
        CustomSemanticsAction(label: context.l10n.removeItem(line.title)):
            onRemove,
      },
      child: Dismissible(
        key: ValueKey('cart-line-${line.courseId}'),
        onDismissed: (_) => onRemove(),
        background: const SizedBox.shrink(),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Opacity(
                  opacity: line.available ? 1 : 0.5,
                  child: AppNetworkImage(
                    url: line.imageUrl,
                    seed: line.courseId,
                    width: 66,
                    height: 66,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      line.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: line.available ? p.text : p.textSecondary,
                      ),
                    ),
                    if (line.problem != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        line.problem!,
                        style: TextStyle(fontSize: 11.5, color: p.danger),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 10),
              if (line.available)
                Text(
                  line.price,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                    color: accent,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The coupon in a dashed frame: its code, then applying it or what it
/// takes off.
class _CouponField extends StatelessWidget {
  const _CouponField({
    required this.controller,
    required this.accent,
    required this.applied,
    required this.onApply,
    required this.onRemove,
  });

  final TextEditingController controller;
  final Color accent;
  final CourseCartCoupon? applied;
  final VoidCallback onApply;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final on = applied;
    return CustomPaint(
      painter: _Dashes(color: accent.withValues(alpha: 0.7)),
      child: Container(
        height: 58,
        padding: const EdgeInsetsDirectional.only(start: 14, end: 8),
        decoration: BoxDecoration(
          color: p.surface.withValues(alpha: p.isDark ? 0.4 : 1),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          children: [
            Icon(Symbols.confirmation_number_rounded, size: 22, color: accent),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                key: const ValueKey('course-cart-coupon'),
                controller: controller,
                enabled: on == null,
                textCapitalization: TextCapitalization.characters,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => onApply(),
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 2,
                  color: p.text,
                ),
                decoration: InputDecoration(
                  hintText: l10n.couponCode,
                  hintStyle: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w400,
                    letterSpacing: 0,
                    color: p.textSecondary,
                  ),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  disabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  filled: false,
                  isDense: true,
                ),
              ),
            ),
            Material(
              color: p.text.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                key: const ValueKey('course-cart-coupon-apply'),
                borderRadius: BorderRadius.circular(12),
                onTap: on == null ? onApply : onRemove,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 10,
                  ),
                  child: Text(
                    on == null
                        ? l10n.couponApply
                        : '−${on.label ?? on.code}  ✕',
                    semanticsLabel: on == null ? null : l10n.couponRemove,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: on == null ? p.text : p.success,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Dashes extends CustomPainter {
  const _Dashes({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Offset.zero & size,
          const Radius.circular(18),
        ).deflate(0.5),
      );
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    for (final metric in path.computeMetrics()) {
      for (var d = 0.0; d < metric.length; d += 9) {
        canvas.drawPath(metric.extractPath(d, d + 5), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_Dashes old) => old.color != color;
}

String _brand(String brand) => switch (brand) {
  'visa' => 'VISA',
  'mastercard' => 'Mastercard',
  'amex' || 'american express' => 'AMEX',
  'mada' => 'mada',
  'meeza' => 'Meeza',
  '' => '',
  _ => brand[0].toUpperCase() + brand.substring(1),
};

/// The saved card as a card: the brand, the last four digits, the
/// student's name and when it expires; without one, a note that the card
/// is entered on the checkout.
class _CardFace extends StatelessWidget {
  const _CardFace({required this.card, required this.holder, this.onTap});

  final SavedCard? card;
  final String holder;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final c = card;
    if (c == null) {
      return Material(
        color: p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
          side: BorderSide(color: p.divider),
        ),
        child: InkWell(
          key: const ValueKey('course-cart-card'),
          borderRadius: BorderRadius.circular(22),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(Symbols.credit_card_rounded, color: p.textSecondary),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    context.l10n.cardAtCheckout,
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }
    const white = Colors.white;
    final mute = white.withValues(alpha: 0.85);
    return Semantics(
      button: onTap != null,
      label: '${_brand(c.brand)} ${c.last4}',
      child: GestureDetector(
        key: const ValueKey('course-cart-card'),
        onTap: onTap,
        child: Container(
          height: 150,
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF16205A), Color(0xFF2B4BB0), Color(0xFF8FB0F2)],
              stops: [0, 0.6, 1],
            ),
          ),
          // A card reads left to right in every language.
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      _brand(c.brand),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                        color: white,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      width: 26,
                      height: 26,
                      decoration: const BoxDecoration(
                        color: white,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Symbols.contactless_rounded,
                        size: 18,
                        color: Color(0xFF16205A),
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Text(
                  '••••  ••••  ••••  ${c.last4}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 2.5,
                    color: white,
                  ),
                ),
                const Spacer(),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        holder.toUpperCase(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 11, color: mute),
                      ),
                    ),
                    Text(c.expiry, style: TextStyle(fontSize: 11, color: mute)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
