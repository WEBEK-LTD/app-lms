import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/http_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/theme/theme.dart';

import 'api_client_test.dart' show FakeAdapter, json;

Map<String, Object?> money(int cents) => {
  'amount_cents': cents,
  'currency': 'TRY',
  'formatted': '₺${(cents / 100).toStringAsFixed(2)}',
};

double contrast(Color a, Color b) {
  double luminance(Color c) {
    double channel(double v) =>
        v <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4).toDouble();
    return 0.2126 * channel(c.r) +
        0.7152 * channel(c.g) +
        0.0722 * channel(c.b);
  }

  final x = luminance(a);
  final y = luminance(b);
  return (max(x, y) + 0.05) / (min(x, y) + 0.05);
}

/// 125 The models read the JSON of the 1.0.2 spec (docs/api/owner.yaml).
void main() {
  test('AppFeatures: the Studio, Prime and VIP flags; missing is false', () {
    final f = AppFeatures.fromJson({
      'food_orders': true,
      'restaurants': true,
      'shipments': true,
      'rides': false,
      'market': false,
      'school': false,
      'prime': true,
      'vip': true,
      'orders': false,
    });
    expect(f.foodOrders && f.restaurants && f.shipments, isTrue);
    expect(f.prime && f.vip, isTrue);
    expect(f.orders || f.rides || f.market || f.school, isFalse);
    final old = AppFeatures.fromJson({'orders': true});
    expect(old.foodOrders || old.prime || old.vip, isFalse);
  });

  test('FoodOrder and FoodOrderDetail', () {
    final json = {
      'id': 48,
      'reference': 'F-1048',
      'status': 'placed',
      'status_label': 'New',
      'restaurant': {'id': 3, 'name': 'Burger Lab'},
      'customer_name': 'Selin Aydın',
      'summary': '2 × Smash burger, 1 × Fries',
      'item_count': 3,
      'total': money(41200),
      'payment': {'method': 'cash', 'paid': false, 'label': 'Cash on delivery'},
      'distance_km': 3.1,
      'placed_at': '2026-11-13T17:12:00Z',
      'ready_at': null,
      'courier': null,
      'shipment_id': null,
      'steps': ['accept', 'reject'],
      'lines': [
        {
          'quantity': 2,
          'name': 'Smash burger',
          'options': ['No onions'],
          'total': money(28000),
        },
      ],
      'subtotal': money(37200),
      'delivery_fee': money(4000),
      'customer': {
        'name': 'Selin Aydın',
        'phone': null,
        'address': 'Moda Cd. 41',
        'note': 'Ring twice',
      },
      'restaurant_address': 'Bağdat Cd. 214',
      'timeline': [
        {
          'status': 'placed',
          'label': 'Placed',
          'at': '2026-11-13T17:12:00Z',
          'by': 'Selin Aydın',
        },
      ],
      'refund_due': false,
      'prep_choices': [10, 15, 20, 30, 45],
      'rejection_reasons': [
        {'id': 'busy', 'label': 'Too busy'},
      ],
      'cash_to_collect': money(41200),
    };
    final d = FoodOrderDetail.fromJson(json);
    expect(d.order.id, '48');
    expect(d.order.reference, 'F-1048');
    expect(d.order.restaurant.name, 'Burger Lab');
    expect(d.order.payment.cash, isTrue);
    expect(d.order.distanceKm, 3.1);
    expect(d.order.canAccept, isTrue);
    expect(d.lines.single.options, ['No onions']);
    expect(d.deliveryFee.amountCents, 4000);
    expect(d.customer.note, 'Ring twice');
    expect(d.prepChoices, [10, 15, 20, 30, 45]);
    expect(d.rejectionReasons.single.id, 'busy');
    expect(d.cashToCollect!.formatted, '₺412.00');
    expect(d.timeline.single.by, 'Selin Aydın');
  });

  test('a page with its counts', () {
    final page = Paged.fromJson({
      'items': <Object>[],
      'page': 1,
      'per_page': 20,
      'total': 0,
      'total_pages': 1,
      'counts': {'new': 2, 'active': 4},
    }, FoodOrder.fromJson);
    expect(page.count('new'), 2);
    expect(page.count('waiting'), 0);
  });

  test('Restaurant, Shipment, Courier', () {
    final r = Restaurant.fromJson({
      'id': 3,
      'name': 'Burger Lab',
      'active': true,
      'open': true,
      'busy_until': '2026-11-13T17:30:00Z',
      'delayed': true,
      'opens_at': null,
      'state_label': 'Busy',
    });
    expect(r.busyUntil, isNotNull);
    expect(r.delayed, isTrue);
    final s = ShipmentDetail.fromJson({
      'id': 2031,
      'reference': 'S-2031',
      'status': 'pending',
      'status_label': 'Waiting',
      'pickup': {'name': 'Burger Lab', 'address': 'Bağdat Cd. 214'},
      'dropoff': {'name': 'Selin', 'address': 'Moda Cd. 41'},
      'distance_km': 3.1,
      'price': money(6000),
      'payment': {'method': 'cash', 'label': 'Cash at the door'},
      'collect': money(41200),
      'courier': null,
      'food_order': {'id': 48, 'reference': 'F-1048'},
      'created_at': '2026-11-13T17:12:00Z',
      'waiting_minutes': 6,
      'statuses': ['cancelled'],
      'assignable': true,
      'timeline': <Object>[],
      'note': null,
      'recipient': {'name': 'Selin Aydın', 'phone': '+90 532'},
    });
    expect(s.shipment.needsCourier, isTrue);
    expect(s.shipment.foodOrder!.reference, 'F-1048');
    expect(s.shipment.collect!.amountCents, 41200);
    expect(s.recipientPhone, '+90 532');
    final c = Courier.fromJson({
      'id': 7,
      'name': 'Mehmet Kaya',
      'initials': 'MK',
      'phone': null,
      'active': true,
      'on_duty': true,
      'active_jobs': 0,
      'distance_km': 0.6,
      'state': 'free',
    });
    expect(c.id, '7');
    expect(wireId(c.id), 7);
    expect(wireId('c1'), 'c1');
  });

  test('Ride and Driver', () {
    final r = Ride.fromJson({
      'id': 551,
      'reference': 'R-551',
      'status': 'searching',
      'status_label': 'Searching',
      'vehicle_type': 'Economy',
      'pickup': {'name': 'Kadıköy İskele', 'address': 'Kadıköy'},
      'dropoff': {'name': 'Brandium', 'address': 'Ataşehir'},
      'distance_km': 8.4,
      'quoted': money(24500),
      'final': null,
      'rider_name': 'Deniz Çelik',
      'payment_label': 'cash',
      'driver': {
        'id': 1,
        'name': 'Ali Yılmaz',
        'phone': null,
        'plate': '34 ABC 128',
        'vehicle': 'Toyota Corolla',
      },
      'searching_minutes': 3,
      'scheduled_for': null,
      'eta': null,
      'givable': true,
      'cancellable': true,
      'updated_at': '2026-11-13T17:12:00Z',
    });
    expect(r.searchingMinutes, 3);
    expect(r.driver!.plate, '34 ABC 128');
    expect(r.finalPrice, isNull);
    final d = Driver.fromJson({
      'id': 2,
      'name': 'Selim Kurt',
      'initials': 'SK',
      'phone': null,
      'vehicle': {
        'plate': '34 TT 455',
        'model': 'Fiat Egea',
        'type': 'Economy',
      },
      'state': 'free',
      'distance_km': 1.2,
      'same_type': true,
    });
    expect(d.model, 'Fiat Egea');
    expect(d.sameType, isTrue);
  });

  test('marketplace: order, complaint with its messages and decisions', () {
    final c = ComplaintDetail.fromJson({
      'id': 9,
      'status': 'open',
      'status_label': 'Open',
      'waiting_for': 'you',
      'subject': 'Missing item',
      'order': {'id': 39, 'reference': 'M-1039', 'total': money(72000)},
      'vendor': {'id': 1, 'name': 'Fresh Mart'},
      'customer_name': 'Zeynep Koç',
      'excerpt': 'No olive oil.',
      'created_at': '2026-11-13T17:00:00Z',
      'updated_at': '2026-11-13T17:00:00Z',
      'refund_suggested': money(18500),
      'messages': [
        {
          'from': 'customer',
          'name': 'Zeynep',
          'text': 'No olive oil.',
          'at': '2026-11-13T17:00:00Z',
        },
      ],
      'decisions': [
        {
          'decision': 'partial_refund',
          'label': 'Refund part',
          'amount': 'required',
          'max': money(72000),
          'to': ['payment', 'wallet'],
        },
        {
          'decision': 'no_refund',
          'label': 'No refund',
          'amount': 'none',
          'max': null,
          'to': <String>[],
        },
      ],
      'decision': null,
    });
    expect(c.complaint.waitingFor, 'you');
    expect(c.complaint.orderReference, 'M-1039');
    expect(c.complaint.refundSuggested!.amountCents, 18500);
    expect(c.messages.single.from, 'customer');
    expect(c.decisions.first.id, 'partial_refund');
    expect(c.decisions.first.needsAmount, isTrue);
    expect(c.decisions.first.max!.amountCents, 72000);
    expect(c.decisions.first.to, ['payment', 'wallet']);
    expect(c.decisions.last.needsNote, isTrue);
    expect(c.decidedLabel, isNull);
    final decided = ComplaintDetail.fromJson({
      'id': 9,
      'waiting_for': null,
      'decisions': <Object>[],
      'decision': {
        'decision': 'refund',
        'label': 'Refunded ₺185.00',
        'amount': money(18500),
        'to': 'payment',
        'at': '2026-11-13T17:00:00Z',
      },
    });
    expect(decided.decidedLabel, 'Refunded ₺185.00');
    final o = MarketOrder.fromJson({
      'id': 42,
      'reference': 'M-1042',
      'status': 'placed',
      'status_label': 'New',
      'vendor': {'id': 1, 'name': 'Fresh Mart', 'kind': 'grocery'},
      'customer_name': 'Zeynep Koç',
      'summary': '1 × Olive oil',
      'total': money(31000),
      'fulfilment': 'delivery',
      'delivery_by': 'vendor',
      'placed_at': '2026-11-13T17:00:00Z',
    });
    expect(o.vendor.kind, 'grocery');
  });

  test('school: today, an excuse, a report, leave', () {
    final t = SchoolToday.fromJson({
      'date': '2026-11-13',
      'closes_at': '08:30',
      'students': {
        'total': 466,
        'in': 412,
        'late': 18,
        'not_yet': 23,
        'absent': 9,
        'excused': 4,
      },
      'teachers': {'in': 38, 'total': 40},
      'staff': {'in': 11, 'total': 12},
      'needs': {'excuses': 3, 'reports': 2, 'leave': 1},
      'buses': {
        'running': 3,
        'late': [
          {'route': 'Route 2', 'minutes': 6},
        ],
      },
      'pickups_today': 5,
      'slips': [
        {'id': 1, 'title': 'Museum trip', 'yes': 120, 'no': 8, 'waiting': 32},
      ],
      'fees': {'due': money(8450000), 'count': 61},
    });
    expect(t.students.inside, 412);
    expect(t.students.notYet, 23);
    expect(t.teachers.total, 40);
    expect(t.needs.leave, 1);
    expect(t.busesLate.single.minutes, 6);
    expect(t.slips.single.waiting, 32);
    expect(t.feesCount, 61);
    final e = Excuse.fromJson({
      'id': 1,
      'student': {'id': 2, 'name': 'Omar Hassan', 'class_label': 'Grade 5 · B'},
      'from': '2026-11-12',
      'to': '2026-11-13',
      'reason_label': 'Illness',
      'text': 'Fever.',
      'attachment': {'name': 'note.pdf', 'size': null, 'url': 'https://x/y'},
      'sent_by': {'name': null, 'relation': null},
      'answer': null,
      'sent_at': '2026-11-12T18:40:00Z',
      'status': 'pending',
      'status_label': 'Waiting',
    });
    expect(e.attachment!.size, isNull);
    expect(e.sentByName, isNull);
    expect(e.sentByRelation, isNull);
    final leave = LeaveRequest.fromJson({
      'id': 4,
      'person': {'id': 2, 'name': 'Selin Arı', 'role': 'teacher'},
      'kind': 'annual',
      'kind_label': 'Annual leave',
      'from': '2026-11-18',
      'to': '2026-11-19',
      'days': 2,
      'note': 'A wedding.',
      'attachment': null,
      'status': 'pending',
      'status_label': 'Waiting',
      'answer': null,
      'sent_at': '2026-11-13T09:00:00Z',
    });
    expect(leave.roleLabel, 'teacher');
    expect(leave.reasonLabel, 'Annual leave');
    expect(leave.text, 'A wedding.');
    expect(leave.days, 2);
    final r = SchoolReport.fromJson({
      'id': 1,
      'teacher': {'id': 1, 'name': 'Aylin Demir'},
      'about_label': 'Grade 5 · B',
      'kind': 'class',
      'status': 'sent',
      'status_label': 'To read',
      'unread': true,
      'sent_at': '2026-11-13T09:00:00Z',
      'fields': [
        {'label': 'Attendance', 'value': 'Good'},
      ],
    });
    expect(r.fields.single.value, 'Good');
    expect(r.unread, isTrue);
    expect(r.reviewable, isTrue);
    final detail = SchoolReport.fromJson({
      'id': 1,
      'title': 'Week report',
      'teacher': {'id': null, 'name': 'Aylin Demir'},
      'about_label': '5A',
      'kind': 'class',
      'status': 'approved',
      'status_label': 'Approved',
      'unread': false,
      'sent_at': null,
      'fields': [
        {'label': 'Rating', 'value': '4/5'},
      ],
      'comments': [
        {
          'by': 'school',
          'name': 'Layla',
          'text': 'Thanks.',
          'at': '2026-11-13T10:00:00Z',
        },
      ],
      'period': null,
      'reviewable': false,
    });
    expect(detail.title, 'Week report');
    expect(detail.sentAt, isNull);
    expect(detail.comments.single.by, 'school');
    expect(detail.reviewable, isFalse);
  });

  test('Today: the comparison and the morning brief', () {
    final t = Today.fromJson({
      'date': '2026-11-13',
      'time_zone': 'Europe/Istanbul',
      'sales': [money(1842000)],
      'donations': <Object>[],
      'counts': {'orders': 142},
      'needs_you': [
        {'kind': 'food_orders_new', 'count': 2, 'title': '2 new food orders'},
      ],
      'compare': {
        'sales_change_pct': 12,
        'orders_change_pct': -4.2,
        'label': 'vs last Friday',
      },
    });
    expect(t.compare!.salesChangePct, 12);
    expect(t.compare!.ordersChangePct, -4.2);
    expect(t.compare!.label, 'vs last Friday');
    expect(t.needsYou.single.kind, 'food_orders_new');
    expect(t.morningBrief, isNull);
  });

  test('Prime insights; nulls stay null', () {
    final i = PrimeInsights.fromJson({
      'period': 'week',
      'range_label': '9–15 Nov',
      'sales': {
        'now': money(11284000),
        'before': money(10352000),
        'change_pct': 9,
      },
      'orders': {'now': 870, 'before': 800, 'change_pct': null},
      'days': [
        {'label': 'Mon', 'now_cents': 100, 'before_cents': 90},
      ],
      'peak': {
        'hours': [10, 12, 14, 16, 18, 20],
        'rows': [
          {
            'day_label': 'Fri',
            'cells': [0.2, 0.5, 0.3, 0.3, 0.75, 1],
          },
        ],
        'busiest_label': 'Friday 20:00–22:00',
      },
      'returning': {'pct': null, 'change_pts': null},
      'average_order': {'now': money(12970), 'before': null},
      'best': [
        {'name': 'Burger Lab', 'total': money(2431000)},
      ],
    });
    expect(i.salesChangePct, 9);
    expect(i.ordersChangePct, isNull);
    expect(i.peakHours.length, 6);
    expect(i.peakRows.single.cells.last, 1);
    expect(i.returningPct, isNull);
    expect(i.averageBefore, isNull);
    expect(i.best.single.name, 'Burger Lab');
  });

  test('Prime alerts read and write the same shape', () {
    final source = {
      'items': [
        {
          'kind': 'order_waiting',
          'on': true,
          'minutes': 5,
          'amount_cents': null,
          'by_time': null,
          'stars': null,
        },
        {
          'kind': 'sales_low',
          'on': false,
          'minutes': null,
          'amount_cents': 800000,
          'by_time': '18:00',
          'stars': null,
        },
      ],
      'morning_brief': {'on': true, 'time': '08:30'},
    };
    final a = PrimeAlerts.fromJson(source);
    expect(a.onCount, 1);
    expect(a.items.last.byTime, '18:00');
    expect(a.toJson(), source);
  });

  test('Me: the account manager; call slots and a booked call', () {
    final me = Me.fromJson({
      'user': {'id': 'u', 'name': 'Layla', 'email': 'a@b.c'},
      'account': {'state': 'active'},
      'apps': <Object>[],
      'account_manager': {
        'name': 'Deniz Aksoy',
        'photo_url': null,
        'whatsapp_url': 'https://wa.me/90',
        'phone': '+90',
        'hours_label': '09:00–21:00',
      },
    });
    expect(me.accountManager!.name, 'Deniz Aksoy');
    expect(me.copyWith().accountManager, isNotNull);
    final none = Me.fromJson({
      'user': {'id': 'u', 'name': 'Layla', 'email': 'a@b.c'},
      'apps': <Object>[],
      'account_manager': null,
    });
    expect(none.accountManager, isNull);
    final day = CallDay.fromJson({
      'date': '2026-11-16',
      'label': 'Mon 16 Nov',
      'times': ['11:00', '14:30'],
    });
    expect(day.times, ['11:00', '14:30']);
    final call = BookedCall.fromJson({
      'id': 'c1',
      'date': '2026-11-16',
      'time': '14:30',
      'status': 'requested',
    });
    expect(call.status, 'requested');
  });

  test('the new push kinds', () {
    for (final wire in [
      'new_food_order',
      'shipment_waiting',
      'new_complaint',
      'prime_alert',
      'morning_brief',
    ]) {
      expect(PushKind.parse(wire)?.wire, wire);
    }
  });

  test('the client sends the spec\'s paths and bodies', () async {
    final adapter = FakeAdapter((options, body) async {
      if (options.path.endsWith('/couriers')) return json(200, {'items': []});
      if (options.path.contains('/food-orders/')) {
        return json(200, {
          'id': 48,
          'reference': 'F-1048',
          'status': 'accepted',
          'total': money(41200),
        });
      }
      return json(200, {
        'id': 2031,
        'reference': 'S-2031',
        'status': 'assigned',
      });
    });
    final api = HttpOwnerApi(
      baseUrl: 'https://yallapp.com.tr/api/owner/v1',
      language: () => 'en',
      adapter: adapter,
    );
    await api.foodOrderStep('app 1', '48', step: 'accept', prepMinutes: 15);
    expect(
      adapter.requests.last.uri.path,
      '/api/owner/v1/apps/app%201/food-orders/48/step',
    );
    expect(jsonDecode(adapter.bodies.last!), {
      'step': 'accept',
      'prep_minutes': 15,
    });
    await api.assignShipment('a', '2031', '7');
    expect(jsonDecode(adapter.bodies.last!), {'courier_id': 7});
    await api.couriers('a', shipmentId: '2031');
    expect(adapter.requests.last.uri.queryParameters, {'shipment_id': '2031'});
    expect(adapter.requests.last.method, 'GET');
  });

  /// 125 The Prime looks keep text at WCAG AA (4.5:1), light and dark.
  for (final look in PrimeLook.values) {
    for (final brightness in Brightness.values) {
      test('${look.name} ${brightness.name}: text keeps 4.5:1', () {
        final c = YbColors.of(look, brightness);
        final pairs = {
          'ink on background': (c.ink, c.background),
          'ink on surface': (c.ink, c.surface),
          'ink on muted': (c.ink, c.muted),
          'ink2 on background': (c.ink2, c.background),
          'ink2 on surface': (c.ink2, c.surface),
          'onInk on ink': (c.onInk, c.ink),
          'accent text on surface': (c.accentText, c.surface),
          'gold on gold fill': (c.gold, c.goldBg),
          'header text': (c.onHead, c.head),
          'header tile text': (c.onHead, c.headSurface),
          'header second text': (c.onHead2, c.headSurface),
        };
        for (final MapEntry(key: label, value: (fg, bg)) in pairs.entries) {
          expect(contrast(fg, bg), greaterThanOrEqualTo(4.5), reason: label);
        }
        final theme = buildTheme(
          arabic: false,
          brightness: brightness,
          look: look,
        );
        expect(theme.extension<YbColors>(), c);
        expect(theme.scaffoldBackgroundColor, c.background);
      });
    }
  }

  test('Classic is the app\'s own theme', () {
    expect(YbColors.of(PrimeLook.classic, Brightness.light), YbColors.light);
    expect(YbColors.of(PrimeLook.classic, Brightness.dark), YbColors.dark);
    expect(PrimeLook.parse('ember'), PrimeLook.ember);
    expect(PrimeLook.parse(null), PrimeLook.classic);
  });
}
