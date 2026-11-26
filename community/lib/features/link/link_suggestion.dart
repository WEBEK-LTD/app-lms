import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/session.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/brand_marks.dart';

/// "We found your Yallapp account. Link it?" on Home and in Settings while
/// `/me`'s `link_suggestion.available`: Link in one tap, or Dismiss.
class LinkSuggestionBanner extends ConsumerStatefulWidget {
  const LinkSuggestionBanner({super.key, this.margin = EdgeInsets.zero});

  final EdgeInsetsGeometry margin;

  @override
  ConsumerState<LinkSuggestionBanner> createState() =>
      _LinkSuggestionBannerState();
}

class _LinkSuggestionBannerState extends ConsumerState<LinkSuggestionBanner> {
  bool _busy = false;

  Future<void> _answer(bool link) async {
    if (_busy) return;
    final l = context.l10n;
    final messenger = ScaffoldMessenger.of(context);
    final api = ref.read(communityApiProvider);
    setState(() => _busy = true);
    try {
      if (link) {
        await api.acceptLinkSuggestion();
        messenger.showSnackBar(SnackBar(content: Text(l.linkSuggestDone)));
      } else {
        await api.dismissLinkSuggestion();
      }
      await ref.read(sessionProvider.notifier).refresh();
    } on ApiException catch (e) {
      if (e.code == ApiException.notEligible) {
        // It went meanwhile (linked elsewhere, or no longer offered).
        await ref.read(sessionProvider.notifier).refresh();
        return;
      }
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            e.offline
                ? l.commonOffline
                : (e.message.isEmpty ? l.commonError : e.message),
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(meProvider)?.account?.linkSuggestion;
    if (s == null || !s.available) return const SizedBox.shrink();
    final p = context.palette;
    final l = context.l10n;
    final name = s.accountName;
    return Container(
      key: const ValueKey('link-suggestion'),
      margin: widget.margin,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
      decoration: BoxDecoration(
        color: p.dark ? const Color(0x0FFFFFFF) : Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0x4DFF5A1F)),
        boxShadow: [
          BoxShadow(
            color: p.cardShadow,
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const YallappMark(size: 36),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name == null || name.isEmpty
                          ? l.linkSuggestTitle
                          : l.linkSuggestNamed(name),
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: p.ink,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      l.linkSuggestLine,
                      style: TextStyle(fontSize: 12.5, color: p.muted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                key: const ValueKey('link-suggestion-dismiss'),
                onPressed: _busy ? null : () => _answer(false),
                style: TextButton.styleFrom(foregroundColor: p.muted),
                child: Text(l.linkSuggestDismiss),
              ),
              const SizedBox(width: 4),
              FilledButton(
                key: const ValueKey('link-suggestion-link'),
                onPressed: _busy ? null : () => _answer(true),
                style: FilledButton.styleFrom(
                  backgroundColor: Brand.orange,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  textStyle: const TextStyle(fontWeight: FontWeight.w700),
                ),
                child: Text(l.linkSuggestLink),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
