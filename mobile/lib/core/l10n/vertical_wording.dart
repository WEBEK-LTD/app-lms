import '../api/models/config_models.dart';
import '../config/build_config_data.dart';
import 'l10n.dart';

/// The app's kind of business: what the server says (`Config.vertical`),
/// else what the app was built with. Wording and defaults only, never
/// routes.
AppVertical? appVerticalOf(BuildConfigData build, AppConfig? config) =>
    config?.vertical ?? build.vertical;

/// Words that change with the kind of business (a restaurant's guests, a
/// clinic's patients). Every kind uses the default words for now; a kind's
/// own words go in the ARB files and in the switches below.
class VerticalWording {
  const VerticalWording(this.l10n, this.vertical);

  final AppLocalizations l10n;
  final AppVertical? vertical;

  /// The business that owns the app.
  String get business => switch (vertical) {
    null ||
    AppVertical.restaurant ||
    AppVertical.clinic ||
    AppVertical.fitness ||
    AppVertical.charity => l10n.wordingBusiness,
  };

  /// The business's customers.
  String get customer => switch (vertical) {
    null ||
    AppVertical.restaurant ||
    AppVertical.clinic ||
    AppVertical.fitness ||
    AppVertical.charity => l10n.wordingCustomer,
  };
}
