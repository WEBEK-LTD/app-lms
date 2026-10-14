import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/storage/local_settings.dart';

/// Events & tickets apps' settings (`Config.events`); the defaults on older
/// servers.
final eventsConfigProvider = Provider<EventsConfig>(
  (ref) => ref.watch(appConfigProvider).events ?? const EventsConfig(),
);

final eventFiltersProvider = FutureProvider.autoDispose<EventFilters>(
  (ref) => ref.contentApi.getEventFilters(),
);

/// Events for one search, category and days, page by page.
class EventsController extends PagedController<EventSummary> {
  EventsController(this.query);

  final EventQuery query;

  @override
  Future<Paged<EventSummary>> fetch(int page) =>
      ref.read(yallappApiProvider).listEvents(query.copyWith(page: page));
}

final eventsProvider = NotifierProvider.autoDispose
    .family<EventsController, PagedState<EventSummary>, EventQuery>(
      EventsController.new,
    );

/// The events of one month on the organiser's calendar (`yyyy-MM`), for the
/// calendar view, soonest first.
final monthEventsProvider = FutureProvider.autoDispose
    .family<List<EventSummary>, String>((ref, month) async {
      final first = parseIsoDate('$month-01')!;
      final last = DateTime(first.year, first.month + 1, 0);
      final api = ref.contentApi;
      final events = <EventSummary>[];
      // At most a few pages: a month rarely has more than 50 events.
      for (var page = 1; page <= 4; page++) {
        final result = await api.listEvents(
          EventQuery(
            page: page,
            perPage: 50,
            from: isoDate(first),
            to: isoDate(last),
          ),
        );
        events.addAll(result.items);
        if (page >= result.meta.totalPages) break;
      }
      return events;
    });

final eventProvider = FutureProvider.autoDispose.family<EventDetail, int>(
  (ref, id) => ref.contentApi.getEvent(id),
);

/// The user's tickets, and whether they come from this phone because the
/// server couldn't be reached.
@immutable
class TicketWallet {
  const TicketWallet({this.tickets = const [], this.offline = false});

  final List<Ticket> tickets;

  /// Shown from the copy kept on this phone (no connection).
  final bool offline;
}

/// The signed-in user's tickets. Every answer is kept on the phone
/// ([ticketWalletKey], forgotten on sign-out), so the tickets and their QR
/// codes show at the door without a connection.
final ticketWalletProvider =
    AsyncNotifierProvider.autoDispose<TicketWalletController, TicketWallet>(
      TicketWalletController.new,
    );

class TicketWalletController extends AsyncNotifier<TicketWallet> {
  @override
  Future<TicketWallet> build() async {
    final auth = ref.watch(authControllerProvider);
    if (!auth.isSignedIn) return const TicketWallet();
    final api = ref.watch(yallappApiProvider);
    try {
      final tickets = await api.listMyTickets();
      _save(tickets);
      return TicketWallet(tickets: tickets);
    } on ApiException catch (e) {
      if (!_unreachable(e)) rethrow;
      final saved = _saved();
      if (saved == null) rethrow;
      return TicketWallet(tickets: saved, offline: true);
    }
  }

  static bool _unreachable(ApiException e) =>
      e.code == ApiException.networkError ||
      e.code == ApiException.timeout ||
      (e.statusCode != null && e.statusCode! >= 500);

  List<Ticket>? _saved() {
    final raw = ref.read(sharedPreferencesProvider).getString(ticketWalletKey);
    if (raw == null) return null;
    try {
      final list = jsonDecode(raw);
      if (list is! List) return null;
      return [
        for (final item in list)
          if (item is Map)
            Ticket.fromJson(item.map((k, v) => MapEntry('$k', v))),
      ];
    } on Object {
      // A damaged copy is forgotten rather than breaking the wallet.
      return null;
    }
  }

  void _save(List<Ticket> tickets) {
    ref
        .read(sharedPreferencesProvider)
        .setString(
          ticketWalletKey,
          jsonEncode([for (final t in tickets) t.toJson()]),
        );
  }

  /// After a new ticket or a cancelled one.
  Future<void> reload() async {
    ref.invalidateSelf();
    await future;
  }
}

/// Shares a text (an event's name, day and place). Replaced in tests.
final shareEventTextProvider = Provider<Future<void> Function(String text)>(
  (ref) =>
      (text) async => SharePlus.instance.share(ShareParams(text: text)),
);

/// Hands an `.ics` file to the phone's share sheet, where the calendar app
/// picks it up ("Add to calendar"). Replaced in tests.
final shareCalendarFileProvider =
    Provider<Future<void> Function(String name, String ics)>(
      (ref) =>
          (name, ics) async => SharePlus.instance.share(
            ShareParams(
              files: [
                XFile.fromData(
                  Uint8List.fromList(utf8.encode(ics)),
                  mimeType: 'text/calendar',
                  name: name,
                ),
              ],
              fileNameOverrides: [name],
            ),
          ),
    );
