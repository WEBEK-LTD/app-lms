import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/auth/session.dart';
import '../../../core/l10n.dart';
import '../../../core/routing/feature_routes.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/badge_mark.dart';
import '../../../core/api/models.dart';
import '../../../core/widgets/glass.dart';
import '../../../core/widgets/sym.dart';
import '../../qa/ui/qa_format.dart';
import '../../qa/ui/widgets/member_avatar.dart';
import '../data/notifications_api.dart';

/// The member's notifications, newest first, and the unread count the bell
/// shows. Refreshed when the list opens.
class NotificationsController extends AsyncNotifier<NotificationPage> {
  @override
  Future<NotificationPage> build() async {
    if (ref.watch(meProvider) == null) return const NotificationPage([], 0);
    return ref.read(notificationsApiProvider).list();
  }

  Future<void> markAllRead() async {
    final now = state.value;
    if (now == null) return;
    state = AsyncData(
      NotificationPage([for (final n in now.items) n.copyWith(read: true)], 0),
    );
    await ref.read(notificationsApiProvider).markRead();
  }

  Future<void> markRead(String id) async {
    final now = state.value;
    if (now == null) return;
    final was = now.items.any((n) => n.id == id && !n.read);
    if (!was) return;
    state = AsyncData(
      NotificationPage(
        [for (final n in now.items) n.id == id ? n.copyWith(read: true) : n],
        now.unreadCount - 1,
        now.next,
      ),
    );
    await ref.read(notificationsApiProvider).markRead([id]);
  }
}

final notificationsProvider =
    AsyncNotifierProvider<NotificationsController, NotificationPage>(
      NotificationsController.new,
    );

/// Where a notification leads: its question, tutorial or member.
String? notificationLink(CommunityNotification n) {
  final id = n.targetId;
  if (id == null) {
    return n.kind.startsWith('verification') || n.kind.startsWith('badge')
        ? FeatureLinks.verify
        : null;
  }
  return switch (n.targetType) {
    'question' => FeatureLinks.question(id),
    'tutorial' => FeatureLinks.tutorial(id),
    'member' => Paths.member(id),
    _ => null,
  };
}

