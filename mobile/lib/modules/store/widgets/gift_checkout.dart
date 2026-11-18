import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/widgets/common.dart';
import '../../shared/auth/country_codes.dart' show ltrIsolate;
import '../data/store_providers.dart';
import 'delivery_place.dart';

/// 131 The store checkout's premium parts, for every store app: the
/// delivery day (Today, Tomorrow or a date, the cut-off counted) and slot
/// (full ones disabled), and the gift details (the gift checkout's sender
/// and recipient with the address, the card with its occasions and ready
/// messages, "send anonymously"). Drawn in the checkout look Studio sets
/// (`Config.screens.checkout`, [CheckoutLook]): cards, glass or numbered
/// steps, round or square chips, the accent colour and the corners.

/// A part of the checkout, in the look: a card (or frosted glass), with
/// its number in the `steps` style.
/// 131 A section's title as the owner worded it, in the app's language: the
/// checkout look's (Studio), else the store's; null: the app's own words.
String? ownedTitle(
  BuildContext context,
  SectionTitle which, {
  CheckoutLook? look,
  StoreConfig? store,
}) {
  final lang = Localizations.localeOf(context).languageCode;
  final text = sectionTitle(
    which,
    lang,
    '',
    look: look?.titles,
    store: store?.titles,
  );
  return text.isEmpty ? null : text;
}

class CheckoutSection extends StatelessWidget {
  const CheckoutSection({
    super.key,
    required this.title,
    required this.child,
    this.look,
    this.step,
    this.icon,
    this.subtitle,
  });

  final String title;
  final Widget child;
  final CheckoutLook? look;
  final int? step;
  final IconData? icon;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = look ?? const CheckoutLook();
    final accent = parseHexColor(l.accentFor(dark: p.isDark)) ?? p.primary;
    final radius = l.radius ?? 18;
    final head = Row(
      children: [
        if (l.style == CheckoutStyle.steps && step != null)
          Container(
            width: 26,
            height: 26,
            margin: const EdgeInsetsDirectional.only(end: 10),
            alignment: Alignment.center,
            decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
            child: Text(
              '$step',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: p.onPrimary,
              ),
            ),
          )
        else if (icon != null) ...[
          AppIcon(icon!, size: 20, color: accent),
          const SizedBox(width: 8),
        ],
        Expanded(
          child: Semantics(
            header: true,
            child: Text(
              title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
          ),
        ),
      ],
    );
    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        head,
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(
            subtitle!,
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
        const SizedBox(height: 12),
        child,
      ],
    );
    if (l.style == CheckoutStyle.classic && !l.glass) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: body,
      );
    }
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: l.glass ? p.surface.withValues(alpha: 0.72) : p.surface,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: l.glass ? Colors.white.withValues(alpha: 0.45) : p.border,
        ),
        boxShadow: l.glass
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ]
            : null,
      ),
      // 131.25 Its own Material, so a row's ink (a switch, a tile) shows on
      // the card's colour.
      child: Material(type: MaterialType.transparency, child: body),
    );
  }
}

