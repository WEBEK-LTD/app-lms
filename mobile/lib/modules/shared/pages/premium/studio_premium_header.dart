import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/auth/auth_controller.dart';
import '../../../../core/gate/app_gate.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/providers.dart';
import '../../../../core/routing/paths.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/palette.dart';
import '../../../../core/widgets/common.dart';
import '../../../../core/widgets/premium_chrome.dart';
import '../../../lms/data/lms_providers.dart' show unreadNotificationsProvider;
import '../app_header.dart';
import '../side_menu.dart';

/// 130.20 The look each premium header style draws.
ChromeHeaderStyle chromeStyleOfHeader(StudioHeaderStyle style) =>
    switch (style) {
      StudioHeaderStyle.large => ChromeHeaderStyle.large,
      StudioHeaderStyle.glass => ChromeHeaderStyle.glass,
      StudioHeaderStyle.photo => ChromeHeaderStyle.photo,
      StudioHeaderStyle.brand => ChromeHeaderStyle.brand,
      StudioHeaderStyle.search => ChromeHeaderStyle.search,
    };

/// 130.20 A Studio page's premium header (`StudioHeader.style`): its title
/// (else the app's name) large, folding into the compact bar as the page
/// scrolls, frosted glass, over its photo or on the main colour with the
/// logo in the middle, or with the search pill; its buttons as round glass
/// buttons (the bell with a dot while something is unread, the person's
/// photo for the account), and the round back button on a page opened
/// over the tabs. In the owner's colours where set (`background`,
/// `color`, by night their dark ones), else the look's.
class StudioPremiumHeader extends ConsumerWidget {
  const StudioPremiumHeader({
    super.key,
    required this.header,
    required this.dark,
    required this.top,
    this.back = false,
    this.offset = 0,
  });

  final StudioHeader header;
  final bool dark;
  final double top;
  final bool back;

  /// How far the page under it has scrolled.
  final double offset;

  /// The header's height, open, for a page that scrolls under it (glass).
  static double openHeightOf(StudioHeader header, double top) =>
      ChromeHeaderBar(
        style: chromeStyleOfHeader(header.style!),
        title: '',
        subtitle: header.subtitle,
        top: top,
      ).openHeight();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final build = ref.watch(appEnvironmentProvider).build;
    final config = ref.watch(appConfigProvider);
    final style = chromeStyleOfHeader(header.style!);
    final onColour = ChromeHeaderBar.onColourOf(style);
    final title = header.title ?? build.appName;
    final logo =
        header.logoUrl ??
        config.appearance?.logoUrl ??
        config.branding.logoUrl ??
        build.logoUrl;
    final background = parseHexColor(
      dark ? (header.darkBackground ?? header.background) : header.background,
    );
    final foreground = parseHexColor(
      dark ? (header.darkColor ?? header.color) : header.color,
    );
    final auth = ref.watch(authControllerProvider);
    final unread =
        header.buttons.contains(StudioHeaderButton.notifications) &&
            auth is SignedIn
        ? (ref.watch(unreadNotificationsProvider).value ?? 0)
        : 0;
    final avatar = auth is SignedIn ? auth.user?.avatarUrl : null;
    final leading = <Widget>[
      if (back)
        ChromeBackButton(
          onColour: onColour,
          onPressed: () =>
              context.canPop() ? context.pop() : context.go(Paths.home),
        ),
      if (header.buttons.contains(StudioHeaderButton.menu) &&
          sideMenuEntries(ref).isNotEmpty)
        ChromeGlassButton(
          key: const ValueKey('studio-header-menu'),
          icon: AppIcons.sideMenu,
          label: l10n.sideMenuOpen,
          onColour: onColour,
          onPressed: () => openSideMenu(context),
        ),
    ];
    final trailing = <Widget>[
      for (final b in header.buttons)
        if (_iconOf(b) case final icon?
            when headerIconOpens(ref, icon) &&
                // The search style's pill is its search.
                !(style == ChromeHeaderStyle.search &&
                    icon == HeaderIcon.search))
          ChromeGlassButton(
            key: ValueKey('studio-header-${icon.name}'),
            icon: switch (icon) {
              HeaderIcon.search => AppIcons.search,
              HeaderIcon.cart => AppIcons.cart,
              HeaderIcon.notifications => AppIcons.notifications,
              HeaderIcon.chat => AppIcons.chat,
              HeaderIcon.account => AppIcons.account,
            },
            label: switch (icon) {
              HeaderIcon.search => l10n.headerSearch,
              HeaderIcon.cart => l10n.tabCart,
              HeaderIcon.notifications =>
                unread > 0
                    ? l10n.notificationsUnread(unread)
                    : l10n.notifications,
              HeaderIcon.chat => l10n.tabChat,
              HeaderIcon.account => l10n.tabAccount,
            },
            onColour: onColour,
            dot: icon == HeaderIcon.notifications && unread > 0,
            onPressed: () => openHeaderIcon(context, ref, icon),
            child: icon == HeaderIcon.account && avatar != null
                ? ClipOval(
                    child: AppNetworkImage(url: avatar, width: 34, height: 34),
                  )
                : null,
          ),
    ];
    final ink = foreground ?? (onColour ? Colors.white : context.palette.text);
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
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: ink,
            ),
          );
    return KeyedSubtree(
      key: ValueKey('studio-header-style-${style.name}'),
      child: ChromeHeaderBar(
        style: style,
        title: title,
        subtitle: header.subtitle,
        top: top,
        fold: chromeFold(context, offset, 72),
        collapses: header.collapse,
        leading: leading,
        trailing: trailing,
        imageUrl: header.imageUrl,
        background: style == ChromeHeaderStyle.photo ? null : background,
        foreground: foreground,
        mark: mark,
        search: headerIconOpens(ref, HeaderIcon.search)
            ? ChromeSearchPill(
                onTap: () => openHeaderIcon(context, ref, HeaderIcon.search),
              )
            : null,
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
