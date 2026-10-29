import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/routing/app_module.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/own_icon.dart';
import 'page_actions.dart';

/// 109 The More tab's list: the tabs past the fourth, from the bottom of
/// the screen. A tapped one opens on top of the tab that's showing.
Future<void> showMoreTabs(
  BuildContext context,
  WidgetRef ref,
  List<ShellTab> entries,
) async {
  final picked = await showModalBottomSheet<ShellTab>(
    context: context,
    showDragHandle: true,
    builder: (sheet) {
      final p = sheet.palette;
      return SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.only(bottom: 8),
          children: [
            for (final (i, entry) in entries.indexed)
              ListTile(
                key: ValueKey('more-tab-${entry.id ?? i}'),
                minTileHeight: 56,
                leading: OwnIcon(
                  entry.icon,
                  url: entry.iconUrl,
                  size: 24,
                  color: p.link,
                ),
                title: Text(
                  entry.label(sheet),
                  style: TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
                onTap: () => Navigator.of(sheet).pop(entry),
              ),
          ],
        ),
      );
    },
  );
  if (picked == null || !context.mounted) return;
  final location = picked.pushLocation ?? picked.location;
  if (location != null) {
    openLocation(context, location);
  } else {
    runPageAction(context, ref, picked.action);
  }
}
