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
  static const subscriptions = '/account/memberships';
  static const quizResults = '/account/quiz-results';

  /// 112.5 The student's live classes.
  static const liveClasses = '/account/live-classes';

  /// 113.7 Learning paths, and the student's points and badges.
  static const learningPaths = '/learning-paths';
  static const achievements = '/account/achievements';
  static String learningPath(int id) => '/learning-path/$id';

  /// 113.7 A course's leaderboard and the student's notes in it; a lesson's
  /// discussion.
  static String leaderboard(int courseId) => '/course/$courseId/leaderboard';
  static String courseNotes(int courseId) => '/course/$courseId/notes';
  static String lessonDiscussion(int lessonId) =>
      '/lesson/$lessonId/discussion';

  /// 45 Lessons saved for offline viewing.
  static const downloads = '/account/downloads';
  static const orders = '/account/orders';

  /// 91.4 The customer's loyalty points.
  static const points = '/account/points';
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

  // 104 Delivery and courier companies.
  static const send = '/send';
  static const shipments = '/shipments';
  static const courier = '/courier';

  /// Sending with a service chosen.
  static String sendWith(int serviceId) => '$send?service=$serviceId';
  static String shipment(int id) => '/shipment/$id';
  static String courierJob(int id) => '/courier-job/$id';

  // 105.1 Food delivery from many restaurants.
  static const restaurants = '/restaurants';
  static const foodOrders = '/food-orders';
  static const restaurantDesk = '/restaurant-desk';
  static const foodCart = '/food-cart';
  static String restaurant(int id) => '/restaurant/$id';
  static String foodOrder(int id) => '/food-order/$id';
  static String restaurantOrder(int id) => '/restaurant-order/$id';

  /// 115 A marketplace vendor's page: a restaurant or a shop.
  static String marketVendor(String id) => '/market/${Uri.encodeComponent(id)}';

  /// 115 The basket and its checkout, an order, and the customer's orders.
  static const marketCheckout = '/market-checkout';
  static String marketOrder(int id) => '/market-order/$id';
  static const marketOrders = '/market-orders';
  static String marketComplain(int orderId) => '/market-complain/$orderId';
  static String marketComplaint(int id) => '/market-complaint/$id';

  /// 115.10 The customer's wallet and the delivery club.
  static const marketWallet = '/market-wallet';
  static const marketClub = '/market-club';

  // 105.2 Ride hailing.
  static const ride = '/ride';
  static const myRides = '/my-rides';
  static const driver = '/driver';
  static String rideFollow(int id) => '/ride/$id';
  static String driverRide(int id) => '/driver-ride/$id';

  // 105.3 Academies with many teachers.
  static const teachers = '/teachers';
  static String teacherPage(int id) => '/teachers/$id';
  static const teachApply = '/teach-apply';
  static const teacherDesk = '/teacher-desk';
  static const newTeacherCourse = '/teacher-course/new';
  static String teacherCourse(int id) => '/teacher-course/$id';

  // 105.4 Schools: a student's or parent's school (for one of the students
  // they see, `student`), and the teachers' Classroom.
  static const school = '/school';

  /// 113.6 Messages with teachers (and, for a teacher, families).
  static const schoolMessages = '/school/messages';
  static String schoolPart(String part, {int? student}) => Uri(
    path: '$school/$part',
    queryParameters: student == null ? null : {'student': '$student'},
  ).toString();
  static const classroom = '/classroom';
  static String classroomClass(int id) => '$classroom/class/$id';
  static String classAttendance(int id) => '$classroom/class/$id/attendance';
  static String classroomHomework(int id) => '$classroom/homework/$id';
  static String classroomAssessment(int id) => '$classroom/assessment/$id';
  // 113.5 A class's syllabus, and the teacher's reports to the school.
  static String classSyllabus(int id) => '$classroom/class/$id/syllabus';
  static const classroomReports = '$classroom/reports';
  static String classroomReport(int id) => '$classroom/report/$id';

  // 113.2 Checking in and out; 113.3 the Staff tab, leave and the staff's news.
  static const checkin = '/school/checkin';
  static const staff = '/staff';
  static const staffLeave = '/staff/leave';
  static const staffLeaveNew = '/staff/leave/new';
  static const staffNews = '/staff/news';
  // 113.8 The school's calendar in the Staff tab (the staff's own events too).
  static const staffCalendar = '/staff/calendar';
  // 113.12 The person's own payslips.
  static const staffPayslips = '/staff/payslips';
  static String staffPayslip(int id) => '/staff/payslip/$id';

  /// 113.10 The bus's crew: their routes and a trip; 113.11 a library book.
  static const busDuty = '$school/bus-duty';
  // 113.4 The Parent tab, only parents see: the children's days, permission
  // slips, absence excuses and who picks a child up.
  static const parent = '/parent';
  static const parentSlips = '/parent/slips';
  static String parentPart(String part, {required int student}) => Uri(
    path: '$parent/$part',
    queryParameters: {'student': '$student'},
  ).toString();
  static String busRun(int id) => '$busDuty/run/$id';
  static String libraryBook(int id) => '$school/library/book/$id';
  // 113.9 A university's lecturers: their sections and advisees.
  static String classroomSection(int id) => '$classroom/section/$id';
  static String sectionAttendance(int id) =>
      '$classroom/section/$id/attendance';
  static const classroomAdvisees = '$classroom/advisees';
  static String classroomAdvisee(int id) => '$classroom/advisee/$id';

  /// 77 The chat: the conversation with the business and course groups.
  static const chat = '/chat';
  static String chatConversation(String id) =>
      '$chat/${Uri.encodeComponent(id)}';

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

  /// 113.1 A course bundle's page.
  static String bundle(int id) => '/bundle/$id';
  static String lesson(int id) => '/lesson/$id';
  static String quiz(int id) => '/quiz/$id';

  /// 112.5 An assignment and a live class of a course managed in Yallapp.
  static String assignment(int id) => '/assignment/$id';
  static String liveSession(int id) => '/live/$id';
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
      location.startsWith('$chat/') ||
      location.startsWith('/appointment') ||
      location.startsWith('/question/') ||
      location.startsWith('/quiz/') ||
      // 112.5 An assignment and a live class are the student's.
      location.startsWith('/assignment/') ||
      location.startsWith('/live/') ||
      // 28 A ticket is the signed-in user's own.
      location.startsWith('/ticket/') ||
      // 104 A shipment and a courier's job too.
      location.startsWith('/shipment/') ||
      location.startsWith('/courier') ||
      // 105.1 A food order, and the restaurant's screens.
      location.startsWith('/food-order/') ||
      // 115 A marketplace order and the customer's orders.
      location.startsWith('/market-order/') ||
      location.startsWith(marketOrders) ||
      location.startsWith('/market-complain') ||
      location.startsWith(marketWallet) ||
      location.startsWith(restaurantDesk) ||
      location.startsWith('/restaurant-order/') ||
      // 105.2 A ride, the rider's rides and the driver's screens.
      location.startsWith('$ride/') ||
      location.startsWith(myRides) ||
      location.startsWith(driver) ||
      // 105.3 Applying to teach, and the teacher's screens.
      location.startsWith(teachApply) ||
      location.startsWith(teacherDesk) ||
      location.startsWith('/teacher-course/') ||
      // 105.4 A school's screens, for the people it added.
      location.startsWith(school) ||
      location.startsWith(classroom) ||
      location.startsWith(staff) ||
      location.startsWith(parent);

  static bool isSignIn(String location) => location.startsWith(signIn);
}