/// A choice chip in the look: round or square, the accent when chosen.
class CheckoutChip extends StatelessWidget {
  const CheckoutChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.look,
    this.detail,
    this.icon,
  });

  final String label;
  final bool selected;

  /// Null: disabled (a full or passed slot, a closed day).
  final VoidCallback? onTap;
  final CheckoutLook? look;
  final String? detail;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final accent = parseHexColor(look?.accentFor(dark: p.isDark)) ?? p.primary;
    final radius = look?.squareChips == true ? 10.0 : 999.0;
    final enabled = onTap != null;
    final fg = selected
        ? p.onPrimary
        : enabled
        ? p.text
        : p.textTertiary;
    return Semantics(
      button: true,
      selected: selected,
      enabled: enabled,
      label: [label, ?detail].join(', '),
      excludeSemantics: true,
      child: Material(
        color: selected ? accent : (enabled ? p.surface : p.surfaceMuted),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radius),
          side: BorderSide(color: selected ? accent : p.border),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(radius),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  AppIcon(icon!, size: 16, color: fg),
                  const SizedBox(width: 6),
                ],
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: fg,
                    decoration: enabled ? null : TextDecoration.lineThrough,
                  ),
                ),
                if (detail != null) ...[
                  const SizedBox(width: 6),
                  Text(
                    detail!,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: selected ? p.onPrimary : p.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The delivery day and slot: Today (until the cut-off), Tomorrow, or a
/// date from the calendar, then the day's slots from the shop.
class DeliveryPicker extends ConsumerWidget {
  const DeliveryPicker({
    super.key,
    required this.rules,
    required this.date,
    required this.slot,
    required this.onDate,
    required this.onSlot,
    this.look,
    this.step,
    this.now,
    this.title,
  });

  /// 131 The owner's title; null: the app's words.
  final String? title;

  final DeliveryDateRules rules;
  final DateTime? date;
  final String? slot;
  final ValueChanged<DateTime> onDate;
  final ValueChanged<String?> onSlot;
  final CheckoutLook? look;
  final int? step;

  /// For tests: the shop's local time now.
  final DateTime Function()? now;

  static bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  Future<void> _pick(BuildContext context, DateTime today) async {
    final first = rules.firstDay(today);
    if (first == null) {
      showMessage(context, context.l10n.noDeliveryDays);
      return;
    }
    final start = rules.todayOpen(today) ? today : first;
    final picked = await showDatePicker(
      context: context,
      helpText: context.l10n.deliveryDate,
      initialDate: date != null && rules.allows(date!, today) ? date! : start,
      firstDate: DateTime(start.year, start.month, start.day),
      lastDate: DateTime(today.year, today.month, today.day + rules.maxDays),
      selectableDayPredicate: (day) =>
          rules.allows(day, today) &&
          (!_sameDay(day, today) || rules.todayOpen(today)),
    );
    if (picked != null) onDate(picked);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    // The shop's time, wherever the phone is.
    final at = now?.call() ?? rules.shopNow(DateTime.now());
    final today = DateTime(at.year, at.month, at.day);
    final tomorrow = DateTime(today.year, today.month, today.day + 1);
    final todayOpen = rules.todayOpen(at);
    final tomorrowOpen = rules.allows(tomorrow, today);
    final chosen = date;
    final other =
        chosen != null &&
        !_sameDay(chosen, today) &&
        !_sameDay(chosen, tomorrow);
    final cutoff = rules.sameDayCutoff;
    final days = Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        CheckoutChip(
          key: const ValueKey('delivery-today'),
          label: l10n.deliveryToday,
          selected: chosen != null && _sameDay(chosen, today),
          onTap: todayOpen ? () => onDate(today) : null,
          look: look,
        ),
        CheckoutChip(
          key: const ValueKey('delivery-tomorrow'),
          label: l10n.deliveryTomorrow,
          selected: chosen != null && _sameDay(chosen, tomorrow),
          onTap: tomorrowOpen ? () => onDate(tomorrow) : null,
          look: look,
        ),
        CheckoutChip(
          key: const ValueKey('delivery-pick'),
          label: other ? dayLabel(chosen) : l10n.deliveryPickDate,
          selected: other,
          icon: AppIcons.calendar,
          onTap: () => _pick(context, at),
          look: look,
        ),
      ],
    );
    final note = rules.minDays == 0 && cutoff != null
        ? (todayOpen ? l10n.deliveryOrderBy(cutoff) : l10n.deliveryTodayClosed)
        : null;
    Widget? slots;
    if (rules.slots.isNotEmpty && chosen != null) {
      final answer = ref.watch(deliverySlotsProvider(isoDate(chosen)));
      final list = answer.value?.slots ?? rules.slots;
      final open = answer.value?.open ?? true;
      final any = list.any((s) => s.available) && open;
      slots = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          Text(
            l10n.deliveryTimeTitle,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final s in list)
                CheckoutChip(
                  key: ValueKey('delivery-slot-${s.id}'),
                  // 131.25 A time range reads left to right in Arabic too.
                  label: ltrIsolate(
                    s.label.isNotEmpty ? s.label : '${s.start}–${s.end}',
                  ),
                  detail: s.full
                      ? l10n.deliverySlotFull
                      : s.fee != null
                      ? '+${s.fee}'
                      : null,
                  selected: slot == s.id,
                  onTap: answer.hasValue && s.available && open
                      ? () => onSlot(s.id)
                      : null,
                  look: look,
                ),
            ],
          ),
          if (answer.hasValue && !any) ...[
            const SizedBox(height: 8),
            Text(
              l10n.deliveryNoTimes,
              style: TextStyle(fontSize: 13, color: p.danger),
            ),
          ],
        ],
      );
    }
    return CheckoutSection(
      key: const ValueKey('delivery-picker'),
      title: title ?? l10n.deliveryWhen,
      look: look,
      step: step,
      icon: AppIcons.deliveryTime,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          days,
          if (note != null) ...[
            const SizedBox(height: 8),
            Text(note, style: TextStyle(fontSize: 13, color: p.textSecondary)),
          ],
          ?slots,
        ],
      ),
    );
  }
}

