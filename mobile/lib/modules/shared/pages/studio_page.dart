import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show RenderProxyBox;
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/fonts/remote_fonts.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/widgets/app_nav_bar.dart' show TabBarOverBody;
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/studio_screen_scope.dart';
import '../../lms/home/learning_cards.dart';
import '../../school/widgets/studio_school.dart';
import '../../market/widgets/market_sections.dart';
import 'app_header.dart';
import 'content_blocks.dart' show pageClockProvider;
import 'page_actions.dart';
import 'page_blocks.dart';
// 129.11–129.20 Studio's premium elements and card styles.
import 'premium/studio_premium.dart';
import 'recently_viewed.dart';
import 'side_menu.dart';
import 'studio_covers.dart';
import 'studio_live.dart';
import 'studio_live_status.dart';
// 129 Premium motion & media: the slider's looks, stories, a ticker, a video
// or parallax banner, a gallery, before and after, entrances on first show.
import 'studio_before_after.dart';
import 'studio_gallery.dart';
import 'studio_marquee.dart';
import 'studio_media_covers.dart';
import 'studio_motion.dart';
import 'studio_scrim.dart';
import 'studio_segments.dart';
import 'studio_stories.dart';

/// 103R A page designed in Yallapp Studio, drawn from its tree of elements:
/// rows, columns, layers, grids and sliders sized to fill, hug or a fixed
/// size, so the page fits every phone and tablet; light or dark; lists and
/// categories from the app's data; motion unless the phone reduces it.
/// Elements pinned to the top or bottom stay while the page scrolls. A page
/// opened on top of the tabs keeps a back button.
class StudioPageView extends ConsumerWidget {
  const StudioPageView({
    super.key,
    required this.page,
    required this.pageSlug,
    this.pushed = false,
    this.screen,
  });

  final StudioPage page;
  final String pageSlug;
  final bool pushed;

  /// 120 The app's own screen the page is drawn around (`StudioPage.screen`):
  /// the header stays over it and the elements scroll away with it.
  final Widget? screen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hosted = screen;
    if (hosted != null) return _aroundScreen(context, hosted);
    final p = context.palette;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final top = MediaQuery.paddingOf(context).top;
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final background =
        parseHexColor(
          dark ? (page.darkBackground ?? page.background) : page.background,
        ) ??
        p.background;
    final header = page.header;
    final overlay = header?.type == StudioHeaderType.transparent;
    // Elements pinned at the top or bottom of the page's own column.
    final body = page.bodyFor(MediaQuery.sizeOf(context).shortestSide);
    // 128 A page without a header that starts with a cover (a photo hero, a
    // map) has it under the status bar, its elements below the bar.
    final first = header == null
        ? body.children.where((n) => n.pin == StudioPin.none).firstOrNull
        : null;
    final bleed =
        first != null &&
            (first.type == StudioNodeType.photoHero ||
                first.type == StudioNodeType.mapHeader) &&
            first.margin == null
        ? first
        : null;
    // 128.10 Under a transparent header, a page starting with a cover (a
    // photo hero, a map, a photo with a scrim) has it under the status bar
    // and the app's name over it; any other page as before: its elements
    // below the bar, the buttons alone.
    final overCover = overlay && studioStartsWithCover(body);
    final scope = StudioScope(
      pageSlug: pageSlug,
      dark: dark,
      bleedId: bleed?.id,
      topInset: bleed == null ? 0 : top,
    );
    bool pinned(StudioNode n) => n.pin != StudioPin.none;
    final pinnedTop = [
      for (final n in body.children)
        if (n.pin == StudioPin.top) n,
    ];
    final pinnedBottom = [
      for (final n in body.children)
        if (n.pin == StudioPin.bottom) n,
    ];
    final scrolling = pinnedTop.isEmpty && pinnedBottom.isEmpty
        ? body
        : _withChildren(body, [
            for (final n in body.children)
              if (!pinned(n)) n,
          ]);
    final list = ListView(
      key: ValueKey('studio-$pageSlug'),
      padding: EdgeInsets.only(
        // 128 A cover first on a page without a header reaches under the
        // status bar; 128.10 under a transparent header, a cover first does.
        top: header == null
            ? (bleed == null ? top : 0)
            : overlay && !overCover
            ? top
            : 0,
        // 128.10 Over a bar the page goes on under (glass, float), its end
        // above the bar.
        bottom: 16 + (TabBarOverBody.of(context) ? bottomInset : 0),
      ),
      children: [
        if (header != null && !overlay)
          StudioHeaderView(header: header, top: top, scope: scope),
        StudioNodeView(node: scrolling, scope: scope, parent: null),
      ],
    );
    return ColoredBox(
      color: background,
      child: Stack(
        children: [
          // 110 Without a header, nothing scrolls under the status bar.
          Positioned.fill(
            child: bleed != null
                // 128 Light icons over a photo; over the map, as on its land.
                ? AnnotatedRegion<SystemUiOverlayStyle>(
                    value: bleed.type == StudioNodeType.photoHero
                        ? SystemUiOverlayStyle.light
                        : overlayStyleOn(background),
                    child: list,
                  )
                : header == null
                ? StatusBarBackdrop(color: background, child: list)
                : list,
          ),
          if (overlay)
            PositionedDirectional(
              top: 0,
              start: 0,
              end: 0,
              child: StudioHeaderView(
                header: header!,
                top: top,
                scope: scope,
                overCover: overCover,
              ),
            ),
          if (pinnedTop.isNotEmpty)
            PositionedDirectional(
              top: overlay || header == null ? top : top,
              start: 0,
              end: 0,
              child: _pinnedColumn(pinnedTop, scope),
            ),
          if (pinnedBottom.isNotEmpty)
            PositionedDirectional(
              bottom: MediaQuery.paddingOf(context).bottom,
              start: 0,
              end: 0,
              child: _pinnedColumn(pinnedBottom, scope),
            ),
          if (pushed)
            PositionedDirectional(
              top: top + 8,
              start: 16,
              child: const AppBackButton(),
            ),
        ],
      ),
    );
  }

  /// 120 The page around the app's screen: its header (or the status bar's
  /// strip) and the elements pinned to the top stay; the other elements
  /// scroll away over the screen, which fills the rest. Under a header the
  /// screen's own title isn't shown.
  Widget _aroundScreen(BuildContext context, Widget hosted) {
    // Nothing over it yet: the screen as it is (the account's own top).
    if (page.header == null && page.body.children.isEmpty) return hosted;
    final p = context.palette;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final top = MediaQuery.paddingOf(context).top;
    final background =
        parseHexColor(
          dark ? (page.darkBackground ?? page.background) : page.background,
        ) ??
        p.background;
    final scope = StudioScope(pageSlug: pageSlug, dark: dark);
    final header = page.header;
    final body = page.bodyFor(MediaQuery.sizeOf(context).shortestSide);
    final pinnedTop = [
      for (final n in body.children)
        if (n.pin == StudioPin.top) n,
    ];
    final pinnedBottom = [
      for (final n in body.children)
        if (n.pin == StudioPin.bottom) n,
    ];
    final over = _withChildren(body, [
      for (final n in body.children)
        if (n.pin == StudioPin.none) n,
    ]);
    final screen = MediaQuery.removePadding(
      context: context,
      removeTop: true,
      child: StudioScreenScope(hidesTitle: header != null, child: hosted),
    );
    final Widget rest = over.children.isEmpty
        ? screen
        : NestedScrollView(
            key: ValueKey('studio-screen-$pageSlug'),
            headerSliverBuilder: (context, _) => [
              SliverToBoxAdapter(
                child: StudioNodeView(node: over, scope: scope, parent: null),
              ),
            ],
            body: screen,
          );
    final view = ColoredBox(
      color: background,
      child: Stack(
        children: [
          Positioned.fill(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (header != null)
                  StudioHeaderView(
                    header: header,
                    top: top,
                    scope: scope,
                    back: pushed && header.type == StudioHeaderType.title,
                  )
                else
                  AnnotatedRegion<SystemUiOverlayStyle>(
                    value: overlayStyleOn(background),
                    child: SizedBox(height: top),
                  ),
                if (pinnedTop.isNotEmpty) _pinnedColumn(pinnedTop, scope),
                Expanded(child: rest),
              ],
            ),
          ),
          if (pinnedBottom.isNotEmpty)
            PositionedDirectional(
              bottom: MediaQuery.paddingOf(context).bottom,
              start: 0,
              end: 0,
              child: _pinnedColumn(pinnedBottom, scope),
            ),
          // The title header has its own; without a header the screen has.
          if (pushed && header != null && header.type != StudioHeaderType.title)
            PositionedDirectional(
              top: top + 8,
              start: 16,
              child: const AppBackButton(),
            ),
        ],
      ),
    );
    // 124.7 Opened on top of the tabs, the page is over the screen's own
    // Scaffold, not in one: its header's words need the app's text style.
    return pushed
        ? Material(type: MaterialType.transparency, child: view)
        : view;
  }

  Widget _pinnedColumn(List<StudioNode> nodes, StudioScope scope) => Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      for (final n in nodes)
        StudioNodeView(node: n, scope: scope, parent: null),
    ],
  );
}

StudioNode _withChildren(StudioNode node, List<StudioNode> children) =>
    StudioNode(
      id: node.id,
      type: node.type,
      children: children,
      width: node.width,
      height: node.height,
      minHeight: node.minHeight,
      padding: node.padding,
      margin: node.margin,
      gap: node.gap,
      align: node.align,
      cross: node.cross,
      background: node.background,
      darkBackground: node.darkBackground,
      color: node.color,
      darkColor: node.darkColor,
      gradient: node.gradient,
      imageBackgroundUrl: node.imageBackgroundUrl,
      radius: node.radius,
      corners: node.corners,
      overlay: node.overlay,
      scrim: node.scrim,
      font: node.font,
    );

