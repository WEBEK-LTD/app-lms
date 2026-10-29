import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../../../core/api/models/models.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/gate/switches.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/own_icon.dart';
import 'page_actions.dart';
import 'page_blocks.dart';

/// 33 The blocks whose content the owner writes in the dashboard: slider,
/// quick links, testimonials, questions, countdown, contact, opening hours,
/// social links, team, numbers and notice; 99.4 cards, gallery, map and
/// divider (the form is in form_block.dart). Each is drawn in the current
/// template (PageStyle) and works right to left.

/// The time the countdown and opening hours read: the phone's clock,
/// replaced in tests.
final pageClockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

// ----------------------------------------------------------------- Slider

class SliderView extends ConsumerStatefulWidget {
  const SliderView({super.key, required this.block, required this.style});

  final SliderBlock block;
  final PageStyle style;

  @override
  ConsumerState<SliderView> createState() => _SliderViewState();
}

class _SliderViewState extends ConsumerState<SliderView> {
  final _controller = PageController();
  Timer? _timer;
  var _stopped = false;
  var _index = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Moves on its own unless the phone asks for less motion.
    final still = MediaQuery.disableAnimationsOf(context);
    if (_timer == null &&
        !_stopped &&
        !still &&
        widget.block.autoAdvance &&
        widget.block.slides.length > 1) {
      _timer = Timer.periodic(const Duration(seconds: 5), (_) => _next());
    }
  }

  void _next() {
    if (!_controller.hasClients) return;
    final next = (_index + 1) % widget.block.slides.length;
    _controller.animateToPage(
      next,
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeOutCubic,
    );
  }

  /// The user took over: the slider stops moving on its own.
  void _stop() {
    _timer?.cancel();
    _stopped = true;
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final slides = widget.block.slides;
    final radius = blockRadius(context, widget.style.bannerRadius);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Listener(
          onPointerDown: (_) => _stop(),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(radius),
            child: AspectRatio(
              aspectRatio: widget.style.template == AppTemplate.bold
                  ? 16 / 10
                  : 16 / 9,
              child: PageView.builder(
                controller: _controller,
                itemCount: slides.length,
                onPageChanged: (i) => setState(() => _index = i),
                itemBuilder: (context, i) => _SlideView(
                  slide: slides[i],
                  seed: widget.block.id.hashCode + i,
                  style: widget.style,
                  label: context.l10n.slideOf(i + 1, slides.length),
                ),
              ),
            ),
          ),
        ),
        if (slides.length > 1) ...[
          const SizedBox(height: 10),
          ExcludeSemantics(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < slides.length; i++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: i == _index ? 18 : 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: i == _index ? p.accent : p.border,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _SlideView extends ConsumerWidget {
  const _SlideView({
    required this.slide,
    required this.seed,
    required this.style,
    required this.label,
  });

  final Slide slide;
  final int seed;
  final PageStyle style;
  final String label;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final heading = slide.heading?.trim() ?? '';
    final subheading = slide.subheading?.trim() ?? '';
    final image = slide.imageUrl;
    final action = slide.action;
    final bold = style.template == AppTemplate.bold;
    final align = blockAlign(context);
    final fit = blockImageFit(context);
    final text = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: align.crossAxis,
      children: [
        if (heading.isNotEmpty)
          Text(
            heading,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: align.textAlign,
            style: TextStyle(
              color: image == null ? p.onPrimary : Colors.white,
              fontSize: bold ? 24 : 21,
              height: 1.15,
              fontWeight: FontWeight.w800,
            ),
          ),
        if (subheading.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            subheading,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: align.textAlign,
            style: TextStyle(
              color: (image == null ? p.onPrimary : Colors.white).withValues(
                alpha: 0.9,
              ),
              fontSize: 14,
            ),
          ),
        ],
      ],
    );
    return Semantics(
      button: action != null,
      label: [label, heading, subheading].where((t) => t.isNotEmpty).join(', '),
      excludeSemantics: true,
      child: Material(
        // 99.3 A whole picture sits on the page's background.
        color: image != null && fit == BoxFit.contain
            ? Colors.transparent
            : p.placeholderFor(seed),
        child: InkWell(
          onTap: action == null
              ? null
              : () => runPageAction(context, ref, action),
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (image != null)
                AppNetworkImage(
                  url: image,
                  seed: seed,
                  fit: fit,
                  clearPlaceholder: fit == BoxFit.contain,
                )
              else
                // Without an image: the app's main color, a soft circle
                // and a dot of its secondary color in a corner.
                ColoredBox(
                  color: p.primary,
                  child: Stack(
                    children: [
                      PositionedDirectional(
                        top: -70,
                        end: -50,
                        child: _Circle(
                          size: 220,
                          color: p.onPrimary,
                          alpha: 0.08,
                        ),
                      ),
                      PositionedDirectional(
                        top: 24,
                        end: 24,
                        child: _Circle(size: 44, color: p.accent, alpha: 1),
                      ),
                    ],
                  ),
                ),
              if (heading.isNotEmpty || subheading.isNotEmpty)
                Align(
                  alignment: AlignmentDirectional.bottomStart,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(20, 14, 20, 18),
                    // A flat scrim keeps the text readable on any image.
                    color: image == null ? null : const Color(0xA60E0D24),
                    child: text,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Circle extends StatelessWidget {
  const _Circle({required this.size, required this.color, required this.alpha});

  final double size;
  final Color color;
  final double alpha;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: color.withValues(alpha: alpha),
      shape: BoxShape.circle,
    ),
  );
}

// ------------------------------------------------------------ Quick links

class QuickLinksView extends ConsumerWidget {
  const QuickLinksView({super.key, required this.block, required this.style});

  final QuickLinksBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scale = MediaQuery.textScalerOf(context);
    // 38 Only tiles that open something here.
    final links = [
      for (final link in block.links)
        if (canOpenAction(ref, link.action)) link,
    ];
    if (links.isEmpty) return const SizedBox.shrink();
    final ownIcons = switchOn(ref, 'own_icons');
    Widget tile(QuickLink link, double width) => SizedBox(
      width: width,
      child: _QuickLinkTile(
        link: link,
        ownIcon: ownIcons,
        style: style,
        onTap: () => runPageAction(context, ref, link.action),
      ),
    );
    if (block.style == QuickLinksStyle.row) {
      return SizedBox(
        height: 60 + 8 + scale.scale(36),
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: links.length,
          separatorBuilder: (_, _) => const SizedBox(width: 8),
          itemBuilder: (context, i) => tile(links[i], 76),
        ),
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 8.0;
        final columns = constraints.maxWidth >= 560 ? 6 : 4;
        final width =
            (constraints.maxWidth - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: 14,
          children: [for (final link in links) tile(link, width)],
        );
      },
    );
  }
}

class _QuickLinkTile extends StatelessWidget {
  const _QuickLinkTile({
    required this.link,
    required this.style,
    required this.onTap,
    this.ownIcon = true,
  });

  final QuickLink link;

  /// 83.3 The owner's own icon, unless the team switched them off.
  final bool ownIcon;
  final PageStyle style;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final bold = style.template == AppTemplate.bold;
    final minimal = style.template == AppTemplate.minimal;
    final radius = context.shapes.r(bold ? 20 : 16);
    return Semantics(
      button: true,
      label: link.label,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: bold ? p.primary : (minimal ? p.surface : p.accentSoft),
                borderRadius: BorderRadius.circular(radius),
                border: minimal ? Border.all(color: p.border) : null,
              ),
              alignment: Alignment.center,
              child: OwnIcon(
                symbolByName(link.icon),
                url: ownIcon ? link.iconUrl : null,
                size: 26,
                color: bold ? p.onPrimary : (minimal ? p.text : p.link),
              ),
            ),
            const SizedBox(height: 8),
            LayoutBuilder(
              builder: (context, box) {
                final style = DefaultTextStyle.of(context).style.merge(
                  TextStyle(
                    fontSize: 12.5,
                    height: 1.25,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                );
                return Text(
                  link.label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: style.copyWith(
                    fontSize: fitWordsFontSize(
                      link.label,
                      style,
                      box.maxWidth,
                      MediaQuery.textScalerOf(context),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// 38 The font size, at most [style]'s, at which the longest word of [text]
/// fits [width]: a narrow tile otherwise breaks it ("Membershi" / "p").
double fitWordsFontSize(
  String text,
  TextStyle style,
  double width,
  TextScaler scaler,
) {
  final size = style.fontSize ?? 14;
  if (!width.isFinite || width <= 0) return size;
  var widest = 0.0;
  for (final word in text.split(RegExp(r'\s+'))) {
    if (word.isEmpty) continue;
    final painter = TextPainter(
      text: TextSpan(text: word, style: style),
      textDirection: TextDirection.ltr,
      textScaler: scaler,
      maxLines: 1,
    )..layout();
    if (painter.width > widest) widest = painter.width;
    painter.dispose();
  }
  if (widest <= width) return size;
  return (size * width / widest * 0.97).clamp(9.0, size);
}

// ----------------------------------------------------------- Testimonials

class TestimonialsView extends StatelessWidget {
  const TestimonialsView({super.key, required this.block, required this.style});

  final TestimonialsBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final minimal = style.template == AppTemplate.minimal;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, quote) in block.quotes.indexed) ...[
          if (i > 0) SizedBox(height: minimal ? 0 : 12),
          if (minimal)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                border: i < block.quotes.length - 1
                    ? Border(bottom: BorderSide(color: p.divider))
                    : null,
              ),
              child: _Quote(quote: quote, seed: i),
            )
          else
            AppCard(
              padding: const EdgeInsets.all(16),
              child: _Quote(quote: quote, seed: i),
            ),
        ],
      ],
    );
  }
}

