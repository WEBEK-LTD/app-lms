import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../events/camera_scanner.dart';
import 'member_check_in.dart';
import 'members_screen.dart';

/// 63 A gym's door: scan the member code in the member's app (or type it).
/// A member gets in once a day; a second scan, on any phone, says when they
/// came in. Dark, with the flashlight, like the ticket scanner.
class MemberScannerScreen extends ConsumerStatefulWidget {
  const MemberScannerScreen({super.key});

  @override
  ConsumerState<MemberScannerScreen> createState() =>
      _MemberScannerScreenState();
}

class _MemberScannerScreenState extends ConsumerState<MemberScannerScreen> {
  late final CameraScanner _camera = ref.read(cameraScannerProvider)();
  MemberCheckIn? _result;
  bool _busy = false;
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
          .checkInMember(ref.read(appIdProvider), code: code);
      if (!mounted) return;
      setState(() => _result = result);
      ref.invalidate(memberVisitsProvider);
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
    final visits = ref.watch(memberVisitsProvider).value;
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
          title: Text(l10n.scanMembers),
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
                        label: l10n.memberCameraLabel,
                        child: _camera.view(
                          context,
                          check,
                          (context) => Container(
                            color: Colors.black,
                            // 63 Inside the frame (36 from the edge, 3 wide), never touching it.
                            padding: const EdgeInsets.symmetric(
                              horizontal: 56,
                              vertical: 48,
                            ),
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
                l10n.memberScanHint,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: light.withValues(alpha: 0.8),
                ),
              ),
              const SizedBox(height: 16),
              if (_result != null) MemberResultCard(result: _result!),
              const SizedBox(height: 16),
              if (visits != null)
                Text(
                  l10n.membersInCount(visits.count),
                  textAlign: TextAlign.center,
                  style: theme.textTheme.titleSmall?.copyWith(color: light),
                ),
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
              const SizedBox(height: 10),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: light,
                  side: const BorderSide(color: light),
                ),
                onPressed: () => context.push(Paths.members),
                icon: const Icon(AppIcons.search),
                label: Text(l10n.findByName),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Typing a member's code when the camera can't read it.
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
      title: Text(l10n.typeMemberCodeTitle),
      content: TextField(
        controller: _code,
        autofocus: true,
        textCapitalization: TextCapitalization.characters,
        decoration: InputDecoration(labelText: l10n.memberCodeLabel),
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
