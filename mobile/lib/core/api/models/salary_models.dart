import 'catalog_models.dart';
import 'json.dart';

/// 113.12 Payslips (tag Staff) in docs/api/openapi.yaml: a teacher's or staff
/// member's own payslips once the school made them final, and their advances
/// still being taken back. Salaries are recorded by hand: nothing here pays.

/// An amount as the API writes it.
class PayslipAmount {
  const PayslipAmount({required this.amount, required this.formatted});

  factory PayslipAmount.fromJson(Json json) => PayslipAmount(
    amount: reqString(json, 'amount'),
    formatted: reqString(json, 'amount_formatted'),
  );

  /// "8000.00".
  final String amount;

  /// "E£8,000.00".
  final String formatted;
}

PayslipAmount _amount(Json json, String key) =>
    PayslipAmount.fromJson(asJson(json[key], key));

enum PayslipLineKind { bonus, deduction, advance }

/// Where a line came from: the school's own, check-in's suggestions the
/// school accepted, or an advance's monthly part.
enum PayslipLineSource { office, absence, lateness, advance }

enum PayslipStatus { unpaid, partPaid, paid }

enum PayMethod { cash, bank }

/// An allowance on a payslip ("Transport").
class PayslipAllowance {
  const PayslipAllowance({required this.name, required this.amount});

  factory PayslipAllowance.fromJson(Json json) => PayslipAllowance(
    name: reqString(json, 'name'),
    amount: PayslipAmount.fromJson(json),
  );

  final String name;
  final PayslipAmount amount;
}

/// A bonus, a deduction or an advance taken back.
class PayslipLine {
  const PayslipLine({
    required this.kind,
    required this.source,
    required this.label,
    this.count,
    required this.amount,
  });

  factory PayslipLine.fromJson(Json json) => PayslipLine(
    kind: enumFrom(
      PayslipLineKind.values,
      json['kind'],
      PayslipLineKind.deduction,
    ),
    source: enumFrom(
      PayslipLineSource.values,
      json['source'],
      PayslipLineSource.office,
    ),
    label: optString(json, 'label') ?? '',
    count: optInt(json, 'count'),
    amount: PayslipAmount.fromJson(json),
  );

  final PayslipLineKind kind;
  final PayslipLineSource source;
  final String label;

  /// The absences or late days a suggestion counted.
  final int? count;
  final PayslipAmount amount;
}

/// A payment the school wrote down as paid out.
class PayslipPayment {
  const PayslipPayment({
    required this.method,
    required this.paidOn,
    this.note,
    required this.amount,
  });

  factory PayslipPayment.fromJson(Json json) => PayslipPayment(
    method: enumFrom(PayMethod.values, json['method'], PayMethod.cash),
    paidOn: reqString(json, 'paid_on'),
    note: optString(json, 'note'),
    amount: PayslipAmount.fromJson(json),
  );

  final PayMethod method;
  final String paidOn;
  final String? note;
  final PayslipAmount amount;
}

/// The month's days at the gate when the payslip was made.
class PayslipDays {
  const PayslipDays({
    required this.workingDays,
    required this.present,
    required this.late,
    required this.leftEarly,
    required this.absent,
    required this.excused,
    required this.leave,
  });

  factory PayslipDays.fromJson(Json json) => PayslipDays(
    workingDays: intOr(json, 'working_days', 0),
    present: intOr(json, 'present', 0),
    late: intOr(json, 'late', 0),
    leftEarly: intOr(json, 'left_early', 0),
    absent: intOr(json, 'absent', 0),
    excused: intOr(json, 'excused', 0),
    leave: intOr(json, 'leave', 0),
  );

  final int workingDays;
  final int present;
  final int late;
  final int leftEarly;
  final int absent;
  final int excused;
  final int leave;
}

