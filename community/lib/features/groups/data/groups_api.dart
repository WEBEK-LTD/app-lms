import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/api/community_api.dart';
import '../../../core/api/json.dart';
import '../../../core/api/models.dart';
import '../../../core/providers.dart';

// 232.5 Groups, on the contract's `/groups` (docs/api/community.yaml).

enum GroupRole { owner, moderator, member }

GroupRole? _role(String? s) => switch (s) {
  'owner' => GroupRole.owner,
  'moderator' => GroupRole.moderator,
  'member' => GroupRole.member,
  _ => null,
};

/// The viewer's place in a group.
class GroupStanding {
  const GroupStanding({this.role, this.requested = false});

  factory GroupStanding.fromJson(Json json) => GroupStanding(
    role: _role(optStr(json, 'role')),
    requested: boolean(json, 'requested'),
  );

  final GroupRole? role;
  final bool requested;

  bool get member => role != null;
  bool get manages => role == GroupRole.owner || role == GroupRole.moderator;
}

class Group {
  const Group({
    required this.id,
    required this.slug,
    required this.name,
    required this.owner,
    this.description = '',
    this.private = false,
    this.coverUrl,
    this.memberCount = 0,
    this.postCount = 0,
    this.status = 'active',
    this.standing = const GroupStanding(),
  });

  factory Group.fromJson(Json json) => Group(
    id: str(json, 'id'),
    slug: str(json, 'slug'),
    name: str(json, 'name'),
    description: str(json, 'description'),
    private: str(json, 'visibility') == 'private',
    coverUrl: optStr(json, 'cover_url'),
    owner: MemberSummary.fromJson(optObject(json, 'owner') ?? const {}),
    memberCount: integer(json, 'member_count'),
    postCount: integer(json, 'post_count'),
    status: str(json, 'status', 'active'),
    standing: GroupStanding.fromJson(optObject(json, 'standing') ?? const {}),
  );

  final String id;
  final String slug;
  final String name;
  final String description;
  final bool private;
  final String? coverUrl;
  final MemberSummary owner;
  final int memberCount;
  final int postCount;

  /// `pending`: waiting for review.
  final String status;
  final GroupStanding standing;

  /// Whether the viewer may read its posts and members.
  bool get open => !private || standing.member;

  Group withStanding(GroupStanding s) => Group(
    id: id,
    slug: slug,
    name: name,
    description: description,
    private: private,
    coverUrl: coverUrl,
    owner: owner,
    memberCount:
        memberCount + (s.member == standing.member ? 0 : (s.member ? 1 : -1)),
    postCount: postCount,
    status: status,
    standing: s,
  );
}

class GroupMember {
  const GroupMember({required this.member, required this.role});

  factory GroupMember.fromJson(Json json) => GroupMember(
    member: MemberSummary.fromJson(optObject(json, 'member') ?? const {}),
    role: _role(optStr(json, 'role')) ?? GroupRole.member,
  );

  final MemberSummary member;
  final GroupRole role;
}

abstract class GroupsApi {
  Future<Page<Group>> groups({bool mine = false, String? q, String? cursor});
  Future<Group> group(String id);
  Future<Group> create(String name, String description, {bool private});
  Future<Group> setCover(String id, String file);
  Future<GroupStanding> join(String id);
  Future<GroupStanding> leave(String id);
  Future<Page<GroupMember>> members(String id, {String? cursor});
  Future<GroupMember> setRole(String id, String member, GroupRole role);
  Future<void> remove(String id, String member);
  Future<Page<GroupMember>> requests(String id, {String? cursor});
  Future<void> accept(String id, String member);
  Future<void> decline(String id, String member);
}

class HttpGroupsApi implements GroupsApi {
  HttpGroupsApi(this.client);

  final ApiClient client;

  static String _g(String id) => '/groups/${Uri.encodeComponent(id)}';
  static String _m(String id) => Uri.encodeComponent(id);

  Page<GroupMember> _members(Json j) =>
      Page(listOf(j, 'items', GroupMember.fromJson), optStr(j, 'next_cursor'));

