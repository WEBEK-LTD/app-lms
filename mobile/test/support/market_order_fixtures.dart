/// 115 A marketplace quote and order as the server writes them.
library;

Map<String, dynamic> _money(String amount) => {
  'amount': amount,
  'formatted': 'EGP $amount',
};

Map<String, dynamic> marketVendorSummaryJson({
  int id = 7,
  String kind = 'restaurant',
  String deliveryBy = 'app',
}) => {
  'id': id,
  'kind': kind,
  'name': kind == 'restaurant' ? 'Nile Grill House' : 'Green Basket Market',
  'logo_url': null,
  'cover_url': null,
  'categories': const ['grills'],
  'rating': 4.6,
  'ratings_count': 240,
  'open': true,
  'opens_at': null,
  'busy': false,
  'delivery_by': deliveryBy,
  'delivery_minutes': {'min': 20, 'max': 30},
  'delivery_fee': _money('15.00'),
  'free_delivery_over': null,
  'min_order': _money('100.00'),
  'distance_km': 1.2,
  'delivers': true,
  'pickup': true,
  'scheduling': true,
  'offer': null,
  'club_benefit': null,
};

Map<String, dynamic> marketOrderLineJson({
  int productId = 1,
  String name = 'Mixed grill',
  num quantity = 1,
  String unit = 'item',
}) => {
  'id': productId * 10,
  'product_id': productId,
  'name': name,
  'image_url': null,
  'quantity': quantity,
  'unit': unit,
  'choices': const <String>[],
  'note': null,
  'unit_price': _money('265.00'),
  'before_discount': null,
  'total': _money('265.00'),
  'if_missing': 'remove',
  'outcome': null,
  'picked_quantity': null,
  'substitute': null,
};

List<Map<String, dynamic>> _price() => [
  {'kind': 'items', 'label': 'Items', 'amount': _money('265.00')},
  {'kind': 'delivery', 'label': 'Delivery', 'amount': _money('15.00')},
  {'kind': 'coupon', 'label': 'Coupon LUNCH', 'amount': _money('-20.00')},
  {'kind': 'total', 'label': 'Total', 'amount': _money('260.00')},
];

Map<String, dynamic> marketQuoteJson() => {
  'quote_id': 'q_test',
  'expires_at': '2026-11-04T10:00:00Z',
  'lines': [marketOrderLineJson()],
  'price': _price(),
  'total': _money('260.00'),
  'pay_now': _money('260.00'),
  'coupon': {'code': 'LUNCH', 'title': '20 off lunch'},
  'delivery_minutes': {'min': 20, 'max': 30},
  'warnings': const <String>[],
};

Map<String, dynamic> marketOrderJson({
  int id = 901,
  String status = 'placed',
  String deliveryBy = 'app',
  Map<String, dynamic>? tracking,
  bool canComplain = true,
  String fulfilment = 'delivery',
}) => {
  'id': id,
  'reference': 'M-$id',
  'vendor': marketVendorSummaryJson(deliveryBy: deliveryBy),
  'status': status,
  'fulfilment': fulfilment,
  'scheduled_for': null,
  'lines': [marketOrderLineJson()],
  'price': _price(),
  'total': _money('260.00'),
  'payment': {'method': 'cash', 'status': 'unpaid', 'wallet_used': null},
  'delivery_by': fulfilment == 'pickup' ? null : deliveryBy,
  'ready_at': null,
  'eta': '2026-11-04T10:30:00Z',
  'pickup_code': fulfilment == 'pickup' ? '4821' : null,
  'tracking': tracking,
  'rating': null,
  'can_cancel': status == 'placed',
  'can_complain': canComplain,
  'complaint_id': null,
  'created_at': '2026-11-04T10:00:00Z',
  'timeline': [
    {'status': 'placed', 'at': '2026-11-04T10:00:00Z'},
  ],
};
