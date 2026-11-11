import 'package:flutter/material.dart';

import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/studio_screen_scope.dart';

/// A pushed account screen: back button and title (design: Settings).
class AccountScaffold extends StatelessWidget {
  const AccountScaffold({
    super.key,
    required this.title,
    required this.child,
    this.footer,
    this.scrollable = true,
  });

  final String title;
  final Widget child;
  final Widget? footer;
  final bool scrollable;

  @override
  Widget build(BuildContext context) => Scaffold(
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
