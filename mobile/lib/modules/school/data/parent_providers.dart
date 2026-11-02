import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/providers.dart';
import 'school_providers.dart';

/// 113.4 The signed-in person is one of the school's parents: the Parent
/// tab is theirs only (a student, a teacher or a member of staff without
/// children at the school never sees it; a teacher who is a parent has
/// both). From the school's roles (`SchoolMe.roles`), the account's
/// (`User.roles`, the same on the server) until they are read. Null: not a
/// school app.
final isSchoolParentProvider = Provider<bool?>((ref) {
  if (ref.watch(appEnvironmentProvider).build.appType != AppType.school) {
    return null;
  }
  final user = ref.watch(authControllerProvider).user;
  if (user == null) return false;
  final roles = ref.watch(schoolMeProvider.select((me) => me.value?.roles));
  return roles != null ? roles.contains(SchoolRole.parent) : user.isParent;
});

final parentMeProvider = FutureProvider.autoDispose<ParentMe>((ref) {
  ref.watch(authControllerProvider.select((s) => s.user?.id));
  return ref.read(yallappApiProvider).getParentMe();
});

/// The child the Parent tab shows: [wanted] (from a notification) when it
/// is one of theirs, else the one chosen (shared with the School's parts),
/// else the first.
ParentChild? childOf(ParentMe me, int? chosen, {int? wanted}) {
  for (final id in [wanted, chosen]) {
    final found = me.children.where((c) => c.id == id).firstOrNull;
    if (found != null) return found;
  }
  return me.children.firstOrNull;
}

final childDayProvider = FutureProvider.autoDispose.family<ChildDay, int>(
  (ref, id) => ref.read(yallappApiProvider).getChildDay(id),
);

/// The permission slips for the parent's children: open ones first.
class PermissionSlipsController extends PagedController<PermissionSlip> {
  @override
  Future<Paged<PermissionSlip>> fetch(int page) =>
      ref.read(yallappApiProvider).listPermissionSlips(page: page);
}

final permissionSlipsProvider =
    NotifierProvider.autoDispose<
      PermissionSlipsController,
      PagedState<PermissionSlip>
    >(PermissionSlipsController.new);

final absenceExcusesProvider = FutureProvider.autoDispose
    .family<List<AbsenceExcuse>, int>(
      (ref, id) => ref.read(yallappApiProvider).listAbsenceExcuses(id),
    );

final childPickupProvider = FutureProvider.autoDispose.family<ChildPickup, int>(
  (ref, id) => ref.read(yallappApiProvider).getChildPickup(id),
);
