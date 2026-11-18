import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart' hide TextDirection;
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/format/bidi.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/studio_screen_scope.dart';
import '../../chat/data/chat_api.dart';
import '../../chat/data/chat_media.dart';
import '../widgets/market_look.dart';
import 'market_club_screens.dart' show marketWalletProvider;
import 'market_orders_screen.dart';

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

/// 115.51 The customer's complaints, for Support in the Chat tab (D4).
final marketMyComplaintsProvider =
    FutureProvider.autoDispose<List<MarketComplaint>>(
      (ref) async =>
          (await ref.watch(yallappApiProvider).listMyComplaints()).items,
    );

const _photoTypes = {'image/jpeg', 'image/png', 'image/webp'};
const _photoMax = 8 * 1024 * 1024;
const _photosMax = 5;
const _textMax = 2000;

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

/// 115.54 A reason as its tile and the ticket's title say it, shortly.
String complaintReasonShort(AppLocalizations l10n, ComplaintReason r) =>
    switch (r) {
      ComplaintReason.late => l10n.mcReasonLate,
      ComplaintReason.missingItems => l10n.mcReasonMissing,
      ComplaintReason.wrongItems => l10n.mcReasonWrong,
      ComplaintReason.quality => l10n.mcReasonQuality,
      ComplaintReason.damaged => l10n.mcReasonDamaged,
      ComplaintReason.notDelivered => l10n.mcReasonNotDelivered,
      ComplaintReason.chargedWrong => l10n.mcReasonCharged,
      ComplaintReason.courier => l10n.mcReasonCourier,
      ComplaintReason.other => l10n.mcReasonOther,
    };

IconData _reasonIcon(ComplaintReason r) => switch (r) {
  ComplaintReason.missingItems => Symbols.inventory_2,
  ComplaintReason.wrongItems => Symbols.swap_horiz,
  ComplaintReason.quality => Symbols.sentiment_dissatisfied,
  ComplaintReason.damaged => Symbols.broken_image,
  ComplaintReason.late => Symbols.schedule,
  ComplaintReason.chargedWrong => Symbols.receipt_long,
  ComplaintReason.courier => Symbols.two_wheeler,
  ComplaintReason.notDelivered => Symbols.local_shipping,
  ComplaintReason.other => Symbols.more_horiz,
};

String complaintStatusText(AppLocalizations l10n, ComplaintStatus s) =>
    switch (s) {
      ComplaintStatus.open => l10n.marketComplaintOpen,
      ComplaintStatus.inReview => l10n.marketComplaintInReview,
      ComplaintStatus.waitingForCustomer => l10n.marketComplaintWaiting,
      ComplaintStatus.resolved => l10n.marketComplaintResolved,
      ComplaintStatus.rejected => l10n.marketComplaintRejected,
    };

/// The brand colour as text and icons on cards: lightened at night so it
/// reads on dark surfaces (the designs' mint).
Color _ink(AppPalette p) =>
    p.isDark ? Color.lerp(p.primary, Colors.white, 0.55)! : p.primary;

/// The app's name, as "`<App name>` support" says it.
String _appName(WidgetRef ref) => ref.watch(appConfigProvider).site.name;

String _time(DateTime at) => DateFormat('HH:mm', 'en').format(at.toLocal());

bool _sameDay(DateTime a, DateTime b) {
  final x = a.toLocal();
  final y = b.toLocal();
  return x.year == y.year && x.month == y.month && x.day == y.day;
}

/// "18 December" with the day in Latin digits, as the app writes numbers.
String _dayMonth(AppLocalizations l10n, DateTime at, {bool short = false}) {
  final d = at.toLocal();
  return '${d.day} ${DateFormat(short ? 'MMM' : 'MMMM', l10n.localeName).format(d)}';
}

/// "Today 20:41", else "18 Nov, 20:41".
String _when(AppLocalizations l10n, DateTime at) => _sameDay(at, DateTime.now())
    ? l10n.mcTodayAt(_time(at))
    : '${_dayMonth(l10n, at, short: true)}, ${_time(at)}';

/// "White cheese, sliced and Bananas", for the items a complaint is about.
String _itemsText(AppLocalizations l10n, List<String> names) {
  if (names.isEmpty) return '';
  if (names.length == 1) return names.single;
  return l10n.mcAnd(names.sublist(0, names.length - 1).join(', '), names.last);
}

/// "780 g" for a weighed line, "×2" for a counted one.
String _lineAmount(MarketOrderLine l) {
  final q = l.pickedQuantity ?? l.quantity;
  String n(double v) => v == v.roundToDouble() ? '${v.round()}' : '$v';
  return switch (l.unit) {
    ProductUnit.kg => '${(q * 1000).round()} g',
    ProductUnit.g => '${n(q)} g',
    ProductUnit.l => '${n(q)} l',
    ProductUnit.item => '×${n(q)}',
  };
}

/// A round button over the page (close, back), as the designs draw it.
class _RoundButton extends StatelessWidget {
  const _RoundButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: p.surface,
        shape: CircleBorder(side: BorderSide(color: p.border)),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox(
            width: 52,
            height: 52,
            child: Icon(icon, size: 26, color: p.text),
          ),
        ),
      ),
    );
  }
}

/// The screens' header: a round button, the title and a line under it, and
/// something at the end (the time left, the status). Under a Studio page's
/// own header the title is left out.
class _Header extends StatelessWidget {
  const _Header({
    required this.leading,
    required this.title,
    this.subtitle,
    this.trailing,
    this.avatar,
  });

  final Widget leading;

