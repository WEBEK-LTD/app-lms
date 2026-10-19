import '../../../core/services/analytics_providers.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/purchase/purchase_rules.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/web/web_view.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/lesson/content/html_content.dart';
import '../../real_estate/widgets/listing_widgets.dart' show signInFor;
import '../../store/screens/cart_screen.dart' show isOrderReceived;
import '../data/events_providers.dart';
import '../widgets/event_widgets.dart';
import '../widgets/order_sheet.dart';

/// An event: its pictures, day and time, place (with the map) or online
/// note, description and tickets. Free tickets are taken here; paid ones go
/// to the payment page (never on iOS for an online-only event).
class EventScreen extends ConsumerWidget {
  const EventScreen({super.key, required this.eventId});

  final int eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final event = ref.watch(eventProvider(eventId));
    Future<void> refresh() => ref.refresh(eventProvider(eventId).future);
    return Scaffold(
      body: switch (event) {
        AsyncData(:final value) => _EventBody(event: value, onRefresh: refresh),
        AsyncError(:final error) => SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsetsDirectional.fromSTEB(16, 8, 16, 0),
                child: AppBackButton(),
              ),
              Expanded(
                child: ErrorView(error: error, onRetry: refresh),
              ),
            ],
          ),
        ),
        _ => SkeletonDetail(label: context.l10n.loadingEvents),
      },
    );
  }
}

class _EventBody extends ConsumerStatefulWidget {
  const _EventBody({required this.event, required this.onRefresh});

  final EventDetail event;
  final Future<void> Function() onRefresh;

  @override
  ConsumerState<_EventBody> createState() => _EventBodyState();
}

class _EventBodyState extends ConsumerState<_EventBody> {
  int? _busyType;

  EventDetail get event => widget.event;

