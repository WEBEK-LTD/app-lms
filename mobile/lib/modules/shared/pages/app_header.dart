import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../chat/data/chat_providers.dart';
import 'page_actions.dart';
import 'side_menu.dart';

/// 101 The header chosen in the dashboard, at the top of a page in the
/// bottom tabs: the side menu's button, the page's [title] (null when it's
/// hidden) in [titleStyle] or the app's logo, a search field, and the
/// buttons this app can open. [onDark]: on the main colour (the Bold
/// template).
class ChosenHeader extends ConsumerWidget {
  const ChosenHeader({
    super.key,
    required this.header,
    required this.title,
    required this.titleStyle,
    required this.onDark,
  });

  final AppHeader header;
  final String? title;
  final TextStyle titleStyle;
  final bool onDark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final heading = title == null
        ? null
        : Semantics(
            header: true,
            child: Text(
              title!,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: titleStyle,
            ),
          );
    final menu = sideMenuEntries(ref).isEmpty
        ? null
        : SideMenuButton(onDark: onDark);
    final buttons = [
      for (final icon in header.icons)
        if (headerIconOpens(ref, icon))
          _HeaderButton(icon: icon, onDark: onDark),
    ];
    final end = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final (i, button) in buttons.indexed) ...[
          if (i > 0) const SizedBox(width: 8),
          button,
        ],
      ],
    );
    return switch (header.layout) {
      HeaderLayout.title => Column(
        key: const ValueKey('header-title'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (menu != null || buttons.isNotEmpty)
            Row(children: [?menu, const Spacer(), end]),
          if ((menu != null || buttons.isNotEmpty) && heading != null)
            const SizedBox(height: 14),
          ?heading,
        ],
      ),
      HeaderLayout.centered => _centered(context, ref, menu, buttons, end),
      HeaderLayout.logo || HeaderLayout.search => Column(
        key: ValueKey('header-${header.layout.name}'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              if (menu != null) ...[menu, const SizedBox(width: 12)],
              Expanded(child: _AppLogo(onDark: onDark)),
              if (buttons.isNotEmpty) ...[const SizedBox(width: 12), end],
            ],
          ),
          if (header.layout == HeaderLayout.search) ...[
            if (headerIconOpens(ref, HeaderIcon.search)) ...[
              const SizedBox(height: 14),
              _SearchField(onDark: onDark),
            ],
          ] else if (heading != null) ...[
            const SizedBox(height: 14),
            heading,
          ],
        ],
      ),
    };
  }

  /// One bar with the title in the middle of the space the side menu's
  /// button and the buttons leave.
  Widget _centered(
    BuildContext context,
    WidgetRef ref,
    Widget? menu,
    List<Widget> buttons,
    Widget end,
  ) {
    final p = context.palette;
    final name = ref.watch(appEnvironmentProvider).build.appName;
    return SizedBox(
      key: const ValueKey('header-centered'),
      height: 48,
      child: NavigationToolbar(
        leading: menu,
        trailing: buttons.isEmpty ? null : end,
        middleSpacing: 12,
        middle: Semantics(
          header: title != null,
          child: Text(
            title ?? name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: onDark ? p.onPrimary : p.text,
            ),
          ),
        ),
      ),
    );
  }
}

/// Whether this app can open the header's [icon]: a cart only in an app
/// with one, the chat only while it's on.
bool headerIconOpens(WidgetRef ref, HeaderIcon icon) {
  if (icon == HeaderIcon.chat) return ref.watch(chatConfigProvider) != null;
  return canOpenAction(ref, _actionOf(icon)!);
}

PageAction? _actionOf(HeaderIcon icon) => switch (icon) {
  HeaderIcon.search => const PageAction(
    type: PageActionType.screen,
    screen: BuiltInScreen.search,
  ),
  HeaderIcon.cart => const PageAction(
    type: PageActionType.screen,
    screen: BuiltInScreen.cart,
  ),
  HeaderIcon.notifications => const PageAction(
    type: PageActionType.screen,
    screen: BuiltInScreen.notifications,
  ),
  HeaderIcon.account => const PageAction(
    type: PageActionType.screen,
    screen: BuiltInScreen.account,
  ),
  HeaderIcon.chat => null,
};

void _open(BuildContext context, WidgetRef ref, HeaderIcon icon) {
  final action = _actionOf(icon);
  if (action == null) {
    openLocation(context, Paths.chat);
  } else {
    runPageAction(context, ref, action);
  }
}

class _HeaderButton extends ConsumerWidget {
  const _HeaderButton({required this.icon, required this.onDark});

  final HeaderIcon icon;
  final bool onDark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    // The cart's and the chat's counts, as on their tabs.
    final count = switch (icon) {
      HeaderIcon.cart =>
        ref.read(appModuleProvider).badges?.call(ref)[Paths.cart] ?? 0,
      HeaderIcon.chat => ref.watch(chatUnreadProvider),
      _ => 0,
    };
    final label = switch (icon) {
      HeaderIcon.search => l10n.headerSearch,
      HeaderIcon.cart => l10n.tabCart,
      HeaderIcon.notifications => l10n.notifications,
      HeaderIcon.chat => l10n.tabChat,
      HeaderIcon.account => l10n.tabAccount,
    };
    return SquareIconButton(
      key: ValueKey('header-${icon.name}'),
      icon: switch (icon) {
        HeaderIcon.search => AppIcons.search,
        HeaderIcon.cart => AppIcons.cart,
        HeaderIcon.notifications => AppIcons.notifications,
        HeaderIcon.chat => AppIcons.chat,
        HeaderIcon.account => AppIcons.account,
      },
      label: count > 0 ? l10n.tabWithCount(label, count) : label,
      badge: count > 0,
      background: onDark ? p.primarySoft : null,
      foreground: onDark ? p.onPrimarySoft : null,
      bordered: !onDark,
      onPressed: () => _open(context, ref, icon),
    );
  }
}

/// The app's logo (97.3 the Figma look's first), or its name without one.
class _AppLogo extends ConsumerWidget {
  const _AppLogo({required this.onDark});

  final bool onDark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final build = ref.watch(appEnvironmentProvider).build;
    final config = ref.watch(appConfigProvider);
    final logo =
        config.appearance?.logoUrl ?? config.branding.logoUrl ?? build.logoUrl;
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: logo != null
          ? ConstrainedBox(
              key: const ValueKey('header-logo'),
              constraints: const BoxConstraints(maxWidth: 160, maxHeight: 40),
              child: AppNetworkImage(
                url: logo,
                height: 40,
                fit: BoxFit.contain,
                semanticLabel: build.appName,
                clearPlaceholder: true,
              ),
            )
          : Text(
              build.appName,
              key: const ValueKey('header-name'),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: onDark ? p.onPrimary : p.text,
              ),
            ),
    );
  }
}

/// A field that opens the app's search.
class _SearchField extends ConsumerWidget {
  const _SearchField({required this.onDark});

  final bool onDark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final label = context.l10n.headerSearch;
    final foreground = onDark ? p.onPrimarySoft : p.textSecondary;
    return Semantics(
      key: const ValueKey('header-search-field'),
      button: true,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: onDark ? p.primarySoft : p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(context.shapes.r(14)),
          side: onDark ? BorderSide.none : BorderSide(color: p.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => _open(context, ref, HeaderIcon.search),
          child: SizedBox(
            height: 48,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                children: [
                  AppIcon(AppIcons.search, size: 22, color: foreground),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 15, color: foreground),
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