  /// Before the title: support's round mark (06b).
  final Widget? avatar;
  final String title;
  final Widget? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (StudioScreenScope.hidesTitleOf(context)) {
      return trailing == null
          ? const SizedBox(height: 8)
          : Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(16, 8, 16, 0),
              child: Align(
                alignment: AlignmentDirectional.centerEnd,
                child: trailing,
              ),
            );
    }
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(16, 8, 16, 8),
      child: Row(
        children: [
          leading,
          const SizedBox(width: 14),
          if (avatar != null) ...[avatar!, const SizedBox(width: 12)],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 22,
                    height: 1.15,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
                if (subtitle != null)
                  DefaultTextStyle.merge(
                    style: TextStyle(fontSize: 13.5, color: p.textSecondary),
                    child: subtitle!,
                  ),
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 10),
            // At most 45% of the row, so the title keeps its room at large text.
            ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.sizeOf(context).width * 0.45,
              ),
              child: trailing!,
            ),
          ],
        ],
      ),
    );
  }
}

/// A small rounded label: the time left (amber), a status.
class _Pill extends StatelessWidget {
  const _Pill({
    required this.label,
    required this.background,
    required this.foreground,
    this.icon,
    this.border,
  });

  final String label;
  final Color background;
  final Color foreground;
  final IconData? icon;
  final Color? border;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
    decoration: BoxDecoration(
      color: background,
      borderRadius: BorderRadius.circular(999),
      border: border == null ? null : Border.all(color: border!),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 18, fill: 1, color: foreground),
          const SizedBox(width: 6),
        ],
        Flexible(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
              color: foreground,
            ),
          ),
        ),
      ],
    ),
  );
}

Widget _statusPill(BuildContext context, MarketComplaint c) {
  final p = context.palette;
  final l10n = context.l10n;
  return switch (c.status) {
    ComplaintStatus.resolved => _Pill(
      label: l10n.mcPillResolved,
      background: p.successSoft,
      foreground: p.success,
    ),
    ComplaintStatus.rejected => _Pill(
      label: l10n.mcPillClosed,
      background: p.surface,
      foreground: p.text,
      border: p.border,
    ),
    ComplaintStatus.inReview => _Pill(
      label: l10n.mcPillInReview,
      background: p.timerSoft,
      foreground: p.onTimerSoft,
    ),
    _ => _Pill(
      label: complaintStatusText(l10n, c.status),
      background: p.timerSoft,
      foreground: p.onTimerSoft,
    ),
  };
}

/// "47 h left", from the order's `complaint_until`.
String? _timeLeft(AppLocalizations l10n, DateTime? until) {
  if (until == null) return null;
  final left = until.difference(DateTime.now());
  if (left.isNegative) return null;
  if (left.inMinutes < 60) return l10n.mcMinutesLeft(left.inMinutes);
  return l10n.mcHoursLeft(left.inHours);
}

/// 115.54 Opening a complaint (design 06a): what went wrong, the items (the
/// whole order unless some are chosen), up to five photos and 2,000
/// characters, with the time left to send it. It goes to the app's support,
/// never to the store.
class MarketNewComplaintScreen extends ConsumerStatefulWidget {
  const MarketNewComplaintScreen({super.key, required this.orderId});

  final int orderId;

  @override
  ConsumerState<MarketNewComplaintScreen> createState() =>
      _MarketNewComplaintScreenState();
}