/// What every element of a page shares: the page (a form sends its answers
/// with it), light or dark, and inside a list's card the entry it shows.
class StudioScope {
  const StudioScope({
    required this.pageSlug,
    required this.dark,
    this.entry,
    this.uppercase = false,
    this.bleedId,
    this.topInset = 0,
    this.inCover = false,
  });

  final String pageSlug;
  final bool dark;
  final PageItem? entry;

  /// 107.2 Texts in capitals, as the element holding them asked.
  final bool uppercase;

  /// 128 The cover at the top of a page without a header, reaching under
  /// the status bar ([topInset] high).
  final String? bleedId;
  final double topInset;

  /// 128.10 Inside a cover (a photo hero, a map header): a colour over an
  /// element without a picture is its see-through background there.
  final bool inCover;

  StudioScope withEntry(PageItem entry) => StudioScope(
    pageSlug: pageSlug,
    dark: dark,
    entry: entry,
    uppercase: uppercase,
    bleedId: bleedId,
    topInset: topInset,
    inCover: inCover,
  );

  StudioScope inCapitals() => StudioScope(
    pageSlug: pageSlug,
    dark: dark,
    entry: entry,
    uppercase: true,
    bleedId: bleedId,
    topInset: topInset,
    inCover: inCover,
  );

  /// 128.10 What a cover holds.
  StudioScope insideCover() => StudioScope(
    pageSlug: pageSlug,
    dark: dark,
    entry: entry,
    uppercase: uppercase,
    bleedId: bleedId,
    topInset: topInset,
    inCover: true,
  );
}

/// 128.10 Whether a page's first element (of those not pinned) is a cover:
/// a photo hero, a map header, or a picture with a scrim (Studio's canvas:
/// components/studio/view.tsx `startsWithCover`). Under a transparent
/// header only such a page reaches under the status bar with the app's
/// name over it; older pages, which have none of these, look as before.
bool studioStartsWithCover(StudioNode body) {
  final first = body.children
      .where((n) => n.pin == StudioPin.none && !n.hidden)
      .firstOrNull;
  if (first == null) return false;
  return first.type == StudioNodeType.photoHero ||
      first.type == StudioNodeType.mapHeader ||
      first.scrim != null;
}

// ----------------------------------------------------------------- Header

/// 103R The bar at the top of a Studio page: the logo in the middle, the
/// title and a search field, the logo and its buttons, or the buttons alone
/// over the page's first element.
class StudioHeaderView extends ConsumerWidget {
  const StudioHeaderView({
    super.key,
    required this.header,
    required this.top,
    required this.scope,
    this.back = false,
    this.overCover = false,
  });

  final StudioHeader header;
  final double top;
  final StudioScope scope;

  /// 128.10 A transparent header over a cover shows the app's name (or
  /// logo) too; over anything else, its buttons alone, as before.
  final bool overCover;

  /// 120.4 Over a screen opened on top of the tabs: a back button first.
  final bool back;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final build = ref.watch(appEnvironmentProvider).build;
    final config = ref.watch(appConfigProvider);
    final transparent = header.type == StudioHeaderType.transparent;
    // 123 The greeting sits on the page itself unless it has its own colours.
    final greeting = header.type == StudioHeaderType.greeting;
    final background = transparent || (greeting && header.background == null)
        ? Colors.transparent
        : parseHexColor(
                scope.dark
                    ? (header.darkBackground ?? header.background)
                    : header.background,
              ) ??
              p.primary;
    final color =
        parseHexColor(
          scope.dark ? (header.darkColor ?? header.color) : header.color,
        ) ??
        (transparent
            ? Colors.white
            : greeting
            ? p.text
            : p.onPrimary);
    final title = header.title ?? build.appName;
    final logo =
        header.logoUrl ??
        config.appearance?.logoUrl ??
        config.branding.logoUrl ??
        build.logoUrl;
    final menu =
        header.buttons.contains(StudioHeaderButton.menu) &&
            sideMenuEntries(ref).isNotEmpty
        ? IconTheme(
            data: IconThemeData(color: color),
            child: SideMenuButton(onDark: !transparent),
          )
        : null;
    final buttons = [
      for (final b in header.buttons)
        if (_iconOf(b) case final icon? when headerIconOpens(ref, icon))
          greeting
              ? Padding(
                  padding: const EdgeInsetsDirectional.only(start: 8),
                  child: _GreetingButton(icon: icon, color: color),
                )
              : _StudioHeaderButton(icon: icon, color: color),
    ];
    final mark = logo != null
        ? ConstrainedBox(
            key: const ValueKey('studio-header-logo'),
            constraints: const BoxConstraints(maxWidth: 140, maxHeight: 32),
            child: AppNetworkImage(
              url: logo,
              height: 32,
              fit: BoxFit.contain,
              semanticLabel: build.appName,
              clearPlaceholder: true,
            ),
          )
        : Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          );
    final heading = Semantics(
      header: true,
      child: Text(
        title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w800,
          color: color,
        ),
      ),
    );
    final end = Row(mainAxisSize: MainAxisSize.min, children: buttons);
    final Widget bar = switch (header.type) {
      StudioHeaderType.logoCenter => SizedBox(
        height: 44,
        child: NavigationToolbar(
          leading: menu,
          middle: mark,
          trailing: buttons.isEmpty ? null : end,
          middleSpacing: 8,
        ),
      ),
      StudioHeaderType.titleSearch => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              ?menu,
              Expanded(child: heading),
              if (buttons.isNotEmpty) end,
            ],
          ),
          if (headerIconOpens(ref, HeaderIcon.search)) ...[
            const SizedBox(height: 10),
            _StudioSearchField(color: color),
          ],
        ],
      ),
      // 120 The page's title and its buttons.
      StudioHeaderType.title => SizedBox(
        height: 44,
        child: Row(
          children: [
            if (back)
              AppBackButton(
                key: const ValueKey('studio-header-back'),
                onPressed: () =>
                    context.canPop() ? context.pop() : context.go(Paths.home),
              ),
            ?menu,
            if (menu != null)
              const SizedBox(width: 4)
            else
              const SizedBox(width: 8),
            Expanded(child: heading),
            if (buttons.isNotEmpty) end,
          ],
        ),
      ),
      // 123 Today's date over a greeting with the person's first name.
      StudioHeaderType.greeting => Row(
        children: [
          Expanded(
            child: _Greeting(title: title, color: color),
          ),
          if (buttons.isNotEmpty) end,
        ],
      ),
      StudioHeaderType.logoActions || StudioHeaderType.transparent => SizedBox(
        height: 44,
        child: Row(
          children: [
            ?menu,
            if (menu != null) const SizedBox(width: 4),
            Expanded(
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                // 128.10 Over a cover, the app's name too, as the canvas
                // draws it; over anything else nothing, as before.
                child: transparent && !overCover
                    ? const SizedBox.shrink()
                    : mark,
              ),
            ),
            if (buttons.isNotEmpty) end,
          ],
        ),
      ),
    };
    return Padding(
      key: ValueKey(
        'studio-header-${switch (header.type) {
          StudioHeaderType.logoCenter => 'logo_center',
          StudioHeaderType.titleSearch => 'title_search',
          StudioHeaderType.logoActions => 'logo_actions',
          StudioHeaderType.transparent => 'transparent',
          StudioHeaderType.title => 'title',
          StudioHeaderType.greeting => 'greeting',
        }}',
      ),
      padding: EdgeInsets.fromLTRB(10, top + 8, 10, 4),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          child: IconTheme(
            data: IconThemeData(color: color),
            child: bar,
          ),
        ),
      ),
    );
  }

  static HeaderIcon? _iconOf(StudioHeaderButton b) => switch (b) {
    StudioHeaderButton.menu => null,
    StudioHeaderButton.search => HeaderIcon.search,
    StudioHeaderButton.cart => HeaderIcon.cart,
    StudioHeaderButton.notifications => HeaderIcon.notifications,
    StudioHeaderButton.chat => HeaderIcon.chat,
    StudioHeaderButton.account => HeaderIcon.account,
  };
}

/// 123 Today's date over "Good morning, Sara" (after noon "Good evening");
/// signed out, the header's title (else the app's name) under the date.
class _Greeting extends ConsumerWidget {
  const _Greeting({required this.title, required this.color});

  final String title;
  final Color color;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final now = ref.watch(pageClockProvider)();
    final auth = ref.watch(authControllerProvider);
    final name = auth is SignedIn
        ? (auth.user?.name ?? '').trim().split(RegExp(r'\s+')).first
        : '';
    final morning = now.hour < 12;
    final hello = auth is! SignedIn
        ? title
        : name.isEmpty
        ? (morning
              ? l10n.studioGreetingMorningAlone
              : l10n.studioGreetingEveningAlone)
        : (morning
              ? l10n.studioGreetingMorning(name)
              : l10n.studioGreetingEvening(name));
    return Column(
      key: const ValueKey('studio-greeting'),
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          dayLabel(now),
          style: TextStyle(fontSize: 13, color: color.withValues(alpha: 0.7)),
        ),
        Semantics(
          header: true,
          // A long name makes the line smaller, never cut off.
          child: FittedBox(
            fit: BoxFit.scaleDown,
            alignment: AlignmentDirectional.centerStart,
            child: Text(
              hello,
              maxLines: 1,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.48,
                color: color,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// 128.8 A card's rating: the element's own text (the "·" after the
/// teacher), a star drawn as an icon, which every font shows, and the
/// rating with one decimal, in the text's own style.
class _StudioRating extends StatelessWidget {
  const _StudioRating({required this.mark, required this.rating});

  final String? mark;
  final double rating;

  @override
  Widget build(BuildContext context) {
    final style = DefaultTextStyle.of(context).style;
    final value = rating.toStringAsFixed(1);
    final own = mark?.trim() ?? '';
    return Semantics(
      label: context.l10n.itemRating(value),
      excludeSemantics: true,
      child: Text.rich(
        TextSpan(
          children: [
            if (own.isNotEmpty) TextSpan(text: '$own '),
            WidgetSpan(
              alignment: PlaceholderAlignment.middle,
              child: Icon(
                Symbols.star_rounded,
                key: const ValueKey('studio-rating-star'),
                fill: 1,
                size: (style.fontSize ?? 12) + 1,
                color: style.color,
              ),
            ),
            TextSpan(text: ' $value'),
          ],
        ),
        maxLines: 1,
      ),
    );
  }
}

/// 123 A header button of the greeting: a small frosted square; 128.8 a
/// round button on the page's card colour, as approved.
class _GreetingButton extends StatelessWidget {
  const _GreetingButton({required this.icon, required this.color});

  final HeaderIcon icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: p.surface,
        shape: BoxShape.circle,
        border: Border.all(color: p.divider),
      ),
      child: Center(
        child: _StudioHeaderButton(icon: icon, color: color),
      ),
    );
  }
}

class _StudioHeaderButton extends ConsumerWidget {
  const _StudioHeaderButton({required this.icon, required this.color});

