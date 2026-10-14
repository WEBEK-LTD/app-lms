import 'catalog_models.dart';
import 'json.dart';
import 'learning_models.dart';

/// `Config.events`: settings of Events & tickets apps (roadmap 28).
class EventsConfig {
  const EventsConfig({
    this.showMap = true,
    this.allowCancelHours,
    this.timeZone = 'UTC',
    this.currency = 'TRY',
  });

  factory EventsConfig.fromJson(Json json) => EventsConfig(
    showMap: boolOr(json, 'show_map', true),
    allowCancelHours: optInt(json, 'allow_cancel_hours'),
    timeZone: optString(json, 'time_zone') ?? 'UTC',
    currency: optString(json, 'currency') ?? 'TRY',
  );

  /// Whether venues offer "Open in maps".
  final bool showMap;

  /// Free tickets can be cancelled until this many hours before the start;
  /// null when they can't.
  final int? allowCancelHours;
  final String timeZone;
  final String currency;
}

/// A category of events; its ID is a short name, like `concerts`.
class EventCategory {
  const EventCategory({required this.id, required this.name, this.count = 0});

  factory EventCategory.fromJson(Json json) => EventCategory(
    id: reqString(json, 'id'),
    name: reqString(json, 'name'),
    count: intOr(json, 'count', 0),
  );

  final String id;
  final String name;
  final int count;

  Json toJson() => {'id': id, 'name': name};
}

/// `GET /events/filters`.
class EventFilters {
  const EventFilters({
    this.categories = const [],
    this.firstDate,
    this.lastDate,
  });

  factory EventFilters.fromJson(Json json) => EventFilters(
    categories: listOf(json, 'categories', EventCategory.fromJson),
    firstDate: optString(json, 'first_date'),
    lastDate: optString(json, 'last_date'),
  );

  final List<EventCategory> categories;

  /// `yyyy-MM-dd` days of the first and last upcoming event.
  final String? firstDate;
  final String? lastDate;
}

class EventVenue {
  const EventVenue({
    required this.name,
    this.address,
    this.latitude,
    this.longitude,
  });

  factory EventVenue.fromJson(Json json) => EventVenue(
    name: reqString(json, 'name'),
    address: optString(json, 'address'),
    latitude: optDouble(json, 'latitude'),
    longitude: optDouble(json, 'longitude'),
  );

  final String name;
  final String? address;
  final double? latitude;
  final double? longitude;

  Json toJson() => {
    'name': name,
    'address': address,
    'latitude': latitude,
    'longitude': longitude,
  };
}

enum EventStatus { scheduled, cancelled, ended }

/// A day and time on the organiser's clock (`starts_local`), read as is:
/// the app shows it without converting time zones.
DateTime? parseLocalClock(String? value) {
  if (value == null) return null;
  final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$')
      .firstMatch(value);
  if (m == null) return null;
  return DateTime(
    int.parse(m[1]!),
    int.parse(m[2]!),
    int.parse(m[3]!),
    int.parse(m[4]!),
    int.parse(m[5]!),
  );
}

/// An event in a list (`EventSummary`). Tickets keep it on the device, so
/// [toJson] writes the same shape.
class EventSummary {
  const EventSummary({
    required this.id,
    required this.title,
    required this.startsAt,
    required this.endsAt,
    required this.startsLocal,
    required this.endsLocal,
    this.category,
    this.imageUrl,
    this.timeZone = 'UTC',
    this.venue,
    this.online = false,
    this.priceLabel,
    this.status = EventStatus.scheduled,
    this.spotsLeft,
    this.soldOut = false,
  });

