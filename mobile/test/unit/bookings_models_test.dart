import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
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
    expect(longDate(DateTime(1990, 4, 2)), '2 April 1990');
  });

  test('21 intake questions, doctor profiles and answers', () {
    final config = AppConfig.fromJson(clinicConfigJson());
    expect(config.vertical, AppVertical.clinic);
    final fields = config.bookings!.intakeFields;
    expect(fields.map((f) => f.id), [
      'reason',
      'first_visit',
      'birth',
      'heard',
    ]);
    expect(fields[0].type, IntakeFieldType.textarea);
    expect(fields[0].maxLength, 2000);
    expect(fields[1].options, ['Yes', 'No']);
    expect(fields[1].required, isTrue);
    expect(fields[2].required, isFalse);
    // A type from a newer server is a short answer.
    expect(fields[3].type, IntakeFieldType.text);
    expect(fields[3].maxLength, 200);
    // Older servers send no questions and no profiles.
    expect(
      AppConfig.fromJson(configJson(lms: null, bookings: true))
          .bookings!
          .intakeFields,
      isEmpty,
    );
    final plain = StaffMember.fromJson(staffJson());
    expect(plain.specialties, isEmpty);
    expect(plain.hasProfile, isFalse);
    final doctor = StaffMember.fromJson(doctorJson());
    expect(doctor.specialties, ['Orthodontics', "Children's dentistry"]);
    expect(doctor.languages, ['Turkish', 'English']);
    expect(doctor.bio, startsWith('Twelve years'));
    expect(doctor.hasProfile, isTrue);

    expect(Appointment.fromJson(appointmentJson()).answers, isEmpty);
    final a = Appointment.fromJson(
      appointmentJson(
        answers: [
          {'id': 'reason', 'label': 'Reason for your visit', 'value': 'Pain'},
        ],
      ),
    );
    expect(a.answers.single.label, 'Reason for your visit');
    expect(a.answers.single.value, 'Pain');
  });
}
