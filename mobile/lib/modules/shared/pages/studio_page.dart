import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/fonts/remote_fonts.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import 'app_header.dart';
import 'content_blocks.dart' show pageClockProvider;
import 'page_actions.dart';
import 'page_blocks.dart';
import 'side_menu.dart';

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
  });

  final StudioPage page;
  final String pageSlug;
  final bool pushed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
    final overlay = header?.type == StudioHeaderType.transparent;
    // Elements pinned at the top or bottom of the page's own column.
    final body = page.body;
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
        top: header == null || overlay ? top : 0,
        bottom: 16,
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
          Positioned.fill(child: list),
          if (overlay)
            PositionedDirectional(
              top: 0,
              start: 0,
              end: 0,
              child: StudioHeaderView(header: header!, top: top, scope: scope),
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
  });

  final String pageSlug;
  final bool dark;
  final PageItem? entry;

  /// 107.2 Texts in capitals, as the element holding them asked.
  final bool uppercase;

  StudioScope withEntry(PageItem entry) => StudioScope(
    pageSlug: pageSlug,
    dark: dark,
    entry: entry,
    uppercase: uppercase,
  );

  StudioScope inCapitals() => StudioScope(
    pageSlug: pageSlug,
    dark: dark,
    entry: entry,
    uppercase: true,
  );
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
  });

  final StudioHeader header;
  final double top;
  final StudioScope scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final build = ref.watch(appEnvironmentProvider).build;
    final config = ref.watch(appConfigProvider);
    final transparent = header.type == StudioHeaderType.transparent;
    final background = transparent
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
        (transparent ? Colors.white : p.onPrimary);
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
          _StudioHeaderButton(icon: icon, color: color),
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
      StudioHeaderType.logoActions || StudioHeaderType.transparent => SizedBox(
        height: 44,
        child: Row(
          children: [
            ?menu,
            if (menu != null) const SizedBox(width: 4),
            Expanded(
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: transparent ? const SizedBox.shrink() : mark,
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
    Widget child = _content(context, ref, color);
    final padding = _insets(node.padding);
    if (padding != null) child = Padding(padding: padding, child: child);
    final border = parseHexColor(node.borderColor);
    final gradient = node.gradient;
    final decorated =
        background != null ||
        gradient != null ||
        node.imageBackgroundUrl != null ||
        node.shadow != StudioShadow.none ||
        (border != null && node.borderWidth > 0);
    if (node.imageBackgroundUrl case final url?) {
      child = Stack(
        children: [
          Positioned.fill(
            child: AppNetworkImage(url: url, seed: node.id.hashCode),
          ),
          if (overlay != null)
            Positioned.fill(
              child: ColoredBox(
                key: ValueKey('studio-overlay-${node.id}'),
                color: overlay,
              ),
            ),
          child,
        ],
      );
    }
    if (decorated) {
      child = DecoratedBox(
        decoration: BoxDecoration(
          color: gradient == null ? background : null,
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
    if (rounded &&
        (node.imageBackgroundUrl != null ||
            node.type == StudioNodeType.image)) {
      child = ClipRRect(borderRadius: radius, child: child);
    }
    child = _sized(child);
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
    final action = node.type == StudioNodeType.button || node.action != null
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
    final w = node.width?.fixed;
    final h = node.height?.fixed;
    if (node.minHeight case final min? when min > 0) {
      child = ConstrainedBox(
        constraints: BoxConstraints(minHeight: min),
        child: child,
      );
    }
    if (w != null || h != null) {
      child = SizedBox(width: w, height: h, child: child);
    } else if (node.aspectRatio case final ratio? when ratio > 0) {
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
        final image = AppNetworkImage(
          url: url,
          seed: node.id.hashCode,
          fit: node.contain ? BoxFit.contain : BoxFit.cover,
          width: double.infinity,
          height: node.height?.fixed,
          clearPlaceholder: node.contain,
        );
        final overlay = _overlayOf(node);
        final shown = overlay == null
            ? image
            : Stack(
                fit: StackFit.passthrough,
                children: [
                  image,
                  Positioned.fill(
                    child: ColoredBox(
                      key: ValueKey('studio-overlay-${node.id}'),
                      color: overlay,
                    ),
                  ),
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
        if (node.card == null) {
          return PageBlockView(
            block: _itemsBlock(node),
            pageSlug: scope.pageSlug,
          );
        }
        return _CustomCards(node: node, scope: scope);
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
              if (i > 0 &&
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
        final row = Row(
          mainAxisAlignment: _main(node.align),
          crossAxisAlignment: stretch
              ? CrossAxisAlignment.stretch
              : _cross(node.cross),
          children: _spaced([
            for (final child in kids)
              if (child.width?.fill == true)
                Expanded(child: _selfAlign(child, view(child), Axis.vertical))
              else
                _selfAlign(child, view(child), Axis.vertical),
          ], horizontal: true),
        );
        // Stretching to the tallest needs the row's height first.
        return stretch && node.height?.fixed == null
            ? IntrinsicHeight(child: row)
            : row;
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

ItemsBlock _itemsBlock(StudioNode node) => ItemsBlock(
  id: node.id,
  source: node.source,
  layout: node.layout,
  items: node.items,
);

CategoriesBlock _categoriesBlock(StudioNode node) => CategoriesBlock(
  id: node.id,
  source: node.source,
  categories: node.categories,
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

// ------------------------------------------------------------ Lists, stars

/// A list whose card the owner designed: the card for each entry, its
/// bound elements filled from the entry; a tap opens the entry.
class _CustomCards extends ConsumerWidget {
  const _CustomCards({required this.node, required this.scope});

  final StudioNode node;
  final StudioScope scope;

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
            for (final (i, entry) in node.items.indexed) ...[
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
              for (final (i, entry) in node.items.indexed) ...[
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
            for (var i = 0; i < node.items.length; i += columns) ...[
              if (i > 0) SizedBox(height: gap),
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var c = 0; c < columns; c++) ...[
                      if (c > 0) SizedBox(width: gap),
                      Expanded(
                        child: i + c < node.items.length
                            ? cardOf(node.items[i + c])
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
/// itself when the owner chose so, with dots under it.
class _StudioSlider extends ConsumerStatefulWidget {
  const _StudioSlider({required this.node, required this.scope});

  final StudioNode node;
  final StudioScope scope;

  @override
  ConsumerState<_StudioSlider> createState() => _StudioSliderState();
}

class _StudioSliderState extends ConsumerState<_StudioSlider> {
  late final PageController _controller = PageController(
    viewportFraction: 1 / widget.node.perView,
  );
  Timer? _timer;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    if (widget.node.autoplay) {
      _timer = Timer.periodic(
        Duration(milliseconds: widget.node.intervalMs),
        (_) => _next(),
      );
    }
  }

  void _next() {
    if (!mounted || !_controller.hasClients) return;
    if (MediaQuery.disableAnimationsOf(context)) return;
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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final kids = _kids;
    if (kids.isEmpty) return const SizedBox.shrink();
    final height = widget.node.height?.fixed ?? 180;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: height,
          child: PageView.builder(
            controller: _controller,
            padEnds: false,
            itemCount: kids.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (context, i) => Padding(
              padding: EdgeInsetsDirectional.only(
                end: i < kids.length - 1 ? widget.node.gap : 0,
              ),
              child: StudioNodeView(
                node: kids[i],
                scope: widget.scope,
                parent: widget.node,
              ),
            ),
          ),
        ),
        if (widget.node.dots && kids.length > 1) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < kids.length; i++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: i == _page ? 16 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: i == _page ? p.primary : p.border,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
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
    if (widget.motion.enter != StudioEnter.none) {
      _delay = Timer(Duration(milliseconds: widget.motion.delayMs), () {
        if (mounted) _enter.forward();
      });
    }
    if (widget.motion.loop != StudioLoop.none) _loop.repeat();
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
    return AnimatedBuilder(
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
