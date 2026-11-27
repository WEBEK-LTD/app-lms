import 'package:flutter/material.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/l10n.dart';
import '../../../core/theme/tokens.dart';

/// A sheet to write something (an answer, a reply): its title, a field, and
/// Post. It closes once the server takes it, and says why when it doesn't.
Future<void> showComposeSheet(
  BuildContext context, {
  required String title,
  required String hint,
  required int minLength,
  required int maxLength,
  required Future<Object?> Function(String text) onSend,
}) => showModalBottomSheet<void>(
  context: context,
  // Over the shell's floating tab bar.
  useRootNavigator: true,
  isScrollControlled: true,
  useSafeArea: true,
  backgroundColor: Colors.transparent,
  builder: (_) => ComposeSheet(
    title: title,
    hint: hint,
    minLength: minLength,
    maxLength: maxLength,
    onSend: onSend,
  ),
);

class ComposeSheet extends StatefulWidget {
  const ComposeSheet({
    super.key,
    required this.title,
    required this.hint,
    required this.minLength,
    required this.maxLength,
    required this.onSend,
  });

  final String title;
  final String hint;
  final int minLength;
  final int maxLength;
  final Future<Object?> Function(String text) onSend;

  @override
  State<ComposeSheet> createState() => _ComposeSheetState();
}

class _ComposeSheetState extends State<ComposeSheet> {
  final _text = TextEditingController();
  var _sending = false;
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final l = context.l10n;
    final text = _text.text.trim();
    if (text.length < widget.minLength) {
      setState(() => _error = l.qaTooShort(widget.minLength));
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await widget.onSend(text);
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = e.message.isNotEmpty ? e.message : l.commonError;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        decoration: BoxDecoration(
          color: p.dark ? Brand.navy2 : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: p.line,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              widget.title,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: p.ink,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _text,
              autofocus: true,
              minLines: 4,
              maxLines: 10,
              maxLength: widget.maxLength,
              textInputAction: TextInputAction.newline,
              decoration: InputDecoration(
                hintText: widget.hint,
                errorText: _error,
                counterText: '',
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 50,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: Brand.signUp,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: TextButton(
                  onPressed: _sending ? null : _send,
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: _sending
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          l.qaPost,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
