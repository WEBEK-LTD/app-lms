import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart' show AppNetworkImage;

/// 131.25 The premium gift checkout's frame (`Config.screens.checkout.look`
/// `gift`), Leqaa's first and any store's: the five steps (who it is from,
/// who it is for, when, the card's message, pay) in a bar that stays at the
/// top of the cart, and the gift card's live preview (the bouquet's photo,
/// who it is for, the words as they are typed, who it is from, a wax seal).
/// The steps' parts in between are the store's gift checkout itself
/// (gift_checkout.dart: the sender, the recipient and the address with the
/// shop's places and the map pin, the day and slot, the card's occasions
/// and ready messages), drawn in the look's style, so the look runs on the
/// shop's real data and rules; in the look's colour (the checkout's accent
/// by day and by night, else the main colour), light and dark, right to
/// left, still for people who turn movement off.

/// The five steps' words, in order.
List<String> giftStepLabels(BuildContext context) {
  final l10n = context.l10n;
  return [
    l10n.giftStepFrom,
    l10n.giftStepFor,
    l10n.giftStepWhen,
    l10n.giftStepMessage,
    l10n.giftStepPay,
  ];
}

/// The step the order is at: the first one not done yet.
int giftStepOf({
  required bool senderDone,
  required bool recipientDone,
  required bool whenDone,
  required bool messageDone,
}) => !senderDone
    ? 0
    : !recipientDone
    ? 1
    : !whenDone
    ? 2
    : !messageDone
    ? 3
    : 4;

/// 168 Whether the gift checkout's steps take their short form: a screen
/// under 860 points high (360×800, 390×844), where the cart's fixed top and
/// bottom left the form about 400 points.
bool compactSteps(BuildContext context) =>
    MediaQuery.sizeOf(context).height < 860;

/// The five steps in a bar that stays at the top of the cart.
class GiftStepBar extends StatelessWidget {
  const GiftStepBar({
    super.key,
    required this.step,
    this.done = const [],
    this.accent,
    this.labels,
  });

  /// 162 Other steps' words (Build your bouquet's); null: the five steps.
  final List<String>? labels;

  /// The step now: the one in view, else the first not done.
  final int step;

  /// Which steps are done: each done one is ticked, before or after [step].
  final List<bool> done;

  /// The look's colour; null, the app's main colour.
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = _Tones(p, accent ?? p.primary);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.page,
        border: Border(bottom: BorderSide(color: t.line)),
      ),
      child: compactSteps(context)
          // 168 On a short screen (360×800 and the like) the form needs the
          // room: one thin line of small steps, the step now named beside it.
          ? Padding(
              padding: const EdgeInsets.fromLTRB(0, 4, 0, 6),
              child: _Stepper(
                t: t,
                step: step,
                done: done,
                labels: labels ?? giftStepLabels(context),
                compact: true,
              ),
            )
          : Padding(
              padding: const EdgeInsets.fromLTRB(0, 6, 0, 10),
              child: _Stepper(
                t: t,
                step: step,
                done: done,
                labels: labels ?? giftStepLabels(context),
              ),
            ),
    );
  }
}

/// The gift card as it will be written, following the typing.
class GiftCardPreview extends StatelessWidget {
  const GiftCardPreview({
    super.key,
    required this.photoUrl,
    required this.to,
    required this.from,
    required this.message,
    this.icon,
    this.accent,
  });

