import 'package:flutter/material.dart';

import '../../../core/api/models/screens_models.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/premium_chrome.dart';
import '../../../core/widgets/studio_screen_scope.dart';
import 'premium/system_screen_frame.dart';

// 130.21 The system screen a pushed account screen is, for its premium look.
export '../../../core/api/models/screens_models.dart' show SystemScreen;

/// A pushed account screen: back button and title (design: Settings).
class AccountScaffold extends StatelessWidget {
  const AccountScaffold({
    super.key,
    required this.title,
    required this.child,
    this.footer,
    this.scrollable = true,
    this.screen,
  });

  final String title;
  final Widget child;
  final Widget? footer;
  final bool scrollable;

  /// 130.21 The system screen this is: drawn in the project's premium look
  /// for it (`Config.screens.system`); null, or without one, as before.
  final SystemScreen? screen;

  @override
  Widget build(BuildContext context) {
    final system = screen;
    final look = system == null
        ? null
        : SystemLookScope.lookOf(context, system);
    if (system != null && look != null) {
      return SystemScreenFrame(
        screen: system,
        look: look,
        title: title,
        footer: footer,
        scrollable: scrollable,
        child: child,
      );
    }
    return Scaffold(
      body: Column(
        children: [
          // 120.4 Under a Studio page's header, the header is the title and
          // has the back button.
          if (!StudioScreenScope.hidesTitleOf(context))
            SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                child: Row(
                  children: [
                    const AppBackButton(),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Semantics(
                        header: true,
                        child: Text(
                          title,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          Expanded(
            child: scrollable
                ? SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                    child: child,
                  )
                : child,
          ),
          if (footer != null) BottomActionBar(child: footer!),
        ],
      ),
    );
  }
}
