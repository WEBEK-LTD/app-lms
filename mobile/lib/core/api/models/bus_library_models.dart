import 'json.dart';
import 'school_models.dart';

/// 113.10 The school bus and 113.11 the library (docs/api/openapi.yaml, the
/// School tag): a family's view of their child's bus, the crew's trips, the
/// library's books, holds and loans.

enum BusTrip { morning, afternoon }

enum BusRunStatus { running, done }

enum BusMarkStatus { boarded, off, absent }

/// A stop on a trip, in the order the bus reaches it (`BusStop`).
class BusStop {
  const BusStop({
    required this.id,
    required this.name,
    required this.lat,
    required this.lng,
    this.time,
    this.passed = false,
  });

  factory BusStop.fromJson(Json json) => BusStop(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    lat: optDouble(json, 'lat') ?? 0,
    lng: optDouble(json, 'lng') ?? 0,
    time: optString(json, 'time'),
    passed: boolOr(json, 'passed', false),
  );

  final int id;
  final String name;
  final double lat;
  final double lng;

  /// HH:MM in the school's time zone.
  final String? time;

  /// The bus reached it on today's trip.
  final bool passed;
}

class BusPosition {
  const BusPosition({required this.lat, required this.lng, this.updatedAt});

  factory BusPosition.fromJson(Json json) => BusPosition(
    lat: optDouble(json, 'lat') ?? 0,
    lng: optDouble(json, 'lng') ?? 0,
    updatedAt: optDate(json, 'updated_at'),
  );

  final double lat;
  final double lng;
  final DateTime? updatedAt;
}

/// How the driver or the supervisor marked a student on a trip (`BusMark`).
class BusMark {
  const BusMark({this.status, this.boardedAt, this.offAt});

  factory BusMark.fromJson(Json json) => BusMark(
    status: json['status'] is String
        ? enumFrom(BusMarkStatus.values, json['status'], BusMarkStatus.absent)
        : null,
    boardedAt: optDate(json, 'boarded_at'),
    offAt: optDate(json, 'off_at'),
  );

  /// Null: not marked yet.
  final BusMarkStatus? status;
  final DateTime? boardedAt;
  final DateTime? offAt;
}

/// Today's trip as a family sees it.
class StudentBusRun {
  const StudentBusRun({
    required this.id,
    required this.status,
    this.startedAt,
    this.endedAt,
    this.bus,
    this.etaMinutes,
    this.distanceM,
    this.student = const BusMark(),
  });

  factory StudentBusRun.fromJson(Json json) => StudentBusRun(
    id: reqInt(json, 'id'),
    status: enumFrom(BusRunStatus.values, json['status'], BusRunStatus.done),
    startedAt: optDate(json, 'started_at'),
    endedAt: optDate(json, 'ended_at'),
    bus: optObject(json, 'bus', BusPosition.fromJson),
    etaMinutes: optInt(json, 'eta_minutes'),
    distanceM: optInt(json, 'distance_m'),
    student: optObject(json, 'student', BusMark.fromJson) ?? const BusMark(),
  );

  final int id;
  final BusRunStatus status;
  final DateTime? startedAt;
  final DateTime? endedAt;

  /// Where the bus is, while it runs and the position is recent.
  final BusPosition? bus;

  /// How soon the bus reaches the child's stop.
  final int? etaMinutes;
  final int? distanceM;
  final BusMark student;
}

/// One trip the student rides (`StudentBus.items`).
class StudentBusTrip {
  const StudentBusTrip({
    required this.trip,
    required this.routeName,
    required this.plate,
    required this.stop,
    this.stops = const [],
    this.run,
  });

  factory StudentBusTrip.fromJson(Json json) {
    final route = asJson(json['route'] ?? const <String, dynamic>{}, 'route');
    return StudentBusTrip(
      trip: enumFrom(BusTrip.values, json['trip'], BusTrip.morning),
      routeName: optString(route, 'name') ?? '',
      plate: optString(route, 'plate') ?? '',
      stop: BusStop.fromJson(asJson(json['stop'], 'stop')),
      stops: listOf(json, 'stops', BusStop.fromJson),
      run: optObject(json, 'run', StudentBusRun.fromJson),
    );
  }

  final BusTrip trip;
  final String routeName;
  final String plate;

  /// The student's stop.
  final BusStop stop;
  final List<BusStop> stops;

  /// Today's trip, once the driver started it.
  final StudentBusRun? run;
}

/// Today's trip of a route, counted (`BusRunSummary`).
class BusRunSummary {
  const BusRunSummary({
    required this.id,
    required this.trip,
    required this.status,
    this.riders = 0,
    this.boarded = 0,
    this.off = 0,
    this.absent = 0,
  });

  factory BusRunSummary.fromJson(Json json) => BusRunSummary(
    id: reqInt(json, 'id'),
    trip: enumFrom(BusTrip.values, json['trip'], BusTrip.morning),
    status: enumFrom(BusRunStatus.values, json['status'], BusRunStatus.done),
    riders: intOr(json, 'riders', 0),
    boarded: intOr(json, 'boarded', 0),
    off: intOr(json, 'off', 0),
    absent: intOr(json, 'absent', 0),
  );

