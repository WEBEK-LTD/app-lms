import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show SystemUiOverlayStyle;

import '../api/api_exception.dart';
import '../api/models/models.dart';
import '../theme/app_icons.dart';
import '../theme/app_theme.dart';
import '../theme/palette.dart';
import 'buttons.dart';
import '../l10n/l10n.dart';

/// A network image with a soft tinted placeholder while loading or missing.
/// The picture fades in once it arrives.
class AppNetworkImage extends StatelessWidget {
  const AppNetworkImage({
    super.key,
    required this.url,
    this.seed = 0,
    this.radius = 0,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.semanticLabel,
    this.placeholderIcon,
    this.clearPlaceholder = false,
  });

  final String? url;
  final int seed;
  final double radius;
  final double? width;
  final double? height;
  final BoxFit fit;
  final String? semanticLabel;

  /// Drawn on the placeholder; a picture icon by default.
  final IconData? placeholderIcon;

  /// 99.3 The placeholder fades out once the picture shows, so a whole
  /// picture ([BoxFit.contain]) sits on what is behind it.
  final bool clearPlaceholder;

  @override
  Widget build(BuildContext context) {
    final placeholder = _ImagePlaceholder(
      width: width,
      height: height,
      seed: seed,
      icon: placeholderIcon ?? AppIcons.image,
    );
    final image = (url == null || url!.isEmpty)
        ? placeholder
        : Image.network(
            url!,
            width: width,
            height: height,
            fit: fit,
            semanticLabel: semanticLabel,
            excludeFromSemantics: semanticLabel == null,
            gaplessPlayback: true,
            // 17 In the app preview, pictures from sites that don't allow
            // other addresses to read them still show (as page images).
            webHtmlElementStrategy: WebHtmlElementStrategy.fallback,
            frameBuilder: (context, child, frame, sync) {
              if (sync) return child;
              return Stack(
                fit: StackFit.passthrough,
                children: [
                  if (clearPlaceholder)
                    AnimatedOpacity(
                      opacity: frame == null ? 1 : 0,
                      duration: const Duration(milliseconds: 220),
                      curve: Curves.easeOut,
                      child: placeholder,
                    )
                  else
                    placeholder,
                  AnimatedOpacity(
                    opacity: frame == null ? 0 : 1,
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOut,
                    child: child,
                  ),
                ],
              );
            },
            errorBuilder: (_, _, _) => placeholder,
          );
    if (radius == 0) return image;
    return ClipRRect(borderRadius: BorderRadius.circular(radius), child: image);
  }
}

/// A soft tint with a quiet icon, scaled to the space it fills.
class _ImagePlaceholder extends StatelessWidget {
  const _ImagePlaceholder({
    required this.width,
    required this.height,
    required this.seed,
    required this.icon,
  });

  final double? width;
  final double? height;
  final int seed;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final tint = p.placeholderFor(seed);
    return SizedBox(
      width: width,
      height: height,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: AlignmentDirectional.topStart,
            end: AlignmentDirectional.bottomEnd,
            colors: [Color.lerp(tint, p.surface, p.isDark ? 0.1 : 0.35)!, tint],
          ),
        ),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final side = constraints.biggest.shortestSide;
            if (!side.isFinite || side < 40) {
              // Fills a bounded space, like an empty Container.
              return const LimitedBox(
                maxWidth: 0,
                maxHeight: 0,
                child: SizedBox.expand(),
              );
            }
            return Center(
              child: AppIcon(
                icon,
                size: (side * 0.32).clamp(18.0, 44.0),
                color: p.textSecondary.withValues(alpha: 0.45),
              ),
            );
          },
        ),
      ),
    );
  }
}

/// 110 The letter a word of a name starts with, past an article: the
/// Arabic "ال" ("العميل" → "ع", not "ا", so "اسم العميل" isn't "اا") and
/// "al-" or "el-" ("al-Masri" → "M").
String nameInitial(String word) {
  final bare = word
      .replaceFirst(RegExp(r'^ال(?=\p{L}{2})', unicode: true), '')
      .replaceFirst(
        RegExp(r'^(?:al|el)-(?=\p{L})', caseSensitive: false, unicode: true),
        '',
      );
  return bare.isEmpty ? '' : bare.characters.first;
}

