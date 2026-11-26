import 'json.dart';

// The shapes of area A's contract (docs/api/community.yaml, components):
// MemberSummary, Relationship, Badge, Profile, Me, LinkedApp, Session,
// FriendRequest, Config. JSON is snake_case.

/// A verification badge: Gold "Pro Developer", Green "Verified Business",
/// Blue "Active Member". Only the highest shows beside a name.
enum BadgeKind {
  gold,
  green,
  blue;

  static BadgeKind? parse(String? value) => switch (value) {
    'gold' => gold,
    'green' => green,
    'blue' => blue,
    _ => null,
  };

  /// Gold, then Green, then Blue.
  int get rank => switch (this) {
    gold => 0,
    green => 1,
    blue => 2,
  };
}

/// A badge the member holds (the contract's `Badge`).
class EarnedBadge {
  const EarnedBadge({
    required this.kind,
    this.label,
    this.since,
    this.company,
    this.appUrl,
  });

  factory EarnedBadge.fromJson(Json json) => EarnedBadge(
    kind: BadgeKind.parse(optStr(json, 'kind')) ?? BadgeKind.blue,
    label: optStr(json, 'label'),
    since: optDate(json, 'since'),
    company: optStr(json, 'company_name'),
    appUrl: optStr(json, 'app_url'),
  );

  final BadgeKind kind;

  /// In the reader's language, from the server.
  final String? label;
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

/// An app made with the member's linked Yallapp account. Whether it is on
/// a paid plan is the server's to know; the app never shows it.
class LinkedApp {
  const LinkedApp({
    required this.id,
    required this.name,
    this.iconUrl,
    this.appStoreUrl,
    this.playStoreUrl,
    this.fromTemplate = false,
  });

  factory LinkedApp.fromJson(Json json) => LinkedApp(
    id: str(json, 'id'),
    name: str(json, 'name'),
    iconUrl: optStr(json, 'icon_url'),
    appStoreUrl: optStr(json, 'app_store_url'),
    playStoreUrl: optStr(json, 'play_store_url'),
    fromTemplate: boolean(json, 'from_template'),
  );

  final String id;
  final String name;
  final String? iconUrl;
  final String? appStoreUrl;
  final String? playStoreUrl;
  final bool fromTemplate;

  /// Where a tap opens the app: its App Store page, else Google Play's.
  String? get url => appStoreUrl ?? playStoreUrl;
}

/// Where the viewer stands with a member, as friends.
enum FriendState {
  none,

  /// The viewer asked; waiting for the member.
  requested,

  /// The member asked the viewer.
  incoming,
  friends;

  static FriendState parse(String? value) => switch (value) {
    'requested' => requested,
    'incoming' => incoming,
    'friends' => friends,
    _ => none,
  };
}

/// How the signed-in member stands with a member (absent signed out).
class Relationship {
  const Relationship({
    this.following = false,
    this.followsYou = false,
    this.friend = FriendState.none,
    this.friendRequestId,
    this.blocked = false,
  });

  factory Relationship.fromJson(Json? json) => json == null
      ? const Relationship()
      : Relationship(
          following: boolean(json, 'following'),
          followsYou: boolean(json, 'followed_by'),
          friend: FriendState.parse(optStr(json, 'friend')),
          friendRequestId: optStr(json, 'friend_request_id'),
          blocked: boolean(json, 'blocked'),
        );

  final bool following;
  final bool followsYou;
  final FriendState friend;

  /// The request between the two, while one is waiting.
  final String? friendRequestId;

  /// The viewer blocked them.
  final bool blocked;

  Relationship copyWith({
    bool? following,
    bool? followsYou,
    FriendState? friend,
    bool? blocked,
  }) => Relationship(
    following: following ?? this.following,
    followsYou: followsYou ?? this.followsYou,
    friend: friend ?? this.friend,
    friendRequestId: friend == null ? friendRequestId : null,
    blocked: blocked ?? this.blocked,
  );
}

/// A community member wherever they appear (an author, a follower).
class MemberSummary {
  const MemberSummary({
    required this.id,
    required this.name,
    required this.username,
    this.avatarUrl,
    this.badge,
    this.level,
    this.team = false,
    this.deleted = false,
    this.relationship,
    this.rank,
  });

