import 'models.dart';

/// 59 Every call of the Owner API (docs/api/owner.yaml) that Yallapp
/// Business makes. [HttpOwnerApi] talks to yallapp.com.tr; [FakeOwnerApi]
/// keeps everything in memory for the widget tests and the demo.
abstract class OwnerApi {
  // Auth
  /// 70 [otp]: the authenticator app's code (or a recovery code) of an
  /// account with two-step sign-in, after a `two_factor_required` answer.
  Future<Session> signIn({
    required String email,
    required String password,
    required DeviceInfo device,
    String? otp,
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

  // 60 Team members: the business this phone works on, and the owner's team.
  Future<Me> setBusiness(String businessId);
  Future<Team> team();
  Future<TeamInvitation> inviteTeamMember({
    required String name,
    required String email,
    required TeamRole role,
    List<String> areas = const [],
    List<String>? appIds,
  });
  Future<TeamInvitation> resendInvitation(String invitationId);
  Future<void> cancelInvitation(String invitationId);
  Future<TeamMember> updateTeamMember(
    String userId, {
    required TeamRole role,
    List<String> areas = const [],
    List<String>? appIds,
  });
  Future<void> removeTeamMember(String userId);

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

  /// 61 The free times to move an appointment to, from [from] (a local
  /// date; today when null) for [days] days, for [staffId] or anyone.
  Future<RescheduleTimes> rescheduleTimes(
    String appId,
    int appointmentId, {
    String? from,
    int days = 7,
    int? staffId,
  });

  /// 61 Moves it to a slot's [start]; the customer is told.
  Future<Appointment> reschedule(
    String appId,
    int appointmentId, {
    required DateTime start,
    int? staffId,
  });

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

  // 63 Course questions (Messages) and reviews (Catalog & content).
  Future<QuestionsPage> questions(String appId, {String? status, int page = 1});
  Future<QuestionDetail> question(String appId, int questionId);
  Future<QuestionDetail> answerQuestion(
    String appId,
    int questionId,
    String text,
  );

  /// 64 Hides a question from others (its author still sees it), or shows it.
  Future<QuestionDetail> setQuestionHidden(
    String appId,
    int questionId,
    bool hidden,
  );

  /// 64 Hides a student's answer from others, or shows it again.
  Future<QuestionDetail> setAnswerHidden(
    String appId,
    int questionId,
    int answerId,
    bool hidden,
  );
  Future<ReviewsPage> reviews(
    String appId, {
    String filter = 'all',
    int page = 1,
  });
  Future<Review> setReviewHidden(String appId, int reviewId, bool hidden);
  Future<Review> replyReview(String appId, int reviewId, String text);
  Future<Review> deleteReviewReply(String appId, int reviewId);

  // 63 A gym's members at the door.
  Future<MembersPage> members(String appId, {String? query, int page = 1});
  Future<MemberCheckIn> checkInMember(
    String appId, {
    String? code,
    int? membershipId,
  });
  Future<MemberVisits> memberCheckIns(String appId, {String? date});

  /// 64 Freezes a membership from `from` (YYYY-MM-DD) until `until`, the day
  /// it's back, or until it is unfrozen.
  Future<Member> freezeMember(
    String appId,
    int membershipId, {
    required String from,
    String? until,
  });

  /// 64 Unfreezes it now, or removes a freeze to come.
  Future<Member> unfreezeMember(String appId, int membershipId);

  // 77 The app's chat.
  Future<ChatInbox> chatConversations(
    String appId, {
    bool unread = false,
    String? kind,
    String? query,
  });
  Future<ChatMessagesPage> chatMessages(
    String appId,
    String conversationId, {
    String? after,
    String? before,
  });

  /// A reply as the business: text, a Media file, or both. [clientId] makes
  /// sending it again safe.
  Future<ChatMessage> sendChatMessage(
    String appId,
    String conversationId, {
    required String clientId,
    String? text,
    String? mediaId,
  });
  Future<void> readChat(String appId, String conversationId, String messageId);
  Future<ChatThread> keepChat(String appId, String conversationId);
  Future<int> keepExpiringChats(String appId);
  Future<void> clearChat(String appId, String conversationId);
  Future<void> deleteChatMessage(String appId, String messageId);
  Future<List<ChatReport>> chatReports(String appId, {bool open = true});
  Future<void> resolveChatReport(
    String appId,
    String reportId,
    ChatReportAction action,
  );
  Future<void> blockChatMember(
    String appId,
    String memberId, {
    required bool blocked,
  });
  Future<ChatSettings> chatSettings(String appId);
  Future<ChatSettings> updateChatSettings(
    String appId, {
    bool? enabled,
    bool? courseGroups,
  });

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

  /// 61 Notifications sent later: waiting ones, a new one, a change, cancel.
  Future<ScheduledNotifications> scheduledNotifications(String appId);
  Future<ScheduledNotification> scheduleNotification(
    String appId, {
    required String title,
    required String body,
    required String date,
    required String time,
  });
  Future<ScheduledNotification> editScheduledNotification(
    String appId,
    int id, {
    required String title,
    required String body,
    required String date,
    required String time,
  });
  Future<void> cancelScheduledNotification(String appId, int id);

  // 125 Studio apps: food orders and restaurants.
  Future<Paged<FoodOrder>> foodOrders(
    String appId, {
    String filter = 'new',
    String? query,
    int page = 1,
  });
  Future<FoodOrderDetail> foodOrder(String appId, String id);

  /// accept (with [prepMinutes]), reject (with [reason]), ready or cancel.
  Future<FoodOrderDetail> foodOrderStep(
    String appId,
    String id, {
    required String step,
    int? prepMinutes,
    String? reason,
    String? note,
  });
  Future<List<Restaurant>> restaurants(String appId);
  Future<Restaurant> openRestaurant(String appId, String id);
  Future<Restaurant> endRestaurantDelay(String appId, String id);

  // 125 Shipments and couriers.
  Future<Paged<Shipment>> shipments(
    String appId, {
    String filter = 'waiting',
    String? query,
    int page = 1,
  });
  Future<ShipmentDetail> shipment(String appId, String id);
  Future<ShipmentDetail> assignShipment(
    String appId,
    String id,
    String courierId,
  );
  Future<ShipmentDetail> moveShipment(
    String appId,
    String id,
    String status, {
    String? note,
  });
  Future<List<Courier>> couriers(String appId, {String? shipmentId});

  // 125 Rides and drivers.
  Future<Paged<Ride>> rides(
    String appId, {
    String filter = 'now',
    String? query,
    int page = 1,
  });
  Future<RideDetail> ride(String appId, String id);
  Future<RideDetail> assignRide(String appId, String id, String driverId);
  Future<RideDetail> cancelRide(String appId, String id, {String? note});
  Future<List<Driver>> drivers(String appId, {String? rideId});

  // 125 The marketplace.
  Future<Paged<MarketOrder>> marketOrders(
    String appId, {
    String filter = 'active',
    String? query,
    int page = 1,
  });
  Future<MarketOrderDetail> marketOrder(String appId, String id);
  Future<Paged<Complaint>> complaints(
    String appId, {
    String queue = 'all',
    int page = 1,
  });
  Future<ComplaintDetail> complaint(String appId, String id);
  Future<ComplaintDetail> replyComplaint(String appId, String id, String text);

  /// [to]: payment, wallet or coupon; [funder]: owner or vendor.
  Future<ComplaintDetail> decideComplaint(
    String appId,
    String id, {
    required String decision,
    int? amountCents,
    String? note,
    String? to,
    String funder = 'owner',
    bool shareWithVendor = false,
  });
  Future<List<Vendor>> vendors(String appId);

  // 125 A school's day.
  Future<SchoolToday> schoolToday(String appId);
  Future<Paged<Excuse>> excuses(
    String appId, {
    String status = 'pending',
    int page = 1,
  });
  Future<Excuse> excuse(String appId, String id);

  /// accepted, or declined with a [note] to the parents.
  Future<Excuse> answerExcuse(
    String appId,
    String id, {
    required String answer,
    String? note,
  });
  Future<Paged<SchoolReport>> reports(
    String appId, {
    String status = 'sent',
    int page = 1,
  });

  /// Reading it marks it read.
  Future<SchoolReport> report(String appId, String id);

  /// comment, return (with what to change) or approve.
  Future<SchoolReport> reviewReport(
    String appId,
    String id, {
    required String action,
    String? text,
  });
  Future<Paged<LeaveRequest>> leaveRequests(
    String appId, {
    String status = 'pending',
    int page = 1,
  });

  /// approved or refused.
  Future<LeaveRequest> answerLeave(
    String appId,
    String id, {
    required String answer,
    String? note,
  });

  // 125 Prime.
  Future<PrimeInsights> primeInsights(String appId, {String period = 'week'});
  Future<PrimeAlerts> primeAlerts(String appId);
  Future<PrimeAlerts> setPrimeAlerts(String appId, PrimeAlerts alerts);

  // 125 VIP: the account manager's free times, and a call booked.
  Future<List<CallDay>> accountManagerSlots();
  Future<BookedCall> bookAccountManagerCall({
    required String date,
    required String time,
    String? note,
  });

  // Publishing and license
  Future<Preview> preview(String appId, {bool draft = false});
  Future<Builds> builds(String appId);
  Future<License> license(String appId);
}

/// Sends an upload's bytes to the media gate's signed link (the same
/// protocol as the dashboard: 64b `GET` for the offset, `POST` with the
/// bytes and the offset in `Upload-Offset` and the query).
abstract class UploadTransport {
  /// How many bytes the gate has.
  Future<int> offset(String uploadUrl);

  /// Sends [bytes] at [offset]; returns the new offset.
  Future<int> send(String uploadUrl, int offset, List<int> bytes);
}