/// A round picture of a person, or their initials on a soft tint.
class InitialsAvatar extends StatelessWidget {
  const InitialsAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.size = 36,
  });

  final String name;
  final String? imageUrl;
  final double size;

  /// "Deniz Kaya" → "DK", "Ayşe" → "A", 110 "محمد العلي" → "مع".
  static String initialsOf(String name) {
    final words = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
    if (words.isEmpty) return '?';
    final first = nameInitial(words.first);
    final last = words.length > 1 ? nameInitial(words.last) : '';
    return (first + last).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return ClipOval(
        child: AppNetworkImage(
          url: imageUrl,
          seed: name.length,
          width: size,
          height: size,
        ),
      );
    }
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: p.placeholderFor(name.length),
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        initialsOf(name),
        maxLines: 1,
        style: TextStyle(
          fontSize: size * 0.38,
          fontWeight: FontWeight.w700,
          height: 1,
          color: p.text,
        ),
      ),
    );
  }
}

/// The widest a column of text and cards gets on a tablet.
const readableWidth = 720.0;

/// Page padding that keeps content [readableWidth] wide and centered on a
/// tablet, with the usual 20 point margins on a phone.
EdgeInsets readablePadding(
  BuildContext context, {
  double top = 0,
  double bottom = 0,
  double side = 20,
}) {
  final width = MediaQuery.sizeOf(context).width;
  final x = width > readableWidth + side * 2
      ? (width - readableWidth) / 2
      : side;
  return EdgeInsets.fromLTRB(x, top, x, bottom);
}

/// A soft shade over the top of a full-bleed picture, so the status bar
/// and the buttons on it read on any image (light status bar icons). Put it
/// in the picture's [Stack].
class HeroScrim extends StatelessWidget {
  const HeroScrim({super.key});

  @override
  Widget build(BuildContext context) => Positioned(
    top: 0,
    left: 0,
    right: 0,
    height: MediaQuery.paddingOf(context).top + 72,
    child: IgnorePointer(
      child: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light.copyWith(
          statusBarColor: Colors.transparent,
        ),
        child: const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0x590E0D24), Color(0x000E0D24)],
            ),
          ),
        ),
      ),
    ),
  );
}

/// 110 A page that runs up to the top of the screen, with a band of [color]
/// (the page's background, or its header's) behind the status bar, so the
/// clock and battery never sit on text or pictures scrolling under them.
class StatusBarBackdrop extends StatelessWidget {
  const StatusBarBackdrop({
    super.key,
    required this.color,
    required this.child,
  });

  final Color color;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    if (top <= 0) return child;
    return Stack(
      children: [
        Positioned.fill(child: child),
        Positioned(
          key: const ValueKey('status-bar-backdrop'),
          top: 0,
          left: 0,
          right: 0,
          height: top,
          child: IgnorePointer(
            child: AnnotatedRegion<SystemUiOverlayStyle>(
              value: overlayStyleOn(color),
              child: ColoredBox(color: color),
            ),
          ),
        ),
      ],
    );
  }
}

/// 110 Text at the bottom of a picture: a shade that fades in from clear
/// above the text to dark under it, so the picture has no hard edge and the
/// text reads on any image. Put it at the bottom of the picture's [Stack].
class TextScrim extends StatelessWidget {
  const TextScrim({
    super.key,
    required this.padding,
    required this.child,
    this.fade = defaultFade,
  });

  /// Around the text; the fade is added above it.
  final EdgeInsets padding;
  final Widget child;

  /// How far above the text the shade starts.
  final double fade;
  static const defaultFade = 40.0;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    key: const ValueKey('text-scrim'),
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0x000E0D24), Color(0xA60E0D24), Color(0xCC0E0D24)],
        stops: [0, 0.4, 1],
      ),
    ),
    child: Padding(
      padding: padding.copyWith(top: padding.top + fade),
      child: child,
    ),
  );
}

/// A rounded progress track with an Ember fill.
class ProgressTrack extends StatelessWidget {
  const ProgressTrack({
    super.key,
    required this.percent,
    this.height = 6,
    this.track,
    this.fill,
    this.rounded = true,
  });

