import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/language.dart';
import '../../../core/providers.dart';

/// One dashboard page. Reloads when the user signs in or out (blocks can be
/// meant for either) and when the language changes.
final pageProvider = FutureProvider.autoDispose.family<AppPage, String>((
  ref,
  slug,
) {
  ref
    ..watch(authControllerProvider.select((s) => s.isSignedIn))
    ..watch(appLanguageProvider);
  return ref.contentApi.getPage(slug);
});
