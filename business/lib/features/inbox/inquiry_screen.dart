import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

final inquiryProvider = FutureProvider.autoDispose.family<InquiryDetail, int>(
  (ref, id) => ref.watch(apiProvider).inquiry(ref.watch(appIdProvider), id),
);

/// 59 A conversation about a listing: opening it marks it read; the reply
/// reaches the person's inbox in the app and their phone.
class InquiryScreen extends ConsumerStatefulWidget {
  const InquiryScreen({super.key, required this.inquiryId});

  final int inquiryId;

  @override
  ConsumerState<InquiryScreen> createState() => _InquiryScreenState();
}

class _InquiryScreenState extends ConsumerState<InquiryScreen> {
  final _reply = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _reply.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _reply.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(apiProvider)
          .replyInquiry(ref.read(appIdProvider), widget.inquiryId, text);
      _reply.clear();
      ref.invalidate(inquiryProvider(widget.inquiryId));
      if (mounted) showMessage(context, context.l10n.replySent);
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final detail = ref.watch(inquiryProvider(widget.inquiryId));
    final d = detail.value;
    return Scaffold(
      appBar: AppBar(
        title: Text(d?.inquiry.person ?? l10n.message),
        actions: [
          if (d?.phone != null)
            IconButton(
              tooltip: l10n.call,
              icon: const Icon(AppIcons.phone),
              onPressed: () => openLink(
                context,
                ref,
                'tel:${d!.phone!.replaceAll(' ', '')}',
              ),
            ),
          if (d?.email != null)
            IconButton(
              tooltip: l10n.sendEmail,
              icon: const Icon(AppIcons.email),
              onPressed: () => openLink(context, ref, 'mailto:${d!.email}'),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              onRefresh: pullToRefresh(
                context,
                () => ref.refresh(inquiryProvider(widget.inquiryId).future),
              ),
              child: AsyncBody(
                value: detail,
                onRetry: () =>
                    ref.invalidate(inquiryProvider(widget.inquiryId)),
                builder: (d) => ListView(
                  reverse: true,
                  padding: const EdgeInsets.all(16),
                  children: [
                    for (final m in d.messages.reversed) _Bubble(message: m),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        l10n.aboutListing(d.inquiry.listingTitle),
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _reply,
                      minLines: 1,
                      maxLines: 5,
                      maxLength: 2000,
                      textInputAction: TextInputAction.newline,
                      decoration: InputDecoration(
                        hintText: l10n.writeReply,
                        counterText: '',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    tooltip: l10n.send,
                    onPressed: _sending ? null : _send,
                    icon: const DirectionalIcon(AppIcons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});

  final InquiryMessage message;

  @override
  Widget build(BuildContext context) {
    final mine = message.fromOffice;
    final theme = Theme.of(context);
    return Align(
      alignment: mine
          ? AlignmentDirectional.centerEnd
          : AlignmentDirectional.centerStart,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.78,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: mine ? Brand.midnight : Brand.white,
          borderRadius: BorderRadius.circular(18),
          border: mine ? null : Border.all(color: Brand.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.text,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: mine ? Brand.white : Brand.midnight,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              context.dateTime(message.createdAt),
              style: theme.textTheme.labelSmall?.copyWith(
                color: mine ? Brand.ivory.withValues(alpha: 0.8) : Brand.ink2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