  final num percent;
  final double height;
  final Color? track;
  final Color? fill;
  final bool rounded;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final value = (percent / 100).clamp(0.0, 1.0).toDouble();
    final radius = BorderRadius.circular(rounded ? height / 2 : 0);
    return Semantics(
      label: context.l10n.progress,
      value: '${(value * 100).round()}%',
      child: ClipRRect(
        borderRadius: radius,
        child: SizedBox(
          height: height,
          child: Stack(
            fit: StackFit.expand,
            children: [
              ColoredBox(color: track ?? p.segment),
              FractionallySizedBox(
                alignment: AlignmentDirectional.centerStart,
                widthFactor: value,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: fill ?? p.accent,
                    borderRadius: radius,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// "Free" in green, otherwise the price in the text color.
class PriceLabel extends StatelessWidget {
  const PriceLabel(this.price, {super.key, this.size = 15});

  final Price price;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final label = price.label;
    if (label.isEmpty) return const SizedBox.shrink();
    return Text(
      label,
      style: TextStyle(
        fontSize: size,
        fontWeight: FontWeight.w700,
        color: price.isFree ? p.success : p.text,
      ),
    );
  }
}

/// A heading with an optional "See all" link.
class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    this.onSeeAll,
    this.size = 18,
    this.weight = FontWeight.w700,
  });

  final String title;
  final VoidCallback? onSeeAll;
  final double size;
  final FontWeight weight;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      children: [
        Expanded(
          child: Semantics(
            header: true,
            child: Text(
              title,
              style: TextStyle(
                fontSize: size,
                fontWeight: weight,
                color: p.text,
              ),
            ),
          ),
        ),
        if (onSeeAll != null)
          TextButton(
            onPressed: onSeeAll,
            style: TextButton.styleFrom(
              foregroundColor: p.link,
              padding: const EdgeInsets.symmetric(horizontal: 8),
            ),
            child: Text(context.l10n.seeAll),
          ),
      ],
    );
  }
}

class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.label});

  /// Read by screen readers; "Loading" by default.
  final String? label;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: CircularProgressIndicator(
        semanticsLabel: label ?? context.l10n.loading,
      ),
    ),
  );
}

/// How a [SkeletonList] draws its rows while content loads.
enum SkeletonLayout {
  /// Cards with a square picture and two lines (courses, services, orders).
  rows,

  /// Two columns of square pictures with text (products).
  grid,

  /// Wide pictures with text under them (listings).
  media,

  /// Rows with a small icon and text (notifications, messages, results).
  text,
}

/// Grey shapes in the layout of the content that is loading, gently
/// pulsing. Screen readers hear "Loading" (or [label]).
class SkeletonList extends StatelessWidget {
  const SkeletonList({
    super.key,
    this.layout = SkeletonLayout.rows,
    this.count = 6,
    this.padding = const EdgeInsets.fromLTRB(20, 8, 20, 20),
    this.label,
  });

  final SkeletonLayout layout;
  final int count;
  final EdgeInsetsGeometry padding;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final Widget content = switch (layout) {
      SkeletonLayout.grid => LayoutBuilder(
        builder: (context, constraints) {
          final columns = constraints.maxWidth >= 600 ? 3 : 2;
          const gap = 12.0;
          final cell = (constraints.maxWidth - gap * (columns - 1)) / columns;
          return Wrap(
            spacing: gap,
            runSpacing: gap,
            children: [
              for (var i = 0; i < count; i++)
                SizedBox(width: cell, child: const _SkeletonProduct()),
            ],
          );
        },
      ),
      _ => Column(
        children: [
          for (var i = 0; i < count; i++) ...[
            if (i > 0) const SizedBox(height: 12),
            switch (layout) {
              SkeletonLayout.media => const _SkeletonMedia(),
              SkeletonLayout.text => _SkeletonText(seed: i),
              _ => _SkeletonRow(seed: i),
            },
          ],
        ],
      ),
    };
    return Semantics(
      label: label ?? context.l10n.loading,
      liveRegion: true,
      child: ExcludeSemantics(
        child: SingleChildScrollView(
          physics: const NeverScrollableScrollPhysics(),
          padding: padding,
          child: SkeletonPulse(child: content),
        ),
      ),
    );
  }
}

