import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/market_api_models.dart' as api;
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../delivery/data/delivery_providers.dart' show LocateProblem;
import '../../real_estate/widgets/listing_widgets.dart' show signInFor;
import '../../store/screens/cart_screen.dart' show isOrderReceived;
import '../data/market_basket.dart';
import '../data/market_models.dart';
import '../data/market_place.dart';
import '../data/market_providers.dart';
import 'market_orders_screen.dart' show marketOrdersProvider;

/// 115 The checkout: the basket's items (at a shop, what to do when one is
/// out), delivery to the customer's place or picking it up, now or later,
/// a coupon, the wallet and how to pay, with every line of the price as the
/// server quotes it. Online payments open the gateway's page in the app
/// (it offers Apple Pay and Google Pay where the gateway does).
class MarketCheckoutScreen extends ConsumerStatefulWidget {
  const MarketCheckoutScreen({super.key});

  @override
  ConsumerState<MarketCheckoutScreen> createState() =>
      _MarketCheckoutScreenState();
}

class _MarketCheckoutScreenState extends ConsumerState<MarketCheckoutScreen> {
  final _details = TextEditingController();
  final _coupon = TextEditingController();
  final _notes = TextEditingController();
  api.MarketFulfilment _fulfilment = api.MarketFulfilment.delivery;
  DateTime? _later;
  bool _useWallet = false;
  String? _appliedCoupon;
  api.MarketPayMethod? _payment;

