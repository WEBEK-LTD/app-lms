import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../delivery/data/delivery_providers.dart';
import '../../delivery/data/locate.dart';
import '../../delivery/screens/send_parcel_screen.dart'
    show PasteLinkDialog, PlaceEditor, PlaceFields;
import '../../delivery/widgets/delivery_map.dart';
import '../../real_estate/widgets/listing_widgets.dart' show signInFor;
import '../../store/screens/cart_screen.dart' show isOrderReceived;
import '../../store/widgets/product_widgets.dart' show QuantityControl;
import '../data/food_providers.dart';
import '../widgets/food_widgets.dart';

/// 105.1 The checkout: the cart's dishes, where to deliver (typed, from the
/// phone's position, a maps link or the map, as in sending a parcel), a
/// number for the courier when the account has none, notes and how to pay,
/// with the total the server prices before ordering.
class FoodCartScreen extends ConsumerStatefulWidget {
  const FoodCartScreen({super.key});

  @override
  ConsumerState<FoodCartScreen> createState() => _FoodCartScreenState();
}

class _FoodCartScreenState extends ConsumerState<FoodCartScreen> {
  final _dropoff = PlaceFields();
  final _phone = TextEditingController();
  final _notes = TextEditingController();
  PaymentMethod? _payment;
  FoodQuote? _quote;
  String? _quoteError;
  bool _quoting = false;
  bool _placing = false;
  Timer? _debounce;
  int _quoteGeneration = 0;

  @override
  void initState() {
    super.initState();
    _dropoff.address.addListener(_requote);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _dropoff.dispose();
    _phone.dispose();
    _notes.dispose();
    super.dispose();
  }

  PaymentMethod _paymentOf(FoodConfig config) =>
      _payment ?? (config.cash ? PaymentMethod.cash : PaymentMethod.card);

  FoodOrderRequest? _request(FoodConfig config) {
    final cart = ref.read(foodCartProvider);
    if (cart.isEmpty || cart.restaurantId == null) return null;
    return FoodOrderRequest(
      restaurantId: cart.restaurantId!,
      lines: cart.lines,
      dropoff: _dropoff.place,
      payment: _paymentOf(config),
      phone: _phone.text,
      notes: _notes.text,
    );
  }

