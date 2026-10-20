import 'package:dio/dio.dart';

import '../auth/token_manager.dart';
import 'api_exception.dart';
import 'json.dart';
import 'models.dart';
import 'owner_api.dart';

const _publicKey = 'yb.public';
const _retriedKey = 'yb.retried';

/// 59 The Owner API on yallapp.com.tr.
class HttpOwnerApi implements OwnerApi {
  HttpOwnerApi({
    required String baseUrl,
    required String Function() language,
    this.tokens,
    HttpClientAdapter? adapter,
    void Function(ApiException error)? onAccountBlocked,
  }) : _dio = Dio(
         BaseOptions(
           baseUrl: baseUrl,
           connectTimeout: const Duration(seconds: 15),
           receiveTimeout: const Duration(seconds: 30),
           sendTimeout: const Duration(seconds: 30),
           contentType: Headers.jsonContentType,
           responseType: ResponseType.json,
           headers: {Headers.acceptHeader: Headers.jsonContentType},
         ),
       ) {
    if (adapter != null) _dio.httpClientAdapter = adapter;
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          options.headers['Accept-Language'] = language();
          handler.next(options);
        },
      ),
    );
    final manager = tokens;
    if (manager != null) {
      _dio.interceptors.add(_AuthInterceptor(_dio, manager));
    }
    if (onAccountBlocked != null) {
      _dio.interceptors.add(
        InterceptorsWrapper(
          onError: (error, handler) {
            final e = ApiException.fromDio(error);
            if (e.accountNotActive) onAccountBlocked(e);
            handler.next(error);
          },
        ),
      );
    }
  }

  final Dio _dio;

  /// Sends the person's token; null for a client that only signs in.
  final TokenManager? tokens;

  Options get _public => Options(extra: {_publicKey: true});

  Future<Json> _send(
    String method,
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    bool public = false,
  }) async {
    try {
      final response = await _dio.request<Object?>(
        path,
        data: body,
        queryParameters: query == null
            ? null
            : {
                for (final e in query.entries)
                  if (e.value != null) e.key: e.value,
              },
        options: (public ? _public : Options()).copyWith(method: method),
      );
      final data = response.data;
      if (data == null || data == '') return const {};
      if (data is Map) return asJson(data);
      throw const ApiException(code: 'invalid_response');
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Json> _get(String path, {Map<String, dynamic>? query}) =>
      _send('GET', path, query: query);
  Future<Json> _post(String path, [Object? body]) =>
      _send('POST', path, body: body ?? const <String, dynamic>{});
  Future<Json> _put(String path, Object body) => _send('PUT', path, body: body);
  Future<Json> _patch(String path, Object body) =>
      _send('PATCH', path, body: body);
  Future<Json> _delete(String path) => _send('DELETE', path);

  String _app(String appId) => '/apps/${Uri.encodeComponent(appId)}';

  // Auth

  @override
  Future<Session> signIn({
    required String email,
    required String password,
    required DeviceInfo device,
  }) async => Session.fromJson(
    await _send(
      'POST',
      '/auth/sign-in',
      public: true,
      body: {
        'email': email.trim(),
        'password': password,
        'device': device.toJson(),
      },
    ),
  );

  @override
  Future<Session> refresh(String refreshToken) async => Session.fromJson(
    await _send(
      'POST',
      '/auth/refresh',
      public: true,
      body: {'refresh_token': refreshToken},
    ),
  );

  @override
  Future<void> signOut() => _post('/auth/sign-out');

  @override
  Future<void> signOutAll() => _post('/auth/sign-out-all');

  @override
  Future<String> passwordResetLink() async =>
      str(await _send('GET', '/auth/password-reset', public: true), 'url');

  // Account

  @override
  Future<Me> me() async => Me.fromJson(await _get('/me'));

  @override
  Future<Me> setLanguage(String? language) async =>
      Me.fromJson(await _put('/me/language', {'language': language}));

  // 60 Team members

  @override
  Future<Me> setBusiness(String businessId) async =>
      Me.fromJson(await _put('/me/business', {'business_id': businessId}));

  @override
  Future<Team> team() async => Team.fromJson(await _get('/team'));

  @override
  Future<TeamInvitation> inviteTeamMember({
    required String name,
    required String email,
    required TeamRole role,
    List<String> areas = const [],
    List<String>? appIds,
  }) async => TeamInvitation.fromJson(
    await _post('/team/invitations', {
      'name': name,
      'email': email,
      'role': role.name,
      'areas': areas,
      'app_ids': appIds,
    }),
  );

  @override
  Future<TeamInvitation> resendInvitation(String invitationId) async =>
      TeamInvitation.fromJson(
        await _post(
          '/team/invitations/${Uri.encodeComponent(invitationId)}/resend',
        ),
      );

  @override
  Future<void> cancelInvitation(String invitationId) =>
      _delete('/team/invitations/${Uri.encodeComponent(invitationId)}');

  @override
  Future<TeamMember> updateTeamMember(
    String userId, {
    required TeamRole role,
    List<String> areas = const [],
    List<String>? appIds,
  }) async => TeamMember.fromJson(
    await _patch('/team/members/${Uri.encodeComponent(userId)}', {
      'role': role.name,
      'areas': areas,
      'app_ids': appIds,
    }),
  );

  @override
  Future<void> removeTeamMember(String userId) =>
      _delete('/team/members/${Uri.encodeComponent(userId)}');

  @override
  Future<List<Device>> devices() async =>
      listOf(await _get('/me/devices'), 'items', Device.fromJson);

  @override
  Future<void> signOutDevice(String deviceId) =>
      _delete('/me/devices/${Uri.encodeComponent(deviceId)}');

  @override
  Future<void> setPushToken(String token, {String provider = 'fcm'}) =>
      _put('/me/push-token', {'token': token, 'provider': provider});

  @override
  Future<void> deletePushToken() => _delete('/me/push-token');

  @override
  Future<PushPreferences> pushPreferences() async =>
      PushPreferences.fromJson(await _get('/me/push-preferences'));

  @override
  Future<PushPreferences> setPushPreferences(
    PushPreferences preferences,
  ) async => PushPreferences.fromJson(
    await _put('/me/push-preferences', preferences.toJson()),
  );

  @override
  Future<AppSummary> app(String appId) async =>
      AppSummary.fromJson(await _get(_app(appId)));

  // Updates

  @override
  Future<UpdatesList> updates() async =>
      UpdatesList.fromJson(await _get('/updates'));

  @override
  Future<int> markUpdatesRead({
    List<String> keys = const [],
    bool all = false,
  }) async => integer(
    await _post('/updates/read', {
      if (keys.isNotEmpty) 'keys': keys.take(200).toList(),
      if (all) 'all': true,
    }),
    'unread',
  );

  // Today

  @override
  Future<Today> today(String appId) async =>
      Today.fromJson(await _get('${_app(appId)}/today'));

  // Orders

  @override
  Future<Paged<Order>> orders(
    String appId, {
    List<String> statuses = const [],
    int page = 1,
    int perPage = 20,
  }) async => Paged.fromJson(
    await _get(
      '${_app(appId)}/orders',
      query: {
        'status': statuses.isEmpty ? null : statuses.join(','),
        'page': page,
        'per_page': perPage,
      },
    ),
    Order.fromJson,
  );

  @override
  Future<Order> order(String appId, int orderId) async =>
      Order.fromJson(await _get('${_app(appId)}/orders/$orderId'));

  @override
  Future<Order> changeOrderStatus(
    String appId,
    int orderId,
    String status,
  ) async => Order.fromJson(
    await _post('${_app(appId)}/orders/$orderId/status', {'status': status}),
  );

  @override
  Future<RefundResult> refundOrder(
    String appId,
    int orderId,
    RefundRequest request,
  ) async => RefundResult.fromJson(
    await _post('${_app(appId)}/orders/$orderId/refunds', request.toJson()),
  );

  // Appointments

  @override
  Future<AppointmentsPage> appointments(
    String appId, {
    String scope = 'upcoming',
    List<String> statuses = const [],
    int page = 1,
  }) async => AppointmentsPage.fromJson(
    await _get(
      '${_app(appId)}/appointments',
      query: {
        'scope': scope,
        'status': statuses.isEmpty ? null : statuses.join(','),
        'page': page,
      },
    ),
  );

  @override
  Future<Appointment> changeAppointmentStatus(
    String appId,
    int appointmentId,
    String status,
  ) async => Appointment.fromJson(
    await _post('${_app(appId)}/appointments/$appointmentId/status', {
      'status': status,
    }),
  );

  @override
  Future<RescheduleTimes> rescheduleTimes(
    String appId,
    int appointmentId, {
    String? from,
    int days = 7,
    int? staffId,
  }) async => RescheduleTimes.fromJson(
    await _get(
      '${_app(appId)}/appointments/$appointmentId/times',
      query: {'from': ?from, 'days': '$days', 'staff_id': ?staffId?.toString()},
    ),
  );

  @override
  Future<Appointment> reschedule(
    String appId,
    int appointmentId, {
    required DateTime start,
    int? staffId,
  }) async => Appointment.fromJson(
    await _post('${_app(appId)}/appointments/$appointmentId/reschedule', {
      'start': start.toUtc().toIso8601String(),
      'staff_id': staffId,
    }),
  );

  // Events

  @override
  Future<EventsList> events(String appId, {String scope = 'open'}) async =>
      EventsList.fromJson(
        await _get('${_app(appId)}/events', query: {'scope': scope}),
      );

  @override
  Future<CheckIn> checkIn(String appId, String code, {int? eventId}) async =>
      CheckIn.fromJson(
        await _post('${_app(appId)}/check-in', {
          'code': code.trim(),
          'event_id': eventId,
        }),
      );

  // Donations

  @override
  Future<DonationsPage> donations(
    String appId, {
    int? campaignId,
    int page = 1,
  }) async => DonationsPage.fromJson(
    await _get(
      '${_app(appId)}/donations',
      query: {'campaign_id': campaignId, 'page': page},
    ),
  );

  // Catalog

  @override
  Future<List<Product>> products(String appId) async =>
      listOf(await _get('${_app(appId)}/products'), 'items', Product.fromJson);

  @override
  Future<Product> updateProduct(
    String appId,
    int productId,
    ProductPatch patch,
  ) async => Product.fromJson(
    await _patch('${_app(appId)}/products/$productId', patch.toJson()),
  );

  @override
  Future<List<Course>> courses(String appId) async =>
      listOf(await _get('${_app(appId)}/courses'), 'items', Course.fromJson);

  @override
  Future<Course> updateCourse(
    String appId,
    int courseId, {
    required bool published,
  }) async => Course.fromJson(
    await _patch('${_app(appId)}/courses/$courseId', {'published': published}),
  );

  @override
  Future<Course> addLesson(
    String appId,
    int courseId,
    int topicId,
    LessonRequest lesson,
  ) async => Course.fromJson(
    await _post(
      '${_app(appId)}/courses/$courseId/topics/$topicId/lessons',
      lesson.toJson(),
    ),
  );

  @override
  Future<List<Article>> articles(String appId) async =>
      listOf(await _get('${_app(appId)}/articles'), 'items', Article.fromJson);

  @override
  Future<Article> updateArticle(
    String appId,
    int articleId, {
    String? status,
    bool? featured,
  }) async => Article.fromJson(
    await _patch('${_app(appId)}/articles/$articleId', {
      'status': ?status,
      'featured': ?featured,
    }),
  );

  @override
  Future<List<Listing>> listings(String appId) async =>
      listOf(await _get('${_app(appId)}/listings'), 'items', Listing.fromJson);

  @override
  Future<Listing> updateListing(
    String appId,
    int listingId, {
    String? status,
    bool? featured,
  }) async => Listing.fromJson(
    await _patch('${_app(appId)}/listings/$listingId', {
      'status': ?status,
      'featured': ?featured,
    }),
  );

  // Media

  @override
  Future<MediaList> media(String appId, {String? kind}) async =>
      MediaList.fromJson(
        await _get('${_app(appId)}/media', query: {'kind': kind}),
      );

  @override
  Future<Upload> startUpload(
    String appId, {
    required String name,
    required int size,
    required String type,
  }) async => Upload.fromJson(
    await _post('${_app(appId)}/media/uploads', {
      'name': name.length > 200 ? name.substring(0, 200) : name,
      'size': size,
      'type': type,
    }),
  );

  @override
  Future<Upload> resumeUpload(String appId, String mediaId) async =>
      Upload.fromJson(
        await _post('${_app(appId)}/media/uploads/$mediaId/resume'),
      );

  @override
  Future<MediaFile> completeUpload(String appId, String mediaId) async =>
      MediaFile.fromJson(
        await _post('${_app(appId)}/media/uploads/$mediaId/complete'),
      );

  @override
  Future<void> deleteMedia(String appId, String mediaId) =>
      _delete('${_app(appId)}/media/$mediaId');

  // Messages

  @override
  Future<InquiriesPage> inquiries(
    String appId, {
    String? status,
    int page = 1,
  }) async => InquiriesPage.fromJson(
    await _get(
      '${_app(appId)}/inquiries',
      query: {'status': status, 'page': page},
    ),
  );

  @override
  Future<InquiryDetail> inquiry(String appId, int inquiryId) async =>
      InquiryDetail.fromJson(await _get('${_app(appId)}/inquiries/$inquiryId'));

  @override
  Future<InquiryDetail> replyInquiry(
    String appId,
    int inquiryId,
    String text,
  ) async => InquiryDetail.fromJson(
    await _post('${_app(appId)}/inquiries/$inquiryId/replies', {'text': text}),
  );

  // 63 Course questions and reviews

  @override
  Future<QuestionsPage> questions(
    String appId, {
    String? status,
    int page = 1,
  }) async => QuestionsPage.fromJson(
    await _get(
      '${_app(appId)}/questions',
      query: {'status': status, 'page': page},
    ),
  );

  @override
  Future<QuestionDetail> question(String appId, int questionId) async =>
      QuestionDetail.fromJson(
        await _get('${_app(appId)}/questions/$questionId'),
      );

  @override
  Future<QuestionDetail> answerQuestion(
    String appId,
    int questionId,
    String text,
  ) async => QuestionDetail.fromJson(
    await _post('${_app(appId)}/questions/$questionId/answers', {'text': text}),
  );

  @override
  Future<QuestionDetail> setQuestionHidden(
    String appId,
    int questionId,
    bool hidden,
  ) async => QuestionDetail.fromJson(
    await _patch('${_app(appId)}/questions/$questionId', {'hidden': hidden}),
  );

  @override
  Future<QuestionDetail> setAnswerHidden(
    String appId,
    int questionId,
    int answerId,
    bool hidden,
  ) async => QuestionDetail.fromJson(
    await _patch('${_app(appId)}/questions/$questionId/answers/$answerId', {
      'hidden': hidden,
    }),
  );

  @override
  Future<ReviewsPage> reviews(
    String appId, {
    String filter = 'all',
    int page = 1,
  }) async => ReviewsPage.fromJson(
    await _get(
      '${_app(appId)}/reviews',
      query: {'filter': filter, 'page': page},
    ),
  );

  @override
  Future<Review> setReviewHidden(
    String appId,
    int reviewId,
    bool hidden,
  ) async => Review.fromJson(
    await _patch('${_app(appId)}/reviews/$reviewId', {'hidden': hidden}),
  );

  @override
  Future<Review> replyReview(String appId, int reviewId, String text) async =>
      Review.fromJson(
        await _put('${_app(appId)}/reviews/$reviewId/reply', {'text': text}),
      );

  @override
  Future<Review> deleteReviewReply(String appId, int reviewId) async =>
      Review.fromJson(await _delete('${_app(appId)}/reviews/$reviewId/reply'));

  // 63 Members at the door

  @override
  Future<MembersPage> members(
    String appId, {
    String? query,
    int page = 1,
  }) async => MembersPage.fromJson(
    await _get(
      '${_app(appId)}/members',
      query: {
        'q': (query == null || query.trim().isEmpty) ? null : query.trim(),
        'page': page,
      },
    ),
  );

  @override
  Future<MemberCheckIn> checkInMember(
    String appId, {
    String? code,
    int? membershipId,
  }) async => MemberCheckIn.fromJson(
    await _post('${_app(appId)}/members/check-in', {
      'code': ?code?.trim(),
      'membership_id': ?membershipId,
    }),
  );

  @override
  Future<MemberVisits> memberCheckIns(String appId, {String? date}) async =>
      MemberVisits.fromJson(
        await _get('${_app(appId)}/members/check-ins', query: {'date': date}),
      );

  @override
  Future<Member> freezeMember(
    String appId,
    int membershipId, {
    required String from,
    String? until,
  }) async => Member.fromJson(
    await _put('${_app(appId)}/members/$membershipId/freeze', {
      'from': from,
      'until': until,
    }),
  );

  @override
  Future<Member> unfreezeMember(String appId, int membershipId) async =>
      Member.fromJson(
        await _delete('${_app(appId)}/members/$membershipId/freeze'),
      );

  // App users

  @override
  Future<AppUsersPage> appUsers(
    String appId, {
    String? query,
    int page = 1,
  }) async => AppUsersPage.fromJson(
    await _get(
      '${_app(appId)}/users',
      query: {
        'q': (query == null || query.trim().isEmpty) ? null : query.trim(),
        'page': page,
      },
    ),
  );

  // Analytics

  @override
  Future<Analytics> analytics(
    String appId, {
    String range = '30',
    String? from,
    String? to,
  }) async => Analytics.fromJson(
    await _get(
      '${_app(appId)}/analytics',
      query: {'range': range, 'from': from, 'to': to},
    ),
  );

  // Notifications

  @override
  Future<SentNotifications> sentNotifications(String appId) async =>
      SentNotifications.fromJson(await _get('${_app(appId)}/notifications'));

  @override
  Future<NotificationResult> sendNotification(
    String appId, {
    required String title,
    required String body,
  }) async => NotificationResult.fromJson(
    await _post('${_app(appId)}/notifications', {'title': title, 'body': body}),
  );

  @override
  Future<ScheduledNotifications> scheduledNotifications(String appId) async =>
      ScheduledNotifications.fromJson(
        await _get('${_app(appId)}/notifications/scheduled'),
      );

  @override
  Future<ScheduledNotification> scheduleNotification(
    String appId, {
    required String title,
    required String body,
    required String date,
    required String time,
  }) async => ScheduledNotification.fromJson(
    await _post('${_app(appId)}/notifications/scheduled', {
      'title': title,
      'body': body,
      'date': date,
      'time': time,
    }),
  );

  @override
  Future<ScheduledNotification> editScheduledNotification(
    String appId,
    int id, {
    required String title,
    required String body,
    required String date,
    required String time,
  }) async => ScheduledNotification.fromJson(
    await _put('${_app(appId)}/notifications/scheduled/$id', {
      'title': title,
      'body': body,
      'date': date,
      'time': time,
    }),
  );

  @override
  Future<void> cancelScheduledNotification(String appId, int id) =>
      _delete('${_app(appId)}/notifications/scheduled/$id');

  // Publishing and license

  @override
  Future<Preview> preview(String appId, {bool draft = false}) async =>
      Preview.fromJson(await _post('${_app(appId)}/preview', {'draft': draft}));

  @override
  Future<Builds> builds(String appId) async =>
      Builds.fromJson(await _get('${_app(appId)}/builds'));

  @override
  Future<License> license(String appId) async =>
      License.fromJson(await _get('${_app(appId)}/license'));
}

/// Adds the bearer token and, after a 401, renews it once and retries.
class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._dio, this._tokens);

  final Dio _dio;
  final TokenManager _tokens;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (options.extra[_publicKey] == true ||
        options.headers.containsKey('Authorization')) {
      return handler.next(options);
    }
    try {
      final token = await _tokens.validAccessToken();
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
      handler.next(options);
    } on ApiException catch (e) {
      handler.reject(DioException(requestOptions: options, error: e));
    }
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final request = err.requestOptions;
    final header = request.headers['Authorization'];
    if (err.response?.statusCode != 401 ||
        header is! String ||
        request.extra[_retriedKey] == true) {
      return handler.next(err);
    }
    try {
      final token = await _tokens.refresh(
        failedAccessToken: header.replaceFirst('Bearer ', ''),
      );
      if (token == null) return handler.next(err);
      final retry = request.copyWith(
        headers: {...request.headers, 'Authorization': 'Bearer $token'},
        extra: {...request.extra, _retriedKey: true},
      );
      handler.resolve(await _dio.fetch<Object?>(retry));
    } on DioException catch (e) {
      handler.next(e);
    } on ApiException catch (e) {
      handler.next(DioException(requestOptions: request, error: e));
    }
  }
}

