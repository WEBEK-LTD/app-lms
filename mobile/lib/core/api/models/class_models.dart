import 'bookings_models.dart';
import 'json.dart';

/// 27 `Config.bookings.classes`: a gym's or studio's group classes.
class ClassesConfig {
  const ClassesConfig({
    required this.membershipRequired,
    required this.memberships,
    this.cancelBeforeMinutes,
  });

  factory ClassesConfig.fromJson(Json json) => ClassesConfig(
    membershipRequired: boolOr(json, 'membership_required', false),
    cancelBeforeMinutes: optInt(json, 'cancel_before_minutes'),
    memberships: boolOr(json, 'memberships', false),
  );

  /// Booking a class needs an active membership.
  final bool membershipRequired;

  /// Null when members can't give their spot back in the app.
  final int? cancelBeforeMinutes;

  /// Whether plans are on sale in the app.
  final bool memberships;
}

enum ClassStatus { scheduled, cancelled }

/// One class on the timetable (`ClassSession`).
class ClassSession {
  const ClassSession({
    required this.id,
    required this.status,
    required this.serviceId,
    required this.serviceName,
    required this.start,
    required this.end,
    required this.localDate,
    required this.localTime,
    required this.capacity,
    required this.spotsLeft,
    required this.booked,
    required this.canCancel,
    this.serviceImageUrl,
    this.color,
    this.staff,
  });

  factory ClassSession.fromJson(Json json) {
    final service = asJson(json['service'], 'service');
    return ClassSession(
      id: reqInt(json, 'id'),
      status: enumFrom(
        ClassStatus.values,
        json['status'],
        ClassStatus.scheduled,
      ),
      serviceId: reqInt(service, 'id'),
      serviceName: reqString(service, 'name'),
      serviceImageUrl: optString(service, 'image_url'),
      color: optString(service, 'color'),
      staff: optObject(json, 'staff', StaffMember.fromJson),
      start: reqDate(json, 'start'),
      end: reqDate(json, 'end'),
      localDate: reqString(json, 'local_date'),
      localTime: reqString(json, 'local_time'),
      capacity: intOr(json, 'capacity', 0),
      spotsLeft: intOr(json, 'spots_left', 0),
      booked: boolOr(json, 'booked', false),
      canCancel: boolOr(json, 'can_cancel', false),
    );
  }

  final int id;
  final ClassStatus status;
  final int serviceId;
  final String serviceName;
  final String? serviceImageUrl;
  final String? color;

  /// The coach.
  final StaffMember? staff;
  final DateTime start;
  final DateTime end;

  /// "yyyy-MM-dd" and "HH:mm" in the business's time zone.
  final String localDate;
  final String localTime;
  final int capacity;
  final int spotsLeft;

  /// Whether the signed-in member has a spot.
  final bool booked;
  final bool canCancel;

  bool get cancelled => status == ClassStatus.cancelled;
  bool get full => !booked && spotsLeft <= 0;
  int get durationMinutes => end.difference(start).inMinutes;
}

/// `GET /bookings/classes`.
class ClassList {
  const ClassList({required this.timezone, required this.items});

  factory ClassList.fromJson(Json json) => ClassList(
    timezone: optString(json, 'timezone') ?? 'UTC',
    items: listOf(json, 'items', ClassSession.fromJson),
  );

  final String timezone;
  final List<ClassSession> items;
}

enum MembershipPeriod { month, quarter, year, pack, unknown }

/// A plan on sale (`MembershipPlan`).
class MembershipPlan {
  const MembershipPlan({
    required this.id,
    required this.name,
    required this.price,
    required this.period,
    this.credits,
    this.description,
  });

  factory MembershipPlan.fromJson(Json json) => MembershipPlan(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    price: BookingPrice.fromJson(asJson(json['price'], 'price')),
    period: enumFrom(
      MembershipPeriod.values,
      json['period'],
      MembershipPeriod.unknown,
    ),
    credits: optInt(json, 'credits'),
    description: optString(json, 'description'),
  );

  final int id;
  final String name;
  final BookingPrice price;
  final MembershipPeriod period;

  /// Classes it includes; null for unlimited.
  final int? credits;
  final String? description;
}

enum MembershipStatus { active, expired, cancelled }

/// One of the member's memberships (`Membership`).
class Membership {
  const Membership({
    required this.id,
    required this.planId,
    required this.planName,
    required this.period,
    required this.status,
    required this.startsAt,
    this.endsAt,
    this.creditsLeft,
  });

  factory Membership.fromJson(Json json) {
    final plan = asJson(json['plan'], 'plan');
    return Membership(
      id: reqInt(json, 'id'),
      planId: reqInt(plan, 'id'),
      planName: reqString(plan, 'name'),
      period: enumFrom(
        MembershipPeriod.values,
        plan['period'],
        MembershipPeriod.unknown,
      ),
      status: enumFrom(
        MembershipStatus.values,
        json['status'],
        MembershipStatus.expired,
      ),
      startsAt: reqDate(json, 'starts_at'),
      endsAt: optDate(json, 'ends_at'),
      creditsLeft: optInt(json, 'credits_left'),
    );
  }

  final int id;
  final int planId;
  final String planName;
  final MembershipPeriod period;
  final MembershipStatus status;
  final DateTime startsAt;

  /// Null for a pack of classes.
  final DateTime? endsAt;

  /// Null for unlimited classes.
  final int? creditsLeft;

  bool get isActive => status == MembershipStatus.active;
}
