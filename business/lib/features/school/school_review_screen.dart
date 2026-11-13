import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../media/media_screen.dart' show formatBytes;
import '../studio/studio_widgets.dart';
import 'school_screen.dart';

final _excusesProvider = FutureProvider.autoDispose<List<Excuse>>(
  (ref) async =>
      (await ref.watch(apiProvider).excuses(ref.watch(appIdProvider))).items,
);
final _reportsProvider = FutureProvider.autoDispose<List<SchoolReport>>(
  (ref) async =>
      (await ref.watch(apiProvider).reports(ref.watch(appIdProvider))).items,
);
final _leaveProvider = FutureProvider.autoDispose<List<LeaveRequest>>(
  (ref) async =>
      (await ref.watch(apiProvider).leaveRequests(ref.watch(appIdProvider)))
          .items,
);

/// "12–13 Nov" in the person's language.
String dayRange(BuildContext context, String from, String to) {
  final a = DateTime.tryParse(from);
  final b = DateTime.tryParse(to);
  if (a == null || b == null) return from == to ? from : '$from – $to';
  final full = DateFormat('d MMM', context.lang);
  if (a == b) return full.format(a);
  if (a.month == b.month && a.year == b.year) {
    return '${DateFormat('d', context.lang).format(a)}–${full.format(b)}';
  }
  return '${full.format(a)} – ${full.format(b)}';
}

int dayCount(String from, String to) {
  final a = DateTime.tryParse(from);
  final b = DateTime.tryParse(to);
  if (a == null || b == null) return 1;
  return b.difference(a).inDays.abs() + 1;
}

/// 125 What waits for the head of a school, one at a time (the SchoolExcuse
/// board): absence excuses, teachers' reports and leave requests.
class SchoolReviewScreen extends ConsumerStatefulWidget {
  const SchoolReviewScreen({super.key, this.kind, this.itemId});

  /// excuses, reports or leave.
  final String? kind;

  /// The one a push or a link is about.
  final String? itemId;

  @override
  ConsumerState<SchoolReviewScreen> createState() => _SchoolReviewState();
}

class _SchoolReviewState extends ConsumerState<SchoolReviewScreen> {
  static const kinds = ['excuses', 'reports', 'leave'];
  late String _kind = kinds.contains(widget.kind) ? widget.kind! : 'excuses';
  late String? _itemId = widget.itemId;
  final _note = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  void _after(String message) {
    _note.clear();
    _itemId = null;
    showMessage(context, message);
    ref
      ..invalidate(_excusesProvider)
      ..invalidate(_reportsProvider)
      ..invalidate(_leaveProvider)
      ..invalidate(schoolTodayProvider);
  }

