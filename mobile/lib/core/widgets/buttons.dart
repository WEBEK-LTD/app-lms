import 'package:flutter/material.dart';

import '../theme/app_icons.dart';
import '../theme/app_theme.dart';
import '../theme/palette.dart';
import '../l10n/l10n.dart';

/// The 44 x 44 square icon button from the designs (back, close, wishlist).
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
    return Semantics(
      button: true,
      label: label,
      enabled: onPressed != null,
      excludeSemantics: true,
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
            width: size < 44 ? 44 : size,
            height: size < 44 ? 44 : size,
            child: Stack(
              alignment: Alignment.center,
              children: [
                AppIcon(
                  icon,
                  size: iconSize,
                  color: foreground ?? p.text,
                  filled: filled,
                ),
                if (badge)
                  PositionedDirectional(
                    top: 9,
                    end: 10,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: p.accent,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
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
                AppIcon(icon!, size: 20, color: p.onPrimary),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: p.onPrimary,
                  ),
                ),
              ),
            ],
          );
    return FilledButton(
      onPressed: loading ? null : onPressed,
      style: FilledButton.styleFrom(
        minimumSize: Size.fromHeight(height),
        disabledBackgroundColor: loading
            ? p.primary
            : p.primary.withValues(alpha: 0.4),
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
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            AppIcon(icon!, size: 18, color: p.text),
            const SizedBox(width: 6),
          ],
          Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
        ],
      ),
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

/// A pill-shaped filter chip (All / Free / Paid / Newest, categories).
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
      child: Material(
        color: selected ? p.primary : p.surface,
        shape: StadiumBorder(
          side: selected ? BorderSide.none : BorderSide(color: p.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: height < 44 ? 44 : height),
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
    );
  }
}

/// The three-way segmented control from the designs (tabs, appearance).
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
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: p.segment,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++) ...[
            if (i > 0) const SizedBox(width: 4),
            Expanded(
              child: Semantics(
                selected: i == selected,
                button: true,
                inMutuallyExclusiveGroup: radio,
                label: radio
                    ? labels[i]
                    : context.l10n.tabPosition(labels[i], i + 1, labels.length),
                excludeSemantics: true,
                child: Material(
                  color: i == selected ? p.surface : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(9),
                    onTap: () => onChanged(i),
                    child: SizedBox(
                      height: height,
                      child: Center(
                        child: Text(
                          labels[i],
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: i == selected
                                ? FontWeight.w700
                                : FontWeight.w400,
                            color: i == selected ? p.text : p.textSecondary,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
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
      child: SafeArea(top: false, minimum: padding, child: child),
    );
  }
}
