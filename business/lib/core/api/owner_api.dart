import 'models.dart';

/// 59 Every call of the Owner API (docs/api/owner.yaml) that Yallapp
/// Business makes. [HttpOwnerApi] talks to yallapp.com.tr; [FakeOwnerApi]
/// keeps everything in memory for the widget tests and the demo.
abstract class OwnerApi {
  // Auth
  Future<Session> signIn({
    required String email,
    required String password,
    required DeviceInfo device,
  });
  Future<Session> refresh(String refreshToken);
  Future<void> signOut();
  Future<void> signOutAll();
  Future<String> passwordResetLink();

  // Account
  Future<Me> me();
  Future<Me> setLanguage(String? language);
  Future<List<Device>> devices();
  Future<void> signOutDevice(String deviceId);
  Future<void> setPushToken(String token, {String provider = 'fcm'});
  Future<void> deletePushToken();
  Future<PushPreferences> pushPreferences();
  Future<PushPreferences> setPushPreferences(PushPreferences preferences);
  Future<AppSummary> app(String appId);

  // Updates
  Future<UpdatesList> updates();
  Future<int> markUpdatesRead({List<String> keys = const [], bool all = false});

  // Today
  Future<Today> today(String appId);

  // Orders
  Future<Paged<Order>> orders(
    String appId, {
    List<String> statuses = const [],
    int page = 1,
    int perPage = 20,
  });
  Future<Order> order(String appId, int orderId);
  Future<Order> changeOrderStatus(String appId, int orderId, String status);
  Future<RefundResult> refundOrder(
    String appId,
    int orderId,
    RefundRequest request,
  );

  // Appointments
  Future<AppointmentsPage> appointments(
    String appId, {
    String scope = 'upcoming',
    List<String> statuses = const [],
    int page = 1,
  });
  Future<Appointment> changeAppointmentStatus(
    String appId,
    int appointmentId,
    String status,
  );

  // Events
  Future<EventsList> events(String appId, {String scope = 'open'});
  Future<CheckIn> checkIn(String appId, String code, {int? eventId});

  // Donations
  Future<DonationsPage> donations(
    String appId, {
    int? campaignId,
    int page = 1,
  });

  // Catalog
  Future<List<Product>> products(String appId);
  Future<Product> updateProduct(
    String appId,
    int productId,
    ProductPatch patch,
  );
  Future<List<Course>> courses(String appId);
  Future<Course> updateCourse(
    String appId,
    int courseId, {
    required bool published,
  });
  Future<Course> addLesson(
    String appId,
    int courseId,
    int topicId,
    LessonRequest lesson,
  );
  Future<List<Article>> articles(String appId);
  Future<Article> updateArticle(
    String appId,
    int articleId, {
    String? status,
    bool? featured,
  });
  Future<List<Listing>> listings(String appId);
  Future<Listing> updateListing(
    String appId,
    int listingId, {
    String? status,
    bool? featured,
  });

  // Media
  Future<MediaList> media(String appId, {String? kind});
  Future<Upload> startUpload(
    String appId, {
    required String name,
    required int size,
    required String type,
  });
  Future<Upload> resumeUpload(String appId, String mediaId);
  Future<MediaFile> completeUpload(String appId, String mediaId);
  Future<void> deleteMedia(String appId, String mediaId);

  // Messages
  Future<InquiriesPage> inquiries(String appId, {String? status, int page = 1});
  Future<InquiryDetail> inquiry(String appId, int inquiryId);
  Future<InquiryDetail> replyInquiry(String appId, int inquiryId, String text);

  // App users
  Future<AppUsersPage> appUsers(String appId, {String? query, int page = 1});

  // Analytics
  Future<Analytics> analytics(
    String appId, {
    String range = '30',
    String? from,
    String? to,
  });

  // Notifications
  Future<SentNotifications> sentNotifications(String appId);
  Future<NotificationResult> sendNotification(
    String appId, {
    required String title,
    required String body,
  });

  // Publishing and license
  Future<Preview> preview(String appId, {bool draft = false});
  Future<Builds> builds(String appId);
  Future<License> license(String appId);
}

/// Sends an upload's bytes to the media gate's signed link (the same
/// protocol as the dashboard: `HEAD` for the offset, `PUT` with
/// `Upload-Offset` and the bytes).
abstract class UploadTransport {
  /// How many bytes the gate has.
  Future<int> offset(String uploadUrl);

  /// Sends [bytes] at [offset]; returns the new offset.
  Future<int> send(String uploadUrl, int offset, List<int> bytes);
}
