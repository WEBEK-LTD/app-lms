import 'package:flutter/widgets.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/bidi.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';

/// 126 The travel screens' words for what the API sends as ids: amenities,
/// meals, flight statuses, a price's lines, dates.

String amenityName(BuildContext context, String id) {
  final l = context.l10n;
  return switch (id) {
    'pool' => l.travelAmenityPool,
    'spa' => l.travelAmenitySpa,
    'wifi' => l.travelAmenityWifi,
    'breakfast' => l.travelAmenityBreakfast,
    'shuttle' => l.travelAmenityShuttle,
    'gym' => l.travelAmenityGym,
    'parking' => l.travelAmenityParking,
    'beach' => l.travelAmenityBeach,
    'restaurant' => l.travelAmenityRestaurant,
    'bar' => l.travelAmenityBar,
    'air_conditioning' => l.travelAmenityAirConditioning,
    'family' => l.travelAmenityFamily,
    'pets' => l.travelAmenityPets,
    'accessible' => l.travelAmenityAccessible,
    'kitchen' => l.travelAmenityKitchen,
    'view' => l.travelAmenityView,
    _ => id,
  };
}

String hotelKindName(BuildContext context, String kind) {
  final l = context.l10n;
  return switch (kind) {
    'resort' => l.travelKindResort,
    'boutique' => l.travelKindBoutique,
    'apartments' => l.travelKindApartments,
    'villa' => l.travelKindVilla,
    'hostel' => l.travelKindHostel,
    'guesthouse' => l.travelKindGuesthouse,
    _ => l.travelKindHotel,
  };
}

String boardName(BuildContext context, String board) {
  final l = context.l10n;
  return switch (board) {
    'breakfast' => l.travelBoardBreakfast,
    'half_board' => l.travelBoardHalf,
    'full_board' => l.travelBoardFull,
    'all_inclusive' => l.travelBoardAll,
    _ => l.travelBoardRoomOnly,
  };
}

String flightStatusName(BuildContext context, String status) {
  final l = context.l10n;
  return switch (status) {
    'on_time' => l.travelStatusOnTime,
    'delayed' => l.travelStatusDelayed,
    'boarding' => l.travelStatusBoarding,
    'departed' => l.travelStatusDeparted,
    'landed' => l.travelStatusLanded,
    'cancelled' => l.travelStatusCancelled,
    _ => l.travelStatusScheduled,
  };
}

String requestName(BuildContext context, String id) {
  final l = context.l10n;
  return switch (id) {
    'late_arrival' => l.travelRequestLate,
    'early_arrival' => l.travelRequestEarly,
    'high_floor' => l.travelRequestHighFloor,
    'quiet_room' => l.travelRequestQuiet,
    'airport_pickup' => l.travelRequestPickup,
    'twin_beds' => l.travelRequestTwin,
    _ => l.travelRequestAccessible,
  };
}

String lineLabel(BuildContext context, TravelLine line) {
  final l = context.l10n;
  return switch (line.kind) {
    'nights' =>
      line.unitFormatted == null
          ? l.travelNights(line.count)
          : l.travelLineNights(line.count, line.unitFormatted!),
    'fare' => l.travelLineFare(line.count),
    'seats' => l.travelLineSeats,
    'bags' => l.travelLineBags(line.count),
    'meals' => l.travelLineMeals(line.count),
    'transfer' => l.travelLineTransfer,
    'taxes' => l.travelLineTaxes,
    'member' => l.travelLineMember,
    'bundle' => l.travelLineBundle,
    'change_fee' => l.travelLineChangeFee,
    _ => line.kind,
  };
}

/// "12 – 16 Jun" for two days, with the second month only when it differs.
String dayRange(DateTime? from, DateTime? to) {
  if (from == null || to == null) return '';
  final first = from.month == to.month
      ? '${from.day}'
      : shortDate(from).replaceAll(RegExp(r' \d{4}$'), '');
  return '$first – ${shortDate(to).replaceAll(RegExp(r' \d{4}$'), '')}';
}

/// "Fri 3 Oct".
String shortDay(DateTime? day) => day == null ? '' : shortDayLabel(day);

/// A local "YYYY-MM-DD…" as a day.
DateTime? dayOf(String value) =>
    value.length >= 10 ? parseIsoDate(value.substring(0, 10)) : null;

/// "CAI → IST", the arrow pointing the reading way.
String route(String from, String to) =>
    '${ltrRun(from)} ${toArrow()} ${ltrRun(to)}';