/// A screen-sized placeholder for a page with a big picture on top
/// (course, product, service, listing).
class SkeletonDetail extends StatelessWidget {
  const SkeletonDetail({super.key, this.label, this.imageHeight = 240});

  final String? label;
  final double imageHeight;

  @override
  Widget build(BuildContext context) => Semantics(
    label: label ?? context.l10n.loading,
    liveRegion: true,
    child: ExcludeSemantics(
      child: SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        child: SkeletonPulse(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonBox(
                height: imageHeight + MediaQuery.paddingOf(context).top,
                radius: 0,
              ),
              const Padding(
                padding: EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonBox(width: 240, height: 24),
                    SizedBox(height: 12),
                    SkeletonBox(width: 140, height: 16),
                    SizedBox(height: 24),
                    SkeletonBox(height: 14),
                    SizedBox(height: 10),
                    SkeletonBox(height: 14),
                    SizedBox(height: 10),
                    SkeletonBox(width: 200, height: 14),
                    SizedBox(height: 28),
                    SkeletonBox(height: 52, radius: 14),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

/// The shape of a Home screen while its sections load: a greeting, the
/// search field, a banner, a row of chips and two cards.
class SkeletonHome extends StatelessWidget {
  const SkeletonHome({super.key, this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    final radius = context.shapes.r(16);
    return Semantics(
      label: label ?? context.l10n.loading,
      liveRegion: true,
      child: ExcludeSemantics(
        child: SingleChildScrollView(
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.fromLTRB(
            20,
            MediaQuery.paddingOf(context).top + 24,
            20,
            20,
          ),
          child: SkeletonPulse(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SkeletonBox(width: 110, height: 12),
                          SizedBox(height: 10),
                          SkeletonBox(width: 160, height: 22),
                        ],
                      ),
                    ),
                    SkeletonBox(width: 44, height: 44, radius: 12),
                  ],
                ),
                const SizedBox(height: 24),
                SkeletonBox(height: 50, radius: context.shapes.r(14)),
                const SizedBox(height: 24),
                AspectRatio(
                  aspectRatio: 16 / 7,
                  child: SkeletonBox(radius: radius),
                ),
                const SizedBox(height: 24),
                const SkeletonBox(width: 120, height: 18),
                const SizedBox(height: 14),
                const Row(
                  children: [
                    SkeletonBox(width: 56, height: 40, radius: 20),
                    SizedBox(width: 8),
                    SkeletonBox(width: 84, height: 40, radius: 20),
                    SizedBox(width: 8),
                    SkeletonBox(width: 76, height: 40, radius: 20),
                  ],
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: AspectRatio(
                        aspectRatio: 0.8,
                        child: SkeletonBox(radius: radius),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: AspectRatio(
                        aspectRatio: 0.8,
                        child: SkeletonBox(radius: radius),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Fades its [child] in and out slowly while content loads (still when the
/// system asks for less motion).
class SkeletonPulse extends StatefulWidget {
  const SkeletonPulse({super.key, required this.child});

  final Widget child;

  @override
  State<SkeletonPulse> createState() => _SkeletonPulseState();
}

class _SkeletonPulseState extends State<SkeletonPulse>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
    lowerBound: 0.55,
    value: 1,
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller
        ..stop()
        ..value = 1;
    } else if (!_controller.isAnimating) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      FadeTransition(opacity: _controller, child: widget.child);
}

/// One grey shape of a skeleton.
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({super.key, this.width, this.height = 14, this.radius = 6});

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) => Container(
    width: width ?? double.infinity,
    height: height,
    decoration: BoxDecoration(
      color: context.palette.segment,
      borderRadius: BorderRadius.circular(radius),
    ),
  );
}

class _SkeletonCard extends StatelessWidget {
  const _SkeletonCard({required this.child, this.padding = 12});

  final Widget child;
  final double padding;

  @override
  Widget build(BuildContext context) => Container(
    padding: EdgeInsets.all(padding),
    clipBehavior: Clip.antiAlias,
    decoration: ShapeDecoration(
      color: context.palette.surface,
      shape: context.cardShape(16, outlined: true),
    ),
    child: child,
  );
}

class _SkeletonRow extends StatelessWidget {
  const _SkeletonRow({required this.seed});

  final int seed;

  @override
  Widget build(BuildContext context) => _SkeletonCard(
    child: Row(
      children: [
        SkeletonBox(width: 72, height: 72, radius: context.shapes.r(12)),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FractionallySizedBox(
                widthFactor: seed.isEven ? 0.85 : 0.7,
                child: const SkeletonBox(height: 15),
              ),
              const SizedBox(height: 10),
              const FractionallySizedBox(
                widthFactor: 0.5,
                child: SkeletonBox(height: 12),
              ),
              const SizedBox(height: 12),
              const SkeletonBox(width: 64, height: 14),
            ],
          ),
        ),
      ],
    ),
  );
}

class _SkeletonText extends StatelessWidget {
  const _SkeletonText({required this.seed});

  final int seed;

  @override
  Widget build(BuildContext context) => _SkeletonCard(
    padding: 16,
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SkeletonBox(width: 40, height: 40, radius: 12),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FractionallySizedBox(
                widthFactor: seed.isEven ? 0.8 : 0.6,
                child: const SkeletonBox(height: 15),
              ),
              const SizedBox(height: 10),
              const SkeletonBox(height: 12),
              const SizedBox(height: 8),
              const FractionallySizedBox(
                widthFactor: 0.4,
                child: SkeletonBox(height: 12),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _SkeletonProduct extends StatelessWidget {
  const _SkeletonProduct();

  @override
  Widget build(BuildContext context) => const _SkeletonCard(
    padding: 0,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AspectRatio(aspectRatio: 1, child: SkeletonBox(radius: 0)),
        Padding(
          padding: EdgeInsets.fromLTRB(10, 12, 10, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonBox(height: 14),
              SizedBox(height: 8),
              SkeletonBox(width: 70, height: 14),
            ],
          ),
        ),
      ],
    ),
  );
}

class _SkeletonMedia extends StatelessWidget {
  const _SkeletonMedia();

  @override
  Widget build(BuildContext context) => const _SkeletonCard(
    padding: 0,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AspectRatio(aspectRatio: 16 / 9, child: SkeletonBox(radius: 0)),
        Padding(
          padding: EdgeInsets.fromLTRB(14, 14, 14, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonBox(width: 150, height: 18),
              SizedBox(height: 10),
              SkeletonBox(height: 14),
              SizedBox(height: 8),
              SkeletonBox(width: 120, height: 12),
            ],
          ),
        ),
      ],
    ),
  );
}

/// A centered message with an icon and an optional action.
class MessageView extends StatelessWidget {
  const MessageView({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.actionLabel,
    this.onAction,
    this.compact = false,
  });