  final HeaderIcon icon;
  final Color color;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return IconButton(
      key: ValueKey('studio-header-${icon.name}'),
      tooltip: switch (icon) {
        HeaderIcon.search => l10n.headerSearch,
        HeaderIcon.cart => l10n.tabCart,
        HeaderIcon.notifications => l10n.notifications,
        HeaderIcon.chat => l10n.tabChat,
        HeaderIcon.account => l10n.tabAccount,
      },
      onPressed: () => openHeaderIcon(context, ref, icon),
      icon: AppIcon(switch (icon) {
        HeaderIcon.search => AppIcons.search,
        HeaderIcon.cart => AppIcons.cart,
        HeaderIcon.notifications => AppIcons.notifications,
        HeaderIcon.chat => AppIcons.chat,
        HeaderIcon.account => AppIcons.account,
      }, color: color),
    );
  }
}

class _StudioSearchField extends ConsumerWidget {
  const _StudioSearchField({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final label = context.l10n.headerSearch;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          key: const ValueKey('studio-header-search-field'),
          borderRadius: BorderRadius.circular(12),
          onTap: () => openHeaderIcon(context, ref, HeaderIcon.search),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                AppIcon(AppIcons.search, size: 20, color: color),
                const SizedBox(width: 8),
                Text(label, style: TextStyle(color: color)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// --------------------------------------------------------------- Elements

/// 103R One element and what it holds. [parent] is the layout it sits in
/// (null for the page's own element): sizes along a row or column fill or
/// hug within it.
class StudioNodeView extends ConsumerWidget {
  const StudioNodeView({
    super.key,
    required this.node,
    required this.scope,
    required this.parent,
  });

  final StudioNode node;
  final StudioScope scope;
  final StudioNode? parent;

  /// False for an element this phone or this person doesn't see.
  static bool shows(StudioNode node, WidgetRef ref) {
    // 107.2 Hidden by the owner (the servers leave these out already).
    if (node.hidden) return false;
    final platforms = node.platforms;
    if (platforms != null) {
      final ios = defaultTargetPlatform == TargetPlatform.iOS;
      if (!platforms.contains(
        ios ? StudioPlatform.ios : StudioPlatform.android,
      )) {
        return false;
      }
    }
    if (node.visibility != StudioVisibility.everyone) {
      final signedIn = ref.watch(authControllerProvider) is SignedIn;
      if (signedIn != (node.visibility == StudioVisibility.signedIn)) {
        return false;
      }
    }
    return switch (node.type) {
      // 112.4 What this person opened lately, once there is something.
      StudioNodeType.items when node.recent =>
        node.source == ItemSource.products &&
            ref.watch(recentlyViewedProvider).isNotEmpty,
      StudioNodeType.coupon => (node.code ?? '').isNotEmpty,
      // 129 Premium motion & media, with something to show.
      StudioNodeType.stories => node.slides.isNotEmpty,
      StudioNodeType.marquee =>
        (node.text ?? '').trim().isNotEmpty || node.images.isNotEmpty,
      StudioNodeType.gallery => node.images.isNotEmpty,
      StudioNodeType.beforeAfter => node.images.length >= 2,
      StudioNodeType.segments => StudioSegments.shows(node, ref),
      // 123 A student's card, signed in and with something to show.
      StudioNodeType.learning =>
        node.learning != null && learningCardShows(node.learning!, ref),
      // 128 The person's order, while one is on its way.
      StudioNodeType.liveStatus => switch (node.liveStatus) {
        StudioLiveSource.foodOrder =>
          ref.watch(liveFoodOrderProvider).value != null,
        StudioLiveSource.marketOrder =>
          ref.watch(liveMarketOrderProvider).value != null,
        null => false,
      },
      // 128 The person's shipment, ride or the taxis near them, once there is one.
      StudioNodeType.tracking => studioLiveShows(node, ref),
      // 128 A part of the family's school day, with something to show.
      StudioNodeType.school =>
        node.school != null && studioSchoolShows(node.school!, ref),
      StudioNodeType.items =>
        node.card != null
            ? node.items.isNotEmpty
            : PageBlockView.shows(_itemsBlock(node), ref),
      StudioNodeType.categories => PageBlockView.shows(
        _categoriesBlock(node),
        ref,
      ),
      StudioNodeType.form =>
        node.form != null && PageBlockView.shows(node.form!, ref),
      StudioNodeType.search => PageBlockView.shows(_searchBlock(node, ''), ref),
      _ => true,
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!shows(node, ref)) return const SizedBox.shrink();
    // 123 A text bound to what the entry hasn't (a course without a badge)
    // leaves no empty pill.
    if (scope.entry != null &&
        node.bind != null &&
        node.bind != StudioBind.image &&
        (_ownText() ?? '').trim().isEmpty) {
      return const SizedBox.shrink();
    }
    final dark = scope.dark;
    final color = parseHexColor(
      dark ? (node.darkColor ?? node.color) : node.color,
    );
    final background = parseHexColor(
      dark ? (node.darkBackground ?? node.background) : node.background,
    );
    final radius = _radiusOf(node).resolve(Directionality.of(context));
    final rounded = node.radius > 0 || node.corners != null;
    final overlay = _overlayOf(node);
    // 128 A cover draws its own height, space inside, colours and corners.
    // 129.4 and 129.7 The video and parallax banners too.
    final banner =
        node.type == StudioNodeType.videoHero ||
        node.type == StudioNodeType.parallaxBanner;
    final cover =
        banner ||
        node.type == StudioNodeType.photoHero ||
        node.type == StudioNodeType.mapHeader;
    Widget child = banner
        ? StudioMediaCover(node: node, scope: scope)
        : cover
        ? StudioCoverView(
            node: node,
            scope: scope,
            topInset: scope.bleedId == node.id ? scope.topInset : 0,
          )
        : _content(context, ref, color);
    // 129.16 / 129.20 A profile card and a call-to-action bar draw their own
    // space inside, background and button.
    final own = premiumDrawsItself(node.type);
    final padding = cover || own ? null : _insets(node.padding);
    if (padding != null) child = Padding(padding: padding, child: child);
    final border = parseHexColor(
      dark ? (node.darkBorderColor ?? node.borderColor) : node.borderColor,
    );
    final gradient = node.gradient;
    // 128 A colour over an element without a picture is its see-through
    // background (a frosted button over a photo); 128.10 only inside a
    // cover, so older pages draw such a colour as before (not at all).
    final seeThrough =
        scope.inCover &&
            background == null &&
            gradient == null &&
            node.imageBackgroundUrl == null
        ? overlay
        : null;
    final decorated =
        !cover &&
        !own &&
        (background != null ||
            seeThrough != null ||
            gradient != null ||
            node.imageBackgroundUrl != null ||
            node.shadow != StudioShadow.none ||
            (border != null && node.borderWidth > 0));
    if (node.imageBackgroundUrl case final url?) {
      // 112.4 What lies on the picture fills it when the element's size is
      // set (a slide), so its own alignment holds.
      child = Stack(
        fit: StackFit.passthrough,
        children: [
          Positioned.fill(
            // 129.1 Growing slowly in a slider's open slide (Ken Burns).
            child: StudioKenBurns.wrap(
              context,
              AppNetworkImage(url: url, seed: node.id.hashCode),
            ),
          ),
          if (overlay != null)
            Positioned.fill(
              child: ColoredBox(
                key: ValueKey('studio-overlay-${node.id}'),
                color: overlay,
              ),
            ),
          // 128 The shade for the words on it.
          if (node.scrim case final scrim?) studioScrimLayer(node, scrim),
          child,
        ],
      );
    }
    if (decorated) {
      child = DecoratedBox(
        decoration: BoxDecoration(
          color: gradient == null ? (background ?? seeThrough) : null,
          gradient: gradient == null ? null : _linear(gradient, background),
          borderRadius: radius,
          border: border != null && node.borderWidth > 0
              ? Border.all(color: border, width: node.borderWidth)
              : null,
          boxShadow: _shadow(node.shadow),
        ),
        position: DecorationPosition.background,
        child: child,
      );
    }
    // 129.18 A layout's premium card style: glass, a gradient border, a glow
    // inside, soft shadows.
    if (node.surface case final surface? when node.holdsChildren) {
      child = PremiumSurface(
        surface: surface,
        radius: radius,
        dark: dark,
        child: child,
      );
    }
    // 128.8 A student's card on a photo draws its photo and scrim to its
    // edges: rounded with the element.
    if (rounded &&
        (node.imageBackgroundUrl != null ||
            node.type == StudioNodeType.image ||
            node.learningStyle == StudioLearningStyle.photo)) {
      child = ClipRRect(borderRadius: radius, child: child);
    }
    if (!cover) child = _sized(child);
    // The text's colour and font for what this element holds.
    if (color != null || node.font != null) {
      child = DefaultTextStyle.merge(
        style: _textStyle(ref, color),
        child: IconTheme.merge(
          data: IconThemeData(color: color),
          child: child,
        ),
      );
    }
    final action =
        (node.type == StudioNodeType.button || node.action != null) &&
            node.type != StudioNodeType.ctaBar
        ? node.action
        : null;
    final press = node.motion?.press ?? StudioPress.none;
    if (action != null && canOpenAction(ref, action)) {
      child = _Pressable(
        press: press,
        radius: radius,
        label: node.type == StudioNodeType.button ? null : node.text,
        onTap: () => runPageAction(context, ref, action),
        child: child,
      );
    } else if (scope.entry != null && parent == null) {
      // The card of a list's entry opens the entry.
      final entryAction = scope.entry!.tapAction;
      if (entryAction != null && canOpenAction(ref, entryAction)) {
        child = _Pressable(
          press: press,
          radius: radius,
          label: scope.entry!.title,
          onTap: () => runPageAction(context, ref, entryAction),
          child: child,
        );
      }
    }
    if (node.opacity < 1) child = Opacity(opacity: node.opacity, child: child);
    final motion = node.motion;
    if (motion != null &&
        motion.moves &&
        !MediaQuery.disableAnimationsOf(context)) {
      child = _Moving(motion: motion, child: child);
    }
    // 129.1 A photo growing slowly again and again.
    if (node.kenBurns && node.type != StudioNodeType.slider) {
      child = StudioKenBurnsLoop(on: true, child: child);
    }
    // 107.2 Turned, with what it holds.
    if (node.rotation != 0) {
      child = Transform.rotate(
        key: ValueKey('studio-turned-${node.id}'),
        angle: node.rotation * math.pi / 180,
        child: child,
      );
    }
    final margin = _insets(node.margin);
    if (margin != null) child = Padding(padding: margin, child: child);
    return KeyedSubtree(key: ValueKey('studio-node-${node.id}'), child: child);
  }

  /// A fixed width or height, a minimum height and a shape's ratio.
  Widget _sized(Widget child) {
    // 112.4 A slider's height or shape is its slides'; its dots go under them.
    final slider = node.type == StudioNodeType.slider;
    final w = node.width?.fixed;
    final h = slider ? null : node.height?.fixed;
    if (node.minHeight case final min? when min > 0) {
      child = ConstrainedBox(
        constraints: BoxConstraints(minHeight: min),
        child: child,
      );
    }
    if (w != null || h != null) {
      child = SizedBox(width: w, height: h, child: child);
    } else if (node.aspectRatio case final ratio? when ratio > 0 && !slider) {
      child = AspectRatio(aspectRatio: ratio, child: child);
    }
    return child;
  }

  TextStyle _textStyle(WidgetRef ref, Color? color) {
    final font = node.font;
    final family = font?.family;
    final usable =
        family != null &&
        (bundledFonts.contains(family) ||
            ref.watch(remoteFontsProvider).contains(family));
    final size = font?.size;
    return TextStyle(
      color: color,
      fontFamily: usable ? family : null,
      fontSize: size,
      fontWeight: _weight(font?.weight),
      fontStyle: font?.italic == true ? FontStyle.italic : null,
      decoration: _decoration(font),
      height: font?.lineHeight,
      letterSpacing: font?.letterSpacing,
    );
  }

  /// The text shown: the entry's for an element bound to it in a card; in
  /// capitals when it or what holds it asks (107.2).
  String? _text() {
    final text = _ownText();
    return text != null && (scope.uppercase || node.font?.uppercase == true)
        ? text.toUpperCase()
        : text;
  }

  String? _ownText() {
    final entry = scope.entry;
    if (entry != null && node.bind != null) {
      return switch (node.bind!) {
        StudioBind.title => entry.title,
        StudioBind.subtitle => entry.subtitle,
        StudioBind.price => entry.priceLabel,
        StudioBind.badge => entry.badge,
        StudioBind.image => null,
        // 128.8 Drawn with its star by [_StudioRating]; none, nothing.
        StudioBind.rating => entry.rating?.toStringAsFixed(1),
      };
    }
    return node.text;
  }

  Widget _content(BuildContext context, WidgetRef ref, Color? color) {
    final p = context.palette;
    final align = switch (node.textAlign) {
      StudioTextAlign.start => TextAlign.start,
      StudioTextAlign.center => TextAlign.center,
      StudioTextAlign.end => TextAlign.end,
    };
    switch (node.type) {
      case StudioNodeType.row ||
          StudioNodeType.column ||
          StudioNodeType.stack ||
          StudioNodeType.grid:
        return _layout(context, ref);
      case StudioNodeType.slider:
        return _StudioSlider(node: node, scope: scope);
      case StudioNodeType.accordion || StudioNodeType.tabs:
        // 107.3 Questions that open one at a time, or one tab at a time.
        final kids = [
          for (final child in node.children)
            if (shows(child, ref)) child,
        ];
        if (kids.isEmpty) return const SizedBox.shrink();
        final inner = node.font?.uppercase == true ? scope.inCapitals() : scope;
        return node.type == StudioNodeType.accordion
            ? _StudioAccordion(node: node, kids: kids, scope: inner)
            : _StudioTabs(node: node, kids: kids, scope: inner);
      case StudioNodeType.countdown:
        final ends = node.endsAt;
        if (ends == null) return const SizedBox.shrink();
        return _StudioCountdown(
          node: node,
          endsAt: ends,
          endedText: _text(),
          align: align,
        );
      case StudioNodeType.bullets:
        final lines = [
          for (final line in (_text() ?? '').split('\n'))
            if (line.trim().isNotEmpty) line.trim(),
        ];
        if (lines.isEmpty) return const SizedBox.shrink();
        final gap = node.gap > 0 ? node.gap : 8.0;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final (i, line) in lines.indexed) ...[
              if (i > 0) SizedBox(height: gap),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppIcon(
                    node.icon == null
                        ? AppIcons.checkCircle
                        : symbolByName(node.icon),
                    size: node.iconSize == 24 ? 20 : node.iconSize,
                    color: color ?? p.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(child: Text(line, textAlign: align)),
                ],
              ),
            ],
          ],
        );
      case StudioNodeType.spacer:
        return SizedBox(
          height: node.height?.fixed ?? 24,
          width: node.width?.fixed,
        );
      case StudioNodeType.text:
        if (scope.entry?.rating case final rating?
            when node.bind == StudioBind.rating) {
          return _StudioRating(mark: node.text, rating: rating);
        }
        final text = _text();
        if (text == null || text.isEmpty) return const SizedBox.shrink();
        return Text(
          text,
          textAlign: align,
          maxLines: node.maxLines,
          overflow: node.maxLines == null ? null : TextOverflow.ellipsis,
        );
      case StudioNodeType.button:
        final label = _text() ?? '';
        final icon = node.icon == null
            ? null
            : AppIcon(
                symbolByName(node.icon),
                size: math.min(node.iconSize, 40),
                color: color ?? p.onPrimary,
              );
        final background = parseHexColor(
          scope.dark
              ? (node.darkBackground ?? node.background)
              : node.background,
        );
        final row = Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null && node.iconAtStart) ...[
              icon,
              const SizedBox(width: 8),
            ],
            Flexible(
              child: Text(
                label,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: color ?? (background == null ? p.onPrimary : null),
                ),
              ),
            ),
            if (icon != null && !node.iconAtStart) ...[
              const SizedBox(width: 8),
              icon,
            ],
          ],
        );
        // Without its own colours, the app's main colour.
        if (background == null && node.gradient == null) {
          return DecoratedBox(
            decoration: BoxDecoration(
              color: p.primary,
              borderRadius: BorderRadius.circular(
                node.radius > 0 ? node.radius : 12,
              ),
            ),
            child: Padding(
              padding: node.padding == null
                  ? const EdgeInsets.symmetric(horizontal: 20, vertical: 12)
                  : EdgeInsets.zero,
              child: Center(widthFactor: 1, heightFactor: 1, child: row),
            ),
          );
        }
        return Center(
          widthFactor: 1,
          heightFactor: 1,
          child: Padding(
            padding: node.padding == null
                ? const EdgeInsets.symmetric(horizontal: 20, vertical: 12)
                : EdgeInsets.zero,
            child: row,
          ),
        );
      case StudioNodeType.image:
        final entry = scope.entry;
        final url = entry != null && node.bind == StudioBind.image
            ? entry.imageUrl
            : node.imageUrl;
        // 129.1 Growing slowly in a slider's open slide (Ken Burns).
        final image = StudioKenBurns.wrap(
          context,
          AppNetworkImage(
            url: url,
            seed: node.id.hashCode,
            fit: node.contain ? BoxFit.contain : BoxFit.cover,
            width: double.infinity,
            height: node.height?.fixed,
            clearPlaceholder: node.contain,
          ),
        );
        final overlay = _overlayOf(node);
        final scrim = node.scrim;
        final shown = overlay == null && scrim == null
            ? image
            : Stack(
                fit: StackFit.passthrough,
                children: [
                  image,
                  if (overlay != null)
                    Positioned.fill(
                      child: ColoredBox(
                        key: ValueKey('studio-overlay-${node.id}'),
                        color: overlay,
                      ),
                    ),
                  // 128 The shade for the words on it.
                  if (scrim != null) studioScrimLayer(node, scrim),
                ],
              );
        if (node.height?.fixed == null && node.aspectRatio == null) {
          return AspectRatio(aspectRatio: 16 / 9, child: shown);
        }
        return shown;
      case StudioNodeType.icon:
        return AppIcon(
          symbolByName(node.icon),
          size: node.iconSize,
          color: color ?? p.text,
        );
      case StudioNodeType.items:
        // 112.4 What this person opened lately comes from this phone.
        final entries = node.recent
            ? ref.watch(recentlyViewedProvider).take(30).toList()
            : node.items;
        if (node.card == null) {
          return PageBlockView(
            block: _itemsBlock(node, entries),
            pageSlug: scope.pageSlug,
          );
        }
        return _CustomCards(node: node, scope: scope, entries: entries);
      case StudioNodeType.learning:
        return StudioLearningCard(
          section: node.learning!,
          color: color,
          title: node.title,
          dark: scope.dark,
          style: node.learningStyle,
          ownPicture: node.imageBackgroundUrl != null,
        );
      case StudioNodeType.liveStatus:
        final source = node.liveStatus;
        final order = source == null
            ? null
            : watchLiveOrder(context, ref, source);
        if (order == null) return const SizedBox.shrink();
        return StudioLiveStatusCard(node: node, order: order, color: color);
      // 128 The covers are drawn whole by StudioCoverView (build), the live
      // elements from the person's own shipment, ride, taxis and name.
      case StudioNodeType.photoHero || StudioNodeType.mapHeader:
        return const SizedBox.shrink();
      case StudioNodeType.tracking:
        return StudioTrackingView(node: node);
      case StudioNodeType.greeting:
        return const StudioGreetingView();
      case StudioNodeType.school:
        return StudioSchoolPart(
          section: node.school!,
          color: color,
          text: _text(),
          dark: scope.dark,
        );
      case StudioNodeType.market:
        final market = node.market;
        if (market == null) return const SizedBox.shrink();
        return MarketSectionView(node: node, market: market, color: color);
      // 129 Premium motion & media.
      case StudioNodeType.stories:
        return StudioStoriesRow(node: node, scope: scope);
      case StudioNodeType.marquee:
        return StudioMarquee(node: node, color: color);
      case StudioNodeType.gallery:
        return StudioGallery(node: node);
      case StudioNodeType.beforeAfter:
        return StudioBeforeAfter(node: node);
      case StudioNodeType.segments:
        return StudioSegments(node: node, color: color);
      // Drawn by [StudioMediaCover] in [build].
      case StudioNodeType.videoHero || StudioNodeType.parallaxBanner:
        return const SizedBox.shrink();
      case StudioNodeType.coupon:
        return _StudioCoupon(
          code: node.code ?? '',
          color: color ?? p.primary,
          radius: node.radius > 0 ? node.radius : 12,
        );
      case StudioNodeType.categories:
        return PageBlockView(
          block: _categoriesBlock(node),
          pageSlug: scope.pageSlug,
        );
      case StudioNodeType.video:
        final url = node.videoUrl;
        if (url == null) return const SizedBox.shrink();
        return PageBlockView(
          block: VideoBlock(id: node.id, url: url),
          pageSlug: scope.pageSlug,
        );
      case StudioNodeType.form:
        return PageBlockView(block: node.form!, pageSlug: scope.pageSlug);
      case StudioNodeType.map:
        final place = node.map;
        if (place == null) return const SizedBox.shrink();
        return PageBlockView(
          block: MapBlock(
            id: node.id,
            latitude: place.lat,
            longitude: place.lng,
            name: place.label,
          ),
          pageSlug: scope.pageSlug,
        );
      case StudioNodeType.ratings:
        return _Ratings(node: node, color: color, align: node.textAlign);
      case StudioNodeType.search:
        return PageBlockView(
          block: _searchBlock(node, node.text ?? context.l10n.headerSearch),
          pageSlug: scope.pageSlug,
        );
      case StudioNodeType.divider:
        return Divider(
          height: math.max(1, node.borderWidth),
          thickness: math.max(1, node.borderWidth),
          color: color ?? parseHexColor(node.borderColor) ?? p.divider,
        );
      // 129.11–129.20 The premium elements (premium/studio_premium.dart); a
      // profile card's own elements under the person, as a column.
      case StudioNodeType.testimonials ||
          StudioNodeType.pricing ||
          StudioNodeType.stats ||
          StudioNodeType.progress ||
          StudioNodeType.timeline ||
          StudioNodeType.bento ||
          StudioNodeType.badgeText ||
          StudioNodeType.ctaBar ||
          StudioNodeType.profileCard:
        final inner = node.type == StudioNodeType.profileCard
            ? StudioNode(
                id: '${node.id}-inner',
                type: StudioNodeType.column,
                children: node.children,
                gap: node.gap,
                align: node.align,
                cross: node.cross,
              )
            : null;
        return studioPremiumContent(
              node,
              dark: scope.dark,
              front: inner == null || inner.children.isEmpty
                  ? null
                  : StudioNodeView(node: inner, scope: scope, parent: node),
            ) ??
            const SizedBox.shrink();
    }
  }

  /// Rows, columns, layers and grids.
  Widget _layout(BuildContext context, WidgetRef ref) {
    final kids = [
      for (final child in node.children)
        if (shows(child, ref)) child,
    ];
    if (kids.isEmpty) return const SizedBox.shrink();
    final inner = node.font?.uppercase == true ? scope.inCapitals() : scope;
    Widget view(StudioNode child) =>
        StudioNodeView(node: child, scope: inner, parent: node);
    switch (node.type) {
      case StudioNodeType.stack:
        return Stack(
          alignment: _stackAlign(node.cross),
          children: [
            for (final (i, child) in kids.indexed)
              // 112.4 A spot on a picture: its own point at the same share
              // of it sits at its place.
              if (child.place case final place?)
                Positioned.fill(
                  child: Align(
                    key: ValueKey('studio-place-${child.id}'),
                    alignment: AlignmentDirectional(
                      place.x / 50 - 1,
                      place.y / 50 - 1,
                    ),
                    child: view(child),
                  ),
                )
              else if (i > 0 &&
                  child.width?.fill != false &&
                  child.height?.fill == true)
                Positioned.fill(child: view(child))
              else
                Align(
                  alignment: _stackAlign(child.selfAlign ?? node.cross),
                  widthFactor: 1,
                  heightFactor: 1,
                  child: view(child),
                ),
          ],
        );
      case StudioNodeType.grid:
        final columns = node.columns;
        final rows = <Widget>[];
        for (var i = 0; i < kids.length; i += columns) {
          final cells = kids.sublist(i, math.min(i + columns, kids.length));
          rows.add(
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (var c = 0; c < columns; c++) ...[
                    if (c > 0) SizedBox(width: node.gap),
                    Expanded(
                      child: c < cells.length
                          ? view(cells[c])
                          : const SizedBox.shrink(),
                    ),
                  ],
                ],
              ),
            ),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final (i, row) in rows.indexed) ...[
              if (i > 0) SizedBox(height: node.gap),
              row,
            ],
          ],
        );
      case StudioNodeType.row when node.scroll:
        // 107.2 Scrolls sideways: each child keeps its own width.
        final tall =
            node.cross == StudioCross.stretch ||
            kids.any((k) => k.height?.fill == true);
        final strip = Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: tall
              ? CrossAxisAlignment.stretch
              : _cross(node.cross),
          children: _spaced([
            for (final child in kids)
              _selfAlign(child, view(child), Axis.vertical),
          ], horizontal: true),
        );
        return SingleChildScrollView(
          key: ValueKey('studio-scroll-${node.id}'),
          scrollDirection: Axis.horizontal,
          child: tall && node.height?.fixed == null
              ? IntrinsicHeight(child: strip)
              : strip,
        );
      case StudioNodeType.row:
        final stretch =
            node.cross == StudioCross.stretch ||
            kids.any((k) => k.height?.fill == true);
        final givesWay = studioTextGivingWay(kids);
        final row = Row(
          mainAxisAlignment: _main(node.align),
          crossAxisAlignment: stretch
              ? CrossAxisAlignment.stretch
              : _cross(node.cross),
          children: _spaced([
            for (final child in kids)
              if (child.width?.fill == true)
                Expanded(child: _selfAlign(child, view(child), Axis.vertical))
              // 128.8 In a row where nothing fills, a text cut to its lines
              // gives way to what follows it (a teacher's name before the
              // rating), never overflowing; 128.10 only the row's one such
              // text (studioTextGivingWay).
              else if (identical(child, givesWay))
                Flexible(child: _selfAlign(child, view(child), Axis.vertical))
              else
                _selfAlign(child, view(child), Axis.vertical),
          ], horizontal: true),
        );
        // Stretching to the tallest needs the row's height first.
        final laid = stretch && node.height?.fixed == null
            ? IntrinsicHeight(child: row)
            : row;
        // 128.10 In a row of unbounded width (one inside another row) the
        // text has no room to give way in: the row at its own width there.
        return givesWay == null ? laid : _BoundedWidth(child: laid);
      default:
        // A column; its height is set when it's fixed, so children can fill it.
        final bounded = node.height?.fixed != null;
        return Column(
          mainAxisSize: bounded ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: _main(node.align),
          crossAxisAlignment: _cross(node.cross),
          children: _spaced([
            for (final child in kids)
              if (bounded && child.height?.fill == true)
                Expanded(child: _selfAlign(child, view(child), Axis.horizontal))
              else
                _selfAlign(child, view(child), Axis.horizontal),
          ], horizontal: false),
        );
    }
  }

  /// An element across its parent: its own alignment, else hugging its
  /// content when its size across says so.
  Widget _selfAlign(StudioNode child, Widget view, Axis across) {
    final size = across == Axis.horizontal ? child.width : child.height;
    final self = child.selfAlign;
    if (self == null && (size == null || size.fill)) return view;
    if (self == StudioCross.stretch) return view;
    final at = self ?? StudioCross.start;
    return Align(
      alignment: across == Axis.horizontal
          ? switch (at) {
              StudioCross.center => AlignmentDirectional.center,
              StudioCross.end => AlignmentDirectional.centerEnd,
              _ => AlignmentDirectional.centerStart,
            }
          : switch (at) {
              StudioCross.center => Alignment.center,
              StudioCross.end => Alignment.bottomCenter,
              _ => Alignment.topCenter,
            },
      widthFactor: across == Axis.vertical ? 1 : null,
      heightFactor: across == Axis.horizontal ? 1 : null,
      child: view,
    );
  }

  List<Widget> _spaced(List<Widget> children, {required bool horizontal}) {
    if (node.gap <= 0 ||
        node.align == StudioAlign.between ||
        node.align == StudioAlign.around) {
      return children;
    }
    return [
      for (final (i, child) in children.indexed) ...[
        if (i > 0)
          SizedBox(
            width: horizontal ? node.gap : null,
            height: horizontal ? null : node.gap,
          ),
        child,
      ],
    ];
  }
}

