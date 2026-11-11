import 'package:flutter/material.dart';

/// 120 Over one of the app's own screens drawn under a Studio page: whether
/// the page's header stands for the screen's own title, which then isn't
/// shown (`TabHeader`).
class StudioScreenScope extends InheritedWidget {
  const StudioScreenScope({
    super.key,
    required this.hidesTitle,
    required super.child,
  });

  final bool hidesTitle;

  /// Whether the screen's own title is left out here.
  static bool hidesTitleOf(BuildContext context) =>
      context
          .dependOnInheritedWidgetOfExactType<StudioScreenScope>()
          ?.hidesTitle ??
      false;

  @override
  bool updateShouldNotify(StudioScreenScope oldWidget) =>
      hidesTitle != oldWidget.hidesTitle;
}

/// 120.4 A screen's own app bar, left out under a Studio page's header,
/// which has the page's title and the back button instead; its buttons
/// (the wallet, the books borrowed) stay, in a slim row at the end.
PreferredSizeWidget? studioBar(BuildContext context, PreferredSizeWidget bar) {
  if (!StudioScreenScope.hidesTitleOf(context)) return bar;
  final actions = bar is AppBar ? bar.actions : null;
  if (actions == null || actions.isEmpty) return null;
  return AppBar(
    key: const ValueKey('studio-bar-actions'),
    primary: false,
    automaticallyImplyLeading: false,
    toolbarHeight: 44,
    backgroundColor: Colors.transparent,
    surfaceTintColor: Colors.transparent,
    elevation: 0,
    scrolledUnderElevation: 0,
    actions: actions,
  );
}
