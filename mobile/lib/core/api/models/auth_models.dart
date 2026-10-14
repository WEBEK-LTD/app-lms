import 'config_models.dart';
import 'json.dart';

class OtpRequestResult {
  const OtpRequestResult({
    required this.requestId,
    required this.codeLength,
    required this.resendAfterSeconds,
    required this.expiresInSeconds,
  });

  factory OtpRequestResult.fromJson(Json json) => OtpRequestResult(
    requestId: reqString(json, 'request_id'),
    codeLength: reqInt(json, 'code_length'),
    resendAfterSeconds: reqInt(json, 'resend_after_seconds'),
    expiresInSeconds: reqInt(json, 'expires_in_seconds'),
  );

  final String requestId;
  final int codeLength;
  final int resendAfterSeconds;
  final int expiresInSeconds;
}

class Tokens {
  const Tokens({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });

  factory Tokens.fromJson(Json json) => Tokens(
    accessToken: reqString(json, 'access_token'),
    refreshToken: reqString(json, 'refresh_token'),
    expiresIn: reqInt(json, 'expires_in'),
  );

  final String accessToken;
  final String refreshToken;

  /// Access token lifetime in seconds.
  final int expiresIn;
}

/// What `POST /auth/otp/verify` returns: a session or a sign-up step.
sealed class VerifyResult {
  const VerifyResult();

  factory VerifyResult.fromJson(Json json) {
    if (json['signup_required'] == true) {
      return SignupRequired.fromJson(json);
    }
    return Session.fromJson(json);
  }
}

class Session extends VerifyResult {
  const Session({required this.tokens, required this.user});

  factory Session.fromJson(Json json) => Session(
    tokens: Tokens.fromJson(json),
    user: User.fromJson(asJson(json['user'], 'user')),
  );

  final Tokens tokens;
  final User user;
}

class SignupRequired extends VerifyResult {
  const SignupRequired({required this.signupToken, required this.fields});

  factory SignupRequired.fromJson(Json json) => SignupRequired(
    signupToken: reqString(json, 'signup_token'),
    fields: parseSignupFields(json, 'fields'),
  );

  final String signupToken;
  final List<SignupField> fields;
}

class User {
  const User({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    this.city,
    this.avatarUrl,
  });

  factory User.fromJson(Json json) => User(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    // 18 Null (or empty) for someone who signed up by email.
    phone: optString(json, 'phone') ?? '',
    email: optString(json, 'email'),
    city: optString(json, 'city'),
    avatarUrl: optString(json, 'avatar_url'),
  );

  final int id;
  final String name;
  final String phone;
  final String? email;
  final String? city;
  final String? avatarUrl;

  Json toJson() => {
    'id': id,
    'name': name,
    'phone': phone,
    'email': email,
    'city': city,
    'avatar_url': avatarUrl,
  };
}

enum DevicePlatform { android, ios }

class DeviceInput {
  const DeviceInput({
    required this.id,
    required this.platform,
    required this.name,
    this.appVersion,
  });

  final String id;
  final DevicePlatform platform;
  final String name;
  final String? appVersion;

  Json toJson() => {
    'id': id,
    'platform': platform.name,
    'name': name,
    if (appVersion != null) 'app_version': appVersion,
  };
}

class Device {
  const Device({
    required this.id,
    required this.platform,
    required this.name,
    required this.lastSeenAt,
    required this.current,
  });

  factory Device.fromJson(Json json) => Device(
    id: reqString(json, 'id'),
    platform: enumFrom(
      DevicePlatform.values,
      json['platform'],
      DevicePlatform.android,
    ),
    name: reqString(json, 'name'),
    lastSeenAt: reqDate(json, 'last_seen_at'),
    current: reqBool(json, 'current'),
  );

  final String id;
  final DevicePlatform platform;
  final String name;
  final DateTime lastSeenAt;
  final bool current;
}

class DeviceList {
  const DeviceList({required this.items, required this.limit});

  factory DeviceList.fromJson(Json json) => DeviceList(
    items: reqListOf(json, 'items', Device.fromJson),
    limit: reqInt(json, 'limit'),
  );

  final List<Device> items;
  final int limit;
}

class NotificationPreferences {
  const NotificationPreferences({
    this.newLessons = true,
    this.announcements = true,
    this.dailyReminder = false,
    this.news = true,
    this.donations = false,
  });

  factory NotificationPreferences.fromJson(Json json) =>
      NotificationPreferences(
        newLessons: boolOr(json, 'new_lessons', true),
        announcements: boolOr(json, 'announcements', true),
        dailyReminder: boolOr(json, 'daily_reminder', false),
        news: boolOr(json, 'news', true),
        donations: boolOr(json, 'donations', false),
      );

  final bool newLessons;
  final bool announcements;
  final bool dailyReminder;

  /// New articles (News & blog apps).
  final bool news;

  /// 29 Updates about campaigns the user gave to; off until turned on.
  final bool donations;

  NotificationPreferences copyWith({
    bool? newLessons,
    bool? announcements,
    bool? dailyReminder,
    bool? news,
    bool? donations,
  }) => NotificationPreferences(
    newLessons: newLessons ?? this.newLessons,
    announcements: announcements ?? this.announcements,
    dailyReminder: dailyReminder ?? this.dailyReminder,
    news: news ?? this.news,
    donations: donations ?? this.donations,
  );

  Json toJson() => {
    'new_lessons': newLessons,
    'announcements': announcements,
    'daily_reminder': dailyReminder,
    'news': news,
    'donations': donations,
  };
}

enum CheckoutTarget { inApp, browser }

class CheckoutLink {
  const CheckoutLink({
    required this.url,
    required this.expiresAt,
    required this.openIn,
  });

  factory CheckoutLink.fromJson(Json json) => CheckoutLink(
    url: reqString(json, 'url'),
    expiresAt: reqDate(json, 'expires_at'),
    openIn: enumFromSnake(
      CheckoutTarget.values,
      json['open_in'],
      CheckoutTarget.inApp,
    ),
  );

  final String url;
  final DateTime expiresAt;
  final CheckoutTarget openIn;
}
