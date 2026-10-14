import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/data/lms_providers.dart' show ordersProvider;
import '../data/cart_controller.dart';
import '../data/store_providers.dart';
import '../widgets/fulfilment_widgets.dart';
import '../widgets/product_widgets.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/vertical_wording.dart';

/// The shop's order received page, reached at the end of the checkout:
/// WooCommerce's and the hosted payment page's `order-received`, Shopify's
/// `thank_you`.
bool isOrderReceived(Uri url) =>
    url.pathSegments.contains('order-received') ||
    url.pathSegments.contains('thank_you') ||
    url.queryParameters.containsKey('order-received');

/// The Cart tab: lines priced by the shop, the delivery date and gift
/// message, and the checkout on the website. 26 A restaurant's cart also
/// asks pickup or delivery, the address and when.
class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  DateTime? _deliveryDate;
  final _gift = TextEditingController();
  bool _busy = false;

  // 26 A restaurant's pickup or delivery.
  FulfilmentType? _type;
  final _address = TextEditingController();
  final _notes = TextEditingController();
  String? _district;
  bool _later = false;
  DateTime? _slot;

  @override
  void initState() {
    super.initState();
    _address.addListener(_changed);
  }

  void _changed() => setState(() {});

  @override
  void dispose() {
    _gift.dispose();
    _address.dispose();
    _notes.dispose();
    super.dispose();
  }

  /// Why a restaurant's order can't be placed yet; null when it can.
  String? _fulfilmentProblem(
    FulfilmentConfig config,
    OrderTimes? times,
    CartQuote? quote,
  ) {
    final l10n = context.l10n;
    final type = _type ?? config.types.firstOrNull;
    if (type == null || times == null) return '';
    if (type == FulfilmentType.delivery) {
      if (_address.text.trim().length < 5) return l10n.deliveryEnterAddress;
      if (config.deliveryAreas.isNotEmpty && _district == null) {
        return l10n.optionsMissing(l10n.deliveryDistrict);
      }
      final min = centsOf(config.minOrder);
      if (quote != null && min > 0 && centsOf(quote.subtotalAmount) < min) {
        return l10n.deliveryMinimum(config.minOrderFormatted ?? '');
      }
    }
    if (_laterChosen(config, times)) {
      if (_slot == null) return l10n.orderChooseTime;
    } else if (!times.asap) {
      return times.openNow ? l10n.orderChooseTime : l10n.closedNow;
    }
    return null;
  }

  /// A time for later: chosen, or the only way when as soon as possible isn't taken now.
  bool _laterChosen(FulfilmentConfig config, OrderTimes times) =>
      _later || (!times.asap && config.scheduled && times.slots.isNotEmpty);

  Future<void> _pickDate(DeliveryDateRules rules) async {
    final today = DateTime.now();
    final first = rules.firstDay(today);
    if (first == null) {
      showMessage(context, context.l10n.noDeliveryDays);
      return;
    }
    final last = DateTime(today.year, today.month, today.day + rules.maxDays);
    final current = _deliveryDate;
    final picked = await showDatePicker(
      context: context,
      helpText: context.l10n.deliveryDate,
      initialDate: current != null && rules.allows(current, today)
          ? current
          : first,
      firstDate: first,
      lastDate: last,
      selectableDayPredicate: (day) => rules.allows(day, today),
    );
    if (picked != null && mounted) setState(() => _deliveryDate = picked);
  }

  void _clear() async {
    final ok = await confirmAction(
      context,
      title: context.l10n.emptyCartTitle,
      message: context.l10n.emptyCartMessage,
      confirmLabel: context.l10n.emptyCart,
      destructive: true,
    );
    if (ok) ref.read(cartProvider.notifier).clear();
  }

  Future<void> _checkout(StoreConfig store) async {
    final signedIn = ref.read(authControllerProvider).isSignedIn;
    if (!signedIn && !store.guestCheckout) {
      await context.push(
        Uri(
          path: Paths.signIn,
          queryParameters: {'from': Paths.cart},
        ).toString(),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final items = ref.read(cartProvider);
      final date = _deliveryDate;
      final fulfilment = store.fulfilment;
      final times = fulfilment != null
          ? ref.read(orderTimesProvider).value
          : null;
      final type = _type ?? fulfilment?.types.firstOrNull;
      final later =
          fulfilment != null &&
          times != null &&
          _laterChosen(fulfilment, times);
      final link = await ref
          .read(yallappApiProvider)
          .createStoreCheckoutLink(
            [for (final i in items) i.toInput()],
            deliveryDate: store.deliveryDate.enabled && date != null
                ? isoDate(date)
                : null,
            giftMessage: store.giftMessage.enabled ? _gift.text : null,
            fulfilment: fulfilment != null ? type : null,
            deliveryAddress: type == FulfilmentType.delivery
                ? DeliveryAddress(
                    address: _address.text,
                    district: _district,
                    notes: _notes.text,
                  )
                : null,
            scheduledFor: later ? _slot : null,
          );
      if (!mounted) return;
      final inApp =
          link.openIn == CheckoutTarget.inApp &&
          store.checkoutOpensIn != CheckoutOpensIn.browser;
      if (inApp) {
        final done = await context.push<bool>(
          Paths.web,
          extra: WebPageArgs(
            url: link.url,
            title: context.l10n.checkout,
            completesOn: isOrderReceived,
          ),
        );
        if (done == true && mounted) _ordered();
      } else {
        final opened = await openExternal(link.url);
        if (!opened && mounted) {
          showMessage(context, context.l10n.checkoutFailed);
        }
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.code == ApiException.cartChanged) {
        ref.invalidate(cartQuoteProvider);
      }
      // 26 The kitchen closed, or a time went: ask for the times again.
      if (store.fulfilment != null) ref.invalidate(orderTimesProvider);
      showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _ordered() {
    final restaurant = ref.read(appConfigProvider).store?.fulfilment != null;
    ref.read(cartProvider.notifier).clear();
    ref.invalidate(ordersProvider);
    setState(() {
      _deliveryDate = null;
      _gift.clear();
      _slot = null;
      _later = false;
    });
    showMessage(context, context.l10n.orderPlaced);
    // 26 A restaurant's customer follows the order from their orders.
    if (restaurant) context.push(Paths.orders);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final store = ref.watch(appConfigProvider).store;
    final items = ref.watch(cartProvider);
    final quote = ref.watch(cartQuoteProvider);

    if (store == null) {
      return Scaffold(
        body: SafeArea(
          child: MessageView(
            icon: AppIcons.shop,
            title: context.l10n.shopClosedTitle,
            message: context.l10n.tryLater,
          ),
        ),
      );
    }

    final header = Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(20, 16, 12, 8),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              header: true,
              child: Text(
                context.l10n.tabCart,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
            ),
          ),
          if (items.isNotEmpty)
            TextButton(onPressed: _clear, child: Text(context.l10n.emptyCart)),
        ],
      ),
    );

    if (items.isEmpty) {
      return Scaffold(
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              header,
              Expanded(
                child: MessageView(
                  icon: AppIcons.cart,
                  title: context.l10n.cartEmptyTitle,
                  message: context.l10n.cartEmptyMessage,
                  actionLabel: context.words.startShopping,
                  onAction: () => context.go(Paths.shop),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final value = quote.value;
    final lines = value?.lines ?? const <CartQuoteLine>[];
    final blocked = lines.any((l) => !l.available);
    final rules = store.deliveryDate;
    final needsDate = rules.enabled && rules.required && _deliveryDate == null;
    // 26 A restaurant: pickup or delivery, the address and when.
    final fulfilment = store.fulfilment;
    final times = fulfilment != null
        ? ref.watch(orderTimesProvider).value
        : null;
    final type = _type ?? fulfilment?.types.firstOrNull;
    final fulfilmentProblem = fulfilment != null
        ? _fulfilmentProblem(fulfilment, times, value)
        : null;
    final deliveryFee =
        type == FulfilmentType.delivery &&
            fulfilment?.deliveryFeeFormatted != null
        ? fulfilment!.deliveryFeeFormatted
        : null;
    final ready =
        value != null &&
        !quote.isLoading &&
        !blocked &&
        !needsDate &&
        fulfilmentProblem == null;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            header,
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => ref.refresh(cartQuoteProvider.future),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                  children: [
                    for (var i = 0; i < items.length; i++) ...[
                      _LineCard(
                        item: items[i],
                        line: i < lines.length ? lines[i] : null,
                      ),
                      const SizedBox(height: 10),
                    ],
                    if (quote.hasError && value == null)
                      ErrorView(
                        error: quote.error!,
                        onRetry: () => ref.invalidate(cartQuoteProvider),
                      ),
                    if (fulfilment != null && type != null) ...[
                      if (times != null && !times.openNow) ...[
                        const SizedBox(height: 4),
                        ClosedNotice(
                          times: times,
                          later: fulfilment.scheduled && times.slots.isNotEmpty,
                        ),
                      ],
                      const SizedBox(height: 16),
                      FulfilmentPanel(
                        config: fulfilment,
                        type: type,
                        onType: (t) => setState(() => _type = t),
                        address: _address,
                        notes: _notes,
                        district: _district,
                        onDistrict: (d) => setState(() => _district = d),
                        times: times,
                        later: times != null && _laterChosen(fulfilment, times),
                        onLater: (v) => setState(() => _later = v),
                        slot: _slot,
                        onSlot: (s) => setState(() {
                          _later = true;
                          _slot = s;
                        }),
                      ),
                    ],
                    if (rules.enabled) ...[
                      const SizedBox(height: 8),
                      AppCard(
                        child: SettingsTile(
                          icon: AppIcons.calendar,
                          title: rules.required
                              ? context.l10n.deliveryDate
                              : context.l10n.deliveryDateOptional,
                          value: _deliveryDate == null
                              ? context.l10n.choose
                              : dayLabel(_deliveryDate!),
                          onTap: () => _pickDate(rules),
                        ),
                      ),
                    ],
                    if (store.giftMessage.enabled) ...[
                      const SizedBox(height: 12),
                      TextField(
                        controller: _gift,
                        maxLength: store.giftMessage.maxLength,
                        minLines: 2,
                        maxLines: 4,
                        textCapitalization: TextCapitalization.sentences,
                        decoration: InputDecoration(
                          labelText: context.l10n.giftMessage,
                          hintText: context.l10n.giftMessageHint,
                          prefixIcon: AppIcon(
                            AppIcons.gift,
                            size: 20,
                            color: p.textSecondary,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    AppCard(
                      color: p.surfaceMuted,
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  context.l10n.subtotal,
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: p.text,
                                  ),
                                ),
                              ),
                              Text(
                                value?.subtotal ?? '…',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: p.text,
                                ),
                              ),
                            ],
                          ),
                          if (deliveryFee != null) ...[
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    context.l10n.deliveryFee,
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: p.text,
                                    ),
                                  ),
                                ),
                                Text(
                                  deliveryFee,
                                  style: TextStyle(fontSize: 14, color: p.text),
                                ),
                              ],
                            ),
                          ],
                          if (fulfilment == null) ...[
                            const SizedBox(height: 4),
                            Text(
                              context.l10n.deliveryAndTaxes,
                              style: TextStyle(
                                fontSize: 13,
                                color: p.textSecondary,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomActionBar(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (blocked ||
                needsDate ||
                (fulfilmentProblem != null && fulfilmentProblem.isNotEmpty))
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  blocked
                      ? context.l10n.fixCartItems
                      : needsDate
                      ? context.l10n.chooseDeliveryDate
                      : fulfilmentProblem!,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ),
            PrimaryButton(
              label: context.l10n.checkout,
              loading: _busy,
              onPressed: ready && !_busy ? () => _checkout(store) : null,
            ),
          ],
        ),
      ),
    );
  }
}