  factory MemberSummary.fromJson(Json json) => MemberSummary(
    id: str(json, 'id'),
    name: str(json, 'display_name'),
    username: str(json, 'username'),
    avatarUrl: optStr(json, 'avatar_url'),
    badge: BadgeKind.parse(optStr(json, 'top_badge')),
    // The level's name in the reader's language ("Pro"), else their
    // headline.
    level:
        optStr(json, 'level_label') ??
        optStr(json, 'rank_label') ??
        optStr(json, 'headline'),
    rank: optStr(json, 'level') ?? optStr(json, 'rank'),
    team: boolean(json, 'team'),
    deleted: boolean(json, 'deleted'),
    relationship: optObject(json, 'relationship') == null
        ? null
        : Relationship.fromJson(optObject(json, 'relationship')),
  );

  final String id;
  final String name;
  final String username;
  final String? avatarUrl;

  /// The highest badge only.
  final BadgeKind? badge;

  /// The member's headline ("Expert", "Flutter developer"), as the design
  /// shows it under a name.
  final String? level;

  /// Yallapp's team ("Yallapp Team").
  final bool team;

  /// A deleted member ("Deleted member", nothing to open).
  final bool deleted;

  /// Where the viewer stands with them (signed in only).
  final Relationship? relationship;

  /// Their level by points (`level`): newcomer, member, contributor, pro,
  /// expert, master.
  final String? rank;

  String get initial => name.trim().isEmpty ? '?' : name.trim().characters1;
}

extension on String {
  String get characters1 =>
      isEmpty ? '' : String.fromCharCode(runes.first).toUpperCase();
}

/// A link on a profile.
class ProfileLink {
  const ProfileLink({required this.label, required this.url});

  factory ProfileLink.fromJson(Json json) =>
      ProfileLink(label: str(json, 'label'), url: str(json, 'url'));

  final String label;
  final String url;

  Json toJson() => {'label': label, 'url': url};
}

/// What only the member sees of their own account (the contract's `Me`).
class Account {
  const Account({
    this.email,
    this.emailVerified = false,
    this.hasPassword = false,
    this.providers = const [],
    this.language = 'en',
    this.theme = 'system',
    this.role = 'member',
    this.unreadNotifications = 0,
    this.pendingFriendRequests = 0,
    this.communityRole,
    this.linkSuggestion,
  });

  factory Account.fromJson(Json json) => Account(
    email: optStr(json, 'email'),
    emailVerified: boolean(json, 'email_verified'),
    hasPassword: boolean(json, 'has_password'),
    providers: strings(json, 'providers'),
    language: str(json, 'language', 'en'),
    theme: str(json, 'theme', 'system'),
    role: str(json, 'role', 'member'),
    unreadNotifications: integer(json, 'unread_notifications'),
    pendingFriendRequests: integer(json, 'pending_friend_requests'),
    communityRole: optStr(json, 'community_role'),
    linkSuggestion: optObject(json, 'link_suggestion') == null
        ? null
        : LinkSuggestion.fromJson(optObject(json, 'link_suggestion')!),
  );

  final String? email;
  final bool emailVerified;
  final bool hasPassword;

  /// `email`, `apple`, `google`.
  final List<String> providers;
  final String language;

  /// `system`, `light`, `dark`.
  final String theme;

  /// `member`, `team`, `admin`.
  final String role;
  final int unreadNotifications;
  final int pendingFriendRequests;

  /// `admin` or `moderator` for those who run the community (the website
  /// has their tools), else null.
  final String? communityRole;

  /// A Yallapp account with the member's email, not linked yet (`null`: none,
  /// or dismissed).
  final LinkSuggestion? linkSuggestion;
}

/// "We found your Yallapp account. Link it?" (`Me.link_suggestion`).
class LinkSuggestion {
  const LinkSuggestion({this.available = false, this.accountName});