class _MarketNewComplaintScreenState
    extends ConsumerState<MarketNewComplaintScreen> {
  ComplaintReason? _reason;
  final _lines = <int>{};
  final _text = TextEditingController();
  final _photos = <ChatFile>[];
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _text.addListener(() => setState(() {}));
  }

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
    final reason = _reason;
    if (reason == null) {
      showMessage(context, l10n.mcWhatWentWrong);
      return;
    }
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
        reason: reason,
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
      ref.invalidate(marketMyComplaintsProvider);
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
    final app = _appName(ref);
    final order = ref.watch(marketOrderProvider(widget.orderId)).value;
    final left = _timeLeft(l10n, order?.complaintUntil);
    final arrived = order?.timeline
        .where(
          (s) =>
              s.status == MarketOrderStatus.delivered ||
              s.status == MarketOrderStatus.pickedUp,
        )
        .lastOrNull
        ?.at;
    final reasons = [
      ComplaintReason.missingItems,
      ComplaintReason.wrongItems,
      ComplaintReason.quality,
      ComplaintReason.damaged,
      ComplaintReason.late,
      ComplaintReason.chargedWrong,
      ComplaintReason.courier,
      // An order that hasn't arrived: "Not delivered" before "Something else".
      if (order != null && !order.finished) ComplaintReason.notDelivered,
      ComplaintReason.other,
    ];
    final lines = order?.lines.where((l) => l.id != null).toList() ?? const [];
    return Scaffold(
      backgroundColor: p.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Header(
              leading: _RoundButton(
                icon: Symbols.close,
                label: l10n.mcClose,
                onPressed: () => Navigator.of(context).maybePop(),
              ),
              title: l10n.marketReportProblem,
              subtitle: order == null
                  ? null
                  : Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(text: '${order.vendor.name} · '),
                          TextSpan(
                            text: ltrRun(order.reference),
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: p.textBody,
                            ),
                          ),
                          if (arrived != null)
                            TextSpan(
                              text: ' · ${l10n.mcArrivedAt(_time(arrived))}',
                            ),
                        ],
                      ),
                    ),
              trailing: left == null
                  ? null
                  : _Pill(
                      icon: Symbols.timer,
                      label: left,
                      background: p.accent,
                      foreground: p.onAccent,
                    ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                children: [
                  _Heading(l10n.mcWhatWentWrong),
                  _ReasonGrid(
                    reasons: reasons,
                    selected: _reason,
                    onSelected: (r) => setState(() => _reason = r),
                  ),
                  if (lines.isNotEmpty) ...[
                    const SizedBox(height: 22),
                    _Heading(
                      l10n.marketWhichItems,
                      trailing: TextButton(
                        onPressed: _lines.isEmpty
                            ? null
                            : () => setState(_lines.clear),
                        style: TextButton.styleFrom(
                          foregroundColor: p.textSecondary,
                          disabledForegroundColor: p.textSecondary,
                          padding: EdgeInsets.zero,
                          minimumSize: const Size(0, 36),
                        ),
                        child: Text(
                          l10n.mcWholeOrder,
                          style: const TextStyle(fontSize: 14),
                        ),
                      ),
                    ),
                    _Card(
                      child: Column(
                        children: [
                          for (final (i, line) in lines.indexed) ...[
                            if (i > 0)
                              Divider(
                                height: 1,
                                indent: 12,
                                endIndent: 12,
                                color: p.divider,
                              ),
                            _ItemRow(
                              line: line,
                              checked: _lines.contains(line.id),
                              onChanged: (v) => setState(
                                () => v
                                    ? _lines.add(line.id!)
                                    : _lines.remove(line.id),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 22),
                  _Heading(
                    l10n.mcPhotos,
                    trailing: Text(
                      l10n.mcPhotosOf(_photos.length),
                      style: TextStyle(fontSize: 14, color: p.textSecondary),
                    ),
                  ),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      for (final (i, photo) in _photos.indexed)
                        _PhotoTile(
                          file: photo,
                          onRemove: () => setState(() => _photos.removeAt(i)),
                        ),
                      if (_photos.length < _photosMax)
                        _AddPhotoTile(onTap: _addPhoto),
                    ],
                  ),
                  const SizedBox(height: 22),
                  _Heading(l10n.mcTellUsMore),
                  _TextArea(controller: _text, hint: l10n.marketTellUs),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Icon(
                          Symbols.lock,
                          size: 18,
                          color: p.textSecondary,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          l10n.mcPrivacy(app),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13.5,
                            color: p.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _BigButton(
                    label: l10n.marketSendComplaint,
                    icon: Symbols.send,
                    loading: _sending,
                    onPressed: _send,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text, {this.trailing});

  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(
      children: [
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: context.palette.text,
            ),
          ),
        ),
        ?trailing,
      ],
    ),
  );
}

class _Card extends StatelessWidget {
  const _Card({required this.child, this.padding = EdgeInsets.zero});

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: p.border),
      ),
      child: child,
    );
  }
}

/// Four tiles a row, each the same height as the tallest in its row.
class _ReasonGrid extends StatelessWidget {
  const _ReasonGrid({
    required this.reasons,
    required this.selected,
    required this.onSelected,
  });

  final List<ComplaintReason> reasons;
  final ComplaintReason? selected;
  final ValueChanged<ComplaintReason> onSelected;

