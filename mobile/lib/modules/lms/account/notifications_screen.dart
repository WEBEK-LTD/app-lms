import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/push_service.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/lms_providers.dart';
import 'account_scaffold.dart';

/// "5 min ago", "3 h ago", "Yesterday", then the date.
String timeAgo(DateTime time, {DateTime? now}) {
  final local = time.toLocal();
  final diff = (now ?? DateTime.now()).difference(local);
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
  if (diff.inHours < 24) return '${diff.inHours} h ago';
  if (diff.inDays == 1) return 'Yesterday';
  if (diff.inDays < 7) return '${diff.inDays} days ago';
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return '${local.day} ${months[local.month - 1]} ${local.year}';
}

IconData _iconFor(NotificationType type) => switch (type) {
  NotificationType.newLesson => AppIcons.playCircle,
  NotificationType.enrolled => AppIcons.checkCircle,
  NotificationType.qnaAnswer => AppIcons.chat,
  NotificationType.announcement ||
  NotificationType.unknown => AppIcons.notifications,
};

/// Everything the academy sent the student, newest first. Opening the screen
/// marks them read.
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  bool _marked = false;

  Future<void> _markRead() async {
    _marked = true;
    try {
      await ref.read(yallappApiProvider).markNotificationsRead();
      ref.invalidate(unreadNotificationsProvider);
    } on ApiException {
      // The badge clears on the next visit.
    }
  }

  void _open(InboxNotification n) {
    final location = pushTargetLocation(n.target);
    if (location != Paths.home) context.push(location);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificationsProvider);
    final notifier = ref.read(notificationsProvider.notifier);
    if (!_marked && state.page > 0 && state.items.any((n) => !n.read)) {
      Future.microtask(_markRead);
    }
    final Widget body;
    if (state.isInitialLoading) {
      body = const LoadingView();
    } else if (state.error != null && state.items.isEmpty) {
      body = ErrorView(error: state.error!, onRetry: notifier.retry);
    } else if (state.items.isEmpty) {
      body = const MessageView(
        icon: AppIcons.notifications,
        title: 'No notifications yet',
        message:
            'New lessons, announcements and answers to your questions '
            'will show up here.',
      );
    } else {
      body = RefreshIndicator(
        onRefresh: notifier.refresh,
        child: NotificationListener<ScrollNotification>(
          onNotification: (n) {
            if (n.metrics.extentAfter < 400) notifier.loadMore();
            return false;
          },
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
            itemCount: state.items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (_, i) => _NotificationTile(
              notification: state.items[i],
              onTap: () => _open(state.items[i]),
            ),
          ),
        ),
      );
    }
    return AccountScaffold(
      title: 'Notifications',
      scrollable: false,
      child: body,
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onTap});

  final InboxNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final n = notification;
    final opens = pushTargetLocation(n.target) != Paths.home;
    return Semantics(
      label: n.read ? null : 'Unread',
      child: AppCard(
        padding: const EdgeInsets.all(14),
        onTap: opens ? onTap : null,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: n.read ? p.placeholderFor(n.id) : p.accentSoft,
                borderRadius: BorderRadius.circular(12),
              ),
              alignment: Alignment.center,
              child: AppIcon(_iconFor(n.type), size: 20, color: p.text),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          n.title,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: n.read
                                ? FontWeight.w600
                                : FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ),
                      if (!n.read)
                        Container(
                          width: 8,
                          height: 8,
                          margin: const EdgeInsets.only(left: 8),
                          decoration: BoxDecoration(
                            color: p.accent,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    n.body,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.45,
                      color: p.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    timeAgo(n.createdAt),
                    style: TextStyle(fontSize: 12, color: p.textSecondary),
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

/// The student's orders from the website's checkout. Android only: the iOS
/// app doesn't sell courses.
class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(ordersProvider);
    final notifier = ref.read(ordersProvider.notifier);
    final Widget body;
    if (state.isInitialLoading) {
      body = const LoadingView();
    } else if (state.error != null && state.items.isEmpty) {
      body = ErrorView(error: state.error!, onRetry: notifier.retry);
    } else if (state.items.isEmpty) {
      body = const MessageView(
        icon: AppIcons.orders,
        title: 'No orders yet',
        message: 'Courses you buy on the website show up here.',
      );
    } else {
      body = RefreshIndicator(
        onRefresh: notifier.refresh,
        child: NotificationListener<ScrollNotification>(
          onNotification: (n) {
            if (n.metrics.extentAfter < 400) notifier.loadMore();
            return false;
          },
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
            itemCount: state.items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (_, i) => _OrderCard(order: state.items[i]),
          ),
        ),
      );
    }
    return AccountScaffold(title: 'My orders', scrollable: false, child: body);
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final good = order.status == OrderStatus.completed;
    final bad = switch (order.status) {
      OrderStatus.cancelled ||
      OrderStatus.failed ||
      OrderStatus.refunded => true,
      _ => false,
    };
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Order #${order.number}',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: good
                        ? p.successSoft
                        : bad
                        ? p.placeholderFor(0)
                        : p.accentSoft,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    order.statusLabel,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: good ? p.success : p.text,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          for (final line in order.items)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: InkWell(
                onTap: line.courseId == null
                    ? null
                    : () => context.push(Paths.course(line.courseId!)),
                child: Text(
                  line.name,
                  style: TextStyle(
                    fontSize: 14,
                    color: line.courseId == null ? p.text : p.link,
                  ),
                ),
              ),
            ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Text(
                  timeAgo(order.createdAt),
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                order.total,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
