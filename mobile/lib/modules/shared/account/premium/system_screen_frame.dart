import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/gate/app_gate.dart';
import '../../../../core/theme/palette.dart';
import '../../../../core/widgets/buttons.dart';
import '../../../../core/widgets/premium_chrome.dart';
import '../../../../core/widgets/studio_screen_scope.dart';

/// 130.21 The header style each system look draws its screens with.
ChromeHeaderStyle chromeStyleOf(SystemLook look) => switch (look) {
  SystemLook.large => ChromeHeaderStyle.large,
  SystemLook.glass => ChromeHeaderStyle.glass,
  SystemLook.photo => ChromeHeaderStyle.photo,
  SystemLook.brand => ChromeHeaderStyle.brand,
  SystemLook.petal => ChromeHeaderStyle.petal,
};

/// 130.21 The photo of the photo look: the system look's own, else the
/// sign-in's; null, the brand's gradient.
String? systemPhotoOf(WidgetRef ref) {
  final gate = ref.watch(appGateProvider);
  if (gate is! GateReady) return null;
  final screens = gate.config.screens;
  return screens?.system?.imageUrl ?? screens?.signIn?.imageUrl;
}

/// 130.21 A pushed system screen in its premium look: the round glass back
/// button and its title in the look's header (large, folding on scroll;
/// frosted glass the screen scrolls under; a photo or the brand), the
/// page's colour or the glass wash behind, and the screen's parts in the
/// look ([SystemScreenArea]). Under a Studio page's header, the header is
/// the page's.
///
/// 130.58 Without a [screen], one of the app's other screens (the staff's,
/// the couriers', the drivers') in the project's look [look].
class SystemScreenFrame extends ConsumerWidget {
  const SystemScreenFrame({
    super.key,
    this.screen,
    required this.look,
    required this.title,
    required this.child,
    this.footer,
    this.scrollable = true,
    this.actions = const [],
    this.back = true,
    this.floatingActionButton,
    this.bottomNavigationBar,
  });

  final SystemScreen? screen;
  final SystemLook look;
  final String title;
  final Widget child;
  final Widget? footer;
  final bool scrollable;
  final List<Widget> actions;
  final bool back;

  /// 130.58 The screen's own button and bar at the foot ([footer] is put
  /// in the app's action bar for it).
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final top = MediaQuery.paddingOf(context).top;
    final style = chromeStyleOf(look);
    final glass = style == ChromeHeaderStyle.glass;
    // 131.23 The petal's screens on its wash, never over the photo.
    final petal = style == ChromeHeaderStyle.petal;
    final onColour = ChromeHeaderBar.onColourOf(style);
    final hidden = StudioScreenScope.hidesTitleOf(context);
    final photo = systemPhotoOf(ref);
    final canPop = back && Navigator.of(context).canPop();
    ChromeHeaderBar bar(double fold) => ChromeHeaderBar(
      style: style,
      title: title,
      top: top,
      fold: fold,
      imageUrl: petal ? null : photo,
      leading: [if (canPop) ChromeBackButton(onColour: onColour)],
      trailing: actions,
    );
    final openHeight = bar(0).openHeight();
    Widget content(double inset) => scrollable
        ? SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(16, inset + 12, 16, 28),
            child: child,
          )
        : Padding(
            padding: EdgeInsets.only(top: inset),
            child: child,
          );
    final Widget body = hidden
        ? content(0)
        : ChromeFoldingHeader(
            overlay: glass,
            builder: (context, offset) => bar(chromeFold(context, offset, 64)),
            child: MediaQuery.removePadding(
              context: context,
              removeTop: true,
              child: content(glass ? openHeight : 0),
            ),
          );
    final scaffold = Scaffold(
      key: ValueKey('system-screen-${screen?.wire ?? 'app'}-${look.name}'),
      backgroundColor: p.background,
      body: DecoratedBox(
        decoration: ChromeTones.backdrop(p, look),
        child: body,
      ),
      floatingActionButton: floatingActionButton,
      bottomNavigationBar:
          bottomNavigationBar ??
          (footer == null ? null : BottomActionBar(child: footer!)),
    );
    final system = screen;
    return system == null
        ? SystemScreenArea.inLook(look: look, child: scaffold)
        : SystemScreenArea(screen: system, child: scaffold);
  }
}
