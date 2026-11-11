import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../chat/data/chat_api.dart';
import '../../chat/data/chat_media.dart';
import 'market_orders_screen.dart';
import '../../../core/widgets/studio_screen_scope.dart';

/// 115.9 Complaint photos: started on the API (`/market/uploads`), sent in
/// chunks to the media gate, as chat files are.
class MarketUploads implements ChunkedUploads {
  MarketUploads(this._api, this._gate);

  final YallappApi _api;
  final MediaGate _gate;

  @override
  Future<ChatUpload> startUpload({
    required String name,
    required int size,
    required String type,
    int? durationSeconds,
  }) => _api.startMarketUpload(name: name, size: size, type: type);

  @override
  Future<ChatUpload> resumeUpload(String uploadId) =>
      _api.resumeMarketUpload(uploadId);

  @override
  Future<void> completeUpload(String uploadId) =>
      _api.completeMarketUpload(uploadId);

  @override
  Future<int> uploadOffset(String uploadUrl) => _gate.uploadOffset(uploadUrl);

  @override
  Future<int> sendChunk(String uploadUrl, int offset, List<int> bytes) =>
      _gate.sendChunk(uploadUrl, offset, bytes);
}

final marketUploadsProvider = Provider<ChunkedUploads>(
  (ref) => MarketUploads(ref.watch(yallappApiProvider), MediaGate.standalone()),
);

final marketComplaintProvider = FutureProvider.autoDispose
    .family<MarketComplaint, int>(
      (ref, id) => ref.watch(yallappApiProvider).getMyComplaint(id),
    );

const _photoTypes = {'image/jpeg', 'image/png', 'image/webp'};
const _photoMax = 8 * 1024 * 1024;
const _photosMax = 5;

String complaintReasonText(AppLocalizations l10n, ComplaintReason r) =>
    switch (r) {
      ComplaintReason.late => l10n.marketReasonLate,
      ComplaintReason.missingItems => l10n.marketReasonMissingItems,
      ComplaintReason.wrongItems => l10n.marketReasonWrongItems,
      ComplaintReason.quality => l10n.marketReasonQuality,
      ComplaintReason.damaged => l10n.marketReasonDamaged,
      ComplaintReason.notDelivered => l10n.marketReasonNotDelivered,
      ComplaintReason.chargedWrong => l10n.marketReasonChargedWrong,
      ComplaintReason.courier => l10n.marketReasonCourier,
      ComplaintReason.other => l10n.marketReasonOther,
    };

String complaintStatusText(AppLocalizations l10n, ComplaintStatus s) =>
    switch (s) {
      ComplaintStatus.open => l10n.marketComplaintOpen,
      ComplaintStatus.inReview => l10n.marketComplaintInReview,
      ComplaintStatus.waitingForCustomer => l10n.marketComplaintWaiting,
      ComplaintStatus.resolved => l10n.marketComplaintResolved,
      ComplaintStatus.rejected => l10n.marketComplaintRejected,
    };

/// A new complaint on an order: what happened, the items it's about, the
/// customer's words and up to five photos. It goes to the app's support,
/// never to the vendor.
class MarketNewComplaintScreen extends ConsumerStatefulWidget {
  const MarketNewComplaintScreen({super.key, required this.orderId});

  final int orderId;

  @override
  ConsumerState<MarketNewComplaintScreen> createState() =>
      _MarketNewComplaintScreenState();
}