class _Quote extends StatelessWidget {
  const _Quote({required this.quote, required this.seed});

  final Testimonial quote;
  final int seed;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final rating = quote.rating;
    final role = quote.role?.trim() ?? '';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            AppIcon(AppIcons.quote, size: 28, color: p.accent, filled: true),
            const Spacer(),
            if (rating != null)
              Semantics(
                label: context.l10n.ratingOutOfFive(rating),
                excludeSemantics: true,
                child: Row(
                  children: [
                    for (var s = 0; s < 5; s++)
                      AppIcon(
                        AppIcons.star,
                        size: 18,
                        color: s < rating ? p.star : p.border,
                        filled: true,
                      ),
                  ],
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          quote.text,
          style: TextStyle(fontSize: 15, height: 1.45, color: p.textBody),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _Avatar(name: quote.name, photoUrl: quote.photoUrl, size: 40),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    quote.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  if (role.isNotEmpty)
                    Text(
                      role,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// A round photo, or the person's initials on a soft color.
class _Avatar extends StatelessWidget {
  const _Avatar({required this.name, required this.photoUrl, this.size = 56});

  final String name;
  final String? photoUrl;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final initials = name
        .split(RegExp(r'\s+'))
        .where(
          (w) => w.isNotEmpty && RegExp(r'\p{L}', unicode: true).hasMatch(w),
        )
        .take(2)
        // 110 Past an article ("اسم العميل" → "اع", not "اا").
        .map((w) => nameInitial(w).toUpperCase())
        .join();
    return ExcludeSemantics(
      child: SizedBox(
        width: size,
        height: size,
        child: ClipOval(
          child: photoUrl != null
              ? AppNetworkImage(url: photoUrl, seed: name.hashCode)
              : ColoredBox(
                  color: p.accentSoft,
                  child: Center(
                    child: Text(
                      initials.isEmpty ? '?' : initials,
                      style: TextStyle(
                        fontSize: size * 0.36,
                        fontWeight: FontWeight.w800,
                        color: p.link,
                      ),
                    ),
                  ),
                ),
        ),
      ),
    );
  }
}

// -------------------------------------------------------------------- FAQ

class FaqView extends StatelessWidget {
  const FaqView({super.key, required this.block, required this.style});

  final FaqBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final carded = style.template != AppTemplate.minimal;
    final tiles = [
      for (final q in block.questions)
        Theme(
          // No lines above and below an open answer: the card or divider frames it.
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            tilePadding: EdgeInsets.symmetric(horizontal: carded ? 16 : 0),
            childrenPadding: EdgeInsets.fromLTRB(
              carded ? 16 : 0,
              0,
              carded ? 16 : 0,
              16,
            ),
            expandedCrossAxisAlignment: CrossAxisAlignment.start,
            iconColor: p.text,
            collapsedIconColor: p.textSecondary,
            title: Text(
              q.question,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
            children: [
              Text(
                q.answer,
                style: TextStyle(fontSize: 15, height: 1.45, color: p.textBody),
              ),
            ],
          ),
        ),
    ];
    if (carded) {
      return AppCard(
        child: Column(
          children: [
            for (final (i, tile) in tiles.indexed) ...[
              if (i > 0) Divider(height: 1, color: p.divider),
              tile,
            ],
          ],
        ),
      );
    }
    return Column(
      children: [
        for (final tile in tiles) ...[
          tile,
          Divider(height: 1, color: p.divider),
        ],
      ],
    );
  }
}

// -------------------------------------------------------------- Countdown

/// Whether a countdown shows anything at [now]: after the end only with a
/// text for it.
bool countdownShows(CountdownBlock block, DateTime now) =>
    now.isBefore(block.endsAt) || (block.endedText?.trim().isNotEmpty ?? false);

class CountdownView extends ConsumerStatefulWidget {
  const CountdownView({super.key, required this.block, required this.style});

  final CountdownBlock block;
  final PageStyle style;

  @override
  ConsumerState<CountdownView> createState() => _CountdownViewState();
}

class _CountdownViewState extends ConsumerState<CountdownView> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final b = widget.block;
    final now = ref.watch(pageClockProvider)();
    final left = b.endsAt.difference(now);
    final bold = widget.style.template == AppTemplate.bold;
    final fg = bold ? p.onPrimary : p.text;
    final ended = left.isNegative || left == Duration.zero;
    if (ended) {
      _timer?.cancel();
      final text = b.endedText?.trim() ?? '';
      if (text.isEmpty) return const SizedBox.shrink();
    }
    final action = b.action;
    final label = b.label?.trim() ?? '';
    final units = [
      (left.inDays, l10n.countdownDays),
      (left.inHours % 24, l10n.countdownHours),
      (left.inMinutes % 60, l10n.countdownMinutes),
      (left.inSeconds % 60, l10n.countdownSeconds),
    ];
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          b.heading,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: bold ? 18 : 16,
            fontWeight: FontWeight.w800,
            color: fg,
          ),
        ),
        if (b.subheading?.trim().isNotEmpty ?? false) ...[
          const SizedBox(height: 4),
          Text(
            b.subheading!,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: bold ? p.onPrimaryMuted : p.textSecondary,
            ),
          ),
        ],
        const SizedBox(height: 14),
        if (ended)
          Text(
            b.endedText!,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 15, color: fg),
          )
        else
          Semantics(
            liveRegion: false,
            label: units.map((u) => '${u.$1} ${u.$2}').join(', '),
            excludeSemantics: true,
            child: Row(
              // Days on the left in every language, like a clock.
              textDirection: TextDirection.ltr,
              children: [
                for (final (i, u) in units.indexed) ...[
                  if (i > 0) const SizedBox(width: 8),
                  Expanded(
                    child: _CountdownUnit(
                      value: u.$1,
                      label: u.$2,
                      style: widget.style,
                    ),
                  ),
                ],
              ],
            ),
          ),
        if (!ended && action != null && label.isNotEmpty) ...[
          const SizedBox(height: 14),
          if (bold)
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: p.accent,
                foregroundColor: p.onAccent,
                minimumSize: const Size.fromHeight(48),
              ),
              onPressed: () => runPageAction(context, ref, action),
              child: Text(label),
            )
          else
            PrimaryButton(
              label: label,
              height: 48,
              onPressed: () => runPageAction(context, ref, action),
            ),
        ],
      ],
    );
    if (bold) {
      return Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: p.primary,
          borderRadius: BorderRadius.circular(
            context.shapes.r(widget.style.bannerRadius),
          ),
        ),
        child: content,
      );
    }
    return AppCard(padding: const EdgeInsets.all(16), child: content);
  }
}

