/// JSON shaped exactly like the examples in docs/api/openapi.yaml.
library;

Map<String, dynamic> configJson({
  bool enrollButton = true,
  bool freeEnrollment = true,
  String watermark = 'phone',
  String embedHeight = 'auto',
  bool updateRequired = false,
  bool maintenance = false,
  bool signupAllowed = true,
  bool wishlist = true,
}) => {
  'site': {
    'name': 'Your Academy',
    'url': 'https://your-academy.com',
    'terms_url': 'https://your-academy.com/terms',
    'privacy_url': 'https://your-academy.com/privacy',
    'support_whatsapp': '+90 532 123 45 67',
  },
  'branding': {'logo_url': null, 'primary_color': '#0E0D24'},
  'features': {
    'lms': 'tutor',
    'lms_version': '3.8.0',
    'pro': true,
    'certificates': true,
    'quizzes': true,
    'wishlist': wishlist,
    'reviews': true,
    'qna': false,
    'push': true,
  },
  'auth': {
    'signup_allowed': signupAllowed,
    'signup_fields': ['name', 'email'],
    'default_country_code': '+90',
  },
  'purchases': {
    'enroll_button': enrollButton,
    'free_enrollment': freeEnrollment,
    'checkout_opens_in': 'in_app',
  },
  'content': {
    'block_screen_capture': true,
    'watermark': watermark,
    'embed_fullscreen_button': true,
    'embed_height': embedHeight,
    'code_highlighting': true,
    'required_watch_percent': 80,
  },
  'app': {
    'update_required': updateRequired,
    'maintenance': maintenance,
    'maintenance_message': maintenance ? 'Back at 10:00.' : null,
  },
};

Map<String, dynamic> userJson() => {
  'id': 7,
  'name': 'Sara Yilmaz',
  'phone': '+905321234567',
  'email': null,
  'city': 'Istanbul',
  'avatar_url': null,
};

Map<String, dynamic> sessionJson() => {
  'access_token': 'access-1',
  'refresh_token': 'refresh-1',
  'expires_in': 900,
  'user': userJson(),
};

Map<String, dynamic> courseSummaryJson({
  int id = 1,
  String title = 'UI Design Fundamentals',
  bool free = false,
  bool enrolled = false,
}) => {
  'id': id,
  'title': title,
  'image_url': null,
  'instructor': {
    'id': 3,
    'name': 'Deniz Kaya',
    'avatar_url': null,
    'bio': null,
  },
  'price': free
      ? {
          'is_free': true,
          'amount': null,
          'sale_amount': null,
          'currency': null,
          'formatted': null,
        }
      : {
          'is_free': false,
          'amount': '450.00',
          'sale_amount': null,
          'currency': 'TRY',
          'formatted': '₺450',
        },
  'lesson_count': 24,
  'rating': 4.6,
  'rating_count': 120,
  'enrolled': enrolled,
  'wishlisted': false,
};

Map<String, dynamic> courseDetailJson({
  int id = 1,
  String action = 'checkout',
  bool free = false,
  bool enrolled = false,
}) => {
  ...courseSummaryJson(id: id, free: free, enrolled: enrolled),
  'description_html': '<p>Learn the basics of interface design.</p>',
  'intro_video': null,
  'duration_minutes': 340,
  'level': 'Beginner',
  'has_certificate': true,
  'categories': [
    {'id': 4, 'name': 'Design', 'count': 12},
  ],
  'purchase': {'action': action},
};

Map<String, dynamic> curriculumJson() => {
  'topics': [
    {
      'id': 10,
      'title': 'Module 1: Introduction',
      'items': [
        {
          'id': 101,
          'type': 'lesson',
          'title': 'What is UI design?',
          'duration_minutes': 8,
          'question_count': null,
          'preview': true,
          'locked': false,
          'completed': false,
        },
        {
          'id': 102,
          'type': 'lesson',
          'title': 'Designer tools',
          'duration_minutes': 12,
          'question_count': null,
          'preview': false,
          'locked': true,
          'completed': false,
        },
        {
          'id': 201,
          'type': 'quiz',
          'title': 'Module 1 quiz',
          'duration_minutes': null,
          'question_count': 10,
          'preview': false,
          'locked': true,
          'completed': false,
        },
      ],
    },
  ],
};

Map<String, dynamic> myCourseJson() => {
  'course': courseSummaryJson(enrolled: true),
  'progress': {
    'course_id': 1,
    'completed_items': 12,
    'total_items': 20,
    'percent': 60,
    'course_completed': false,
  },
  'next_item': {
    'id': 107,
    'type': 'lesson',
    'title': 'Lesson 7: Functions & Variables',
    'duration_minutes': 9,
    'question_count': null,
    'preview': false,
    'locked': false,
    'completed': false,
  },
  'certificate_url': null,
};