  @override
  Widget build(BuildContext context) {
    final rows = <List<ComplaintReason>>[];
    for (var i = 0; i < reasons.length; i += 4) {
      rows.add(reasons.sublist(i, (i + 4).clamp(0, reasons.length)));
    }
    return Column(
      children: [
        for (final (i, row) in rows.indexed) ...[
          if (i > 0) const SizedBox(height: 10),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var j = 0; j < 4; j++) ...[
                  if (j > 0) const SizedBox(width: 9),
                  Expanded(
                    child: j < row.length
                        ? _ReasonTile(
                            reason: row[j],
                            selected: selected == row[j],
                            onTap: () => onSelected(row[j]),
                          )
                        : const SizedBox.shrink(),
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _ReasonTile extends StatelessWidget {
  const _ReasonTile({
    required this.reason,
    required this.selected,
    required this.onTap,
  });

  final ComplaintReason reason;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final label = complaintReasonShort(context.l10n, reason);
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: selected ? marketTint(p, p.primary, 0.14) : p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: selected ? p.primary : p.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 14),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  _reasonIcon(reason),
                  size: 28,
                  fill: selected ? 1 : 0,
                  color: selected ? _ink(p) : p.textBody,
                ),
                const SizedBox(height: 6),
                Text(
                  label,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13.5,
                    height: 1.15,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                    color: selected ? _ink(p) : p.text,
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

class _ItemRow extends StatelessWidget {
  const _ItemRow({
    required this.line,
    required this.checked,
    required this.onChanged,
  });

  final MarketOrderLine line;
  final bool checked;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      checked: checked,
      label: line.name,
      excludeSemantics: true,
      child: InkWell(
        onTap: () => onChanged(!checked),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              _Check(checked: checked),
              const SizedBox(width: 14),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  width: 52,
                  height: 52,
                  child: AppNetworkImage(
                    url: line.imageUrl,
                    seed: line.id ?? 0,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  line.name,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                ltrRun(_lineAmount(line)),
                style: TextStyle(fontSize: 14.5, color: p.textBody),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Check extends StatelessWidget {
  const _Check({required this.checked});

  final bool checked;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: checked ? p.primary : p.surface,
        borderRadius: BorderRadius.circular(9),
        border: Border.all(color: checked ? p.primary : p.border, width: 1.5),
      ),
      child: checked
          ? Icon(Symbols.check, size: 20, weight: 700, color: p.onPrimary)
          : null,
    );
  }
}

class _PhotoTile extends StatelessWidget {
  const _PhotoTile({required this.file, required this.onRemove});

  final ChatFile file;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return SizedBox(
      width: 74,
      height: 74,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: FutureBuilder<List<int>>(
                future: file.read(0, file.size),
                builder: (context, snap) {
                  final bytes = snap.data;
                  return bytes == null
                      ? ColoredBox(
                          color: p.surfaceMuted,
                          child: Icon(Symbols.image, color: p.textSecondary),
                        )
                      : Image.memory(
                          Uint8List.fromList(bytes),
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => ColoredBox(
                            color: p.surfaceMuted,
                            child: Icon(Symbols.image, color: p.textSecondary),
                          ),
                        );
                },
              ),
            ),
          ),
          PositionedDirectional(
            top: -6,
            end: -6,
            child: Semantics(
              button: true,
              label: context.l10n.mcRemovePhoto,
              excludeSemantics: true,
              child: GestureDetector(
                onTap: onRemove,
                child: Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    color: p.text,
                    shape: BoxShape.circle,
                    border: Border.all(color: p.background, width: 2),
                  ),
                  child: Icon(Symbols.close, size: 16, color: p.background),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AddPhotoTile extends StatelessWidget {
  const _AddPhotoTile({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final label = context.l10n.mcAdd;
    return Semantics(
      button: true,
      label: context.l10n.marketAddPhoto,
      excludeSemantics: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: CustomPaint(
          painter: _DashedBorder(color: _ink(p), radius: 18),
          child: SizedBox(
            width: 74,
            height: 74,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Symbols.add_a_photo, size: 24, color: _ink(p)),
                const SizedBox(height: 2),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: _ink(p),
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

class _DashedBorder extends CustomPainter {
  _DashedBorder({required this.color, required this.radius});

  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Offset.zero & size,
          Radius.circular(radius),
        ).deflate(0.75),
      );
    for (final metric in path.computeMetrics()) {
      var d = 0.0;
      while (d < metric.length) {
        canvas.drawPath(metric.extractPath(d, d + 5), paint);
        d += 9;
      }
    }
  }

  @override
  bool shouldRepaint(_DashedBorder old) =>
      old.color != color || old.radius != radius;
}

class _TextArea extends StatelessWidget {
  const _TextArea({required this.controller, required this.hint});

  final TextEditingController controller;
  final String hint;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _ink(p), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          TextField(
            controller: controller,
            minLines: 2,
            maxLines: 6,
            maxLength: _textMax,
            style: TextStyle(fontSize: 16, height: 1.4, color: p.text),
            decoration: InputDecoration(
              hintText: hint,
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              filled: false,
              isCollapsed: true,
              counterText: '',
            ),
          ),
          const SizedBox(height: 6),
          Text(
            ltrRun(context.l10n.mcCharCount(controller.text.characters.length)),
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: p.textTertiary,
            ),
          ),
        ],
      ),
    );
  }
}

/// The big rounded primary button of these screens.
class _BigButton extends StatelessWidget {
  const _BigButton({
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
    this.outlined = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final fg = outlined ? p.text : p.onPrimary;
    final child = Row(
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (loading)
          SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.4, color: fg),
          )
        else if (icon != null)
          Icon(icon, size: 24, color: fg),
        if (loading || icon != null) const SizedBox(width: 10),
        Flexible(
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: fg,
            ),
          ),
        ),
      ],
    );
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(999),
      side: outlined ? BorderSide(color: p.border) : BorderSide.none,
    );
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 58, minWidth: 64),
      child: Material(
        color: outlined ? Colors.transparent : p.primary,
        shape: shape,
        child: InkWell(
          customBorder: shape,
          onTap: loading ? null : onPressed,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            child: Center(child: child),
          ),
        ),
      ),
    );
  }
}

/// 115.54 A complaint (designs 06b and 06c): while support works on it, the
/// conversation with "`<App>` support" (D4: the ticket's own thread, shown in
/// Support); once decided, the decision, four ways, with Reply back to the
/// conversation, which stays open without reopening the decision.
class MarketComplaintScreen extends ConsumerStatefulWidget {
  const MarketComplaintScreen({super.key, required this.complaintId});

  final int complaintId;

  @override
  ConsumerState<MarketComplaintScreen> createState() =>
      _MarketComplaintScreenState();
}

class _MarketComplaintScreenState extends ConsumerState<MarketComplaintScreen> {
  /// After a decision: the conversation instead of the decision.
  bool _chat = false;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final complaint = ref.watch(marketComplaintProvider(widget.complaintId));
    return Scaffold(
      backgroundColor: p.background,
      body: SafeArea(
        child: complaint.when(
          loading: () => const SkeletonDetail(),
          error: (e, _) => MessageView(
            icon: Symbols.error,
            title: l10n.marketViewComplaint,
            message: '$e',
            actionLabel: l10n.marketBrowse,
            onAction: () =>
                ref.invalidate(marketComplaintProvider(widget.complaintId)),
          ),
          data: (c) => c.decision != null && !_chat
              ? _DecisionView(
                  complaint: c,
                  onReply: () => setState(() => _chat = true),
                )
              : _ChatView(
                  complaint: c,
                  onBack: c.decision != null
                      ? () => setState(() => _chat = false)
                      : null,
                ),
        ),
      ),
    );
  }
}

/// 06b The conversation with support, under the ticket's card.
class _ChatView extends ConsumerStatefulWidget {
  const _ChatView({required this.complaint, this.onBack});

  final MarketComplaint complaint;

  /// Back to the decision, after one.
  final VoidCallback? onBack;

  @override
  ConsumerState<_ChatView> createState() => _ChatViewState();
}

class _ChatViewState extends ConsumerState<_ChatView> {
  final _message = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  void _refresh() {
    ref.invalidate(marketComplaintProvider(widget.complaint.id));
    ref.invalidate(marketMyComplaintsProvider);
  }

