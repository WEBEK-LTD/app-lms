import 'catalog_models.dart';
import 'json.dart';
import 'restaurant_models.dart';

/// What a notification is about; it decides the screen a tap opens.
enum NotificationType {
  newLesson,
  announcement,
  enrolled,
  qnaAnswer,
  article,

  /// 28 An event the user holds tickets to changed or was cancelled.
  event,

  /// 29 A campaign the user gave to posted an update.
  campaignUpdate,

  /// 85.3 Sent by the app on its own (Yallapp's hosted API).
  appointmentConfirmed,
  appointmentReminder,
  classSoon,
  eventSoon,
  membershipEnding,
  cartLeft,
  studyReminder,

  /// 91.2 One of the user's orders was shipped, completed, cancelled or refunded.
  orderUpdate,

  /// 104 One of the customer's shipments moved on; a courier's job.
  shipmentUpdate,
  courierJob,

  /// 105.1 One of the customer's food orders moved on; a new order for a
  /// restaurant.
  foodOrderUpdate,
  restaurantOrder,

  /// 105.2 One of the rider's rides moved on; a ride offered or given to a
  /// driver.
  rideUpdate,
  rideOffer,

  /// 105.3 A teacher the student follows published a course; the academy
  /// published or returned a teacher's course; a student asked a teacher.
  newCourse,
  teacherCourse,
  teacherQuestion,
  unknown,
}

/// A notification in the student's inbox (`GET /me/notifications`).
class InboxNotification {
  const InboxNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.createdAt,
    required this.read,
    this.courseId,
    this.lessonId,
    this.questionId,
    this.articleId,
    this.eventId,
    this.campaignId,
    this.link,
    this.imageUrl,
    this.appointmentId,
    this.orderId,
    this.shipmentId,
    this.foodOrderId,
    this.rideId,
  });

  factory InboxNotification.fromJson(Json json) => InboxNotification(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    body: reqString(json, 'body'),
    type: enumFromSnake(
      NotificationType.values,
      json['type'],
      NotificationType.unknown,
    ),
    courseId: optInt(json, 'course_id'),
    lessonId: optInt(json, 'lesson_id'),
    questionId: optInt(json, 'question_id'),
    articleId: optString(json, 'article_id'),
    eventId: optInt(json, 'event_id'),
    campaignId: optInt(json, 'campaign_id'),
    link: optString(json, 'link'),
    imageUrl: optString(json, 'image_url'),
    appointmentId: optInt(json, 'appointment_id'),
    orderId: optInt(json, 'order_id'),
    shipmentId: optInt(json, 'shipment_id'),
    foodOrderId: optInt(json, 'food_order_id'),
    rideId: optInt(json, 'ride_id'),
    createdAt: reqDate(json, 'created_at'),
    read: reqBool(json, 'read'),
  );

  final int id;
  final String title;
  final String body;
  final NotificationType type;
  final int? courseId;
  final int? lessonId;
  final int? questionId;

  /// For [NotificationType.article] (breaking news): the article to open.
  final String? articleId;

  /// For [NotificationType.event]: the event to open.
  final int? eventId;

  /// For [NotificationType.campaignUpdate]: the campaign to open (29).
  final int? campaignId;

  /// 46 A link that opens the app (`<base>/<kind>/<id>`), when no id says.
  final String? link;
  final DateTime createdAt;
  final bool read;

  /// The same keys as a push message's data, so taps open the same screen.
  /// 85.2 A campaign's picture, shown with it in the inbox.
  final String? imageUrl;

  /// 85.3 For an appointment confirmed or coming up: the appointment.
  final int? appointmentId;

  /// 91.2 For an order update: the order.
  final int? orderId;

  /// 104 For a shipment update or a courier's job: the shipment.
  final int? shipmentId;

  /// 105.1 For a food order update or a restaurant's new order: the order.
  final int? foodOrderId;

  /// 105.2 For a ride update or offer: the ride.
  final int? rideId;

  Map<String, dynamic> get target => {
    'type': snake(type),
    'course_id': ?courseId,
    'lesson_id': ?lessonId,
    'question_id': ?questionId,
    'article_id': ?articleId,
    'event_id': ?eventId,
    'campaign_id': ?campaignId,
    'link': ?link,
    'appointment_id': ?appointmentId,
    'order_id': ?orderId,
    'shipment_id': ?shipmentId,
    'food_order_id': ?foodOrderId,
    'ride_id': ?rideId,
  };
}

