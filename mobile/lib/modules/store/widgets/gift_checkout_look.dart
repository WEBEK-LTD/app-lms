import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart' show AppNetworkImage;
import '../../../core/widgets/premium_chrome.dart' show ChromeFloralLine;
import '../../shared/auth/country_codes.dart' show ltrIsolate;

/// 131.25 The store's gift checkout in its premium look
/// (`Config.screens.checkout` `gift`), Leqaa's first and any store's: five
/// steps on one screen under a stepper (who it is from, who it is for,
/// when, the card's message, pay), the gift card's live preview with the
/// bouquet's photo, and the order with the chosen day and slot and the
/// delivery fee's breakdown. In the look's colour (the checkout's accent,
/// else the main colour), light and dark, right to left, still for people
/// who turn movement off.
///
/// INTEGRATOR: this is the look only. The store's gift checkout (the
/// commerce side: its fields and their rules, the shop's delivery zones,
/// days, cut-off and slots, the fee, the occasions' ready messages from
/// `gift_messages`, the discount code and the payment) fills
/// [GiftCheckoutData] and answers the callbacks; the cart opens it when the
/// project's checkout look is `gift` and the store's gift checkout is on.
class GiftCheckoutLook extends StatefulWidget {
  const GiftCheckoutLook({
    super.key,
    required this.data,
    this.accent,
    this.onDay,
    this.onSlot,
    this.onOccasion,
    this.onMessage,
    this.onAnonymous,
    this.onCountry,
    this.onCity,
    this.onPin,
    this.onApplyCode,
    this.onPay,
    this.top = 0,
  });

  final GiftCheckoutData data;

  /// The look's colour; null, the app's main colour.
  final Color? accent;

  final ValueChanged<int>? onDay;
  final ValueChanged<int>? onSlot;
  final ValueChanged<int>? onOccasion;
  final ValueChanged<String>? onMessage;
  final ValueChanged<bool>? onAnonymous;
  final VoidCallback? onCountry;
  final VoidCallback? onCity;
  final VoidCallback? onPin;
  final ValueChanged<String>? onApplyCode;
  final VoidCallback? onPay;

  /// Room at the top (under a header the page draws).
  final double top;

  @override
  State<GiftCheckoutLook> createState() => _GiftCheckoutLookState();
}

/// 131.25 Everything the gift checkout's look draws, as the store's gift
/// checkout has it now.
class GiftCheckoutData {
  const GiftCheckoutData({
    required this.sender,
    required this.recipient,
    required this.days,
    required this.slots,
    required this.occasions,
    required this.messages,
    required this.message,
    required this.lines,
    required this.subtotal,
    required this.fee,
    required this.total,
    this.step = 2,
    this.anonymous = false,
    this.cutoffPassed = false,
    this.perKm = false,
    this.feeParts = const [],
    this.freeOver,
    this.discountCode = '',
    this.discount,
    this.photoUrl,
  });

  final GiftSender sender;
  final GiftRecipient recipient;

  /// Today, tomorrow and a date: [GiftChoice.selected] the chosen one,
  /// [GiftChoice.enabled] false today after the cut-off.
  final List<GiftChoice> days;

  /// The day's time slots, each with its extra (a label) where it has one.
  final List<GiftChoice> slots;

  /// The occasions (the owner's `gift_messages`), the chosen one selected.
  final List<GiftChoice> occasions;

  /// The chosen occasion's ready messages.
  final List<String> messages;

  /// The card's words now.
  final String message;
  final bool anonymous;

  /// Today's cut-off has passed: today can't be chosen.
  final bool cutoffPassed;

  /// Delivery is priced by the kilometre: the recipient's door on a map.
  final bool perKm;

  /// The step the person is on (0 from … 4 pay); the ones before it done.
  final int step;

  /// The bouquet, then its add-ons ([GiftLine.addOn]).
  final List<GiftLine> lines;
  final String subtotal;
  final String fee;

  /// The fee's breakdown: base, distance, the slot's extra.
  final List<(String, String)> feeParts;