class _CountdownUnit extends StatelessWidget {
  const _CountdownUnit({
    required this.value,
    required this.label,
    required this.style,
  });

  final int value;
  final String label;
  final PageStyle style;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final bold = style.template == AppTemplate.bold;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
      decoration: BoxDecoration(
        color: bold ? p.onPrimary.withValues(alpha: 0.12) : p.surfaceMuted,
        borderRadius: BorderRadius.circular(context.shapes.r(12)),
      ),
      child: Column(
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value.toString().padLeft(2, '0'),
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                fontFeatures: const [FontFeature.tabularFigures()],
                color: bold ? p.onPrimary : p.text,
              ),
            ),
          ),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              color: bold ? p.onPrimaryMuted : p.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Contact

class ContactView extends ConsumerWidget {
  const ContactView({super.key, required this.block, required this.style});

  final ContactBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final open = ref.read(openExternalProvider);
    final ios = ref.watch(appEnvironmentProvider).isIos;
    String? value(String? v) => (v?.trim().isEmpty ?? true) ? null : v!.trim();
    final phone = value(block.phone);
    final whatsapp = value(block.whatsapp);
    final email = value(block.email);
    final website = value(block.website);
    final address = value(block.address);
    final buttons = <(IconData, String, String)>[
      if (phone != null)
        (
          AppIcons.call,
          l10n.call,
          'tel:${phone.replaceAll(RegExp(r'[^0-9+]'), '')}',
        ),
      if (whatsapp != null)
        (AppIcons.chat, l10n.whatsapp, whatsappLink(whatsapp)),
      if (email != null) (AppIcons.mail, l10n.email, 'mailto:$email'),
      if (block.hasPlace)
        (AppIcons.directions, l10n.pageDirections, mapsLink(block, ios: ios)),
      if (website != null) (AppIcons.web, l10n.pageWebsite, website),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (address != null) ...[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppIcon(AppIcons.location, size: 20, color: p.textSecondary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  address,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.4,
                    color: p.textBody,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final (icon, label, link) in buttons)
              _PillButton(
                icon: icon,
                label: label,
                style: style,
                onTap: () => open(link),
              ),
          ],
        ),
      ],
    );
  }
}