class _LineCard extends ConsumerWidget {
  const _LineCard({required this.item, this.line});

  final CartItem item;

  /// The shop's view of this line, once priced.
  final CartQuoteLine? line;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final cart = ref.read(cartProvider.notifier);
    final quoted = line;
    final max =
        quoted?.maxQuantity ?? item.maxQuantity ?? CartController.maxQuantity;
    final options = quoted != null && quoted.options.isNotEmpty
        ? [for (final o in quoted.options) o.name]
        : item.optionNames;
    return AppCard(
      padding: const EdgeInsets.all(10),
      onTap: () => context.push(Paths.product(item.productId)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppNetworkImage(
            url: quoted?.imageUrl ?? item.imageUrl,
            seed: item.productId,
            width: 84,
            height: 84,
            radius: context.shapes.r(12),
            placeholderIcon: AppIcons.shop,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        quoted?.name ?? item.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          height: 1.35,
                          color: p.text,
                        ),
                      ),
                    ),
                    SquareIconButton(
                      icon: AppIcons.delete,
                      label: context.l10n.removeItem(item.name),
                      size: 36,
                      iconSize: 18,
                      bordered: false,
                      onPressed: () => cart.remove(item.key),
                    ),
                  ],
                ),
                // 26 The chosen options, as the shop priced them.
                if (options.isNotEmpty)
                  Text(
                    options.join(', '),
                    style: TextStyle(fontSize: 13, color: p.text),
                  ),
                Text(
                  quoted?.unitPrice ?? item.price ?? '',
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                if (quoted?.problem != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    quoted!.problem!,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: p.danger,
                    ),
                  ),
                ],
                const SizedBox(height: 4),
                LayoutBuilder(
                  builder: (context, constraints) {
                    final stepper = QuantityControl(
                      quantity: item.quantity,
                      max: max < item.quantity ? item.quantity : max,
                      compact: true,
                      onChanged: (q) => cart.setQuantity(item.key, q),
                    );
                    final total = quoted != null && quoted.available
                        ? Text(
                            quoted.lineTotal,
                            maxLines: 1,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: p.text,
                            ),
                          )
                        : null;
                    // The total goes under the stepper on narrow phones.
                    final room = MediaQuery.textScalerOf(context).scale(56);
                    if (total == null ||
                        constraints.maxWidth >= 136 + 8 + room) {
                      return Row(
                        children: [
                          stepper,
                          const SizedBox(width: 8),
                          if (total != null)
                            Expanded(
                              child: Align(
                                alignment: AlignmentDirectional.centerEnd,
                                child: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: total,
                                ),
                              ),
                            ),
                        ],
                      );
                    }
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [stepper, const SizedBox(height: 4), total],
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
