import 'catalog_models.dart';
import 'json.dart';
import 'learning_models.dart';

/// `GET /pages`: the bottom tabs and the pages published in the dashboard.
class Navigation {
  const Navigation({
    required this.version,
    required this.tabs,
    required this.pages,
  });

  /// Tabs whose target the app doesn't know are left out; [usable] says
  /// whether enough remain to replace the built-in tabs.
  factory Navigation.fromJson(Json json) => Navigation(
    version: reqString(json, 'version'),
    tabs: [for (final tab in reqListOf(json, 'tabs', NavTab.tryParse)) ?tab]
        .take(maxTabs)
        .toList(),
    pages: listOf(json, 'pages', PageSummary.fromJson),
  );

  static const minTabs = 2;
  static const maxTabs = 5;

  final String version;
  final List<NavTab> tabs;
  final List<PageSummary> pages;

  bool get usable => tabs.length >= minTabs;
}

class NavTab {
  const NavTab({
    required this.id,
    required this.label,
    required this.icon,
    required this.target,
  });

  /// Null when the tab's target is an action this app doesn't know.
  static NavTab? tryParse(Json json) {
    final target = PageAction.tryParse(json['target']);
    if (target == null) return null;
    return NavTab(
      id: reqString(json, 'id'),
      label: reqString(json, 'label'),
      icon: reqString(json, 'icon'),
      target: target,
    );
  }

  final String id;
  final String label;

  /// A Google Material Symbols (Rounded) name, for example `home`.
  final String icon;
  final PageAction target;
}

class PageSummary {
  const PageSummary({
    required this.slug,
    required this.title,
    required this.updatedAt,
  });

  factory PageSummary.fromJson(Json json) => PageSummary(
    slug: reqString(json, 'slug'),
    title: reqString(json, 'title'),
    updatedAt: reqDate(json, 'updated_at'),
  );

  final String slug;
  final String title;
  final DateTime updatedAt;
}

/// `GET /pages/{slug}`: one page as a list of blocks.
class AppPage {
  const AppPage({
    required this.slug,
    required this.title,
    required this.updatedAt,
    required this.blocks,
    this.showTitle = true,
  });

  /// Blocks the app doesn't know, or can't read, are skipped.
  factory AppPage.fromJson(Json json) => AppPage(
    slug: reqString(json, 'slug'),
    title: reqString(json, 'title'),
    updatedAt: reqDate(json, 'updated_at'),
    showTitle: boolOr(json, 'show_title', true),
    blocks: [
      for (final block in reqListOf(json, 'blocks', PageBlock.tryParse)) ?block,
    ],
  );

  final String slug;
  final String title;
  final DateTime updatedAt;
  final bool showTitle;
  final List<PageBlock> blocks;
}

enum PageActionType { page, screen, course, item, url }

/// Built-in screens a tab, button or card can open.
enum BuiltInScreen {
  courses,
  myCourses,
  search,
  favorites,
  messages,
  account,
  settings,
  notifications,
  cart,
  orders,
  services,
  appointments,
  articles,
  bookmarks,
}

enum OpenIn { inApp, browser }

/// What happens on tap (the contract's `Action`).
class PageAction {
  const PageAction({
    required this.type,
    this.pageSlug,
    this.screen,
    this.courseId,
    this.item,
    this.url,
    this.openIn = OpenIn.inApp,
  });

  /// Null for a missing action or one whose type this app doesn't know.
  static PageAction? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final type = enumOrNull(PageActionType.values, json['type']);
    if (type == null) return null;
    return PageAction(
      type: type,
      pageSlug: optString(json, 'page_slug'),
      screen: _screenFrom(json['screen']),
      courseId: optInt(json, 'course_id'),
      item: ItemRef.tryParse(json['item']),
      url: optString(json, 'url'),
      openIn: enumFromSnake(OpenIn.values, json['open_in'], OpenIn.inApp),
    );
  }

  final PageActionType type;
  final String? pageSlug;

  /// Null when the screen is missing or unknown to this app.
  final BuiltInScreen? screen;
  final int? courseId;
  final ItemRef? item;
  final String? url;
  final OpenIn openIn;
}