  factory LinkSuggestion.fromJson(Json json) => LinkSuggestion(
    available: boolean(json, 'available'),
    accountName: optStr(json, 'account_name'),
  );

  final bool available;

  /// The Yallapp account's name, when the server gives it.
  final String? accountName;
}

/// A member's profile (the contract's `Profile`; with [account], `Me`).
class Profile {
  const Profile({
    required this.member,
    this.bio = '',
    this.skills = const [],
    this.links = const [],
    this.badges = const [],
    this.points = 0,
    this.followers = 0,
    this.following = 0,
    this.friends = 0,
    this.questions = 0,
    this.answers = 0,
    this.acceptedAnswers = 0,
    this.appsCount = 0,
    this.joinedAt,
    this.apps = const [],
    this.yallappLinked = false,
    this.relationship = const Relationship(),
    this.account,
    this.levelProgress = 0,
  });

  /// [apps] come from `GET /members/{member}/apps`.
  factory Profile.fromJson(Json json, {List<LinkedApp> apps = const []}) {
    final counts = optObject(json, 'counts') ?? const {};
    final own = json.containsKey('email_verified');
    return Profile(
      member: MemberSummary.fromJson(json),
      bio: str(json, 'bio'),
      skills: strings(json, 'skills'),
      links: listOf(json, 'links', ProfileLink.fromJson),
      badges: listOf(json, 'badges', EarnedBadge.fromJson),
      points: integer(json, 'points'),
      followers: integer(counts, 'followers'),
      following: integer(counts, 'following'),
      friends: integer(counts, 'friends'),
      questions: integer(counts, 'questions'),
      answers: integer(counts, 'answers'),
      acceptedAnswers: integer(counts, 'accepted_answers'),
      appsCount: integer(counts, 'apps'),
      joinedAt: optDate(json, 'joined_at'),
      apps: apps,
      yallappLinked: boolean(json, 'yallapp_linked'),
      relationship: Relationship.fromJson(optObject(json, 'relationship')),
      account: own ? Account.fromJson(json) : null,
      levelProgress: number(json, 'level_progress').clamp(0, 1).toDouble(),
    );
  }

  final MemberSummary member;
  final String bio;
  final List<String> skills;
  final List<ProfileLink> links;

  /// Every badge held (the profile lists them all).
  final List<EarnedBadge> badges;
  final int points;
  final int followers;
  final int following;
  final int friends;
  final int questions;
  final int answers;
  final int acceptedAnswers;

  /// How many apps the linked account has (the Gold form opens at 5).
  final int appsCount;
  final DateTime? joinedAt;

  /// The linked Yallapp account's apps.
  final List<LinkedApp> apps;
  final bool yallappLinked;
  final Relationship relationship;

  /// The member's own account (their own profile only).
  final Account? account;

  /// How far toward the next level, 0 to 1 (`level_progress`, the side
  /// menu's bar; 1 at the top level).
  final double levelProgress;

  double get progress => levelProgress;

  Profile copyWith({
    MemberSummary? member,
    String? bio,
    List<String>? skills,
    Relationship? relationship,
    int? followers,
    int? friends,
    List<LinkedApp>? apps,
    bool? yallappLinked,
    Account? account,
  }) => Profile(
    member: member ?? this.member,
    bio: bio ?? this.bio,
    skills: skills ?? this.skills,
    links: links,
    badges: badges,
    points: points,
    followers: followers ?? this.followers,
    following: following,
    friends: friends ?? this.friends,
    questions: questions,
    answers: answers,
    acceptedAnswers: acceptedAnswers,
    appsCount: appsCount,
    joinedAt: joinedAt,
    apps: apps ?? this.apps,
    yallappLinked: yallappLinked ?? this.yallappLinked,
    relationship: relationship ?? this.relationship,
    account: account ?? this.account,
    levelProgress: levelProgress,
  );
}

/// The member's tokens: a short access token (15 minutes) and a refresh
/// token (60 days, renewed each time it is used).
class Session {
  const Session({
    required this.accessToken,
    this.refreshToken,
    this.accessExpiresAt,
  });