class NotificationPage {
  const NotificationPage({required this.page, required this.unreadCount});

  factory NotificationPage.fromJson(Json json) => NotificationPage(
    page: Paged.fromJson(json, InboxNotification.fromJson),
    unreadCount: reqInt(json, 'unread_count'),
  );

  final Paged<InboxNotification> page;
  final int unreadCount;
}

enum OrderStatus {
  pending,
  processing,
  onHold,
  completed,
  cancelled,
  refunded,
  failed,
}

class OrderLine {
  const OrderLine({
    required this.name,
    this.courseId,
    this.productId,
    this.quantity = 1,
    this.imageUrl,
    this.options = const [],
  });

  factory OrderLine.fromJson(Json json) => OrderLine(
    name: reqString(json, 'name'),
    courseId: optInt(json, 'course_id'),
    productId: optInt(json, 'product_id'),
    quantity: intOr(json, 'quantity', 1),
    imageUrl: optString(json, 'image_url'),
    options: stringList(json, 'options'),
  );

  final String name;
  final int? courseId;
  final int? productId;
  final int quantity;
  final String? imageUrl;

  /// 26 The chosen options' names.
  final List<String> options;
}

/// 96.2 How to pay an order placed to pay by bank transfer or the shop's
/// own method: the shop's details, in its own words, and the day to pay by.
class PayOutside {
  const PayOutside({
    required this.name,
    required this.instructions,
    required this.dueAt,
  });

  factory PayOutside.fromJson(Json json) => PayOutside(
    name: reqString(json, 'name'),
    instructions: reqString(json, 'instructions'),
    dueAt: reqDate(json, 'due_at'),
  );

  final String name;
  final String instructions;
  final DateTime dueAt;
}

/// An order from the site's checkout (`GET /me/orders`).
class Order {
  const Order({
    required this.id,
    required this.number,
    required this.status,
    required this.statusLabel,
    required this.total,
    required this.createdAt,
    required this.items,
    this.fulfilmentStatus,
    this.fulfilment,
    this.refundedTotal,
    this.receiptUrl,
    this.payOutside,
    this.shipment,
    this.returnRequest,
    this.canReturn = false,
    this.points,
  });

  factory Order.fromJson(Json json) => Order(
    id: reqInt(json, 'id'),
    number: reqString(json, 'number'),
    status: enumFromSnake(
      OrderStatus.values,
      json['status'],
      OrderStatus.pending,
    ),
    statusLabel: reqString(json, 'status_label'),
    total: reqString(json, 'total'),
    createdAt: reqDate(json, 'created_at'),
    items: reqListOf(json, 'items', OrderLine.fromJson),
    fulfilmentStatus: fulfilmentStatusFrom(json['fulfilment_status']),
    fulfilment: optObject(json, 'fulfilment', OrderFulfilment.fromJson),
    refundedTotal: optString(json, 'refunded_total'),
    receiptUrl: optString(json, 'receipt_url'),
    payOutside: optObject(json, 'pay_outside', PayOutside.fromJson),
    shipment: optObject(json, 'shipment', OrderShipment.fromJson),
    returnRequest: optObject(json, 'return_request', ReturnRequest.fromJson),
    canReturn: boolOr(json, 'can_return', false),
    points: optObject(json, 'points', OrderPoints.fromJson),
  );

  final int id;
  final String number;
  final OrderStatus status;
  final String statusLabel;
  final String total;
  final DateTime createdAt;
  final List<OrderLine> items;

  /// 26 Where a restaurant's order is; null for orders not followed this way.
  final FulfilmentStatus? fulfilmentStatus;

  /// 26 How a restaurant's order is collected.
  final OrderFulfilment? fulfilment;

  /// 47 What the business refunded of it, formatted; null for nothing.
  final String? refundedTotal;

  /// 71 The receipt as a PDF, to download; null on WordPress sites and older servers.
  final String? receiptUrl;

  /// 96.2 To pay by bank transfer or the shop's own method: how, until the
  /// shop marks it paid; null for a card payment and on older servers.
  final PayOutside? payOutside;

  /// 80.4 How the shop shipped it; null until it is.
  final OrderShipment? shipment;

  /// 91.3 The return the customer asked for, and the shop's answer; null for none.
  final ReturnRequest? returnRequest;

  /// 91.3 Whether a return can be asked for now (the shop's days, once per order).
  final bool canReturn;

