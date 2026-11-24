/// The shell's screens (area D). E's are in feature_routes.dart.
abstract final class Paths {
  static const welcome = '/welcome';
  static const signUp = '/signup';
  static const logIn = '/login';
  static const forgot = '/forgot';

  /// The tabs (under the floating tab bar).
  static const home = '/';
  static const groups = '/groups';

  static const me = '/me';
  static const editProfile = '/me/edit';
  static const friendRequests = '/me/friend-requests';
  static String member(String id) => '/members/$id';
  static String followers(String id) => '/members/$id/followers';
  static String following(String id) => '/members/$id/following';
  static String friends(String id) => '/members/$id/friends';

  static const settings = '/settings';
  static const blocked = '/settings/blocked';
  static const language = '/settings/language';

  /// The screens a signed-out visitor may open.
  static const public = {welcome, signUp, logIn, forgot};
}