  factory Session.fromJson(Json json) => Session(
    accessToken: str(json, 'access_token'),
    refreshToken: optStr(json, 'refresh_token'),
    accessExpiresAt: optDate(json, 'access_expires_at'),
  );

  final String accessToken;
  final String? refreshToken;
  final DateTime? accessExpiresAt;

  Json toJson() => {
    'access_token': accessToken,
    'refresh_token': ?refreshToken,
    if (accessExpiresAt != null)
      'access_expires_at': accessExpiresAt!.toIso8601String(),
  };
}

/// What signing in answers: the tokens and the member.
class SignedIn {
  const SignedIn({required this.session, required this.me, this.isNew = false});

  factory SignedIn.fromJson(Json json) => SignedIn(
    session: Session.fromJson(json),
    me: Profile.fromJson(optObject(json, 'member') ?? const {}),
    isNew: boolean(json, 'created'),
  );

  final Session session;
  final Profile me;

  /// This sign-in made the member.
  final bool isNew;
}

/// A friend request sent to the member ([incoming]) or by them.
class FriendRequest {
  const FriendRequest({
    required this.id,
    required this.member,
    this.incoming = true,
    this.at,
  });

  factory FriendRequest.fromJson(Json json, {bool incoming = true}) =>
      FriendRequest(
        id: str(json, 'id'),
        member: MemberSummary.fromJson(optObject(json, 'member') ?? const {}),
        incoming: incoming,
        at: optDate(json, 'created_at'),
      );

  final String id;
  final MemberSummary member;
  final bool incoming;
  final DateTime? at;
}

/// Why something is reported (the contract's reasons).
enum ReportReason {
  spam,
  harassment,
  hate,
  inappropriate,
  misinformation,
  impersonation,
  other;

  String get wire => name;
}

/// A section of the side menu or the tab bar (`GET /config`).
class Section {
  const Section({
    required this.slug,
    required this.name,
    required this.icon,
    this.count,
    this.comingSoon = false,
  });

  factory Section.fromJson(Json json) => Section(
    slug: str(json, 'slug'),
    name: str(json, 'name'),
    icon: str(json, 'icon'),
    count: optInt(json, 'count'),
    comingSoon: boolean(json, 'coming_soon'),
  );

  final String slug;

  /// In the reader's language.
  final String name;

  /// A Material Symbols Rounded name.
  final String icon;
  final int? count;
  final bool comingSoon;
}

/// The sections, what is coming soon, the languages (`GET /config`).
class CommunityConfig {
  const CommunityConfig({
    this.sections = const [],
    this.tabs = const [],
    this.languages = const ['en', 'ar', 'tr'],
    this.siteUrl,
  });

  factory CommunityConfig.fromJson(Json json) => CommunityConfig(
    sections: listOf(json, 'sections', Section.fromJson),
    tabs: listOf(json, 'tabs', Section.fromJson),
    languages: strings(json, 'languages'),
    siteUrl: optStr(json, 'site_url'),
  );

  final List<Section> sections;
  final List<Section> tabs;
  final List<String> languages;
  final String? siteUrl;

  /// Phase 1: home, Q&A, tutorials and friends open; the rest are coming.
  static const phase1Open = {'home', 'qa', 'tutorials', 'friends', 'learn'};

  /// Whether the section [slug] opens nothing yet: the server's word, else
  /// phase 1's.
  bool comingSoon(String slug) {
    for (final s in [...sections, ...tabs]) {
      if (s.slug == slug) return s.comingSoon;
    }
    return !phase1Open.contains(slug);
  }

  /// The section's count (the menu's numbers), if the server sends one.
  int? count(String slug) {
    for (final s in sections) {
      if (s.slug == slug) return s.count;
    }
    return null;
  }
}
