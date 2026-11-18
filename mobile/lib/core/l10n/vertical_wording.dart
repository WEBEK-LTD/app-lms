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

/// 169 What the app is, for the words its shared screens use (empty
/// states, notices): an academy's lessons, a shop's orders, a flower shop's
/// deliveries. From the app type, the kind of business and, for a shop, its
/// gift checkout (a flower shop's).
enum AppKind {
  courses,
  school,
  store,
  flowers,
  food,
  bookings,
  listings,
  news,
  events,
  donations,
  delivery,
  rides,
  travel,
}

/// 169 The app's kind: its type, its kind of business ([appVerticalOf]) and,
/// for a store, whether its checkout is the gift one (the store's setting
/// or the look Studio gave it).
AppKind appKindOf(BuildConfigData build, AppConfig? config) {
  final vertical = appVerticalOf(build, config);
  return switch (build.appType) {
    AppType.lms => AppKind.courses,
    AppType.school => AppKind.school,
    AppType.store when vertical == AppVertical.restaurant => AppKind.food,
    AppType.store
        when (config?.store?.giftCheckout ?? false) ||
            (config?.screens?.checkout?.gift ?? false) =>
      AppKind.flowers,
    AppType.store => AppKind.store,
    AppType.booking => AppKind.bookings,
    AppType.realEstate => AppKind.listings,
    AppType.news => AppKind.news,
    AppType.events => AppKind.events,
    AppType.donations => AppKind.donations,
    AppType.delivery => AppKind.delivery,
    AppType.food => AppKind.food,
    AppType.rides => AppKind.rides,
    AppType.travel => AppKind.travel,
  };
}

/// 169 The app's kind, from the config once it is loaded.
final appKindProvider = Provider<AppKind>((ref) {
  final gate = ref.watch(appGateProvider);
  return appKindOf(
    ref.watch(appEnvironmentProvider).build,
    gate is GateReady ? gate.config : null,
  );
});

extension VerticalWordingContext on BuildContext {
  /// The words of the app's kind of business, in the language in use.
  VerticalWording get words {
    final container = ProviderScope.containerOf(this, listen: false);
    return VerticalWording(
      l10n,
      container.read(appVerticalProvider),
      kind: container.read(appKindProvider),
    );
  }
}

/// Words that change with the kind of business (a clinic's patients,
/// doctors and visits; 26 a restaurant's menu; 27 a gym's members, coaches
/// and classes). Kinds without words of their own use the default
/// words; a kind's own words go in the ARB files and in the getters below.
class VerticalWording {
  const VerticalWording(
    this.l10n,
    this.vertical, {
    this.kind = AppKind.courses,
  });

  final AppLocalizations l10n;
  final AppVertical? vertical;

  /// 169 What the app is; an academy's words when not given.
  final AppKind kind;

  /// 169 An academy or a school: the words of lessons and courses.
  bool get isLearning => kind == AppKind.courses || kind == AppKind.school;

  /// 21 A clinic: doctors, patients and visits on the bookings screens.
  bool get isClinic => vertical == AppVertical.clinic;

  /// 26 A restaurant or café: the menu on the store screens.
  bool get isRestaurant => vertical == AppVertical.restaurant;

  /// 27 A gym or studio: coaches, members and classes.
  bool get isFitness => vertical == AppVertical.fitness;

  String _pick(String clinic, String other) => isClinic ? clinic : other;

  /// 27 A gym's word, a clinic's, or the default.
  String _pick3(String clinic, String fitness, String other) =>
      isClinic ? clinic : (isFitness ? fitness : other);

  String _food(String restaurant, String other) =>
      isRestaurant ? restaurant : other;

  /// The business that owns the app.
  String get business => isRestaurant
      ? l10n.wordingRestaurant
      : _pick3(l10n.wordingClinic, l10n.wordingGym, l10n.wordingBusiness);

  /// The business's customers.
  String get customer =>
      _pick3(l10n.wordingPatient, l10n.wordingMember, l10n.wordingCustomer);

  // Bookings screens.

  /// The heading above the staff picker ("With", "Doctor", "Coach").
  String get staffHeading =>
      _pick3(l10n.clinicDoctor, l10n.fitnessCoach, l10n.withTitle);
  String get ourTeam =>
      _pick3(l10n.clinicOurDoctors, l10n.fitnessOurCoaches, l10n.ourTeam);
  String get anyone =>
      _pick3(l10n.clinicAnyDoctor, l10n.fitnessAnyCoach, l10n.anyone);
  String get anyoneAvailable => _pick3(
    l10n.clinicAnyDoctorAvailable,
    l10n.fitnessAnyCoachAvailable,
    l10n.anyoneAvailable,
  );

  /// 27 The class timetable ("Classes").
  String get classes => l10n.classesTitle;

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

  // 169 Shared screens, in the app's kind's words.

  /// The notifications' empty state: an academy's new lessons, a shop's
  /// orders, a flower shop's deliveries.
  String get noNotificationsMessage => switch (kind) {
    AppKind.courses => l10n.noNotificationsMessage,
    AppKind.school => l10n.noNotificationsMessageSchool,
    AppKind.store => l10n.noNotificationsMessageStore,
    AppKind.flowers => l10n.noNotificationsMessageFlowers,
    AppKind.food => l10n.noNotificationsMessageFood,
    AppKind.bookings => l10n.noNotificationsMessageBookings,
    AppKind.listings => l10n.noNotificationsMessageListings,
    AppKind.news => l10n.noNotificationsMessageNews,
    AppKind.events => l10n.noNotificationsMessageEvents,
    AppKind.donations => l10n.noNotificationsMessageDonations,
    AppKind.delivery => l10n.noNotificationsMessageDelivery,
    AppKind.rides => l10n.noNotificationsMessageRides,
    AppKind.travel => l10n.noNotificationsMessageTravel,
  };

  /// "Update the app to keep learning", or to keep using it.
  String updateRequiredMessage(String name) => isLearning
      ? l10n.updateRequiredMessage(name)
      : l10n.updateRequiredMessageApp(name);

  /// Deleting the account: an academy's progress and enrollments, or the
  /// account and its details.
  String get deleteAccountMessage =>
      isLearning ? l10n.deleteAccountMessage : l10n.deleteAccountMessageApp;

  /// No account with the phone number: contact the academy, the school, or
  /// the business ("us").
  String get noAccountForNumber => switch (kind) {
    AppKind.courses => l10n.noAccountForNumber,
    AppKind.school => l10n.noAccountForNumberSchool,
    _ => l10n.noAccountForNumberApp,
  };

  /// A file the app can't show: an academy's course files, or any file.
  String get fileInAppOnlyMessage =>
      isLearning ? l10n.fileInAppOnlyMessage : l10n.fileInAppOnlyMessageApp;
}
