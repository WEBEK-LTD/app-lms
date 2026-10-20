import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/providers.dart';
import '../../../core/storage/local_settings.dart';

final bookingsHomeProvider =
    FutureProvider.autoDispose<List<BookingsHomeSection>>(
      (ref) => ref.contentApi.getBookingsHome(),
    );

final serviceCategoriesProvider = FutureProvider<List<ServiceCategory>>(
  (ref) => ref.contentApi.listServiceCategories(),
);

/// Services for one search and category.
typedef ServicesQuery = ({String search, int? category});

class ServicesController extends PagedController<ServiceSummary> {
  ServicesController(this.query);

  final ServicesQuery query;

  @override
  Future<Paged<ServiceSummary>> fetch(int page) => ref
      .read(yallappApiProvider)
      .listServices(page: page, search: query.search, category: query.category);
}

final servicesProvider = NotifierProvider.autoDispose
    .family<ServicesController, PagedState<ServiceSummary>, ServicesQuery>(
      ServicesController.new,
    );

final serviceProvider = FutureProvider.autoDispose.family<ServiceDetail, int>(
  (ref, id) => ref.contentApi.getService(id),
);

/// Free times for a service, a staff member (null for anyone) and a week
/// starting at `from` (`yyyy-MM-dd` in the business's time zone).
typedef AvailabilityQuery = ({int service, int? staff, String from});

final availabilityProvider = FutureProvider.autoDispose
    .family<Availability, AvailabilityQuery>(
      (ref, q) => ref.contentApi.getAvailability(
        q.service,
        staffId: q.staff,
        from: q.from,
      ),
    );

class AppointmentsController extends PagedController<Appointment> {
  AppointmentsController(this.filter);

  final AppointmentsFilter filter;

  @override
  Future<Paged<Appointment>> fetch(int page) => ref
      .read(yallappApiProvider)
      .listMyAppointments(filter: filter, page: page);
}

final appointmentsProvider = NotifierProvider.autoDispose
    .family<
      AppointmentsController,
      PagedState<Appointment>,
      AppointmentsFilter
    >(AppointmentsController.new);

final appointmentProvider = FutureProvider.autoDispose.family<Appointment, int>(
  (ref, id) => ref.contentApi.getMyAppointment(id),
);

// 27 A gym's classes and memberships.

/// Classes from `from` to `to` (`yyyy-MM-dd` in the business's time zone).
typedef ClassesQuery = ({String from, String to});

final classesProvider = FutureProvider.autoDispose
    .family<ClassList, ClassesQuery>(
      (ref, q) => ref.contentApi.listClasses(from: q.from, to: q.to),
    );

final membershipPlansProvider =
    FutureProvider.autoDispose<List<MembershipPlan>>(
      (ref) => ref.contentApi.listMembershipPlans(),
    );

/// The member's memberships, active ones first.
/// The member's memberships. 63 Every answer is kept on the phone
/// ([membershipWalletKey], forgotten on sign-out), so a gym's member code
/// shows at the door without a connection.
final myMembershipsProvider = FutureProvider.autoDispose<List<Membership>>((
  ref,
) async {
  final prefs = ref.read(sharedPreferencesProvider);
  try {
    final list = await ref.contentApi.listMyMemberships();
    try {
      await prefs.setString(
        membershipWalletKey,
        jsonEncode([for (final m in list) m.toJson()]),
      );
    } on Object {
      // Kept next time.
    }
    return list;
  } on ApiException catch (e) {
    final unreachable =
        e.code == ApiException.networkError ||
        e.code == ApiException.timeout ||
        (e.statusCode != null && e.statusCode! >= 500);
    if (!unreachable) rethrow;
    final saved = _savedMemberships(prefs.getString(membershipWalletKey));
    if (saved == null) rethrow;
    return saved;
  }
});

/// The memberships kept on the phone; null when none or damaged.
List<Membership>? _savedMemberships(String? raw) {
  if (raw == null) return null;
  try {
    final list = jsonDecode(raw);
    if (list is! List) return null;
    return [
      for (final item in list)
        if (item is Map)
          Membership.fromJson(item.map((k, v) => MapEntry('$k', v))),
    ];
  } on Object {
    // A damaged copy is forgotten rather than breaking the screen.
    return null;
  }
}

/// After booking or giving back a spot, or buying a plan: the timetable
/// and the membership show the change.
void invalidateClasses(WidgetRef ref) {
  ref
    ..invalidate(classesProvider)
    ..invalidate(myMembershipsProvider);
}

/// After booking or cancelling: lists, the home's next appointment and free
/// times show the change.
void invalidateAppointments(WidgetRef ref) {
  ref
    ..invalidate(appointmentsProvider)
    ..invalidate(appointmentProvider)
    ..invalidate(bookingsHomeProvider)
    ..invalidate(availabilityProvider);
}