  api.MarketQuote? _quote;
  String? _quoteError;
  bool _quoting = false;
  bool _placing = false;
  Timer? _debounce;
  int _asked = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _requote());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _details.dispose();
    _coupon.dispose();
    _notes.dispose();
    super.dispose();
  }

  api.MarketCartInput? _cart() {
    final basket = ref.read(marketBasketProvider);
    final vendor = basket.vendor;
    final vendorId = vendor == null ? null : int.tryParse(vendor.id);
    if (vendorId == null || basket.isEmpty) return null;
    final place = ref.read(marketPlaceProvider);
    return api.MarketCartInput(
      vendorId: vendorId,
      lines: basket.inputs(shop: vendor!.sellsGoods),
      fulfilment: _fulfilment,
      address: place == null
          ? null
          : (place.address?.trim().isNotEmpty ?? false)
          ? place.address
          : '${place.lat.toStringAsFixed(5)}, ${place.lng.toStringAsFixed(5)}',
      addressDetails: _details.text.trim(),
      lat: place?.lat,
      lng: place?.lng,
      scheduledFor: _later,
      couponCode: _appliedCoupon,
      useWallet: _useWallet,
    );
  }

  /// Asks the server for the cart's prices, a moment after the last change.
  void _requote({bool now = false}) {
    _debounce?.cancel();
    _debounce = Timer(
      now ? Duration.zero : const Duration(milliseconds: 350),
      _askQuote,
    );
  }

  Future<void> _askQuote() async {
    final cart = _cart();
    if (cart == null) return;
    if (_fulfilment == api.MarketFulfilment.delivery &&
        ref.read(marketPlaceProvider) == null) {
      setState(() {
        _quote = null;
        _quoteError = context.l10n.marketNeedAddress;
      });
      return;
    }
    final asked = ++_asked;
    setState(() => _quoting = true);
    try {
      final quote = await ref.read(yallappApiProvider).quoteMarketOrder(cart);
      if (!mounted || asked != _asked) return;
      setState(() {
        _quote = quote;
        _quoteError = null;
      });
    } on ApiException catch (e) {
      if (!mounted || asked != _asked) return;
      setState(() {
        _quote = null;
        _quoteError = e.message;
        if (e.code == 'coupon_invalid') _appliedCoupon = null;
      });
    } finally {
      if (mounted && asked == _asked) setState(() => _quoting = false);
    }
  }

  List<api.MarketPayMethod> _methods(api.MarketConfig? config) {
    final pay = config?.payment ?? const api.MarketPayment(cash: true);
    final ios = defaultTargetPlatform == TargetPlatform.iOS;
    final android = defaultTargetPlatform == TargetPlatform.android;
    final coveredByWallet =
        _useWallet && _quote != null && _quote!.payNow.isZero;
    if (coveredByWallet) return const [api.MarketPayMethod.wallet];
    return [
      if (pay.cash) api.MarketPayMethod.cash,
      if (pay.card) api.MarketPayMethod.card,
      if (pay.applePay && ios) api.MarketPayMethod.applePay,
      if (pay.googlePay && android) api.MarketPayMethod.googlePay,
    ];
  }

  Future<void> _pickLater(api.MarketConfig? config) async {
    final now = DateTime.now();
    final days = (config?.daysAhead ?? 0).clamp(0, 30);
    final day = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(Duration(days: days)),
      initialDate: _later ?? now,
    );
    if (day == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(
        _later ?? now.add(const Duration(hours: 1)),
      ),
    );
    if (time == null || !mounted) return;
    setState(
      () => _later = DateTime(
        day.year,
        day.month,
        day.day,
        time.hour,
        time.minute,
      ),
    );
    _requote(now: true);
  }

  Future<void> _locate() async {
    final l10n = context.l10n;
    final problem = await ref
        .read(marketPlaceProvider.notifier)
        .useMyLocation();
    if (!mounted) return;
    if (problem != null) {
      showMessage(context, switch (problem) {
        LocateProblem.off => l10n.locateOff,
        LocateProblem.denied => l10n.locateDenied,
        _ => l10n.locateFailed,
      });
      return;
    }
    _requote(now: true);
  }

  Future<void> _place(List<api.MarketPayMethod> methods) async {
    final l10n = context.l10n;
    final auth = ref.read(authControllerProvider);
    if (!auth.isSignedIn) {
      signInFor(context, Paths.marketCheckout);
      return;
    }
    final quote = _quote;
    final cart = _cart();
    final payment = (_payment != null && methods.contains(_payment))
        ? _payment
        : null;
    if (quote == null || cart == null || payment == null) return;
    setState(() => _placing = true);
    try {
      final placed = await ref
          .read(yallappApiProvider)
          .placeMarketOrder(
            cart,
            quoteId: quote.quoteId,
            payment: payment,
            notes: _notes.text.trim(),
          );
      if (!mounted) return;
      ref
        ..read(marketBasketProvider.notifier).clear()
        ..invalidate(marketOrdersProvider);
      final payUrl = placed.payUrl;
      if (payUrl != null) {
        final paid = await context.push<bool>(
          Paths.web,
          extra: WebPageArgs(
            url: payUrl,
            title: l10n.checkout,
            completesOn: isOrderReceived,
          ),
        );
        if (!mounted) return;
        if (paid == true) showMessage(context, l10n.marketOrderPaid);
      } else {
        showMessage(context, l10n.marketOrderSent);
      }
      if (mounted) context.pushReplacement(Paths.marketOrder(placed.order.id));
    } on ApiException catch (e) {
      if (!mounted) return;
      showMessage(context, e.message);
      if (e.code == 'quote_expired') _requote(now: true);
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final basket = ref.watch(marketBasketProvider);
    final config = ref.watch(marketConfigProvider);
    final place = ref.watch(marketPlaceProvider);
    final vendor = basket.vendor;
    if (basket.isEmpty || vendor == null) {
      return Scaffold(
        appBar: AppBar(
          leading: appBarBack(context),
          title: Text(l10n.marketCheckoutTitle),
        ),
        body: MessageView(
          icon: AppIcons.cart,
          title: l10n.marketEmptyBasketTitle,
          message: l10n.marketEmptyBasketMessage,
          actionLabel: l10n.marketBrowse,
          onAction: () => context.go(Paths.home),
        ),
      );
    }
    final shop = vendor.sellsGoods;
    final methods = _methods(config);
    final payment = methods.contains(_payment)
        ? _payment
        : (methods.isEmpty ? null : methods.first);
    if (payment != _payment) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _payment = payment);
      });
    }
    final quote = _quote;
    return Scaffold(
      backgroundColor: p.background,
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.marketCheckoutTitle),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          _Card(
            child: Row(
              children: [
                Icon(
                  shop ? Symbols.storefront : Symbols.restaurant,
                  color: p.primary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    vendor.name,
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _Card(
            child: Column(
              children: [
                for (final line in basket.lines)
                  _BasketRow(
                    line: line,
                    shop: shop,
                    onAdd: () {
                      ref
                          .read(marketBasketProvider.notifier)
                          .add(
                            vendor,
                            line.item,
                            currency: basket.currency,
                            decimals: basket.decimals,
                          );
                      _requote();
                    },
                    onRemove: () {
                      ref.read(marketBasketProvider.notifier).remove(line.item);
                      _requote();
                    },
                    onIfMissing: (v) {
                      ref
                          .read(marketBasketProvider.notifier)
                          .setIfMissing(line.item.id, v);
                      _requote();
                    },
                  ),
              ],
            ),
          ),
          if (config?.pickup ?? false) ...[
            const SizedBox(height: 12),
            SegmentedButton<api.MarketFulfilment>(
              segments: [
                ButtonSegment(
                  value: api.MarketFulfilment.delivery,
                  icon: const Icon(Symbols.two_wheeler),
                  label: Text(l10n.marketDelivery),
                ),
                ButtonSegment(
                  value: api.MarketFulfilment.pickup,
                  icon: const Icon(Symbols.storefront),
                  label: Text(l10n.marketPickup),
                ),
              ],
              selected: {_fulfilment},
              onSelectionChanged: (v) {
                setState(() => _fulfilment = v.first);
                _requote(now: true);
              },
            ),
          ],
          if (_fulfilment == api.MarketFulfilment.delivery) ...[
            const SizedBox(height: 12),
            _Card(
              title: l10n.marketDeliverHere,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Icon(Symbols.location_on, color: p.primary),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          place?.address ?? l10n.marketChooseAddress,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: place == null ? p.textSecondary : p.text,
                          ),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: _locate,
                        icon: const Icon(Symbols.my_location, size: 18),
                        label: Text(l10n.marketUseMyLocation),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _details,
                    decoration: InputDecoration(
                      hintText: l10n.marketAddressDetails,
                    ),
                    maxLength: 200,
                    onChanged: (_) => _requote(),
                  ),
                ],
              ),
            ),
          ],
          if (config?.scheduling ?? false) ...[
            const SizedBox(height: 12),
            _Card(
              title: l10n.marketWhen,
              child: Wrap(
                spacing: 8,
                children: [
                  ChoiceChip(
                    label: Text(l10n.marketNow),
                    selected: _later == null,
                    onSelected: (_) {
                      setState(() => _later = null);
                      _requote(now: true);
                    },
                  ),
                  ChoiceChip(
                    label: Text(
                      _later == null
                          ? l10n.marketLater
                          : l10n.marketScheduledFor(
                              '${MaterialLocalizations.of(context).formatMediumDate(_later!)}'
                              ' · ${TimeOfDay.fromDateTime(_later!).format(context)}',
                            ),
                    ),
                    selected: _later != null,
                    onSelected: (_) => _pickLater(config),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          _Card(
            title: l10n.marketCoupon,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _coupon,
                    textCapitalization: TextCapitalization.characters,
                    decoration: InputDecoration(
                      hintText: l10n.marketCoupon,
                      prefixIcon: const Icon(Symbols.sell),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 104,
                  child: FilledButton.tonal(
                    onPressed: () {
                      setState(() => _appliedCoupon = _coupon.text.trim());
                      _requote(now: true);
                    },
                    child: Text(l10n.marketApply),
                  ),
                ),
              ],
            ),
          ),
          if (config?.wallet ?? false) ...[
            const SizedBox(height: 12),
            _Card(
              child: SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                secondary: Icon(
                  Symbols.account_balance_wallet,
                  color: p.primary,
                ),
                title: Text(l10n.marketUseWallet),
                value: _useWallet,
                onChanged: (v) {
                  setState(() => _useWallet = v);
                  _requote(now: true);
                },
              ),
            ),
          ],
          const SizedBox(height: 12),
          _Card(
            title: l10n.marketPayWith,
            child: RadioGroup<api.MarketPayMethod>(
              groupValue: payment,
              onChanged: (v) => setState(() => _payment = v),
              child: Column(
                children: [
                  for (final m in methods)
                    RadioListTile<api.MarketPayMethod>(
                      contentPadding: EdgeInsets.zero,
                      value: m,
                      secondary: Icon(_methodIcon(m), color: p.textSecondary),
                      title: Text(_methodName(l10n, m)),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          _Card(
            child: TextField(
              controller: _notes,
              maxLength: 300,
              minLines: 1,
              maxLines: 3,
              decoration: InputDecoration(hintText: l10n.marketNotes),
            ),
          ),
          const SizedBox(height: 12),
          _Card(
            child: _quoting && quote == null
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      l10n.marketPricing,
                      style: TextStyle(color: p.textSecondary),
                    ),
                  )
                : quote == null
                ? Text(
                    _quoteError ?? l10n.marketPricing,
                    style: TextStyle(color: p.danger),
                  )
                : _QuoteLines(quote: quote, error: _quoteError),
          ),
          const SizedBox(height: 20),
          PrimaryButton(
            label: l10n.marketPlaceOrder(
              quote?.payNow.formatted ?? quote?.total.formatted ?? '',
            ),
            loading: _placing,
            onPressed: quote == null || _quoting || payment == null
                ? null
                : () => _place(methods),
          ),
        ],
      ),
    );
  }
}

