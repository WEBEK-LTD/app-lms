import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';

import '../support/fixtures.dart';

void main() {
  group('Config', () {
    test('parses every section', () {
      final c = AppConfig.fromJson(configJson());
      expect(c.site.name, 'Your Academy');
      expect(c.site.supportWhatsapp, '+90 532 123 45 67');
      expect(c.branding.primaryColor, '#0E0D24');
      expect(c.branding.logoUrl, isNull);
      expect(c.features.lms, LmsKind.tutor);
      expect(c.features.push, isTrue);
      expect(c.auth.signupFields, [SignupField.name, SignupField.email]);
      expect(c.auth.defaultCountryCode, '+90');
      expect(c.purchases.enrollButton, isTrue);
      expect(c.purchases.checkoutOpensIn, CheckoutOpensIn.inApp);
      expect(c.content.watermark, WatermarkMode.phone);
      expect(c.content.embedHeight, EmbedHeightMode.auto);
      expect(c.content.requiredWatchPercent, 80);
      expect(c.app.maintenance, isFalse);
    });

    test('reads the sign-in methods (18), phone when missing', () {
      expect(AppConfig.fromJson(configJson()).auth.methods, [
        SignInMethod.phone,
      ]);
      final json = configJson();
      json['auth'] = {
        ...json['auth'] as Map<String, dynamic>,
        'methods': ['email', 'phone', 'fax'],
        'email_sign_in': 'password',
        'password_reset_url':
            'https://academy.test/wp-login.php?action=lostpassword',
      };
      final auth = AppConfig.fromJson(json).auth;
      expect(auth.methods, [SignInMethod.phone, SignInMethod.email]);
      expect(auth.emailSignIn, EmailSignIn.password);
      expect(auth.passwordResetUrl, contains('lostpassword'));
      final user = User.fromJson({'id': 1, 'name': 'Sara', 'phone': null});
      expect(user.phone, '');
    });

    test('maps snake_case enums', () {
      final c = AppConfig.fromJson(
        configJson(watermark: 'name_and_phone', embedHeight: 'fit_screen'),
      );
      expect(c.content.watermark, WatermarkMode.nameAndPhone);
      expect(c.content.embedHeight, EmbedHeightMode.fitScreen);
      expect(
        AppConfig.fromJson(configJson(embedHeight: 'as_set'))
            .content
            .embedHeight,
        EmbedHeightMode.asSet,
      );
    });

    test('unknown LMS values fall back instead of failing', () {
      final json = configJson();
      (json['features'] as Map)['lms'] = 'some_new_lms';
      expect(AppConfig.fromJson(json).features.lms, LmsKind.unknown);
    });

    test('a missing required field is a FormatException', () {
      final json = configJson();
      (json['purchases'] as Map).remove('enroll_button');
      expect(() => AppConfig.fromJson(json), throwsFormatException);
    });
  });

  test('home sections keep order and tolerate new types', () {
    final sections = [
      for (final s in homeJson()['sections'] as List)
        HomeSection.fromJson(s as Map<String, dynamic>),
    ];
    expect(sections.map((s) => s.type), [
      HomeSectionType.continueLearning,
      HomeSectionType.categories,
      HomeSectionType.featuredCourses,
      HomeSectionType.unknown,
    ]);
    expect(sections.first.course!.progress.percent, 60);
    expect(
      sections.first.course!.nextItem!.title,
      'Lesson 7: Functions & Variables',
    );
    expect(sections[2].courses[1].price.isFree, isTrue);
  });

  group('Auth', () {
    test('verify returns a session', () {
      final r = VerifyResult.fromJson(sessionJson());
      expect(r, isA<Session>());
      final s = r as Session;
      expect(s.tokens.accessToken, 'access-1');
      expect(s.tokens.expiresIn, 900);
      expect(s.user.phone, '+905321234567');
      expect(s.user.email, isNull);
    });

    test('verify returns a sign-up step', () {
      final r = VerifyResult.fromJson({
        'signup_required': true,
        'signup_token': 'tok',
        'fields': ['name', 'city'],
      });
      expect(r, isA<SignupRequired>());
      expect((r as SignupRequired).fields, [
        SignupField.name,
        SignupField.city,
      ]);
    });

    test('device input and register body', () {
      const device = DeviceInput(
        id: 'd1',
        platform: DevicePlatform.ios,
        name: 'iPhone 15',
        appVersion: '1.0.0',
      );
      expect(device.toJson(), {
        'id': 'd1',
        'platform': 'ios',
        'name': 'iPhone 15',
        'app_version': '1.0.0',
      });
      const input = RegisterInput(
        signupToken: 's',
        name: 'Sara',
        email: '',
        device: device,
      );
      expect(input.toJson().containsKey('email'), isFalse);
      expect(input.toJson()['device'], device.toJson());
    });

    test('devices, checkout link and notification preferences', () {
      final devices = DeviceList.fromJson({
        'items': [
          {
            'id': 'a',
            'platform': 'android',
            'name': 'Pixel 8',
            'last_seen_at': '2026-10-12T08:00:00Z',
            'current': true,
          },
        ],
        'limit': 2,
      });
      expect(devices.items.single.lastSeenAt, DateTime.utc(2026, 10, 12, 8));
      expect(devices.limit, 2);

      final link = CheckoutLink.fromJson({
        'url': 'https://x.test/c',
        'expires_at': '2026-10-12T09:05:00Z',
        'open_in': 'browser',
      });
      expect(link.openIn, CheckoutTarget.browser);

      expect(const NotificationPreferences(dailyReminder: true).toJson(), {
        'new_lessons': true,
        'announcements': true,
        'daily_reminder': true,
        'news': true,
      });
    });
  });

  group('Catalog', () {
    test('course summary and price label', () {
      final c = CourseSummary.fromJson(courseSummaryJson());
      expect(c.price.label, '₺450');
      expect(c.instructor!.name, 'Deniz Kaya');
      expect(c.rating, 4.6);
      expect(
        CourseSummary.fromJson(courseSummaryJson(free: true)).price.label,
        'Free',
      );
      expect(
        const Price(isFree: false, amount: '10.00', currency: 'USD').label,
        '10.00 USD',
      );
    });

    test('course detail purchase actions', () {
      for (final (wire, action) in [
        ('continue', PurchaseAction.continueLearning),
        ('enroll_free', PurchaseAction.enrollFree),
        ('checkout', PurchaseAction.checkout),
        ('none', PurchaseAction.none),
        ('something_else', PurchaseAction.none),
      ]) {
        expect(
          CourseDetail.fromJson(courseDetailJson(action: wire)).purchaseAction,
          action,
        );
      }
      final d = CourseDetail.fromJson(courseDetailJson());
      expect(d.durationMinutes, 340);
      expect(d.categories.single.name, 'Design');
      expect(d.hasCertificate, isTrue);
    });

    test('paged lists', () {
      final page = Paged.fromJson({
        ...pageJson([courseSummaryJson()]),
        'total_pages': 3,
      }, CourseSummary.fromJson);
      expect(page.items, hasLength(1));
      expect(page.meta.hasMore, isTrue);
    });

    test('course query parameters', () {
      const q = CourseQuery(
        search: '  python ',
        category: 4,
        price: PriceFilter.free,
        orderBy: CourseOrder.popular,
      );
      expect(q.toQuery(), {
        'page': 1,
        'per_page': 20,
        'search': 'python',
        'category': 4,
        'price': 'free',
        'orderby': 'popular',
      });
      expect(q.copyWith(clearCategory: true).category, isNull);
    });
  });

  group('Learning', () {
    test('curriculum', () {
      final topic = Topic.fromJson(
        (curriculumJson()['topics'] as List).first as Map<String, dynamic>,
      );
      expect(topic.items.map((i) => i.type), [
        CurriculumItemType.lesson,
        CurriculumItemType.lesson,
        CurriculumItemType.quiz,
      ]);
      expect(topic.items.first.preview, isTrue);
      expect(topic.items[2].questionCount, 10);
    });

    test('text lesson with embeds and lesson embed_height', () {
      final l = Lesson.fromJson(textLessonJson());
      expect(l.renderMode, RenderMode.native);
      expect(l.embeds, hasLength(2));
      expect(l.embeds.first.provider, EmbedProvider.youtube);
      expect(l.embeds.first.aspectRatio, closeTo(1.7778, 1e-9));
      expect(l.embeds.last.provider, EmbedProvider.other);
      expect(l.embeds.last.width, '640');
      expect(l.embedHeight, isNull);
      expect(l.attachments.single.sizeBytes, 204800);
      expect(l.nextId, 109);

      final rules = AppConfig.fromJson(configJson()).content;
      expect(l.embedHeightFor(rules), EmbedHeightMode.auto);
      final overridden = Lesson.fromJson(textLessonJson(embedHeight: 'as_set'));
      expect(overridden.embedHeight, EmbedHeightMode.asSet);
      expect(overridden.embedHeightFor(rules), EmbedHeightMode.asSet);
    });

    test('video lesson and signed URL expiry', () {
      final l = Lesson.fromJson(
        videoLessonJson(expiresAt: '2026-10-12T10:00:00Z'),
      );
      final v = l.video!;
      expect(v.source, VideoSource.upload);
      expect(v.playsNatively, isTrue);
      expect(l.positionSeconds, 252);
      expect(v.isExpired(DateTime.utc(2026, 10, 12, 9, 59)), isFalse);
      expect(v.isExpired(DateTime.utc(2026, 10, 12, 10)), isTrue);
      expect(
        Video.fromJson({'source': 'youtube', 'url': 'https://youtu.be/x'})
            .playsNatively,
        isFalse,
      );
    });

    test('progress, my course and certificates', () {
      final m = MyCourse.fromJson(myCourseJson());
      expect(m.progress.completedItems, 12);
      expect(m.course.enrolled, isTrue);
      final cert = Certificate.fromJson({
        'course_id': 1,
        'course_title': 'UI Design',
        'url': 'https://x.test/cert.pdf',
        'issued_at': null,
      });
      expect(cert.issuedAt, isNull);
    });
  });

  group('Quizzes', () {
    test('quiz details', () {
      final q = Quiz.fromJson(quizJson());
      expect(q.passPercent, 70);
      expect(q.attemptsAllowed, 3);
      expect(q.attemptsUsed, 1);
      expect(q.canStart, isTrue);
      expect(q.lastResult!.status, AttemptStatus.failed);
      expect(
        Quiz.fromJson({...quizJson(), 'attempts_allowed': null}).canStart,
        isTrue,
      );
      expect(
        Quiz.fromJson({...quizJson(), 'attempts_used': 3}).canStart,
        isFalse,
      );
    });

    test('attempt questions: native and web view', () {
      final a = Attempt.fromJson(attemptJson(endsAt: '2026-10-12T09:10:00Z'));
      expect(a.endsAt, DateTime.utc(2026, 10, 12, 9, 10));
      expect(a.questions.first.type, QuestionType.singleChoice);
      expect(a.questions.first.isNative, isTrue);
      expect(a.questions.last.type, QuestionType.ordering);
      expect(a.questions.last.isNative, isFalse);
      expect(a.questions.last.webviewUrl, isNotNull);
    });

    test('answers and results', () {
      expect(const AnswerInput(questionId: 1, optionIds: ['b']).toJson(), {
        'question_id': 1,
        'option_ids': ['b'],
      });
      final r = AttemptResult.fromJson({
        'attempt_id': 31,
        'quiz_id': 201,
        'status': 'pending_review',
        'score_percent': null,
        'finished_at': null,
      });
      expect(r.status, AttemptStatus.pendingReview);
      expect(r.statusLabel, 'Waiting for review');
    });
  });

  group('Community', () {
    test('reads notifications and the unread count', () {
      final page = NotificationPage.fromJson({
        ...pageJson([
          notificationJson(),
          notificationJson(
            id: 2,
            type: 'qna_answer',
            courseId: 42,
            questionId: 3,
            read: true,
          ),
          notificationJson(id: 3, type: 'something_new'),
        ]),
        'unread_count': 2,
      });
      expect(page.unreadCount, 2);
      expect(page.page.items[1].type, NotificationType.qnaAnswer);
      expect(page.page.items[1].target, {
        'type': 'qna_answer',
        'course_id': 42,
        'question_id': 3,
      });
      expect(page.page.items[2].type, NotificationType.unknown);
    });

    test('reads orders', () {
      final order = Order.fromJson(orderJson());
      expect(order.status, OrderStatus.onHold);
      expect(order.total, '₺450.00');
      expect(order.items.single.courseId, 42);
    });

    test('reads reviews with the summary and the student\'s own review', () {
      final page = ReviewPage.fromJson(
        reviewPageJson(mine: reviewJson(id: 9, mine: true, status: 'pending')),
      );
      expect(page.summary.rating, 4.5);
      expect(page.summary.counts, {1: 0, 2: 0, 3: 0, 4: 1, 5: 1});
      expect(page.mine?.status, ReviewStatus.pending);
      expect(page.canReview, isTrue);
      expect(page.page.items.first.author.name, 'Ayse Demir');
    });

    test('reads a question thread', () {
      final thread = QuestionThread.fromJson(questionThreadJson());
      expect(thread.question.answerCount, 1);
      expect(thread.answers.single.author.instructor, isTrue);
    });

    test('course Q&A falls back to the site setting on older plugins', () {
      expect(CourseDetail.fromJson(courseDetailJson()).qna, isNull);
      expect(
        CourseDetail.fromJson({...courseDetailJson(), 'qna': false}).qna,
        isFalse,
      );
      expect(AppConfig.fromJson(configJson()).features.orders, isFalse);
    });
  });

  group('Errors', () {
    test('reads the contract Error shape', () {
      final e = ApiException.fromResponse(429, {
        'code': 'rate_limited',
        'message': 'Too many codes requested.',
        'retry_after_seconds': 30,
      });
      expect(e.code, 'rate_limited');
      expect(e.retryAfterSeconds, 30);
      expect(e.message, 'Too many codes requested.');
    });

    test('falls back when the body is not an Error', () {
      final e = ApiException.fromResponse(503, '<html>');
      expect(e.code, 'unavailable');
      expect(e.message, isNotEmpty);
    });
  });
}
