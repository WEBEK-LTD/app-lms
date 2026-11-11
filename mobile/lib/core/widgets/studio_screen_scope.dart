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