ItemsBlock _itemsBlock(StudioNode node, [List<PageItem>? entries]) =>
    ItemsBlock(
      id: node.id,
      // 112.4 A list's own title (what was seen lately), hidden with it.
      title: node.title,
      source: node.source,
      layout: node.layout,
      items: entries ?? node.items,
    );

CategoriesBlock _categoriesBlock(StudioNode node) => CategoriesBlock(
  id: node.id,
  source: node.source,
  categories: node.categories,
  style: node.categoriesStyle,
  columns: node.columns,
);

SearchBlock _searchBlock(StudioNode node, String placeholder) =>
    SearchBlock(id: node.id, source: node.source, placeholder: placeholder);

EdgeInsetsDirectional? _insets(StudioSides? s) {
  if (s == null) return null;
  if (s.top == 0 && s.end == 0 && s.bottom == 0 && s.start == 0) return null;
  return EdgeInsetsDirectional.fromSTEB(s.start, s.top, s.end, s.bottom);
}

LinearGradient _linear(StudioGradient g, Color? fallback) {
  final from = parseHexColor(g.from) ?? fallback ?? Colors.transparent;
  final to = parseHexColor(g.to) ?? from;
  // CSS angles: 0 points up, 90 to the right, 180 down.
  final radians = (g.angle - 90) * math.pi / 180;
  final dx = math.cos(radians);
  final dy = math.sin(radians);
  return LinearGradient(
    begin: Alignment(-dx, -dy),
    end: Alignment(dx, dy),
    colors: [from, to],
  );
}

