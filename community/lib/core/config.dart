/// How this build of Yallapp Community is set up, from `--dart-define`s.
/// Nothing here is a secret: Sign in with Apple and Google keys live on the
/// server (the app only sends what each provider gives it).
class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.websiteUrl,
    this.demo = false,
    this.googleClientId = '',
  });

  factory AppConfig.fromEnvironment() {
    const api = String.fromEnvironment(
      'YC_API_BASE_URL',
      defaultValue: 'https://community.yallapp.com.tr/api/community/v1',
    );
    const website = String.fromEnvironment(
      'YC_WEBSITE_URL',
      defaultValue: 'https://community.yallapp.com.tr',
    );
    const demo = bool.fromEnvironment('YC_DEMO');
    // The Google OAuth client the app signs in with (public, like any
    // OAuth client id; the server checks the token it issues).
    const google = String.fromEnvironment('YC_GOOGLE_CLIENT_ID');
    return AppConfig(
      apiBaseUrl: _trim(api),
      websiteUrl: _trim(website),
      demo: demo,
      googleClientId: google,
    );
  }

  /// The Community API (`/api/community/v1`).
  final String apiBaseUrl;

  /// The website, where anything paid is bought (never in the app).
  final String websiteUrl;

  /// Runs on the in-memory fake API with sample members (no server).
  final bool demo;
  final String googleClientId;

  static String _trim(String url) =>
      url.endsWith('/') ? url.substring(0, url.length - 1) : url;
}
