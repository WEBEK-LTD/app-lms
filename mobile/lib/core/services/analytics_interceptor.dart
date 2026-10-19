import 'package:dio/dio.dart';

import 'analytics.dart';

/// 44 Usage events from the app's own API calls, so every app type and
/// every backend counts the same way (the contract's paths): an item opened,
/// enrolled in, booked, a ticket or a donation, a checkout page asked for,
/// and searches. Only answers that succeeded count. Added to the content
/// client in `providers.dart`.
class AnalyticsInterceptor extends Interceptor {
  AnalyticsInterceptor(this._analytics);

  final AnalyticsService Function() _analytics;

  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    try {
      final status = response.statusCode ?? 0;
      if (status >= 200 && status < 300) {
        final options = response.requestOptions;
        for (final event in eventsFor(
          method: options.method,
          path: options.uri.path,
          query: options.queryParameters,
          body: options.data,
          answer: response.data,
        )) {
          _analytics().record(event.type, event.fields);
        }
      }
    } on Object {
      // Never let counting get in the way of the app.
    }
    handler.next(response);
  }
}

class ApiEvent {
  const ApiEvent(this.type, this.fields);
  final String type;
  final Map<String, Object?> fields;

  @override
  String toString() => '$type $fields';
}

/// The detail endpoints and the item kind each one opens.
final _details = <RegExp, String>{
  RegExp(r'/courses/(\d+)$'): 'course',
  RegExp(r'/store/products/(\d+)$'): 'product',
  RegExp(r'/bookings/services/(\d+)$'): 'service',
  RegExp(r'/listings/(\d+)$'): 'listing',
  RegExp(r'/news/articles/([^/]+)$'): 'article',
  RegExp(r'/events/(\d+)$'): 'event',
  RegExp(r'/donations/campaigns/(\d+)$'): 'campaign',
};

/// Lists that take a `search` text.
final _searchable = RegExp(
  r'/(courses|store/products|bookings/services|listings|news/articles|events)$',
);

Map<String, Object?> _item(String kind, Object? id, [Object? title]) => {
  'item_kind': kind,
  'item_id': '$id',
  if (title is String && title.trim().isNotEmpty)
    'title': title.trim().length > 120
        ? title.trim().substring(0, 120)
        : title.trim(),
};

num? _amount(Object? value) => switch (value) {
  num n => n,
  String s => num.tryParse(s),
  _ => null,
};

String? _currency(Object? value) =>
    value is String && RegExp(r'^[A-Za-z]{3}$').hasMatch(value)
    ? value.toUpperCase()
    : null;

/// What one successful API call means for the statistics (pure, tested).
List<ApiEvent> eventsFor({
  required String method,
  required String path,
  Map<String, dynamic> query = const {},
  Object? body,
  Object? answer,
}) {
  final data = body is Map ? body : const {};
  final json = answer is Map ? answer : const {};
  if (method == 'GET') {
    for (final entry in _details.entries) {
      final match = entry.key.firstMatch(path);
      if (match == null) continue;
      // `/courses/12/curriculum` and the like don't match: the details only.
      return [
        ApiEvent(
          'item_view',
          _item(
            entry.value,
            Uri.decodeComponent(match.group(1)!),
            json['title'] ?? json['name'],
          ),
        ),
      ];
    }
    final search = '${query['search'] ?? ''}'.trim();
    final page = int.tryParse('${query['page'] ?? 1}') ?? 1;
    if (search.isNotEmpty && page <= 1 && _searchable.hasMatch(path)) {
      return [
        ApiEvent('search', {
          'query': search.length > 80 ? search.substring(0, 80) : search,
        }),
      ];
    }
    return const [];
  }
  if (method != 'POST') return const [];
  final enroll = RegExp(r'/courses/(\d+)/enroll$').firstMatch(path);
  if (enroll != null) return [ApiEvent('enroll', _item('course', enroll[1]))];
  if (path.endsWith('/auth/checkout-link') && data['course_id'] != null) {
    return [ApiEvent('purchase_click', _item('course', data['course_id']))];
  }
  if (path.endsWith('/store/checkout-link')) {
    final lines = data['lines'];
    final first = lines is List && lines.isNotEmpty && lines.first is Map
        ? (lines.first as Map)['product_id']
        : null;
    return [ApiEvent('purchase_click', _item('product', first ?? 'cart'))];
  }
  if (path.endsWith('/bookings/appointments') && data['service_id'] != null) {
    return [ApiEvent('book', _item('service', data['service_id']))];
  }
  final classBooking = RegExp(r'/bookings/classes/(\d+)/book$')
      .firstMatch(path);
  if (classBooking != null) {
    return [ApiEvent('book', _item('class', classBooking[1]))];
  }
  if (path.endsWith('/memberships/checkout-link') && data['plan_id'] != null) {
    return [ApiEvent('purchase_click', _item('membership', data['plan_id']))];
  }
  final register = RegExp(r'/events/(\d+)/register$').firstMatch(path);
  if (register != null) {
    return [ApiEvent('ticket', _item('event', register[1]))];
  }
  if (path.endsWith('/events/checkout-link') && data['event_id'] != null) {
    final event = _item('event', data['event_id']);
    return [ApiEvent('ticket', event), ApiEvent('purchase_click', event)];
  }
  if (path.endsWith('/donations/checkout-link') &&
      data['campaign_id'] != null) {
    final amount = _amount(data['amount']);
    final currency = _currency(json['currency'] ?? data['currency']);
    final campaign = {
      ..._item('campaign', data['campaign_id']),
      if (amount != null && currency != null) ...{
        'amount': amount,
        'currency': currency,
      },
    };
    return [ApiEvent('donate', campaign), ApiEvent('purchase_click', campaign)];
  }
  return const [];
}