  @override
  Future<Page<Group>> groups({
    bool mine = false,
    String? q,
    String? cursor,
  }) async {
    final j = await client.get(
      '/groups',
      query: {'mine': mine ? 'true' : null, 'q': q, 'cursor': cursor},
    );
    return Page(listOf(j, 'items', Group.fromJson), optStr(j, 'next_cursor'));
  }

  @override
  Future<Group> group(String id) async =>
      Group.fromJson(await client.get(_g(id)));

  @override
  Future<Group> create(
    String name,
    String description, {
    bool private = false,
  }) async => Group.fromJson(
    await client.post(
      '/groups',
      body: {
        'name': name,
        'description': description,
        'visibility': private ? 'private' : 'public',
      },
    ),
  );

  @override
  Future<Group> setCover(String id, String file) async => Group.fromJson(
    await client.upload(
      '${_g(id)}/cover',
      method: 'PUT',
      field: 'file',
      filePath: file,
    ),
  );

  @override
  Future<GroupStanding> join(String id) async =>
      GroupStanding.fromJson(await client.put('${_g(id)}/membership'));

  @override
  Future<GroupStanding> leave(String id) async =>
      GroupStanding.fromJson(await client.deleteJson('${_g(id)}/membership'));

  @override
  Future<Page<GroupMember>> members(String id, {String? cursor}) async =>
      _members(
        await client.get('${_g(id)}/members', query: {'cursor': cursor}),
      );

  @override
  Future<GroupMember> setRole(String id, String member, GroupRole role) async =>
      GroupMember.fromJson(
        await client.patch(
          '${_g(id)}/members/${_m(member)}',
          body: {'role': role.name},
        ),
      );

  @override
  Future<void> remove(String id, String member) =>
      client.delete('${_g(id)}/members/${_m(member)}');

  @override
  Future<Page<GroupMember>> requests(String id, {String? cursor}) async =>
      _members(
        await client.get('${_g(id)}/requests', query: {'cursor': cursor}),
      );

  @override
  Future<void> accept(String id, String member) async =>
      client.post('${_g(id)}/requests/${_m(member)}/accept');

  @override
  Future<void> decline(String id, String member) async =>
      client.post('${_g(id)}/requests/${_m(member)}/decline');
}

final groupsApiProvider = Provider<GroupsApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeGroupsApi()
      : HttpGroupsApi(ref.watch(apiClientProvider)),
);

final myGroupsProvider = FutureProvider.autoDispose<List<Group>>(
  (ref) async => (await ref.watch(groupsApiProvider).groups(mine: true)).items,
);

final allGroupsProvider = FutureProvider.autoDispose<List<Group>>(
  (ref) async => (await ref.watch(groupsApiProvider).groups()).items,
);

final groupProvider = FutureProvider.autoDispose.family<Group, String>(
  (ref, id) => ref.watch(groupsApiProvider).group(id),
);

/// In memory, for tests and the demo.
class FakeGroupsApi implements GroupsApi {
  final calls = <String>[];

  /// Whether the admin's "who can create groups" lets this member.
  var mayCreate = true;
  var _n = 0;

  static const mohamed = MemberSummary(
    id: 'm-mohamed',
    name: 'Mohamed Ali',
    username: 'mohamed',
  );
  static const nour = MemberSummary(
    id: 'm-nour',
    name: 'Nour El Hoda',
    username: 'nour',
    badge: BadgeKind.blue,
  );
  static const karim = MemberSummary(
    id: 'm-karim',
    name: 'Karim Samy',
    username: 'karim',
  );

