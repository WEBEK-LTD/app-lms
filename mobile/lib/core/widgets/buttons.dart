import 'package:flutter/material.dart';

import '../theme/app_icons.dart';
import '../theme/app_theme.dart';
import '../theme/palette.dart';
import '../l10n/l10n.dart';

/// The smallest area a finger can reliably hit (Material: 48 x 48).
const minTapTarget = 48.0;

/// Makes [child] at least [minTapTarget] square for taps without changing
/// how big it looks: taps just outside it still reach [onTap].
class TapTarget extends StatelessWidget {
  const TapTarget({super.key, required this.child, required this.onTap});

  final Widget child;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    behavior: HitTestBehavior.opaque,
    onTap: onTap,
    excludeFromSemantics: true,
    child: ConstrainedBox(
      constraints: const BoxConstraints(
        minWidth: minTapTarget,
        minHeight: minTapTarget,
      ),
      child: Center(widthFactor: 1, heightFactor: 1, child: child),
    ),
  );
}

/// The 44 x 44 square icon button from the designs (back, close, wishlist),
/// inside a 48 x 48 tap target. Dims its icon when disabled.
class SquareIconButton extends StatelessWidget {
  const SquareIconButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
    this.size = 44,
    this.iconSize = 22,
    this.background,
    this.foreground,
    this.bordered = true,
    this.filled = false,
    this.radius = 12,
    this.badge = false,
  });

  final IconData icon;

  /// Read by screen readers. Required: icon buttons have no visible text.
  final String label;
  final VoidCallback? onPressed;
  final double size;
  final double iconSize;
  final Color? background;
  final Color? foreground;
  final bool bordered;
  final bool filled;
  final double radius;

  /// A small Ember dot (for example unread notifications).
  final bool badge;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final bg = background ?? p.surface;
    final enabled = onPressed != null;
    final fg = foreground ?? p.text;
    return Semantics(
      // 38 Its own node: alone on a picture, it would otherwise take the
      // picture's whole area (a screen reader's "Back" covering the hero).
      container: true,
      button: true,
      label: label,
      enabled: enabled,
      excludeSemantics: true,
      child: TapTarget(
        onTap: onPressed,
        child: Material(
          color: bg,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radius),
            side: bordered ? BorderSide(color: p.border) : BorderSide.none,
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onPressed,
            child: SizedBox(
              width: size,
              height: size,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  AppIcon(
                    icon,
                    size: iconSize,
                    color: enabled ? fg : fg.withValues(alpha: 0.35),
                    filled: filled,
                  ),
                  if (badge)
                    PositionedDirectional(
                      top: size * 0.2,
                      end: size * 0.22,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: p.accent,
                          shape: BoxShape.circle,
                          border: Border.all(color: bg, width: 1.5),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The back button used at the top of pushed screens.
class AppBackButton extends StatelessWidget {
  const AppBackButton({super.key, this.onPressed, this.onDark = false});

  final VoidCallback? onPressed;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return SquareIconButton(
      icon: AppIcons.back,
      label: context.l10n.back,
      background: onDark ? p.primarySoft : null,
      foreground: onDark ? p.onPrimarySoft : null,
      bordered: !onDark,
      onPressed: onPressed ?? () => Navigator.of(context).maybePop(),
    );
  }
}

/// The width of an app bar's leading slot holding [AppBackButton], so the
/// button lines up with the page's 20 point margin.
const backLeadingWidth = 70.0;

/// [AppBackButton] for `AppBar.leading` (with [backLeadingWidth]).
class AppBarBackButton extends StatelessWidget {
  const AppBarBackButton({super.key});

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsetsDirectional.only(start: 18),
    child: Align(
      alignment: AlignmentDirectional.centerStart,
      child: AppBackButton(),
    ),
  );
}

/// 110 The leading of an [AppBar]: the app's rounded back button on a
/// screen opened on top of another, where Material would put its own arrow
/// (null at the bottom of a stack, and for full-screen dialogs, which keep
/// their close button).
Widget? appBarBack(BuildContext context) {
  final route = ModalRoute.of(context);
  if (route == null || !route.impliesAppBarDismissal) return null;
  if (route is PageRoute && route.fullscreenDialog) return null;
  return const AppBarBackButton();
}

/// The full-width primary button (Midnight with white text by default).
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
    this.height = 56,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  final double height;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final fg = onPressed == null && !loading ? p.textTertiary : p.onPrimary;
    final child = loading
        ? SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              color: p.onPrimary,
              semanticsLabel: context.l10n.loading,
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                AppIcon(icon!, size: 20, color: fg),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: _ButtonText(
                  label,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    height: 1.2,
                    color: fg,
                  ),
                ),
              ),
            ],
          );
    return FilledButton(
      onPressed: loading ? null : onPressed,
      style: FilledButton.styleFrom(
        minimumSize: Size.fromHeight(height),
        disabledBackgroundColor: loading ? p.primary : p.segment,
        disabledForegroundColor: p.textTertiary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(context.shapes.button),
        ),
      ),
      child: child,
    );
  }
}