  final int id;
  final BusTrip trip;
  final BusRunStatus status;
  final int riders;
  final int boarded;
  final int off;
  final int absent;
}

class BusCrewTrip {
  const BusCrewTrip({
    required this.trip,
    this.stops = 0,
    this.riders = 0,
    this.run,
  });

  factory BusCrewTrip.fromJson(Json json) => BusCrewTrip(
    trip: enumFrom(BusTrip.values, json['trip'], BusTrip.morning),
    stops: intOr(json, 'stops', 0),
    riders: intOr(json, 'riders', 0),
    run: optObject(json, 'run', BusRunSummary.fromJson),
  );

  final BusTrip trip;
  final int stops;
  final int riders;
  final BusRunSummary? run;
}

/// A route the person drives or supervises (`BusCrewRoute`).
class BusCrewRoute {
  const BusCrewRoute({
    required this.id,
    required this.name,
    required this.plate,
    this.capacity = 0,
    this.driver = false,
    this.drives = false,
    this.trips = const [],
  });

  factory BusCrewRoute.fromJson(Json json) => BusCrewRoute(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    plate: optString(json, 'plate') ?? '',
    capacity: intOr(json, 'capacity', 0),
    driver: json['role'] == 'driver',
    drives: boolOr(json, 'drives', false),
    trips: listOf(json, 'trips', BusCrewTrip.fromJson),
  );

  final int id;
  final String name;
  final String plate;
  final int capacity;

  /// The route's driver (else its supervisor).
  final bool driver;

  /// Starts the trips; their phone sends the bus's position.
  final bool drives;
  final List<BusCrewTrip> trips;
}

/// A student on the trip and how they were marked (`BusRider`).
class BusRider {
  const BusRider({required this.student, this.mark = const BusMark()});

  factory BusRider.fromJson(Json json) => BusRider(
    student: SchoolStudent.fromJson(asJson(json['student'], 'student')),
    mark: BusMark.fromJson(json),
  );

  final SchoolStudent student;
  final BusMark mark;
}

class BusRunStop {
  const BusRunStop({required this.stop, this.riders = const []});

  factory BusRunStop.fromJson(Json json) => BusRunStop(
    stop: BusStop.fromJson(json),
    riders: listOf(json, 'riders', BusRider.fromJson),
  );

  final BusStop stop;
  final List<BusRider> riders;
}

/// A trip as its crew sees it (`BusRun`).
class BusRun {
  const BusRun({
    required this.id,
    required this.routeName,
    required this.plate,
    required this.trip,
    required this.status,
    this.drives = false,
    this.bus,
    this.riders = 0,
    this.boarded = 0,
    this.off = 0,
    this.absent = 0,
    this.stops = const [],
  });

  factory BusRun.fromJson(Json json) {
    final route = asJson(json['route'] ?? const <String, dynamic>{}, 'route');
    final counts = asJson(
      json['counts'] ?? const <String, dynamic>{},
      'counts',
    );
    return BusRun(
      id: reqInt(json, 'id'),
      routeName: optString(route, 'name') ?? '',
      plate: optString(route, 'plate') ?? '',
      trip: enumFrom(BusTrip.values, json['trip'], BusTrip.morning),
      status: enumFrom(BusRunStatus.values, json['status'], BusRunStatus.done),
      drives: boolOr(json, 'drives', false),
      bus: optObject(json, 'bus', BusPosition.fromJson),
      riders: intOr(counts, 'riders', 0),
      boarded: intOr(counts, 'boarded', 0),
      off: intOr(counts, 'off', 0),
      absent: intOr(counts, 'absent', 0),
      stops: listOf(json, 'stops', BusRunStop.fromJson),
    );
  }

  final int id;
  final String routeName;
  final String plate;
  final BusTrip trip;
  final BusRunStatus status;
  final bool drives;
  final BusPosition? bus;
  final int riders;
  final int boarded;
  final int off;
  final int absent;
  final List<BusRunStop> stops;

  bool get running => status == BusRunStatus.running;
}

// 113.11 The library

enum LibraryHoldStatus { waiting, ready, collected, cancelled, expired }

class LibraryPerson {
  const LibraryPerson({required this.id, required this.name});

  factory LibraryPerson.fromJson(Json json) =>
      LibraryPerson(id: reqInt(json, 'id'), name: reqString(json, 'name'));

  final int id;
  final String name;
}

/// A book of the school's library (`LibraryBook`).
class LibraryBook {
  const LibraryBook({
    required this.id,
    required this.title,
    required this.author,
    this.coverUrl,
    this.isbn,
    this.shelf,
    this.category,
    this.language,
    this.copies = 0,
    this.available = 0,
    this.waiting = 0,
    this.ebook = false,
  });