  /// The order total from which delivery is free (formatted); null, none.
  final String? freeOver;
  final String discountCode;

  /// The discount taken (formatted, with its minus); null, none.
  final String? discount;
  final String total;

  /// The bouquet's photo, on the card's preview.
  final String? photoUrl;
}

class GiftSender {
  const GiftSender({required this.name, required this.phone, this.email});
  final String name;
  final String phone;
  final String? email;
}

class GiftRecipient {
  const GiftRecipient({
    required this.name,
    required this.phone,
    required this.country,
    required this.city,
    required this.address,
  });
  final String name;
  final String phone;

  /// The chosen country and city, from the places the shop delivers to.
  final String country;
  final String city;
  final String address;
}

/// A chip to choose: its label, an icon, an extra (a slot's price) and
/// whether it is chosen and can be.
class GiftChoice {
  const GiftChoice(
    this.label, {
    this.icon,
    this.extra,
    this.selected = false,
    this.enabled = true,
  });
  final String label;
  final IconData? icon;
  final String? extra;
  final bool selected;
  final bool enabled;
}

class GiftLine {
  const GiftLine(
    this.title,
    this.price, {
    this.subtitle,
    this.imageUrl,
    this.addOn = false,
  });
  final String title;
  final String? subtitle;
  final String price;
  final String? imageUrl;
  final bool addOn;
}

class _GiftCheckoutLookState extends State<GiftCheckoutLook> {
  late final TextEditingController _message = TextEditingController(
    text: widget.data.message,
  );
  late bool _anonymous = widget.data.anonymous;

