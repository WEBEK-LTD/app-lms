import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/providers.dart';

final bookingsHomeProvider =
    FutureProvider.autoDispose<List<BookingsHomeSection>>(
      (ref) => ref.watch(yallappApiProvider).getBookingsHome(),
    );

final serviceCategoriesProvider = FutureProvider<List<ServiceCategory>>(
  (ref) => ref.watch(yallappApiProvider).listServiceCategories(),
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
  (ref, id) => ref.watch(yallappApiProvider).getService(id),
);

/// Free times for a service, a staff member (null for anyone) and a week
/// starting at `from` (`yyyy-MM-dd` in the business's time zone).
typedef AvailabilityQuery = ({int service, int? staff, String from});

final availabilityProvider = FutureProvider.autoDispose
    .family<Availability, AvailabilityQuery>(
      (ref, q) => ref
          .watch(yallappApiProvider)
          .getAvailability(q.service, staffId: q.staff, from: q.from),
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
  (ref, id) => ref.watch(yallappApiProvider).getMyAppointment(id),
);

/// After booking or cancelling: lists, the home's next appointment and free
/// times show the change.
void invalidateAppointments(WidgetRef ref) {
  ref
    ..invalidate(appointmentsProvider)
    ..invalidate(appointmentProvider)
    ..invalidate(bookingsHomeProvider)
    ..invalidate(availabilityProvider);
}
