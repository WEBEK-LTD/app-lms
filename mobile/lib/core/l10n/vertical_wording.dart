import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/config_models.dart';
import '../config/build_config_data.dart';
import '../gate/app_gate.dart';
import '../providers.dart';
import 'l10n.dart';

/// The app's kind of business: what the server says (`Config.vertical`),
/// else what the app was built with. Wording and defaults only, never
/// routes.
AppVertical? appVerticalOf(BuildConfigData build, AppConfig? config) =>
    config?.vertical ?? build.vertical;

/// The app's kind of business, from the config once it is loaded.
final appVerticalProvider = Provider<AppVertical?>((ref) {
  final gate = ref.watch(appGateProvider);
  return appVerticalOf(
    ref.watch(appEnvironmentProvider).build,
    gate is GateReady ? gate.config : null,
  );
});

extension VerticalWordingContext on BuildContext {
  /// The words of the app's kind of business, in the language in use.
  VerticalWording get words => VerticalWording(
    l10n,
    ProviderScope.containerOf(this, listen: false).read(appVerticalProvider),
  );
}

/// Words that change with the kind of business (a clinic's patients,
/// doctors and visits; 26 a restaurant's menu). Kinds without words of their own use the default
/// words; a kind's own words go in the ARB files and in the getters below.
class VerticalWording {
  const VerticalWording(this.l10n, this.vertical);

  final AppLocalizations l10n;
  final AppVertical? vertical;

  /// 21 A clinic: doctors, patients and visits on the bookings screens.
  bool get isClinic => vertical == AppVertical.clinic;

  /// 26 A restaurant or café: the menu on the store screens.
  bool get isRestaurant => vertical == AppVertical.restaurant;

  String _pick(String clinic, String other) => isClinic ? clinic : other;

  String _food(String restaurant, String other) =>
      isRestaurant ? restaurant : other;

  /// The business that owns the app.
  String get business => isRestaurant
      ? l10n.wordingRestaurant
      : _pick(l10n.wordingClinic, l10n.wordingBusiness);

  /// The business's customers.
  String get customer => _pick(l10n.wordingPatient, l10n.wordingCustomer);

  // Bookings screens.

  /// The heading above the staff picker ("With", "Doctor").
  String get staffHeading => _pick(l10n.clinicDoctor, l10n.withTitle);
  String get ourTeam => _pick(l10n.clinicOurDoctors, l10n.ourTeam);
  String get anyone => _pick(l10n.clinicAnyDoctor, l10n.anyone);
  String get anyoneAvailable =>
      _pick(l10n.clinicAnyDoctorAvailable, l10n.anyoneAvailable);

  /// The appointments tab and screen ("Appointments", "Visits").
  String get appointments => _pick(l10n.clinicVisits, l10n.tabAppointments);

  /// One appointment's title.
  String get appointment => _pick(l10n.clinicVisit, l10n.appointment);
  String get bookAppointment =>
      _pick(l10n.clinicBookVisit, l10n.bookAppointment);
  String get nextAppointment =>
      _pick(l10n.clinicNextVisit, l10n.nextAppointment);
  String get noUpcomingAppointments =>
      _pick(l10n.clinicNoUpcomingVisits, l10n.noUpcomingAppointments);
  String get noUpcomingAppointmentsMessage => _pick(
    l10n.clinicNoUpcomingVisitsMessage,
    l10n.noUpcomingAppointmentsMessage,
  );
  String get noPastAppointments =>
      _pick(l10n.clinicNoPastVisits, l10n.noPastAppointments);
  String get loadingAppointments =>
      _pick(l10n.clinicLoadingVisits, l10n.loadingAppointments);
  String get loadingAppointment =>
      _pick(l10n.clinicLoadingVisit, l10n.loadingAppointment);
  String get cancelAppointment =>
      _pick(l10n.clinicCancelVisit, l10n.cancelAppointment);
  String get cancelAppointmentTitle =>
      _pick(l10n.clinicCancelVisitTitle, l10n.cancelAppointmentTitle);
  String get appointmentCancelled =>
      _pick(l10n.clinicVisitCancelled, l10n.appointmentCancelled);
  String get appointmentBooked =>
      _pick(l10n.clinicVisitBooked, l10n.appointmentBooked);
  String get noteForBusiness =>
      _pick(l10n.clinicNoteForClinic, l10n.noteForBusiness);
  String get confirmYourBooking =>
      _pick(l10n.clinicConfirmVisit, l10n.confirmYourBooking);

  // Store screens (26).

  /// The shop tab and screen ("Shop", "Menu").
  String get shop => _food(l10n.menuTitle, l10n.tabShop);
  String get searchProducts => _food(l10n.menuSearch, l10n.searchProducts);
  String get startShopping => _food(l10n.menuBrowse, l10n.startShopping);
  String get noProductsTitle =>
      _food(l10n.menuEmptyTitle, l10n.noProductsTitle);
  String get noProductsMessage =>
      _food(l10n.menuEmptyMessage, l10n.noProductsMessage);
  String get loadingProducts => _food(l10n.menuLoading, l10n.loadingProducts);
}
