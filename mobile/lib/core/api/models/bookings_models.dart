import 'json.dart';

/// `Config.bookings`: the booking plugin's rules, for Bookings apps.
class BookingsConfig {
  const BookingsConfig({
    required this.plugin,
    required this.timezone,
    required this.currency,
    required this.staffChoice,
    required this.notes,
    required this.maxDaysAhead,
    required this.minMinutesAhead,
    this.cancelBeforeMinutes,
    this.intakeFields = const [],
  });

  factory BookingsConfig.fromJson(Json json) => BookingsConfig(
    plugin: reqString(json, 'plugin'),
    timezone: reqString(json, 'timezone'),
    currency: reqString(json, 'currency'),
    staffChoice: boolOr(json, 'staff_choice', true),
    notes: boolOr(json, 'notes', false),
    maxDaysAhead: intOr(json, 'max_days_ahead', 60),
    minMinutesAhead: intOr(json, 'min_minutes_ahead', 0),
    cancelBeforeMinutes: optInt(json, 'cancel_before_minutes'),
    intakeFields: listOf(json, 'intake_fields', IntakeField.fromJson),
  );

  final String plugin;

  /// The business's IANA time zone. Times are shown in it.
  final String timezone;
  final String currency;

  /// Whether customers pick a staff member.
  final bool staffChoice;

  /// Whether customers can leave a note with the booking.
  final bool notes;
  final int maxDaysAhead;
  final int minMinutesAhead;

  /// Null when customers can't cancel in the app.
  final int? cancelBeforeMinutes;

  /// Questions asked when booking (a clinic's intake form); empty for none.
  final List<IntakeField> intakeFields;
}

enum IntakeFieldType { text, textarea, date, choice }

/// A question customers answer when booking (`IntakeField`).
class IntakeField {
  const IntakeField({
    required this.id,
    required this.label,
    required this.type,
    this.options = const [],
    this.required = false,
  });

  /// Unknown types are shown as a short answer.
  factory IntakeField.fromJson(Json json) => IntakeField(
    id: reqString(json, 'id'),
    label: reqString(json, 'label'),
    type: enumFrom(IntakeFieldType.values, json['type'], IntakeFieldType.text),
    options: stringList(json, 'options'),
    required: boolOr(json, 'required', false),
  );

  /// The key of its answer.
  final String id;
  final String label;
  final IntakeFieldType type;

  /// The choices of a [IntakeFieldType.choice] question.
  final List<String> options;
  final bool required;

  /// The longest answer the server takes.
  int get maxLength => switch (type) {
    IntakeFieldType.text => 200,
    IntakeFieldType.textarea => 2000,
    IntakeFieldType.date => 10,
    IntakeFieldType.choice => 80,
  };
}

/// An answer to an intake question, with the question as it was asked.
class IntakeAnswer {
  const IntakeAnswer({
    required this.id,
    required this.label,
    required this.value,
  });

  factory IntakeAnswer.fromJson(Json json) => IntakeAnswer(
    id: reqString(json, 'id'),
    label: reqString(json, 'label'),
    value: reqString(json, 'value'),
  );

  final String id;
  final String label;
  final String value;
}

class BookingPrice {
  const BookingPrice({
    required this.amount,
    required this.currency,
    required this.formatted,
    required this.free,
  });

  factory BookingPrice.fromJson(Json json) => BookingPrice(
    amount: reqString(json, 'amount'),
    currency: reqString(json, 'currency'),
    formatted: reqString(json, 'formatted'),
    free: boolOr(json, 'free', false),
  );

  final String amount;
  final String currency;
  final String formatted;
  final bool free;
}

class ServiceCategory {
  const ServiceCategory({
    required this.id,
    required this.name,
    required this.count,
    this.imageUrl,
  });

  factory ServiceCategory.fromJson(Json json) => ServiceCategory(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    count: intOr(json, 'count', 0),
    imageUrl: optString(json, 'image_url'),
  );

  final int id;
  final String name;
  final int count;
  final String? imageUrl;
}

class StaffMember {
  const StaffMember({
    required this.id,
    required this.name,
    this.imageUrl,
    this.title,
    this.price,
    this.specialties = const [],
    this.languages = const [],
    this.bio,
  });

  factory StaffMember.fromJson(Json json) => StaffMember(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    imageUrl: optString(json, 'image_url'),
    title: optString(json, 'title'),
    price: optObject(json, 'price', BookingPrice.fromJson),
    specialties: stringList(json, 'specialties'),
    languages: stringList(json, 'languages'),
    bio: optString(json, 'bio'),
  );

  final int id;
  final String name;
  final String? imageUrl;
  final String? title;

  /// Their own price for a service, when it differs.
  final BookingPrice? price;

  /// A profile, when the business wrote one (a doctor's fields, the
  /// languages they speak and a few lines about them).
  final List<String> specialties;
  final List<String> languages;
  final String? bio;

  bool get hasProfile =>
      specialties.isNotEmpty ||
      languages.isNotEmpty ||
      (bio?.trim().isNotEmpty ?? false);
}

class ServiceSummary {
  const ServiceSummary({
    required this.id,
    required this.name,
    required this.durationMinutes,
    required this.price,
    this.imageUrl,
    this.categoryId,
    this.color,
  });

  factory ServiceSummary.fromJson(Json json) => ServiceSummary(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    durationMinutes: reqInt(json, 'duration_minutes'),
    price: BookingPrice.fromJson(asJson(json['price'], 'price')),
    imageUrl: optString(json, 'image_url'),
    categoryId: optInt(json, 'category_id'),
    color: optString(json, 'color'),
  );

