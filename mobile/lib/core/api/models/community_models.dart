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
  final DateTime createdAt;
  final bool read;

  /// The same keys as a push message's data, so taps open the same screen.
  Map<String, dynamic> get target => {
    'type': snake(type),
    'course_id': ?courseId,
    'lesson_id': ?lessonId,
    'question_id': ?questionId,
    'article_id': ?articleId,
    'event_id': ?eventId,
    'campaign_id': ?campaignId,
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

  /// Whether the app shows its steps.
  bool get trackable => fulfilmentStatus != null;
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

enum ReviewStatus { approved, pending }

class Review {
  const Review({
    required this.id,
    required this.rating,
    required this.text,
    required this.author,
    required this.createdAt,
    required this.status,
    required this.mine,
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
  );

  final int id;
  final int rating;
  final String text;
  final Person author;
  final DateTime createdAt;
  final ReviewStatus status;
  final bool mine;
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
  });

  factory QuestionAnswer.fromJson(Json json) => QuestionAnswer(
    id: reqInt(json, 'id'),
    text: reqString(json, 'text'),
    author: Person.fromJson(asJson(json['author'], 'author')),
    createdAt: reqDate(json, 'created_at'),
    mine: boolOr(json, 'mine', false),
  );

  final int id;
  final String text;
  final Person author;
  final DateTime createdAt;
  final bool mine;
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
  });

  factory CourseQuestion.fromJson(Json json) => CourseQuestion(
    id: reqInt(json, 'id'),
    courseId: optInt(json, 'course_id'),
    text: reqString(json, 'text'),
    author: Person.fromJson(asJson(json['author'], 'author')),
    createdAt: reqDate(json, 'created_at'),
    answerCount: intOr(json, 'answer_count', 0),
    mine: boolOr(json, 'mine', false),
  );

  final int id;
  final int? courseId;
  final String text;
  final Person author;
  final DateTime createdAt;
  final int answerCount;
  final bool mine;
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