class _MarketNewComplaintScreenState
    extends ConsumerState<MarketNewComplaintScreen> {
  ComplaintReason _reason = ComplaintReason.missingItems;
  final _lines = <int>{};
  final _text = TextEditingController();
  final _photos = <ChatFile>[];
  bool _sending = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _addPhoto() async {
    final l10n = context.l10n;
    final picked = await ref
        .read(chatPickerProvider)
        .pick(ChatPickSource.gallery);
    if (!mounted || picked == null) return;
    switch (picked) {
      case ChatPicked(:final file)
          when _photoTypes.contains(file.type) && file.size <= _photoMax:
        setState(() => _photos.add(file));
      case ChatPicked() || ChatPickUnsupported():
        showMessage(context, l10n.marketPhotoType);
    }
  }

  Future<void> _send() async {
    final l10n = context.l10n;
    final text = _text.text.trim();
    if (text.length < 5) {
      showMessage(context, l10n.marketTellUsMore);
      return;
    }
    setState(() => _sending = true);
    final api = ref.read(yallappApiProvider);
    try {
      var complaint = await api.openMarketComplaint(
        widget.orderId,
        reason: _reason,
        text: text,
        lineIds: _lines.toList(),
      );
      for (final photo in _photos) {
        final uploadId = await uploadChatFile(
          ref.read(marketUploadsProvider),
          photo,
        );
        complaint = await api.addComplaintPhoto(complaint.id, uploadId);
      }
      if (!mounted) return;
      ref.invalidate(marketOrderProvider(widget.orderId));
      showMessage(context, l10n.marketComplaintSent);
      context.pushReplacement(Paths.marketComplaint(complaint.id));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final order = ref.watch(marketOrderProvider(widget.orderId)).value;
    return Scaffold(
      backgroundColor: p.background,
      appBar: studioBar(
        context,
        AppBar(
          leading: appBarBack(context),
          title: Text(l10n.marketReportProblem),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(l10n.marketComplaintWindow, style: TextStyle(color: p.textBody)),
          const SizedBox(height: 16),
          _Label(l10n.marketWhatHappened),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final r in ComplaintReason.values)
                ChoiceChip(
                  label: Text(complaintReasonText(l10n, r)),
                  selected: _reason == r,
                  onSelected: (_) => setState(() => _reason = r),
                ),
            ],
          ),
          if (order != null && order.lines.any((l) => l.id != null)) ...[
            const SizedBox(height: 16),
            _Label(l10n.marketWhichItems),
            for (final line in order.lines)
              if (line.id != null)
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _lines.contains(line.id),
                  title: Text(line.name),
                  onChanged: (v) => setState(
                    () => v == true
                        ? _lines.add(line.id!)
                        : _lines.remove(line.id),
                  ),
                ),
          ],
          const SizedBox(height: 16),
          TextField(
            controller: _text,
            minLines: 3,
            maxLines: 6,
            maxLength: 2000,
            decoration: InputDecoration(hintText: l10n.marketTellUs),
          ),
          const SizedBox(height: 8),
          _Label(l10n.marketComplaintPhotos(_photos.length)),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final (i, photo) in _photos.indexed)
                InputChip(
                  avatar: const Icon(Symbols.image, size: 18),
                  label: Text(photo.name, overflow: TextOverflow.ellipsis),
                  onDeleted: () => setState(() => _photos.removeAt(i)),
                ),
              if (_photos.length < _photosMax)
                ActionChip(
                  avatar: const Icon(Symbols.add_a_photo, size: 18),
                  label: Text(l10n.marketAddPhoto),
                  onPressed: _addPhoto,
                ),
            ],
          ),
          const SizedBox(height: 24),
          PrimaryButton(
            label: l10n.marketSendComplaint,
            loading: _sending,
            onPressed: _send,
          ),
        ],
      ),
    );
  }
}

/// A complaint: its status, support's decision when there is one, the
/// photos and the messages with support, with a box to write more while it
/// is open.
class MarketComplaintScreen extends ConsumerStatefulWidget {
  const MarketComplaintScreen({super.key, required this.complaintId});

  final int complaintId;

  @override
  ConsumerState<MarketComplaintScreen> createState() =>
      _MarketComplaintScreenState();
}

