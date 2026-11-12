import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/local_settings.dart';

/// 123 The courses the student put in the academy's cart, kept on this
/// device until they are bought (`PurchaseRules.cart`).
class CourseCartController extends Notifier<List<int>> {
  static const storageKey = 'lms.course_cart';
  static const maxCourses = 20;

  @override
  List<int> build() {
    final raw = ref.watch(sharedPreferencesProvider).getString(storageKey);
    if (raw == null) return const [];
    try {
      return List.unmodifiable([
        for (final id in jsonDecode(raw) as List)
          if (id is int) id,
      ]);
    } on Object {
      return const [];
    }
  }

  void _save(List<int> ids) {
    state = List.unmodifiable(ids);
    ref.read(sharedPreferencesProvider).setString(storageKey, jsonEncode(ids));
  }

  /// Adds a course once; false when the cart is full.
  bool add(int courseId) {
    if (state.contains(courseId)) return true;
    if (state.length >= maxCourses) return false;
    _save([...state, courseId]);
    return true;
  }

  void remove(int courseId) => _save([
    for (final id in state)
      if (id != courseId) id,
  ]);

  /// Keeps only these (after a checkout: the ones not bought).
  void keep(Iterable<int> courseIds) {
    final keep = courseIds.toSet();
    _save([
      for (final id in state)
        if (keep.contains(id)) id,
    ]);
  }
}

final courseCartProvider = NotifierProvider<CourseCartController, List<int>>(
  CourseCartController.new,
);
