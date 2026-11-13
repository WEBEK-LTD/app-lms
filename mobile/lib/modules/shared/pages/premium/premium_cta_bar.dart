import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/theme/palette.dart';
import '../../../../core/theme/symbol_names.dart';
import '../page_actions.dart';
import 'premium_shared.dart';

/// 129.20 A call to action at the page's foot, pinned there (`pin`
/// bottom) so it stays above the tabs while the page scrolls: a bar with
/// its label (a price the owner writes) and a button, or a round floating
/// button at the end side (a wide one with its words).
class PremiumCtaBar extends ConsumerWidget {
  const PremiumCtaBar({super.key, required this.node, required this.dark});

  final StudioNode node;
  final bool dark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tones = PremiumTones.of(context, dark: dark);
    final brand =
        parseHexColor(
          dark ? (node.darkBackground ?? node.background) : node.background,
        ) ??
        tones.brand;
    final ink =
        parseHexColor(dark ? (node.darkColor ?? node.color) : node.color) ??
        tones.ink;
    final label = node.title ?? '';
    final words = node.text ?? '';
    final action = node.action;
    final tap = action != null && canOpenAction(ref, action)
        ? () => runPageAction(context, ref, action)
        : null;
    Widget? icon(double size) => node.icon == null
        ? null
        : Icon(symbolByName(node.icon), size: size, color: Colors.white);
    if (node.premium?.fab ?? false) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Align(
          alignment: AlignmentDirectional.centerEnd,
          child: Semantics(
            button: true,
            label: words.isEmpty ? label : null,
            child: Material(
              key: ValueKey('premium-fab-${node.id}'),
              color: brand,
              elevation: 0,
              shape: const StadiumBorder(),
              shadowColor: Colors.transparent,
              child: InkWell(
                customBorder: const StadiumBorder(),
                onTap: tap,
                child: Container(
                  height: 56,
                  constraints: const BoxConstraints(minWidth: 56),
                  padding: EdgeInsets.symmetric(
                    horizontal: words.isEmpty ? 0 : 20,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: [
                      BoxShadow(
                        color: brand.withValues(alpha: 0.4),
                        blurRadius: 28,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ?icon(24),
                      if (words.isNotEmpty) ...[
                        if (node.icon != null) const SizedBox(width: 8),
                        Text(
                          words,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
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
      );
    }
    final radius = Radius.circular(node.radius > 0 ? node.radius : 22);
    return Container(
      key: ValueKey('premium-cta-${node.id}'),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: tones.card,
        borderRadius: BorderRadius.only(topLeft: radius, topRight: radius),
        border: Border(top: BorderSide(color: tones.edge)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A0E0D24),
            blurRadius: 28,
            offset: Offset(0, -10),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: ink,
              ),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            height: 48,
            child: FilledButton(
              onPressed: tap,
              style: FilledButton.styleFrom(
                backgroundColor: brand,
                foregroundColor: Colors.white,
                disabledBackgroundColor: brand,
                disabledForegroundColor: Colors.white,
                minimumSize: const Size(0, 48),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    words,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (node.icon != null) ...[
                    const SizedBox(width: 8),
                    ?icon(20),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
