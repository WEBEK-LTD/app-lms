import 'package:dio/dio.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/http_client.dart';
import '../../../core/api/models/json.dart';
import '../../../core/api/models/models.dart';
import '../../../core/config/build_config_json.dart' show argbOf;
import '../../../core/l10n/l10n.dart';

/// 104.8.4 The Yallapp Courier account: the mobile number or email the
/// person signed in with (docs/api/courier.yaml, `Session.account`).
class CourierAccount {
  const CourierAccount({required this.id, this.phone, this.email});

  factory CourierAccount.fromJson(Json json) => CourierAccount(
    id: '${json['id'] ?? ''}',
    phone: optString(json, 'phone'),
    email: optString(json, 'email'),
  );

  final String id;
  final String? phone;
  final String? email;
}

/// 104.8.4 What the Courier API's `/auth/otp/verify` and `/auth/refresh`
/// answer.
class CourierHubSession {
  const CourierHubSession({required this.tokens, this.account});

  factory CourierHubSession.fromJson(Json json) => CourierHubSession(
    tokens: Tokens.fromJson(json),
    account: json['account'] is Map
        ? CourierAccount.fromJson(asJson(json['account']))
        : null,
  );

  final Tokens tokens;
  final CourierAccount? account;
}

/// 104.8.4 A company the person delivers for on Yallapp Courier
/// (`GET /companies`): its hosted API, name, logo and colour, and where the
/// courier stands there.
class CourierCompany {
  const CourierCompany({
    required this.appId,
    required this.name,
    required this.apiBaseUrl,
    this.logoUrl,
    this.primaryColor,
    this.onDuty = false,
    this.jobsWaiting = 0,
    this.paused = false,
  });

  factory CourierCompany.fromJson(Json json) => CourierCompany(
    appId: reqString(json, 'app_id'),
    name: reqString(json, 'name'),
    apiBaseUrl: reqString(json, 'api_base_url'),
    logoUrl: optString(json, 'logo_url'),
    primaryColor: _color(json['primary_color']),
    onDuty: boolOr(json, 'on_duty', false),
    jobsWaiting: intOr(json, 'jobs_waiting', 0),
    paused: boolOr(json, 'paused', false),
  );

  final String appId;
  final String name;

  /// The company's hosted API, `https://{platform}/api/app/{app_id}`.
  final String apiBaseUrl;
  final String? logoUrl;

  /// ARGB, or null when the company has none.
  final int? primaryColor;
  final bool onDuty;
  final int jobsWaiting;

  /// The company paused this courier: it can't be opened.
  final bool paused;

  static int? _color(Object? hex) {
    final value = argbOf(hex, 0);
    return value == 0 ? null : value;
  }
}

/// 104.8.4 The Yallapp Courier API (docs/api/courier.yaml,
/// `https://{platform}/api/courier/v1`): sign-in with a code, the companies
/// and a session at one of them. Tests replace it.
abstract class CourierHubApi {
  /// Sends a code to [phone] (`+201…`) or [email].
  Future<OtpRequestResult> requestCode({String? phone, String? email});

  Future<CourierHubSession> verifyCode({
    required String requestId,
    required String code,
    required DeviceInput device,
  });

  Future<Tokens> refreshTokens(String refreshToken);

  /// Ends this device and every company session it opened.
  Future<void> signOut();

  /// The device's push token, which the platform copies to the company
  /// sessions it opened.
  Future<void> setPushToken(String? token, PushProvider provider);

  Future<List<CourierCompany>> listCompanies();

  /// The company's hosted session (as the hosted `POST /auth/otp/verify`
  /// answers). 404 `not_found`: not one of the person's companies; 403
  /// `not_courier`: the company paused them.
  Future<Session> openCompany(String appId, DeviceInput device);
}

/// The [CourierHubApi] over HTTP.
class HttpCourierHubApi implements CourierHubApi {
  HttpCourierHubApi({required this._dio, required this._refreshDio});

  final Dio _dio;

  /// Only for `POST /auth/refresh`, without the auth interceptor.
  final Dio _refreshDio;

  Future<T> _call<T>(
    Future<Response<dynamic>> Function() send,
    T Function(dynamic data) parse,
  ) async {
    final Response<dynamic> response;
    try {
      response = await send();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
    try {
      return parse(response.data);
    } on FormatException catch (e) {
      throw ApiException(
        code: ApiException.invalidResponse,
        message: currentL10n.errorInvalidResponse,
        statusCode: response.statusCode,
        details: {'reason': e.message},
      );
    }
  }

  Future<T> _send<T>(
    String method,
    String path,
    AuthMode auth,
    T Function(dynamic data) parse, {
    Object? body,
  }) => _call(
    () => _dio.request<dynamic>(
      path,
      data: body,
      options: authOptions(auth, Options(method: method)),
    ),
    parse,
  );

  static void _ignore(dynamic _) {}

  @override
  Future<OtpRequestResult> requestCode({String? phone, String? email}) => _send(
    'POST',
    '/auth/otp/request',
    AuthMode.none,
    (data) => courierOtpRequest(asJson(data)),
    body: {'phone': ?phone, 'email': ?email},
  );

  @override
  Future<CourierHubSession> verifyCode({
    required String requestId,
    required String code,
    required DeviceInput device,
  }) => _send(
    'POST',
    '/auth/otp/verify',
    AuthMode.none,
    (data) => CourierHubSession.fromJson(asJson(data)),
    body: {'request_id': requestId, 'code': code, 'device': device.toJson()},
  );

  @override
  Future<Tokens> refreshTokens(String refreshToken) => _call(
    () => _refreshDio.post<dynamic>(
      '/auth/refresh',
      data: {'refresh_token': refreshToken},
    ),
    (data) => Tokens.fromJson(asJson(data)),
  );

  @override
  Future<void> signOut() =>
      _send('POST', '/auth/sign-out', AuthMode.required, _ignore);

  @override
  Future<void> setPushToken(String? token, PushProvider provider) => _send(
    'PUT',
    '/me/push-token',
    AuthMode.required,
    _ignore,
    body: {'token': token, 'provider': provider.name},
  );

  @override
  Future<List<CourierCompany>> listCompanies() => _send(
    'GET',
    '/companies',
    AuthMode.required,
    (data) => listOf(asJson(data), 'items', CourierCompany.fromJson),
  );

  @override
  Future<Session> openCompany(String appId, DeviceInput device) => _send(
    'POST',
    '/companies/${Uri.encodeComponent(appId)}/session',
    AuthMode.required,
    (data) => Session.fromJson(asJson(data)),
    body: {'device': device.toJson()},
  );
}

/// The Courier API's `{request_id, expires_in}` as the sign-in screens'
/// request: six digits, a new code after a minute (the hosted API's), unless
/// it says otherwise.
OtpRequestResult courierOtpRequest(Json json) => OtpRequestResult(
  requestId: reqString(json, 'request_id'),
  codeLength: intOr(json, 'code_length', 6),
  resendAfterSeconds: intOr(json, 'resend_after_seconds', 60),
  expiresInSeconds:
      optInt(json, 'expires_in') ?? intOr(json, 'expires_in_seconds', 600),
);