/// 107.2 Each corner on its own, else [StudioNode.radius] for all four.
BorderRadiusGeometry _radiusOf(StudioNode node) {
  final k = node.corners;
  if (k == null) return BorderRadius.circular(node.radius);
  return BorderRadiusDirectional.only(
    topStart: Radius.circular(k.topStart),
    topEnd: Radius.circular(k.topEnd),
    bottomEnd: Radius.circular(k.bottomEnd),
    bottomStart: Radius.circular(k.bottomStart),
  );
}

/// 107.2 The colour over the element's picture, with its strength.
Color? _overlayOf(StudioNode node) {
  final o = node.overlay;
  if (o == null || o.opacity <= 0) return null;
  return parseHexColor(o.color)?.withValues(alpha: o.opacity);
}

/// Underlined, struck through (107.2), both or neither.
TextDecoration? _decoration(StudioFont? font) {
  final lines = [
    if (font?.underline == true) TextDecoration.underline,
    if (font?.strike == true) TextDecoration.lineThrough,
  ];
  return lines.isEmpty ? null : TextDecoration.combine(lines);
}

List<BoxShadow>? _shadow(StudioShadow shadow) => switch (shadow) {
  StudioShadow.none => null,
  StudioShadow.light => const [
    BoxShadow(color: Color(0x1A0E0D24), blurRadius: 6, offset: Offset(0, 2)),
  ],
  StudioShadow.medium => const [
    BoxShadow(color: Color(0x380E0D24), blurRadius: 14, offset: Offset(0, 6)),
  ],
  StudioShadow.strong => const [
    BoxShadow(color: Color(0x4D0E0D24), blurRadius: 30, offset: Offset(0, 14)),
  ],
};

