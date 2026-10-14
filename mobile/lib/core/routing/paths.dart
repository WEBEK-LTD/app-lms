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

  static const editProfile = '/account/edit';
  static const settings = '/account/settings';
  static const devices = '/account/settings/devices';
  static const certificates = '/account/certificates';
  static const quizResults = '/account/quiz-results';
  static const orders = '/account/orders';
  static const notifications = '/notifications';

  // Real estate apps (the search is the Home tab).
  static const search = '/search';
  static const favorites = '/favorites';
  static const messages = '/messages';

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
  static String productReviews(int id) => '/product/$id/reviews';
  static String service(int id) => '/service/$id';
  static String appointment(int id) => '/appointment/$id';
  static String listing(int id) => '/listing/$id';
  static String conversation(int id) => '/messages/$id';

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
      location.startsWith('/quiz/');

  static bool isSignIn(String location) => location.startsWith(signIn);
}