  @override
  void didUpdateWidget(GiftCheckoutLook old) {
    super.didUpdateWidget(old);
    if (old.data.message != widget.data.message &&
        _message.text != widget.data.message) {
      _message.text = widget.data.message;
    }
    if (old.data.anonymous != widget.data.anonymous) {
      _anonymous = widget.data.anonymous;
    }
  }

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  void _pick(String text) {
    setState(() => _message.text = text);
    widget.onMessage?.call(text);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final d = widget.data;
    final tone = widget.accent ?? p.primary;
    final t = _Tones(p, tone);
    final day = d.days.where((c) => c.selected).firstOrNull;
    final slot = d.slots.where((c) => c.selected).firstOrNull;
    return ColoredBox(
      key: const ValueKey('gift-checkout'),
      color: t.page,
      child: ListView(
        padding: EdgeInsets.fromLTRB(0, widget.top + 8, 0, 32),
        children: [
          _Stepper(
            t: t,
            step: d.step,
            labels: [
              l10n.giftStepFrom,
              l10n.giftStepFor,
              l10n.giftStepWhen,
              l10n.giftStepMessage,
              l10n.giftStepPay,
            ],
          ),
          const SizedBox(height: 14),
          ListenableBuilder(
            listenable: _message,
            builder: (context, _) => _CardPreview(
              t: t,
              photoUrl: d.photoUrl,
              to: d.recipient.name,
              from: _anonymous ? l10n.giftSomeone : d.sender.name,
              message: _message.text,
              icon: d.occasions.where((o) => o.selected).firstOrNull?.icon,
            ),
          ),
          const SizedBox(height: 16),
          _Section(
            t: t,
            index: 0,
            done: d.step > 0,
            title: l10n.giftWhoFrom,
            children: [
              _Field(
                t: t,
                icon: AppIcons.account,
                label: l10n.giftName,
                value: d.sender.name,
              ),
              _Field(
                t: t,
                icon: Symbols.call_rounded,
                label: l10n.giftPhone,
                value: d.sender.phone,
                ltr: true,
              ),
              if (d.sender.email != null)
                _Field(
                  t: t,
                  icon: Symbols.mail_rounded,
                  label: l10n.giftEmail,
                  value: d.sender.email!,
                  ltr: true,
                ),
            ],
          ),
          _Section(
            t: t,
            index: 1,
            done: d.step > 1,
            title: l10n.giftWhoFor,
            children: [
              _Field(
                t: t,
                icon: Symbols.redeem_rounded,
                label: l10n.giftTheirName,
                value: d.recipient.name,
              ),
              _Field(
                t: t,
                icon: Symbols.call_rounded,
                label: l10n.giftTheirPhone,
                value: d.recipient.phone,
                ltr: true,
              ),
              Row(
                children: [
                  AppIcon(Symbols.verified_rounded, size: 15, color: tone),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      l10n.giftOnlyPlaces,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: t.muted,
                      ),
                    ),
                  ),
                ],
              ),
              Row(
                key: const ValueKey('gift-places'),
                children: [
                  Expanded(
                    child: _Picker(
                      t: t,
                      icon: Symbols.public_rounded,
                      label: l10n.giftCountry,
                      value: d.recipient.country,
                      onTap: widget.onCountry,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _Picker(
                      t: t,
                      icon: Symbols.location_city_rounded,
                      label: l10n.giftCity,
                      value: d.recipient.city,
                      onTap: widget.onCity,
                    ),
                  ),
                ],
              ),
              _Field(
                t: t,
                icon: Symbols.home_pin_rounded,
                label: l10n.giftAddress,
                value: d.recipient.address,
              ),
              if (d.perKm) ...[
                _MapPin(t: t, label: l10n.giftPin, onTap: widget.onPin),
                Text(
                  l10n.giftPinNote,
                  style: TextStyle(fontSize: 12, color: t.muted),
                ),
              ],
            ],
          ),
          _Section(
            key: const ValueKey('gift-when'),
            t: t,
            index: 2,
            done: d.step > 2,
            title: l10n.giftWhen,
            required: l10n.giftRequired,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final (i, c) in d.days.indexed)
                    _Chip(
                      t: t,
                      choice: c,
                      onTap: c.enabled ? () => widget.onDay?.call(i) : null,
                    ),
                ],
              ),
              if (d.cutoffPassed)
                Row(
                  children: [
                    AppIcon(AppIcons.schedule, size: 15, color: t.muted),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        l10n.giftCutoffPassed,
                        style: TextStyle(fontSize: 12, color: t.muted),
                      ),
                    ),
                  ],
                ),
              Text(
                l10n.giftSlot,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: t.ink,
                ),
              ),
              _SlotGrid(t: t, slots: d.slots, onTap: widget.onSlot),
            ],
          ),
          _Section(
            key: const ValueKey('gift-message'),
            t: t,
            index: 3,
            done: d.step > 3,
            title: l10n.giftYourMessage,
            children: [
              Text(
                l10n.giftOccasion,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: t.ink,
                ),
              ),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final (i, c) in d.occasions.indexed)
                    _Chip(
                      t: t,
                      choice: c,
                      onTap: () => widget.onOccasion?.call(i),
                    ),
                ],
              ),
              if (d.messages.isNotEmpty) ...[
                Text(
                  l10n.giftReady,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: t.ink,
                  ),
                ),
                SizedBox(
                  height: 112,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: d.messages.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (context, i) => ListenableBuilder(
                      listenable: _message,
                      builder: (context, _) => _ReadyMessage(
                        t: t,
                        text: d.messages[i],
                        chosen: _message.text == d.messages[i],
                        onTap: () => _pick(d.messages[i]),
                      ),
                    ),
                  ),
                ),
              ],
              Text(
                l10n.giftWrite,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: t.ink,
                ),
              ),
              TextField(
                key: const ValueKey('gift-message-field'),
                controller: _message,
                minLines: 2,
                maxLines: 4,
                maxLength: 240,
                onChanged: widget.onMessage,
                style: TextStyle(fontSize: 15, height: 1.45, color: t.ink),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: t.field,
                  counterStyle: TextStyle(color: t.muted),
                  contentPadding: const EdgeInsets.all(14),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: t.line),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: tone, width: 1.5),
                  ),
                ),
              ),
              MergeSemantics(
                child: Row(
                  children: [
                    AppIcon(
                      Symbols.visibility_off_rounded,
                      size: 20,
                      color: tone,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l10n.giftAnonymous,
                            style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w700,
                              color: t.ink,
                            ),
                          ),
                          Text(
                            l10n.giftAnonymousNote,
                            style: TextStyle(fontSize: 12, color: t.muted),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      key: const ValueKey('gift-anonymous'),
                      value: _anonymous,
                      activeTrackColor: tone,
                      onChanged: (v) {
                        setState(() => _anonymous = v);
                        widget.onAnonymous?.call(v);
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
          _Section(
            key: const ValueKey('gift-summary'),
            t: t,
            index: 4,
            done: false,
            title: l10n.giftYourOrder,
            children: [
              for (final line in d.lines.where((l) => !l.addOn))
                _MainLine(t: t, line: line),
              if (d.lines.any((l) => l.addOn)) ...[
                Text(
                  l10n.giftAddOns.toUpperCase(),
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                    color: t.muted,
                  ),
                ),
                for (final line in d.lines.where((l) => l.addOn))
                  _Amount(t: t, label: line.title, value: line.price),
              ],
              if (day != null && slot != null)
                Container(
                  key: const ValueKey('gift-arrives'),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: t.soft,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      AppIcon(
                        Symbols.event_available_rounded,
                        size: 20,
                        color: tone,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        l10n.giftArrives,
                        style: TextStyle(fontSize: 12.5, color: t.muted),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${day.label} · ${ltrIsolate(slot.label)}',
                          textAlign: TextAlign.end,
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: t.ink,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              _CodeRow(t: t, code: d.discountCode, onApply: widget.onApplyCode),
              _Amount(t: t, label: l10n.giftSubtotal, value: d.subtotal),
              _Amount(t: t, label: l10n.giftDeliveryFee, value: d.fee),
              if (d.feeParts.isNotEmpty || d.freeOver != null)
                Container(
                  key: const ValueKey('gift-fee'),
                  padding: const EdgeInsetsDirectional.only(start: 12),
                  decoration: BoxDecoration(
                    border: BorderDirectional(
                      start: BorderSide(color: t.soft, width: 2),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (final (label, value) in d.feeParts)
                        _Amount(t: t, label: label, value: value, small: true),
                      if (d.freeOver != null)
                        Text(
                          l10n.giftFreeOver(d.freeOver!),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: tone,
                          ),
                        ),
                    ],
                  ),
                ),
              if (d.discount != null)
                _Amount(t: t, label: l10n.giftDiscount, value: d.discount!),
              Divider(height: 1, color: t.line),
              _Amount(
                t: t,
                label: l10n.giftTotal,
                value: d.total,
                strong: true,
              ),
              _PayButton(
                t: t,
                label: l10n.giftPay(d.total),
                onTap: widget.onPay,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// The look's colours from the app's palette and its own colour.
class _Tones {
  _Tones(this.p, this.tone)
    : page = p.isDark
          ? Color.alphaBlend(tone.withValues(alpha: 0.10), p.background)
          : Color.alphaBlend(tone.withValues(alpha: 0.05), p.background),
      surface = p.surface,
      ink = p.text,
      muted = p.textSecondary,
      line = p.isDark
          ? Colors.white.withValues(alpha: 0.10)
          : tone.withValues(alpha: 0.14),
      soft = tone.withValues(alpha: p.isDark ? 0.22 : 0.10),
      field = p.isDark
          ? Colors.white.withValues(alpha: 0.05)
          : Color.alphaBlend(tone.withValues(alpha: 0.035), Colors.white),
      onTone = tone.computeLuminance() > 0.5
          ? const Color(0xFF1A0D13)
          : Colors.white;

  final AppPalette p;
  final Color tone;
  final Color page;
  final Color surface;
  final Color ink;
  final Color muted;
  final Color line;
  final Color soft;
  final Color field;
  final Color onTone;

  BoxDecoration card() => BoxDecoration(
    color: surface,
    borderRadius: BorderRadius.circular(24),
    border: Border.all(color: line),
    boxShadow: [
      BoxShadow(
        color: p.isDark
            ? Colors.black.withValues(alpha: 0.32)
            : tone.withValues(alpha: 0.10),
        blurRadius: 28,
        offset: const Offset(0, 12),
      ),
    ],
  );
}

/// The five steps, the ones done ticked, the one now ringed.
class _Stepper extends StatelessWidget {
  const _Stepper({required this.t, required this.step, required this.labels});

  final _Tones t;
  final int step;
  final List<String> labels;

  @override
  Widget build(BuildContext context) => Padding(
    key: const ValueKey('gift-stepper'),
    padding: const EdgeInsets.symmetric(horizontal: 14),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final (i, label) in labels.indexed)
          Expanded(
            child: Semantics(
              label: label,
              selected: i == step,
              child: Column(
                children: [
                  SizedBox(
                    height: 28,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        if (i > 0)
                          PositionedDirectional(
                            start: 0,
                            end: null,
                            width: 1000,
                            child: FractionalTranslation(
                              translation: Offset(
                                Directionality.of(context) == TextDirection.rtl
                                    ? 0.5
                                    : -0.5,
                                0,
                              ),
                              child: Container(
                                height: 2,
                                color: i <= step ? t.tone : t.line,
                              ),
                            ),
                          ),
                        Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: i < step ? t.tone : t.surface,
                            border: Border.all(
                              color: i <= step ? t.tone : t.line,
                              width: 2,
                            ),
                            boxShadow: i == step
                                ? [BoxShadow(color: t.soft, spreadRadius: 4)]
                                : null,
                          ),
                          alignment: Alignment.center,
                          child: i < step
                              ? AppIcon(
                                  AppIcons.check,
                                  size: 15,
                                  color: t.onTone,
                                )
                              : Container(
                                  width: 7,
                                  height: 7,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: i == step ? t.tone : t.line,
                                  ),
                                ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: i == step ? FontWeight.w800 : FontWeight.w600,
                      color: i <= step ? t.ink : t.muted,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    ),
  );
}

/// The gift card as it will be written: the bouquet's photo, who it is
/// for, the words in italics, who it is from; it follows the typing.
class _CardPreview extends StatelessWidget {
  const _CardPreview({
    required this.t,
    required this.photoUrl,
    required this.to,
    required this.from,
    required this.message,
    this.icon,
  });

  final _Tones t;
  final String? photoUrl;
  final String to;
  final String from;
  final String message;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    const ink = Color(0xFF2A121C);
    final paper = t.p.isDark
        ? Color.lerp(t.tone, const Color(0xFFFFF6F2), 0.86)!
        : const Color(0xFFFFFBF8);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Semantics(
        container: true,
        label: l10n.giftCard,
        child: Container(
          key: const ValueKey('gift-card-preview'),
          height: 172,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(26),
            color: paper,
            boxShadow: [
              BoxShadow(
                color: t.tone.withValues(alpha: t.p.isDark ? 0.40 : 0.22),
                blurRadius: 30,
                offset: const Offset(0, 14),
              ),
            ],
          ),
          child: Row(
            children: [
              SizedBox(
                width: 118,
                height: double.infinity,
                child: photoUrl != null
                    ? AppNetworkImage(url: photoUrl!, fit: BoxFit.cover)
                    : ColoredBox(color: t.soft),
              ),
              Expanded(
                child: Stack(
                  children: [
                    PositionedDirectional(
                      top: 10,
                      end: 12,
                      child: Transform.rotate(
                        angle: -0.785398,
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: t.tone.withValues(alpha: 0.16),
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(16),
                              topRight: Radius.circular(16),
                              bottomRight: Radius.circular(16),
                              bottomLeft: Radius.circular(5),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              AppIcon(
                                icon ?? AppIcons.florist,
                                size: 14,
                                color: t.tone,
                                filled: true,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                l10n.giftCard.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.4,
                                  color: t.tone,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text.rich(
                            TextSpan(
                              text: '${l10n.giftTo} ',
                              style: TextStyle(
                                fontSize: 12,
                                color: ink.withValues(alpha: 0.6),
                              ),
                              children: [
                                TextSpan(
                                  text: to,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: ink,
                                  ),
                                ),
                              ],
                            ),
                            maxLines: 1,
                          ),
                          const SizedBox(height: 4),
                          Expanded(
                            child: Text(
                              '“$message”',
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 16,
                                height: 1.3,
                                fontStyle: FontStyle.italic,
                                color: ink,
                              ),
                            ),
                          ),
                          Text.rich(
                            TextSpan(
                              text: '${l10n.giftFrom} ',
                              style: TextStyle(
                                fontSize: 12,
                                color: ink.withValues(alpha: 0.6),
                              ),
                              children: [
                                TextSpan(
                                  text: from,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: ink,
                                  ),
                                ),
                              ],
                            ),
                            maxLines: 1,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// One of the steps: its number on a petal-cut tile (ticked once done),
/// its title, Required where it is, and its parts in a soft card.
class _Section extends StatelessWidget {
  const _Section({
    super.key,
    required this.t,
    required this.index,
    required this.done,
    required this.title,
    required this.children,
    this.required,
  });

  final _Tones t;
  final int index;
  final bool done;
  final String title;
  final String? required;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
    child: DecoratedBox(
      decoration: t.card(),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: done ? t.tone : t.soft,
                    borderRadius: const BorderRadiusDirectional.only(
                      topStart: Radius.circular(14),
                      topEnd: Radius.circular(14),
                      bottomEnd: Radius.circular(14),
                      bottomStart: Radius.circular(5),
                    ),
                  ),
                  alignment: Alignment.center,
                  child: done
                      ? AppIcon(AppIcons.check, size: 16, color: t.onTone)
                      : Text(
                          '${index + 1}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: t.tone,
                          ),
                        ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text(
                      title,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: t.ink,
                      ),
                    ),
                  ),
                ),
                if (required != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: t.soft,
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Text(
                      required!,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: t.tone,
                      ),
                    ),
                  ),
              ],
            ),
            for (final c in children) ...[const SizedBox(height: 12), c],
          ],
        ),
      ),
    ),
  );
}

class _Field extends StatelessWidget {
  const _Field({
    required this.t,
    required this.icon,
    required this.label,
    required this.value,
    this.ltr = false,
  });

  final _Tones t;
  final IconData icon;
  final String label;
  final String value;
  final bool ltr;

  @override
  Widget build(BuildContext context) => Semantics(
    label: label,
    value: value,
    excludeSemantics: true,
    child: Container(
      constraints: const BoxConstraints(minHeight: 54),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: t.field,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: t.line),
      ),
      child: Row(
        children: [
          AppIcon(icon, size: 19, color: t.tone),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: t.muted,
                  ),
                ),
                Text(
                  ltr ? ltrIsolate(value) : value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w600,
                    color: t.ink,
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

/// A place to choose among the shop's (a country, a city).
class _Picker extends StatelessWidget {
  const _Picker({
    required this.t,
    required this.icon,
    required this.label,
    required this.value,
    this.onTap,
  });

  final _Tones t;
  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: t.field,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: BorderSide(color: t.line),
    ),
    child: InkWell(
      customBorder: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            AppIcon(icon, size: 18, color: t.tone),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: t.muted,
                    ),
                  ),
                  Text(
                    value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: t.ink,
                    ),
                  ),
                ],
              ),
            ),
            AppIcon(AppIcons.expand, size: 18, color: t.muted),
          ],
        ),
      ),
    ),
  );
}