  Future<void> _send() async {
    final text = _message.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(yallappApiProvider)
          .addComplaintMessage(widget.complaint.id, text);
      _message.clear();
      _refresh();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
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
        setState(() => _sending = true);
        try {
          final uploadId = await uploadChatFile(
            ref.read(marketUploadsProvider),
            file,
          );
          await ref
              .read(yallappApiProvider)
              .addComplaintPhoto(widget.complaint.id, uploadId);
          _refresh();
        } on ApiException catch (e) {
          if (mounted) showMessage(context, e.message);
        } finally {
          if (mounted) setState(() => _sending = false);
        }
      case ChatPicked() || ChatPickUnsupported():
        showMessage(context, l10n.marketPhotoType);
    }
  }

  /// A quick reply goes into the box, to be sent with Send.
  void _quick(String text) {
    _message
      ..text = text
      ..selection = TextSelection.collapsed(offset: text.length);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final c = widget.complaint;
    final app = _appName(ref);
    final order = ref.watch(marketOrderProvider(c.orderId)).value;
    final agent = c.supportAgent;
    final photosOpen = !c.closed && c.photos.length < _photosMax;
    final support = l10n.mcSupportName(app);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Header(
          leading: _RoundButton(
            icon: AppIcons.back,
            label: l10n.back,
            onPressed: widget.onBack ?? () => Navigator.of(context).maybePop(),
          ),
          avatar: const _SupportAvatar(),
          title: support,
          subtitle: Text(
            agent == null ? l10n.mcAnsweringNobody : l10n.mcAnswering(agent),
          ),
          trailing: null,
        ),
        Divider(height: 1, color: p.divider),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
            children: [
              _TicketCard(complaint: c, order: order),
              const SizedBox(height: 14),
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: p.segment,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    _sameDay(c.createdAt, DateTime.now())
                        ? l10n.mcToday
                        : _dayMonth(l10n, c.createdAt),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: p.textSecondary,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              _Bubble(
                mine: true,
                at: c.createdAt,
                photos: c.photos,
                text: c.text,
              ),
              for (final m in c.messages)
                if (m.taken)
                  _TakenLine(name: m.agent, app: app)
                else
                  _Bubble(
                    mine: !m.fromSupport,
                    at: m.at,
                    text: m.text,
                    who: m.fromSupport
                        ? (m.agent == null
                              ? support
                              : l10n.mcAgentSupport(m.agent!, app))
                        : null,
                  ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _QuickChip(
                label: l10n.mcQuickThanks,
                onTap: () => _quick(l10n.mcQuickThanks),
              ),
              if (photosOpen)
                _QuickChip(
                  label: l10n.marketAddPhoto,
                  onTap: _sending ? null : _addPhoto,
                ),
              _QuickChip(
                label: l10n.mcQuickOkay,
                onTap: () => _quick(l10n.mcQuickOkay),
              ),
            ],
          ),
        ),
        Container(
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: p.divider)),
          ),
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
          child: Row(
            children: [
              if (photosOpen) ...[
                Semantics(
                  button: true,
                  label: l10n.marketAddPhoto,
                  excludeSemantics: true,
                  child: Material(
                    color: p.surface,
                    shape: CircleBorder(side: BorderSide(color: p.border)),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: _sending ? null : _addPhoto,
                      child: SizedBox(
                        width: 52,
                        height: 52,
                        child: Icon(Symbols.add_photo_alternate, color: p.text),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: TextField(
                  controller: _message,
                  minLines: 1,
                  maxLines: 4,
                  maxLength: _textMax,
                  style: TextStyle(fontSize: 16, color: p.text),
                  decoration: InputDecoration(
                    hintText: l10n.mcWriteToSupport,
                    counterText: '',
                    filled: true,
                    fillColor: p.surfaceMuted,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 14,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(999),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(999),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(999),
                      borderSide: BorderSide(color: p.primary),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Semantics(
                button: true,
                label: l10n.marketSendComplaint,
                excludeSemantics: true,
                child: Tooltip(
                  message: l10n.marketSendComplaint,
                  child: Material(
                    color: p.primary,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: _sending ? null : _send,
                      child: SizedBox(
                        width: 56,
                        height: 56,
                        child: _sending
                            ? Padding(
                                padding: const EdgeInsets.all(17),
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.4,
                                  color: p.onPrimary,
                                ),
                              )
                            : Transform.flip(
                                flipX:
                                    Directionality.of(context) ==
                                    TextDirection.rtl,
                                child: Icon(
                                  Symbols.send,
                                  fill: 1,
                                  color: p.onPrimary,
                                ),
                              ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Support's round mark with the dot that says it answers here.
class _SupportAvatar extends StatelessWidget {
  const _SupportAvatar();

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return SizedBox(
      width: 56,
      height: 56,
      child: Stack(
        children: [
          Container(
            decoration: BoxDecoration(shape: BoxShape.circle, color: p.primary),
            alignment: Alignment.center,
            child: Icon(Symbols.support_agent, size: 30, color: p.accent),
          ),
          PositionedDirectional(
            end: 0,
            bottom: 2,
            child: Container(
              width: 16,
              height: 16,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: p.success,
                border: Border.all(color: p.background, width: 2.5),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TicketCard extends StatelessWidget {
  const _TicketCard({required this.complaint, required this.order});

  final MarketComplaint complaint;
  final MarketOrder? order;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final c = complaint;
    final photos = c.photos.take(2).toList();
    return _Card(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Row(
        children: [
          if (photos.isNotEmpty) ...[
            SizedBox(
              width: 22.0 + 30 * photos.length,
              height: 56,
              child: Stack(
                children: [
                  for (final (i, url) in photos.indexed)
                    PositionedDirectional(
                      start: i * 26.0,
                      top: 0,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: p.surface, width: 2),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: SizedBox(
                            width: 50,
                            height: 52,
                            child: AppNetworkImage(url: url, seed: i),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.mcComplaintReason(
                    ltrRun(c.reference),
                    complaintReasonShort(l10n, c.reason),
                  ),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
                Text(
                  [
                    if (order != null)
                      l10n.mcOrderRef(ltrRun(order!.reference)),
                    l10n.mcItemsCount(c.lineIds.length),
                  ].join(' · '),
                  style: TextStyle(fontSize: 14, color: p.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _statusPill(context, c),
        ],
      ),
    );
  }
}

class _TakenLine extends StatelessWidget {
  const _TakenLine({required this.name, required this.app});

  final String? name;
  final String app;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (name == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Symbols.person_add, size: 20, fill: 1, color: p.accent),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              context.l10n.mcTook(name!, app),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: p.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({
    required this.mine,
    required this.at,
    required this.text,
    this.who,
    this.photos = const [],
  });

  final bool mine;
  final DateTime at;
  final String text;
  final String? who;
  final List<String> photos;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final fg = mine ? p.onPrimary : p.text;
    return Align(
      alignment: mine
          ? AlignmentDirectional.centerEnd
          : AlignmentDirectional.centerStart,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.8,
        ),
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
        decoration: BoxDecoration(
          color: mine ? p.primary : p.surface,
          borderRadius: BorderRadius.circular(22),
          boxShadow: mine
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (who != null) ...[
              Text(
                who!,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w800,
                  color: _ink(p),
                ),
              ),
              const SizedBox(height: 6),
            ],
            if (photos.isNotEmpty) ...[
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final (i, url) in photos.indexed)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: SizedBox(
                        width: 96,
                        height: 72,
                        child: AppNetworkImage(url: url, seed: i),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),
            ],
            if (text.isNotEmpty)
              Text(
                text,
                style: TextStyle(fontSize: 16, height: 1.4, color: fg),
              ),
            const SizedBox(height: 4),
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: Text(
                ltrRun(_time(at)),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: mine
                      ? p.onPrimary.withValues(alpha: 0.75)
                      : p.textSecondary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickChip extends StatelessWidget {
  const _QuickChip({required this.label, required this.onTap});

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Material(
      color: p.surface,
      shape: StadiumBorder(side: BorderSide(color: p.border)),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: _ink(p),
            ),
          ),
        ),
      ),
    );
  }
}

enum _Way { card, wallet, coupon, declined }

_Way _wayOf(ComplaintDecision d) {
  if (d.outcome == 'no_refund') return _Way.declined;
  return switch (d.to) {
    'coupon' => _Way.coupon,
    'payment' => _Way.card,
    _ => _Way.wallet,
  };
}

/// 06c The decision, four ways: refund to the card, to the wallet, a
/// coupon, or declined with support's reason; the steps so far; one more
/// complaint allowed on the order; Reply back to the conversation.
class _DecisionView extends ConsumerWidget {
  const _DecisionView({required this.complaint, required this.onReply});

  final MarketComplaint complaint;
  final VoidCallback onReply;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final c = complaint;
    final d = c.decision!;
    final way = _wayOf(d);
    final app = _appName(ref);
    final order = ref.watch(marketOrderProvider(c.orderId)).value;
    final names = order == null
        ? const <String>[]
        : [
            for (final l in order.lines)
              if (l.id != null && c.lineIds.contains(l.id)) l.name,
          ];
    final items = _itemsText(l10n, names);
    final amount = d.amount?.formatted ?? '';
    final decidedAt = d.at ?? c.messages.lastOrNull?.at ?? c.createdAt;
    final agent = d.agent ?? c.supportAgent;
    void back() => Navigator.of(context).maybePop();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Header(
          leading: _RoundButton(
            icon: AppIcons.back,
            label: l10n.back,
            onPressed: back,
          ),
          title: l10n.marketComplaintTitle(ltrRun(c.reference)),
          subtitle: order == null
              ? null
              : Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(text: '${order.vendor.name} · '),
                      TextSpan(text: l10n.mcOrderRef('')),
                      TextSpan(
                        text: ltrRun(order.reference),
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: p.textBody,
                        ),
                      ),
                    ],
                  ),
                ),
          trailing: _statusPill(context, c),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            children: [
              if (way == _Way.declined)
                _DeclinedCard(
                  reason: d.reason ?? '',
                  by: agent == null
                      ? l10n.mcSupportName(app)
                      : l10n.mcDecidedByName(agent, app),
                  when: _when(l10n, decidedAt),
                )
              else
                _HeroCard(
                  icon: switch (way) {
                    _Way.card => Symbols.credit_card,
                    _Way.wallet => Symbols.account_balance_wallet,
                    _ => Symbols.confirmation_number,
                  },
                  title: switch (way) {
                    _Way.card => l10n.mcCardTitle,
                    _Way.wallet => l10n.mcWalletTitle,
                    _ => l10n.mcCouponTitle,
                  },
                  amount: amount,
                  body: switch (way) {
                    _Way.card =>
                      items.isEmpty
                          ? l10n.mcCardBody
                          : l10n.mcCardBodyItems(items),
                    _Way.wallet =>
                      d.outcome == 'compensation'
                          ? l10n.mcWalletBodyApology(app)
                          : items.isEmpty
                          ? l10n.mcWalletBody(app)
                          : l10n.mcWalletBodyItems(items, app),
                    _ => l10n.mcCouponBody(order?.vendor.name ?? app),
                  },
                  code: way == _Way.coupon ? d.couponCode : null,
                  facts: switch (way) {
                    _Way.card => [
                      (l10n.mcTo, _payLabel(l10n, order)),
                      (
                        l10n.mcOrderTotalNow,
                        order == null
                            ? '—'
                            : _totalNow(
                                order,
                                d,
                                ref.watch(appConfigProvider).market?.currency ??
                                    '',
                              ),
                      ),
                    ],
                    _Way.wallet => [
                      (
                        l10n.mcWalletBalance,
                        ref
                                .watch(marketWalletProvider)
                                .value
                                ?.balance
                                .formatted ??
                            '—',
                      ),
                      (l10n.mcAdded, _when(l10n, decidedAt)),
                    ],
                    _ => [
                      (
                        l10n.mcValidUntil,
                        d.couponEndsAt == null
                            ? '—'
                            : _dayMonth(l10n, d.couponEndsAt!),
                      ),
                      (l10n.mcUse, l10n.mcOnce),
                    ],
                  },
                ),
              const SizedBox(height: 14),
              _Steps(
                complaint: c,
                items: items,
                agent: agent,
                last: switch (way) {
                  _Way.card => l10n.mcStepCard(amount),
                  _Way.wallet =>
                    d.outcome == 'compensation'
                        ? l10n.mcStepCompensation(amount)
                        : l10n.mcStepWallet(amount),
                  _Way.coupon => l10n.mcStepCoupon(amount),
                  _Way.declined => l10n.mcStepDeclined,
                },
                lastAt: _when(l10n, decidedAt),
                declined: way == _Way.declined,
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
          child: Column(
            children: [
              if (c.canOpenAnother) ...[
                InkWell(
                  onTap: () => context.push(Paths.marketComplain(c.orderId)),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Icon(
                          Symbols.info,
                          size: 19,
                          color: p.textSecondary,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          l10n.mcOneMore,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            color: p.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
              Row(
                children: [
                  Expanded(
                    flex: 9,
                    child: way == _Way.declined
                        ? _BigButton(
                            label: l10n.mcClose,
                            icon: Symbols.close,
                            outlined: true,
                            onPressed: back,
                          )
                        : _BigButton(
                            label: l10n.mcReply,
                            icon: Symbols.chat,
                            outlined: true,
                            onPressed: onReply,
                          ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 11,
                    child: switch (way) {
                      _Way.card => _BigButton(
                        label: l10n.mcDone,
                        onPressed: back,
                      ),
                      _Way.wallet => _BigButton(
                        label: l10n.mcOpenWallet,
                        onPressed: () => context.push(Paths.marketWallet),
                      ),
                      _Way.coupon => _BigButton(
                        label: l10n.mcShopNow,
                        onPressed: () => order == null
                            ? back()
                            : context.push(
                                Paths.marketVendor('${order.vendor.id}'),
                              ),
                      ),
                      _Way.declined => _BigButton(
                        label: l10n.mcReplyToSupport,
                        onPressed: onReply,
                      ),
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

String _payLabel(AppLocalizations l10n, MarketOrder? order) =>
    switch (order?.payMethod) {
      MarketPayMethod.applePay => 'Apple Pay',
      MarketPayMethod.googlePay => 'Google Pay',
      _ => l10n.marketPayCard,
    };

/// The order's total less this refund, in the app's currency.
String _totalNow(MarketOrder order, ComplaintDecision d, String currency) {
  final total = double.tryParse(order.total.amount);
  final refund = double.tryParse(d.amount?.amount ?? '');
  if (total == null || refund == null) return order.total.formatted;
  final decimals = order.total.amount.contains('.')
      ? order.total.amount.split('.').last.length
      : 0;
  return marketAmount(
    (total - refund).clamp(0, double.infinity).toDouble(),
    currency,
    decimals,
  );
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.icon,
    required this.title,
    required this.amount,
    required this.body,
    required this.facts,
    this.code,
  });

  final IconData icon;
  final String title;
  final String amount;
  final String body;
  final List<(String, String)> facts;
  final String? code;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final deep = marketDeeper(p.primary, 0.3);
    const white = Colors.white;
    return ClipRRect(
      borderRadius: BorderRadius.circular(36),
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: AlignmentDirectional.topStart,
            end: AlignmentDirectional.bottomEnd,
            colors: [deep, marketDeeper(p.primary, 0.12)],
          ),
        ),
        child: Stack(
          children: [
            PositionedDirectional(
              top: -80,
              end: -60,
              child: Container(
                width: 240,
                height: 240,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      p.accent.withValues(alpha: 0.35),
                      p.accent.withValues(alpha: 0),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: p.accent,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Icon(icon, size: 32, fill: 1, color: p.onAccent),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 26,
                      height: 1.2,
                      fontWeight: FontWeight.w800,
                      color: white,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    ltrRun(amount),
                    style: TextStyle(
                      fontSize: 44,
                      height: 1.1,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                      color: p.accent,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    body,
                    style: TextStyle(
                      fontSize: 15.5,
                      height: 1.45,
                      color: white.withValues(alpha: 0.9),
                    ),
                  ),
                  if (code != null) ...[
                    const SizedBox(height: 16),
                    _CodeBox(code: code!),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final (i, f) in facts.indexed) ...[
                        if (i > 0) const SizedBox(width: 10),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                            decoration: BoxDecoration(
                              color: white.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  f.$1,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: white.withValues(alpha: 0.75),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  f.$2,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    color: white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CodeBox extends StatelessWidget {
  const _CodeBox({required this.code});

  final String code;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return CustomPaint(
      painter: _DashedBorder(color: p.accent, radius: 18),
      child: Row(
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    ltrRun(code),
                    style: const TextStyle(
                      fontFamily: 'JetBrains Mono',
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 2,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    l10n.mcCouponHint,
                    style: TextStyle(
                      fontSize: 13.5,
                      color: Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Semantics(
            button: true,
            label: l10n.mcCopy,
            excludeSemantics: true,
            child: InkWell(
              onTap: () async {
                await Clipboard.setData(ClipboardData(text: code));
                if (context.mounted) showMessage(context, l10n.mcCopied);
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 16,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Symbols.content_copy, size: 22, color: p.accent),
                    const SizedBox(width: 6),
                    Text(
                      l10n.mcCopy,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: p.accent,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DeclinedCard extends StatelessWidget {
  const _DeclinedCard({
    required this.reason,
    required this.by,
    required this.when,
  });

  final String reason;
  final String by;
  final String when;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    Widget fact(String label, String value) => Expanded(
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        decoration: BoxDecoration(
          color: p.background,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: p.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 13, color: p.textSecondary)),
            const SizedBox(height: 2),
            Text(
              value,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
          ],
        ),
      ),
    );
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 22, 18, 18),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(36),
        border: Border.all(color: p.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: p.surfaceMuted,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(Symbols.info, size: 30, fill: 1, color: p.textBody),
          ),
          const SizedBox(height: 18),
          Text(
            l10n.mcDeclinedTitle,
            style: TextStyle(
              fontSize: 26,
              height: 1.2,
              fontWeight: FontWeight.w800,
              color: p.text,
            ),
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: p.surfaceMuted,
              borderRadius: BorderRadius.circular(20),
              border: BorderDirectional(
                start: BorderSide(color: p.accent, width: 4),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.mcWhy,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: p.onTimerSoft,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  reason,
                  style: TextStyle(fontSize: 16, height: 1.5, color: p.text),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              fact(l10n.mcDecidedBy, by),
              const SizedBox(width: 10),
              fact(l10n.mcWhen, when),
            ],
          ),
        ],
      ),
    );
  }
}

/// The steps so far: opened, answered, decided.
class _Steps extends StatelessWidget {
  const _Steps({
    required this.complaint,
    required this.items,
    required this.agent,
    required this.last,
    required this.lastAt,
    required this.declined,
  });

  final MarketComplaint complaint;
  final String items;
  final String? agent;
  final String last;
  final String lastAt;
  final bool declined;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final c = complaint;
    final answers = [
      for (final m in c.messages)
        if (m.fromSupport && !m.taken) m,
    ];
    // The decision's own message isn't an answer of the conversation.
    final talk = answers.length > 1
        ? answers.sublist(0, answers.length - 1)
        : const <
            ({
              bool fromSupport,
              String text,
              DateTime at,
              bool taken,
              String? agent,
            })
          >[];
    final steps = <(IconData, String, String, bool)>[
      (
        Symbols.flag,
        l10n.mcYouOpened,
        [
          complaintReasonShort(l10n, c.reason),
          if (items.isNotEmpty) items,
          if (c.photos.isNotEmpty) l10n.mcPhotosN(c.photos.length),
          _time(c.createdAt),
        ].join(' · '),
        false,
      ),
      if (talk.isNotEmpty)
        (
          Symbols.forum,
          agent == null ? l10n.mcSupportAnswered : l10n.mcAnswered(agent!),
          l10n.mcAnsweredDetail(
            talk.length,
            talk.first.at.difference(c.createdAt).inMinutes.clamp(0, 99999),
          ),
          false,
        ),
      (declined ? Symbols.gavel : Symbols.check, last, lastAt, true),
    ];
    return _Card(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      child: Column(
        children: [
          for (final (i, s) in steps.indexed)
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    width: 36,
                    child: Column(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: s.$4
                                ? p.primary
                                : marketTint(p, p.primary, 0.12),
                          ),
                          child: Icon(
                            s.$1,
                            size: 20,
                            fill: 1,
                            color: s.$4
                                ? p.onPrimary.withValues(alpha: 0.6)
                                : p.textBody,
                          ),
                        ),
                        if (i < steps.length - 1)
                          Expanded(child: Container(width: 2, color: p.border)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(
                        bottom: i < steps.length - 1 ? 14 : 0,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            s.$2,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: p.text,
                            ),
                          ),
                          Text(
                            s.$3,
                            style: TextStyle(
                              fontSize: 14,
                              color: p.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// 115.51 Support's complaints in the Chat tab (D4): the customer's
/// complaints as conversations with "`<App>` support", each opening its
/// thread. Nothing for apps without the marketplace, or without complaints.
class MarketSupportComplaints extends ConsumerWidget {
  const MarketSupportComplaints({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(appConfigProvider).market == null) {
      return const SizedBox.shrink();
    }
    final p = context.palette;
    final l10n = context.l10n;
    final app = _appName(ref);
    final items = ref.watch(marketMyComplaintsProvider).value ?? const [];
    if (items.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(0, 8, 0, 4),
          child: Text(
            l10n.mcChatSection,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: p.textSecondary,
            ),
          ),
        ),
        for (final c in items.take(5))
          InkWell(
            onTap: () => context.push(Paths.marketComplaint(c.id)),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: p.primary,
                    ),
                    child: Icon(
                      Symbols.support_agent,
                      fill: 1,
                      color: p.accent,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.mcSupportName(app),
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                        Text(
                          l10n.mcComplaintReason(
                            ltrRun(c.reference),
                            complaintReasonShort(l10n, c.reason),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            color: p.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  _statusPill(context, c),
                ],
              ),
            ),
          ),
        Divider(height: 1, color: p.divider),
      ],
    );
  }
}