IconData _methodIcon(api.MarketPayMethod m) => switch (m) {
  api.MarketPayMethod.cash => Symbols.payments,
  api.MarketPayMethod.card => Symbols.credit_card,
  api.MarketPayMethod.applePay => Symbols.contactless,
  api.MarketPayMethod.googlePay => Symbols.contactless,
  api.MarketPayMethod.wallet => Symbols.account_balance_wallet,
};

String _methodName(AppLocalizations l10n, api.MarketPayMethod m) => switch (m) {
  api.MarketPayMethod.cash => l10n.marketPayCash,
  api.MarketPayMethod.card => l10n.marketPayCard,
  api.MarketPayMethod.applePay => l10n.marketPayApplePay,
  api.MarketPayMethod.googlePay => l10n.marketPayGooglePay,
  api.MarketPayMethod.wallet => l10n.marketPayWallet,
};

class _Card extends StatelessWidget {
  const _Card({required this.child, this.title});

  final Widget child;
  final String? title;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Material(
      color: p.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: p.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (title != null) ...[
              Text(
                title!,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.4,
                  color: p.textSecondary,
                ),
              ),
              const SizedBox(height: 10),
            ],
            child,
          ],
        ),
      ),
    );
  }
}

class _BasketRow extends StatelessWidget {
  const _BasketRow({
    required this.line,
    required this.shop,
    required this.onAdd,
    required this.onRemove,
    required this.onIfMissing,
  });

