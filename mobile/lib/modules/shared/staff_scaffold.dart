import 'package:flutter/material.dart';

import '../../core/widgets/buttons.dart';
import '../../core/widgets/premium_chrome.dart';
import '../../core/widgets/studio_screen_scope.dart';
import 'account/premium/system_screen_frame.dart';

/// 130.58 A screen of the staff's (the teachers', the school's staff, the
/// bus crew, the couriers', the drivers', the vendors') opened over the
/// tabs: in a Studio project with a premium look for its system screens
/// (`Config.screens.system`) drawn in that look as the system screens are
/// ([SystemScreenFrame]: the look's large, glass, photo or brand header
/// with the round glass back button, its backdrop and its cards); without
/// one, or under a Studio page's header (which is the title then), the
/// classic app bar exactly as before.
class StaffScaffold extends StatelessWidget {
  const StaffScaffold({
    super.key,
    required this.title,
    required this.body,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.studioPage = false,
    this.staff = true,
  });

  /// The title; null, none (while the screen loads).
  final String? title;
  final Widget body;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;

  /// The screen can be drawn under a Studio page: its classic bar goes
  /// through [studioBar] (left out under the page's header).
  final bool studioPage;

  /// False for a screen shared with the students and families that is
  /// theirs this time: always the classic bar.
  final bool staff;

  @override
  Widget build(BuildContext context) {
    final look = !staff || StudioScreenScope.hidesTitleOf(context)
        ? null
        : SystemLookScope.projectLookOf(context);
    if (look != null) {
      return SystemScreenFrame(
        look: look,
        title: title ?? '',
        scrollable: false,
        floatingActionButton: floatingActionButton,
        bottomNavigationBar: bottomNavigationBar,
        child: body,
      );
    }
    final bar = AppBar(
      leading: appBarBack(context),
      title: title == null ? null : Text(title!),
    );
    return Scaffold(
      appBar: studioPage ? studioBar(context, bar) : bar,
      body: body,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
    );
  }
}
