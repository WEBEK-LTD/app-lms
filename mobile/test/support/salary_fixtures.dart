// 113.12 Contract-shaped payslips (docs/api/openapi.yaml, tag Staff).

Map<String, dynamic> _money(String amount, String formatted) => {
  'amount': amount,
  'amount_formatted': formatted,
};

Map<String, dynamic> payslipJson({
  int id = 42,
  String month = '2026-10',
  String status = 'part_paid',
}) => {
  'id': id,
  'number': 'PS-$month-$id',
  'month': month,
  'currency': 'EGP',
  'name': 'Mona Adel',
  'job_title': 'Math teacher',
  'department': 'Sciences',
  'base': _money('10500.00', 'E£10,500.00'),
  'allowances': [
    {'name': 'Transport', ..._money('600.00', 'E£600.00')},
  ],
  'bonuses': [
    {
      'kind': 'bonus',
      'source': 'office',
      'label': 'Exam supervision',
      'count': null,
      ..._money('400.00', 'E£400.00'),
    },
  ],
  'deductions': [
    {
      'kind': 'deduction',
      'source': 'absence',
      'label': 'Absences (2)',
      'count': 2,
      ..._money('1000.00', 'E£1,000.00'),
    },
    {
      'kind': 'advance',
      'source': 'advance',
      'label': 'Advance of 2026-10-05',
      'count': null,
      ..._money('1000.00', 'E£1,000.00'),
    },
  ],
  'gross': _money('11500.00', 'E£11,500.00'),
  'total_deductions': _money('2000.00', 'E£2,000.00'),
  'net': _money('9500.00', 'E£9,500.00'),
  'paid': _money('5000.00', 'E£5,000.00'),
  'left': _money('4500.00', 'E£4,500.00'),
  'status': status,
  'payments': [
    {
      'method': 'cash',
      'paid_on': '2026-10-30',
      'note': null,
      ..._money('5000.00', 'E£5,000.00'),
    },
  ],
  'attendance': {
    'working_days': 21,
    'present': 18,
    'late': 4,
    'left_early': 0,
    'absent': 2,
    'excused': 0,
    'leave': 1,
  },
  'note': null,
  'issued_at': '2026-10-31T10:00:00Z',
  'pdf_url':
      'https://yallapp.test/a/app/payslips/$id/pdf?lang=en&expires=1&sig=x',
};

Map<String, dynamic> salaryAdvanceJson() => {
  'id': 7,
  'given_on': '2026-10-05',
  'currency': 'EGP',
  'amount': _money('3000.00', 'E£3,000.00'),
  'instalment': _money('1000.00', 'E£1,000.00'),
  'starts_month': '2026-10',
  'taken_back': _money('1000.00', 'E£1,000.00'),
  'left': _money('2000.00', 'E£2,000.00'),
};