/// The media gate: a separate client with no Yallapp token (the link is
/// signed) and long timeouts for big chunks. The gate takes each chunk as a
/// `PUT` with `Upload-Offset` (platform/web/deploy/media-host), as the
/// dashboard's uploader sends it.
class HttpUploadTransport implements UploadTransport {
  HttpUploadTransport({HttpClientAdapter? adapter})
    : _dio = Dio(
        BaseOptions(
          connectTimeout: const Duration(seconds: 20),
          sendTimeout: const Duration(minutes: 5),
          receiveTimeout: const Duration(minutes: 2),
        ),
      ) {
    if (adapter != null) _dio.httpClientAdapter = adapter;
  }

  final Dio _dio;

  static int? _offsetOf(Response<Object?>? response) =>
      int.tryParse(response?.headers.value('upload-offset') ?? '');

  @override
  Future<int> offset(String uploadUrl) async {
    try {
      return _offsetOf(await _dio.head<Object?>(uploadUrl)) ?? 0;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  @override
  Future<int> send(String uploadUrl, int offset, List<int> bytes) async {
    try {
      final response = await _dio.put<Object?>(
        uploadUrl,
        data: Stream.value(bytes),
        options: Options(
          headers: {
            'Upload-Offset': '$offset',
            Headers.contentTypeHeader: 'application/offset+octet-stream',
            Headers.contentLengthHeader: bytes.length,
          },
        ),
      );
      return _offsetOf(response) ?? offset + bytes.length;
    } on DioException catch (e) {
      // 409: the gate has a different offset (an earlier chunk did arrive);
      // carry on from there.
      final at = _offsetOf(e.response);
      if (e.response?.statusCode == 409 && at != null) return at;
      throw ApiException.fromDio(e);
    }
  }
}