/// The gift checkout's fields, kept by the cart.
class GiftForm {
  final senderName = TextEditingController();
  final senderPhone = TextEditingController();
  final senderEmail = TextEditingController();
  final recipientName = TextEditingController();
  final recipientPhone = TextEditingController();
  final recipientAddress = TextEditingController();
  final recipientCity = TextEditingController();
  String? country;
  String? city;
  bool anonymous = false;

  /// The pin where it goes, for shipping by distance.
  ({double lat, double lng})? pin;

  /// The standard checkout's "Send it to someone else".
  bool toSomeoneElse = false;

  List<TextEditingController> get _all => [
    senderName,
    senderPhone,
    senderEmail,
    recipientName,
    recipientPhone,
    recipientAddress,
    recipientCity,
  ];

  void addListener(VoidCallback listener) {
    for (final c in _all) {
      c.addListener(listener);
    }
  }

  void dispose() {
    for (final c in _all) {
      c.dispose();
    }
  }

  void clear() {
    for (final c in _all) {
      c.clear();
    }
    anonymous = false;
    toSomeoneElse = false;
    city = null;
    pin = null;
  }

  static final _email = RegExp(r'^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$');
  static bool _phone(String v) =>
      RegExp(r'^\+?[0-9\s().-]{6,30}$').hasMatch(v.trim()) &&
      v.replaceAll(RegExp('[^0-9]'), '').length >= 6;

  bool get senderDone =>
      senderName.text.trim().length >= 2 &&
      _phone(senderPhone.text) &&
      _email.hasMatch(senderEmail.text.trim());

  /// [address]: the gift checkout's (and its city when the shop lists them).
  bool recipientDone({required bool address, required bool cityList}) =>
      recipientName.text.trim().length >= 2 &&
      _phone(recipientPhone.text) &&
      (!address || recipientAddress.text.trim().length >= 5) &&
      (!cityList || city != null);

  String? get chosenCity =>
      city ??
      (recipientCity.text.trim().isEmpty ? null : recipientCity.text.trim());

  GiftPerson sender() => GiftPerson(
    name: senderName.text,
    phone: senderPhone.text,
    email: senderEmail.text,
  );

  GiftPerson recipient({required bool address}) => GiftPerson(
    name: recipientName.text,
    phone: recipientPhone.text,
    address: address ? recipientAddress.text : null,
    country: country,
    city: chosenCity,
    lat: pin?.lat,
    lng: pin?.lng,
  );
}

/// The gift details: in the gift checkout, who sends it and who receives it
/// (with the address, among the shop's countries and cities); otherwise
/// the recipient when the shop asks for one; then the card.
class GiftDetailsPanel extends ConsumerStatefulWidget {
  const GiftDetailsPanel({
    super.key,
    required this.rules,
    required this.form,
    required this.message,
    required this.onChanged,
    this.giftCheckout = false,
    this.shipping,
    this.look,
    this.firstStep = 1,
    this.between,
    this.cardTitle,
  });

  /// 131 The owner's title of the card; null: the app's words.
  final String? cardTitle;

  /// Shown before the card (the gift checkout's delivery day and slot): it
  /// takes the step after the recipient's.
  final Widget Function(int step)? between;

  final GiftMessageRules rules;
  final GiftForm form;
  final TextEditingController message;
  final VoidCallback onChanged;
  final bool giftCheckout;
  final StoreShippingRules? shipping;
  final CheckoutLook? look;

  /// The `steps` style's number of the first part shown here.
  final int firstStep;

  @override
  ConsumerState<GiftDetailsPanel> createState() => _GiftDetailsPanelState();
}