FontWeight? _weight(int? weight) => switch (weight) {
  null => null,
  >= 900 => FontWeight.w900,
  >= 800 => FontWeight.w800,
  >= 700 => FontWeight.w700,
  >= 600 => FontWeight.w600,
  >= 500 => FontWeight.w500,
  >= 400 => FontWeight.w400,
  _ => FontWeight.w300,
};

MainAxisAlignment _main(StudioAlign align) => switch (align) {
  StudioAlign.start => MainAxisAlignment.start,
  StudioAlign.center => MainAxisAlignment.center,
  StudioAlign.end => MainAxisAlignment.end,
  StudioAlign.between => MainAxisAlignment.spaceBetween,
  StudioAlign.around => MainAxisAlignment.spaceAround,
};

CrossAxisAlignment _cross(StudioCross cross) => switch (cross) {
  StudioCross.start => CrossAxisAlignment.start,
  StudioCross.center => CrossAxisAlignment.center,
  StudioCross.end => CrossAxisAlignment.end,
  StudioCross.stretch => CrossAxisAlignment.stretch,
};

AlignmentDirectional _stackAlign(StudioCross cross) => switch (cross) {
  StudioCross.start => AlignmentDirectional.topStart,
  StudioCross.center => AlignmentDirectional.center,
  StudioCross.end => AlignmentDirectional.bottomEnd,
  StudioCross.stretch => AlignmentDirectional.topStart,
};

/// 128.10 The one text in a row that gives way to what follows it: the
/// row's only text cut to its lines without a width of its own, when
/// nothing in the row fills it (Studio's canvas: components/studio/
/// view.tsx `textGivingWay`). With two such texts, or none, none does and
/// the row is as before.
StudioNode? studioTextGivingWay(List<StudioNode> kids) {
  if (kids.any((k) => k.width?.fill == true)) return null;
  final texts = [
    for (final k in kids)
      if (k.type == StudioNodeType.text &&
          k.maxLines != null &&
          k.width?.fixed == null)
        k,
  ];
  return texts.length == 1 ? texts.single : null;
}

/// 128.10 What it holds at its own width when the width around it is
/// unbounded (a row inside another row), so a [Flexible] in it has a bound;
/// within a bounded width, as given. Unlike a LayoutBuilder it answers its
/// intrinsic sizes (a row in a grid's or a card's IntrinsicHeight).
class _BoundedWidth extends SingleChildRenderObjectWidget {
  const _BoundedWidth({required Widget super.child});

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderBoundedWidth();
}

class _RenderBoundedWidth extends RenderProxyBox {
  BoxConstraints _inner(BoxConstraints constraints) {
    if (constraints.hasBoundedWidth || child == null) return constraints;
    final natural = child!.getMaxIntrinsicWidth(constraints.maxHeight);
    return constraints.copyWith(
      maxWidth: math.max(natural, constraints.minWidth),
    );
  }

  @override
  Size computeDryLayout(covariant BoxConstraints constraints) {
    final child = this.child;
    if (child == null) return constraints.smallest;
    return constraints.constrain(child.getDryLayout(_inner(constraints)));
  }

  @override
  void performLayout() {
    final child = this.child;
    if (child == null) {
      size = constraints.smallest;
      return;
    }
    child.layout(_inner(constraints), parentUsesSize: true);
    size = constraints.constrain(child.size);
  }
}

// ------------------------------------------------------------ Lists, stars

/// A list whose card the owner designed: the card for each entry, its
/// bound elements filled from the entry; a tap opens the entry.
class _CustomCards extends ConsumerWidget {
  const _CustomCards({
    required this.node,
    required this.scope,
    required this.entries,
  });

  final StudioNode node;
  final StudioScope scope;

  /// The list's entries (112.4 or what this person opened lately).
  final List<PageItem> entries;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final card = node.card!;
    Widget cardOf(PageItem entry) => StudioNodeView(
      key: ValueKey('studio-card-${node.id}-${entry.id}'),
      node: card,
      scope: scope.withEntry(entry),
      parent: null,
    );
    final gap = node.gap > 0 ? node.gap : 10.0;
    switch (node.layout) {
      case ItemsLayout.list:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final (i, entry) in entries.indexed) ...[
              if (i > 0) SizedBox(height: gap),
              cardOf(entry),
            ],
          ],
        );
      case ItemsLayout.carousel:
        final width = card.width?.fixed ?? 160;
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final (i, entry) in entries.indexed) ...[
                if (i > 0) SizedBox(width: gap),
                SizedBox(width: width, child: cardOf(entry)),
              ],
            ],
          ),
        );
      case ItemsLayout.grid:
        final columns = node.columns;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < entries.length; i += columns) ...[
              if (i > 0) SizedBox(height: gap),
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var c = 0; c < columns; c++) ...[
                      if (c > 0) SizedBox(width: gap),
                      Expanded(
                        child: i + c < entries.length
                            ? cardOf(entries[i + c])
                            : const SizedBox.shrink(),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ],
        );
    }
  }
}

class _Ratings extends StatelessWidget {
  const _Ratings({
    required this.node,
    required this.color,
    required this.align,
  });