/// The light button beside a primary one ("Previous").
class SecondaryButton extends StatelessWidget {
  const SecondaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.height = 54,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final double height;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: Size.fromHeight(height),
        backgroundColor: p.isDark ? p.surface : p.background,
        foregroundColor: p.text,
        side: BorderSide(color: p.border),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(context.shapes.button),
        ),
        // From the theme so the button keeps the app's font.
        textStyle: Theme.of(context).textTheme.labelLarge
            ?.copyWith(fontSize: 16, height: 1.2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            AppIcon(
              icon!,
              size: 18,
              color: onPressed == null ? p.textTertiary : p.text,
            ),
            const SizedBox(width: 6),
          ],
          Flexible(child: _ButtonText(label)),
        ],
      ),
    );
  }
}

/// 110 A button's words: up to two lines, but one word is made a little
/// smaller instead of broken in two ("Accep" / "t" on a small phone).
class _ButtonText extends StatelessWidget {
  const _ButtonText(this.label, {this.style});

  final String label;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    if (label.trim().contains(RegExp(r'\s'))) {
      return Text(
        label,
        maxLines: 2,
        textAlign: TextAlign.center,
        overflow: TextOverflow.ellipsis,
        style: style,
      );
    }
    return FittedBox(
      fit: BoxFit.scaleDown,
      child: Text(label, maxLines: 1, style: style),
    );
  }
}

/// The 54 x 54 previous / next buttons of the lesson footer.
class StepIconButton extends StatelessWidget {
  const StepIconButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Opacity(
      opacity: onPressed == null ? 0.4 : 1,
      child: SquareIconButton(
        icon: icon,
        label: label,
        size: 54,
        radius: context.shapes.button,
        background: p.isDark ? p.surfaceMuted : p.background,
        onPressed: onPressed,
      ),
    );
  }
}

/// The height of a horizontal row of [PillChip]s (48 at normal text size).
double chipRowHeight(BuildContext context) =>
    34 + MediaQuery.textScalerOf(context).scale(14);

/// A pill-shaped filter chip (All / Free / Paid / Newest, categories): 40
/// high inside a 48 high tap target.
class PillChip extends StatelessWidget {
  const PillChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.height = 40,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final double height;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      selected: selected,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Material(
          color: selected ? p.primary : p.surface,
          shape: StadiumBorder(
            side: selected ? BorderSide.none : BorderSide(color: p.border),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: height, minWidth: 48),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Center(
                  widthFactor: 1,
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                      color: selected ? p.onPrimary : p.text,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The three-way segmented control from the designs (tabs, appearance).
/// Each segment is 44 high, with the control's padding 52: taps on the
/// padding count for the nearest segment.
class SegmentedTabs extends StatelessWidget {
  const SegmentedTabs({
    super.key,
    required this.labels,
    required this.selected,
    required this.onChanged,
    this.height = 44,
    this.radio = false,
  });

  final List<String> labels;
  final int selected;
  final ValueChanged<int> onChanged;
  final double height;

  /// Announce as radio buttons instead of tabs.
  final bool radio;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: p.segment,
        borderRadius: BorderRadius.circular(context.shapes.r(12)),
      ),
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++)
            Expanded(
              child: Semantics(
                selected: i == selected,
                button: true,
                inMutuallyExclusiveGroup: radio,
                label: radio
                    ? labels[i]
                    : context.l10n.tabPosition(labels[i], i + 1, labels.length),
                excludeSemantics: true,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onChanged(i),
                  child: Padding(
                    padding: EdgeInsetsDirectional.fromSTEB(
                      i == 0 ? 4 : 2,
                      4,
                      i == labels.length - 1 ? 4 : 2,
                      4,
                    ),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      curve: Curves.easeOut,
                      decoration: BoxDecoration(
                        color: i == selected ? p.surface : Colors.transparent,
                        borderRadius: BorderRadius.circular(
                          context.shapes.r(9),
                        ),
                        boxShadow: i == selected && !p.isDark
                            ? const [
                                BoxShadow(
                                  color: Color(0x140E0D24),
                                  blurRadius: 3,
                                  offset: Offset(0, 1),
                                ),
                              ]
                            : null,
                      ),
                      child: Material(
                        type: MaterialType.transparency,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(
                            context.shapes.r(9),
                          ),
                          onTap: () => onChanged(i),
                          child: ConstrainedBox(
                            constraints: BoxConstraints(minHeight: height),
                            child: Center(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                ),
                                child: Text(
                                  labels[i],
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: i == selected
                                        ? FontWeight.w700
                                        : FontWeight.w400,
                                    color: i == selected
                                        ? p.text
                                        : p.textSecondary,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// White footer bar with a top border, used for main actions.
class BottomActionBar extends StatelessWidget {
  const BottomActionBar({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(20, 12, 20, 20),
  });

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: p.surface,
        border: Border(top: BorderSide(color: p.border)),
      ),
      child: SafeArea(
        top: false,
        minimum: padding,
        // As wide as the page's text on a tablet (readableWidth).
        child: Align(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: child,
          ),
        ),
      ),
    );
  }
}
