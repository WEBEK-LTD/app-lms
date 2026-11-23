import 'dart:async';
import 'dart:convert';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// 206 The ringtones: made by `tool/ringtones.py` (Yallapp's own, from
/// code), bundled for the app's preview and in-app ring
/// (`assets/sounds/ring_<id>.m4a`), Android's notification channels
/// (`res/raw/yb_ring_<id>.ogg`) and iOS pushes (`Runner/Sounds`). The ids
/// match the server's (`platform/web/src/lib/owner/push-sounds.ts`).
const ringtoneIds = [
  'chime',
  'counter_bell',
  'kitchen_ticket',
  'marimba',
  'harp',
  'digital',
  'rush_hour',
  'cash_drawer',
  'doorbell',
  'xylophone',
  'soft_pulse',
  'chirp',
  'sunrise',
  'arcade',
  'soft_drop',
  'pop',
  'knock',
];

/// The phone's own notification sound, and none.
const soundDefault = 'default';
const soundSilent = 'silent';

bool isSoundChoice(String? id) =>
    id == soundDefault || id == soundSilent || ringtoneIds.contains(id);

/// The groups a sound is chosen for.
enum SoundGroup {
  orders('orders'),
  bookings('bookings'),
  cancelled('cancelled'),
  messages('messages'),
  other('other');

  const SoundGroup(this.wire);
  final String wire;

  static SoundGroup? parse(String? value) {
    for (final g in values) {
      if (g.wire == value) return g;
    }
    return null;
  }

  /// What a phone hears when it chose nothing.
  String get defaultSound => switch (this) {
    SoundGroup.orders => 'counter_bell',
    SoundGroup.bookings => 'doorbell',
    SoundGroup.cancelled => 'knock',
    SoundGroup.messages => 'pop',
    SoundGroup.other => soundDefault,
  };

  /// Only orders and bookings can ring until opened.
  bool get canRing => this == SoundGroup.orders || this == SoundGroup.bookings;
}

/// Which group a push is in, from its `kind` (as the server's
/// `OWNER_SOUND_GROUP_OF`); a push the server already grouped says so.
SoundGroup soundGroupOf(Map<String, dynamic> data) {
  final told = SoundGroup.parse('${data['yb_group'] ?? ''}');
  if (told != null) return told;
  return switch ('${data['kind'] ?? ''}') {
    'new_order' ||
    'new_food_order' ||
    'new_market_order' ||
    'shipment_waiting' => SoundGroup.orders,
    'new_booking' => SoundGroup.bookings,
    'order_cancelled' => SoundGroup.cancelled,
    'new_message' ||
    'new_chat_message' ||
    'new_review' ||
    'new_complaint' => SoundGroup.messages,
    _ => SoundGroup.other,
  };
}

/// Quiet hours: from and to, minutes after midnight on the phone's clock.
class QuietHours {
  const QuietHours(this.from, this.to);

  final int from;
  final int to;

  static int? _parse(Object? hhmm) {
    final m = RegExp(r'^(\d{2}):(\d{2})$').firstMatch('${hhmm ?? ''}');
    if (m == null) return null;
    final h = int.parse(m.group(1)!);
    final min = int.parse(m.group(2)!);
    return h < 24 && min < 60 ? h * 60 + min : null;
  }

  static QuietHours? fromJson(Object? json) {
    if (json is! Map) return null;
    final from = _parse(json['from']);
    final to = _parse(json['to']);
    return from == null || to == null || from == to
        ? null
        : QuietHours(from, to);
  }

  static String hhmm(int minutes) =>
      '${(minutes ~/ 60).toString().padLeft(2, '0')}:'
      '${(minutes % 60).toString().padLeft(2, '0')}';

  Map<String, String> toJson() => {'from': hhmm(from), 'to': hhmm(to)};

  /// Whether [at] is in them (they may run past midnight).
  bool contains(DateTime at) {
    final m = at.hour * 60 + at.minute;
    return from < to ? m >= from && m < to : m >= from || m < to;
  }

  @override
  bool operator ==(Object other) =>
      other is QuietHours && other.from == from && other.to == to;

  @override
  int get hashCode => Object.hash(from, to);
}

/// The choices of Settings › Ringtones, kept on this phone and sent to the
/// server (`PUT /me/push-sounds`) and to Android's notifications.
@immutable
class RingSettings {
  const RingSettings({
    this.sounds = const {},
    this.ring = const {SoundGroup.orders},
    this.ringMinutes = 3,
    this.vibrate = true,
    this.alarmVolume = false,
    this.quiet,
    this.volume = 1.0,
  });