/// Where the door is: a drawn map with the shop's pin, opening the map.
class _MapPin extends StatelessWidget {
  const _MapPin({required this.t, required this.label, this.onTap});

  final _Tones t;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: label,
    excludeSemantics: true,
    child: GestureDetector(
      onTap: onTap,
      child: Container(
        key: const ValueKey('gift-map'),
        height: 120,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: t.line),
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            CustomPaint(painter: _MapPainter(dark: t.p.isDark)),
            Center(
              child: Transform.translate(
                offset: const Offset(0, -14),
                child: Transform.rotate(
                  angle: -0.785398,
                  child: Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: t.tone,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(17),
                        topRight: Radius.circular(17),
                        bottomRight: Radius.circular(17),
                      ),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x40000000),
                          blurRadius: 12,
                          offset: Offset(0, 6),
                        ),
                      ],
                    ),
                    alignment: Alignment.center,
                    child: Transform.rotate(
                      angle: 0.785398,
                      child: AppIcon(
                        AppIcons.florist,
                        size: 17,
                        color: t.onTone,
                        filled: true,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            PositionedDirectional(
              start: 10,
              bottom: 10,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: t.surface,
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AppIcon(Symbols.pin_drop_rounded, size: 14, color: t.tone),
                    const SizedBox(width: 6),
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: t.ink,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _MapPainter extends CustomPainter {
  const _MapPainter({required this.dark});
  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = dark ? const Color(0xFF1B1E22) : const Color(0xFFEEF0EC),
    );
    final w = size.width;
    final h = size.height;
    final water = Path()
      ..moveTo(0, h * 0.68)
      ..cubicTo(w * 0.25, h * 0.5, w * 0.4, h * 0.85, w * 0.63, h * 0.62)
      ..cubicTo(w * 0.8, h * 0.45, w * 0.92, h * 0.4, w, h * 0.43)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(
      water,
      Paint()..color = dark ? const Color(0xFF1E3341) : const Color(0xFFCFE2EA),
    );
    final road = Paint()
      ..color = dark ? const Color(0xFF2C3036) : Colors.white
      ..strokeWidth = 6;
    for (final y in [0.15, 0.44, 0.72]) {
      canvas.drawLine(Offset(0, h * y), Offset(w, h * y - 14), road);
    }
    for (final x in [0.2, 0.5, 0.77]) {
      canvas.drawLine(
        Offset(w * x, 0),
        Offset(w * x + 20, h),
        road..strokeWidth = 5,
      );
    }
  }

  @override
  bool shouldRepaint(_MapPainter old) => old.dark != dark;
}

class _Chip extends StatelessWidget {
  const _Chip({required this.t, required this.choice, this.onTap});

  final _Tones t;
  final GiftChoice choice;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final on = choice.selected;
    final off = !choice.enabled;
    final ink = on
        ? t.onTone
        : off
        ? t.ink.withValues(alpha: 0.35)
        : t.ink;
    return Semantics(
      button: true,
      selected: on,
      enabled: !off,
      child: Material(
        color: on ? t.tone : Colors.transparent,
        shape: StadiumBorder(side: BorderSide(color: on ? t.tone : t.line)),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (choice.icon != null) ...[
                  AppIcon(
                    choice.icon!,
                    size: 15,
                    color: on
                        ? t.onTone
                        : off
                        ? ink
                        : t.tone,
                    filled: on,
                  ),
                  const SizedBox(width: 6),
                ],
                Text(
                  choice.label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: ink,
                    decoration: off ? TextDecoration.lineThrough : null,
                  ),
                ),
                if (choice.extra != null) ...[
                  const SizedBox(width: 6),
                  Text(
                    choice.extra!,
                    style: TextStyle(
                      fontSize: 11.5,
                      color: ink.withValues(alpha: 0.75),
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

/// The day's slots, two to a row.
class _SlotGrid extends StatelessWidget {
  const _SlotGrid({required this.t, required this.slots, this.onTap});

  final _Tones t;
  final List<GiftChoice> slots;
  final ValueChanged<int>? onTap;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, box) {
      final width = (box.maxWidth - 8) / 2;
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final (i, s) in slots.indexed)
            SizedBox(
              width: width,
              child: Semantics(
                button: true,
                selected: s.selected,
                enabled: s.enabled,
                child: Material(
                  color: s.selected ? t.tone : Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(color: s.selected ? t.tone : t.line),
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: s.enabled ? () => onTap?.call(i) : null,
                    child: SizedBox(
                      height: 44,
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                ltrIsolate(s.label),
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: s.selected
                                      ? t.onTone
                                      : s.enabled
                                      ? t.ink
                                      : t.muted,
                                ),
                              ),
                              if (s.extra != null) ...[
                                const SizedBox(width: 6),
                                Text(
                                  s.extra!,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: (s.selected ? t.onTone : t.ink)
                                        .withValues(alpha: 0.7),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      );
    },
  );
}

/// A ready message as a card; a tap puts it on the card.
class _ReadyMessage extends StatelessWidget {
  const _ReadyMessage({
    required this.t,
    required this.text,
    required this.chosen,
    required this.onTap,
  });

  final _Tones t;
  final String text;
  final bool chosen;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: chosen,
    child: Material(
      color: chosen ? t.soft : Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: chosen ? t.tone : t.line),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: SizedBox(
          width: 176,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Text(
              text,
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 13,
                height: 1.35,
                fontStyle: FontStyle.italic,
                color: t.ink,
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

class _MainLine extends StatelessWidget {
  const _MainLine({required this.t, required this.line});

  final _Tones t;
  final GiftLine line;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(31),
        child: SizedBox(
          width: 62,
          height: 74,
          child: line.imageUrl != null
              ? AppNetworkImage(url: line.imageUrl!, fit: BoxFit.cover)
              : ColoredBox(color: t.soft),
        ),
      ),
      const SizedBox(width: 12),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              line.title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: t.ink,
              ),
            ),
            if (line.subtitle != null)
              Text(
                line.subtitle!,
                style: TextStyle(fontSize: 12.5, color: t.muted),
              ),
          ],
        ),
      ),
      Text(
        line.price,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w800,
          color: t.ink,
        ),
      ),
    ],
  );
}

