/// 235 Where the community screens are (lib/core/routing/inner_screens.dart
/// gives Studio the pushed ones).
abstract final class CommunityPaths {
  static const feed = '/community';
  static const questions = '/community/questions';
  static const groups = '/community/groups';
  static const messages = '/community/messages';
  static const profile = '/community/me';

  static String question(String id) => '/community/question/$id';
  static String conversation(String id) => '/community/conversation/$id';
}
