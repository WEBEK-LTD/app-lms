/// Route locations. Screens navigate with these instead of string literals.
abstract final class Paths {
  static const signIn = '/sign-in';
  static const signInCode = '/sign-in/code';
  static const signInDetails = '/sign-in/details';

  static const home = '/home';
  static const courses = '/courses';
  static const myCourses = '/my-courses';
  static const account = '/account';

  // Store apps.
  static const shop = '/shop';
  static const cart = '/cart';

  // Bookings apps.
  static const services = '/services';
  static const appointments = '/appointments';

  /// 27 A gym's class timetable and membership.
  static const classes = '/classes';
  static const memberships = '/memberships';

  static const editProfile = '/account/edit';
  static const settings = '/account/settings';
  static const devices = '/account/settings/devices';
  static const certificates = '/account/certificates';
  static const quizResults = '/account/quiz-results';

  /// 45 Lessons saved for offline viewing.
  static const downloads = '/account/downloads';
  static const orders = '/account/orders';
  static const notifications = '/notifications';

  // Real estate apps (the search is the Home tab).
  static const search = '/search';
  static const favorites = '/favorites';
  static const messages = '/messages';

  // News & blog apps (23).
  static const articles = '/articles';
  static const saved = '/saved';

  // Events & tickets apps (28).
  static const events = '/events';
  static const tickets = '/tickets';

  // Charity & donations apps (29).
  static const campaigns = '/campaigns';
  static const myDonations = '/my-donations';

  /// 48 One of the site's own pages opened the app: asks the site what it
  /// is, then opens that screen or the page in the in-app browser.
  static const openLink = '/open';
  static String openSitePage(String url) =>
      Uri(path: openLink, queryParameters: {'url': url}).toString();

  static const embed = '/embed';
  static const web = '/web';

  /// A page built in the dashboard (`GET /pages/{slug}`).
  static String page(String slug) => '/page/${Uri.encodeComponent(slug)}';
  static const pagePrefix = '/page/';

  static String course(int id) => '/course/$id';
  static String lesson(int id) => '/lesson/$id';
  static String quiz(int id) => '/quiz/$id';
  static String question(int id) => '/question/$id';
  static String product(int id) => '/product/$id';

  /// 26 One order, for following it.
  static String order(int id) => '$orders/$id';
  static String productReviews(int id) => '/product/$id/reviews';
  static String service(int id) => '/service/$id';
  static String appointment(int id) => '/appointment/$id';
  static String listing(int id) => '/listing/$id';
  static String conversation(int id) => '/messages/$id';
  static String article(String id) => '/article/${Uri.encodeComponent(id)}';
  static String event(int id) => '/event/$id';
  static String ticket(String code) => '/ticket/${Uri.encodeComponent(code)}';

  /// The Events tab, on a category or with the search box focused.
  static String eventsFiltered({String? category, bool focus = false}) {
    final query = <String, String>{
      'category': ?category,
      if (focus) 'focus': '1',
    };
    return Uri(
      path: events,
      queryParameters: query.isEmpty ? null : query,
    ).toString();
  }

  static String campaign(int id) => '/campaign/$id';

  /// The Latest tab, on a section or with the search box focused.
  static String articlesFiltered({String? category, bool focus = false}) {
    final query = <String, String>{
      'category': ?category,
      if (focus) 'focus': '1',
    };
    return Uri(
      path: articles,
      queryParameters: query.isEmpty ? null : query,
    ).toString();
  }

  static String servicesFiltered({int? category}) => Uri(
    path: services,
    queryParameters: category == null ? null : {'category': '$category'},
  ).toString();

  static String appointmentsTab(String tab) => '$appointments?tab=$tab';

  static String shopFiltered({int? category, bool onSale = false}) {
    final query = <String, String>{
      if (category != null) 'category': '$category',
      if (onSale) 'sale': '1',
    };
    return Uri(
      path: shop,
      queryParameters: query.isEmpty ? null : query,
    ).toString();
  }

  static String coursesFiltered({int? category, String? search}) {
    final query = <String, String>{
      if (category != null) 'category': '$category',
      if (search != null && search.isNotEmpty) 'q': search,
    };
    return Uri(
      path: courses,
      queryParameters: query.isEmpty ? null : query,
    ).toString();
  }

  static String myCoursesTab(String tab) => '$myCourses?tab=$tab';

  /// Locations that need a signed-in student.
  static bool requiresAuth(String location) =>
      location.startsWith(myCourses) ||
      location.startsWith(account) ||
      location.startsWith(notifications) ||
      location.startsWith('/appointment') ||
      location.startsWith('/question/') ||
      location.startsWith('/quiz/') ||
      // 28 A ticket is the signed-in user's own.
      location.startsWith('/ticket/');

  static bool isSignIn(String location) => location.startsWith(signIn);
}
