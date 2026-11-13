import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/api/models/models.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'screens/alerts_screen.dart';
import 'screens/booking_screens.dart';
import 'screens/explore_screens.dart';
import 'screens/flight_screens.dart';
import 'screens/hotel_screens.dart';
import 'travel_paths.dart';

/// 126 The Travel module (hosted API, tag Travel): hotels, flights, or both,
/// as the company's Admin switches have it (`TravelConfig.mode`). Its tabs
/// follow the mode: with both, Explore, Stays, Flights, Trips and Account;
/// hotels only, Explore, Saved, Bookings, Messages and Account (with one
/// hotel, Explore is the hotel's page); flights only, Search, Alerts, Trips,
/// Help and Account. A screen of a part that is off is never opened.
final travelModule = AppModule(
  tabPaths: {
    TravelPaths.explore,
    TravelPaths.stays,
    TravelPaths.flights,
    TravelPaths.trips,
    TravelPaths.saved,
    TravelPaths.alerts,
    Paths.account,
  },
  screens: _screens,
  defaultTabs: travelTabs,
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.explore => TravelPaths.explore,
    BuiltInScreen.stays => _hotelsOn(config) ? TravelPaths.stays : null,
    BuiltInScreen.flights => _flightsOn(config) ? TravelPaths.flights : null,
    BuiltInScreen.trips || BuiltInScreen.orders => TravelPaths.trips,
    BuiltInScreen.saved => _hotelsOn(config) ? TravelPaths.saved : null,
    BuiltInScreen.priceAlerts => _flightsOn(config) ? TravelPaths.alerts : null,
    BuiltInScreen.messages => config?.chat == null ? null : Paths.chat,
    BuiltInScreen.account => Paths.account,
    BuiltInScreen.settings => Paths.settings,
    BuiltInScreen.notifications => Paths.notifications,
    BuiltInScreen.courses ||
    BuiltInScreen.myCourses ||
    BuiltInScreen.search ||
    BuiltInScreen.favorites ||
    BuiltInScreen.cart ||
    BuiltInScreen.services ||
    BuiltInScreen.appointments ||
    BuiltInScreen.articles ||
    BuiltInScreen.bookmarks ||
    BuiltInScreen.classes ||
    BuiltInScreen.memberships ||
    BuiltInScreen.events ||
    BuiltInScreen.tickets ||
    BuiltInScreen.campaigns ||
    BuiltInScreen.myDonations ||
    BuiltInScreen.sendParcel ||
    BuiltInScreen.shipments ||
    BuiltInScreen.courier ||
    BuiltInScreen.restaurants ||
    BuiltInScreen.club ||
    BuiltInScreen.foodOrders ||
    BuiltInScreen.restaurant ||
    BuiltInScreen.ride ||
    BuiltInScreen.myRides ||
    BuiltInScreen.driver ||
    BuiltInScreen.teachers ||
    BuiltInScreen.teacher ||
    BuiltInScreen.school ||
    BuiltInScreen.classroom => null,
  },
  routes: _pushedRoutes,
);

TravelMode _mode(AppConfig? config) => config?.travel?.mode ?? TravelMode.both;

bool _hotelsOn(AppConfig? config) => _mode(config) != TravelMode.flights;

bool _flightsOn(AppConfig? config) => _mode(config) != TravelMode.hotels;

