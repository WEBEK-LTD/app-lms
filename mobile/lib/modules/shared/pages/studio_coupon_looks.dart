import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';

/// 131 The coupon element's premium looks: a `ticket` (the offer on a
/// coloured stub, a perforation, the code and the copy button) and `glass`
/// (a frosted card with the code and what it takes off). With one of the
/// shop's coupons ([offer]) it says what it takes off and from what order.
class StudioCouponLook extends StatelessWidget {
  const StudioCouponLook({
    super.key,
    required this.code,
    required this.look,
    required this.color,
    required this.radius,
    this.offer,
  });

  final String code;
  final CouponLook look;
  final Color color;
  final double radius;
  final PublicCoupon? offer;

  String? _offerText(BuildContext context) {
    final o = offer;
    if (o == null) return null;
    if (o.percentOff != null) return context.l10n.saleOff(o.percentOff!);
    if (o.amountOff != null) return context.l10n.couponOff(o.amountOff!);
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final offerText = _offerText(context);
    final minOrder = offer?.minOrder;
    final copy = DecoratedBox(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcon(AppIcons.copy, size: 16, color: p.onPrimary),
            const SizedBox(width: 4),
            Text(
              l10n.copy,
              style: TextStyle(
                color: p.onPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
    final codeText = Text(
      code,
      textDirection: TextDirection.ltr,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        color: look == CouponLook.glass ? p.text : color,
        fontSize: 17,
        fontWeight: FontWeight.w800,
        letterSpacing: 2,
      ),
    );
    final details = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        codeText,
        if (look == CouponLook.glass && offerText != null)
          Text(
            offerText,
            style: TextStyle(fontSize: 12, color: p.textSecondary),
          ),
        if (minOrder != null)
          Text(
            l10n.couponMinOrder(minOrder),
            // 131 Its condition whole, on two lines when it needs them.
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 11, color: p.textSecondary),
          ),
      ],
    );
    final Widget face = switch (look) {
      CouponLook.ticket => ClipPath(
        clipper: _TicketClipper(at: 84),
        child: Container(
          key: const ValueKey('studio-coupon-ticket'),
          color: Color.alphaBlend(color.withValues(alpha: 0.10), p.surface),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  width: 84,
                  color: color,
                  alignment: Alignment.center,
                  padding: const EdgeInsets.all(8),
                  child: offerText != null
                      ? Text(
                          offerText,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: p.onPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                          ),
                        )
                      : AppIcon(AppIcons.gift, color: p.onPrimary, size: 26),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
                    child: Row(
                      children: [
                        Expanded(child: details),
                        const SizedBox(width: 8),
                        copy,
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      _ => Container(
        key: const ValueKey('studio-coupon-glass'),
        padding: const EdgeInsetsDirectional.fromSTEB(14, 10, 10, 10),
        decoration: BoxDecoration(
          color: p.surface.withValues(alpha: 0.72),
          borderRadius: BorderRadius.circular(radius),
          border: Border.all(color: Colors.white.withValues(alpha: 0.5)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.10),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(child: details),
            const SizedBox(width: 8),
            copy,
          ],
        ),
      ),
    };
    return Semantics(
      button: true,
      label: [l10n.copyCode, code, ?offerText].join(', '),
      excludeSemantics: true,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          key: const ValueKey('studio-coupon'),
          borderRadius: BorderRadius.circular(radius),
          onTap: () async {
            await Clipboard.setData(ClipboardData(text: code));
            if (context.mounted) showMessage(context, l10n.codeCopied);
          },
          child: ClipRRect(
            borderRadius: BorderRadius.circular(radius),
            child: face,
          ),
        ),
      ),
    );
  }
}

/// Notches cut from both edges at the stub's end.
class _TicketClipper extends CustomClipper<Path> {
  _TicketClipper({required this.at});

  final double at;

  @override
  Path getClip(Size size) {
    const r = 8.0;
    return Path.combine(
      PathOperation.difference,
      Path()..addRect(Offset.zero & size),
      Path()
        ..addOval(Rect.fromCircle(center: Offset(at, 0), radius: r))
        ..addOval(Rect.fromCircle(center: Offset(at, size.height), radius: r)),
    );
  }

  @override
  bool shouldReclip(_TicketClipper oldClipper) => oldClipper.at != at;
}
