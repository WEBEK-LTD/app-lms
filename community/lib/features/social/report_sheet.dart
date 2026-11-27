import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/sym.dart';

/// Reports a member, a question, an answer or a tutorial ([targetType]:
/// `member`, `question`, `answer`, `reply`, `tutorial`, `comment`) to the moderators: a reason
/// and, if they want, a note. Area E's screens call it too.
Future<void> showReportSheet(
  BuildContext context, {
  required String targetType,
  required String targetId,
}) => showModalBottomSheet<void>(
  context: context,
  useRootNavigator: true,
  isScrollControlled: true,
  backgroundColor: Colors.transparent,
  builder: (context) =>
      _ReportSheet(targetType: targetType, targetId: targetId),
);

class _ReportSheet extends ConsumerStatefulWidget {
  const _ReportSheet({required this.targetType, required this.targetId});

  final String targetType;
  final String targetId;

  @override
  ConsumerState<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends ConsumerState<_ReportSheet> {
  ReportReason? _reason;
  final _note = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final reason = _reason;
    if (reason == null || _busy) return;
    final l = context.l10n;
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    setState(() => _busy = true);
    try {
      await ref
          .read(communityApiProvider)
          .report(
            targetType: widget.targetType,
            targetId: widget.targetId,
            reason: reason,
            note: _note.text.trim(),
          );
      navigator.pop();
      messenger.showSnackBar(SnackBar(content: Text(l.socialReportSent)));
    } on ApiException catch (e) {
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
    final p = context.palette;
    final l = context.l10n;
    final reasons = [
      (ReportReason.spam, l.socialReasonSpam),
      (ReportReason.harassment, l.socialReasonHarassment),
      (ReportReason.hate, l.socialReasonHate),
      (ReportReason.inappropriate, l.socialReasonInappropriate),
      (ReportReason.misinformation, l.socialReasonMisinformation),
      (ReportReason.impersonation, l.socialReasonImpersonation),
      (ReportReason.other, l.socialReasonOther),
    ];
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: Container(
          key: const ValueKey('report-sheet'),
          margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
          padding: const EdgeInsets.fromLTRB(14, 18, 14, 14),
          decoration: BoxDecoration(
            color: p.dark ? Brand.navy2 : Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Material(
            type: MaterialType.transparency,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                  child: Text(
                    l.socialReportTitle,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: p.ink,
                    ),
                  ),
                ),
                for (final (reason, label) in reasons)
                  ListTile(
                    key: ValueKey('report-${reason.name}'),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    title: Text(
                      label,
                      style: TextStyle(
                        color: p.ink,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    trailing: Sym(
                      _reason == reason
                          ? Symbols.radio_button_checked_rounded
                          : Symbols.radio_button_unchecked_rounded,
                      size: 22,
                      fill: _reason == reason,
                      color: _reason == reason ? Brand.orange : p.muted,
                    ),
                    onTap: () => setState(() => _reason = reason),
                  ),
                const SizedBox(height: 6),
                TextField(
                  key: const ValueKey('report-note'),
                  controller: _note,
                  maxLines: 3,
                  minLines: 2,
                  style: TextStyle(color: p.ink),
                  decoration: InputDecoration(hintText: l.socialReportNote),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  height: 50,
                  child: FilledButton(
                    key: const ValueKey('report-send'),
                    onPressed: _reason == null || _busy ? null : _send,
                    style: FilledButton.styleFrom(
                      backgroundColor: Brand.orange,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      textStyle: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                    child: Text(l.socialReportSend),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