  final _groups = <Group>[
    const Group(
      id: 'g-studio',
      slug: 'studio-makers',
      name: 'Studio makers',
      description: 'Templates, themes and the Studio, shared.',
      owner: mohamed,
      memberCount: 3,
      postCount: 12,
      standing: GroupStanding(role: GroupRole.owner),
    ),
    const Group(
      id: 'g-sellers',
      slug: 'store-sellers',
      name: 'Store sellers',
      description: 'Running a store on Yallapp: photos, shipping and service.',
      owner: nour,
      memberCount: 240,
      postCount: 88,
    ),
    const Group(
      id: 'g-istanbul',
      slug: 'istanbul',
      name: 'Istanbul builders',
      description: 'Meetups in Istanbul.',
      owner: karim,
      private: true,
      memberCount: 31,
      postCount: 9,
    ),
  ];

  final Map<String, List<GroupMember>> _members = {
    'g-studio': const [
      GroupMember(member: mohamed, role: GroupRole.owner),
      GroupMember(member: nour, role: GroupRole.member),
      GroupMember(member: karim, role: GroupRole.member),
    ],
  };

  final Map<String, List<GroupMember>> _requests = {
    'g-studio': const [
      GroupMember(
        member: MemberSummary(
          id: 'm-lina',
          name: 'Lina Haddad',
          username: 'lina',
        ),
        role: GroupRole.member,
      ),
    ],
  };

  Group _find(String id) =>
      _groups.firstWhere((g) => g.id == id || g.slug == id);

  void _put(Group g) => _groups[_groups.indexWhere((x) => x.id == g.id)] = g;

  @override
  Future<Page<Group>> groups({
    bool mine = false,
    String? q,
    String? cursor,
  }) async => Page([
    for (final g in _groups)
      if (!mine || g.standing.member) g,
  ]);

  @override
  Future<Group> group(String id) async => _find(id);

  @override
  Future<Group> create(
    String name,
    String description, {
    bool private = false,
  }) async {
    calls.add('create:$name:$private');
    if (!mayCreate) {
      throw const ApiException(code: ApiException.notAllowed);
    }
    final g = Group(
      id: 'g-new-${_n++}',
      slug: 'new-${_n - 1}',
      name: name,
      description: description,
      private: private,
      owner: mohamed,
      memberCount: 1,
      standing: const GroupStanding(role: GroupRole.owner),
    );
    _groups.insert(0, g);
    _members[g.id] = const [
      GroupMember(member: mohamed, role: GroupRole.owner),
    ];
    return g;
  }

  @override
  Future<Group> setCover(String id, String file) async {
    calls.add('cover:$id');
    return _find(id);
  }

  @override
  Future<GroupStanding> join(String id) async {
    calls.add('join:$id');
    final g = _find(id);
    final s = g.private
        ? const GroupStanding(requested: true)
        : const GroupStanding(role: GroupRole.member);
    _put(g.withStanding(s));
    return s;
  }

  @override
  Future<GroupStanding> leave(String id) async {
    calls.add('leave:$id');
    _put(_find(id).withStanding(const GroupStanding()));
    return const GroupStanding();
  }

  @override
  Future<Page<GroupMember>> members(String id, {String? cursor}) async =>
      Page(_members[_find(id).id] ?? const []);

  @override
  Future<GroupMember> setRole(String id, String member, GroupRole role) async {
    calls.add('role:$id:$member:${role.name}');
    final list = _members[id]!;
    final i = list.indexWhere((m) => m.member.id == member);
    final m = GroupMember(member: list[i].member, role: role);
    _members[id] = [...list]..[i] = m;
    return m;
  }

  @override
  Future<void> remove(String id, String member) async {
    calls.add('remove:$id:$member');
    _members[id] = [
      for (final m in _members[id]!)
        if (m.member.id != member) m,
    ];
  }

  @override
  Future<Page<GroupMember>> requests(String id, {String? cursor}) async =>
      Page(_requests[id] ?? const []);

  @override
  Future<void> accept(String id, String member) async {
    calls.add('accept:$id:$member');
    _requests[id] = [
      for (final r in _requests[id]!)
        if (r.member.id != member) r,
    ];
  }

  @override
  Future<void> decline(String id, String member) async {
    calls.add('decline:$id:$member');
    _requests[id] = [
      for (final r in _requests[id]!)
        if (r.member.id != member) r,
    ];
  }
}
