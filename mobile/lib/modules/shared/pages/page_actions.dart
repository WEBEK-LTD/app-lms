import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/web/web_page_screen.dart';

/// Runs a tab's, button's or card's action. Actions this app type can't
/// follow (a product in an Academy app, a post) do nothing.
void runPageAction(BuildContext context, WidgetRef ref, PageAction? action) {
  if (action == null) return;
  final appType = ref.read(appEnvironmentProvider).build.appType;
  switch (action.type) {
    case PageActionType.page:
      final slug = action.pageSlug;
      if (slug != null && slug.isNotEmpty) {
        openLocation(context, Paths.page(slug));
      }
    case PageActionType.screen:
      final screen = action.screen;
      if (screen == null) return;
      final gate = ref.read(appGateProvider);
      final location = ref
          .read(appModuleProvider)
          .screenLocation(screen, gate is GateReady ? gate.config : null);
      if (location != null) openLocation(context, location);
    case PageActionType.course:
      final id = action.courseId;
      if (id != null && appType == AppType.lms) {
        context.push(Paths.course(id));
      }
    case PageActionType.item:
      final item = action.item;
      final location = item == null ? null : itemLocation(item, appType);
      if (location != null) context.push(location);
    case PageActionType.url:
      final url = action.url;
      final uri = url == null ? null : Uri.tryParse(url);
      if (uri == null || !uri.hasScheme) return;
      if (action.openIn == OpenIn.browser ||
          !(uri.scheme == 'https' || uri.scheme == 'http')) {
        openExternal(url!);
      } else {
        context.push(
          Paths.web,
          extra: WebPageArgs(url: url!, title: uri.host),
        );
      }
  }
}

/// 30 Whether this app type can follow [action]: an Academy app's course in a
/// Store app (a site whose plugins don't match the app's type) can't, and
/// shows nothing rather than a card that does nothing when tapped. Pages,
/// screens and links are checked where they're opened.
bool canFollowAction(
  PageAction action,
  AppType appType,
) => switch (action.type) {
  PageActionType.course => action.courseId != null && appType == AppType.lms,
  PageActionType.item =>
    action.item != null && itemLocation(action.item!, appType) != null,
  PageActionType.page || PageActionType.screen || PageActionType.url => true,
};

/// 38 Whether tapping [action] opens something: also a built-in screen this
/// app has with its site's features (a Wishlist tile in an academy without
/// a wishlist would do nothing).
bool canOpenAction(WidgetRef ref, PageAction action) {
  if (action.type != PageActionType.screen) {
    return canFollowAction(
      action,
      ref.read(appEnvironmentProvider).build.appType,
    );
  }
  final screen = action.screen;
  if (screen == null) return false;
  final gate = ref.watch(appGateProvider);
  return ref
          .read(appModuleProvider)
          .screenLocation(screen, gate is GateReady ? gate.config : null) !=
      null;
}

/// A list's entries this app can open, and the ones meant only to be read
/// (no action).
List<PageItem> followableItems(List<PageItem> items, AppType appType) => [
  for (final item in items)
    if (item.tapAction == null || canFollowAction(item.tapAction!, appType))
      item,
];

/// The detail screen of a list entry, when this app type has one.
String? itemLocation(ItemRef item, AppType appType) {
  // 23 Articles keep their ID as it is (a feed's are long numbers).
  if (item.source == ItemSource.articles && appType == AppType.news) {
    return item.id.isEmpty ? null : Paths.article(item.id);
  }
  if (item.source == ItemSource.events && appType == AppType.events) {
    final event = int.tryParse(item.id);
    return event == null ? null : Paths.event(event);
  }
  final id = int.tryParse(item.id);
  if (id == null) return null;
  return switch ((item.source, appType)) {
    (ItemSource.courses, AppType.lms) => Paths.course(id),
    (ItemSource.products, AppType.store) => Paths.product(id),
    (ItemSource.services, AppType.booking) => Paths.service(id),
    (ItemSource.listings, AppType.realEstate) => Paths.listing(id),
    (ItemSource.campaigns, AppType.donations) => Paths.campaign(id),
    // 104 A service opens the send screen with it chosen.
    (ItemSource.deliveryServices, AppType.delivery) => Paths.sendWith(id),
    // 105.1 A restaurant opens with its menu.
    (ItemSource.restaurants, AppType.food) => Paths.restaurant(id),
    _ => null,
  };
}

/// The search screen for a list source, when this app type has one.
String? searchLocation(ItemSource? source, AppType appType) => switch ((
  source,
  appType,
)) {
  (ItemSource.courses, AppType.lms) => '${Paths.courses}?focus=1',
  (ItemSource.products, AppType.store) => '${Paths.shop}?focus=1',
  (ItemSource.services, AppType.booking) => Paths.services,
  (ItemSource.listings, AppType.realEstate) => '${Paths.search}?focus=1',
  (ItemSource.articles, AppType.news) => Paths.articlesFiltered(focus: true),
  (ItemSource.events, AppType.events) => Paths.eventsFiltered(focus: true),
  _ => null,
};

/// The catalog filtered to a category, when this app type has one.
String? categoryLocation(ItemSource? source, AppType appType, int id) =>
    switch ((source, appType)) {
      (ItemSource.courses, AppType.lms) => Paths.coursesFiltered(category: id),
      (ItemSource.products, AppType.store) => Paths.shopFiltered(category: id),
      (ItemSource.services, AppType.booking) => Paths.servicesFiltered(
        category: id,
      ),
      (ItemSource.articles, AppType.news) => Paths.articlesFiltered(
        category: '$id',
      ),
      _ => null,
    };
