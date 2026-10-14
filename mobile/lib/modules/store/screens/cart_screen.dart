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
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/data/lms_providers.dart' show ordersProvider;
import '../data/cart_controller.dart';
import '../data/store_providers.dart';
import '../widgets/product_widgets.dart';
import '../../../core/l10n/l10n.dart';

/// The shop's order received page, reached at the end of the checkout:
/// WooCommerce's and the hosted payment page's `order-received`, Shopify's
/// `thank_you`.
bool isOrderReceived(Uri url) =>
    url.pathSegments.contains('order-received') ||
    url.pathSegments.contains('thank_you') ||
    url.queryParameters.containsKey('order-received');

/// The Cart tab: lines priced by the shop, the delivery date and gift
/// message, and the checkout on the website.
class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  DateTime? _deliveryDate;
  final _gift = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _gift.dispose();
    super.dispose();
  }

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
      final link = await ref
          .read(yallappApiProvider)
          .createStoreCheckoutLink(
            [for (final i in items) i.toInput()],
            deliveryDate: store.deliveryDate.enabled && date != null
                ? isoDate(date)
                : null,
            giftMessage: store.giftMessage.enabled ? _gift.text : null,
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
      showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _ordered() {
    ref.read(cartProvider.notifier).clear();
    ref.invalidate(ordersProvider);
    setState(() {
      _deliveryDate = null;
      _gift.clear();
    });
    showMessage(context, context.l10n.orderPlaced);
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
                  actionLabel: context.l10n.startShopping,
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
    final ready = value != null && !quote.isLoading && !blocked && !needsDate;

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
                    const SizedBox(height: 12),
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
                    const SizedBox(height: 4),
                    Text(
                      context.l10n.deliveryAndTaxes,
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
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
            if (blocked || needsDate)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  blocked
                      ? context.l10n.fixCartItems
                      : context.l10n.chooseDeliveryDate,
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
    return AppCard(
      padding: const EdgeInsets.all(10),
      onTap: () => context.push(Paths.product(item.productId)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppNetworkImage(
            url: quoted?.imageUrl ?? item.imageUrl,
            seed: item.productId,
            width: 76,
            height: 76,
            radius: 12,
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
                const SizedBox(height: 6),
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    QuantityControl(
                      quantity: item.quantity,
                      max: max < item.quantity ? item.quantity : max,
                      compact: true,
                      onChanged: (q) => cart.setQuantity(item.key, q),
                    ),
                    if (quoted != null && quoted.available)
                      Text(
                        quoted.lineTotal,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