/// Directions in the phone's maps: Apple Maps on iPhone, Google Maps
/// elsewhere; the coordinates when set, else the address.
String mapsLink(ContactBlock block, {required bool ios}) {
  final lat = block.latitude;
  final lng = block.longitude;
  final query = lat != null && lng != null
      ? '$lat,$lng'
      : Uri.encodeComponent(block.address!.trim());
  return ios
      ? 'https://maps.apple.com/?q=$query'
      : 'https://www.google.com/maps/search/?api=1&query=$query';
}

class _PillButton extends StatelessWidget {
  const _PillButton({
    required this.icon,
    required this.label,
    required this.style,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final PageStyle style;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final bold = style.template == AppTemplate.bold;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: bold ? p.primary : p.surface,
        shape: StadiumBorder(
          side: bold ? BorderSide.none : BorderSide(color: p.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 44),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppIcon(icon, size: 20, color: bold ? p.onPrimary : p.link),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: bold ? p.onPrimary : p.text,
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

// ---------------------------------------------------------- Opening hours

class HoursView extends ConsumerWidget {
  const HoursView({super.key, required this.block, required this.style});

  final HoursBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final now = ref.watch(pageClockProvider)();
    final open = block.isOpenAt(now);
    final locale = l10n.localeName;
    initializeDateFormatting(locale);
    final names = DateFormat('EEEE', locale);
    // 2024-01-01 was a Monday.
    String dayName(Weekday day) =>
        names.format(DateTime(2024, 1, 1 + day.index));
    String clock(int minutes) =>
        '${(minutes ~/ 60).toString().padLeft(2, '0')}:'
        '${(minutes % 60).toString().padLeft(2, '0')}';
    final today = Weekday.values[now.weekday - 1];
    final note = block.note?.trim() ?? '';
    final rows = [
      for (final day in Weekday.values)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 5),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                dayName(day),
                style: TextStyle(
                  fontSize: 14.5,
                  fontWeight: day == today ? FontWeight.w800 : FontWeight.w500,
                  color: p.text,
                ),
              ),
              const SizedBox(width: 16),
              Builder(
                builder: (context) {
                  final periods = block.hours.where((h) => h.day == day);
                  return Expanded(
                    child: Text(
                      periods.isEmpty
                          ? l10n.pageClosedDay
                          // Each period on its line; times read left to right in every language.
                          : periods
                                .map(
                                  (h) =>
                                      '\u2066${clock(h.opens)}–${clock(h.closes)}\u2069',
                                )
                                .join('\n'),
                      textAlign: TextAlign.end,
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: day == today
                            ? FontWeight.w800
                            : FontWeight.w500,
                        color: periods.isEmpty ? p.textSecondary : p.text,
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
    ];
    final status = Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: open ? p.success : p.danger,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          open ? l10n.pageOpenNow : l10n.closedNow,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            color: open ? p.success : p.danger,
          ),
        ),
      ],
    );
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (block.hours.isNotEmpty) ...[
          status,
          const SizedBox(height: 10),
          ...rows,
        ],
        if (note.isNotEmpty) ...[
          if (block.hours.isNotEmpty) const SizedBox(height: 8),
          Text(note, style: TextStyle(fontSize: 13.5, color: p.textSecondary)),
        ],
      ],
    );
    if (style.template == AppTemplate.minimal) return content;
    return AppCard(padding: const EdgeInsets.all(16), child: content);
  }
}