  final IconData icon;
  final String title;
  final String? message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    // 110 Tighter on a small phone, so the button isn't under the tab bar.
    final tight = compact || MediaQuery.sizeOf(context).height < 700;
    return Center(
      child: SingleChildScrollView(
        padding: EdgeInsets.all(tight ? 16 : 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: p.accentSoft,
                borderRadius: BorderRadius.circular(18),
              ),
              alignment: Alignment.center,
              child: AppIcon(icon, size: 30, color: p.text),
            ),
            const SizedBox(height: 18),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
            if (message != null) ...[
              const SizedBox(height: 8),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  height: 1.6,
                  color: p.textSecondary,
                ),
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              SizedBox(height: tight ? 16 : 22),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 320),
                child: PrimaryButton(label: actionLabel!, onPressed: onAction),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// The standard error view with a retry button.
class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry});

  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final e = unwrapError(error);
    final offline = e is ApiException && e.isOffline;
    return MessageView(
      icon: offline ? AppIcons.offline : AppIcons.error,
      title: offline ? context.l10n.offlineTitle : context.l10n.errorTitle,
      message: friendlyError(error),
      actionLabel: onRetry == null ? null : context.l10n.tryAgain,
      onAction: onRetry,
    );
  }
}

/// A white rounded card with the design's border.
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = EdgeInsets.zero,
    this.onTap,
    this.color,
    this.radius,
    this.semanticLabel,
  });

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final Color? color;
  final double? radius;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final r = radius ?? 16;
    final content = Padding(padding: padding, child: child);
    final card = Material(
      color: color ?? p.surface,
      shape: context.cardShape(r, outlined: true),
      elevation: context.cardElevation,
      clipBehavior: Clip.antiAlias,
      child: onTap == null ? content : InkWell(onTap: onTap, child: content),
    );
    if (semanticLabel == null) return card;
    return Semantics(button: onTap != null, label: semanticLabel, child: card);
  }
}

