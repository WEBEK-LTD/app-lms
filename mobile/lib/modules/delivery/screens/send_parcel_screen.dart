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
import '../../real_estate/widgets/listing_widgets.dart'
    show TabHeader, signInFor;
import '../../store/screens/cart_screen.dart' show isOrderReceived;
import '../data/delivery_providers.dart';
import '../data/locate.dart';
import '../widgets/delivery_map.dart';
import '../widgets/delivery_widgets.dart';

/// 104 Send a parcel: the service, the pickup and the drop-off (typed, from
/// the phone's position, a maps link or the map), the recipient, the
/// parcel and how to pay, with the price before sending.
class SendParcelScreen extends ConsumerStatefulWidget {
  const SendParcelScreen({super.key, this.serviceId});

  final int? serviceId;

  @override
  ConsumerState<SendParcelScreen> createState() => _SendParcelScreenState();
}

/// A place's fields (105.1 the food checkout's drop-off too).
class PlaceFields {
  final address = TextEditingController();
  final details = TextEditingController();
  ({double lat, double lng})? at;

  Place get place => Place(
    address: address.text,
    details: details.text,
    lat: at?.lat,
    lng: at?.lng,
  );

  void dispose() {
    address.dispose();
    details.dispose();
  }
}

class _SendParcelScreenState extends ConsumerState<SendParcelScreen> {
  final _pickup = PlaceFields();
  final _dropoff = PlaceFields();
  final _recipientName = TextEditingController();
  final _recipientPhone = TextEditingController();
  final _description = TextEditingController();
  final _notes = TextEditingController();
  int? _serviceId;
  String? _zoneId;
  PackageSize _size = PackageSize.small;
  PaymentMethod? _payment;
  Quote? _quote;
  String? _quoteError;
  bool _quoting = false;
  bool _sending = false;
  Timer? _debounce;
  int _quoteGeneration = 0;

