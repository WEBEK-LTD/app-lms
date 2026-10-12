import 'package:flutter/material.dart';

import '../api/api_exception.dart';
import '../api/models/models.dart';
import '../theme/app_icons.dart';
import '../theme/palette.dart';
import 'buttons.dart';

/// A network image with a soft tinted placeholder while loading or missing.
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
  });

  final String? url;
  final int seed;
  final double radius;
  final double? width;
  final double? height;
  final BoxFit fit;
  final String? semanticLabel;
  final IconData? placeholderIcon;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final placeholder = Container(
      width: width,
      height: height,
      color: p.placeholderFor(seed),
      alignment: Alignment.center,
      child: placeholderIcon == null
          ? null
          : AppIcon(placeholderIcon!, size: 28, color: p.textSecondary),
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
            frameBuilder: (context, child, frame, sync) =>
                frame == null && !sync ? placeholder : child,
            errorBuilder: (_, _, _) => placeholder,
          );
    if (radius == 0) return image;
    return ClipRRect(borderRadius: BorderRadius.circular(radius), child: image);
  }
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
      label: 'Progress',
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
                alignment: Alignment.centerLeft,
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
            child: const Text('See all'),
          ),
      ],
    );
  }
}

class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.label = 'Loading'});

  final String label;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: CircularProgressIndicator(semanticsLabel: label),
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
    return Center(
      child: SingleChildScrollView(
        padding: EdgeInsets.all(compact ? 16 : 32),
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
              const SizedBox(height: 22),
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
      title: offline ? "You're offline" : 'Something went wrong',
      message: friendlyError(error),
      actionLabel: onRetry == null ? null : 'Try again',
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
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(r),
        side: BorderSide(color: p.border),
      ),
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
  });

  final String title;
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
          child: Row(
            children: [
              if (icon != null) ...[
                AppIcon(icon!, color: color),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    color: color,
                    fontWeight: destructive ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ),
              if (value != null)
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Text(
                    value!,
                    style: TextStyle(fontSize: 14, color: p.textSecondary),
                  ),
                ),
              ?trailing,
              if (trailing == null && chevron && onTap != null && !destructive)
                Padding(
                  padding: const EdgeInsets.only(left: 4),
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
          child: const Text('Cancel'),
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

/// "12 lessons", "1 lesson".
String plural(int count, String singular, [String? pluralForm]) =>
    '$count ${count == 1 ? singular : (pluralForm ?? '${singular}s')}';

/// "1 h 20 min", "45 min".
String formatMinutes(int minutes) {
  if (minutes < 60) return '$minutes min';
  final h = minutes ~/ 60;
  final m = minutes % 60;
  return m == 0 ? '$h h' : '$h h $m min';
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