/// A grouped list ("Learning", "Account & app") as in the Profile design.
class SettingsGroup extends StatelessWidget {
  const SettingsGroup({super.key, required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
          child: Semantics(
            header: true,
            child: Text(
              title,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: p.textSecondary,
              ),
            ),
          ),
        ),
        AppCard(
          child: Column(
            children: [
              for (var i = 0; i < children.length; i++) ...[
                if (i > 0) Divider(height: 1, thickness: 1, color: p.divider),
                children[i],
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// One row of a [SettingsGroup].
class SettingsTile extends StatelessWidget {
  const SettingsTile({
    super.key,
    required this.title,
    this.icon,
    this.value,
    this.onTap,
    this.trailing,
    this.destructive = false,
    this.chevron = true,
    this.subtitle,
  });

  final String title;

  /// A second line under the title (for example "Last used 12 Oct 2026").
  final String? subtitle;
  final IconData? icon;
  final String? value;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool destructive;
  final bool chevron;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final color = destructive ? p.danger : p.text;
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 54),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          // The value takes what it needs, up to 45% of the row; the title
          // gets the rest.
          child: LayoutBuilder(
            builder: (context, constraints) => Row(
              children: [
                if (icon != null) ...[
                  AppIcon(icon!, color: color),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 15,
                          color: color,
                          fontWeight: destructive
                              ? FontWeight.w600
                              : FontWeight.w400,
                        ),
                      ),
                      if (subtitle != null)
                        Text(
                          subtitle!,
                          style: TextStyle(
                            fontSize: 13,
                            color: p.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ),
                if (value != null)
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxWidth: constraints.maxWidth * 0.45,
                    ),
                    child: Padding(
                      padding: const EdgeInsetsDirectional.only(start: 8),
                      child: Text(
                        value!,
                        textAlign: TextAlign.end,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 14, color: p.textSecondary),
                      ),
                    ),
                  ),
                ?trailing,
                if (trailing == null &&
                    chevron &&
                    onTap != null &&
                    !destructive)
                  Padding(
                    padding: const EdgeInsetsDirectional.only(start: 4),
                    child: AppIcon(
                      AppIcons.forward,
                      size: 18,
                      color: p.textTertiary,
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

/// Shows a short message at the bottom of the screen.
void showMessage(BuildContext context, String message) {
  final messenger = ScaffoldMessenger.maybeOf(context);
  messenger
    ?..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

/// Asks the student to confirm an action. Returns true when confirmed.
Future<bool> confirmAction(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  bool destructive = false,
}) async {
  final p = context.palette;
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          style: TextButton.styleFrom(foregroundColor: p.text),
          child: Text(context.l10n.cancel),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(true),
          style: TextButton.styleFrom(
            foregroundColor: destructive ? p.danger : p.link,
          ),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return result ?? false;
}

/// "1 h 20 min", "45 min".
String formatMinutes(int minutes) {
  final l10n = currentL10n;
  if (minutes < 60) return l10n.durationMinutes(minutes);
  final h = minutes ~/ 60;
  final m = minutes % 60;
  return m == 0 ? l10n.durationHours(h) : l10n.durationHoursMinutes(h, m);
}

/// "04:12", "1:02:03".
String formatClock(Duration d) {
  final total = d.inSeconds < 0 ? 0 : d.inSeconds;
  final h = total ~/ 3600;
  final m = (total % 3600) ~/ 60;
  final s = total % 60;
  String two(int v) => v.toString().padLeft(2, '0');
  return h > 0 ? '$h:${two(m)}:${two(s)}' : '${two(m)}:${two(s)}';
}

/// Course thumbnails tint by course id so lists don't look uniform.
int seedFor(CourseSummary course) => course.id;