  @override
  void initState() {
    super.initState();
    _serviceId = widget.serviceId;
    for (final c in [_pickup.address, _dropoff.address]) {
      c.addListener(_requote);
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _pickup.dispose();
    _dropoff.dispose();
    _recipientName.dispose();
    _recipientPhone.dispose();
    _description.dispose();
    _notes.dispose();
    super.dispose();
  }

  /// 110 The service chosen, else the first one: one is always picked.
  int? get _service =>
      _serviceId ?? ref.read(deliveryServicesProvider).value?.firstOrNull?.id;

  ShipmentRequest _request(DeliveryConfig config) => ShipmentRequest(
    pickup: _pickup.place,
    dropoff: _dropoff.place,
    serviceId: _service,
    zoneId: config.pricing == DeliveryPricing.zone ? _zoneId : null,
    recipientName: _recipientName.text,
    recipientPhone: _recipientPhone.text,
    size: _size,
    description: _description.text,
    notes: _notes.text,
    payment:
        _payment ?? (config.cash ? PaymentMethod.cash : PaymentMethod.card),
  );

  /// Prices again once the user stops typing.
  void _requote() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 600), _quoteNow);
  }

  Future<void> _quoteNow() async {
    if (!mounted) return;
    final config = ref.read(deliveryConfigProvider);
    if (_pickup.address.text.trim().length < 3 ||
        _dropoff.address.text.trim().length < 3) {
      setState(() {
        _quote = null;
        _quoteError = null;
      });
      return;
    }
    final generation = ++_quoteGeneration;
    setState(() => _quoting = true);
    try {
      final quote = await ref
          .read(yallappApiProvider)
          .quoteShipment(_request(config));
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

  void _setAt(PlaceFields fields, ({double lat, double lng})? at) {
    setState(() => fields.at = at);
    _requote();
  }

  Future<void> _useMyLocation(PlaceFields fields) async {
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
    _setAt(fields, (lat: p.lat, lng: p.lng));
  }

  Future<void> _pasteLink(PlaceFields fields) async {
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
    _setAt(fields, at);
  }

  Future<void> _onMap(PlaceFields fields, DeliveryConfig config) async {
    final l10n = context.l10n;
    final at = await Navigator.of(context).push<({double lat, double lng})>(
      MaterialPageRoute(
        builder: (_) => MapPickerScreen(
          config: config,
          start: fields.at,
          title: l10n.mapPickTitle,
          confirmLabel: l10n.mapPickConfirm,
        ),
      ),
    );
    if (at != null && mounted) _setAt(fields, at);
  }

  Future<void> _send(DeliveryConfig config) async {
    final l10n = context.l10n;
    if (!ref.read(authControllerProvider).isSignedIn) {
      signInFor(context, Paths.send);
      return;
    }
    if (_pickup.address.text.trim().length < 3 ||
        _dropoff.address.text.trim().length < 3) {
      showMessage(context, l10n.sendFillPlace);
      return;
    }
    if (_recipientName.text.trim().length < 2 ||
        _recipientPhone.text.trim().length < 6) {
      showMessage(context, l10n.sendFillRecipient);
      return;
    }
    setState(() => _sending = true);
    try {
      final sent = await ref
          .read(yallappApiProvider)
          .createShipment(_request(config));
      if (!mounted) return;
      ref.invalidate(myShipmentsProvider);
      final payUrl = sent.payUrl;
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
        if (paid == true) showMessage(context, l10n.sendPaid);
      } else {
        showMessage(context, l10n.sendSent);
      }
      _reset();
      if (mounted) unawaited(context.push(Paths.shipment(sent.shipment.id)));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _reset() {
    for (final c in [
      _pickup.address,
      _pickup.details,
      _dropoff.address,
      _dropoff.details,
      _recipientName,
      _recipientPhone,
      _description,
      _notes,
    ]) {
      c.clear();
    }
    setState(() {
      _pickup.at = null;
      _dropoff.at = null;
      _quote = null;
      _quoteError = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final config = ref.watch(deliveryConfigProvider);
    final services = ref.watch(deliveryServicesProvider);
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    final payment =
        _payment ?? (config.cash ? PaymentMethod.cash : PaymentMethod.card);
    final body = ListView(
      key: const ValueKey('send-parcel'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        // 110 The services while they load, and why they didn't with a way to
        // ask again, instead of no section at all.
        ...switch (services) {
          AsyncValue(value: final list?) =>
            list.isEmpty
                ? const <Widget>[]
                : [
                    _SectionTitle(l10n.sendService),
                    for (final s in list)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _ServiceOption(
                          service: s,
                          selected: (_serviceId ?? list.first.id) == s.id,
                          onTap: () {
                            setState(() => _serviceId = s.id);
                            _requote();
                          },
                        ),
                      ),
                    const SizedBox(height: 8),
                  ],
          AsyncValue(error: final e?) => [
            _SectionTitle(l10n.sendService),
            AppCard(
              key: const ValueKey('send-services-error'),
              padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
              child: Row(
                children: [
                  AppIcon(AppIcons.error, size: 22, color: p.textSecondary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      friendlyError(e),
                      style: TextStyle(fontSize: 14, color: p.textBody),
                    ),
                  ),
                  TextButton(
                    onPressed: () => ref.invalidate(deliveryServicesProvider),
                    child: Text(l10n.tryAgain),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
          _ => [
            _SectionTitle(l10n.sendService),
            const SkeletonBox(height: 64, radius: 16),
            const SizedBox(height: 16),
          ],
        },
        _SectionTitle(l10n.sendPickup),
        PlaceEditor(
          keyPrefix: 'pickup',
          fields: _pickup,
          config: config,
          onMyLocation: () => _useMyLocation(_pickup),
          onPaste: () => _pasteLink(_pickup),
          onMap: () => _onMap(_pickup, config),
          onClear: () => _setAt(_pickup, null),
        ),
        const SizedBox(height: 16),
        _SectionTitle(l10n.sendDropoff),
        PlaceEditor(
          keyPrefix: 'dropoff',
          fields: _dropoff,
          config: config,
          onMyLocation: () => _useMyLocation(_dropoff),
          onPaste: () => _pasteLink(_dropoff),
          onMap: () => _onMap(_dropoff, config),
          onClear: () => _setAt(_dropoff, null),
        ),
        if (config.pricing == DeliveryPricing.zone) ...[
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            key: const ValueKey('send-zone'),
            initialValue: _zoneId,
            decoration: InputDecoration(labelText: l10n.sendZone),
            items: [
              for (final z in config.zones)
                DropdownMenuItem(
                  value: z.id,
                  child: Text('${z.name} · ${z.priceFormatted}'),
                ),
            ],
            onChanged: (value) {
              setState(() => _zoneId = value);
              _requote();
            },
          ),
        ],
        const SizedBox(height: 16),
        _SectionTitle(l10n.sendRecipient),
        TextField(
          key: const ValueKey('recipient-name'),
          controller: _recipientName,
          textCapitalization: TextCapitalization.words,
          maxLength: 80,
          decoration: InputDecoration(
            labelText: l10n.recipientName,
            counterText: '',
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          key: const ValueKey('recipient-phone'),
          controller: _recipientPhone,
          keyboardType: TextInputType.phone,
          maxLength: 24,
          decoration: InputDecoration(
            labelText: l10n.recipientPhone,
            counterText: '',
          ),
        ),
        const SizedBox(height: 16),
        _SectionTitle(l10n.sendParcelSection),
        SegmentedTabs(
          labels: [
            for (final s in PackageSize.values) packageSizeLabel(l10n, s),
          ],
          selected: _size.index,
          radio: true,
          onChanged: (i) => setState(() => _size = PackageSize.values[i]),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _description,
          maxLength: 200,
          decoration: InputDecoration(
            labelText: l10n.parcelDescription,
            counterText: '',
          ),
        ),
        const SizedBox(height: 10),
        TextField(
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
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.sendPrice,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: p.textSecondary,
                      ),
                    ),
                    Text(
                      _quoting
                          ? l10n.sendPriceCalculating
                          : _quote?.priceFormatted ??
                                (_quoteError ?? l10n.sendPriceMissing),
                      key: const ValueKey('send-price'),
                      style: TextStyle(
                        fontSize: _quote != null ? 22 : 14,
                        fontWeight: _quote != null
                            ? FontWeight.w800
                            : FontWeight.w400,
                        color: _quoteError != null && _quote == null
                            ? p.danger
                            : p.text,
                      ),
                    ),
                  ],
                ),
              ),
              if (_quote?.distanceKm != null)
                Text(
                  l10n.distanceKm(_quote!.distanceKm!.toStringAsFixed(1)),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
            ],
          ),
        ),
      ],
    );
    final button = BottomActionBar(
      child: PrimaryButton(
        key: const ValueKey('send-button'),
        label: signedIn ? l10n.sendButton : l10n.sendSignIn,
        icon: AppIcons.ship,
        loading: _sending,
        onPressed: () => _send(config),
      ),
    );
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.sendTitle),
            Expanded(child: body),
          ],
        ),
      ),
      bottomNavigationBar: button,
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

