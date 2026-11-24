import 'json.dart';

/// A verification badge (the brief: Gold "Pro Developer", Green "Verified
/// Business", Blue "Active Member"). Only the highest shows beside a name.
enum BadgeKind {
  gold,
  green,
  blue;

  static BadgeKind? parse(String? value) => switch (value) {
    'gold' || 'pro_developer' => gold,
    'green' || 'verified_business' => green,
    'blue' || 'active_member' => blue,
    _ => null,
  };

  /// Gold, then Green, then Blue.
  int get rank => switch (this) {
    gold => 0,
    green => 1,
    blue => 2,
  };
}

class EarnedBadge {
  const EarnedBadge({
    required this.kind,
    this.since,
    this.company,
    this.appUrl,
  });

  factory EarnedBadge.fromJson(Json json) => EarnedBadge(
    kind:
        BadgeKind.parse(optStr(json, 'kind') ?? optStr(json, 'type')) ??
        BadgeKind.blue,
    since: optDate(json, 'granted_at') ?? optDate(json, 'since'),
    company: optStr(json, 'company_name') ?? optStr(json, 'company'),
    appUrl: optStr(json, 'app_url'),
  );

  final BadgeKind kind;
  final DateTime? since;

  /// Green: the business and its app.
  final String? company;
  final String? appUrl;
}

/// The highest badge of [badges] (the one shown beside a name), or null.
EarnedBadge? topBadge(Iterable<EarnedBadge> badges) {
  EarnedBadge? top;
  for (final b in badges) {
    if (top == null || b.kind.rank < top.kind.rank) top = b;
  }
  return top;
}

/// An app of the member's linked Yallapp account.
class LinkedApp {
  const LinkedApp({
    required this.id,
    required this.name,
    this.url,
    this.iconUrl,
    this.kind,
  });

  factory LinkedApp.fromJson(Json json) => LinkedApp(
    id: str(json, 'id'),
    name: str(json, 'name'),
    url: optStr(json, 'url'),
    iconUrl: optStr(json, 'icon_url'),
    kind: optStr(json, 'kind'),
  );

  final String id;
  final String name;
  final String? url;
  final String? iconUrl;
  final String? kind;
}

/// Where the viewer stands with a member.
enum FriendState {
  none,

  /// The viewer asked; waiting for the member.
  requested,

  /// The member asked the viewer.
  incoming,
  friends;

  static FriendState parse(String? value) => switch (value) {
    'requested' || 'outgoing' || 'pending_outgoing' => requested,
    'incoming' || 'pending_incoming' => incoming,
    'friends' || 'accepted' => friends,
    _ => none,
  };
}

class Relationship {
  const Relationship({
    this.following = false,
    this.followsYou = false,
    this.friend = FriendState.none,
    this.blocked = false,
  });

  factory Relationship.fromJson(Json? json) => json == null
      ? const Relationship()
      : Relationship(
          following: boolean(json, 'following'),
          followsYou:
              boolean(json, 'followed_by') || boolean(json, 'follows_you'),
          friend: FriendState.parse(
            optStr(json, 'friend') ?? optStr(json, 'friendship'),
          ),
          blocked: boolean(json, 'blocked'),
        );

  final bool following;
  final bool followsYou;
  final FriendState friend;
  final bool blocked;

  Relationship copyWith({
    bool? following,
    FriendState? friend,
    bool? blocked,
  }) => Relationship(
    following: following ?? this.following,
    followsYou: followsYou,
    friend: friend ?? this.friend,
    blocked: blocked ?? this.blocked,
  );
}

/// A community member as a list shows them.
class MemberSummary {
  const MemberSummary({
    required this.id,
    required this.name,
    required this.username,
    this.avatarUrl,
    this.badge,
    this.level,
    this.team = false,
  });

  factory MemberSummary.fromJson(Json json) => MemberSummary(
    id: str(json, 'id'),
    name: str(json, 'display_name', str(json, 'name')),
    username: str(json, 'username'),
    avatarUrl: optStr(json, 'avatar_url'),
    badge: BadgeKind.parse(optStr(json, 'badge') ?? optStr(json, 'top_badge')),
    level: optStr(json, 'level'),
    team: boolean(json, 'team') || boolean(json, 'is_team'),
  );

  final String id;
  final String name;
  final String username;
  final String? avatarUrl;

  /// The highest badge only.
  final BadgeKind? badge;

  /// "Expert", "Pro"… (the member's level).
  final String? level;

  /// The Yallapp Team (official answers).
  final bool team;

  String get initial => name.trim().isEmpty ? '?' : name.trim().characters1;
}

extension on String {
  String get characters1 =>
      isEmpty ? '' : String.fromCharCode(runes.first).toUpperCase();
}

