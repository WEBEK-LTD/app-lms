import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../core/storage/local_settings.dart';

/// 112.1 The rider's places kept on this phone ([savedPlacesKey]): Home,
/// Work and the last places they went to, offered first on "Where to?"
/// like Uber's. Only while signed in; forgotten on sign-out.

/// How many recent places are kept.
const recentPlacesMax = 5;

/// Home or Work.
enum SavedPlaceKind { home, work }

/// A place the rider chose: its name, its address and where it is.
class SavedPlace {
  const SavedPlace({
    required this.name,
    this.address,
    required this.lat,
    required this.lng,
  });

  static SavedPlace? fromJson(Object? json) {
    if (json is! Map) return null;
    final name = json['name'], lat = json['lat'], lng = json['lng'];
    if (name is! String || lat is! num || lng is! num) return null;
    final address = json['address'];
    return SavedPlace(
      name: name,
      address: address is String ? address : null,
      lat: lat.toDouble(),
      lng: lng.toDouble(),
    );
  }

  final String name;
  final String? address;
  final double lat;
  final double lng;

  Map<String, Object?> toJson() => {
    'name': name,
    'address': ?address,
    'lat': lat,
    'lng': lng,
  };

  /// The same place, to about 50 m.
  bool near(SavedPlace other) =>
      (lat - other.lat).abs() < 0.0005 && (lng - other.lng).abs() < 0.0005;
}

/// Home, Work and the recent places.
class SavedPlaces {
  const SavedPlaces({this.home, this.work, this.recent = const []});

  factory SavedPlaces.fromJson(Object? json) {
    if (json is! Map) return const SavedPlaces();
    final recent = json['recent'];
    return SavedPlaces(
      home: SavedPlace.fromJson(json['home']),
      work: SavedPlace.fromJson(json['work']),
      recent: [
        if (recent is List)
          for (final item in recent) ?SavedPlace.fromJson(item),
      ],
    );
  }

  final SavedPlace? home;
  final SavedPlace? work;
  final List<SavedPlace> recent;

  SavedPlace? of(SavedPlaceKind kind) => switch (kind) {
    SavedPlaceKind.home => home,
    SavedPlaceKind.work => work,
  };

  Map<String, Object?> toJson() => {
    'home': home?.toJson(),
    'work': work?.toJson(),
    'recent': [for (final p in recent) p.toJson()],
  };
}

class SavedPlacesNotifier extends Notifier<SavedPlaces> {
  @override
  SavedPlaces build() {
    if (!ref.watch(authControllerProvider.select((a) => a.isSignedIn))) {
      return const SavedPlaces();
    }
    try {
      final raw = ref.read(sharedPreferencesProvider).getString(savedPlacesKey);
      return raw == null
          ? const SavedPlaces()
          : SavedPlaces.fromJson(jsonDecode(raw));
    } on Object {
      // No preferences (tests without them), or a damaged copy.
      return const SavedPlaces();
    }
  }

  void _keep(SavedPlaces places) {
    state = places;
    if (!ref.read(authControllerProvider).isSignedIn) return;
    try {
      ref
          .read(sharedPreferencesProvider)
          .setString(savedPlacesKey, jsonEncode(places.toJson()));
    } on Object {
      // Kept for this session only.
    }
  }

  /// Sets Home or Work.
  void save(SavedPlaceKind kind, SavedPlace place) => _keep(
    SavedPlaces(
      home: kind == SavedPlaceKind.home ? place : state.home,
      work: kind == SavedPlaceKind.work ? place : state.work,
      recent: state.recent,
    ),
  );

  /// A place the rider went to: first in the recent ones, once.
  void went(SavedPlace place) => _keep(
    SavedPlaces(
      home: state.home,
      work: state.work,
      recent: [
        place,
        ...state.recent.where((p) => !p.near(place)),
      ].take(recentPlacesMax).toList(),
    ),
  );
}

final savedPlacesProvider = NotifierProvider<SavedPlacesNotifier, SavedPlaces>(
  SavedPlacesNotifier.new,
);