  final int id;
  final String name;
  final int durationMinutes;
  final BookingPrice price;
  final String? imageUrl;
  final int? categoryId;
  final String? color;
}

class ServiceDetail {
  const ServiceDetail({
    required this.summary,
    required this.descriptionHtml,
    required this.staff,
  });

  factory ServiceDetail.fromJson(Json json) => ServiceDetail(
    summary: ServiceSummary.fromJson(json),
    descriptionHtml: optString(json, 'description_html') ?? '',
    staff: listOf(json, 'staff', StaffMember.fromJson),
  );

  final ServiceSummary summary;
  final String descriptionHtml;
  final List<StaffMember> staff;

  int get id => summary.id;
  String get name => summary.name;
}

class TimeSlot {
  const TimeSlot({
    required this.start,
    required this.end,
    required this.localTime,
    required this.staffIds,
  });

  factory TimeSlot.fromJson(Json json) => TimeSlot(
    start: reqDate(json, 'start'),
    end: reqDate(json, 'end'),
    localTime: reqString(json, 'local_time'),
    staffIds: [
      for (final id in (json['staff_ids'] as List? ?? const []))
        if (id is num) id.toInt(),
    ],
  );

  /// UTC.
  final DateTime start;
  final DateTime end;

  /// "HH:mm" in the business's time zone.
  final String localTime;
  final List<int> staffIds;
}

class AvailabilityDay {
  const AvailabilityDay({required this.date, required this.slots});

  factory AvailabilityDay.fromJson(Json json) => AvailabilityDay(
    date: reqString(json, 'date'),
    slots: listOf(json, 'slots', TimeSlot.fromJson),
  );

  /// "yyyy-MM-dd" in the business's time zone.
  final String date;
  final List<TimeSlot> slots;
}

class Availability {
  const Availability({required this.timezone, required this.days});

  factory Availability.fromJson(Json json) => Availability(
    timezone: reqString(json, 'timezone'),
    days: listOf(json, 'days', AvailabilityDay.fromJson),
  );

  final String timezone;
  final List<AvailabilityDay> days;
}

enum AppointmentStatus {
  approved,
  pending,
  cancelled,
  rejected,
  noShow,
  completed,
  unknown,
}

class Appointment {
  const Appointment({
    required this.id,
    required this.status,
    required this.statusLabel,
    required this.serviceId,
    required this.serviceName,
    required this.start,
    required this.end,
    required this.localDate,
    required this.localTime,
    required this.price,
    required this.canCancel,
    this.serviceImageUrl,
    this.staff,
    this.notes,
    this.location,
    this.answers = const [],
  });

  factory Appointment.fromJson(Json json) {
    final service = asJson(json['service'], 'service');
    return Appointment(
      id: reqInt(json, 'id'),
      status: enumFromSnake(
        AppointmentStatus.values,
        json['status'],
        AppointmentStatus.unknown,
      ),
      statusLabel: reqString(json, 'status_label'),
      serviceId: reqInt(service, 'id'),
      serviceName: reqString(service, 'name'),
      serviceImageUrl: optString(service, 'image_url'),
      staff: optObject(json, 'staff', StaffMember.fromJson),
      start: reqDate(json, 'start'),
      end: reqDate(json, 'end'),
      localDate: reqString(json, 'local_date'),
      localTime: reqString(json, 'local_time'),
      price: BookingPrice.fromJson(asJson(json['price'], 'price')),
      notes: optString(json, 'notes'),
      location: optString(json, 'location'),
      canCancel: boolOr(json, 'can_cancel', false),
      answers: listOf(json, 'answers', IntakeAnswer.fromJson),
    );
  }

  final int id;
  final AppointmentStatus status;
  final String statusLabel;
  final int serviceId;
  final String serviceName;
  final String? serviceImageUrl;
  final StaffMember? staff;
  final DateTime start;
  final DateTime end;
  final String localDate;
  final String localTime;
  final BookingPrice price;
  final String? notes;
  final String? location;
  final bool canCancel;

  /// The customer's own answers to the intake questions.
  final List<IntakeAnswer> answers;

  bool get isActive =>
      status == AppointmentStatus.approved ||
      status == AppointmentStatus.pending;
}

enum BookingsSectionType {
  banner,
  categories,
  services,
  staff,
  nextAppointment,
  unknown,
}

class BookingsHomeSection {
  const BookingsHomeSection({
    required this.type,
    this.title,
    this.bannerImageUrl,
    this.bannerServiceId,
    this.categories = const [],
    this.services = const [],
    this.staff = const [],
    this.appointment,
  });

  factory BookingsHomeSection.fromJson(Json json) {
    final banner = json['banner'];
    return BookingsHomeSection(
      type: enumFromSnake(
        BookingsSectionType.values,
        json['type'],
        BookingsSectionType.unknown,
      ),
      title: optString(json, 'title'),
      bannerImageUrl: banner is Map
          ? optString(asJson(banner), 'image_url')
          : null,
      bannerServiceId: banner is Map
          ? optInt(asJson(banner), 'link_service_id')
          : null,
      categories: listOf(json, 'categories', ServiceCategory.fromJson),
      services: listOf(json, 'services', ServiceSummary.fromJson),
      staff: listOf(json, 'staff', StaffMember.fromJson),
      appointment: optObject(json, 'appointment', Appointment.fromJson),
    );
  }

  final BookingsSectionType type;
  final String? title;
  final String? bannerImageUrl;
  final int? bannerServiceId;
  final List<ServiceCategory> categories;
  final List<ServiceSummary> services;
  final List<StaffMember> staff;
  final Appointment? appointment;
}