/// The tabs of each mode, when the company hasn't published its own (Admin
/// writes these to the published tabs when it switches a part on or off).
List<ShellTab> travelTabs(AppConfig? config) {
  final mode = config?.travel?.mode ?? TravelMode.both;
  final chat = config?.chat != null;
  final account = ShellTab(
    icon: AppIcons.account,
    label: (c) => c.l10n.tabAccount,
    location: Paths.account,
  );
  return switch (mode) {
    TravelMode.both => [
      ShellTab(
        icon: Symbols.travel_explore_rounded,
        label: (c) => c.l10n.travelTabExplore,
        location: TravelPaths.explore,
      ),
      ShellTab(
        icon: Symbols.bed_rounded,
        label: (c) => c.l10n.travelTabStays,
        location: TravelPaths.stays,
      ),
      ShellTab(
        icon: Symbols.flight_rounded,
        label: (c) => c.l10n.travelTabFlights,
        location: TravelPaths.flights,
      ),
      ShellTab(
        icon: Symbols.luggage_rounded,
        label: (c) => c.l10n.travelTabTrips,
        location: TravelPaths.trips,
      ),
      account,
    ],
    TravelMode.hotels => [
      ShellTab(
        icon: Symbols.travel_explore_rounded,
        label: (c) => c.l10n.travelTabExplore,
        location: TravelPaths.explore,
      ),
      ShellTab(
        icon: AppIcons.favorite,
        label: (c) => c.l10n.travelTabSaved,
        location: TravelPaths.saved,
      ),
      ShellTab(
        icon: Symbols.luggage_rounded,
        label: (c) => c.l10n.travelTabBookings,
        location: TravelPaths.trips,
      ),
      if (chat)
        ShellTab(
          icon: AppIcons.chat,
          label: (c) => c.l10n.tabMessages,
          location: Paths.chat,
        ),
      account,
    ],
    TravelMode.flights => [
      ShellTab(
        icon: Symbols.search_rounded,
        label: (c) => c.l10n.travelTabSearch,
        location: TravelPaths.explore,
      ),
      ShellTab(
        icon: Symbols.notifications_rounded,
        label: (c) => c.l10n.travelTabAlerts,
        location: TravelPaths.alerts,
      ),
      ShellTab(
        icon: Symbols.luggage_rounded,
        label: (c) => c.l10n.travelTabTrips,
        location: TravelPaths.trips,
      ),
      if (chat)
        ShellTab(
          icon: Symbols.support_agent_rounded,
          label: (c) => c.l10n.travelTabHelp,
          location: Paths.chat,
        ),
      account,
    ],
  };
}

List<TabScreen> _screens() => [
  TabScreen(TravelPaths.explore, (state) => const TravelExploreScreen()),
  TabScreen(TravelPaths.stays, (state) => const StaysHomeScreen()),
  TabScreen(TravelPaths.flights, (state) => const FlightsHomeScreen()),
  TabScreen(TravelPaths.trips, (state) => const TripsScreen()),
  TabScreen(TravelPaths.saved, (state) => const SavedHotelsScreen()),
  TabScreen(TravelPaths.alerts, (state) => const PriceAlertsScreen()),
  TabScreen(
    Paths.account,
    (state) => const ProfileScreen(),
    routes: accountSubRoutes(),
  ),
];

GoRoute _page(String path, Widget Function(GoRouterState state) build) =>
    GoRoute(
      path: path,
      pageBuilder: (context, state) => appPage(state, build(state)),
    );

Widget _withId(GoRouterState state, Widget Function(int id) build) {
  final id = intParam(state, 'id');
  return id == null ? const NotFoundScreen() : build(id);
}

List<RouteBase> _pushedRoutes() => [
  _page(TravelPaths.hotels, (_) => const HotelResultsScreen()),
  _page(TravelPaths.map, (_) => const HotelMapScreen()),
  _page(
    '/travel/hotel/:id',
    (s) => _withId(
      s,
      (id) => HotelDetailScreen(key: ValueKey('hotel-$id'), hotelId: id),
    ),
  ),
  _page(
    '/travel/hotel/:id/rooms',
    (s) => _withId(s, (id) => RoomSelectScreen(hotelId: id)),
  ),
  _page(TravelPaths.checkout, (_) => const CheckoutScreen()),
  _page(TravelPaths.book, (_) => const CheckoutScreen()),
  _page(TravelPaths.flightResults, (_) => const FlightResultsScreen()),
  _page(TravelPaths.fares, (_) => const FaresScreen()),
  _page(TravelPaths.calendar, (_) => const PriceCalendarScreen()),
  _page(
    TravelPaths.seats,
    (s) => SeatMapScreen(
      key: ValueKey('seats-${s.uri.queryParameters['back']}'),
      back: s.uri.queryParameters['back'] == '1',
    ),
  ),
  _page(TravelPaths.extras, (_) => const ExtrasScreen()),
  _page(TravelPaths.bundle, (_) => const BundleScreen()),
  _page(
    '/travel/trip/:id',
    (s) => _withId(
      s,
      (id) => TripScreen(key: ValueKey('trip-$id'), bookingId: id),
    ),
  ),
  _page(
    '/travel/trip/:id/passes',
    (s) => _withId(s, (id) => BoardingPassScreen(bookingId: id)),
  ),
  _page(
    '/travel/trip/:id/manage',
    (s) => _withId(s, (id) => ManageBookingScreen(bookingId: id)),
  ),
  _page(
    '/travel/trip/:id/review',
    (s) => _withId(s, (id) => ReviewStayScreen(bookingId: id)),
  ),
];