/// A month's payslip.
class Payslip {
  const Payslip({
    required this.id,
    required this.number,
    required this.month,
    required this.currency,
    required this.name,
    this.jobTitle,
    this.department,
    required this.base,
    this.allowances = const [],
    this.bonuses = const [],
    this.deductions = const [],
    required this.gross,
    required this.totalDeductions,
    required this.net,
    required this.paid,
    required this.left,
    this.status = PayslipStatus.unpaid,
    this.payments = const [],
    this.days,
    this.note,
    required this.issuedAt,
    required this.pdfUrl,
  });

  factory Payslip.fromJson(Json json) => Payslip(
    id: reqInt(json, 'id'),
    number: reqString(json, 'number'),
    month: reqString(json, 'month'),
    currency: reqString(json, 'currency'),
    name: reqString(json, 'name'),
    jobTitle: optString(json, 'job_title'),
    department: optString(json, 'department'),
    base: _amount(json, 'base'),
    allowances: listOf(json, 'allowances', PayslipAllowance.fromJson),
    bonuses: listOf(json, 'bonuses', PayslipLine.fromJson),
    deductions: listOf(json, 'deductions', PayslipLine.fromJson),
    gross: _amount(json, 'gross'),
    totalDeductions: _amount(json, 'total_deductions'),
    net: _amount(json, 'net'),
    paid: _amount(json, 'paid'),
    left: _amount(json, 'left'),
    status: enumFromSnake(
      PayslipStatus.values,
      json['status'],
      PayslipStatus.unpaid,
    ),
    payments: listOf(json, 'payments', PayslipPayment.fromJson),
    days: optObject(json, 'attendance', PayslipDays.fromJson),
    note: optString(json, 'note'),
    issuedAt: reqDate(json, 'issued_at'),
    pdfUrl: reqString(json, 'pdf_url'),
  );

  final int id;

  /// "PS-2026-11-42".
  final String number;

  /// "2026-11".
  final String month;
  final String currency;
  final String name;
  final String? jobTitle;
  final String? department;
  final PayslipAmount base;
  final List<PayslipAllowance> allowances;
  final List<PayslipLine> bonuses;

  /// Deductions and advances' instalments taken back.
  final List<PayslipLine> deductions;
  final PayslipAmount gross;
  final PayslipAmount totalDeductions;
  final PayslipAmount net;
  final PayslipAmount paid;
  final PayslipAmount left;
  final PayslipStatus status;
  final List<PayslipPayment> payments;
  final PayslipDays? days;
  final String? note;
  final DateTime issuedAt;

  /// The PDF, from a signed link good for 15 minutes.
  final String pdfUrl;
}

/// An advance still being taken back from the payslips.
class SalaryAdvance {
  const SalaryAdvance({
    required this.id,
    required this.givenOn,
    required this.amount,
    required this.instalment,
    required this.startsMonth,
    required this.takenBack,
    required this.left,
  });

  factory SalaryAdvance.fromJson(Json json) => SalaryAdvance(
    id: reqInt(json, 'id'),
    givenOn: reqString(json, 'given_on'),
    amount: _amount(json, 'amount'),
    instalment: _amount(json, 'instalment'),
    startsMonth: reqString(json, 'starts_month'),
    takenBack: _amount(json, 'taken_back'),
    left: _amount(json, 'left'),
  );

  final int id;
  final String givenOn;
  final PayslipAmount amount;
  final PayslipAmount instalment;
  final String startsMonth;
  final PayslipAmount takenBack;
  final PayslipAmount left;
}

/// `GET /staff/payslips`: a page of payslips and the advances.
class PayslipPage {
  const PayslipPage({required this.page, this.advances = const []});

  factory PayslipPage.fromJson(Json json) => PayslipPage(
    page: Paged.fromJson(json, Payslip.fromJson),
    advances: listOf(json, 'advances', SalaryAdvance.fromJson),
  );

  final Paged<Payslip> page;
  final List<SalaryAdvance> advances;
}