  factory LibraryBook.fromJson(Json json) => LibraryBook(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    author: optString(json, 'author') ?? '',
    coverUrl: optString(json, 'cover_url'),
    isbn: optString(json, 'isbn'),
    shelf: optString(json, 'shelf'),
    category: optString(json, 'category'),
    language: optString(json, 'language'),
    copies: intOr(json, 'copies', 0),
    available: intOr(json, 'available', 0),
    waiting: intOr(json, 'waiting', 0),
    ebook: boolOr(json, 'ebook', false),
  );

  final int id;
  final String title;
  final String author;
  final String? coverUrl;
  final String? isbn;
  final String? shelf;
  final String? category;
  final String? language;
  final int copies;

  /// Copies on the shelf that aren't held for anyone.
  final int available;
  final int waiting;
  final bool ebook;
}

class LibraryBookPage {
  const LibraryBookPage({
    this.items = const [],
    this.categories = const [],
    this.page = 1,
    this.totalPages = 1,
  });

  factory LibraryBookPage.fromJson(Json json) => LibraryBookPage(
    items: listOf(json, 'items', LibraryBook.fromJson),
    categories: stringList(json, 'categories'),
    page: intOr(json, 'page', 1),
    totalPages: intOr(json, 'total_pages', 1),
  );

  final List<LibraryBook> items;
  final List<String> categories;
  final int page;
  final int totalPages;
}

/// A reserved book (`LibraryHold`).
class LibraryHold {
  const LibraryHold({
    required this.id,
    required this.book,
    required this.status,
    this.person,
    this.readyAt,
    this.expiresAt,
  });

  factory LibraryHold.fromJson(Json json) => LibraryHold(
    id: reqInt(json, 'id'),
    book: LibraryBook.fromJson(asJson(json['book'], 'book')),
    status: enumFrom(
      LibraryHoldStatus.values,
      json['status'],
      LibraryHoldStatus.waiting,
    ),
    person: optObject(json, 'person', LibraryPerson.fromJson),
    readyAt: optDate(json, 'ready_at'),
    expiresAt: optDate(json, 'expires_at'),
  );

  final int id;
  final LibraryBook book;
  final LibraryHoldStatus status;
  final LibraryPerson? person;
  final DateTime? readyAt;

  /// A ready hold is kept at the library until then.
  final DateTime? expiresAt;
}

/// A book, its e-book and the person's holds of it (`LibraryBookDetail`).
class LibraryBookDetail {
  const LibraryBookDetail({
    required this.book,
    this.description,
    this.file,
    this.holds = const [],
    this.borrowers = const [],
  });

  factory LibraryBookDetail.fromJson(Json json) => LibraryBookDetail(
    book: LibraryBook.fromJson(json),
    description: optString(json, 'description'),
    file: optObject(json, 'file', SchoolFile.fromJson),
    holds: listOf(json, 'holds', LibraryHold.fromJson),
    borrowers: listOf(json, 'borrowers', LibraryPerson.fromJson),
  );

  final LibraryBook book;
  final String? description;

  /// The e-book to read in the app.
  final SchoolFile? file;
  final List<LibraryHold> holds;

  /// Whom the person may reserve it for.
  final List<LibraryPerson> borrowers;
}

/// A copy lent at the desk (`LibraryLoan`).
class LibraryLoan {
  const LibraryLoan({
    required this.id,
    required this.dueOn,
    this.book,
    this.person,
    this.copyCode = '',
    this.lentAt,
    this.returnedAt,
    this.overdue = false,
  });

  factory LibraryLoan.fromJson(Json json) => LibraryLoan(
    id: reqInt(json, 'id'),
    dueOn: reqString(json, 'due_on'),
    book: optObject(json, 'book', LibraryBook.fromJson),
    person: optObject(json, 'person', LibraryPerson.fromJson),
    copyCode: optString(json, 'copy_code') ?? '',
    lentAt: optDate(json, 'lent_at'),
    returnedAt: optDate(json, 'returned_at'),
    overdue: boolOr(json, 'overdue', false),
  );

  final int id;
  final String dueOn;
  final LibraryBook? book;
  final LibraryPerson? person;
  final String copyCode;
  final DateTime? lentAt;
  final DateTime? returnedAt;
  final bool overdue;
}

/// Loans and holds of whoever the person follows (`LibraryLoans`).
class LibraryLoans {
  const LibraryLoans({
    this.people = const [],
    this.loanDays = 14,
    this.holdDays = 3,
    this.current = const [],
    this.history = const [],
    this.holds = const [],
  });

  factory LibraryLoans.fromJson(Json json) => LibraryLoans(
    people: listOf(json, 'people', LibraryPerson.fromJson),
    loanDays: intOr(json, 'loan_days', 14),
    holdDays: intOr(json, 'hold_days', 3),
    current: listOf(json, 'current', LibraryLoan.fromJson),
    history: listOf(json, 'history', LibraryLoan.fromJson),
    holds: listOf(json, 'holds', LibraryHold.fromJson),
  );

  final List<LibraryPerson> people;
  final int loanDays;
  final int holdDays;
  final List<LibraryLoan> current;
  final List<LibraryLoan> history;
  final List<LibraryHold> holds;
}
