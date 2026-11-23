import 'dart:async';

import 'package:flutter/services.dart';

/// 214 A new order's Live Activity on an iPhone (the ShopWidget extension's
/// `OrderLiveActivity`), through `tr.com.yallapp.business/live`: the push
/// tokens for the server (`PUT /me/live-activity`), and starting one while
/// the app is open (the server's push-to-start does it otherwise). Ending
/// goes through the ring channel's `orderDone`. Android and older iPhones:
/// nothing happens.
abstract class LiveActivities {
  /// The push-to-start token and the order activities' tokens, or null
  /// when this phone has none to give.
  Future<LiveTokens?> tokens();

  /// Shows the new order of a push's [data] as a Live Activity.
  Future<void> start(Map<String, Object?> data);

  /// The tokens changed: send them again.
  Stream<void> get changed;
}

class LiveOrderToken {
  const LiveOrderToken({
    required this.appId,
    required this.kind,
    required this.orderId,
    required this.token,
  });

  final String appId;
  final String kind;
  final String orderId;
  final String? token;

  Map<String, Object?> toJson() => {
    'app_id': appId,
    'kind': kind,
    'order_id': orderId,
    'token': token,
  };
}

class LiveTokens {
  const LiveTokens({this.start, this.orders = const []});

  final String? start;
  final List<LiveOrderToken> orders;
}

/// The push kinds that show as a Live Activity, with their order's key.
const liveOrderKeys = {
  'new_order': 'order_id',
  'new_food_order': 'food_order_id',
  'new_market_order': 'market_order_id',
};

/// What the native side starts a Live Activity with, from a new order's
/// push data (null for any other push).
Map<String, Object?>? liveStartArgs(Map<String, dynamic> data, String lang) {
  final kind = '${data['kind'] ?? ''}';
  final key = liveOrderKeys[kind];
  final orderId = key == null ? '' : '${data[key] ?? ''}';
  if (orderId.isEmpty) return null;
  final placed = double.tryParse('${data['order_placed_at'] ?? ''}');
  return {
    'app_id': '${data['app_id'] ?? ''}',
    'kind': kind,
    'order_id': orderId,
    'number': '${data['order_number'] ?? orderId}',
    'customer': '${data['order_customer'] ?? ''}',
    'total': '${data['order_total'] ?? ''}',
    'placed_at': ?placed,
    'lang': lang,
  };
}

class PlatformLiveActivities implements LiveActivities {
  PlatformLiveActivities() {
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'changed') _changed.add(null);
    });
  }

  static const _channel = MethodChannel('tr.com.yallapp.business/live');
  final _changed = StreamController<void>.broadcast();

  @override
  Future<LiveTokens?> tokens() async {
    try {
      final raw = await _channel.invokeMethod<Map<Object?, Object?>>('tokens');
      if (raw == null) return null;
      final orders = [
        for (final o in (raw['orders'] as List?) ?? const [])
          if (o is Map)
            LiveOrderToken(
              appId: '${o['app_id'] ?? ''}',
              kind: '${o['kind'] ?? ''}',
              orderId: '${o['order_id'] ?? ''}',
              token: o['token'] as String?,
            ),
      ];
      final start = raw['start'];
      return LiveTokens(start: start is String ? start : null, orders: orders);
    } on Object {
      return null;
    }
  }

  @override
  Future<void> start(Map<String, Object?> data) async {
    try {
      await _channel.invokeMethod<void>('start', data);
    } on Object {
      // No Live Activities here.
    }
  }

  @override
  Stream<void> get changed => _changed.stream;
}

class NoLiveActivities implements LiveActivities {
  const NoLiveActivities();

  @override
  Future<LiveTokens?> tokens() => Future.value();

  @override
  Future<void> start(Map<String, Object?> data) => Future.value();

  @override
  Stream<void> get changed => const Stream.empty();
}