  final MarketBasketLine line;
  final bool shop;
  final VoidCallback onAdd;
  final VoidCallback onRemove;
  final ValueChanged<api.MarketIfMissing> onIfMissing;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final item = line.item;
    final byWeight = item.unit != MarketUnit.piece;
    final qty = byWeight
        ? '${line.quantity.toStringAsFixed(line.quantity % 1 == 0 ? 0 : 2)} ${item.unit.name}'
        : line.quantity.round().toString();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                    Text(
                      item.price,
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: onRemove,
                icon: const Icon(Symbols.remove),
                tooltip: '−',
              ),
              Text(
                qty,
                style: TextStyle(fontWeight: FontWeight.w800, color: p.text),
              ),
              IconButton(
                onPressed: onAdd,
                icon: const Icon(Symbols.add),
                tooltip: '+',
              ),
            ],
          ),
          if (shop)
            Row(
              children: [
                Text(
                  l10n.marketIfMissing,
                  style: TextStyle(fontSize: 12.5, color: p.textSecondary),
                ),
                const SizedBox(width: 8),
                DropdownButton<api.MarketIfMissing>(
                  value: line.ifMissing == api.MarketIfMissing.chosen
                      ? api.MarketIfMissing.similar
                      : line.ifMissing,
                  isDense: true,
                  underline: const SizedBox.shrink(),
                  items: [
                    DropdownMenuItem(
                      value: api.MarketIfMissing.similar,
                      child: Text(l10n.marketIfMissingSimilar),
                    ),
                    DropdownMenuItem(
                      value: api.MarketIfMissing.remove,
                      child: Text(l10n.marketIfMissingRemove),
                    ),
                  ],
                  onChanged: (v) {
                    if (v != null) onIfMissing(v);
                  },
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _QuoteLines extends StatelessWidget {
  const _QuoteLines({required this.quote, this.error});

  final api.MarketQuote quote;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final line in quote.price)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    line.label,
                    style: TextStyle(
                      fontWeight: line.isTotal
                          ? FontWeight.w800
                          : FontWeight.w500,
                      fontSize: line.isTotal ? 16 : 14,
                      color: line.isTotal ? p.text : p.textSecondary,
                    ),
                  ),
                ),
                Text(
                  line.amount.formatted,
                  style: TextStyle(
                    fontWeight: line.isTotal
                        ? FontWeight.w800
                        : FontWeight.w600,
                    fontSize: line.isTotal ? 16 : 14,
                    color: p.text,
                  ),
                ),
              ],
            ),
          ),
        for (final w in quote.warnings)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              w,
              style: TextStyle(fontSize: 12.5, color: p.textSecondary),
            ),
          ),
        if (error != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(error!, style: TextStyle(color: p.danger)),
          ),
      ],
    );
  }
}
