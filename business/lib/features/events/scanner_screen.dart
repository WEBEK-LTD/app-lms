import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import 'camera_scanner.dart';
import 'events_screen.dart';

/// 59 The door: scan a ticket's QR code (or type its code); a valid ticket
/// is let in once, a second scan on any phone says when it was used. Dark,
/// with the flashlight, for dim venues.
class ScannerScreen extends ConsumerStatefulWidget {
  const ScannerScreen({super.key, this.eventId});

  final int? eventId;

  @override
  ConsumerState<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends ConsumerState<ScannerScreen> {
  late final CameraScanner _camera = ref.read(cameraScannerProvider)();
  CheckIn? _result;
  bool _busy = false;
  int _admitted = 0;
  int _refused = 0;
  String? _lastCode;
  DateTime? _lastAt;

  @override
  void dispose() {
    _camera.dispose();
    super.dispose();
  }

  Future<void> check(String code) async {
    final now = DateTime.now();
    // The camera sees the same code many times a second.
    if (_busy ||
        (code == _lastCode &&
            _lastAt != null &&
            now.difference(_lastAt!) < const Duration(seconds: 3))) {
      return;
    }
    _lastCode = code;
    _lastAt = now;
    setState(() => _busy = true);
    try {
      final result = await ref
          .read(apiProvider)
          .checkIn(ref.read(appIdProvider), code, eventId: widget.eventId);
      if (!mounted) return;
      setState(() {
        _result = result;
        result.admitted ? _admitted++ : _refused++;
      });
      ref.invalidate(eventsProvider);
      unawaited(
        result.admitted
            ? HapticFeedback.mediumImpact()
            : HapticFeedback.vibrate(),
      );
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _typeCode() async {
    final code = await showDialog<String>(
      context: context,
      builder: (_) => const _CodeDialog(),
    );
    final value = code?.trim() ?? '';
    if (value.isNotEmpty) {
      _lastCode = null;
      await check(value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final event = widget.eventId == null
        ? null
        : ref
              .watch(eventsProvider)
              .value
              ?.items
              .where((e) => e.id == widget.eventId)
              .firstOrNull;
    const light = Brand.ivory;
    return Theme(
      data: theme.copyWith(
        scaffoldBackgroundColor: Brand.scanner,
        appBarTheme: theme.appBarTheme.copyWith(
          backgroundColor: Brand.scanner,
          foregroundColor: light,
          titleTextStyle: theme.textTheme.titleLarge?.copyWith(color: light),
          systemOverlayStyle: SystemUiOverlayStyle.light,
        ),
      ),
      child: Scaffold(
        appBar: AppBar(
          title: Text(event?.title ?? l10n.scanTickets),
          actions: [
            ValueListenableBuilder<bool?>(
              valueListenable: _camera.torch,
              builder: (context, on, _) => IconButton(
                tooltip: on == true ? l10n.flashOff : l10n.flashOn,
                onPressed: on == null ? null : _camera.toggleTorch,
                icon: Icon(
                  on == true ? AppIcons.flashOn : AppIcons.flashOff,
                  color: light,
                ),
              ),
            ),
          ],
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            children: [
              AspectRatio(
                aspectRatio: 1,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Semantics(
                        label: l10n.cameraLabel,
                        child: _camera.view(
                          context,
                          check,
                          (context) => Container(
                            color: Colors.black,
                            padding: const EdgeInsets.all(24),
                            alignment: Alignment.center,
                            child: Text(
                              l10n.cameraDenied,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: light),
                            ),
                          ),
                        ),
                      ),
                      IgnorePointer(
                        child: Container(
                          margin: const EdgeInsets.all(36),
                          decoration: BoxDecoration(
                            border: Border.all(color: Brand.ember, width: 3),
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                      ),
                      if (_busy)
                        const Center(child: CircularProgressIndicator()),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                l10n.scanHint,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: light.withValues(alpha: 0.8),
                ),
              ),
              const SizedBox(height: 16),
              if (_result != null) _ResultCard(result: _result!),
              const SizedBox(height: 16),
              _Counts(admitted: _admitted, refused: _refused, event: event),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: light,
                  side: const BorderSide(color: light),
                ),
                onPressed: _busy ? null : _typeCode,
                icon: const Icon(AppIcons.keyboard),
                label: Text(l10n.typeCode),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result});

  final CheckIn result;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final used = result.outcome == 'used';
    final (Color bg, Color fg, IconData icon, String title) = result.admitted
        ? (Brand.successBg, Brand.success, AppIcons.checkCircle, l10n.letIn)
        : used
        ? (Brand.warningBg, Brand.warning, AppIcons.warning, l10n.alreadyUsed)
        : (
            Brand.dangerBg,
            Brand.danger,
            AppIcons.error,
            switch (result.outcome) {
              'other_event' => l10n.otherEvent,
              'cancelled' => l10n.ticketCancelled,
              'not_paid' => l10n.ticketNotPaid,
              'forged' || 'not_a_code' => l10n.notATicket,
              _ => l10n.ticketNotFound,
            },
          );
    final t = result.ticket;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(22),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: fg, size: 40, fill: 1),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleLarge?.copyWith(color: fg),
                  ),
                  const SizedBox(height: 2),
                  Text(result.message, style: theme.textTheme.bodyMedium),
                  if (t != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      [?t.holderName, ?t.typeName, ?t.eventTitle].join(' · '),
                      style: theme.textTheme.bodySmall,
                    ),
                    if (used && t.usedAt != null)
                      Text(
                        l10n.usedAt(context.dateTime(t.usedAt!)),
                        style: theme.textTheme.titleSmall,
                      ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Counts extends StatelessWidget {
  const _Counts({required this.admitted, required this.refused, this.event});

  final int admitted;
  final int refused;
  final EventSummary? event;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    Widget count(String label, String value) => Expanded(
      child: MergeSemantics(
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            children: [
              Text(
                value,
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: Brand.ivory,
                ),
              ),
              Text(
                label,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(color: Brand.ivory),
              ),
            ],
          ),
        ),
      ),
    );
    final e = event;
    return Row(
      children: [
        count(l10n.letInHere, context.number(admitted)),
        const SizedBox(width: 10),
        count(l10n.refusedHere, context.number(refused)),
        if (e != null) ...[
          const SizedBox(width: 10),
          count(
            l10n.inOfIssued,
            '${context.number(e.used)}/${context.number(e.issued)}',
          ),
        ],
      ],
    );
  }
}

/// Typing a ticket's code when the camera can't read it.
class _CodeDialog extends StatefulWidget {
  const _CodeDialog();

  @override
  State<_CodeDialog> createState() => _CodeDialogState();
}

class _CodeDialogState extends State<_CodeDialog> {
  final _code = TextEditingController();

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AlertDialog(
      title: Text(l10n.typeCodeTitle),
      content: TextField(
        controller: _code,
        autofocus: true,
        textCapitalization: TextCapitalization.characters,
        decoration: InputDecoration(labelText: l10n.ticketCode),
        onSubmitted: (v) => Navigator.pop(context, v),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(l10n.cancel),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, _code.text),
          child: Text(l10n.checkTicket),
        ),
      ],
    );
  }
}