  /// A group left out has its default sound.
  final Map<SoundGroup, String> sounds;

  /// The groups that ring on until opened.
  final Set<SoundGroup> ring;
  final int ringMinutes;
  final bool vibrate;

  /// Android: ring at the alarm's volume.
  final bool alarmVolume;
  final QuietHours? quiet;

  /// The in-app ring's and the preview's volume (0.2 to 1), this phone only.
  final double volume;

  static const ringMinuteChoices = [1, 2, 3, 5, 10];

  String soundOf(SoundGroup group) => sounds[group] ?? group.defaultSound;

  bool rings(SoundGroup group) => group.canRing && ring.contains(group);

  /// What a push of [group] sounds like at [at]: the quiet hours silence
  /// everything but orders.
  String soundAt(SoundGroup group, DateTime at) =>
      group != SoundGroup.orders && (quiet?.contains(at) ?? false)
      ? soundSilent
      : soundOf(group);

  RingSettings copyWith({
    Map<SoundGroup, String>? sounds,
    Set<SoundGroup>? ring,
    int? ringMinutes,
    bool? vibrate,
    bool? alarmVolume,
    QuietHours? quiet,
    bool clearQuiet = false,
    double? volume,
  }) => RingSettings(
    sounds: sounds ?? this.sounds,
    ring: ring ?? this.ring,
    ringMinutes: ringMinutes ?? this.ringMinutes,
    vibrate: vibrate ?? this.vibrate,
    alarmVolume: alarmVolume ?? this.alarmVolume,
    quiet: clearQuiet ? null : (quiet ?? this.quiet),
    volume: volume ?? this.volume,
  );

  /// The server's `PushSounds` (and this phone's own `volume`).
  factory RingSettings.fromJson(Map<String, dynamic> json) {
    final sounds = <SoundGroup, String>{};
    final raw = json['sounds'];
    if (raw is Map) {
      for (final e in raw.entries) {
        final group = SoundGroup.parse('${e.key}');
        final id = '${e.value}';
        if (group != null && isSoundChoice(id) && id != group.defaultSound) {
          sounds[group] = id;
        }
      }
    }
    final minutes = json['ring_minutes'];
    final volume = json['volume'];
    return RingSettings(
      sounds: sounds,
      ring: json['ring'] is List
          ? {
              for (final g in json['ring'] as List)
                if (SoundGroup.parse('$g') case final group? when group.canRing)
                  group,
            }
          : const {SoundGroup.orders},
      ringMinutes: ringMinuteChoices.contains(minutes) ? minutes as int : 3,
      vibrate: json['vibrate'] is bool ? json['vibrate'] as bool : true,
      alarmVolume: json['alarm_volume'] == true,
      quiet: QuietHours.fromJson(json['quiet']),
      volume: volume is num ? volume.toDouble().clamp(0.2, 1.0) : 1.0,
    );
  }

  /// What the server takes (`PUT /me/push-sounds`).
  Map<String, dynamic> toApiJson({String? timeZone}) => {
    'sounds': {for (final g in SoundGroup.values) g.wire: soundOf(g)},
    'ring': [
      for (final g in SoundGroup.values)
        if (rings(g)) g.wire,
    ],
    'ring_minutes': ringMinutes,
    'vibrate': vibrate,
    'alarm_volume': alarmVolume,
    'quiet': quiet?.toJson(),
    'time_zone': ?timeZone,
  };

  /// What this phone keeps (and Android's notifications read).
  Map<String, dynamic> toJson() => {...toApiJson(), 'volume': volume};

  @override
  bool operator ==(Object other) =>
      other is RingSettings &&
      jsonEncode(other.toJson()) == jsonEncode(toJson());

  @override
  int get hashCode => jsonEncode(toJson()).hashCode;
}

/// The native side of the ring (`tr.com.yallapp.business/ring`): on
/// Android the app shows its pushes itself (`RingReceiver.kt`) with the
/// chosen sound on its own channel, ringing on until opened; on iOS the
/// pushes carry the bundled sound. Older builds without the channel: every
/// call does nothing.
abstract class RingNative {
  /// Hands Android the choices and the words of its channels.
  Future<void> configure(RingSettings settings, Map<String, String> words);

  /// Stops every notification still ringing (the app is open).
  Future<void> stopRinging();

  /// Android: a real notification of [group] now, to hear it as it comes.
  Future<bool> testNotification(SoundGroup group, String title, String body);

  /// The phone's time zone (IANA), for the quiet hours on the server.
  Future<String?> timeZone();

  /// The data of the notification that opened the app, once.
  Future<Map<String, dynamic>?> initial();