  Future<void> _run(Future<String?> Function() action) async {
    setState(() => _busy = true);
    try {
      final message = await action();
      if (mounted && message != null) _after(message);
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  T? _pick<T>(List<T> items, String Function(T) id) {
    if (items.isEmpty) return null;
    final wanted = _itemId;
    return items.where((i) => id(i) == wanted).firstOrNull ?? items.first;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final api = ref.watch(apiProvider);
    final appId = ref.watch(appIdProvider);
    final excuses = ref.watch(_excusesProvider);
    final reports = ref.watch(_reportsProvider);
    final leave = ref.watch(_leaveProvider);
    int count(AsyncValue<List<Object>> v) => v.value?.length ?? 0;
    final title = switch (_kind) {
      'reports' => l10n.reportTitle,
      'leave' => l10n.leaveTitle,
      _ => l10n.excuseTitle,
    };

    Widget chip(String kind, String label) {
      final on = kind == _kind;
      return Semantics(
        selected: on,
        button: true,
        child: Material(
          color: on ? c.ink : Colors.transparent,
          shape: StadiumBorder(
            side: on ? BorderSide.none : BorderSide(color: c.line),
          ),
          child: InkWell(
            customBorder: const StadiumBorder(),
            onTap: () => setState(() {
              _kind = kind;
              _itemId = null;
              _note.clear();
            }),
            child: Container(
              constraints: const BoxConstraints(minHeight: 36),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              alignment: Alignment.center,
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: on ? c.onInk : c.ink2,
                ),
              ),
            ),
          ),
        ),
      );
    }

    late Widget body;
    Widget? foot;
    switch (_kind) {
      case 'reports':
        final r = reports.value == null
            ? null
            : _pick(reports.value!, (x) => x.id);
        foot = r == null || !r.reviewable
            ? null
            : _foot([
                Expanded(
                  child: BigButton(
                    label: l10n.returnReport,
                    danger: true,
                    onPressed: _busy
                        ? null
                        : () => _run(() async {
                            if (_note.text.trim().isEmpty) {
                              showMessage(context, l10n.writeFirst);
                              return null;
                            }
                            await api.reviewReport(
                              appId,
                              r.id,
                              action: 'return',
                              text: _note.text,
                            );
                            return l10n.reportReturned(r.teacher.name);
                          }),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: BigButton(
                    label: l10n.sendComment,
                    filled: false,
                    onPressed: _busy
                        ? null
                        : () => _run(() async {
                            if (_note.text.trim().isEmpty) {
                              showMessage(context, l10n.writeFirst);
                              return null;
                            }
                            await api.reviewReport(
                              appId,
                              r.id,
                              action: 'comment',
                              text: _note.text,
                            );
                            return l10n.commentSent;
                          }),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: BigButton(
                    label: l10n.approveReport,
                    busy: _busy,
                    onPressed: () => _run(() async {
                      await api.reviewReport(
                        appId,
                        r.id,
                        action: 'approve',
                        text: _note.text,
                      );
                      return l10n.reportApproved;
                    }),
                  ),
                ),
              ]);
        body = AsyncBody(
          value: reports,
          onRetry: () => ref.invalidate(_reportsProvider),
          builder: (_) => r == null
              ? EmptyState(
                  icon: AppIcons.report,
                  title: l10n.noReports,
                  text: l10n.allAnsweredText,
                )
              : _ReportCard(
                  key: ValueKey('report-${r.id}'),
                  report: r,
                  note: _note,
                ),
        );
      case 'leave':
        final l = leave.value == null ? null : _pick(leave.value!, (x) => x.id);
        foot = l == null
            ? null
            : _foot([
                Expanded(
                  child: BigButton(
                    label: l10n.refuseLeave,
                    danger: true,
                    onPressed: _busy
                        ? null
                        : () => _run(() async {
                            await api.answerLeave(
                              appId,
                              l.id,
                              answer: 'refused',
                              note: _note.text,
                            );
                            return l10n.leaveRefused;
                          }),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: BigButton(
                    label: l10n.approveLeave,
                    busy: _busy,
                    onPressed: () => _run(() async {
                      await api.answerLeave(
                        appId,
                        l.id,
                        answer: 'approved',
                        note: _note.text,
                      );
                      return l10n.leaveApproved;
                    }),
                  ),
                ),
              ]);
        body = AsyncBody(
          value: leave,
          onRetry: () => ref.invalidate(_leaveProvider),
          builder: (_) => l == null
              ? EmptyState(
                  icon: AppIcons.leave,
                  title: l10n.noLeave,
                  text: l10n.allAnsweredText,
                )
              : _LeaveCard(leave: l, note: _note),
        );
      default:
        final e = excuses.value == null
            ? null
            : _pick(excuses.value!, (x) => x.id);
        foot = e == null
            ? null
            : _foot([
                Expanded(
                  child: BigButton(
                    label: l10n.decline,
                    danger: true,
                    onPressed: _busy
                        ? null
                        : () => _run(() async {
                            if (_note.text.trim().isEmpty) {
                              showMessage(context, l10n.declineNeedsNote);
                              return null;
                            }
                            await api.answerExcuse(
                              appId,
                              e.id,
                              answer: 'declined',
                              note: _note.text,
                            );
                            return l10n.excuseDeclined;
                          }),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: BigButton(
                    label: l10n.accept,
                    busy: _busy,
                    onPressed: () => _run(() async {
                      await api.answerExcuse(
                        appId,
                        e.id,
                        answer: 'accepted',
                        note: _note.text,
                      );
                      return l10n.excuseAccepted;
                    }),
                  ),
                ),
              ]);
        body = AsyncBody(
          value: excuses,
          onRetry: () => ref.invalidate(_excusesProvider),
          builder: (_) => e == null
              ? EmptyState(
                  icon: AppIcons.excuse,
                  title: l10n.noExcuses,
                  text: l10n.allAnsweredText,
                )
              : _ExcuseCard(excuse: e, note: _note),
        );
    }
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      bottomNavigationBar: foot,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(
              children: [
                chip(
                  'excuses',
                  l10n.chipExcuses(context.number(count(excuses))),
                ),
                const SizedBox(width: 8),
                chip(
                  'reports',
                  l10n.chipReports(context.number(count(reports))),
                ),
                const SizedBox(width: 8),
                chip('leave', l10n.chipLeave(context.number(count(leave)))),
              ],
            ),
          ),
          Expanded(child: body),
        ],
      ),
    );
  }

