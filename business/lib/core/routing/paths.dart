/// 59 Every screen's address. Pushes and the Today screen's links use them.
abstract final class Paths {
  static const splash = '/';
  static const signIn = '/sign-in';
  static const lock = '/lock';
  static const account = '/account';
  static const apps = '/apps';

  // The tabs.
  static const today = '/today';
  static const orders = '/orders';
  static const appointments = '/appointments';
  static const events = '/events';
  static const donations = '/donations';
  static const catalog = '/catalog';
  static const inbox = '/inbox';
  // 77 The app's chat.
  static const chat = '/chat';
  static const stats = '/stats';
  static const more = '/more';

  // Full screens.
  static const updates = '/updates';
  static String order(int id) => '/orders/$id';
  static String moveAppointment(int id) => '/appointments/$id/move';
  static const kitchen = '/kitchen';
  static String scan([int? eventId]) =>
      eventId == null ? '/scan' : '/scan?event=$eventId';
  static String addLesson(int courseId, int topicId) =>
      '/lesson?course=$courseId&topic=$topicId';
  static const media = '/media';
  static String inquiry(int id) => '/inbox/$id';
  // 63 Course questions and reviews in the Inbox, a gym's door.
  static String inboxTab(String tab) => '/inbox?tab=$tab';
  static String question(int id) => '/inbox/questions/$id';
  static const memberScan = '/scan/members';
  static const members = '/members';
  static const users = '/users';
  static const notify = '/notify';
  static const preview = '/preview';
  static const builds = '/builds';
  static const plan = '/plan';
  static const language = '/settings/language';
  static const appearance = '/settings/appearance';
  static const notifications = '/settings/notifications';
  static const devices = '/settings/devices';

  // 77 A chat conversation and the reported messages.
  static String chatConversation(String id) =>
      '/chat/${Uri.encodeComponent(id)}';
  static const chatReports = '/chat/reports';

  // 60 The owner's team.
  static const team = '/team';

  // 125 Studio apps: their tabs…
  static const foodOrders = '/food-orders';
  static const shipments = '/shipments';
  static const rides = '/rides';
  static const market = '/market';
  static const school = '/school';

  /// A school's Notify tab (the same screen as [notify]).
  static const notifyTab = '/send-notification';

  // …and their screens.
  static String foodOrder(String id) =>
      '/food-orders/${Uri.encodeComponent(id)}';
  static const restaurants = '/restaurants';
  static String shipment(String id) => '/shipments/${Uri.encodeComponent(id)}';
  static const couriers = '/couriers';
  static String ride(String id) => '/rides/${Uri.encodeComponent(id)}';
  static const drivers = '/drivers';
  static String marketTab(String tab) => '/market?tab=$tab';
  static String marketOrder(String id) =>
      '/market/orders/${Uri.encodeComponent(id)}';
  static String complaint(String id) =>
      '/market/complaints/${Uri.encodeComponent(id)}';

  /// excuses, reports or leave; [id] opens that one.
  static String schoolReview(String kind, [String? id]) => id == null
      ? '/school-review?kind=$kind'
      : '/school-review?kind=$kind&id=${Uri.encodeComponent(id)}';

  // 125 Prime and VIP.
  static const prime = '/prime';
  static const insights = '/prime-insights';
  static const smartAlerts = '/prime-alerts';
  static const look = '/prime-look';
  static const vip = '/vip';
}

/// The tabs' roots: a link to one of them goes there, any other screen
/// opens over the current one.
const tabRoots = {
  Paths.today,
  Paths.orders,
  Paths.appointments,
  Paths.events,
  Paths.donations,
  Paths.catalog,
  Paths.inbox,
  Paths.chat,
  Paths.stats,
  Paths.more,
  // 125
  Paths.foodOrders,
  Paths.shipments,
  Paths.rides,
  Paths.market,
  Paths.school,
  Paths.notifyTab,
};
