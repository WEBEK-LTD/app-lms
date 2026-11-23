import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

/// 126 Where the travel screens are. The tabs' screens (Explore, Stays,
/// Flights, Trips, Saved, Price alerts) and the ones opened from them, at
/// the addresses lib/core/routing/inner_screens.dart gives Studio.
abstract final class TravelPaths {
  static const explore = '/explore';
  static const stays = '/stays';
  static const flights = '/flights';
  static const trips = '/trips';
  static const saved = '/travel-saved';
  static const alerts = '/price-alerts';

  static const hotels = '/travel/hotels';
  static const map = '/travel/hotel-map';
  static String hotel(int id) => '/travel/hotel/$id';
  static String rooms(int id) => '/travel/hotel/$id/rooms';
  static const checkout = '/travel/checkout';
  static const book = '/travel/book';
  static const flightResults = '/travel/flights';
  static const fares = '/travel/fares';
  static const calendar = '/travel/calendar';
  static const seats = '/travel/seats';
  static const extras = '/travel/extras';
  static const bundle = '/travel/bundle';
  static String trip(int id) => '/travel/trip/$id';
  static String passes(int id) => '/travel/trip/$id/passes';
  static String manage(int id) => '/travel/trip/$id/manage';
  static String review(int id) => '/travel/trip/$id/review';
}

/// 180.1 Whether the trip being put together (the stay and flight screen,
/// [TravelPaths.bundle]) is under this screen: its "Change" opened the stays.
/// A stays search opened from anywhere else books the stay alone.
bool travelTripBelow(BuildContext context) {
  final router = GoRouter.maybeOf(context);
  if (router == null) return false;
  bool any(List<RouteMatchBase> matches) => matches.any(
    (m) =>
        m.matchedLocation == TravelPaths.bundle ||
        (m is ShellRouteMatch && any(m.matches)),
  );
  return any(router.routerDelegate.currentConfiguration.matches);
}

/// 180.1 Back to the trip under this screen, closing the stays opened over it.
void travelBackToTrip(BuildContext context) {
  final router = GoRouter.of(context);
  bool top() {
    var matches = router.routerDelegate.currentConfiguration.matches;
    while (matches.isNotEmpty && matches.last is ShellRouteMatch) {
      matches = (matches.last as ShellRouteMatch).matches;
    }
    return matches.isNotEmpty &&
        matches.last.matchedLocation == TravelPaths.bundle;
  }

  while (!top() && router.canPop()) {
    router.pop();
  }
}