  Widget _foot(List<Widget> buttons) => SafeArea(
    top: false,
    child: Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Row(children: buttons),
    ),
  );
}

/// A person, their line and the item's status, at the top of a card.
class _Who extends StatelessWidget {
  const _Who({required this.name, required this.line, required this.status});

  final String name;
  final String line;
  final String status;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Initials(initialsOf(name), size: 44),
      const SizedBox(width: 12),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              name,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            Text(line, style: TextStyle(fontSize: 13, color: context.yb.ink2)),
          ],
        ),
      ),
      Tag(status, tone: Tone.warn),
    ],
  );
}

class _Fact extends StatelessWidget {
  const _Fact(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => MergeSemantics(
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: context.yb.muted,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: context.yb.ink2)),
          Text(
            value,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    ),
  );
}

class _Facts extends StatelessWidget {
  const _Facts(this.facts);

  final List<_Fact> facts;

  @override
  Widget build(BuildContext context) => TileGrid(tiles: facts);
}

class _NoteField extends StatelessWidget {
  const _NoteField({required this.controller, required this.label, this.hint});

  final TextEditingController controller;
  final String label;
  final String? hint;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text(
        label,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
      const SizedBox(height: 6),
      TextField(
        controller: controller,
        maxLength: 500,
        minLines: 1,
        maxLines: 4,
        decoration: InputDecoration(hintText: hint, counterText: ''),
      ),
    ],
  );
}

/// What the parent wrote, less its first line when that is the reason.
String _body(Excuse e) {
  final text = e.text.trim();
  final lines = text.split('\n');
  if (lines.length > 1 && lines.first.trim() == e.reasonLabel.trim()) {
    return lines.skip(1).join('\n').trim();
  }
  return text == e.reasonLabel.trim() ? '' : text;
}

class _ExcuseCard extends ConsumerWidget {
  const _ExcuseCard({required this.excuse, required this.note});