// ----------------------------------------------------------------- Social

class SocialView extends ConsumerWidget {
  const SocialView({super.key, required this.block, required this.style});

  final SocialBlock block;
  final PageStyle style;

  /// Material Symbols has no brand logos: a plain icon for each network, and
  /// its name always next to it.
  static const _icons = {
    SocialNetwork.instagram: AppIcons.photo,
    SocialNetwork.facebook: AppIcons.people,
    SocialNetwork.x: AppIcons.forum,
    SocialNetwork.tiktok: AppIcons.music,
    SocialNetwork.youtube: AppIcons.video,
    SocialNetwork.linkedin: AppIcons.work,
    SocialNetwork.snapchat: AppIcons.photo,
    SocialNetwork.telegram: AppIcons.send,
    SocialNetwork.whatsappChannel: AppIcons.campaignUpdate,
  };

  static String name(SocialNetwork network, BuildContext context) =>
      switch (network) {
        SocialNetwork.instagram => 'Instagram',
        SocialNetwork.facebook => 'Facebook',
        SocialNetwork.x => 'X',
        SocialNetwork.tiktok => 'TikTok',
        SocialNetwork.youtube => 'YouTube',
        SocialNetwork.linkedin => 'LinkedIn',
        SocialNetwork.snapchat => 'Snapchat',
        SocialNetwork.telegram => 'Telegram',
        SocialNetwork.whatsappChannel => context.l10n.socialWhatsappChannel,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final open = ref.read(openExternalProvider);
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final profile in block.profiles)
          _PillButton(
            icon: _icons[profile.network]!,
            label: name(profile.network, context),
            style: style,
            onTap: () => open(profile.url),
          ),
      ],
    );
  }
}

// ------------------------------------------------------------------- Team

class TeamView extends ConsumerWidget {
  const TeamView({super.key, required this.block, required this.style});

  final TeamBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    VoidCallback? tap(TeamMember m) =>
        m.action == null ? null : () => runPageAction(context, ref, m.action);
    switch (block.layout) {
      case ItemsLayout.carousel:
        final scale = MediaQuery.textScalerOf(context);
        return SizedBox(
          height: 16 + 72 + 12 + scale.scale(40 + 18) + 18,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            clipBehavior: Clip.none,
            itemCount: block.people.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, i) => SizedBox(
              width: 156,
              child: _PersonCard(
                person: block.people[i],
                onTap: tap(block.people[i]),
                bio: false,
              ),
            ),
          ),
        );
      case ItemsLayout.grid:
        return LayoutBuilder(
          builder: (context, constraints) {
            const spacing = 12.0;
            final columns = constraints.maxWidth >= 560 ? 3 : 2;
            final width =
                (constraints.maxWidth - spacing * (columns - 1)) / columns;
            return Wrap(
              spacing: spacing,
              runSpacing: spacing,
              children: [
                for (final m in block.people)
                  SizedBox(
                    width: width,
                    child: _PersonCard(person: m, onTap: tap(m), bio: true),
                  ),
              ],
            );
          },
        );
      case ItemsLayout.list:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final (i, m) in block.people.indexed) ...[
              if (i > 0) const SizedBox(height: 10),
              _PersonRow(person: m, onTap: tap(m)),
            ],
          ],
        );
    }
  }
}