class _GiftDetailsPanelState extends ConsumerState<GiftDetailsPanel> {
  Widget _field(
    TextEditingController c,
    String label, {
    TextInputType? type,
    int maxLength = 80,
    int lines = 1,
    String? keyName,
    IconData? icon,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextField(
      key: keyName == null ? null : ValueKey(keyName),
      controller: c,
      keyboardType: type,
      maxLength: maxLength,
      minLines: lines,
      maxLines: lines,
      textCapitalization: type == null
          ? TextCapitalization.words
          : TextCapitalization.none,
      onChanged: (_) => widget.onChanged(),
      decoration: InputDecoration(
        labelText: label,
        counterText: '',
        prefixIcon: icon == null
            ? null
            : AppIcon(icon, size: 20, color: context.palette.textSecondary),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final f = widget.form;
    final look = widget.look;
    final gift = widget.giftCheckout;
    var step = widget.firstStep;
    final parts = <Widget>[];

    if (gift) {
      parts.add(
        CheckoutSection(
          key: const ValueKey('gift-sender'),
          title: l10n.giftFromTitle,
          look: look,
          step: step++,
          icon: AppIcons.account,
          child: Column(
            children: [
              _field(
                f.senderName,
                l10n.giftYourName,
                keyName: 'gift-sender-name',
              ),
              _field(
                f.senderPhone,
                l10n.giftYourPhone,
                type: TextInputType.phone,
                maxLength: 30,
                keyName: 'gift-sender-phone',
              ),
              _field(
                f.senderEmail,
                l10n.giftYourEmail,
                type: TextInputType.emailAddress,
                maxLength: 120,
                keyName: 'gift-sender-email',
              ),
            ],
          ),
        ),
      );
    }

    final recipientFields = Column(
      children: [
        _field(
          f.recipientName,
          l10n.giftRecipientName,
          keyName: 'gift-recipient-name',
        ),
        _field(
          f.recipientPhone,
          l10n.giftRecipientPhone,
          type: TextInputType.phone,
          maxLength: 30,
          keyName: 'gift-recipient-phone',
        ),
        if (gift) ...[
          // 131 Where it goes (the country, the city, the pin for a fee by
          // distance), as in the standard checkout.
          if (widget.shipping case final shipping?)
            DeliveryPlaceFields(
              form: f,
              shipping: shipping,
              onChanged: () => setState(widget.onChanged),
            ),
          _field(
            f.recipientAddress,
            l10n.giftAddress,
            type: TextInputType.streetAddress,
            maxLength: 300,
            lines: 2,
            keyName: 'gift-recipient-address',
            icon: AppIcons.location,
          ),
        ],
      ],
    );
    if (gift) {
      parts.add(
        CheckoutSection(
          key: const ValueKey('gift-recipient'),
          title: l10n.giftToTitle,
          look: look,
          step: step++,
          icon: AppIcons.gift,
          child: recipientFields,
        ),
      );
    } else if (widget.rules.recipient) {
      parts.add(
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SwitchListTile.adaptive(
              key: const ValueKey('gift-to-someone'),
              contentPadding: EdgeInsets.zero,
              value: f.toSomeoneElse,
              title: Text(l10n.giftSendToSomeone),
              onChanged: (v) => setState(() {
                f.toSomeoneElse = v;
                widget.onChanged();
              }),
            ),
            if (f.toSomeoneElse) recipientFields,
          ],
        ),
      );
    }

    if (widget.between != null) parts.add(widget.between!(step++));

    final occasions = widget.rules.enabled || gift
        ? ref.watch(giftMessagesProvider).value ?? const <GiftOccasion>[]
        : const <GiftOccasion>[];
    // A shop with only the message, as before 131: its one field.
    final plain =
        !gift &&
        !widget.rules.recipient &&
        !widget.rules.anonymous &&
        widget.rules.starters.isEmpty &&
        occasions.isEmpty;
    if (widget.rules.enabled && plain) {
      parts.add(
        TextField(
          key: const ValueKey('gift-message'),
          controller: widget.message,
          maxLength: widget.rules.maxLength,
          minLines: 2,
          maxLines: 4,
          textCapitalization: TextCapitalization.sentences,
          onChanged: (_) => widget.onChanged(),
          decoration: InputDecoration(
            labelText: widget.cardTitle ?? l10n.giftMessage,
            hintText: l10n.giftMessageHint,
            prefixIcon: AppIcon(
              AppIcons.gift,
              size: 20,
              color: p.textSecondary,
            ),
          ),
        ),
      );
    } else if (widget.rules.enabled || gift) {
      parts.add(
        CheckoutSection(
          key: const ValueKey('gift-card'),
          title:
              widget.cardTitle ??
              (gift ? l10n.giftCardTitle : l10n.giftMessage),
          subtitle: occasions.isNotEmpty || widget.rules.starters.isNotEmpty
              ? l10n.giftCardHint
              : null,
          look: look,
          step: gift ? step++ : null,
          icon: AppIcons.gift,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CardMessageEditor(
                message: widget.message,
                maxLength: widget.rules.maxLength,
                starters: widget.rules.starters,
                onChanged: widget.onChanged,
                look: look,
                label:
                    widget.cardTitle ??
                    (gift ? l10n.giftCardTitle : l10n.giftMessage),
              ),
              if (widget.rules.anonymous)
                SwitchListTile.adaptive(
                  key: const ValueKey('gift-anonymous'),
                  contentPadding: EdgeInsets.zero,
                  value: f.anonymous,
                  title: Text(l10n.giftAnonymous),
                  subtitle: Text(l10n.giftAnonymousHint),
                  onChanged: (v) => setState(() {
                    f.anonymous = v;
                    widget.onChanged();
                  }),
                ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, part) in parts.indexed) ...[
          if (i > 0) const SizedBox(height: 12),
          part,
        ],
      ],
    );
  }
}

/// 131 The card's words: the shop's occasions as chips, an occasion's ready
/// messages as cards that fill the words when tapped, the owner's
/// beginnings, and the words to change or write. The gift details' card and
/// 162 Build your bouquet's card step.
class CardMessageEditor extends ConsumerStatefulWidget {
  const CardMessageEditor({
    super.key,
    required this.message,
    required this.maxLength,
    required this.onChanged,
    this.starters = const [],
    this.look,
    this.label,
  });

