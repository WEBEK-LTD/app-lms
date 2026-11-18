import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/palette.dart';

/// 115.70 The vendor app's parts drawn from the approved designs
/// (docs/design/2026-11-18-marketplace, screens 08–10): the deep header in
/// the app's own colour, the glass buttons and pills on it, the small tags,
/// and the money and weights as staff read them.

/// The header's colour: the app's colour made deep (a poster green for
/// Zad), and nearly black at night.
Color vendorHeadColor(AppPalette p) => p.isDark
    ? Color.alphaBlend(
        p.primary.withValues(alpha: 0.16),
        const Color(0xFF07100B),
      )
    : Color.alphaBlend(Colors.black.withValues(alpha: 0.30), p.primary);

/// A light tint of the app's colour (the design's `--tint`): chips of the
/// customer's choice, the chosen minutes, the scale key.
Color vendorTint(AppPalette p) => Color.alphaBlend(
  p.primary.withValues(alpha: p.isDark ? 0.24 : 0.14),
  p.surface,
);

/// What's written on [vendorTint] (the design's `--tint-ink`).
Color vendorTintInk(AppPalette p) => p.isDark
    ? Color.alphaBlend(Colors.white.withValues(alpha: 0.55), p.primary)
    : Color.alphaBlend(Colors.black.withValues(alpha: 0.28), p.primary);

/// The codes' font (SKU, barcode), as the design prints them.
const vendorMono = 'JetBrains Mono';

/// White on the header, in every theme.
const vendorOnHead = Colors.white;

/// The glass on the header: buttons, pills and tiles.
Color get vendorGlass => Colors.white.withValues(alpha: 0.12);

/// The deep header at the top of the vendor's screens, under the status
/// bar.
class VendorHead extends StatelessWidget {
  const VendorHead({super.key, required this.child, this.bottom = 14});