  final String? photoUrl;
  final String to;
  final String from;
  final String message;
  final IconData? icon;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return _CardPreview(
      t: _Tones(p, accent ?? p.primary),
      photoUrl: photoUrl,
      to: to,
      from: from,
      message: message,
      icon: icon,
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
  const _Stepper({
    required this.t,
    required this.step,
    required this.labels,
    this.done = const [],
    this.compact = false,
  });

  final _Tones t;
  final int step;
  final List<String> labels;
  final List<bool> done;

  /// 168 Small steps on one line, only the step now named, beside them.
  final bool compact;

  /// Ticked: a step done, wherever the step now is (168: the part in view
  /// may be above it); without being told, those before the step now.
  bool _ticked(int i) => i != step && (done.length > i ? done[i] : i < step);

  @override
  Widget build(BuildContext context) =>
      compact ? _compact(context) : _full(context);

  Widget _compact(BuildContext context) => Padding(
    key: const ValueKey('gift-stepper-compact'),
    padding: const EdgeInsets.symmetric(horizontal: 16),
    child: Row(
      children: [
        for (final (i, label) in labels.indexed) ...[
          if (i > 0)
            Expanded(
              child: Container(
                height: 2,
                color: _ticked(i - 1) ? t.tone : t.line,
              ),
            ),
          Semantics(
            label: label,
            selected: i == step,
            child: Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _ticked(i) ? t.tone : t.surface,
                border: Border.all(
                  color: _ticked(i) || i == step ? t.tone : t.line,
                  width: 2,
                ),
              ),
              alignment: Alignment.center,
              child: _ticked(i)
                  ? AppIcon(AppIcons.check, size: 11, color: t.onTone)
                  : i == step
                  ? Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: t.tone,
                      ),
                    )
                  : null,
            ),
          ),
        ],
        const SizedBox(width: 10),
        ExcludeSemantics(
          child: Text(
            labels[step.clamp(0, labels.length - 1)],
            key: const ValueKey('gift-stepper-now'),
            maxLines: 1,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: t.ink,
            ),
          ),
        ),
      ],
    ),
  );

  Widget _full(BuildContext context) => Padding(
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
                                color: _ticked(i - 1) ? t.tone : t.line,
                              ),
                            ),
                          ),
                        Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _ticked(i) ? t.tone : t.surface,
                            border: Border.all(
                              color: _ticked(i) || i == step ? t.tone : t.line,
                              width: 2,
                            ),
                            boxShadow: i == step
                                ? [BoxShadow(color: t.soft, spreadRadius: 4)]
                                : null,
                          ),
                          alignment: Alignment.center,
                          child: _ticked(i)
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
                    // The card's wax seal: the shop's flower pressed in it.
                    PositionedDirectional(
                      top: 10,
                      end: 12,
                      child: Transform.rotate(
                        angle: -0.21,
                        child: SizedBox(
                          key: const ValueKey('gift-seal'),
                          width: 40,
                          height: 40,
                          child: CustomPaint(
                            painter: _SealPainter(t.tone),
                            child: Center(
                              child: AppIcon(
                                AppIcons.florist,
                                size: 18,
                                color: Colors.white.withValues(alpha: 0.92),
                              ),
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

/// 131.25 A wax seal: a round of wax with a soft scalloped edge, lit from
/// its top, a pressed ring inside it.
class _SealPainter extends CustomPainter {
  const _SealPainter(this.tone);

  final Color tone;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final r = size.shortestSide / 2;
    final edge = Path();
    const points = 96;
    for (var i = 0; i <= points; i++) {
      final a = i / points * 2 * math.pi;
      final d = r * (0.93 + 0.05 * math.cos(a * 11) + 0.02 * math.sin(a * 5));
      final o = c + Offset(math.cos(a) * d, math.sin(a) * d);
      i == 0 ? edge.moveTo(o.dx, o.dy) : edge.lineTo(o.dx, o.dy);
    }
    edge.close();
    canvas.drawShadow(edge, tone.withValues(alpha: 0.6), 3, false);
    final hsl = HSLColor.fromColor(tone);
    final light = hsl
        .withLightness((hsl.lightness + 0.14).clamp(0.0, 0.9))
        .toColor();
    final deep = hsl
        .withLightness((hsl.lightness - 0.10).clamp(0.05, 1.0))
        .toColor();
    canvas.drawPath(
      edge,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(-0.35, -0.45),
          radius: 1.05,
          colors: [light, tone, deep],
          stops: const [0, 0.55, 1],
        ).createShader(Rect.fromCircle(center: c, radius: r)),
    );
    canvas.drawCircle(
      c,
      r * 0.68,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..color = Colors.white.withValues(alpha: 0.38),
    );
  }

  @override
  bool shouldRepaint(_SealPainter old) => old.tone != tone;
}
