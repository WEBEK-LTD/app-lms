import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../l10n.dart';
import 'avatar.dart';
import 'glass.dart';
import 'logo.dart';

/// The app's header (mobile.html `.hd`): the menu and the logo at the start;
/// search, messages, notifications and the member's avatar at the end.
class CommunityHeader extends StatelessWidget {
  const CommunityHeader({
    super.key,
    required this.meId,
    required this.meName,
    this.meAvatar,
    required this.onMenu,
    required this.onSearch,
    required this.onMessages,
    required this.onNotifications,
    required this.onProfile,
    this.messages = 0,
    this.notifications = 0,
  });

  final String meId;
  final String meName;
  final String? meAvatar;
  final VoidCallback onMenu;
  final VoidCallback onSearch;
  final VoidCallback onMessages;
  final VoidCallback onNotifications;
  final VoidCallback onProfile;
  final int messages;
  final int notifications;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 4, 18, 12),
      child: Row(
        children: [
          IconBtn(
            key: const ValueKey('header-menu'),
            icon: Symbols.menu_rounded,
            label: l.headerMenu,
            onTap: onMenu,
          ),
          const SizedBox(width: 10),
          Semantics(
            label: l.appName,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: const CommunityLogo(size: 34, radius: 10),
            ),
          ),
          const Spacer(),
          IconBtn(
            key: const ValueKey('header-search'),
            icon: Symbols.search_rounded,
            label: l.headerSearch,
            onTap: onSearch,
          ),
          const SizedBox(width: 7),
          IconBtn(
            key: const ValueKey('header-messages'),
            icon: Symbols.chat_bubble_rounded,
            label: l.headerMessages,
            onTap: onMessages,
            count: messages,
          ),
          const SizedBox(width: 7),
          IconBtn(
            key: const ValueKey('header-notifications'),
            icon: Symbols.notifications_rounded,
            label: l.headerNotifications,
            onTap: onNotifications,
            count: notifications,
          ),
          const SizedBox(width: 7),
          Semantics(
            button: true,
            label: l.headerProfile,
            excludeSemantics: true,
            child: GestureDetector(
              key: const ValueKey('header-profile'),
              onTap: onProfile,
              child: MeAvatar(id: meId, name: meName, url: meAvatar, size: 40),
            ),
          ),
        ],
      ),
    );
  }
}
