import 'dart:math' as math;
import 'dart:ui' show ImageFilter, lerpDouble;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api/models/screens_models.dart';
import '../l10n/l10n.dart';
import '../theme/app_icons.dart';
import '../theme/palette.dart';
import 'common.dart' show AppNetworkImage;

/// 130.20–130.29 Premium chrome, for every Studio app: the premium headers
/// (a large title that collapses on scroll, a frosted glass bar, a photo
/// cover, the brand in the middle, the title with a search pill) with round
/// glass buttons, and the premium look of the app's system screens
/// (`Config.screens.system`): inset cards with tinted icon tiles, a frosted
/// glass wash, a photo or brand hero, an illustrated empty state and a
/// shimmer in the brand's tones while loading. In the project's colours and
/// fonts (the theme's), light and dark, mirrored right to left, and still
/// for people who turn movement off.

// ----------------------------------------------------------------- Scopes

/// 130.21 The project's system screens' look, above every screen (app.dart).
class SystemLookScope extends InheritedWidget {
  const SystemLookScope({
    super.key,
    required this.system,
    required super.child,
  });

  final SystemScreensLook? system;

  static SystemScreensLook? systemOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<SystemLookScope>()?.system;

  /// The look [screen] has in this project; null, its own.
  static SystemLook? lookOf(BuildContext context, SystemScreen screen) =>
      systemOf(context)?.lookFor(screen);

  @override
  bool updateShouldNotify(SystemLookScope oldWidget) =>
      oldWidget.system != system;
}

/// 130.21 One system screen: its parts (the grouped rows, the cards, the
/// tab's title) take the look it has in this project.
class SystemScreenArea extends StatelessWidget {
  const SystemScreenArea({
    super.key,
    required this.screen,
    required this.child,
  });

  final SystemScreen screen;
  final Widget child;

  @override
  Widget build(BuildContext context) => _SystemScreenLook(
    look: SystemLookScope.lookOf(context, screen),
    child: child,
  );

  /// The look of the system screen [context] is in; null, none (or its own).
  static SystemLook? lookOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_SystemScreenLook>()?.look;
}

class _SystemScreenLook extends InheritedWidget {
  const _SystemScreenLook({required this.look, required super.child});

  final SystemLook? look;

  @override
  bool updateShouldNotify(_SystemScreenLook oldWidget) =>
      oldWidget.look != look;
}

// ----------------------------------------------------------------- Tones

/// 130.21 The premium tones made from the project's colours.
abstract final class ChromeTones {
  /// The rows' icon tiles take these in turn: the main colour, warm, blue,
  /// violet, green and the second colour (lighter by night).
  static Color tint(AppPalette p, int i) {
    final list = [
      p.primary,
      const Color(0xFFC77A12),
      const Color(0xFF2F6FDB),
      const Color(0xFF8A4FD8),
      const Color(0xFF1C9C6B),
      p.accent,
    ];
    final c = list[i.abs() % list.length];
    return p.isDark ? Color.lerp(c, Colors.white, 0.25)! : c;
  }

  /// A stable turn for an icon (the same icon, the same colour).
  static int turnOf(IconData? icon) => (icon?.codePoint ?? 0) % 6;