  /// Notifications tapped while the app runs.
  Stream<Map<String, dynamic>> get opened;
}

class PlatformRingNative implements RingNative {
  PlatformRingNative() {
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'opened' && call.arguments is Map) {
        _opened.add(_data(call.arguments as Map));
      }
    });
  }

  static const _channel = MethodChannel('tr.com.yallapp.business/ring');
  final _opened = StreamController<Map<String, dynamic>>.broadcast();

  static Map<String, dynamic> _data(Map raw) => {
    for (final e in raw.entries) '${e.key}': e.value,
  };

  Future<T?> _call<T>(String method, [Object? args]) async {
    try {
      return await _channel.invokeMethod<T>(method, args);
    } on Object {
      return null;
    }
  }

  @override
  Future<void> configure(RingSettings settings, Map<String, String> words) =>
      _call<void>('configure', {
        'settings': jsonEncode(settings.toJson()),
        'words': words,
      });

  @override
  Future<void> stopRinging() => _call<void>('stopRinging');

  @override
  Future<bool> testNotification(
    SoundGroup group,
    String title,
    String body,
  ) async =>
      await _call<bool>('test', {
        'group': group.wire,
        'title': title,
        'body': body,
      }) ??
      false;

  @override
  Future<String?> timeZone() => _call<String>('timeZone');

  @override
  Future<Map<String, dynamic>?> initial() async {
    final raw = await _call<Map<Object?, Object?>>('initial');
    return raw == null ? null : _data(raw);
  }

  @override
  Stream<Map<String, dynamic>> get opened => _opened.stream;
}

class NoRingNative implements RingNative {
  const NoRingNative();

  @override
  Future<void> configure(RingSettings settings, Map<String, String> words) =>
      Future.value();
  @override
  Future<void> stopRinging() => Future.value();
  @override
  Future<bool> testNotification(SoundGroup group, String title, String body) =>
      Future.value(false);
  @override
  Future<String?> timeZone() => Future.value();
  @override
  Future<Map<String, dynamic>?> initial() => Future.value();
  @override
  Stream<Map<String, dynamic>> get opened => const Stream.empty();
}

/// Plays the ringtones in the app: a preview, one ring, or ringing on (a
/// new order while the app is open) until stopped or for at most a while.
abstract class Ringer {
  /// Plays [sound] once (a preview, or a push that doesn't ring on).
  Future<void> play(String sound, {double volume = 1});

  /// Plays [sound] again and again until [stop], for at most [max].
  Future<void> ring(String sound, {required Duration max, double volume = 1});

  Future<void> stop();

  /// True while ringing on; the in-app banner listens.
  ValueListenable<bool> get ringing;
}

class AssetRinger implements Ringer {
  AudioPlayer? _player;
  Timer? _limit;
  final _ringing = ValueNotifier<bool>(false);

  @override
  ValueListenable<bool> get ringing => _ringing;

  Future<void> _start(String sound, double volume, {required bool loop}) async {
    if (sound == soundSilent) return;
    // The phone's own sound isn't the app's to play: the app's chime.
    final id = sound == soundDefault ? 'chime' : sound;
    try {
      final player = _player ??= AudioPlayer();
      await player.stop();
      await player.setReleaseMode(loop ? ReleaseMode.loop : ReleaseMode.stop);
      await player.setVolume(volume.clamp(0.0, 1.0));
      await player.play(AssetSource('sounds/ring_$id.m4a'));
    } on Object {
      // No sound (silent mode, no audio device): the haptic still goes.
    }
  }

  DateTime? _lastPlay;
  String? _lastSound;

  @override
  Future<void> play(String sound, {double volume = 1}) async {
    if (_ringing.value) return;
    // The push and Kitchen mode's reload for the same order: one sound.
    final now = DateTime.now();
    if (sound == _lastSound &&
        _lastPlay != null &&
        now.difference(_lastPlay!) < const Duration(seconds: 4)) {
      return;
    }
    _lastPlay = now;
    _lastSound = sound;
    await _start(sound, volume, loop: false);
    if (sound != soundSilent) await HapticFeedback.mediumImpact();
  }

  @override
  Future<void> ring(
    String sound, {
    required Duration max,
    double volume = 1,
  }) async {
    _limit?.cancel();
    _ringing.value = true;
    _limit = Timer(max, () => unawaited(stop()));
    await _start(sound, volume, loop: true);
    await HapticFeedback.heavyImpact();
  }

  @override
  Future<void> stop() async {
    _lastSound = null;
    _limit?.cancel();
    _limit = null;
    _ringing.value = false;
    try {
      await _player?.stop();
    } on Object {
      // Nothing was playing.
    }
  }
}
