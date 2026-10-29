import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../../core/l10n/l10n.dart';
import '../shared/shared_routes.dart';
import 'screens/chat_conversation_screen.dart';
import 'screens/chat_list_screen.dart';

/// 77 The Chat screen in every app type: a bottom tab when there's room
/// ([withChatTab]), else opened from Account. A conversation covers the
/// tabs.
TabScreen chatTabScreen() => TabScreen(
  Paths.chat,
  (state) => const ChatListScreen(),
  routes: [
    GoRoute(
      path: ':id',
      parentNavigatorKey: rootNavigatorKey,
      pageBuilder: (context, state) => appPage(
        state,
        ChatConversationScreen(
          key: ValueKey(state.pathParameters['id']),
          conversationId: state.pathParameters['id'] ?? '',
        ),
      ),
    ),
  ],
);

final _chatTab = ShellTab(
  icon: AppIcons.chat,
  label: (context) => context.l10n.tabChat,
  location: Paths.chat,
);

/// 109 Chat in the More list, opened on top.
final _chatOnTop = ShellTab(
  icon: AppIcons.chat,
  label: (context) => context.l10n.tabChat,
  pushLocation: Paths.chat,
);

/// The tabs with Chat added when the app has chat and the client's tabs
/// leave room for it (at most five): before Account when Account is last.
/// 109 With a full bar and a More tab, Chat goes first in its list.
List<ShellTab> withChatTab(List<ShellTab> tabs, AppConfig? config) {
  if (config?.chat == null ||
      tabs.any(
        (t) => t.path == Paths.chat || t.more.any((m) => m.path == Paths.chat),
      )) {
    return tabs;
  }
  if (tabs.length >= Navigation.maxTabs) {
    final more = tabs.indexWhere((t) => t.isMore);
    if (more == -1) return tabs;
    return [...tabs]
      ..[more] = tabs[more].withMore([_chatOnTop, ...tabs[more].more]);
  }
  final at = tabs.isNotEmpty && tabs.last.path == Paths.account
      ? tabs.length - 1
      : tabs.length;
  return [...tabs]..insert(at, _chatTab);
}