String _personLabel(TeamMember m) => [
  m.name,
  m.role,
  m.bio,
].whereType<String>().where((t) => t.trim().isNotEmpty).join(', ');

class _PersonCard extends StatelessWidget {
  const _PersonCard({
    required this.person,
    required this.onTap,
    required this.bio,
  });

  final TeamMember person;
  final VoidCallback? onTap;
  final bool bio;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final role = person.role?.trim() ?? '';
    final about = person.bio?.trim() ?? '';
    return AppCard(
      onTap: onTap,
      semanticLabel: _personLabel(person),
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 14),
      child: ExcludeSemantics(
        child: Column(
          // Centered in the side-scrolling row, where every card is as tall as the tallest.
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _Avatar(name: person.name, photoUrl: person.photoUrl, size: 72),
            const SizedBox(height: 12),
            Text(
              person.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                height: 1.3,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
            if (role.isNotEmpty)
              Text(
                role,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            if (bio && about.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                about,
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, height: 1.4, color: p.textBody),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PersonRow extends StatelessWidget {
  const _PersonRow({required this.person, required this.onTap});

  final TeamMember person;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final role = person.role?.trim() ?? '';
    final about = person.bio?.trim() ?? '';
    return AppCard(
      onTap: onTap,
      semanticLabel: _personLabel(person),
      padding: const EdgeInsets.all(14),
      child: ExcludeSemantics(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Avatar(name: person.name, photoUrl: person.photoUrl, size: 60),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    person.name,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  if (role.isNotEmpty)
                    Text(role, style: TextStyle(fontSize: 13.5, color: p.link)),
                  if (about.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      about,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.45,
                        color: p.textBody,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ------------------------------------------------------------------ Stats

class StatsView extends StatelessWidget {
  const StatsView({super.key, required this.block, required this.style});

  final StatsBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final bold = style.template == AppTemplate.bold;
    final minimal = style.template == AppTemplate.minimal;
    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 10.0;
        final count = block.stats.length;
        // Four numbers on a narrow phone go two by two.
        final columns = count == 4 && constraints.maxWidth < 420 ? 2 : count;
        final width =
            (constraints.maxWidth - spacing * (columns - 1)) / columns;
        Widget stat(StatEntry s) {
          final content = Semantics(
            label: '${s.value} ${s.label}',
            excludeSemantics: true,
            child: Column(
              children: [
                FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    // 110 Isolated, so "10+" doesn't read "+10" right to
                    // left; a value in words ("7 أيام") keeps its own way.
                    '\u2068${s.value}\u2069',
                    maxLines: 1,
                    style: TextStyle(
                      fontSize: bold ? 28 : 24,
                      fontWeight: FontWeight.w800,
                      color: bold ? p.onPrimary : p.text,
                    ),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  s.label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12.5,
                    height: 1.25,
                    color: bold ? p.onPrimaryMuted : p.textSecondary,
                  ),
                ),
              ],
            ),
          );
          final padding = const EdgeInsets.symmetric(
            vertical: 14,
            horizontal: 8,
          );
          if (bold) {
            return Container(
              padding: padding,
              decoration: BoxDecoration(
                color: p.primary,
                borderRadius: BorderRadius.circular(context.shapes.r(16)),
              ),
              child: content,
            );
          }
          if (minimal) {
            return Container(
              padding: padding,
              decoration: BoxDecoration(
                border: BorderDirectional(
                  start: BorderSide(color: p.accent, width: 3),
                ),
              ),
              child: content,
            );
          }
          return AppCard(padding: padding, child: content);
        }

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final s in block.stats) SizedBox(width: width, child: stat(s)),
          ],
        );
      },
    );
  }
}

// ----------------------------------------------------------------- Notice

class NoticeView extends ConsumerWidget {
  const NoticeView({super.key, required this.block, required this.style});