  /// Prices again once the user stops typing.
  void _requote() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 600), _quoteNow);
  }

  Future<void> _quoteNow() async {
    if (!mounted) return;
    final request = _request(ref.read(foodConfigProvider));
    if (request == null || _dropoff.address.text.trim().length < 3) {
      setState(() {
        _quote = null;
        _quoteError = null;
      });
      return;
    }
    final generation = ++_quoteGeneration;
    setState(() => _quoting = true);
    try {
      final quote = await ref.read(yallappApiProvider).quoteFoodOrder(request);
      if (!mounted || generation != _quoteGeneration) return;
      setState(() {
        _quote = quote;
        _quoteError = null;
      });
    } on ApiException catch (e) {
      if (!mounted || generation != _quoteGeneration) return;
      setState(() {
        _quote = null;
        _quoteError = e.message;
      });
    } finally {
      if (mounted && generation == _quoteGeneration) {
        setState(() => _quoting = false);
      }
    }
  }

  void _setAt(({double lat, double lng})? at) {
    setState(() => _dropoff.at = at);
    _requote();
  }

  Future<void> _useMyLocation() async {
    final l10n = context.l10n;
    final found = await ref.read(locatorProvider).current();
    if (!mounted) return;
    final p = found.position;
    if (p == null) {
      showMessage(context, switch (found.problem) {
        LocateProblem.off => l10n.locateOff,
        LocateProblem.denied => l10n.locateDenied,
        _ => l10n.locateFailed,
      });
      return;
    }
    _setAt((lat: p.lat, lng: p.lng));
  }

  Future<void> _pasteLink() async {
    final l10n = context.l10n;
    final text = await showDialog<String>(
      context: context,
      builder: (_) => const PasteLinkDialog(),
    );
    if (text == null || text.trim().isEmpty || !mounted) return;
    var at = coordinatesIn(text);
    if (at == null &&
        isMapsLink(text) &&
        ref.read(authControllerProvider).isSignedIn) {
      try {
        at = await ref.read(yallappApiProvider).locateMapLink(text);
      } on ApiException {
        at = null;
      }
    }
    if (!mounted) return;
    if (at == null) {
      showMessage(context, l10n.pasteLinkFailed);
      return;
    }
    _setAt(at);
  }

  Future<void> _onMap(DeliveryConfig config) async {
    final l10n = context.l10n;
    final at = await Navigator.of(context).push<({double lat, double lng})>(
      MaterialPageRoute(
        builder: (_) => MapPickerScreen(
          config: config,
          start: _dropoff.at,
          title: l10n.mapPickTitle,
          confirmLabel: l10n.mapPickConfirm,
        ),
      ),
    );
    if (at != null && mounted) _setAt(at);
  }

  Future<void> _place(FoodConfig config) async {
    final l10n = context.l10n;
    final auth = ref.read(authControllerProvider);
    if (!auth.isSignedIn) {
      signInFor(context, Paths.foodCart);
      return;
    }
    if (_dropoff.address.text.trim().length < 3) {
      showMessage(context, l10n.foodFillAddress);
      return;
    }
    final hasPhone = auth.user?.phone.isNotEmpty ?? false;
    if (!hasPhone && _phone.text.trim().length < 6) {
      showMessage(context, l10n.foodFillPhone);
      return;
    }
    final request = _request(config);
    if (request == null) return;
    setState(() => _placing = true);
    try {
      final placed = await ref.read(yallappApiProvider).placeFoodOrder(request);
      if (!mounted) return;
      ref
        ..read(foodCartProvider.notifier).clear()
        ..invalidate(myFoodOrdersProvider);
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
        if (paid == true) showMessage(context, l10n.foodOrderPaid);
      } else {
        showMessage(context, l10n.foodOrderSent);
      }
      if (mounted) context.pushReplacement(Paths.foodOrder(placed.order.id));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final config = ref.watch(foodConfigProvider);
    final cart = ref.watch(foodCartProvider);
    final auth = ref.watch(authControllerProvider);
    final askPhone = auth.isSignedIn && (auth.user?.phone.isEmpty ?? true);
    final payment = _paymentOf(config);
    if (cart.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          leading: appBarBack(context),
          title: Text(l10n.foodCartTitle),
        ),
        body: MessageView(
          icon: AppIcons.cart,
          title: l10n.foodCartEmptyTitle,
          message: l10n.foodCartEmptyMessage,
          actionLabel: l10n.tabRestaurants,
          onAction: () => context.go(Paths.restaurants),
        ),
      );
    }
    final quote = _quote;
    final body = ListView(
      key: const ValueKey('food-cart'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        _SectionTitle(cart.restaurantName ?? l10n.foodDishes),
        for (var i = 0; i < cart.lines.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cart.lines[i].name,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                      if (cart.lines[i].choiceNames.isNotEmpty)
                        Text(
                          cart.lines[i].choiceNames.join(' · '),
                          style: TextStyle(
                            fontSize: 13,
                            color: p.textSecondary,
                          ),
                        ),
                      if (cart.lines[i].note != null)
                        Text(
                          cart.lines[i].note!,
                          style: TextStyle(fontSize: 13, color: p.textBody),
                        ),
                    ],
                  ),
                ),
                QuantityControl(
                  key: ValueKey('cart-line-$i'),
                  quantity: cart.lines[i].quantity,
                  min: 0,
                  max: 50,
                  compact: true,
                  onChanged: (q) {
                    ref.read(foodCartProvider.notifier).setQuantity(i, q);
                    _requote();
                  },
                ),
              ],
            ),
          ),
        const SizedBox(height: 8),
        _SectionTitle(l10n.foodDeliverTo),
        PlaceEditor(
          keyPrefix: 'dropoff',
          fields: _dropoff,
          config: config.mapConfig,
          onMyLocation: _useMyLocation,
          onPaste: _pasteLink,
          onMap: () => _onMap(config.mapConfig),
          onClear: () => _setAt(null),
        ),
        if (askPhone) ...[
          const SizedBox(height: 10),
          TextField(
            key: const ValueKey('food-phone'),
            controller: _phone,
            keyboardType: TextInputType.phone,
            maxLength: 24,
            decoration: InputDecoration(
              labelText: l10n.foodYourPhone,
              counterText: '',
            ),
          ),
        ],
        const SizedBox(height: 10),
        TextField(
          key: const ValueKey('food-notes'),
          controller: _notes,
          maxLength: 300,
          maxLines: 2,
          decoration: InputDecoration(
            labelText: l10n.sendNotes,
            counterText: '',
          ),
        ),
        if (config.cash && config.card) ...[
          const SizedBox(height: 16),
          _SectionTitle(l10n.sendPayment),
          SegmentedTabs(
            labels: [l10n.payCash, l10n.payCard],
            selected: payment == PaymentMethod.cash ? 0 : 1,
            radio: true,
            onChanged: (i) => setState(
              () => _payment = i == 0 ? PaymentMethod.cash : PaymentMethod.card,
            ),
          ),
        ],
        const SizedBox(height: 20),
        AppCard(
          key: const ValueKey('food-total'),
          padding: const EdgeInsets.all(16),
          child: quote != null && !_quoting
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    AmountRow(
                      label: l10n.foodSubtotal,
                      value: quote.subtotalFormatted,
                    ),
                    AmountRow(
                      label: l10n.foodDeliveryFee,
                      value: quote.deliveryFeeFormatted,
                    ),
                    const Divider(height: 16),
                    AmountRow(
                      label: l10n.foodTotal,
                      value: quote.totalFormatted,
                      strong: true,
                    ),
                    if (quote.deliveryMinutes != null)
                      Text(
                        l10n.foodEta(quote.deliveryMinutes!),
                        style: TextStyle(fontSize: 13, color: p.textSecondary),
                      ),
                  ],
                )
              : Text(
                  _quoting
                      ? l10n.sendPriceCalculating
                      : (_quoteError ?? l10n.foodTotalMissing),
                  style: TextStyle(
                    fontSize: 14,
                    color: _quoteError != null ? p.danger : p.textSecondary,
                  ),
                ),
        ),
      ],
    );
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.foodCartTitle),
      ),
      body: body,
      bottomNavigationBar: BottomActionBar(
        child: PrimaryButton(
          key: const ValueKey('food-place'),
          label: auth.isSignedIn ? l10n.foodPlaceOrder : l10n.foodSignInToOrder,
          icon: AppIcons.foodDelivery,
          loading: _placing,
          onPressed: () => _place(config),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Semantics(
      header: true,
      child: Text(
        text,
        style: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w800,
          color: context.palette.text,
        ),
      ),
    ),
  );
}
