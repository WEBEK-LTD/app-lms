import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/services/push_service.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../lms/data/lms_providers.dart';
import 'account_scaffold.dart';
import 'order_screen.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';

/// "5 min ago", "3 h ago", "Yesterday", then the date.
String timeAgo(DateTime time, {DateTime? now}) {
  final local = time.toLocal();
  final diff = (now ?? DateTime.now()).difference(local);
  final l10n = currentL10n;
  if (diff.inMinutes < 1) return l10n.justNow;
  if (diff.inMinutes < 60) return l10n.minutesAgo(diff.inMinutes);
  if (diff.inHours < 24) return l10n.hoursAgo(diff.inHours);
  if (diff.inDays == 1) return l10n.yesterday;
  if (diff.inDays < 7) return l10n.daysAgo(diff.inDays);
  return shortDate(local);
}

IconData _iconFor(NotificationType type) => switch (type) {
  NotificationType.newLesson => AppIcons.playCircle,
  NotificationType.enrolled => AppIcons.checkCircle,
  NotificationType.qnaAnswer => AppIcons.chat,
  NotificationType.article => AppIcons.newspaper,
  NotificationType.event => AppIcons.event,
  NotificationType.campaignUpdate => AppIcons.campaignUpdate,
  NotificationType.appointmentConfirmed ||
  NotificationType.appointmentReminder => AppIcons.appointments,
  NotificationType.classSoon => AppIcons.fitness,
  NotificationType.eventSoon => AppIcons.event,
  NotificationType.membershipEnding => AppIcons.membership,
  NotificationType.cartLeft => AppIcons.cart,
  NotificationType.studyReminder => AppIcons.courses,
  NotificationType.orderUpdate => AppIcons.shipping,
  NotificationType.shipmentUpdate => AppIcons.parcel,
  NotificationType.courierJob => AppIcons.courier,
  NotificationType.foodOrderUpdate => AppIcons.foodDelivery,
  NotificationType.restaurantOrder => AppIcons.restaurant,
  NotificationType.rideUpdate => AppIcons.ride,
  NotificationType.rideOffer => AppIcons.car,
  NotificationType.newCourse => AppIcons.courses,
  NotificationType.teacherCourse => AppIcons.teacher,
  NotificationType.teacherQuestion => AppIcons.forum,
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
    // 85.2 A campaign's web page opens in the browser.
    final outside = pushOutsideLink(n.target);
    if (outside != null) {
      ref.read(openExternalProvider)(outside);
      return;
    }
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
      body = const SkeletonList(layout: SkeletonLayout.text);
    } else if (state.error != null && state.items.isEmpty) {
      body = ErrorView(error: state.error!, onRetry: notifier.retry);
    } else if (state.items.isEmpty) {
      body = MessageView(
        icon: AppIcons.notifications,
        title: context.l10n.noNotificationsTitle,
        message: context.l10n.noNotificationsMessage,
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
      title: context.l10n.notifications,
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
    final opens =
        pushTargetLocation(n.target) != Paths.home ||
        pushOutsideLink(n.target) != null;
    return Semantics(
      label: n.read ? null : context.l10n.unread,
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
                          margin: const EdgeInsetsDirectional.only(start: 8),
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
                  // 85.2 A campaign's picture.
                  if (n.imageUrl != null) ...[
                    const SizedBox(height: 10),
                    AppNetworkImage(
                      url: n.imageUrl,
                      seed: n.id,
                      radius: 12,
                      height: 140,
                      width: double.infinity,
                    ),
                  ],
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
    final store =
        ref.watch(appEnvironmentProvider).build.appType == AppType.store;
    final Widget body;
    if (state.isInitialLoading) {
      body = const SkeletonList(layout: SkeletonLayout.text);
    } else if (state.error != null && state.items.isEmpty) {
      body = ErrorView(error: state.error!, onRetry: notifier.retry);
    } else if (state.items.isEmpty) {
      body = MessageView(
        icon: AppIcons.orders,
        title: context.l10n.noOrdersTitle,
        message: context.l10n.noOrdersMessage,
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
            itemBuilder: (_, i) =>
                _OrderCard(order: state.items[i], linkProducts: store),
          ),
        ),
      );
    }
    return AccountScaffold(
      title: context.l10n.myOrders,
      scrollable: false,
      child: body,
    );
  }
}

class _OrderCard extends ConsumerWidget {
  const _OrderCard({required this.order, required this.linkProducts});

  final Order order;

  /// Store apps open the product; Academy apps open the course.
  final bool linkProducts;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final good = order.status == OrderStatus.completed;
    final bad = switch (order.status) {
      OrderStatus.cancelled ||
      OrderStatus.failed ||
      OrderStatus.refunded => true,
      _ => false,
    };
    // 26 A restaurant's order shows its step and opens its tracking screen.
    // 47 A refunded order says so, whatever step it reached.
    final step = order.status == OrderStatus.refunded
        ? null
        : order.fulfilmentStatus;
    final status = step != null
        ? OrderSteps.label(
            context,
            step,
            order.fulfilment?.type ?? FulfilmentType.pickup,
          )
        : order.statusLabel;
    return AppCard(
      padding: const EdgeInsets.all(16),
      onTap: order.opensScreen
          ? () => context.push(Paths.order(order.id))
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  context.l10n.orderNumber(order.number),
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
                    status,
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
                onTap: switch ((line.courseId, line.productId)) {
                  (final int course, _) => () => context.push(
                    Paths.course(course),
                  ),
                  (_, final int product) when linkProducts =>
                    () => context.push(Paths.product(product)),
                  _ => null,
                },
                child: Text(
                  [
                    line.quantity > 1
                        ? context.l10n.lineQuantity(line.name, line.quantity)
                        : line.name,
                    if (line.options.isNotEmpty) line.options.join(', '),
                  ].join(' · '),
                  style: TextStyle(
                    fontSize: 14,
                    color:
                        line.courseId != null ||
                            (linkProducts && line.productId != null)
                        ? p.link
                        : p.text,
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
          // 47 A refund in part shows under the total.
          if (order.refundedTotal != null &&
              order.status != OrderStatus.refunded) ...[
            const SizedBox(height: 4),
            Text(
              context.l10n.refundedAmount(order.refundedTotal!),
              textAlign: TextAlign.end,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: p.danger,
              ),
            ),
          ],
          // 71 The receipt as a PDF, in the app's language (orders paid
          // through the platform; WordPress sites send their own).
          if (order.receiptUrl != null)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                onPressed: () => ref.read(openExternalProvider)(
                  receiptInLanguage(
                    order.receiptUrl!,
                    Localizations.localeOf(context).languageCode,
                  ),
                ),
                icon: AppIcon(AppIcons.download, size: 18, color: p.link),
                label: Text(context.l10n.downloadReceipt),
                style: TextButton.styleFrom(foregroundColor: p.link),
              ),
            ),
        ],
      ),
    );
  }
}