Map<String, dynamic> homeJson() => {
  'sections': [
    {'type': 'continue_learning', 'title': null, 'course': myCourseJson()},
    {
      'type': 'categories',
      'title': 'Categories',
      'categories': [
        {'id': 4, 'name': 'Design', 'count': 12},
      ],
    },
    {
      'type': 'featured_courses',
      'title': 'Featured courses',
      'courses': [
        courseSummaryJson(),
        courseSummaryJson(id: 2, title: 'Business English', free: true),
      ],
    },
    {'type': 'something_new', 'title': 'Ignored'},
  ],
};

Map<String, dynamic> textLessonJson({String? embedHeight}) => {
  'id': 108,
  'course_id': 1,
  'title': 'Writing your first function',
  'render_mode': 'native',
  'html':
      '<p>A function is a reusable block of code. Use <code>def</code>.</p>'
      '<pre><code class="language-python">def greet(name):\n    return f"Hello, {name}!"</code></pre>'
      '<p>Try the challenge:</p>'
      '<div data-yallapp-embed="yallapp-embed-1"></div>'
      '<p>[yallapp-embed-2]</p>',
  'webview_url': null,
  'embeds': [
    {
      'placeholder': 'yallapp-embed-1',
      'src': 'https://www.youtube.com/embed/abc123',
      'provider': 'youtube',
      'width': '100%',
      'height': '315',
      'aspect_ratio': 1.7778,
      'allow_fullscreen': true,
    },
    {
      'placeholder': 'yallapp-embed-2',
      'src': 'https://tools.example.org/challenge',
      'provider': 'other',
      'width': '640',
      'height': '900',
      'aspect_ratio': null,
      'allow_fullscreen': true,
    },
  ],
  'embed_height': embedHeight,
  'video': null,
  'attachments': [
    {
      'name': 'Slides.pdf',
      'url': 'https://your-academy.com/slides.pdf',
      'size_bytes': 204800,
      'mime_type': 'application/pdf',
    },
  ],
  'completed': false,
  'position_seconds': 0,
  'previous_id': 107,
  'next_id': 109,
};

Map<String, dynamic> videoLessonJson() => {
  'id': 107,
  'course_id': 1,
  'title': 'Lesson 7: Functions & Variables',
  'render_mode': 'native',
  'html': null,
  'webview_url': null,
  'embeds': <Object>[],
  'video': {
    'source': 'upload',
    'url': 'https://your-academy.com/video.mp4?sig=abc',
    'expires_at': '2026-10-12T10:00:00Z',
    'embed_html': null,
    'duration_seconds': 750,
    'poster_url': null,
  },
  'attachments': <Object>[],
  'completed': false,
  'position_seconds': 252,
  'previous_id': 106,
  'next_id': 108,
};

Map<String, dynamic> quizJson() => {
  'id': 201,
  'course_id': 1,
  'title': 'Module 2 quiz',
  'question_count': 2,
  'time_limit_seconds': 600,
  'pass_percent': 70,
  'attempts_allowed': 3,
  'attempts_used': 1,
  'last_result': {
    'attempt_id': 30,
    'quiz_id': 201,
    'quiz_title': 'Module 2 quiz',
    'status': 'failed',
    'score_percent': 50,
    'finished_at': '2026-10-01T09:00:00Z',
  },
};

Map<String, dynamic> attemptJson() => {
  'id': 31,
  'quiz_id': 201,
  'started_at': '2026-10-12T09:00:00Z',
  'ends_at': '2026-10-12T09:10:00Z',
  'questions': [
    {
      'id': 1,
      'type': 'single_choice',
      'title': 'Which keyword defines a function in Python?',
      'description_html': null,
      'render_mode': 'native',
      'webview_url': null,
      'options': [
        {'id': 'a', 'label': 'function', 'image_url': null},
        {'id': 'b', 'label': 'def', 'image_url': null},
      ],
      'points': 1,
    },
    {
      'id': 2,
      'type': 'ordering',
      'title': 'Put the steps in order',
      'description_html': null,
      'render_mode': 'webview',
      'webview_url': 'https://your-academy.com/quiz-question/2?sig=x',
      'options': <Object>[],
      'points': 2,
    },
  ],
};

Map<String, dynamic> pageJson(List<Map<String, dynamic>> items) => {
  'page': 1,
  'per_page': 20,
  'total': items.length,
  'total_pages': 1,
  'items': items,
};
