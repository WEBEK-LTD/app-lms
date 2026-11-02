import 'fixtures.dart';

/// 113.4 The parent's area as the hosted API answers it (the Parent tag).

Map<String, dynamic> parentMeJson({bool messages = true}) => {
  'name': 'Hassan Ali',
  'children': [
    {...schoolStudentJson(), 'slips_waiting': 1},
    {
      ...schoolStudentJson(
        id: 12,
        name: 'Laila Hassan',
        className: 'Grade 3 B',
      ),
      'slips_waiting': 0,
    },
  ],
  'messages': messages,
  'slips_waiting': 1,
};

Map<String, dynamic> childDayJson({
  int id = 11,
  String name = 'Omar Hassan',
  String className = 'Grade 5 A',
}) => {
  'date': '2026-11-02',
  'student': schoolStudentJson(id: id, name: name, className: className),
  'day_off': null,
  'checkin': {
    'date': '2026-11-02',
    'state': 'in',
    'in_at': '2026-11-02T05:52:00Z',
    'in_time': '07:52',
    'in_method': 'qr',
    'out_at': null,
    'out_time': null,
    'out_method': null,
    'late': false,
    'left_early': false,
    'corrections': [],
  },
  'lessons': [
    {
      'id': 1,
      'starts': '08:00',
      'ends': '08:45',
      'subject': 'Mathematics',
      'class_id': 3,
      'class_name': 'Grade 5 A',
      'teacher_name': 'Sara Adel',
      'room': '12',
    },
  ],
  'homework': {
    'due_count': 1,
    'items': [
      {...schoolHomeworkJson(), 'due_on': '2026-11-04'},
    ],
  },
  'grades': [
    {
      'assessment_id': 31,
      'subject': 'Mathematics',
      'title': 'Quiz 1',
      'kind': 'quiz',
      'date': '2026-10-28',
      'score': 8.5,
      'max_score': 10,
    },
  ],
  'behaviour': {
    'points': 3,
    'positive_count': 1,
    'negative_count': 0,
    'latest': null,
  },
  'bus': [],
  'loans': [
    {
      'id': 5,
      'title': 'The Little Prince',
      'due_on': '2026-11-09',
      'overdue': false,
    },
  ],
  'reports': {'count': 1, 'latest_at': '2026-10-30T09:00:00Z'},
  'fees': {'currency': 'EGP', 'due_count': 1, 'due_formatted': 'E£4,500.00'},
  'slips_waiting': 1,
  'excuse': null,
  'pickup': {
    'people': 2,
    'today': {
      'date': '2026-11-02',
      'name': 'Karim Ali',
      'relation': 'Uncle',
      'phone': null,
      'note': null,
      'written_by': 'Hassan Ali',
      'created_at': '2026-11-02T05:00:00Z',
    },
  },
  'events': [],
  'exams': [],
};

Map<String, dynamic> permissionSlipJson({
  int id = 61,
  String? answer,
  bool open = true,
}) => {
  'id': id,
  'title': 'Science museum trip',
  'details': 'Bring a packed lunch.',
  'due_on': '2026-11-05',
  'fee_note': 'E£150, paid at the office',
  'for_name': 'Grade 5 A',
  'open': open,
  'created_at': '2026-11-01T09:00:00Z',
  'children': [
    {
      'student_id': 11,
      'student_name': 'Omar Hassan',
      'answer': answer,
      'signed_name': answer == null ? null : 'Hassan Ali',
      'answered_at': answer == null ? null : '2026-11-02T06:00:00Z',
    },
  ],
};

Map<String, dynamic> absenceExcuseJson({
  int id = 81,
  String status = 'pending',
  String? answer,
}) => {
  'id': id,
  'student_id': 11,
  'starts_on': '2026-11-01',
  'ends_on': '2026-11-02',
  'days': 2,
  'reason': 'A fever',
  'file': null,
  'status': status,
  'answer': answer,
  'answered_at': answer == null ? null : '2026-11-02T08:00:00Z',
  'created_at': '2026-11-02T06:00:00Z',
};

Map<String, dynamic> childPickupJson({
  List<Map<String, dynamic>>? people,
  List<Map<String, dynamic>> notes = const [],
}) => {
  'student': schoolStudentJson(),
  'people':
      people ??
      [
        {
          'name': 'Mona Ali',
          'relation': 'Grandmother',
          'phone': '+20 100 555 1212',
          'photo': null,
          'photo_id': null,
        },
      ],
  'updated_at': '2026-11-01T09:00:00Z',
  'today': notes.isEmpty ? null : notes.first,
  'notes': notes,
};
