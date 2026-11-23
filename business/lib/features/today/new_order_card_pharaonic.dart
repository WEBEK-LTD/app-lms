import 'package:flutter/material.dart';

import '../../core/theme/pharaonic_widgets.dart';
import '../../core/theme/theme.dart';
import 'new_order_card.dart';

/// 215 The shared New order card (214) in the Pharaonic theme: its colours
/// from the theme, a gilt frame with corner pieces and a faience-tile edge,
/// and a soft light sweeping across it while the order waits (still when
/// the phone asks for less motion; gone with the card once it's answered).
NewOrderCardTheme pharaonicNewOrderCard(YbColors c, YbOrnaments o) =>
    NewOrderCardTheme(
      background: c.surface,
      border: c.gold,
      badgeBackground: o.faienceBg,
      badgeInk: o.faience,
      number: c.gold,
      ink: c.ink,
      ink2: c.ink2,
      chipBackground: c.muted,
      divider: c.line,
      acceptBackground: o.dark
          ? const Color(0xFFCFA651)
          : const Color(0xFF1C2A5C),
      acceptInk: o.buttonInk,
      reject: c.danger,
      radius: 18,
      // Room for the faience tiles the frame paints along the top.
      ornament: (_) => const SizedBox(height: 8),
      frame: _frame,
    );

Widget _frame({
  required NewOrderCardTheme theme,
  required VoidCallback onTap,
  required Widget child,
}) => Shimmer(
  key: const ValueKey('new-order-shimmer'),
  child: GiltCard(
    tiles: true,
    child: Material(
      type: MaterialType.transparency,
      child: InkWell(
        borderRadius: BorderRadius.circular(theme.radius),
        onTap: onTap,
        child: child,
      ),
    ),
  ),
);