class _ServiceOption extends StatelessWidget {
  const _ServiceOption({
    required this.service,
    required this.selected,
    required this.onTap,
  });

  final DeliveryService service;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    // A chosen service sits on the soft brand colour: its words in the colours made for it.
    final strong = selected ? p.onPrimarySoft : p.text;
    final muted = selected ? p.onPrimaryMuted : p.textSecondary;
    return Semantics(
      selected: selected,
      inMutuallyExclusiveGroup: true,
      child: AppCard(
        padding: const EdgeInsets.all(14),
        onTap: onTap,
        color: selected ? p.primarySoft : null,
        child: Row(
          children: [
            AppIcon(
              selected ? AppIcons.checkCircle : AppIcons.ship,
              size: 22,
              color: selected ? p.onPrimarySoft : p.textSecondary,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    service.name,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: strong,
                    ),
                  ),
                  if (service.eta != null || service.description != null)
                    Text(
                      service.eta ?? service.description!,
                      style: TextStyle(fontSize: 13, color: muted),
                    ),
                ],
              ),
            ),
            if (service.extraFormatted != null)
              Text(
                service.extraFormatted!,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: strong,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// A place: its address and details, and where it is on Earth.
class PlaceEditor extends StatelessWidget {
  const PlaceEditor({
    super.key,
    required this.keyPrefix,
    required this.fields,
    required this.config,
    required this.onMyLocation,
    required this.onPaste,
    required this.onMap,
    required this.onClear,
  });

  final String keyPrefix;
  final PlaceFields fields;
  final DeliveryConfig config;
  final VoidCallback onMyLocation;
  final VoidCallback onPaste;
  final VoidCallback onMap;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final at = fields.at;
    Widget chip(
      String label,
      IconData icon,
      VoidCallback onPressed,
      String key,
    ) => OutlinedButton.icon(
      key: ValueKey('$keyPrefix-$key'),
      onPressed: onPressed,
      icon: AppIcon(icon, size: 18, color: p.text),
      label: Text(label),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          key: ValueKey('$keyPrefix-address'),
          controller: fields.address,
          maxLength: 300,
          decoration: InputDecoration(
            labelText: l10n.placeAddress,
            counterText: '',
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: fields.details,
          maxLength: 200,
          decoration: InputDecoration(
            labelText: l10n.placeDetails,
            counterText: '',
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            chip(
              l10n.placeUseMyLocation,
              AppIcons.myLocation,
              onMyLocation,
              'here',
            ),
            chip(l10n.placePasteLink, AppIcons.paste, onPaste, 'paste'),
            if (config.tilesUrl != null)
              chip(l10n.placeOnMap, AppIcons.map, onMap, 'map'),
          ],
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            AppIcon(
              at != null ? AppIcons.checkCircle : AppIcons.pinDrop,
              size: 18,
              color: at != null ? p.success : p.textSecondary,
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                at != null
                    ? l10n.placeLocated
                    : (config.needsCoordinates
                          ? l10n.placeLocationNeeded
                          : l10n.placeNotLocated),
                key: ValueKey('$keyPrefix-located'),
                style: TextStyle(
                  fontSize: 13,
                  color: at != null ? p.success : p.textSecondary,
                ),
              ),
            ),
            if (at != null)
              TextButton(
                onPressed: onClear,
                child: Text(l10n.placeRemoveLocation),
              ),
          ],
        ),
      ],
    );
  }
}

/// Asks for a maps link.
class PasteLinkDialog extends StatefulWidget {
  const PasteLinkDialog({super.key});

  @override
  State<PasteLinkDialog> createState() => _PasteLinkDialogState();
}

class _PasteLinkDialogState extends State<PasteLinkDialog> {
  final _text = TextEditingController();

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l10n = context.l10n;
    return AlertDialog(
      title: Text(l10n.pasteLinkTitle),
      content: TextField(
        key: const ValueKey('paste-link-field'),
        controller: _text,
        autofocus: true,
        maxLength: 500,
        decoration: InputDecoration(
          hintText: l10n.pasteLinkHint,
          counterText: '',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(l10n.cancel),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(_text.text),
          child: Text(l10n.pasteLinkUse),
        ),
      ],
    );
  }
}