/// A member's profile.
class Profile {
  const Profile({
    required this.member,
    this.bio = '',
    this.skills = const [],
    this.badges = const [],
    this.points = 0,
    this.followers = 0,
    this.following = 0,
    this.friends = 0,
    this.joinedAt,
    this.apps = const [],
    this.yallappLinked = false,
    this.relationship = const Relationship(),
    this.answers = 0,
    this.questions = 0,
    this.levelProgress,
  });

  factory Profile.fromJson(Json json) {
    final counts = optObject(json, 'counts') ?? json;
    return Profile(
      member: MemberSummary.fromJson(json),
      bio: str(json, 'bio'),
      skills: strings(json, 'skills'),
      badges: listOf(json, 'badges', EarnedBadge.fromJson),
      points: integer(json, 'points'),
      followers: integer(counts, 'followers'),
      following: integer(counts, 'following'),
      friends: integer(counts, 'friends'),
      answers: integer(counts, 'answers'),
      questions: integer(counts, 'questions'),
      joinedAt: optDate(json, 'joined_at') ?? optDate(json, 'created_at'),
      apps: listOf(json, 'apps', LinkedApp.fromJson),
      yallappLinked:
          boolean(json, 'yallapp_linked') || optObject(json, 'yallapp') != null,
      relationship: Relationship.fromJson(optObject(json, 'relationship')),
      levelProgress: optNumber(json, 'level_progress'),
    );
  }

  final MemberSummary member;
  final String bio;
  final List<String> skills;

  /// Every badge earned (the profile lists them all).
  final List<EarnedBadge> badges;
  final int points;
  final int followers;
  final int following;
  final int friends;
  final int answers;
  final int questions;
  final DateTime? joinedAt;

  /// The linked Yallapp account's apps.
  final List<LinkedApp> apps;
  final bool yallappLinked;
  final Relationship relationship;

  /// How far to the next level, 0 to 1 (the menu's bar); the server's, else
  /// the share of the way to the next points milestone.
  final double? levelProgress;

  static const _milestones = [0, 100, 500, 1000, 2500, 5000, 10000, 25000];

  double get progress {
    final own = levelProgress;
    if (own != null) return own.clamp(0, 1).toDouble();
    for (var i = 1; i < _milestones.length; i++) {
      if (points < _milestones[i]) {
        return (points - _milestones[i - 1]) /
            (_milestones[i] - _milestones[i - 1]);
      }
    }
    return 1;
  }

  Profile copyWith({
    Relationship? relationship,
    int? followers,
    int? friends,
    String? bio,
    List<String>? skills,
    MemberSummary? member,
  }) => Profile(
    member: member ?? this.member,
    bio: bio ?? this.bio,
    skills: skills ?? this.skills,
    badges: badges,
    points: points,
    followers: followers ?? this.followers,
    following: following,
    friends: friends ?? this.friends,
    answers: answers,
    questions: questions,
    joinedAt: joinedAt,
    apps: apps,
    yallappLinked: yallappLinked,
    relationship: relationship ?? this.relationship,
    levelProgress: levelProgress,
  );
}

/// The signed-in member's session.
class Session {
  const Session({required this.accessToken, this.refreshToken, this.expiresAt});

  factory Session.fromJson(Json json) => Session(
    accessToken: str(json, 'access_token', str(json, 'token')),
    refreshToken: optStr(json, 'refresh_token'),
    expiresAt: optDate(json, 'expires_at'),
  );

  final String accessToken;
  final String? refreshToken;
  final DateTime? expiresAt;

  Json toJson() => {
    'access_token': accessToken,
    'refresh_token': ?refreshToken,
    if (expiresAt != null) 'expires_at': expiresAt!.toIso8601String(),
  };
}

/// What signing in answers: the session and the member.
class SignedIn {
  const SignedIn({required this.session, required this.me, this.isNew = false});

  final Session session;
  final Profile me;

  /// A new account (the app asks for the rest of the profile).
  final bool isNew;
}

/// A friend request waiting for the viewer, or sent by them.
class FriendRequest {
  const FriendRequest({
    required this.id,
    required this.member,
    this.incoming = true,
    this.at,
  });

  factory FriendRequest.fromJson(Json json) => FriendRequest(
    id: str(json, 'id'),
    member: MemberSummary.fromJson(
      optObject(json, 'member') ?? optObject(json, 'from') ?? json,
    ),
    incoming: str(json, 'direction', 'incoming') == 'incoming',
    at: optDate(json, 'created_at'),
  );

  final String id;
  final MemberSummary member;
  final bool incoming;
  final DateTime? at;
}

/// Why something is reported.
enum ReportReason { spam, abuse, inappropriate, misleading, other }
