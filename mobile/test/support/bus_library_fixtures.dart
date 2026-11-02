import 'fixtures.dart';

/// 113.10 and 113.11 Contract-shaped fixtures for the school bus and the
/// library.

Map<String, dynamic> busStopJson({
  int id = 1,
  String name = 'Nile Street',
  double lat = 30.06,
  String? time = '07:10',
  bool passed = false,
}) => {
  'id': id,
  'name': name,
  'lat': lat,
  'lng': 31.24,
  'time': time,
  'passed': passed,
};

Map<String, dynamic> studentBusJson({bool running = true}) => {
  'items': [
    {
      'trip': 'morning',
      'route': {'id': 5, 'name': 'Route 1', 'plate': 'ABC 123'},
      'stop': busStopJson(id: 2, name: 'Garden Square', lat: 30.05),
      'stops': [
        busStopJson(passed: running),
        busStopJson(id: 2, name: 'Garden Square', lat: 30.05),
      ],
      'run': running
          ? {
              'id': 70,
              'status': 'running',
              'started_at': '2026-11-02T05:00:00Z',
              'ended_at': null,
              'bus': {
                'lat': 30.058,
                'lng': 31.24,
                'updated_at': '2026-11-02T05:20:00Z',
              },
              'eta_minutes': 4,
              'distance_m': 1200,
              'student': {'status': null, 'boarded_at': null, 'off_at': null},
            }
          : null,
    },
  ],
};

Map<String, dynamic> busCrewRouteJson({
  bool drives = true,
  bool started = false,
}) => {
  'id': 5,
  'name': 'Route 1',
  'plate': 'ABC 123',
  'capacity': 30,
  'role': drives ? 'driver' : 'supervisor',
  'drives': drives,
  'trips': [
    {
      'trip': 'morning',
      'stops': 2,
      'riders': 2,
      'run': started
          ? {
              'id': 70,
              'trip': 'morning',
              'date': '2026-11-02',
              'status': 'running',
              'started_at': '2026-11-02T05:00:00Z',
              'ended_at': null,
              'riders': 2,
              'boarded': 0,
              'off': 0,
              'absent': 0,
            }
          : null,
    },
    {'trip': 'afternoon', 'stops': 2, 'riders': 1, 'run': null},
  ],
};

Map<String, dynamic> busRiderJson({
  int id = 11,
  String name = 'Omar Hassan',
  String? status,
}) => {
  'student': schoolStudentJson(id: id, name: name),
  'status': status,
  'boarded_at': status == null ? null : '2026-11-02T05:10:00Z',
  'off_at': status == 'off' ? '2026-11-02T05:40:00Z' : null,
};

Map<String, dynamic> busRunJson({
  String status = 'running',
  bool drives = true,
  String? omar,
}) => {
  'id': 70,
  'route': {'id': 5, 'name': 'Route 1', 'plate': 'ABC 123', 'capacity': 30},
  'trip': 'morning',
  'date': '2026-11-02',
  'status': status,
  'started_at': '2026-11-02T05:00:00Z',
  'ended_at': status == 'done' ? '2026-11-02T06:00:00Z' : null,
  'role': drives ? 'driver' : 'supervisor',
  'drives': drives,
  'bus': null,
  'counts': {
    'riders': 2,
    'boarded': omar == 'boarded' ? 1 : 0,
    'off': 0,
    'absent': 0,
  },
  'stops': [
    {
      ...busStopJson(),
      'riders': [busRiderJson(status: omar)],
    },
    {
      ...busStopJson(id: 2, name: 'Garden Square', lat: 30.05),
      'riders': [busRiderJson(id: 12, name: 'Laila Hassan')],
    },
  ],
};

Map<String, dynamic> libraryBookJson({
  int id = 40,
  String title = 'The Little Prince',
  int available = 1,
  bool ebook = true,
}) => {
  'id': id,
  'title': title,
  'author': 'Antoine de Saint-Exupéry',
  'cover_url': null,
  'isbn': '9780156012195',
  'shelf': 'A3',
  'category': 'Stories',
  'language': 'English',
  'copies': 2,
  'available': available,
  'waiting': 0,
  'ebook': ebook,
};

Map<String, dynamic> libraryBookPageJson() => {
  'page': 1,
  'per_page': 20,
  'total': 2,
  'total_pages': 1,
  'items': [
    libraryBookJson(),
    libraryBookJson(
      id: 41,
      title: 'Atlas of Egypt',
      available: 0,
      ebook: false,
    ),
  ],
  'categories': ['Geography', 'Stories'],
};

Map<String, dynamic> libraryHoldJson({String status = 'ready'}) => {
  'id': 90,
  'book': libraryBookJson(),
  'person': {'id': 11, 'name': 'Omar Hassan'},
  'status': status,
  'created_at': '2026-11-01T08:00:00Z',
  'ready_at': status == 'ready' ? '2026-11-01T08:00:00Z' : null,
  'expires_at': status == 'ready' ? '2026-11-04T08:00:00Z' : null,
};

Map<String, dynamic> libraryBookDetailJson({
  List<Map<String, dynamic>> holds = const [],
}) => {
  ...libraryBookJson(),
  'description': 'A pilot meets a little prince in the desert.',
  'file': {
    'name': 'The Little Prince.pdf',
    'url': 'https://media.test/lp.pdf',
    'kind': 'pdf',
  },
  'holds': holds,
  'borrowers': [
    {'id': 11, 'name': 'Omar Hassan'},
    {'id': 12, 'name': 'Laila Hassan'},
  ],
};

Map<String, dynamic> libraryLoansJson() => {
  'people': [
    {'id': 11, 'name': 'Omar Hassan'},
    {'id': 12, 'name': 'Laila Hassan'},
  ],
  'loan_days': 14,
  'hold_days': 3,
  'current': [
    {
      'id': 80,
      'book': libraryBookJson(id: 41, title: 'Atlas of Egypt'),
      'person': {'id': 12, 'name': 'Laila Hassan'},
      'copy_code': 'AT-1',
      'lent_at': '2026-10-20T08:00:00Z',
      'due_on': '2026-10-30',
      'returned_at': null,
      'overdue': true,
    },
  ],
  'history': [],
  'holds': [libraryHoldJson()],
};
