import 'package:flutter/widgets.dart';

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
/// which has the page's title and the back button instead.
PreferredSizeWidget? studioBar(BuildContext context, PreferredSizeWidget bar) =>
    StudioScreenScope.hidesTitleOf(context) ? null : bar;