  final Excuse excuse;
  final TextEditingController note;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final e = excuse;
    final file = e.attachment;
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      children: [
        Box(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _Who(
                name: e.studentName,
                line: e.classLabel,
                status: e.statusLabel,
              ),
              const SizedBox(height: 12),
              _Facts([
                _Fact(l10n.daysLabel, dayRange(context, e.from, e.to)),
                _Fact(l10n.reasonLabel, e.reasonLabel),
              ]),
              if (_body(e).isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  '“${_body(e)}”',
                  style: const TextStyle(fontSize: 14, height: 1.45),
                ),
              ],
              if (file != null) ...[
                const SizedBox(height: 12),
                Semantics(
                  button: true,
                  label: l10n.openFile(file.name),
                  excludeSemantics: true,
                  child: Material(
                    color: Colors.transparent,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                      side: BorderSide(color: c.line),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: InkWell(
                      onTap: () => openLink(context, ref, file.url),
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: c.infoBg,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(AppIcons.pdf, color: c.info),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    file.name,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  if (file.size != null)
                                    Text(
                                      formatBytes(file.size!),
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: c.ink2,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Icon(AppIcons.web, color: c.ink2),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Text(
                // The relation and even the name may not be kept.
                e.sentByName == null
                    ? l10n.sentWhen(context.ago(e.sentAt))
                    : e.sentByRelation == null
                    ? l10n.sentByOnly(
                        isolate(e.sentByName!),
                        context.ago(e.sentAt),
                      )
                    : l10n.sentByLine(
                        isolate(e.sentByName!),
                        e.sentByRelation!,
                        context.ago(e.sentAt),
                      ),
                style: TextStyle(fontSize: 13, color: c.ink2),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _NoteField(
          controller: note,
          label: l10n.noteToParents,
          hint: l10n.noteNeededDecline,
        ),
        const SizedBox(height: 12),
        Text(
          l10n.excuseExplain(dayCount(e.from, e.to)),
          style: TextStyle(fontSize: 13, color: c.ink2),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _ReportCard extends ConsumerStatefulWidget {
  const _ReportCard({super.key, required this.report, required this.note});

  final SchoolReport report;
  final TextEditingController note;

  @override
  ConsumerState<_ReportCard> createState() => _ReportCardState();
}

class _ReportCardState extends ConsumerState<_ReportCard> {
  // Opening a report marks it read and brings its fields.
  late final Future<SchoolReport> _full = ref
      .read(apiProvider)
      .report(ref.read(appIdProvider), widget.report.id);

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    return FutureBuilder<SchoolReport>(
      future: _full,
      builder: (context, snapshot) {
        final r = snapshot.data ?? widget.report;
        return ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          children: [
            Box(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _Who(
                    name: r.teacher.name,
                    line: r.title ?? r.aboutLabel,
                    status: r.statusLabel,
                  ),
                  const SizedBox(height: 12),
                  _Facts([
                    _Fact(l10n.aboutLabel, r.aboutLabel),
                    _Fact(
                      l10n.reasonLabel,
                      r.kind == 'class' ? l10n.kindClass : l10n.kindStudent,
                    ),
                    for (final f in r.fields) _Fact(f.label, f.value),
                  ]),
                  if (r.text != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      r.text!,
                      style: const TextStyle(fontSize: 14, height: 1.45),
                    ),
                  ],
                  if (r.comments.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      l10n.commentsTitle,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    for (final m in r.comments)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          '${isolate(m.name)} · ${context.dateTime(m.at)}\n${m.text}',
                          style: const TextStyle(fontSize: 14, height: 1.4),
                        ),
                      ),
                  ],
                  if (snapshot.connectionState != ConnectionState.done)
                    const Padding(
                      padding: EdgeInsets.only(top: 12),
                      child: LinearProgressIndicator(),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _NoteField(controller: widget.note, label: l10n.reportCommentHint),
            const SizedBox(height: 12),
            if (r.sentAt != null)
              Text(
                l10n.sentByOnly(
                  isolate(r.teacher.name),
                  context.ago(r.sentAt!),
                ),
                style: TextStyle(fontSize: 13, color: c.ink2),
              ),
            const SizedBox(height: 16),
          ],
        );
      },
    );
  }
}

class _LeaveCard extends StatelessWidget {
  const _LeaveCard({required this.leave, required this.note});

  final LeaveRequest leave;
  final TextEditingController note;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final l = leave;
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      children: [
        Box(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _Who(
                name: l.personName,
                line: l.roleLabel,
                status: l.statusLabel,
              ),
              const SizedBox(height: 12),
              _Facts([
                _Fact(l10n.daysLabel, dayRange(context, l.from, l.to)),
                _Fact(l10n.reasonLabel, l.reasonLabel),
              ]),
              if (l.text.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  '“${l.text}”',
                  style: const TextStyle(fontSize: 14, height: 1.45),
                ),
              ],
              const SizedBox(height: 12),
              Text(
                context.ago(l.sentAt),
                style: TextStyle(fontSize: 13, color: c.ink2),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _NoteField(controller: note, label: l10n.noteToPerson),
        const SizedBox(height: 16),
      ],
    );
  }
}