class _Amount extends StatelessWidget {
  const _Amount({
    required this.t,
    required this.label,
    required this.value,
    this.strong = false,
    this.small = false,
  });

  final _Tones t;
  final String label;
  final String value;
  final bool strong;
  final bool small;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.symmetric(vertical: small ? 1 : 0),
    child: Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: small
                  ? 12.5
                  : strong
                  ? 16
                  : 14,
              fontWeight: strong ? FontWeight.w800 : FontWeight.w500,
              color: small ? t.muted : t.ink,
            ),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: small
                ? 12.5
                : strong
                ? 17
                : 14,
            fontWeight: strong ? FontWeight.w800 : FontWeight.w600,
            color: small ? t.muted : t.ink,
          ),
        ),
      ],
    ),
  );
}

class _CodeRow extends StatelessWidget {
  const _CodeRow({required this.t, required this.code, this.onApply});

  final _Tones t;
  final String code;
  final ValueChanged<String>? onApply;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 46,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: t.tone.withValues(alpha: 0.6)),
            ),
            child: Row(
              children: [
                AppIcon(Symbols.sell_rounded, size: 17, color: t.tone),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    code.isEmpty ? l10n.giftDiscount : code,
                    style: TextStyle(
                      fontSize: 13.5,
                      color: code.isEmpty ? t.muted : t.ink,
                      fontWeight: code.isEmpty
                          ? FontWeight.w500
                          : FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),
        TextButton(
          onPressed: onApply == null ? null : () => onApply!(code),
          style: TextButton.styleFrom(
            backgroundColor: t.soft,
            foregroundColor: t.tone,
            minimumSize: const Size(0, 46),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16),
          ),
          child: Text(
            l10n.giftApply,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
      ],
    );
  }
}

class _PayButton extends StatelessWidget {
  const _PayButton({required this.t, required this.label, this.onTap});

  final _Tones t;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: label,
    excludeSemantics: true,
    child: Material(
      color: Colors.transparent,
      child: InkWell(
        key: const ValueKey('gift-pay'),
        borderRadius: BorderRadius.circular(27),
        onTap: onTap,
        child: Ink(
          height: 54,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(27),
            gradient: LinearGradient(
              colors: [t.tone, Color.lerp(t.tone, Colors.black, 0.2)!],
            ),
            boxShadow: [
              BoxShadow(
                color: t.tone.withValues(alpha: 0.35),
                blurRadius: 24,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AppIcon(AppIcons.lock, size: 18, color: t.onTone),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: t.onTone,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

/// The floral line under the card's preview, for a page around the look.
Widget giftFloralLine(BuildContext context, Color accent) => ChromeFloralLine(
  color: context.palette.text.withValues(alpha: 0.16),
  flower: accent,
);