  final TextEditingController message;
  final int maxLength;
  final VoidCallback onChanged;

  /// The owner's beginnings (`gift_message.starters`).
  final List<String> starters;
  final CheckoutLook? look;

  /// The field's label; null: the app's words.
  final String? label;

  @override
  ConsumerState<CardMessageEditor> createState() => _CardMessageEditorState();
}

class _CardMessageEditorState extends ConsumerState<CardMessageEditor> {
  String? _occasion;

  void _fill(String text) {
    final max = widget.maxLength;
    final value = text.length > max ? text.substring(0, max) : text;
    widget.message.value = TextEditingValue(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
    );
    widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final look = widget.look;
    final occasions =
        ref.watch(giftMessagesProvider).value ?? const <GiftOccasion>[];
    final open = occasions.where((o) => o.id == _occasion).firstOrNull;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (occasions.isNotEmpty) ...[
          Text(
            l10n.giftOccasion,
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          const SizedBox(height: 6),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final o in occasions) ...[
                  CheckoutChip(
                    key: ValueKey('gift-occasion-${o.id}'),
                    label: o.name,
                    icon: symbolByName(o.icon),
                    selected: _occasion == o.id,
                    onTap: () => setState(
                      () => _occasion = _occasion == o.id ? null : o.id,
                    ),
                    look: look,
                  ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          if (open != null) ...[
            const SizedBox(height: 10),
            for (final t in open.templates)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Material(
                  color: p.surfaceMuted,
                  borderRadius: BorderRadius.circular(look?.radius ?? 14),
                  child: InkWell(
                    key: ValueKey('gift-template-${open.id}-${t.id}'),
                    borderRadius: BorderRadius.circular(look?.radius ?? 14),
                    onTap: () => _fill(t.text),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(
                        t.text,
                        style: TextStyle(fontSize: 14, color: p.text),
                      ),
                    ),
                  ),
                ),
              ),
          ],
          const SizedBox(height: 6),
        ],
        if (widget.starters.isNotEmpty) ...[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final s in widget.starters)
                ActionChip(label: Text(s), onPressed: () => _fill(s)),
            ],
          ),
          const SizedBox(height: 10),
        ],
        TextField(
          key: const ValueKey('gift-message'),
          controller: widget.message,
          maxLength: widget.maxLength,
          minLines: 3,
          maxLines: 6,
          textCapitalization: TextCapitalization.sentences,
          onChanged: (_) => widget.onChanged(),
          decoration: InputDecoration(
            labelText: widget.label ?? l10n.giftMessage,
            hintText: l10n.giftMessageHint,
          ),
        ),
      ],
    );
  }
}
