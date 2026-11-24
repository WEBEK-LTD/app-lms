import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/auth/session.dart';
import '../../../core/l10n.dart';
import 'content_direction.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/sym.dart';
import '../data/qa_api.dart';
import '../data/qa_models.dart';
import 'compose_sheet.dart';
import 'qa_format.dart';
import 'widgets/qa_widgets.dart';
import 'widgets/member_avatar.dart';

/// An answer's replies ("5 replies"), oldest first, and a reply of one's own.
Future<void> showRepliesSheet(
  BuildContext context, {
  required Answer answer,
  required VoidCallback onPosted,
}) => showModalBottomSheet<void>(
  context: context,
  // Over the shell's floating tab bar.
  useRootNavigator: true,
  isScrollControlled: true,
  useSafeArea: true,
  backgroundColor: Colors.transparent,
  builder: (_) => RepliesSheet(answer: answer, onPosted: onPosted),
);

class RepliesSheet extends ConsumerStatefulWidget {
  const RepliesSheet({super.key, required this.answer, required this.onPosted});

  final Answer answer;
  final VoidCallback onPosted;

  @override
  ConsumerState<RepliesSheet> createState() => _RepliesSheetState();
}

class _RepliesSheetState extends ConsumerState<RepliesSheet> {
  late Future<List<Reply>> _replies = ref
      .read(qaApiProvider)
      .replies(widget.answer.id);

  Future<void> _write() => showComposeSheet(
    context,
    title: context.l10n.qaReplyCount(0),
    hint: context.l10n.qaReplyHint,
    minLength: 1,
    maxLength: 1000,
    onSend: (text) async {
      final r = await ref.read(qaApiProvider).reply(widget.answer.id, text);
      widget.onPosted();
      if (mounted) {
        setState(() {
          _replies = _replies.then((list) => [...list, r]);
        });
      }
      return r;
    },
  );

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final signedIn = ref.watch(meProvider) != null;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: .6,
      maxChildSize: .92,
      builder: (context, scroll) => Container(
        decoration: BoxDecoration(
          color: p.dark ? Brand.navy2 : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: FutureBuilder<List<Reply>>(
          future: _replies,
          builder: (context, snap) {
            final list = snap.data ?? const <Reply>[];
            return ListView(
              controller: scroll,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
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
                  l.qaReplyCount(
                    snap.hasData ? list.length : widget.answer.replyCount,
                  ),
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: p.ink,
                  ),
                ),
                const SizedBox(height: 8),
                if (!snap.hasData && !snap.hasError)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                if (snap.hasError) Text(l.commonError),
                for (final r in list)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        MemberAvatar(member: r.author.member, size: 28),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(child: AuthorName(r.author)),
                                  const SizedBox(width: 6),
                                  Text(
                                    shortAge(context, r.createdAt),
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      color: p.muted,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 3),
                              Text(
                                r.body,
                                textDirection: contentDirection(r.body),
                                style: TextStyle(
                                  fontSize: 13.5,
                                  height: 1.5,
                                  color: p.soft,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                if (signedIn) ...[
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _write,
                    icon: const Sym(Symbols.reply, size: 20),
                    label: Text(l.qaReplyHint),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: p.ink,
                      side: BorderSide(color: p.line),
                      minimumSize: const Size.fromHeight(46),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(15),
                      ),
                    ),
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}
