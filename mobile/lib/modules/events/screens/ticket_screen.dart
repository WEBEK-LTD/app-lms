import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/providers.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/events_providers.dart';
import '../widgets/event_widgets.dart';
import 'tickets_screen.dart';

/// One ticket, ready for the door: its QR code (drawn on the phone, so it
/// works offline), its code to type, the holder, the event and its status.
class TicketScreen extends ConsumerStatefulWidget {
  const TicketScreen({super.key, required this.code, this.initial});

  final String code;

  /// The ticket as the wallet had it, while the wallet loads.
  final Ticket? initial;

  @override
  ConsumerState<TicketScreen> createState() => _TicketScreenState();
}

class _TicketScreenState extends ConsumerState<TicketScreen> {
  bool _cancelling = false;

  Future<void> _cancel(Ticket ticket) async {
    final l10n = context.l10n;
    final ok = await confirmAction(
      context,
      title: l10n.ticketCancelTitle,
      message: l10n.ticketCancelMessage,
      confirmLabel: l10n.ticketCancel,
      destructive: true,
    );
    if (!ok || !mounted) return;
    setState(() => _cancelling = true);
    try {
      await ref.read(yallappApiProvider).cancelMyTicket(ticket.code);
      if (!mounted) return;
      await ref.read(ticketWalletProvider.notifier).reload();
      ref.invalidate(eventProvider(ticket.event.id));
      if (mounted) showMessage(context, l10n.ticketCancelledMessage);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final wallet = ref.watch(ticketWalletProvider).value;
    final ticket =
        wallet?.tickets.where((t) => t.code == widget.code).firstOrNull ??
        widget.initial;
    if (ticket == null) {
      return Scaffold(
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsetsDirectional.fromSTEB(16, 8, 16, 0),
                child: AppBackButton(),
              ),
              Expanded(
                child: wallet == null
                    ? const LoadingView()
                    : MessageView(
                        icon: AppIcons.ticket,
                        title: l10n.pageNotFound,
                        actionLabel: l10n.tabTickets,
                        onAction: () => context.go(Paths.tickets),
                      ),
              ),
            ],
          ),
        ),
      );
    }
    final e = ticket.event;
    final valid = ticket.status == TicketStatus.valid;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          key: const ValueKey('ticket'),
          padding: readablePadding(context, top: 8, bottom: 32),
          children: [
            const Align(
              alignment: AlignmentDirectional.centerStart,
              child: AppBackButton(),
            ),
            const SizedBox(height: 12),
            Semantics(
              header: true,
              child: Text(
                e.title,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              eventWhen(e),
              style: TextStyle(fontSize: 15, color: p.textSecondary),
            ),
            Text(
              eventPlace(context, e),
              style: TextStyle(fontSize: 15, color: p.textSecondary),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                // Always white and dark: scanners read it in any theme.
                color: Colors.white,
                borderRadius: BorderRadius.circular(context.shapes.card),
                border: Border.all(color: p.border),
              ),
              child: Column(
                children: [
                  Opacity(
                    opacity: valid ? 1 : 0.25,
                    child: Semantics(
                      image: true,
                      label: l10n.ticketQrLabel(ticket.holderName),
                      child: QrImageView(
                        key: const ValueKey('ticket-qr'),
                        data: ticket.qrPayload,
                        size: 240,
                        backgroundColor: Colors.white,
                        errorCorrectionLevel: QrErrorCorrectLevel.M,
                        eyeStyle: const QrEyeStyle(
                          eyeShape: QrEyeShape.square,
                          color: Color(0xFF111111),
                        ),
                        dataModuleStyle: const QrDataModuleStyle(
                          dataModuleShape: QrDataModuleShape.square,
                          color: Color(0xFF111111),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    l10n.ticketShowAtDoor,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF555555),
                    ),
                  ),
                  const SizedBox(height: 4),
                  SelectableText(
                    ticket.groupedCode,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontFamily: 'JetBrains Mono',
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.5,
                      color: Color(0xFF111111),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ticket.holderName,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                      Text(
                        [
                          ticket.ticketTypeName,
                          if (ticket.price case final price?) price.label,
                        ].join(' · '),
                        style: TextStyle(fontSize: 14, color: p.textSecondary),
                      ),
                    ],
                  ),
                ),
                ticketStatusChip(
                  context,
                  ticket.status,
                  refunded: ticket.refunded,
                ),
              ],
            ),
            if (ticket.usedAt != null) ...[
              const SizedBox(height: 8),
              Text(
                l10n.ticketUsedAt(dayAndTime(ticket.usedAt!)),
                style: TextStyle(fontSize: 14, color: p.textSecondary),
              ),
            ],
            if (ticket.onlineUrl != null &&
                ticket.status != TicketStatus.cancelled) ...[
              const SizedBox(height: 16),
              PrimaryButton(
                label: l10n.eventJoinOnline,
                icon: AppIcons.online,
                onPressed: () => openExternal(ticket.onlineUrl!),
              ),
            ],
            const SizedBox(height: 16),
            SecondaryButton(
              label: l10n.eventSeeEvent,
              icon: AppIcons.event,
              onPressed: () => context.push(Paths.event(e.id)),
            ),
            if (ticket.canCancel) ...[
              const SizedBox(height: 8),
              TextButton(
                key: const ValueKey('ticket-cancel'),
                onPressed: _cancelling ? null : () => _cancel(ticket),
                style: TextButton.styleFrom(foregroundColor: p.danger),
                child: Text(l10n.ticketCancel),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