  /// An inset card: rounded, soft and borderless by day, a quiet line by
  /// night; in the glass look frosted over the page's wash.
  static BoxDecoration card(
    AppPalette p,
    SystemLook look, {
    double radius = 22,
  }) {
    if (look == SystemLook.glass) {
      return BoxDecoration(
        color: p.isDark
            ? const Color(0xFF24223F).withValues(alpha: 0.62)
            : Colors.white.withValues(alpha: 0.66),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: p.isDark
              ? Colors.white.withValues(alpha: 0.10)
              : Colors.white.withValues(alpha: 0.85),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: p.isDark ? 0.30 : 0.07),
            blurRadius: 26,
            offset: const Offset(0, 10),
          ),
        ],
      );
    }
    return BoxDecoration(
      color: p.surface,
      borderRadius: BorderRadius.circular(radius),
      border: p.isDark
          ? Border.all(color: p.border)
          : Border.all(color: const Color(0x0D0E0D24)),
      boxShadow: p.isDark
          ? null
          : const [
              BoxShadow(
                color: Color(0x0F0E0D24),
                blurRadius: 22,
                offset: Offset(0, 8),
              ),
            ],
    );
  }

  /// The page behind a system screen: its colour, or in the glass look a
  /// soft wash of the main and second colours.
  static BoxDecoration backdrop(AppPalette p, SystemLook look) {
    if (look != SystemLook.glass) return BoxDecoration(color: p.background);
    return BoxDecoration(
      color: p.background,
      gradient: LinearGradient(
        begin: AlignmentDirectional.topStart,
        end: AlignmentDirectional.bottomEnd,
        colors: [
          Color.alphaBlend(
            p.primary.withValues(alpha: p.isDark ? 0.30 : 0.16),
            p.background,
          ),
          p.background,
          Color.alphaBlend(
            p.accent.withValues(alpha: p.isDark ? 0.22 : 0.12),
            p.background,
          ),
        ],
        stops: const [0, 0.55, 1],
      ),
    );
  }

  /// The brand's gradient: the main colour deepened into the second.
  static LinearGradient brand(AppPalette p) => LinearGradient(
    begin: AlignmentDirectional.topStart,
    end: AlignmentDirectional.bottomEnd,
    colors: [
      Color.lerp(p.primary, Colors.black, 0.25)!,
      p.primary,
      Color.lerp(p.primary, p.accent, 0.45)!,
    ],
    stops: const [0, 0.6, 1],
  );
}

// ----------------------------------------------------------------- Buttons

/// 130.20 A round glass button: frosted in the page's colours, or white
/// glass over a photo or the brand; the bell with a dot while something is
/// unread.
class ChromeGlassButton extends StatelessWidget {
  const ChromeGlassButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
    this.onColour = false,
    this.dot = false,
    this.child,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;

  /// Over a photo or the brand's colour.
  final bool onColour;

  /// The dot of something unread.
  final bool dot;