  final NoticeBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final (bg, fg, icon) = switch (block.tone) {
      NoticeTone.info => (p.surfaceMuted, p.text, AppIcons.info),
      NoticeTone.success => (p.successSoft, p.success, AppIcons.checkCircle),
      NoticeTone.warning => (p.timerSoft, p.onTimerSoft, AppIcons.warning),
    };
    final action = block.action;
    final label = block.label?.trim() ?? '';
    final link = action != null && label.isNotEmpty;
    final align = blockAlign(context);
    return Semantics(
      container: true,
      child: Material(
        color: bg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(context.shapes.r(14)),
          side: block.tone == NoticeTone.info
              ? BorderSide(color: p.border)
              : BorderSide.none,
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: link ? () => runPageAction(context, ref, action) : null,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppIcon(icon, size: 22, color: fg, filled: true),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: align.crossAxis,
                    children: [
                      Text(
                        block.text,
                        textAlign: align.textAlign,
                        style: TextStyle(
                          fontSize: 14.5,
                          height: 1.4,
                          fontWeight: FontWeight.w600,
                          color: p.isDark && block.tone == NoticeTone.info
                              ? p.text
                              : fg,
                        ),
                      ),
                      if (link) ...[
                        const SizedBox(height: 4),
                        Text(
                          label,
                          textAlign: align.textAlign,
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w800,
                            decoration: TextDecoration.underline,
                            decorationColor: fg,
                            color: fg,
                          ),
                        ),
                      ],
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
}

// ------------------------------------------------------------- 99.4 Cards

/// 99.4 A card's outline, with the corners of the block around [context].
ShapeBorder _blockCardShape(BuildContext context) {
  final outline = context.cardShape(16, outlined: true);
  if (outline is! RoundedRectangleBorder) return outline;
  return outline.copyWith(
    borderRadius: BorderRadius.circular(blockRadius(context, 16)),
  );
}

/// 99.4 Cards in the block's two or three columns: a picture on top when
/// the card has one, its title and its text; a tap runs its action.
class CardsView extends ConsumerWidget {
  const CardsView({super.key, required this.block, required this.style});

  final CardsBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final align = blockAlign(context);
    final fit = blockImageFit(context);
    final shape = _blockCardShape(context);
    final narrow = block.columns == 3;
    Widget card(int i, PageCard c) {
      final action = c.action;
      final text = c.text?.trim() ?? '';
      final opens = action != null && canOpenAction(ref, action);
      return Semantics(
        button: opens,
        label: [c.title.trim(), text].where((t) => t.isNotEmpty).join(', '),
        child: Material(
          color: p.surface,
          shape: shape,
          elevation: context.cardElevation,
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: opens ? () => runPageAction(context, ref, action) : null,
            child: ExcludeSemantics(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (c.imageUrl != null)
                    AspectRatio(
                      aspectRatio: 4 / 3,
                      child: AppNetworkImage(
                        url: c.imageUrl,
                        seed: block.id.hashCode + i,
                        fit: fit,
                        clearPlaceholder: fit == BoxFit.contain,
                      ),
                    ),
                  Padding(
                    padding: EdgeInsets.all(narrow ? 8 : 12),
                    child: Column(
                      crossAxisAlignment: align.crossAxis,
                      children: [
                        Text(
                          c.title,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          textAlign: align.textAlign,
                          style: TextStyle(
                            fontSize: narrow ? 14 : 15,
                            height: 1.3,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                        if (text.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            text,
                            maxLines: 4,
                            overflow: TextOverflow.ellipsis,
                            textAlign: align.textAlign,
                            style: TextStyle(
                              fontSize: narrow ? 12.5 : 13.5,
                              height: 1.4,
                              color: p.textSecondary,
                            ),
                          ),
                        ],
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

    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 12.0;
        final columns = block.columns;
        final width =
            (constraints.maxWidth - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final (i, c) in block.cards.indexed)
              SizedBox(width: width, child: card(i, c)),
          ],
        );
      },
    );
  }
}

// ----------------------------------------------------------- 99.4 Gallery

/// 99.4 Square thumbnails in the block's two or three columns; a tap opens
/// the photos full screen ([GalleryViewer]).
class GalleryView extends StatelessWidget {
  const GalleryView({super.key, required this.block, required this.style});

  final GalleryBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final fit = blockImageFit(context);
    final radius = blockRadius(context, 12);
    final images = block.images;
    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 8.0;
        final columns = block.columns;
        final size = (constraints.maxWidth - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final (i, image) in images.indexed)
              SizedBox.square(
                dimension: size,
                child: Semantics(
                  button: true,
                  label: [
                    l10n.photoOf(i + 1, images.length),
                    image.caption?.trim() ?? '',
                  ].where((t) => t.isNotEmpty).join(', '),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(radius),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        AppNetworkImage(
                          url: image.imageUrl,
                          seed: block.id.hashCode + i,
                          fit: fit,
                          clearPlaceholder: fit == BoxFit.contain,
                        ),
                        Material(
                          type: MaterialType.transparency,
                          child: InkWell(
                            key: ValueKey('gallery-${block.id}-$i'),
                            onTap: () => GalleryViewer.open(context, images, i),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

/// 99.4 A gallery's photos full screen: swipe through them, pinch to zoom,
/// each with its caption.
class GalleryViewer extends StatefulWidget {
  const GalleryViewer({super.key, required this.images, this.initial = 0});

  final List<GalleryImage> images;

  /// The photo shown first.
  final int initial;

  static Future<void> open(
    BuildContext context,
    List<GalleryImage> images,
    int initial,
  ) => Navigator.of(context, rootNavigator: true).push(
    MaterialPageRoute<void>(
      fullscreenDialog: true,
      builder: (_) => GalleryViewer(images: images, initial: initial),
    ),
  );

  @override
  State<GalleryViewer> createState() => _GalleryViewerState();
}

class _GalleryViewerState extends State<GalleryViewer> {
  late final _controller = PageController(initialPage: widget.initial);
  late int _index = widget.initial;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final images = widget.images;
    final caption = images[_index].caption?.trim() ?? '';
    final padding = MediaQuery.paddingOf(context);
    const scrim = Color(0xA60E0D24);
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          Semantics(
            label: l10n.photoOf(_index + 1, images.length),
            child: PageView.builder(
              key: const ValueKey('gallery-viewer'),
              controller: _controller,
              itemCount: images.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (context, i) => InteractiveViewer(
                child: AppNetworkImage(
                  url: images[i].imageUrl,
                  seed: i,
                  fit: BoxFit.contain,
                  clearPlaceholder: true,
                  semanticLabel: images[i].caption,
                ),
              ),
            ),
          ),
          if (images.length > 1)
            PositionedDirectional(
              top: padding.top + 20,
              start: 16,
              child: ExcludeSemantics(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: scrim,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_index + 1} / ${images.length}',
                    textDirection: TextDirection.ltr,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          PositionedDirectional(
            top: padding.top + 8,
            end: 8,
            child: IconButton(
              key: const ValueKey('gallery-close'),
              tooltip: l10n.close,
              style: IconButton.styleFrom(
                backgroundColor: scrim,
                minimumSize: const Size(48, 48),
              ),
              onPressed: () => Navigator.of(context).maybePop(),
              icon: const AppIcon(AppIcons.close, color: Colors.white),
            ),
          ),
          if (caption.isNotEmpty)
            PositionedDirectional(
              start: 0,
              end: 0,
              bottom: 0,
              child: Container(
                color: scrim,
                padding: EdgeInsets.fromLTRB(20, 12, 20, 12 + padding.bottom),
                child: Text(
                  caption,
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.4,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// --------------------------------------------------------------- 99.4 Map

/// 99.4 The links that open directions to [block]'s place, tried in turn:
/// Apple Maps on iPhone; elsewhere the phone's maps app (`geo:`), then
/// Google Maps on the web.
List<String> directionsLinks(MapBlock block, {required bool ios}) {
  final at = '${block.latitude},${block.longitude}';
  if (ios) return ['https://maps.apple.com/?daddr=$at'];
  final name = block.name?.trim() ?? '';
  final label = name.isEmpty ? '' : '(${Uri.encodeComponent(name)})';
  return [
    'geo:$at?q=$at$label',
    'https://www.google.com/maps/dir/?api=1&destination=$at',
  ];
}

/// 99.4 A place on a card: a pin, its name and address, and a button that
/// opens directions in the phone's maps.
class MapView extends ConsumerWidget {
  const MapView({super.key, required this.block, required this.style});

  final MapBlock block;
  final PageStyle style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final ios = ref.watch(appEnvironmentProvider).isIos;
    final name = block.name?.trim() ?? '';
    final address = block.address?.trim() ?? '';
    final label = block.label?.trim() ?? '';
    Future<void> directions() async {
      final open = ref.read(openExternalProvider);
      for (final link in directionsLinks(block, ios: ios)) {
        if (await open(link)) return;
      }
    }

    return Material(
      color: p.surface,
      shape: _blockCardShape(context),
      elevation: context.cardElevation,
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: p.accentSoft,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: AppIcon(
                    AppIcons.location,
                    size: 24,
                    color: p.link,
                    filled: true,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (name.isNotEmpty)
                        Text(
                          name,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      if (address.isNotEmpty)
                        Text(
                          address,
                          style: TextStyle(
                            fontSize: 14,
                            height: 1.4,
                            color: p.textBody,
                          ),
                        ),
                      // Without a name or an address: where it is, read
                      // left to right in every language.
                      if (name.isEmpty && address.isEmpty)
                        Text(
                          '\u2066${block.latitude.toStringAsFixed(5)}, '
                          '${block.longitude.toStringAsFixed(5)}\u2069',
                          style: TextStyle(fontSize: 14, color: p.textBody),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            PrimaryButton(
              label: label.isEmpty ? l10n.pageDirections : label,
              icon: AppIcons.directions,
              height: 48,
              onPressed: directions,
            ),
          ],
        ),
      ),
    );
  }
}

// ----------------------------------------------------------- 99.4 Divider

/// 99.4 A thin line in the palette's colour for lines: solid, dashed or
/// dotted.
class DividerView extends StatelessWidget {
  const DividerView({super.key, required this.block});

  final DividerBlock block;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: SizedBox(
        key: ValueKey('divider-${block.style.name}'),
        width: double.infinity,
        height: block.style == DividerStyle.dots ? 3 : 1,
        child: CustomPaint(
          painter: _LinePainter(
            color: context.palette.divider,
            style: block.style,
          ),
        ),
      ),
    );
  }
}

class _LinePainter extends CustomPainter {
  const _LinePainter({required this.color, required this.style});

  final Color color;
  final DividerStyle style;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    switch (style) {
      case DividerStyle.line:
        canvas.drawRect(Offset.zero & size, paint);
      case DividerStyle.dashed:
        for (var x = 0.0; x < size.width; x += 10) {
          final end = x + 6 < size.width ? x + 6 : size.width;
          canvas.drawRect(Rect.fromLTRB(x, 0, end, size.height), paint);
        }
      case DividerStyle.dots:
        final radius = size.height / 2;
        for (var x = radius; x < size.width; x += 8) {
          canvas.drawCircle(Offset(x, radius), radius, paint);
        }
    }
  }

  @override
  bool shouldRepaint(_LinePainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.style != style;
}