BuiltInScreen? _screenFrom(Object? wire) {
  if (wire is! String) return null;
  for (final screen in BuiltInScreen.values) {
    if (snake(screen) == wire) return screen;
  }
  return null;
}

/// Where a list comes from.
enum ItemSource { courses, products, services, posts, listings, articles }

/// An entry from a list source, for `item` actions.
class ItemRef {
  const ItemRef({required this.source, required this.id});

  static ItemRef? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final source = enumOrNull(ItemSource.values, json['source']);
    final id = optString(json, 'id');
    if (source == null || id == null) return null;
    return ItemRef(source: source, id: id);
  }

  final ItemSource source;
  final String id;
}

/// One card in a list block, the same shape for every source.
class PageItem {
  const PageItem({
    required this.source,
    required this.id,
    required this.title,
    this.subtitle,
    this.imageUrl,
    this.priceLabel,
    this.badge,
    this.favorited = false,
    this.action,
  });

  factory PageItem.fromJson(Json json) => PageItem(
    source: enumOrNull(ItemSource.values, json['source']),
    id: reqString(json, 'id'),
    title: reqString(json, 'title'),
    subtitle: optString(json, 'subtitle'),
    imageUrl: optString(json, 'image_url'),
    priceLabel: optString(json, 'price_label'),
    badge: optString(json, 'badge'),
    favorited: boolOr(json, 'favorited', false),
    action: PageAction.tryParse(json['action']),
  );

  /// Null for a source added to the contract later.
  final ItemSource? source;
  final String id;
  final String title;
  final String? subtitle;
  final String? imageUrl;

  /// Display text only. Never a purchase button.
  final String? priceLabel;
  final String? badge;
  final bool favorited;
  final PageAction? action;

  /// What a tap does: the item's own action, else its detail screen.
  PageAction? get tapAction {
    if (action != null) return action;
    final s = source;
    if (s == null) return null;
    return PageAction(
      type: PageActionType.item,
      item: ItemRef(source: s, id: id),
    );
  }
}

/// One block on a page. Unknown types are skipped by [tryParse].
sealed class PageBlock {
  const PageBlock({required this.id, this.title});

  /// Null for a block type this app doesn't know, or one it can't read, so
  /// one bad block never breaks the page.
  static PageBlock? tryParse(Json json) {
    try {
      final id = reqString(json, 'id');
      final title = optString(json, 'title');
      return switch (json['type']) {
        'banner' => BannerBlock(
          id: id,
          title: title,
          imageUrl: reqString(json, 'image_url'),
          heading: optString(json, 'heading'),
          subheading: optString(json, 'subheading'),
          action: PageAction.tryParse(json['action']),
        ),
        'text' => TextBlock(
          id: id,
          title: title,
          html: reqString(json, 'html'),
        ),
        'image' => ImageBlock(
          id: id,
          title: title,
          imageUrl: reqString(json, 'image_url'),
          aspectRatio: optDouble(json, 'aspect_ratio'),
          action: PageAction.tryParse(json['action']),
        ),
        'video' => VideoBlock(
          id: id,
          title: title,
          url: reqString(json, 'url'),
          posterUrl: optString(json, 'poster_url'),
        ),
        'button' => ButtonBlock(
          id: id,
          title: title,
          label: reqString(json, 'label'),
          icon: optString(json, 'icon'),
          style: enumFrom(
            PageButtonStyle.values,
            json['style'],
            PageButtonStyle.filled,
          ),
          action: PageAction.tryParse(json['action']),
        ),
        'items' => ItemsBlock(
          id: id,
          title: title,
          source: enumOrNull(ItemSource.values, json['source']),
          layout: enumFrom(
            ItemsLayout.values,
            json['layout'],
            ItemsLayout.carousel,
          ),
          seeAll: PageAction.tryParse(json['see_all']),
          items: reqListOf(json, 'items', PageItem.fromJson),
        ),
        'categories' => CategoriesBlock(
          id: id,
          title: title,
          source: enumOrNull(ItemSource.values, json['source']),
          style: enumFrom(
            CategoriesStyle.values,
            json['style'],
            CategoriesStyle.chips,
          ),
          categories: reqListOf(json, 'categories', Category.fromJson),
        ),
        'search' => SearchBlock(
          id: id,
          title: title,
          source: enumOrNull(ItemSource.values, json['source']),
          placeholder: reqString(json, 'placeholder'),
        ),
        'continue_learning' => ContinueLearningBlock(
          id: id,
          title: title,
          course: MyCourse.fromJson(asJson(json['course'], 'course')),
        ),
        'embed' => EmbedBlock(
          id: id,
          title: title,
          url: reqString(json, 'url'),
          height: optInt(json, 'height'),
        ),
        'spacer' => SpacerBlock(
          id: id,
          title: title,
          size: enumFrom(SpacerSize.values, json['size'], SpacerSize.medium),
        ),
        _ => null,
      };
    } on FormatException {
      return null;
    }
  }