  /// In place of the icon (the person's photo).
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final ink = onColour ? Colors.white : p.text;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: SizedBox(
        width: 40,
        height: 40,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            ClipOval(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                child: Material(
                  color: onColour
                      ? Colors.white.withValues(alpha: 0.20)
                      : p.isDark
                      ? const Color(0xFF24223F).withValues(alpha: 0.66)
                      : Colors.white.withValues(alpha: 0.78),
                  shape: CircleBorder(
                    side: BorderSide(
                      color: onColour
                          ? Colors.white.withValues(alpha: 0.34)
                          : p.isDark
                          ? Colors.white.withValues(alpha: 0.10)
                          : const Color(0x120E0D24),
                    ),
                  ),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: onPressed,
                    child: Center(
                      child: child ?? AppIcon(icon, size: 21, color: ink),
                    ),
                  ),
                ),
              ),
            ),
            if (dot)
              PositionedDirectional(
                top: 8,
                end: 9,
                child: Container(
                  key: const ValueKey('chrome-dot'),
                  width: 9,
                  height: 9,
                  decoration: BoxDecoration(
                    color: p.accent,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: onColour
                          ? Colors.black.withValues(alpha: 0.25)
                          : p.surface,
                      width: 2,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// 130.20 The round glass back button.
class ChromeBackButton extends StatelessWidget {
  const ChromeBackButton({super.key, this.onColour = false, this.onPressed});

  final bool onColour;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => ChromeGlassButton(
    key: const ValueKey('chrome-back'),
    icon: AppIcons.back,
    label: MaterialLocalizations.of(context).backButtonTooltip,
    onColour: onColour,
    onPressed: onPressed ?? () => Navigator.of(context).maybePop(),
  );
}

/// 130.21 An icon on a tile tinted in its colour.
class ChromeIconTile extends StatelessWidget {
  const ChromeIconTile({
    super.key,
    required this.icon,
    required this.color,
    this.size = 34,
  });

  final IconData icon;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: color.withValues(alpha: context.palette.isDark ? 0.22 : 0.13),
      borderRadius: BorderRadius.circular(size * 0.32),
    ),
    alignment: Alignment.center,
    child: AppIcon(icon, size: size * 0.56, color: color, filled: true),
  );
}

// ----------------------------------------------------------------- Header

/// 130.20 A premium header's look.
enum ChromeHeaderStyle { large, glass, photo, brand, search }

/// 130.20 How far a header is folded, from the scroll: 0 open, 1 folded;
/// with reduced motion it snaps, never in between.
double chromeFold(BuildContext context, double offset, double range) {
  final t = range <= 0 ? 0.0 : (offset / range).clamp(0.0, 1.0);
  if (MediaQuery.disableAnimationsOf(context)) return t < 0.5 ? 0 : 1;
  return t;
}

/// 130.20 The premium header: its background, the round glass buttons at
/// its ends, and its title large (folding into the compact bar as [fold]
/// goes to 1), over a photo, in the brand's colour with the mark in the
/// middle, frosted glass, or with a search pill that stays.
class ChromeHeaderBar extends StatelessWidget {
  const ChromeHeaderBar({
    super.key,
    required this.style,
    required this.title,
    required this.top,
    this.fold = 0,
    this.subtitle,
    this.leading = const [],
    this.trailing = const [],
    this.imageUrl,
    this.background,
    this.foreground,
    this.mark,
    this.search,
    this.collapses = true,
  });

  final ChromeHeaderStyle style;
  final String title;
  final String? subtitle;
  final double top;
  final double fold;
  final List<Widget> leading;
  final List<Widget> trailing;
  final String? imageUrl;

  /// The owner's colours; null, the look's own.
  final Color? background;
  final Color? foreground;

  /// The brand style's mark (the logo); null, the title.
  final Widget? mark;

  /// The search style's pill.
  final Widget? search;

  /// Large, photo and search fold on scroll.
  final bool collapses;

  static const bar = 56.0;

  /// Over a photo or the brand's colour: white words and white glass.
  static bool onColourOf(ChromeHeaderStyle style) =>
      style == ChromeHeaderStyle.photo || style == ChromeHeaderStyle.brand;

  /// How tall the header is, open.
  double openHeight() {
    final line = subtitle == null || subtitle!.isEmpty ? 0.0 : 22.0;
    return switch (style) {
      ChromeHeaderStyle.large => top + bar + 50 + line,
      ChromeHeaderStyle.search => top + bar + 44 + 60,
      ChromeHeaderStyle.photo => top + 196 + line,
      ChromeHeaderStyle.brand => top + bar + 12 + line,
      ChromeHeaderStyle.glass => top + bar,
    };
  }

  /// How tall the header is, folded.
  double foldedHeight() => switch (style) {
    ChromeHeaderStyle.search => top + bar + 60,
    ChromeHeaderStyle.large ||
    ChromeHeaderStyle.photo when collapses => top + bar,
    _ => openHeight(),
  };

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final onColour = onColourOf(style);
    final t = collapses ? fold : 0.0;
    final ink = foreground ?? (onColour ? Colors.white : p.text);
    final height = lerpDouble(openHeight(), foldedHeight(), t)!;
    final hasLine = subtitle != null && subtitle!.isNotEmpty;
    final Widget backdrop = switch (style) {
      ChromeHeaderStyle.photo => Stack(
        fit: StackFit.expand,
        children: [
          if (imageUrl != null)
            AppNetworkImage(url: imageUrl!, fit: BoxFit.cover)
          else
            DecoratedBox(
              decoration: BoxDecoration(gradient: ChromeTones.brand(p)),
            ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x61000000),
                  Color(0x0D000000),
                  Color(0x9E000000),
                ],
                stops: [0, 0.38, 1],
              ),
            ),
          ),
        ],
      ),
      ChromeHeaderStyle.brand => DecoratedBox(
        decoration: BoxDecoration(
          color: background,
          gradient: background == null
              ? LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color.lerp(p.primary, Colors.white, p.isDark ? 0 : 0.06)!,
                    Color.lerp(p.primary, Colors.black, 0.22)!,
                  ],
                )
              : null,
        ),
      ),
      ChromeHeaderStyle.glass => ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: (background ?? p.background).withValues(alpha: 0.72),
              border: Border(
                bottom: BorderSide(
                  color: p.isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : const Color(0x0F0E0D24),
                ),
              ),
            ),
          ),
        ),
      ),
      _ => ColoredBox(color: background ?? Colors.transparent),
    };
    final rounded =
        style == ChromeHeaderStyle.photo || style == ChromeHeaderStyle.brand;
    final compact = Text(
      title,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: ink),
    );
    final Widget middle = switch (style) {
      ChromeHeaderStyle.brand => Center(child: mark ?? compact),
      ChromeHeaderStyle.glass => compact,
      _ => Opacity(opacity: t, child: compact),
    };
    final large =
        style == ChromeHeaderStyle.large ||
        style == ChromeHeaderStyle.photo ||
        style == ChromeHeaderStyle.search;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: onColour || p.isDark
          ? SystemUiOverlayStyle.light
          : SystemUiOverlayStyle.dark,
      child: SizedBox(
        key: ValueKey('chrome-header-${style.name}'),
        height: height,
        child: ClipRRect(
          borderRadius: rounded
              ? const BorderRadius.vertical(bottom: Radius.circular(26))
              : BorderRadius.zero,
          child: Stack(
            children: [
              Positioned.fill(child: backdrop),
              PositionedDirectional(
                top: top,
                start: 12,
                end: 12,
                height: bar,
                child: Row(
                  children: [
                    for (final w in leading) ...[w, const SizedBox(width: 8)],
                    if (leading.isEmpty) const SizedBox(width: 8),
                    Expanded(
                      child: Semantics(header: !large, child: middle),
                    ),
                    for (final w in trailing) ...[const SizedBox(width: 8), w],
                  ],
                ),
              ),
              if (style == ChromeHeaderStyle.brand && hasLine)
                PositionedDirectional(
                  top: top + bar - 4,
                  start: 20,
                  end: 20,
                  child: Text(
                    subtitle!,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      color: ink.withValues(alpha: 0.82),
                    ),
                  ),
                ),
              if (large)
                PositionedDirectional(
                  start: 20,
                  end: 20,
                  bottom: style == ChromeHeaderStyle.search ? 70 : 14,
                  child: IgnorePointer(
                    child: Opacity(
                      opacity: 1 - t,
                      child: Semantics(
                        header: true,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (style == ChromeHeaderStyle.photo && hasLine)
                              Text(
                                subtitle!.toUpperCase(),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.4,
                                  color: Color.lerp(
                                    p.accent,
                                    Colors.white,
                                    0.35,
                                  ),
                                ),
                              ),
                            Text(
                              title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: style == ChromeHeaderStyle.search
                                    ? 27
                                    : 31,
                                height: 1.15,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.6,
                                color: ink,
                              ),
                            ),
                            if (style == ChromeHeaderStyle.large && hasLine)
                              Text(
                                subtitle!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: ink.withValues(alpha: 0.62),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              if (style == ChromeHeaderStyle.search && search != null)
                PositionedDirectional(
                  start: 16,
                  end: 16,
                  bottom: 8,
                  height: 48,
                  child: search!,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 130.20 The search style's pill: a round field that opens the search.
class ChromeSearchPill extends StatelessWidget {
  const ChromeSearchPill({super.key, required this.onTap});

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final label = context.l10n.headerSearch;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: Material(
        key: const ValueKey('chrome-search'),
        color: p.isDark ? const Color(0xFF24223F) : Colors.white,
        shape: StadiumBorder(
          side: BorderSide(
            color: p.isDark
                ? Colors.white.withValues(alpha: 0.08)
                : const Color(0x140E0D24),
          ),
        ),
        elevation: p.isDark ? 0 : 1.5,
        shadowColor: const Color(0x260E0D24),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                AppIcon(AppIcons.search, size: 21, color: p.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 15, color: p.textSecondary),
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

/// 130.20 A header that folds as what is under it scrolls: listens to the
/// scrolling below it and redraws only itself.
class ChromeFoldingHeader extends StatefulWidget {
  const ChromeFoldingHeader({
    super.key,
    required this.builder,
    required this.child,
    this.overlay = false,
    this.overlayHeight = 0,
  });

  /// The header for how far it is folded (0 open, 1 folded).
  final Widget Function(BuildContext context, double fold) builder;

  /// What scrolls under it.
  final Widget child;

  /// The glass bar lies over what scrolls ([child] starts under it).
  final bool overlay;
  final double overlayHeight;

  @override
  State<ChromeFoldingHeader> createState() => _ChromeFoldingHeaderState();
}

class _ChromeFoldingHeaderState extends State<ChromeFoldingHeader> {
  final _offset = ValueNotifier<double>(0);

  @override
  void dispose() {
    _offset.dispose();
    super.dispose();
  }

  bool _onScroll(ScrollNotification n) {
    if (n.metrics.axis == Axis.vertical && n.depth <= 2) {
      _offset.value = math.max(0, n.metrics.pixels);
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final header = ValueListenableBuilder<double>(
      valueListenable: _offset,
      builder: (context, offset, _) => widget.builder(context, offset),
    );
    final body = NotificationListener<ScrollNotification>(
      onNotification: _onScroll,
      child: widget.child,
    );
    if (widget.overlay) {
      return Stack(
        children: [
          Positioned.fill(child: body),
          PositionedDirectional(top: 0, start: 0, end: 0, child: header),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        header,
        Expanded(child: body),
      ],
    );
  }
}

// ----------------------------------------------------------------- States

/// 130.22 A shimmer in the brand's tones in place of a grey block: a soft
/// light sweeping across it (still with reduced motion).
class ChromeShimmer extends StatefulWidget {
  const ChromeShimmer({
    super.key,
    this.width,
    this.height = 14,
    this.radius = 6,
  });

  final double? width;
  final double height;
  final double radius;

  @override
  State<ChromeShimmer> createState() => _ChromeShimmerState();
}

class _ChromeShimmerState extends State<ChromeShimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller
        ..stop()
        ..value = 0.5;
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final base = Color.alphaBlend(
      p.primary.withValues(alpha: p.isDark ? 0.16 : 0.08),
      p.isDark ? p.surface : p.background,
    );
    final light = Color.alphaBlend(
      p.accent.withValues(alpha: p.isDark ? 0.22 : 0.14),
      base,
    );
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final x = (rtl ? 1 - _controller.value : _controller.value) * 3 - 1.5;
        return Container(
          key: const ValueKey('chrome-shimmer'),
          width: widget.width ?? double.infinity,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.radius + 2),
            gradient: LinearGradient(
              begin: Alignment(x - 1, 0),
              end: Alignment(x + 1, 0),
              colors: [base, light, base],
            ),
          ),
        );
      },
    );
  }
}

/// 130.22 The empty state's picture: the icon on a disc in the brand's
/// gradient with a soft glow and two rings around it.
class ChromeEmptyArt extends StatelessWidget {
  const ChromeEmptyArt({super.key, required this.icon, this.size = 104});

  final IconData icon;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return SizedBox(
      key: const ValueKey('chrome-empty'),
      width: size + 36,
      height: size + 36,
      child: Stack(
        alignment: Alignment.center,
        children: [
          for (final (inset, alpha) in [(0.0, 0.07), (14.0, 0.12)])
            Positioned.fill(
              child: Padding(
                padding: EdgeInsets.all(inset),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: p.primary.withValues(alpha: alpha),
                  ),
                ),
              ),
            ),
          Container(
            width: size * 0.72,
            height: size * 0.72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: ChromeTones.brand(p),
              boxShadow: [
                BoxShadow(
                  color: p.primary.withValues(alpha: 0.35),
                  blurRadius: 24,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            alignment: Alignment.center,
            child: AppIcon(
              icon,
              size: size * 0.32,
              color: Colors.white,
              filled: true,
            ),
          ),
          PositionedDirectional(
            top: size * 0.12,
            end: size * 0.16,
            child: Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                color: p.accent,
                shape: BoxShape.circle,
                border: Border.all(color: p.background, width: 3),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 130.21 A grouped list's heading, in the premium looks.
class ChromeGroupTitle extends StatelessWidget {
  const ChromeGroupTitle(this.title, {super.key});

  final String title;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsetsDirectional.fromSTEB(8, 0, 8, 8),
    child: Semantics(
      header: true,
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.8,
          color: context.palette.textSecondary,
        ),
      ),
    ),
  );
}