  final Widget child;
  final double bottom;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Material(
      color: vendorHeadColor(p),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(16, 8, 16, bottom),
          child: DefaultTextStyle.merge(
            style: const TextStyle(color: vendorOnHead),
            child: IconTheme.merge(
              data: const IconThemeData(color: vendorOnHead),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

/// A round glass button on the header.
class VendorRoundButton extends StatelessWidget {
  const VendorRoundButton({
    super.key,
    required this.icon,
    required this.onTap,
    required this.label,
    this.size = 38,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final String label;
  final double size;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: label,
    child: Material(
      color: vendorGlass,
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          width: size,
          height: size,
          child: Icon(icon, size: 20, color: vendorOnHead),
        ),
      ),
    ),
  );
}

/// A small rounded tag: "Ringing", "weigh", "If out: similar".
class VendorTag extends StatelessWidget {
  const VendorTag({
    super.key,
    required this.label,
    required this.background,
    required this.foreground,
    this.icon,
    this.upper = false,
  });

  final String label;
  final Color background;
  final Color foreground;
  final IconData? icon;
  final bool upper;

  @override
  Widget build(BuildContext context) {
    // Arabic has no capitals and keeps its letters joined.
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(7),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: foreground),
            const SizedBox(width: 4),
          ],
          Flexible(
            child: Text(
              upper && !rtl ? label.toUpperCase() : label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: upper && !rtl ? 0.6 : 0,
                color: foreground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A chip of an order's facts: how it goes, how it's paid, its items.
class VendorMeta extends StatelessWidget {
  const VendorMeta({super.key, required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: p.surfaceMuted,
        borderRadius: BorderRadius.circular(9),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: p.text),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The amount of a [MarketMoney] as a number.
double moneyValue(MarketMoney m) => double.tryParse(m.amount) ?? 0;

/// [value] written as [like] is ("EGP 160.00" and 124.8 → "EGP 124.80"):
/// its decimals, its grouping and its currency where it puts it.
String moneyLike(MarketMoney like, num value) {
  final dot = like.amount.indexOf('.');
  final decimals = dot < 0 ? 0 : like.amount.length - dot - 1;
  final fixed = value.abs().toStringAsFixed(decimals);
  final parts = fixed.split('.');
  final whole = parts[0].replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ',',
  );
  final number =
      '${value < 0 ? '-' : ''}$whole${parts.length > 1 ? '.${parts[1]}' : ''}';
  final at = RegExp(r'-?\d[\d,]*(?:\.\d+)?').firstMatch(like.formatted);
  if (at == null) return number;
  return like.formatted.replaceRange(at.start, at.end, number);
}

/// The short name of a unit: kg, g, l.
String unitShort(AppLocalizations l10n, ProductUnit unit) => switch (unit) {
  ProductUnit.kg => l10n.vendorUnitKg,
  ProductUnit.g => l10n.vendorUnitG,
  ProductUnit.l => l10n.vendorUnitL,
  ProductUnit.item => '',
};

String _trim(double v) =>
    v.toStringAsFixed(3).replaceFirst(RegExp(r'\.?0+$'), '');

/// An amount as staff read it: "×3", "500 g", "1.5 kg", "750 ml".
String amountText(AppLocalizations l10n, double quantity, ProductUnit unit) =>
    switch (unit) {
      ProductUnit.item => '×${quantity.round()}',
      ProductUnit.g => '${quantity.round()} ${l10n.vendorUnitG}',
      ProductUnit.kg when quantity < 1 =>
        '${(quantity * 1000).round()} ${l10n.vendorUnitG}',
      ProductUnit.kg => '${_trim(quantity)} ${l10n.vendorUnitKg}',
      ProductUnit.l when quantity < 1 =>
        '${(quantity * 1000).round()} ${l10n.vendorUnitMl}',
      ProductUnit.l => '${_trim(quantity)} ${l10n.vendorUnitL}',
    };

/// How a weighed line's weight is typed on the keypad: grams for kilos and
/// grams, millilitres for litres.
String keypadUnit(AppLocalizations l10n, ProductUnit unit) =>
    unit == ProductUnit.l ? l10n.vendorUnitMl : l10n.vendorUnitG;

/// The typed keypad number in the line's own unit (kg, g or l).
double keypadToQuantity(int typed, ProductUnit unit) =>
    unit == ProductUnit.g ? typed.toDouble() : typed / 1000;

/// How it's paid, as a word.
String payText(AppLocalizations l10n, MarketPayMethod m) => switch (m) {
  MarketPayMethod.cash => l10n.vendorPayCash,
  MarketPayMethod.card => l10n.vendorPayCard,
  MarketPayMethod.wallet => l10n.vendorPayWallet,
  MarketPayMethod.applePay => 'Apple Pay',
  MarketPayMethod.googlePay => 'Google Pay',
};

/// 115.71 (D1) The most a weighed line may charge: the estimate for an
/// order paid online (card, Apple Pay, Google Pay, wallet), the estimate
/// plus the tolerance for cash.
double chargeCap(MarketOrderLine line, MarketPayMethod pay, int tolerance) {
  final estimate = moneyValue(line.unitPrice) * line.quantity;
  return pay == MarketPayMethod.cash
      ? estimate * (100 + tolerance) / 100
      : estimate;
}

/// 115.71 The most a cash order's weighed line may weigh, in its unit;
/// null when any weight is taken (paid online: charged at most the
/// estimate whatever it weighs).
double? weightCap(MarketOrderLine line, MarketPayMethod pay, int tolerance) =>
    pay == MarketPayMethod.cash
    ? line.quantity * (100 + tolerance) / 100
    : null;

/// What a weighed line charges for [quantity]: what the scale reads, never
/// above [chargeCap].
double chargeFor(
  MarketOrderLine line,
  double quantity,
  MarketPayMethod pay,
  int tolerance,
) {
  final scale = moneyValue(line.unitPrice) * quantity;
  final cap = chargeCap(line, pay, tolerance);
  return scale < cap ? scale : cap;
}

/// "4:32": minutes and seconds.
String minutesSeconds(Duration d) {
  final s = d.isNegative ? 0 : d.inSeconds;
  return '${s ~/ 60}:${(s % 60).toString().padLeft(2, '0')}';
}