  final String id;
  final String? title;
}

class BannerBlock extends PageBlock {
  const BannerBlock({
    required super.id,
    super.title,
    required this.imageUrl,
    this.heading,
    this.subheading,
    this.action,
  });

  final String imageUrl;
  final String? heading;
  final String? subheading;
  final PageAction? action;
}

class TextBlock extends PageBlock {
  const TextBlock({required super.id, super.title, required this.html});

  /// Cleaned by the server with the same rules as lesson HTML.
  final String html;
}

class ImageBlock extends PageBlock {
  const ImageBlock({
    required super.id,
    super.title,
    required this.imageUrl,
    this.aspectRatio,
    this.action,
  });

  final String imageUrl;

  /// Width divided by height.
  final double? aspectRatio;
  final PageAction? action;
}

class VideoBlock extends PageBlock {
  const VideoBlock({
    required super.id,
    super.title,
    required this.url,
    this.posterUrl,
  });

  /// An MP4 link, or a YouTube or Vimeo page.
  final String url;
  final String? posterUrl;
}

enum PageButtonStyle { filled, outlined, text }

class ButtonBlock extends PageBlock {
  const ButtonBlock({
    required super.id,
    super.title,
    required this.label,
    required this.style,
    this.icon,
    this.action,
  });

  final String label;

  /// A Google Material Symbols (Rounded) name.
  final String? icon;
  final PageButtonStyle style;

  /// Null when the action is unknown to this app: the button then does
  /// nothing.
  final PageAction? action;
}

enum ItemsLayout { carousel, grid, list }

class ItemsBlock extends PageBlock {
  const ItemsBlock({
    required super.id,
    super.title,
    required this.source,
    required this.layout,
    required this.items,
    this.seeAll,
  });

  final ItemSource? source;
  final ItemsLayout layout;
  final PageAction? seeAll;
  final List<PageItem> items;
}

enum CategoriesStyle { chips, tiles }

class CategoriesBlock extends PageBlock {
  const CategoriesBlock({
    required super.id,
    super.title,
    required this.source,
    required this.categories,
    this.style = CategoriesStyle.chips,
  });

  final ItemSource? source;
  final CategoriesStyle style;
  final List<Category> categories;
}

class SearchBlock extends PageBlock {
  const SearchBlock({
    required super.id,
    super.title,
    required this.source,
    required this.placeholder,
  });

  final ItemSource? source;
  final String placeholder;
}

class ContinueLearningBlock extends PageBlock {
  const ContinueLearningBlock({
    required super.id,
    super.title,
    required this.course,
  });

  final MyCourse course;
}

class EmbedBlock extends PageBlock {
  const EmbedBlock({
    required super.id,
    super.title,
    required this.url,
    this.height,
  });

  final String url;

  /// Height in logical pixels when the page can't be measured.
  final int? height;
}

enum SpacerSize { small, medium, large }

class SpacerBlock extends PageBlock {
  const SpacerBlock({required super.id, super.title, required this.size});

  final SpacerSize size;
}