  Future<void> _order(TicketType type, TicketAction action) async {
    final l10n = context.l10n;
    if (!ref.read(authControllerProvider).isSignedIn) {
      signInFor(context, Paths.event(event.id));
      return;
    }
    final user = ref.read(authControllerProvider).user;
    final order = await showOrderSheet(
      context,
      type: type,
      paid: action == TicketAction.checkout,
      defaultName: user?.name ?? '',
    );
    if (order == null || !mounted) return;
    setState(() => _busyType = type.id);
    final api = ref.read(yallappApiProvider);
    try {
      if (action == TicketAction.register) {
        await api.registerForEvent(
          event.id,
          ticketTypeId: type.id,
          quantity: order.quantity,
          attendeeNames: order.names,
        );
        if (!mounted) return;
        _issued(l10n.ticketsIssuedMessage);
      } else {
        final link = await api.createEventCheckoutLink(
          event.id,
          ticketTypeId: type.id,
          quantity: order.quantity,
          attendeeNames: order.names,
        );
        if (!mounted) return;
        if (link.openIn == CheckoutTarget.inApp) {
          final done = await context.push<bool>(
            Paths.web,
            extra: WebPageArgs(
              url: link.url,
              title: l10n.checkout,
              completesOn: isOrderReceived,
            ),
          );
          if (done == true && mounted) _issued(l10n.ticketsPaidMessage);
        } else if (!await openExternal(link.url) && mounted) {
          showMessage(context, l10n.checkoutFailed);
        }
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      showMessage(context, e.message);
      // Sold out or no longer on sale: show what's left now.
      ref.invalidate(eventProvider(event.id));
    } finally {
      if (mounted) setState(() => _busyType = null);
    }
  }

  void _issued(String message) {
    ref.invalidate(eventProvider(event.id));
    ref.invalidate(ticketWalletProvider);
    ScaffoldMessenger.maybeOf(context)
      ?..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          // Goes away like any message, with its shortcut.
          persist: false,
          action: SnackBarAction(
            label: context.l10n.eventSeeTickets,
            onPressed: () => context.go(Paths.tickets),
          ),
        ),
      );
  }

  Future<void> _addToCalendar() async {
    final site = ref.read(appConfigProvider).site;
    final host = Uri.tryParse(site.url)?.host ?? 'yallapp.com.tr';
    await ref.read(shareCalendarFileProvider)(
      'event-${event.id}.ics',
      eventIcs(event, host: host.isEmpty ? 'yallapp.com.tr' : host),
    );
  }

  Future<void> _share() async {
    final site = ref.read(appConfigProvider).site;
    ref
        .read(analyticsProvider)
        .item('share', kind: 'event', id: event.id, title: event.title);
    await ref.read(shareEventTextProvider)(
      [
        event.title,
        eventWhen(event),
        eventPlace(context, event),
        site.name,
      ].join('\n'),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final config = ref.watch(eventsConfigProvider);
    final platform = ref.watch(appEnvironmentProvider).platform;
    final top = MediaQuery.paddingOf(context).top;
    final venue = event.venue;
    final maps = venue != null && config.showMap ? mapsUri(venue) : null;

    final actions = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SquareIconButton(
          icon: AppIcons.calendarAdd,
          label: l10n.eventAddToCalendar,
          radius: 22,
          bordered: event.imageUrl == null,
          background: event.imageUrl == null ? null : p.surface,
          onPressed: _addToCalendar,
        ),
        const SizedBox(width: 8),
        SquareIconButton(
          icon: AppIcons.share,
          label: l10n.eventShare,
          radius: 22,
          bordered: event.imageUrl == null,
          background: event.imageUrl == null ? null : p.surface,
          onPressed: _share,
        ),
      ],
    );

    final Widget picture = event.imageUrl == null
        ? SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [const AppBackButton(), const Spacer(), actions],
              ),
            ),
          )
        : AspectRatio(
            aspectRatio: MediaQuery.sizeOf(context).width >= 600
                ? 21 / 9
                : 16 / 10,
            child: Stack(
              fit: StackFit.expand,
              children: [
                AppNetworkImage(
                  url: event.imageUrl,
                  seed: eventSeed(event),
                  placeholderIcon: AppIcons.event,
                ),
                const HeroScrim(),
                PositionedDirectional(
                  top: top + 8,
                  start: 16,
                  child: const AppBackButton(),
                ),
                PositionedDirectional(top: top + 8, end: 16, child: actions),
              ],
            ),
          );

    Widget factRow(
      IconData icon,
      String text, {
      String? sub,
      Widget? trailing,
    }) => Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppIcon(icon, size: 20, color: p.textSecondary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  text,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
                if (sub != null && sub.isNotEmpty)
                  Text(
                    sub,
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );

    final banner = switch (event.status) {
      EventStatus.cancelled => l10n.eventCancelledMessage,
      EventStatus.ended => l10n.eventEndedMessage,
      EventStatus.scheduled => null,
    };

    final html = event.html ?? '';
    final webview =
        event.renderMode == RenderMode.webview && event.webviewUrl != null;

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        key: const ValueKey('event'),
        padding: EdgeInsets.zero,
        children: [
          picture,
          Padding(
            padding: readablePadding(context, top: 18, bottom: 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (event.category != null)
                  Text(
                    event.category!.name.toUpperCase(),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.6,
                      color: p.link,
                    ),
                  ),
                const SizedBox(height: 6),
                Semantics(
                  header: true,
                  child: Text(
                    event.title,
                    style: TextStyle(
                      fontSize: 24,
                      height: 1.25,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                ),
                if (banner != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: p.danger.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(context.shapes.r(12)),
                    ),
                    child: Row(
                      children: [
                        AppIcon(AppIcons.eventBusy, size: 20, color: p.danger),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            banner,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: p.danger,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                factRow(
                  AppIcons.calendar,
                  eventWhen(event),
                  sub: l10n.timesIn(event.timeZone.replaceAll('_', ' ')),
                ),
                if (venue != null)
                  factRow(
                    AppIcons.location,
                    venue.name,
                    sub: venue.address,
                    trailing: maps == null
                        ? null
                        : TextButton(
                            onPressed: () => openExternal(maps.toString()),
                            style: TextButton.styleFrom(
                              foregroundColor: p.link,
                            ),
                            child: Text(l10n.openInMaps),
                          ),
                  ),
                if (event.online)
                  factRow(
                    AppIcons.online,
                    l10n.eventOnline,
                    sub: event.onlineUrl == null ? l10n.eventOnlineNote : null,
                    trailing: event.onlineUrl == null
                        ? null
                        : TextButton(
                            onPressed: () => openExternal(event.onlineUrl!),
                            style: TextButton.styleFrom(
                              foregroundColor: p.link,
                            ),
                            child: Text(l10n.eventJoinOnline),
                          ),
                  ),
                if (event.organiser != null)
                  factRow(
                    AppIcons.group,
                    l10n.eventOrganiser(event.organiser!),
                  ),
                if (event.myTickets > 0) ...[
                  const SizedBox(height: 16),
                  AppCard(
                    padding: const EdgeInsets.all(14),
                    color: p.successSoft,
                    onTap: () => context.go(Paths.tickets),
                    child: Row(
                      children: [
                        AppIcon(AppIcons.ticket, color: p.success),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            l10n.eventYourTickets(event.myTickets),
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: p.text,
                            ),
                          ),
                        ),
                        Text(
                          l10n.eventSeeTickets,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: p.link,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                if (webview)
                  SizedBox(
                    height: 420,
                    child: ref.watch(webViewBuilderProvider)(
                      WebViewRequest(
                        url: Uri.parse(event.webviewUrl!),
                        debugLabel: 'event',
                      ),
                    ),
                  )
                else if (html.trim().isNotEmpty)
                  HtmlContent(
                    html: html,
                    embeds: event.embeds,
                    title: event.title,
                  ),
                const SizedBox(height: 24),
                SectionHeader(title: l10n.eventTicketsTitle),
                const SizedBox(height: 8),
                if (event.ticketTypes.isEmpty)
                  Text(
                    l10n.eventNoTickets,
                    style: TextStyle(fontSize: 15, color: p.textSecondary),
                  ),
                for (final type in event.ticketTypes) ...[
                  _TicketTypeCard(
                    type: type,
                    action: resolveTicketAction(
                      serverAction: type.action,
                      platform: platform,
                      event: event,
                      type: type,
                    ),
                    busy: _busyType == type.id,
                    onOrder: (action) => _order(type, action),
                  ),
                  const SizedBox(height: 10),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TicketTypeCard extends StatelessWidget {
  const _TicketTypeCard({
    required this.type,
    required this.action,
    required this.busy,
    required this.onOrder,
  });

  final TicketType type;
  final TicketAction action;
  final bool busy;
  final ValueChanged<TicketAction> onOrder;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final remaining = type.remaining;
    final note = !type.onSale
        ? (remaining == 0 ? l10n.eventSoldOut : l10n.eventSalesEnded)
        : action == TicketAction.none
        ? l10n.eventNotInApp
        : [
            if (remaining != null) l10n.eventSpotsLeft(remaining),
            if (type.saleEndsAt != null)
              l10n.eventSalesEnd(dayAndTime(type.saleEndsAt!)),
          ].join(' · ');
    return AppCard(
      key: ValueKey('ticket-type-${type.id}'),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  type.name,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // The price is display text only (never a button).
              Text(
                type.price.label,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
            ],
          ),
          if (note.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(note, style: TextStyle(fontSize: 13, color: p.textSecondary)),
          ],
          if (action != TicketAction.none) ...[
            const SizedBox(height: 12),
            PrimaryButton(
              key: ValueKey('order-${type.id}'),
              label: action == TicketAction.register
                  ? l10n.eventGetTickets
                  : l10n.eventBuyTickets,
              icon: AppIcons.ticket,
              height: 48,
              loading: busy,
              onPressed: () => onOrder(action),
            ),
          ],
        ],
      ),
    );
  }
}
