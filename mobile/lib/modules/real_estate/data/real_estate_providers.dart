import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/language.dart';
import '../../../core/providers.dart';

/// Signed-in state, so lists reload (with `favorited`) on sign-in and out.
final _signedInProvider = Provider<bool>(
  (ref) => ref.watch(authControllerProvider.select((s) => s.isSignedIn)),
);

/// The office's settings from `Config.listings`.
final listingsConfigProvider = Provider<ListingsConfig?>(
  (ref) => ref.watch(appConfigProvider).listings,
);

/// Whether users can message the office in the app.
final messagesEnabledProvider = Provider<bool>(
  (ref) => ref.watch(listingsConfigProvider)?.messages ?? false,
);

final listingFiltersProvider = FutureProvider.autoDispose<ListingFilters>((
  ref,
) {
  ref.watch(appLanguageProvider);
  return ref.contentApi.getListingFilters();
});

/// Search results for one set of filters, page by page.
class ListingsController extends PagedController<ListingSummary> {
  ListingsController(this.query);

  final ListingQuery query;

  @override
  PagedState<ListingSummary> build() {
    ref.watch(_signedInProvider);
    return super.build();
  }

  @override
  Future<Paged<ListingSummary>> fetch(int page) =>
      ref.read(yallappApiProvider).searchListings(query.copyWith(page: page));
}

final listingsProvider = NotifierProvider.autoDispose
    .family<ListingsController, PagedState<ListingSummary>, ListingQuery>(
      ListingsController.new,
    );

final listingProvider = FutureProvider.autoDispose.family<ListingDetail, int>((
  ref,
  id,
) {
  ref
    ..watch(_signedInProvider)
    ..watch(appLanguageProvider);
  return ref.contentApi.getListing(id);
});

class FavoritesController extends PagedController<ListingSummary> {
  @override
  PagedState<ListingSummary> build() {
    if (!ref.watch(_signedInProvider)) return const PagedState(page: 1);
    return super.build();
  }

  @override
  Future<Paged<ListingSummary>> fetch(int page) =>
      ref.read(yallappApiProvider).listFavorites(page: page);
}

final favoritesProvider =
    NotifierProvider.autoDispose<
      FavoritesController,
      PagedState<ListingSummary>
    >(FavoritesController.new);

/// Hearts the user toggled, by listing ID, over what the server last sent.
/// A toggle shows at once and is undone if the server refuses it.
final favoriteOverridesProvider =
    NotifierProvider<FavoriteOverrides, Map<int, bool>>(FavoriteOverrides.new);

class FavoriteOverrides extends Notifier<Map<int, bool>> {
  @override
  Map<int, bool> build() {
    ref.watch(_signedInProvider);
    return const {};
  }

  bool isFavorite(int id, {required bool fromServer}) =>
      state[id] ?? fromServer;

  /// Saves or removes [id]. Throws [ApiException] after undoing the change
  /// when the server refuses.
  Future<void> toggle(int id, {required bool current}) async {
    final next = !current;
    state = {...state, id: next};
    try {
      final api = ref.read(yallappApiProvider);
      if (next) {
        await api.addFavorite(id);
        ref.invalidate(favoritesProvider);
      } else {
        await api.removeFavorite(id);
      }
    } on ApiException {
      if (ref.mounted) state = {...state, id: current};
      rethrow;
    }
  }
}

class InquiriesController extends PagedController<Inquiry> {
  @override
  PagedState<Inquiry> build() {
    if (!ref.watch(_signedInProvider)) return const PagedState(page: 1);
    return super.build();
  }

  @override
  Future<Paged<Inquiry>> fetch(int page) =>
      ref.read(yallappApiProvider).listInquiries(page: page);
}

/// The user's conversations with the office, latest first.
final inquiriesProvider =
    NotifierProvider.autoDispose<InquiriesController, PagedState<Inquiry>>(
      InquiriesController.new,
    );

final inquiryProvider = FutureProvider.autoDispose.family<Inquiry, int>(
  (ref, id) => ref.contentApi.getInquiry(id),
);

/// Unread messages from the office, for the Messages tab's badge. 0 when
/// signed out or offline: the badge is a hint, never an error.
final unreadMessagesProvider = FutureProvider.autoDispose<int>((ref) async {
  if (!ref.watch(_signedInProvider) || !ref.watch(messagesEnabledProvider)) {
    return 0;
  }
  try {
    final page = await ref.read(yallappApiProvider).listInquiries();
    return page.items.fold<int>(0, (sum, i) => sum + i.unread);
  } on ApiException {
    return 0;
  }
});
