import 'package:flutter/widgets.dart';

/// 141 The keyboard opens only when asked, and scrolling closes it.
///
/// Whether [node] (the focus, when left out) is a text field's: the keyboard
/// is up for it.
bool textFieldFocused([FocusNode? node]) {
  final context = (node ?? FocusManager.instance.primaryFocus)?.context;
  if (context == null || !context.mounted) return false;
  return context.findAncestorWidgetOfExactType<EditableText>() != null;
}

/// 141 Takes the focus from the text field that has it, which closes the
/// keyboard; true when one had it. The screen forgets it had it too, so
/// nothing gives it back later.
bool closeKeyboard() {
  final focus = FocusManager.instance.primaryFocus;
  if (focus == null || !textFieldFocused(focus)) return false;
  focus.unfocus();
  return true;
}

/// 141 A screen, a sheet or a dialog opening over a text field takes the
/// focus from it. Flutter gives a screen the focus it last had when what
/// covered it closes, so the keyboard opened again by itself on the way back
/// (from a product to the search, from a sheet to the form). The screen that
/// opens still focuses its own field (a search opened to type, a code).
///
/// One per navigator: the app's own and each tab's.
class KeyboardRouteObserver extends NavigatorObserver {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    closeKeyboard();
  }
}

/// 141 Scrolling closes the keyboard, on every screen: only a drag by the
/// person (a list the app moves, a chat going to its last message, doesn't),
/// and not the scrolling inside a text field itself (a long text, its cursor).
class CloseKeyboardOnScroll extends StatelessWidget {
  const CloseKeyboardOnScroll({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) =>
      NotificationListener<ScrollNotification>(
        onNotification: (notification) {
          if (_byDrag(notification) &&
              textFieldFocused() &&
              !_insideTextField(notification.context)) {
            closeKeyboard();
          }
          return false;
        },
        child: child,
      );
}

bool _byDrag(ScrollNotification notification) => switch (notification) {
  ScrollUpdateNotification(:final dragDetails) => dragDetails != null,
  OverscrollNotification(:final dragDetails) => dragDetails != null,
  _ => false,
};

bool _insideTextField(BuildContext? context) =>
    context != null &&
    context.mounted &&
    context.findAncestorWidgetOfExactType<EditableText>() != null;