  factory EventSummary.fromJson(Json json) {
    final startsAt = reqDate(json, 'starts_at');
    final endsAt = reqDate(json, 'ends_at');
    return EventSummary(
      id: reqInt(json, 'id'),
      title: reqString(json, 'title'),
      category: optObject(json, 'category', EventCategory.fromJson),
      imageUrl: optString(json, 'image_url'),
      startsAt: startsAt,
      endsAt: endsAt,
      // Older answers without the organiser's clock: the phone's own.
      startsLocal:
          parseLocalClock(optString(json, 'starts_local')) ??
          startsAt.toLocal(),
      endsLocal:
          parseLocalClock(optString(json, 'ends_local')) ?? endsAt.toLocal(),
      timeZone: optString(json, 'time_zone') ?? 'UTC',
      venue: optObject(json, 'venue', EventVenue.fromJson),
      online: boolOr(json, 'online', false),
      priceLabel: optString(json, 'price_label'),
      status: enumFrom(
        EventStatus.values,
        json['status'],
        EventStatus.scheduled,
      ),
      spotsLeft: optInt(json, 'spots_left'),
      soldOut: boolOr(json, 'sold_out', false),
    );
  }

  final int id;
  final String title;
  final EventCategory? category;
  final String? imageUrl;
  final DateTime startsAt;
  final DateTime endsAt;

  /// The start and end on the organiser's clock: what the app shows.
  final DateTime startsLocal;
  final DateTime endsLocal;
  final String timeZone;

  /// Null for an online-only event.
  final EventVenue? venue;
  final bool online;

  /// Display text only, never a purchase button.
  final String? priceLabel;
  final EventStatus status;
  final int? spotsLeft;
  final bool soldOut;

  /// No venue: on iOS its paid tickets are digital content (Apple's rule).
  bool get onlineOnly => venue == null;

  String _clock(DateTime t) =>
      '${t.year.toString().padLeft(4, '0')}-${t.month.toString().padLeft(2, '0')}-'
      '${t.day.toString().padLeft(2, '0')}T${t.hour.toString().padLeft(2, '0')}:'
      '${t.minute.toString().padLeft(2, '0')}';

  Json toJson() => {
    'id': id,
    'title': title,
    'category': category?.toJson(),
    'image_url': imageUrl,
    'starts_at': startsAt.toUtc().toIso8601String(),
    'ends_at': endsAt.toUtc().toIso8601String(),
    'starts_local': _clock(startsLocal),
    'ends_local': _clock(endsLocal),
    'time_zone': timeZone,
    'venue': venue?.toJson(),
    'online': online,
    'price_label': priceLabel,
    'status': status.name,
    'spots_left': spotsLeft,
    'sold_out': soldOut,
  };
}

/// What a ticket type's button does on this platform (`TicketType.action`).
enum TicketAction { register, checkout, none }

class TicketType {
  const TicketType({
    required this.id,
    required this.name,
    required this.price,
    this.remaining,
    this.saleEndsAt,
    this.maxPerOrder = 1,
    this.onSale = false,
    this.action = TicketAction.none,
  });

  factory TicketType.fromJson(Json json) => TicketType(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    price: Price.fromJson(asJson(json['price'], 'price')),
    remaining: optInt(json, 'remaining'),
    saleEndsAt: optDate(json, 'sale_ends_at'),
    maxPerOrder: intOr(json, 'max_per_order', 1),
    onSale: boolOr(json, 'on_sale', false),
    action: enumFrom(TicketAction.values, json['action'], TicketAction.none),
  );

  final int id;
  final String name;
  final Price price;

  /// Left of this type; null for no limit.
  final int? remaining;
  final DateTime? saleEndsAt;
  final int maxPerOrder;
  final bool onSale;
  final TicketAction action;
}

/// An event with its description, pictures and tickets (`EventDetail`).
class EventDetail extends EventSummary {
  const EventDetail({
    required super.id,
    required super.title,
    required super.startsAt,
    required super.endsAt,
    required super.startsLocal,
    required super.endsLocal,
    super.category,
    super.imageUrl,
    super.timeZone,
    super.venue,
    super.online,
    super.priceLabel,
    super.status,
    super.spotsLeft,
    super.soldOut,
    this.renderMode = RenderMode.native,
    this.html,
    this.webviewUrl,
    this.embeds = const [],
    this.images = const [],
    this.organiser,
    this.onlineUrl,
    this.ticketTypes = const [],
    this.myTickets = 0,
  });