class _MarketComplaintScreenState extends ConsumerState<MarketComplaintScreen> {
  final _message = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _message.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(yallappApiProvider)
          .addComplaintMessage(widget.complaintId, text);
      _message.clear();
      ref.invalidate(marketComplaintProvider(widget.complaintId));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final complaint = ref.watch(marketComplaintProvider(widget.complaintId));
    final c = complaint.value;
    return Scaffold(
      backgroundColor: p.background,
      appBar: studioBar(
        context,
        AppBar(
          leading: appBarBack(context),
          title: Text(
            c == null
                ? l10n.marketViewComplaint
                : l10n.marketComplaintTitle(c.reference),
          ),
        ),
      ),
      body: complaint.when(
        loading: () => const SkeletonDetail(),
        error: (e, _) => MessageView(
          icon: Symbols.error,
          title: l10n.marketViewComplaint,
          message: '$e',
          actionLabel: l10n.marketBrowse,
          onAction: () =>
              ref.invalidate(marketComplaintProvider(widget.complaintId)),
        ),
        data: (c) => Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _ComplaintHead(complaint: c),
                  if (c.decision != null) ...[
                    const SizedBox(height: 12),
                    _Decision(decision: c.decision!),
                  ],
                  if (c.photos.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 84,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: c.photos.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 8),
                        itemBuilder: (_, i) => ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: SizedBox(
                            width: 84,
                            child: AppNetworkImage(url: c.photos[i], seed: i),
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  for (final m in c.messages)
                    Align(
                      alignment: m.fromSupport
                          ? AlignmentDirectional.centerStart
                          : AlignmentDirectional.centerEnd,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        constraints: const BoxConstraints(maxWidth: 300),
                        decoration: BoxDecoration(
                          color: m.fromSupport ? p.surface : p.primarySoft,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: p.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              m.fromSupport
                                  ? l10n.marketSupport
                                  : l10n.marketYou,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: p.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(m.text, style: TextStyle(color: p.text)),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: c.closed
                    ? Text(
                        l10n.marketComplaintClosed,
                        style: TextStyle(color: p.textSecondary),
                      )
                    : Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _message,
                              minLines: 1,
                              maxLines: 4,
                              decoration: InputDecoration(
                                hintText: l10n.marketWriteToSupport,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton.filled(
                            onPressed: _sending ? null : _send,
                            icon: const Icon(Symbols.send),
                            tooltip: l10n.marketSendComplaint,
                          ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(
      text,
      style: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w800,
        color: context.palette.textSecondary,
      ),
    ),
  );
}

class _ComplaintHead extends StatelessWidget {
  const _ComplaintHead({required this.complaint});

  final MarketComplaint complaint;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            complaintStatusText(l10n, complaint.status),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: p.text,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            complaintReasonText(l10n, complaint.reason),
            style: TextStyle(color: p.textSecondary),
          ),
          const SizedBox(height: 8),
          Text(complaint.text, style: TextStyle(color: p.textBody)),
        ],
      ),
    );
  }
}

class _Decision extends StatelessWidget {
  const _Decision({required this.decision});

  final ComplaintDecision decision;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final amount = decision.amount?.formatted ?? '';
    final title = switch (decision.outcome) {
      'refund' => l10n.marketDecisionRefund(amount),
      'partial_refund' => l10n.marketDecisionPartial(amount),
      'compensation' => l10n.marketDecisionCompensation(amount),
      _ => l10n.marketDecisionNone,
    };
    final to = switch (decision.to) {
      'payment' => l10n.marketDecisionToPayment,
      'wallet' => l10n.marketDecisionToWallet,
      'coupon' => l10n.marketDecisionToCoupon(decision.couponCode ?? ''),
      _ => null,
    };
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: decision.outcome == 'no_refund' ? p.surface : p.successSoft,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: p.text,
            ),
          ),
          if (to != null) ...[
            const SizedBox(height: 4),
            Text(to, style: TextStyle(color: p.textBody)),
          ],
          if (decision.reason != null) ...[
            const SizedBox(height: 8),
            Text(decision.reason!, style: TextStyle(color: p.textSecondary)),
          ],
        ],
      ),
    );
  }
}