  final StudioNode node;
  final Color? color;
  final StudioTextAlign align;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final rating = (node.rating ?? 5).clamp(0, 5).toDouble();
    final size = node.font?.size ?? 16;
    final stars = [
      for (var i = 1; i <= 5; i++)
        AppIcon(
          AppIcons.star,
          size: size + 2,
          filled: rating >= i - 0.25,
          color: rating >= i - 0.75 ? p.star : p.textTertiary,
        ),
    ];
    final text = node.text;
    return Semantics(
      label: [context.l10n.ratingOutOfFive(rating.round()), ?text].join(', '),
      excludeSemantics: true,
      child: Row(
        mainAxisAlignment: switch (align) {
          StudioTextAlign.start => MainAxisAlignment.start,
          StudioTextAlign.center => MainAxisAlignment.center,
          StudioTextAlign.end => MainAxisAlignment.end,
        },
        children: [
          ...stars,
          if (text != null && text.isNotEmpty) ...[
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: color, fontSize: size),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ------------------------------------------------------------------ Slider

/// Its elements side by side, swiped; one or more at a time, going on by
/// itself when the owner chose so, and where it is shown (112.4): dots
/// under it, a line per slide over its bottom (the open one filling while
/// it waits) or "2 / 5" over its corner. Its height is its own, or (112.4)
/// from its width and shape.
class _StudioSlider extends ConsumerStatefulWidget {
  const _StudioSlider({required this.node, required this.scope});

  final StudioNode node;
  final StudioScope scope;

  @override
  ConsumerState<_StudioSlider> createState() => _StudioSliderState();
}

class _StudioSliderState extends ConsumerState<_StudioSlider>
    with SingleTickerProviderStateMixin {
  late final PageController _controller = PageController(
    viewportFraction: 1 / widget.node.perView,
  );
  Timer? _timer;
  int _page = 0;

  /// Counts the slides' turns, so the open slide's line starts again.
  int _turn = 0;

  /// 129.1 The open slide's photo growing slowly (Ken Burns), started again
  /// on each slide.
  late final AnimationController? _zoom = widget.node.kenBurns
      ? AnimationController(
          vsync: this,
          duration: Duration(
            milliseconds: widget.node.autoplay
                ? widget.node.intervalMs + 600
                : 8000,
          ),
        )
      : null;

  @override
  void initState() {
    super.initState();
    _wait();
    _zoomAgain();
  }

  void _zoomAgain() {
    final zoom = _zoom;
    if (zoom == null) return;
    zoom.value = 0;
    if (widget.node.autoplay) {
      zoom.forward();
    } else {
      zoom.repeat(reverse: true);
    }
  }

  /// The next slide after the owner's seconds; a swipe starts them again.
  void _wait() {
    _timer?.cancel();
    if (!widget.node.autoplay) return;
    _timer = Timer.periodic(
      Duration(milliseconds: widget.node.intervalMs),
      (_) => _next(),
    );
  }

  bool get _moving =>
      widget.node.autoplay && !MediaQuery.disableAnimationsOf(context);

  void _next() {
    if (!mounted || !_controller.hasClients) return;
    if (MediaQuery.disableAnimationsOf(context)) return;
    // 129.1 Still while it is off the screen.
    if (!studioOnScreen(context)) return;
    final count = _kids.length;
    if (count < 2) return;
    final next = (_page + 1) % count;
    _controller.animateToPage(
      next,
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeOutCubic,
    );
  }

  List<StudioNode> get _kids => [
    for (final child in widget.node.children)
      if (StudioNodeView.shows(child, ref)) child,
  ];

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    _zoom?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final kids = _kids;
    if (kids.isEmpty) return const SizedBox.shrink();
    final node = widget.node;
    final shown = node.dots && kids.length > 1 ? node.indicator : null;
    return LayoutBuilder(
      builder: (context, constraints) {
        final ratio = node.aspectRatio;
        final height =
            node.height?.fixed ??
            (ratio != null && ratio > 0 && constraints.maxWidth.isFinite
                ? constraints.maxWidth / ratio
                : 180.0);
        final pages = PageView.builder(
          controller: _controller,
          padEnds: false,
          itemCount: kids.length,
          onPageChanged: (i) => setState(() {
            _page = i;
            _turn++;
            _wait();
            _zoomAgain();
          }),
          itemBuilder: (context, i) => Padding(
            padding: EdgeInsetsDirectional.only(
              end: i < kids.length - 1 ? node.gap : 0,
            ),
            // 129.1 The open slide's photo zooms slowly.
            child: StudioKenBurns(
              zoom: i == _page ? _zoom : null,
              child: StudioNodeView(
                node: kids[i],
                scope: widget.scope,
                parent: node,
              ),
            ),
          ),
        );
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: height,
              child: _counted(switch (shown) {
                StudioIndicator.progress => Stack(
                  children: [
                    Positioned.fill(child: pages),
                    // 129.1 At the top or the foot, as far from it as set.
                    PositionedDirectional(
                      start: 16,
                      end: 16 + node.gap,
                      top: node.indicatorTop ? node.indicatorInset : null,
                      bottom: node.indicatorTop ? null : node.indicatorInset,
                      child: SliderLines(
                        key: ValueKey('studio-lines-${node.id}'),
                        count: kids.length,
                        page: _page,
                        turn: _turn,
                        wait: _moving
                            ? Duration(milliseconds: node.intervalMs)
                            : null,
                        fill:
                            parseHexColor(node.indicatorColor) ?? Colors.white,
                      ),
                    ),
                  ],
                ),
                // 129.1 The dots in a frosted pill over the slides' foot.
                StudioIndicator.pill => Stack(
                  children: [
                    Positioned.fill(child: pages),
                    PositionedDirectional(
                      start: 0,
                      end: node.gap,
                      top: node.indicatorTop ? node.indicatorInset : null,
                      bottom: node.indicatorTop ? null : node.indicatorInset,
                      child: Center(
                        child: StudioSliderPill(
                          key: ValueKey('studio-pill-${node.id}'),
                          count: kids.length,
                          page: _page,
                          color: parseHexColor(node.indicatorColor),
                        ),
                      ),
                    ),
                  ],
                ),
                StudioIndicator.count => Stack(
                  children: [
                    Positioned.fill(child: pages),
                    PositionedDirectional(
                      top: 10,
                      end: 10 + node.gap,
                      child: SliderCount(
                        key: ValueKey('studio-count-${node.id}'),
                        page: _page,
                        count: kids.length,
                      ),
                    ),
                  ],
                ),
                _ => pages,
              }, kids.length),
            ),
            if (shown == StudioIndicator.dots) ...[
              const SizedBox(height: 8),
              _SliderDots(count: kids.length, page: _page),
            ],
          ],
        );
      },
    );
  }
}

