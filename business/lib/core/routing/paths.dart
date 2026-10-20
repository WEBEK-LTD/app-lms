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
  static const stats = '/stats';
  static const more = '/more';

  // Full screens.
  static const updates = '/updates';
  static String order(int id) => '/orders/$id';
  static const kitchen = '/kitchen';
  static String scan([int? eventId]) =>
      eventId == null ? '/scan' : '/scan?event=$eventId';
  static String addLesson(int courseId, int topicId) =>
      '/lesson?course=$courseId&topic=$topicId';
  static const media = '/media';
  static String inquiry(int id) => '/inbox/$id';
  static const users = '/users';
  static const notify = '/notify';
  static const preview = '/preview';
  static const builds = '/builds';
  static const plan = '/plan';
  static const language = '/settings/language';
  static const notifications = '/settings/notifications';
  static const devices = '/settings/devices';
}