  /// 91.4 The loyalty points used on it and earned by it.
  final OrderPoints? points;

  /// Whether the order has steps to follow: a restaurant's, or a shipment.
  bool get trackable => fulfilmentStatus != null || shipment != null;

  /// Whether the order opens its own screen: to follow it, or for its return.
  bool get opensScreen => trackable || canReturn || returnRequest != null;
}

/// 91.4 An order's loyalty points.
class OrderPoints {
  const OrderPoints({required this.used, required this.earned, this.discount});

  factory OrderPoints.fromJson(Json json) => OrderPoints(
    used: reqInt(json, 'used'),
    discount: optString(json, 'discount'),
    earned: reqInt(json, 'earned'),
  );

  final int used;
  final String? discount;
  final int earned;
}

/// 91.3 Why a customer returns an order.
enum ReturnReason { damaged, wrongItem, notAsDescribed, noLongerNeeded, other }

/// 91.3 Where a return is.
enum ReturnStatus { requested, approved, declined }

/// 91.3 A return asked for in the app, and the shop's answer.
class ReturnRequest {
  const ReturnRequest({
    required this.status,
    required this.reason,
    required this.requestedAt,
    this.note,
    this.decidedAt,
    this.reply,
  });

  factory ReturnRequest.fromJson(Json json) => ReturnRequest(
    status: enumFromSnake(
      ReturnStatus.values,
      json['status'],
      ReturnStatus.requested,
    ),
    reason: enumFromSnake(
      ReturnReason.values,
      json['reason'],
      ReturnReason.other,
    ),
    note: optString(json, 'note'),
    requestedAt: reqDate(json, 'requested_at'),
    decidedAt: optDate(json, 'decided_at'),
    reply: optString(json, 'reply'),
  );

  final ReturnStatus status;
  final ReturnReason reason;
  final String? note;
  final DateTime requestedAt;
  final DateTime? decidedAt;

  /// What the shop wrote with its answer.
  final String? reply;
}

/// 80.4 An order's shipment: any carrier, with a tracking link, a tracking
/// number or a waybill (its number, or a link to it).
class OrderShipment {
  const OrderShipment({
    required this.shippedAt,
    this.carrier,
    this.trackingNumber,
    this.trackingUrl,
    this.waybill,
  });

  factory OrderShipment.fromJson(Json json) => OrderShipment(
    carrier: optString(json, 'carrier'),
    trackingNumber: optString(json, 'tracking_number'),
    trackingUrl: optString(json, 'tracking_url'),
    waybill: optString(json, 'waybill'),
    shippedAt: reqDate(json, 'shipped_at'),
  );

  final String? carrier;
  final String? trackingNumber;
  final String? trackingUrl;
  final String? waybill;
  final DateTime shippedAt;

  /// The waybill when it is a link, to open; null for a number.
  String? get waybillUrl {
    final w = waybill;
    if (w == null) return null;
    final uri = Uri.tryParse(w);
    return uri != null && (uri.scheme == 'https' || uri.scheme == 'http')
        ? w
        : null;
  }
}

/// A reviewer, asker or replier.
class Person {
  const Person({required this.name, required this.instructor, this.avatarUrl});

  factory Person.fromJson(Json json) => Person(
    name: reqString(json, 'name'),
    avatarUrl: optString(json, 'avatar_url'),
    instructor: boolOr(json, 'instructor', false),
  );

  final String name;
  final String? avatarUrl;
  final bool instructor;
}

class RatingSummary {
  const RatingSummary({
    required this.rating,
    required this.ratingCount,
    required this.counts,
  });

  factory RatingSummary.fromJson(Json json) {
    final counts = asJson(json['counts'], 'counts');
    return RatingSummary(
      rating: optDouble(json, 'rating'),
      ratingCount: reqInt(json, 'rating_count'),
      counts: {
        for (var star = 1; star <= 5; star++) star: intOr(counts, '$star', 0),
      },
    );
  }

  final double? rating;
  final int ratingCount;

  /// Approved reviews per star, 1 to 5.
  final Map<int, int> counts;
}

/// 63 `hidden`: the business hid it from others (only its author gets it).
enum ReviewStatus { approved, pending, hidden }

/// 63 The business's public reply under a review.
class ReviewReply {
  const ReviewReply({required this.text, required this.createdAt});

