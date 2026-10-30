import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart'
    show SignInPrompt, TabHeader;
import '../data/events_providers.dart';
import '../widgets/event_widgets.dart';

/// "Valid", "Used" or "Cancelled", coloured; 47 "Refunded" for a cancelled
/// ticket the organiser refunded.
StatusChip ticketStatusChip(
  BuildContext context,
  TicketStatus status, {
  bool refunded = false,
}) {
  final l10n = context.l10n;
  if (status == TicketStatus.cancelled && refunded) {
    return StatusChip(label: l10n.ticketStatusRefunded, tone: ChipTone.bad);
  }
  return switch (status) {
    TicketStatus.valid => StatusChip(
      label: l10n.ticketStatusValid,
      tone: ChipTone.good,
    ),
    TicketStatus.used => StatusChip(label: l10n.ticketStatusUsed),
    TicketStatus.cancelled => StatusChip(
      label: l10n.ticketStatusCancelled,
      tone: ChipTone.bad,
    ),
  };
}

/// The My tickets tab: every ticket with its event, coming up first. Works
/// without a connection from the copy kept on the phone.
class TicketsScreen extends ConsumerWidget {
  const TicketsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final signedIn = ref.watch(
      authControllerProvider.select((a) => a.isSignedIn),
    );
    final wallet = ref.watch(ticketWalletProvider);
    final Widget body;
    if (!signedIn) {
      body = SignInPrompt(
        icon: AppIcons.ticket,
        title: l10n.ticketsSignInTitle,
        message: l10n.ticketsSignInMessage,
        from: Paths.tickets,
      );
    } else {
      body = switch (wallet) {
        AsyncData(:final value) => _Wallet(wallet: value),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(ticketWalletProvider),
        ),
        _ => SkeletonList(
          layout: SkeletonLayout.media,
          label: l10n.loadingEvents,
        ),
      };
    }
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.tabTickets),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }
}

class _Wallet extends ConsumerWidget {
  const _Wallet({required this.wallet});

  final TicketWallet wallet;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    if (wallet.tickets.isEmpty) {
      return MessageView(
        icon: AppIcons.ticket,
        title: l10n.noTicketsTitle,
        message: l10n.noTicketsMessage,
        // 110 Every empty list leads somewhere.
        actionLabel: l10n.browseEvents,
        onAction: () => context.go(Paths.events),
      );
    }
    final now = DateTime.now();
    final upcoming = wallet.tickets
        .where((t) => t.event.endsAt.isAfter(now))
        .toList();
    final past = wallet.tickets
        .where((t) => !t.event.endsAt.isAfter(now))
        .toList();
    return RefreshIndicator(
      onRefresh: () => ref.read(ticketWalletProvider.notifier).reload(),
      child: ListView(
        key: const ValueKey('tickets-list'),
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        children: [
          if (wallet.offline) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: p.segment,
                borderRadius: BorderRadius.circular(context.shapes.r(12)),
              ),
              child: Row(
                children: [
                  AppIcon(AppIcons.offline, size: 20, color: p.textSecondary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      l10n.ticketsOfflineNote,
                      style: TextStyle(fontSize: 14, color: p.textBody),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (upcoming.isNotEmpty) ...[
            SectionHeader(title: l10n.upcoming),
            const SizedBox(height: 8),
            for (final t in upcoming) ...[
              _TicketTile(ticket: t),
              const SizedBox(height: 10),
            ],
          ],
          if (past.isNotEmpty) ...[
            const SizedBox(height: 8),
            SectionHeader(title: l10n.past),
            const SizedBox(height: 8),
            for (final t in past) ...[
              _TicketTile(ticket: t),
              const SizedBox(height: 10),
            ],
          ],
        ],
      ),
    );
  }
}

class _TicketTile extends StatelessWidget {
  const _TicketTile({required this.ticket});

  final Ticket ticket;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final e = ticket.event;
    return AppCard(
      key: ValueKey('ticket-${ticket.code}'),
      radius: context.shapes.card,
      padding: const EdgeInsets.all(12),
      onTap: () => context.push(Paths.ticket(ticket.code), extra: ticket),
      child: Row(
        children: [
          DateBadge(day: e.startsLocal),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  e.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${ticket.ticketTypeName} · ${ticket.holderName}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                Text(
                  eventWhen(e),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                const SizedBox(height: 6),
                ticketStatusChip(
                  context,
                  ticket.status,
                  refunded: ticket.refunded,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          AppIcon(AppIcons.qrCode, size: 28, color: p.text),
        ],
      ),
    );
  }
}