  factory EventDetail.fromJson(Json json) {
    final s = EventSummary.fromJson(json);
    return EventDetail(
      id: s.id,
      title: s.title,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      startsLocal: s.startsLocal,
      endsLocal: s.endsLocal,
      category: s.category,
      imageUrl: s.imageUrl,
      timeZone: s.timeZone,
      venue: s.venue,
      online: s.online,
      priceLabel: s.priceLabel,
      status: s.status,
      spotsLeft: s.spotsLeft,
      soldOut: s.soldOut,
      renderMode: enumFrom(
        RenderMode.values,
        json['render_mode'],
        RenderMode.native,
      ),
      html: optString(json, 'html'),
      webviewUrl: optString(json, 'webview_url'),
      embeds: listOf(json, 'embeds', Embed.fromJson),
      images: [
        for (final image in listOf(json, 'images', (i) => i))
          ?optString(image, 'url'),
      ],
      organiser: optString(json, 'organiser'),
      onlineUrl: optString(json, 'online_url'),
      ticketTypes: listOf(json, 'ticket_types', TicketType.fromJson),
      myTickets: intOr(json, 'my_tickets', 0),
    );
  }

  final RenderMode renderMode;
  final String? html;
  final String? webviewUrl;
  final List<Embed> embeds;
  final List<String> images;
  final String? organiser;

  /// Only for a signed-in user holding a ticket.
  final String? onlineUrl;
  final List<TicketType> ticketTypes;
  final int myTickets;
}

enum TicketStatus { valid, used, cancelled }

/// A ticket in the user's wallet (`Ticket`). Kept on the device, so the
/// QR code shows without a connection.
class Ticket {
  const Ticket({
    required this.code,
    required this.qrPayload,
    required this.holderName,
    required this.event,
    required this.ticketTypeId,
    required this.ticketTypeName,
    required this.createdAt,
    this.status = TicketStatus.valid,
    this.price,
    this.onlineUrl,
    this.usedAt,
    this.canCancel = false,
  });

  factory Ticket.fromJson(Json json) {
    final type = asJson(json['ticket_type'], 'ticket_type');
    return Ticket(
      code: reqString(json, 'code'),
      qrPayload: reqString(json, 'qr_payload'),
      status: enumFrom(TicketStatus.values, json['status'], TicketStatus.valid),
      holderName: reqString(json, 'holder_name'),
      event: EventSummary.fromJson(asJson(json['event'], 'event')),
      ticketTypeId: reqInt(type, 'id'),
      ticketTypeName: reqString(type, 'name'),
      price: optObject(json, 'price', Price.fromJson),
      onlineUrl: optString(json, 'online_url'),
      usedAt: optDate(json, 'used_at'),
      canCancel: boolOr(json, 'can_cancel', false),
      createdAt: reqDate(json, 'created_at'),
    );
  }

  final String code;

  /// What the QR code holds, as it is (signed by the server).
  final String qrPayload;
  final TicketStatus status;
  final String holderName;
  final EventSummary event;
  final int ticketTypeId;
  final String ticketTypeName;
  final Price? price;
  final String? onlineUrl;
  final DateTime? usedAt;
  final bool canCancel;
  final DateTime createdAt;

  /// "K7QM-4XP2-HD9W", for typing at the door.
  String get groupedCode {
    final parts = <String>[];
    for (var i = 0; i < code.length; i += 4) {
      parts.add(code.substring(i, i + 4 > code.length ? code.length : i + 4));
    }
    return parts.join('-');
  }

  Json toJson() => {
    'code': code,
    'qr_payload': qrPayload,
    'status': status.name,
    'holder_name': holderName,
    'event': event.toJson(),
    'ticket_type': {'id': ticketTypeId, 'name': ticketTypeName},
    if (price case final p?)
      'price': {
        'is_free': p.isFree,
        'amount': p.amount,
        'sale_amount': p.saleAmount,
        'currency': p.currency,
        'formatted': p.formatted,
      },
    'online_url': onlineUrl,
    'used_at': usedAt?.toUtc().toIso8601String(),
    'can_cancel': canCancel,
    'created_at': createdAt.toUtc().toIso8601String(),
  };
}