extension on _StudioSliderState {
  /// 129.1 "1/3" or "01/03" at the end side beside the indicator.
  Widget _counted(Widget slides, int count) {
    final node = widget.node;
    final padded = node.slideCount;
    if (padded == null || count < 2) return slides;
    String n(int i) => padded ? '$i'.padLeft(2, '0') : '$i';
    final at = node.indicatorInset + 18;
    return Stack(
      children: [
        Positioned.fill(child: slides),
        PositionedDirectional(
          end: 16 + node.gap,
          top: node.indicatorTop ? at : null,
          bottom: node.indicatorTop ? null : at,
          child: ExcludeSemantics(
            child: Text(
              '${n(_page + 1)}/${n(count)}',
              key: ValueKey('studio-slide-count-${node.id}'),
              textDirection: TextDirection.ltr,
              style: TextStyle(
                color: parseHexColor(node.indicatorColor) ?? Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _SliderDots extends StatelessWidget {
  const _SliderDots({required this.count, required this.page});

  final int count;
  final int page;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return ExcludeSemantics(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (var i = 0; i < count; i++)
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: i == page ? 16 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: i == page ? p.primary : p.border,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
        ],
      ),
    );
  }
}

/// 112.4 A line per slide over the slides: the ones seen full, the open one
/// filling while it waits (full when the slider doesn't move by itself).
class SliderLines extends StatelessWidget {
  const SliderLines({
    super.key,
    required this.count,
    required this.page,
    required this.turn,
    required this.wait,
    this.fill = const Color(0xFFFFFFFF),
  });

  final int count;
  final int page;
  final int turn;
  final Duration? wait;

  /// 129.1 The open and seen slides' lines; missing, white.
  final Color fill;

  @override
  Widget build(BuildContext context) {
    Widget line(double filled) => ClipRRect(
      borderRadius: BorderRadius.circular(2),
      child: SizedBox(
        height: 3,
        child: Stack(
          fit: StackFit.expand,
          children: [
            const ColoredBox(color: Color(0x73FFFFFF)),
            FractionallySizedBox(
              alignment: AlignmentDirectional.centerStart,
              widthFactor: filled,
              child: ColoredBox(color: fill),
            ),
          ],
        ),
      ),
    );
    return ExcludeSemantics(
      child: Row(
        children: [
          for (var i = 0; i < count; i++) ...[
            if (i > 0) const SizedBox(width: 4),
            Expanded(
              child: i == page && wait != null
                  ? TweenAnimationBuilder<double>(
                      key: ValueKey('turn-$turn'),
                      tween: Tween(begin: 0, end: 1),
                      duration: wait!,
                      builder: (context, value, _) => line(value),
                    )
                  : line(i <= page ? 1 : 0),
            ),
          ],
        ],
      ),
    );
  }
}

/// 112.4 "2 / 5" over the slides' corner.
class SliderCount extends StatelessWidget {
  const SliderCount({super.key, required this.page, required this.count});

  final int page;
  final int count;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: const Color(0x8C0E0D24),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      child: Text(
        '${page + 1} / $count',
        textDirection: TextDirection.ltr,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w700,
          fontFeatures: [FontFeature.tabularFigures()],
        ),
      ),
    ),
  );
}

// ------------------------------------------------------------------ Coupon

/// 112.4 A code in a dashed frame; a tap copies it.
class _StudioCoupon extends StatelessWidget {
  const _StudioCoupon({
    required this.code,
    required this.color,
    required this.radius,
  });

  final String code;
  final Color color;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    return Semantics(
      button: true,
      label: '${l10n.copyCode}, $code',
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
          child: CustomPaint(
            painter: _DashedFrame(color: color, radius: radius),
            child: Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(14, 6, 6, 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      code,
                      textDirection: TextDirection.ltr,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: color,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 2,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(
                        math.max(4, radius - 4),
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
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

class _DashedFrame extends CustomPainter {
  const _DashedFrame({required this.color, required this.radius});

  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    final frame = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          (Offset.zero & size).deflate(0.75),
          Radius.circular(radius),
        ),
      );
    for (final metric in frame.computeMetrics()) {
      for (var at = 0.0; at < metric.length; at += 9) {
        canvas.drawPath(metric.extractPath(at, at + 5), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedFrame old) =>
      old.color != color || old.radius != radius;
}

// ------------------------------------------------------------------ Motion

/// A tappable element; shrinks or bounces while pressed when the owner
/// chose so.
class _Pressable extends StatefulWidget {
  const _Pressable({
    required this.press,
    required this.radius,
    required this.label,
    required this.onTap,
    required this.child,
  });

  final StudioPress press;
  final BorderRadius radius;
  final String? label;
  final VoidCallback onTap;
  final Widget child;

  @override
  State<_Pressable> createState() => _PressableState();
}

class _PressableState extends State<_Pressable> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final still =
        widget.press == StudioPress.none ||
        MediaQuery.disableAnimationsOf(context);
    final scale = !_down || still
        ? 1.0
        : widget.press == StudioPress.shrink
        ? 0.95
        : 0.9;
    return Semantics(
      button: true,
      label: widget.label,
      child: AnimatedScale(
        scale: scale,
        duration: Duration(
          milliseconds: widget.press == StudioPress.bounce ? 160 : 100,
        ),
        curve: widget.press == StudioPress.bounce
            ? Curves.elasticOut
            : Curves.easeOut,
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            borderRadius: widget.radius,
            onTap: widget.onTap,
            onHighlightChanged: (down) => setState(() => _down = down),
            child: widget.child,
          ),
        ),
      ),
    );
  }
}

/// How an element comes in when the page shows, and moves again and again.
class _Moving extends StatefulWidget {
  const _Moving({required this.motion, required this.child});

  final StudioMotion motion;
  final Widget child;

  @override
  State<_Moving> createState() => _MovingState();
}

class _MovingState extends State<_Moving> with TickerProviderStateMixin {
  late final AnimationController _enter = AnimationController(
    vsync: this,
    duration: Duration(milliseconds: widget.motion.durationMs),
    value: widget.motion.enter == StudioEnter.none ? 1 : 0,
  );
  late final AnimationController _loop = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );
  Timer? _delay;

  @override
  void initState() {
    super.initState();
    if (widget.motion.loop != StudioLoop.none) _loop.repeat();
  }

  /// 129.8 The entrance plays once, when the element first comes onto the
  /// screen (as the page scrolls to it), after its wait.
  void _shown() {
    if (widget.motion.enter == StudioEnter.none || _delay != null) return;
    _delay = Timer(Duration(milliseconds: widget.motion.delayMs), () {
      if (mounted) _enter.forward();
    });
  }

  @override
  void dispose() {
    _delay?.cancel();
    _enter.dispose();
    _loop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final moving = AnimatedBuilder(
      animation: Listenable.merge([_enter, _loop]),
      child: widget.child,
      builder: (context, child) {
        final t = Curves.easeOutCubic.transform(_enter.value);
        var dx = 0.0;
        var dy = 0.0;
        var scale = 1.0;
        var opacity = 1.0;
        switch (widget.motion.enter) {
          case StudioEnter.none:
            break;
          case StudioEnter.fade:
            opacity = t;
          case StudioEnter.slideUp:
            opacity = t;
            dy = 24 * (1 - t);
          case StudioEnter.slideDown:
            opacity = t;
            dy = -24 * (1 - t);
          case StudioEnter.slideStart:
            opacity = t;
            dx = (rtl ? 24 : -24) * (1 - t);
          case StudioEnter.slideEnd:
            opacity = t;
            dx = (rtl ? -24 : 24) * (1 - t);
          case StudioEnter.zoom:
            opacity = t;
            scale = 0.85 + 0.15 * t;
        }
        final wave = math.sin(_loop.value * 2 * math.pi);
        switch (widget.motion.loop) {
          case StudioLoop.none:
            break;
          case StudioLoop.pulse:
            scale *= 1 + 0.04 * wave;
          case StudioLoop.float:
            dy += -6 * (wave + 1) / 2;
          case StudioLoop.shake:
            // A short shake, then still for the rest of the loop.
            dx += _loop.value < 0.3
                ? 4 * math.sin(_loop.value / 0.3 * 6 * math.pi)
                : 0;
        }
        return Opacity(
          opacity: opacity.clamp(0, 1),
          child: Transform.translate(
            offset: Offset(dx, dy),
            child: Transform.scale(scale: scale, child: child),
          ),
        );
      },
    );
    if (widget.motion.enter == StudioEnter.none) return moving;
    return StudioFirstShown(onShown: _shown, child: moving);
  }
}

/// 107.3 Questions that open one at a time: each child's `title` is its
/// question, the child its answer.
class _StudioAccordion extends StatefulWidget {
  const _StudioAccordion({
    required this.node,
    required this.kids,
    required this.scope,
  });

  final StudioNode node;
  final List<StudioNode> kids;
  final StudioScope scope;

  @override
  State<_StudioAccordion> createState() => _StudioAccordionState();
}

class _StudioAccordionState extends State<_StudioAccordion> {
  int? _open;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final still = MediaQuery.disableAnimationsOf(context);
    final gap = widget.node.gap;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, child) in widget.kids.indexed) ...[
          if (i > 0 && gap > 0) SizedBox(height: gap),
          DecoratedBox(
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: p.divider.withValues(alpha: 0.6)),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Semantics(
                  button: true,
                  expanded: _open == i,
                  child: InkWell(
                    key: ValueKey('studio-question-${child.id}'),
                    onTap: () => setState(() => _open = _open == i ? null : i),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              _titleIn(child, widget.scope, i),
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          AnimatedRotation(
                            turns: _open == i ? 0.5 : 0,
                            duration: still
                                ? Duration.zero
                                : const Duration(milliseconds: 200),
                            child: const AppIcon(AppIcons.expand, size: 22),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                AnimatedSize(
                  duration: still
                      ? Duration.zero
                      : const Duration(milliseconds: 200),
                  alignment: AlignmentDirectional.topStart,
                  child: _open == i
                      ? StudioNodeView(
                          node: child,
                          scope: widget.scope,
                          parent: widget.node,
                        )
                      : const SizedBox(width: double.infinity),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// 107.3 One child at a time under a bar of their `title`s.
class _StudioTabs extends StatefulWidget {
  const _StudioTabs({
    required this.node,
    required this.kids,
    required this.scope,
  });

  final StudioNode node;
  final List<StudioNode> kids;
  final StudioScope scope;

  @override
  State<_StudioTabs> createState() => _StudioTabsState();
}

class _StudioTabsState extends State<_StudioTabs> {
  int _shown = 0;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final shown = _shown.clamp(0, widget.kids.length - 1);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final (i, child) in widget.kids.indexed) ...[
                if (i > 0) const SizedBox(width: 6),
                Semantics(
                  selected: i == shown,
                  button: true,
                  child: Material(
                    color: i == shown
                        ? p.primary
                        : p.text.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(999),
                    child: InkWell(
                      key: ValueKey('studio-tab-${child.id}'),
                      borderRadius: BorderRadius.circular(999),
                      onTap: () => setState(() => _shown = i),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 7,
                        ),
                        child: Text(
                          _titleIn(child, widget.scope, i),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: i == shown
                                ? FontWeight.w700
                                : FontWeight.w400,
                            color: i == shown ? p.onPrimary : null,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        SizedBox(height: widget.node.gap > 0 ? widget.node.gap : 10),
        KeyedSubtree(
          key: ValueKey('studio-tab-panel-${widget.kids[shown].id}'),
          child: StudioNodeView(
            node: widget.kids[shown],
            scope: widget.scope,
            parent: widget.node,
          ),
        ),
      ],
    );
  }
}

/// A child's question or tab name; its place when it has none.
String _titleIn(StudioNode child, StudioScope scope, int i) {
  final title = child.title?.trim() ?? '';
  final shown = title.isEmpty ? '${i + 1}' : title;
  return scope.uppercase ? shown.toUpperCase() : shown;
}

/// 107.3 Days, hours, minutes and seconds left; the owner's text once the
/// time is up, or nothing.
class _StudioCountdown extends ConsumerStatefulWidget {
  const _StudioCountdown({
    required this.node,
    required this.endsAt,
    required this.endedText,
    required this.align,
  });

  final StudioNode node;
  final DateTime endsAt;
  final String? endedText;
  final TextAlign align;

  @override
  ConsumerState<_StudioCountdown> createState() => _StudioCountdownState();
}

class _StudioCountdownState extends ConsumerState<_StudioCountdown> {
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
    final l10n = context.l10n;
    final left = widget.endsAt.difference(ref.watch(pageClockProvider)());
    if (left.isNegative || left == Duration.zero) {
      _timer?.cancel();
      final text = widget.endedText?.trim() ?? '';
      if (text.isEmpty) return const SizedBox.shrink();
      return Text(
        text,
        key: ValueKey('studio-countdown-ended-${widget.node.id}'),
        textAlign: widget.align,
      );
    }
    final units = [
      (left.inDays, l10n.countdownDays),
      (left.inHours % 24, l10n.countdownHours),
      (left.inMinutes % 60, l10n.countdownMinutes),
      (left.inSeconds % 60, l10n.countdownSeconds),
    ];
    final ink =
        DefaultTextStyle.of(context).style.color ?? context.palette.text;
    return Semantics(
      label: units.map((u) => '${u.$1} ${u.$2}').join(', '),
      excludeSemantics: true,
      child: Row(
        key: ValueKey('studio-countdown-${widget.node.id}'),
        // Days on the left in every language, like a clock.
        textDirection: TextDirection.ltr,
        children: [
          for (final (i, u) in units.indexed) ...[
            if (i > 0) const SizedBox(width: 8),
            Expanded(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: ink.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    vertical: 8,
                    horizontal: 4,
                  ),
                  child: Column(
                    children: [
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          u.$1.toString().padLeft(2, '0'),
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            fontFeatures: [FontFeature.tabularFigures()],
                          ),
                        ),
                      ),
                      Text(
                        u.$2,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          color: ink.withValues(alpha: 0.75),
                        ),
                      ),
                    ],
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
