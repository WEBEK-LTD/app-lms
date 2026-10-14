import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/format/dates.dart';

import '../support/fixtures.dart';

void main() {
  test('bookings config', () {
    final config = AppConfig.fromJson(configJson(lms: null, bookings: true));
    final b = config.bookings!;
    expect(b.plugin, 'amelia');
    expect(b.timezone, 'Europe/Istanbul');
    expect(b.cancelBeforeMinutes, 60);
    expect(AppConfig.fromJson(configJson()).bookings, isNull);
    expect(
      BookingsConfig.fromJson(bookingsConfigJson(cancelBeforeMinutes: null))
          .cancelBeforeMinutes,
      isNull,
    );
  });

  test('service detail with staff prices', () {
    final s = ServiceDetail.fromJson(serviceDetailJson());
    expect(s.name, 'Haircut');
    expect(s.summary.durationMinutes, 30);
    expect(s.staff, hasLength(2));
    expect(s.staff.first.price, isNull);
    expect(s.staff.last.price?.formatted, '₺350.00');
  });

  test('free times are UTC with the business clock', () {
    final a = Availability.fromJson(availabilityJson('2026-10-19'));
    expect(a.days, hasLength(7));
    final slot = a.days.first.slots.first;
    expect(slot.localTime, '09:00');
    expect(slot.start, DateTime.utc(2026, 10, 19, 6));
    expect(slot.start.isUtc, isTrue);
    expect(slot.staffIds, [1, 2]);
    expect(a.days[6].slots, isEmpty, reason: 'Sunday');
  });

  test('appointment statuses, with a fallback for new ones', () {
    expect(
      Appointment.fromJson(appointmentJson(status: 'no_show')).status,
      AppointmentStatus.noShow,
    );
    final later = Appointment.fromJson(appointmentJson(status: 'waiting'));
    expect(later.status, AppointmentStatus.unknown);
    expect(later.isActive, isFalse);
    expect(Appointment.fromJson(appointmentJson()).isActive, isTrue);
  });

  test('home sections', () {
    final sections = [
      for (final s in bookingsHomeJson()['sections'] as List)
        BookingsHomeSection.fromJson(s as Map<String, dynamic>),
    ];
    expect(sections.first.type, BookingsSectionType.nextAppointment);
    expect(sections.first.appointment?.id, 7);
    expect(sections.last.type, BookingsSectionType.unknown);
  });

  test('dates', () {
    expect(parseIsoDate('2026-10-19'), DateTime(2026, 10, 19));
    expect(parseIsoDate('19/10/2026'), isNull);
    expect(addDays(DateTime(2026, 10, 30), 3), DateTime(2026, 11, 2));
    expect(shortDayLabel(DateTime(2026, 10, 19)), 'Mon 19 Oct');
  });
}