/// What a notification shows when no member did it: its kind's icon.
(IconData, Color) _kindMark(String kind) => switch (kind) {
  'badge_granted' || 'verification_approved' => (
    Symbols.verified_rounded,
    BadgeMark.colorOf(BadgeKind.gold),
  ),
  'badge_revoked' ||
  'verification_rejected' ||
  'post_removed' => (Symbols.info_rounded, const Color(0xFFE23F72)),
  'post_approved' => (Symbols.check_circle_rounded, const Color(0xFF22C483)),
  'yallapp_linked' => (Symbols.link_rounded, Brand.violet),
  _ => (Symbols.notifications_rounded, Brand.orange),
};

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l = context.l10n;
    final page = ref.watch(notificationsProvider);
    final unread = page.value?.unreadCount ?? 0;
    return Scaffold(
      backgroundColor: p.screen,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 4, 12, 8),
              child: Row(
                children: [
                  IconBtn(
                    icon: Directionality.of(context) == TextDirection.rtl
                        ? Symbols.arrow_forward_rounded
                        : Symbols.arrow_back_rounded,
                    label: l.commonBack,
                    onTap: () =>
                        context.canPop() ? context.pop() : context.go('/'),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      l.notifTitle,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -.4,
                        color: p.ink,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: l.notifEmail,
                    onPressed: () => _emailSheet(context, ref),
                    icon: Sym(Symbols.mail_rounded, size: 22, color: p.ink),
                  ),
                ],
              ),
            ),
            if (unread > 0)
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: TextButton.icon(
                    onPressed: () =>
                        ref.read(notificationsProvider.notifier).markAllRead(),
                    icon: const Sym(Symbols.done_all_rounded, size: 18),
                    label: Text(l.notifMarkAll),
                  ),
                ),
              ),
            Expanded(
              child: switch (page) {
                AsyncData(:final value) when value.items.isEmpty => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(
                      l.notifEmpty,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: p.muted),
                    ),
                  ),
                ),
                AsyncData(:final value) => RefreshIndicator(
                  onRefresh: () => ref.refresh(notificationsProvider.future),
                  child: ListView.separated(
                    padding: EdgeInsets.fromLTRB(
                      14,
                      4,
                      14,
                      120 + MediaQuery.paddingOf(context).bottom,
                    ),
                    itemCount: value.items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _Row(n: value.items[i]),
                  ),
                ),
                AsyncError() => Center(
                  child: TextButton(
                    onPressed: () => ref.invalidate(notificationsProvider),
                    child: Text(l.commonRetry),
                  ),
                ),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Row extends ConsumerWidget {
  const _Row({required this.n});

  final CommunityNotification n;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final link = notificationLink(n);
    final (icon, color) = _kindMark(n.kind);
    final unread = !n.read;
    return Material(
      color: unread
          ? (p.dark ? const Color(0x14FF8A3D) : Colors.white)
          : (p.dark ? const Color(0x08FFFFFF) : const Color(0x80FFFFFF)),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: unread
              ? const Color(0x33FF8A3D)
              : (p.dark ? const Color(0x0FFFFFFF) : const Color(0x0A141327)),
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {
          ref.read(notificationsProvider.notifier).markRead(n.id);
          if (link != null) context.push(link);
        },
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (n.actor != null)
                MemberAvatar(member: n.actor!, size: 40)
              else
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: .16),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: Sym(icon, size: 22, fill: true, color: color),
                  ),
                ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      n.text,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.4,
                        fontWeight: unread ? FontWeight.w600 : FontWeight.w400,
                        color: p.ink,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      ago(context, n.createdAt),
                      style: TextStyle(fontSize: 12, color: p.muted),
                    ),
                  ],
                ),
              ),
              if (unread)
                Container(
                  key: const ValueKey('unread-dot'),
                  margin: const EdgeInsetsDirectional.only(start: 8, top: 6),
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Brand.orange2,
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Which notifications also come by email (the list always has them all).
Future<void> _emailSheet(BuildContext context, WidgetRef ref) =>
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      useSafeArea: true,
      isScrollControlled: true,
      builder: (_) => const _EmailSheet(),
    );

class _EmailSheet extends ConsumerStatefulWidget {
  const _EmailSheet();

  @override
  ConsumerState<_EmailSheet> createState() => _EmailSheetState();
}

class _EmailSheetState extends ConsumerState<_EmailSheet> {
  Map<String, bool>? _email;

  @override
  void initState() {
    super.initState();
    ref.read(notificationsApiProvider).emailSettings().then((e) {
      if (mounted) setState(() => _email = e);
    });
  }

  String _label(String kind) {
    final l = context.l10n;
    return switch (kind) {
      'answer' => l.notifKindAnswer,
      'answer_accepted' => l.notifKindAccepted,
      'official_answer' => l.notifKindOfficial,
      'friend_request' => l.notifKindFriend,
      'follow' => l.notifKindFollow,
      'badge_granted' => l.notifKindBadge,
      'verification_approved' ||
      'verification_rejected' => l.notifKindVerification,
      _ => l.notifKindOther,
    };
  }

  Future<void> _set(String kind, bool on) async {
    final next = {...?_email};
    // One switch for both outcomes of the verification request.
    if (kind.startsWith('verification')) {
      next['verification_approved'] = on;
      next['verification_rejected'] = on;
    } else {
      next[kind] = on;
    }
    setState(() => _email = next);
    final saved = await ref
        .read(notificationsApiProvider)
        .setEmailSettings(next);
    if (mounted) setState(() => _email = saved);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final email = _email;
    final kinds = [
      for (final k in email?.keys ?? const <String>[])
        if (k != 'verification_rejected') k,
    ];
    return Material(
      type: MaterialType.transparency,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l.notifEmail,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: p.ink,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              l.notifEmailBody,
              style: TextStyle(fontSize: 13, color: p.muted),
            ),
            const SizedBox(height: 8),
            if (email == null)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
            for (final k in kinds)
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(_label(k)),
                value: email![k] ?? false,
                activeThumbColor: Colors.white,
                activeTrackColor: Brand.orange,
                onChanged: (v) => _set(k, v),
              ),
          ],
        ),
      ),
    );
  }
}
