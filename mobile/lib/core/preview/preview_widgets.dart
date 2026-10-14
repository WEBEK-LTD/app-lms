import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../services/external_links.dart';
import '../theme/app_icons.dart';
import '../theme/app_theme.dart';
import '../theme/palette.dart';
import '../web/web_view.dart';
import '../widgets/buttons.dart';

/// 17 What the app preview shows where the installed app has a web view
/// (lesson pages, embeds, in-app web pages, checkout): browsers can't host
/// one, so a short note, and the page in a new tab when it has an address.
class PreviewWebViewPlaceholder extends StatelessWidget {
  const PreviewWebViewPlaceholder({super.key, required this.request});

  final WebViewRequest request;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final url = request.url;
    final canOpen =
        url != null && (url.scheme == 'https' || url.scheme == 'http');
    return ColoredBox(
      color: p.surface,
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 360),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AppIcon(AppIcons.preview, size: 28, color: p.textSecondary),
                const SizedBox(height: 10),
                Text(
                  context.l10n.previewInstalledAppOnly,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  context.l10n.previewWebPageNote,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: p.textSecondary,
                  ),
                ),
                if (canOpen) ...[
                  const SizedBox(height: 14),
                  SecondaryButton(
                    label: context.l10n.previewOpenInNewTab,
                    icon: AppIcons.openInNew,
                    height: 44,
                    onPressed: () => openExternal(url.toString()),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 17 A small note in the app preview, such as how to sign in there.
class PreviewNote extends StatelessWidget {
  const PreviewNote(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      container: true,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: p.accentSoft,
          borderRadius: BorderRadius.circular(context.shapes.r(12)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppIcon(AppIcons.info, size: 20, color: p.text),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: TextStyle(fontSize: 14, height: 1.45, color: p.text),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