  factory ReviewReply.fromJson(Json json) => ReviewReply(
    text: optString(json, 'text') ?? '',
    createdAt: reqDate(json, 'created_at'),
  );

  final String text;
  final DateTime createdAt;
}

class Review {
  const Review({
    required this.id,
    required this.rating,
    required this.text,
    required this.author,
    required this.createdAt,
    required this.status,
    required this.mine,
    this.reply,
  });

  factory Review.fromJson(Json json) => Review(
    id: reqInt(json, 'id'),
    rating: reqInt(json, 'rating').clamp(1, 5),
    text: optString(json, 'text') ?? '',
    author: Person.fromJson(asJson(json['author'], 'author')),
    createdAt: reqDate(json, 'created_at'),
    status: enumFrom(
      ReviewStatus.values,
      json['status'],
      ReviewStatus.approved,
    ),
    mine: boolOr(json, 'mine', false),
    reply: optObject(json, 'reply', ReviewReply.fromJson),
  );

  final int id;
  final int rating;
  final String text;
  final Person author;
  final DateTime createdAt;
  final ReviewStatus status;
  final bool mine;
  final ReviewReply? reply;
}

/// `GET /courses/{id}/reviews`.
class ReviewPage {
  const ReviewPage({
    required this.page,
    required this.summary,
    required this.canReview,
    this.mine,
  });

  factory ReviewPage.fromJson(Json json) => ReviewPage(
    page: Paged.fromJson(json, Review.fromJson),
    summary: RatingSummary.fromJson(asJson(json['summary'], 'summary')),
    mine: optObject(json, 'mine', Review.fromJson),
    canReview: boolOr(json, 'can_review', false),
  );

  final Paged<Review> page;
  final RatingSummary summary;
  final Review? mine;
  final bool canReview;
}

class QuestionAnswer {
  const QuestionAnswer({
    required this.id,
    required this.text,
    required this.author,
    required this.createdAt,
    required this.mine,
    this.hidden = false,
  });

  factory QuestionAnswer.fromJson(Json json) => QuestionAnswer(
    id: reqInt(json, 'id'),
    text: reqString(json, 'text'),
    author: Person.fromJson(asJson(json['author'], 'author')),
    createdAt: reqDate(json, 'created_at'),
    mine: boolOr(json, 'mine', false),
    hidden: boolOr(json, 'hidden', false),
  );

  final int id;
  final String text;
  final Person author;
  final DateTime createdAt;
  final bool mine;

  /// 64 Hidden by the business: only its author gets it, and is told.
  final bool hidden;
}

/// A question in a course's Q&A, without its answers.
class CourseQuestion {
  const CourseQuestion({
    required this.id,
    required this.text,
    required this.author,
    required this.createdAt,
    required this.answerCount,
    required this.mine,
    this.courseId,
    this.hidden = false,
  });

  factory CourseQuestion.fromJson(Json json) => CourseQuestion(
    id: reqInt(json, 'id'),
    courseId: optInt(json, 'course_id'),
    text: reqString(json, 'text'),
    author: Person.fromJson(asJson(json['author'], 'author')),
    createdAt: reqDate(json, 'created_at'),
    answerCount: intOr(json, 'answer_count', 0),
    mine: boolOr(json, 'mine', false),
    hidden: boolOr(json, 'hidden', false),
  );

  final int id;
  final int? courseId;
  final String text;
  final Person author;
  final DateTime createdAt;
  final int answerCount;
  final bool mine;

  /// 64 Hidden by the business: only its author gets it, and is told.
  final bool hidden;
}

/// `GET /questions/{id}`: a question and its answers, oldest first.
class QuestionThread {
  const QuestionThread({required this.question, required this.answers});

  factory QuestionThread.fromJson(Json json) => QuestionThread(
    question: CourseQuestion.fromJson(json),
    answers: reqListOf(json, 'answers', QuestionAnswer.fromJson),
  );

  final CourseQuestion question;
  final List<QuestionAnswer> answers;
}

/// 48 What an address on the site is (`GET /links/resolve`, `LinkResolution`):
/// a kind of `docs/api/app-links.json`'s `resolved_kinds` and its id, or no
/// kind for something the app doesn't show.
class LinkResolution {
  const LinkResolution({this.kind, this.id});

  factory LinkResolution.fromJson(Json json) =>
      LinkResolution(kind: optString(json, 'kind'), id: optString(json, 'id'));

  final String? kind;
  final String? id;
}
