import 'catalog_models.dart';
import 'json.dart';
import 'learning_models.dart';

/// `GET /pages`: the bottom tabs, the side menu and the pages published in
/// the dashboard.
class Navigation {
  const Navigation({
    required this.version,
    required this.tabs,
    required this.pages,
    this.menu = const [],
    this.more = const [],
    this.tabBar,
  });

  /// Tabs whose target the app doesn't know are left out; [usable] says
  /// whether enough remain to replace the built-in tabs.
  factory Navigation.fromJson(Json json) => Navigation(
    version: reqString(json, 'version'),
    tabs: [for (final tab in reqListOf(json, 'tabs', NavTab.tryParse)) ?tab]
        .take(maxTabs)
        .toList(),
    more: [for (final tab in listOf(json, 'more', NavTab.tryParse)) ?tab]
        .take(maxMore)
        .toList(),
    tabBar: json['tab_bar'] is Map
        ? TabBarStyle.fromJson(asJson(json['tab_bar']))
        : null,
    menu: [for (final entry in listOf(json, 'menu', NavTab.tryParse)) ?entry]
        .take(maxMenu)
        .toList(),
    pages: listOf(json, 'pages', PageSummary.fromJson),
  );

  static const minTabs = 2;
  static const maxTabs = 5;
  static const maxMore = 6;
  static const maxMenu = 12;

  final String version;
  final List<NavTab> tabs;

  /// 109 The tabs past the fourth when there are more than five, in the
  /// list the More tab (target `more`) opens.
  final List<NavTab> more;

  /// 109 How the bottom tabs look; null, the template's usual bar.
  final TabBarStyle? tabBar;

  /// 82.5 The side menu, top to bottom; empty, no menu button.
  final List<NavTab> menu;
  final List<PageSummary> pages;

  bool get usable => tabs.length >= minTabs;
}

/// 109 When the tabs' names show under their icons.
enum TabLabels { always, active, never }

/// 109 How the bottom tabs look, set by the owner (`TabBar`); a field left
/// out keeps the template's usual look for it.
class TabBarStyle {
  const TabBarStyle({
    this.background,
    this.darkBackground,
    this.active,
    this.inactive,
    this.radius = 0,
    this.margin = 0,
    this.font,
    this.labels = TabLabels.always,
    this.center,
  });

  factory TabBarStyle.fromJson(Json json) => TabBarStyle(
    background: _hex(json['background']),
    darkBackground: _hex(json['dark_background']),
    active: _hex(json['active']),
    inactive: _hex(json['inactive']),
    radius: (optInt(json, 'radius') ?? 0).clamp(0, 32).toDouble(),
    margin: (optInt(json, 'margin') ?? 0).clamp(0, 24).toDouble(),
    font: optString(json, 'font'),
    labels: enumOrNull(TabLabels.values, json['labels']) ?? TabLabels.always,
    center: optString(json, 'center'),
  );

  static String? _hex(Object? value) =>
      value is String && RegExp(r'^#[0-9A-Fa-f]{6}$').hasMatch(value)
      ? value
      : null;

  /// Colours as `#RRGGBB`; null, the template's own.
  final String? background;
  final String? darkBackground;
  final String? active;
  final String? inactive;

  /// How round the bar's corners are.
  final double radius;

  /// The space around the bar: 0, across the bottom of the screen.
  final double margin;

  /// The names' font family; null, or one the app can't show, the app's.
  final String? font;
  final TabLabels labels;

  /// A tab's id drawn as a round button raised in the middle, when it is
  /// the middle one of three or five.
  final String? center;
}

class NavTab {
  const NavTab({
    required this.id,
    required this.label,
    required this.icon,
    required this.target,
    this.iconUrl,
  });

  /// Null when the tab's target is an action this app doesn't know.
  static NavTab? tryParse(Json json) {
    final target = PageAction.tryParse(json['target']);
    if (target == null) return null;
    return NavTab(
      id: reqString(json, 'id'),
      label: reqString(json, 'label'),
      icon: reqString(json, 'icon'),
      iconUrl: httpsUrl(json['icon_url']),
      target: target,
    );
  }

  final String id;
  final String label;

  /// A Google Material Symbols (Rounded) name, for example `home`.
  final String icon;

  /// 82.5 The owner's own icon, shown instead of [icon].
  final String? iconUrl;
  final PageAction target;
}

/// 82.5 An https address, or null.
String? httpsUrl(Object? value) =>
    value is String && value.startsWith('https://') ? value : null;

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
    this.looks = const {},
    this.background = PageBackground.none,
    this.headerImageUrl,
    this.studio,
  });

  /// Blocks the app doesn't know, or can't read, are skipped.
  factory AppPage.fromJson(Json json) => AppPage(
    slug: reqString(json, 'slug'),
    title: reqString(json, 'title'),
    updatedAt: reqDate(json, 'updated_at'),
    showTitle: boolOr(json, 'show_title', true),
    background: enumFrom(
      PageBackground.values,
      json['background'],
      PageBackground.none,
    ),
    headerImageUrl: httpsUrl(json['header_image_url']),
    blocks: [
      for (final block in reqListOf(json, 'blocks', PageBlock.tryParse)) ?block,
    ],
    looks: _looks(json['blocks']),
    studio: StudioPage.tryParse(json['studio']),
  );

  static Map<String, BlockLook> _looks(Object? blocks) {
    final looks = <String, BlockLook>{};
    for (final raw in blocks is List ? blocks : const []) {
      final look = raw is Map ? BlockLook.tryParse(raw['look']) : null;
      final id = raw is Map ? raw['id'] : null;
      if (look != null && id is String) looks[id] = look;
    }
    return looks;
  }

  final String slug;
  final String title;
  final DateTime updatedAt;
  final bool showTitle;
  final List<PageBlock> blocks;

  /// 103R A page designed in Yallapp Studio: drawn instead of its blocks.
  final StudioPage? studio;

  /// 82.5 Each block's look, by block id; a block without one has none.
  final Map<String, BlockLook> looks;

  /// 99.3 The page's background within the brand.
  final PageBackground background;

  /// 99.3 A picture across the top of the page (https only), under its
  /// title when the title shows.
  final String? headerImageUrl;
}

/// 99.3 The app's usual background, a light wash of the main colour, or
/// the colour of cards.
enum PageBackground { none, tint, surface }

enum BlockBackground { none, tint, primary, secondary, surface }

enum BlockSpacing { none, small, medium, large }

/// 99.3 Where a block's own texts and buttons sit across the page.
enum BlockAlign { start, center, end }

/// 99.3 A block's texts, smaller or larger than the app's usual size.
enum BlockTextSize { small, medium, large }

/// 99.3 The corners of a block's background and pictures: as the app's
/// look has them, square, or round.
enum BlockCorners { app, sharp, round }

/// 99.3 Pictures fill their space (cropped) or show whole.
enum BlockImageFit { cover, contain }

/// 82.5 How a block sits on its page: a background within the app's brand,
/// and the space around it. 99.3 Also where its texts sit, their size, its
/// corners and how its pictures fit.
class BlockLook {
  const BlockLook({
    this.background = BlockBackground.none,
    this.spacing = BlockSpacing.medium,
    this.align = BlockAlign.start,
    this.textSize = BlockTextSize.medium,
    this.corners = BlockCorners.app,
    this.imageFit = BlockImageFit.cover,
  });

  /// Null when it changes nothing: every field as its default.
  static BlockLook? tryParse(Object? value) {
    if (value is! Map) return null;
    final look = BlockLook(
      background: enumFrom(
        BlockBackground.values,
        value['background'],
        BlockBackground.none,
      ),
      spacing: enumFrom(
        BlockSpacing.values,
        value['spacing'],
        BlockSpacing.medium,
      ),
      align: enumFrom(BlockAlign.values, value['align'], BlockAlign.start),
      textSize: enumFrom(
        BlockTextSize.values,
        value['text_size'],
        BlockTextSize.medium,
      ),
      corners: enumFrom(
        BlockCorners.values,
        value['corners'],
        BlockCorners.app,
      ),
      imageFit: enumFrom(
        BlockImageFit.values,
        value['image_fit'],
        BlockImageFit.cover,
      ),
    );
    return look.isDefault ? null : look;
  }

  final BlockBackground background;
  final BlockSpacing spacing;

  /// 99.3 See [BlockAlign], [BlockTextSize], [BlockCorners], [BlockImageFit].
  final BlockAlign align;
  final BlockTextSize textSize;
  final BlockCorners corners;
  final BlockImageFit imageFit;

  /// Whether it changes nothing on the page.
  bool get isDefault =>
      background == BlockBackground.none &&
      spacing == BlockSpacing.medium &&
      align == BlockAlign.start &&
      textSize == BlockTextSize.medium &&
      corners == BlockCorners.app &&
      imageFit == BlockImageFit.cover;
}

/// 109 `more`: the More tab, which opens the tabs past the fourth.
enum PageActionType { page, screen, course, item, url, more }

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

  /// 27 A gym's class timetable and membership (Bookings apps).
  classes,
  memberships,

  /// 28 Events & tickets apps.
  events,
  tickets,

  /// 29 Charity & donations apps.
  campaigns,
  myDonations,

  /// 104 Delivery and courier companies.
  sendParcel,
  shipments,
  courier,

  /// 105.1 Food delivery from many restaurants.
  restaurants,
  foodOrders,
  restaurant,

  /// 105.2 Ride hailing.
  ride,
  myRides,
  driver,

  /// 105.3 Academies with many teachers: the teachers and the Teacher tab.
  teachers,
  teacher,

  /// 105.4 Schools: a student's or parent's school, and the teachers'
  /// Classroom.
  school,
  classroom,
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
enum ItemSource {
  courses,
  products,
  services,
  posts,
  listings,
  articles,
  events,
  campaigns,

  /// 104 A delivery company's services.
  deliveryServices,

  /// 105.1 A food delivery company's restaurants.
  restaurants,

  /// 105.2 A ride company's vehicle types.
  vehicleTypes,

  /// 105.4 A school's news to the whole school.
  schoolNews,
}

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
        // 33 Blocks whose content the owner writes.
        'slider' => SliderBlock(
          id: id,
          title: title,
          autoAdvance: boolOr(json, 'auto_advance', true),
          slides: _entries(json, 'slides', Slide.tryParse),
        ).orNull,
        'quick_links' => QuickLinksBlock(
          id: id,
          title: title,
          style: enumFrom(
            QuickLinksStyle.values,
            json['style'],
            QuickLinksStyle.grid,
          ),
          links: _entries(json, 'links', QuickLink.tryParse),
        ).orNull,
        'testimonials' => TestimonialsBlock(
          id: id,
          title: title,
          quotes: _entries(json, 'quotes', Testimonial.tryParse),
        ).orNull,
        'faq' => FaqBlock(
          id: id,
          title: title,
          questions: _entries(json, 'questions', FaqEntry.tryParse),
        ).orNull,
        'countdown' => CountdownBlock(
          id: id,
          title: title,
          heading: reqString(json, 'heading'),
          subheading: optString(json, 'subheading'),
          endsAt: reqDate(json, 'ends_at'),
          endedText: optString(json, 'ended_text'),
          label: optString(json, 'label'),
          action: PageAction.tryParse(json['action']),
        ),
        'contact' => ContactBlock(
          id: id,
          title: title,
          phone: optString(json, 'phone'),
          whatsapp: optString(json, 'whatsapp'),
          email: optString(json, 'email'),
          website: optString(json, 'website'),
          address: optString(json, 'address'),
          latitude: optDouble(json, 'latitude'),
          longitude: optDouble(json, 'longitude'),
        ).orNull,
        'hours' => HoursBlock(
          id: id,
          title: title,
          hours: _entries(json, 'hours', OpeningPeriod.tryParse),
          closedDates: stringList(json, 'closed_dates'),
          note: optString(json, 'note'),
        ),
        'social' => SocialBlock(
          id: id,
          title: title,
          profiles: _entries(json, 'profiles', SocialProfile.tryParse),
        ).orNull,
        'team' => TeamBlock(
          id: id,
          title: title,
          layout: enumFrom(
            ItemsLayout.values,
            json['layout'],
            ItemsLayout.carousel,
          ),
          people: _entries(json, 'people', TeamMember.tryParse),
        ).orNull,
        'stats' => StatsBlock(
          id: id,
          title: title,
          stats: _entries(json, 'stats', StatEntry.tryParse),
        ).orNull,
        'notice' => NoticeBlock(
          id: id,
          title: title,
          tone: enumFrom(NoticeTone.values, json['tone'], NoticeTone.info),
          text: reqString(json, 'text'),
          label: optString(json, 'label'),
          action: PageAction.tryParse(json['action']),
        ),
        // 99.4 Cards, photos, a place, a line and a short form.
        'cards' => CardsBlock(
          id: id,
          title: title,
          columns: _columns(json, 2),
          cards: _entries(json, 'cards', PageCard.tryParse),
        ).orNull,
        'gallery' => GalleryBlock(
          id: id,
          title: title,
          columns: _columns(json, 3),
          images: _entries(json, 'images', GalleryImage.tryParse),
        ).orNull,
        'map' => MapBlock.tryParse(json, id: id, title: title),
        'divider' => DividerBlock(
          id: id,
          title: title,
          style: enumFrom(
            DividerStyle.values,
            json['style'],
            DividerStyle.line,
          ),
        ),
        'form' => FormBlock.tryParse(json, id: id, title: title),
        _ => null,
      };
    } on FormatException {
      return null;
    }
  }

  final String id;
  final String? title;

  /// 33 False for a block whose list came without a usable entry.
  bool get hasContent => true;

  /// This block, or null when it has nothing to show.
  PageBlock? get orNull => hasContent ? this : null;
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

// ------------------------------------------------- 33 Blocks with content

/// A block's list: entries that can't be read are skipped, not the block.
List<T> _entries<T>(Json json, String key, T? Function(Json item) parse) {
  final value = json[key];
  if (value is! List) return <T>[];
  return [
    for (final item in value)
      if (item is Map) ?parse(asJson(item, key)),
  ];
}

/// A slide: an image, a heading, or both.
class Slide {
  const Slide({this.imageUrl, this.heading, this.subheading, this.action});

  static Slide? tryParse(Json json) {
    final slide = Slide(
      imageUrl: optString(json, 'image_url'),
      heading: optString(json, 'heading'),
      subheading: optString(json, 'subheading'),
      action: PageAction.tryParse(json['action']),
    );
    return (slide.imageUrl ?? slide.heading) == null ? null : slide;
  }

  final String? imageUrl;
  final String? heading;
  final String? subheading;
  final PageAction? action;
}

class SliderBlock extends PageBlock {
  const SliderBlock({
    required super.id,
    super.title,
    required this.slides,
    this.autoAdvance = true,
  });

  final List<Slide> slides;

  /// Moves to the next slide every few seconds until the user touches it.
  final bool autoAdvance;

  @override
  bool get hasContent => slides.isNotEmpty;
}

enum QuickLinksStyle { grid, row }

class QuickLink {
  const QuickLink({
    required this.icon,
    required this.label,
    required this.action,
    this.iconUrl,
  });

  /// Null without a label or an action this app knows.
  static QuickLink? tryParse(Json json) {
    final action = PageAction.tryParse(json['action']);
    final label = optString(json, 'label');
    if (action == null || label == null || label.trim().isEmpty) return null;
    return QuickLink(
      icon: optString(json, 'icon') ?? 'apps',
      iconUrl: httpsUrl(json['icon_url']),
      label: label,
      action: action,
    );
  }

  /// A Google Material Symbols (Rounded) name.
  final String icon;

  /// 82.5 The owner's own icon, shown instead of [icon].
  final String? iconUrl;
  final String label;
  final PageAction action;
}

class QuickLinksBlock extends PageBlock {
  const QuickLinksBlock({
    required super.id,
    super.title,
    required this.links,
    this.style = QuickLinksStyle.grid,
  });

  final QuickLinksStyle style;
  final List<QuickLink> links;

  @override
  bool get hasContent => links.isNotEmpty;
}

class Testimonial {
  const Testimonial({
    required this.text,
    required this.name,
    this.role,
    this.photoUrl,
    this.rating,
  });

  static Testimonial? tryParse(Json json) {
    final text = optString(json, 'text');
    final name = optString(json, 'name');
    if (text == null || name == null) return null;
    final rating = optInt(json, 'rating');
    return Testimonial(
      text: text,
      name: name,
      role: optString(json, 'role'),
      photoUrl: optString(json, 'photo_url'),
      rating: rating != null && rating >= 1 && rating <= 5 ? rating : null,
    );
  }

  final String text;
  final String name;
  final String? role;
  final String? photoUrl;

  /// Stars out of five.
  final int? rating;
}

class TestimonialsBlock extends PageBlock {
  const TestimonialsBlock({
    required super.id,
    super.title,
    required this.quotes,
  });

  final List<Testimonial> quotes;

  @override
  bool get hasContent => quotes.isNotEmpty;
}

class FaqEntry {
  const FaqEntry({required this.question, required this.answer});

  static FaqEntry? tryParse(Json json) {
    final question = optString(json, 'question');
    final answer = optString(json, 'answer');
    if (question == null || answer == null) return null;
    return FaqEntry(question: question, answer: answer);
  }

  final String question;

  /// Plain text; line breaks are kept.
  final String answer;
}

class FaqBlock extends PageBlock {
  const FaqBlock({required super.id, super.title, required this.questions});

  final List<FaqEntry> questions;

  @override
  bool get hasContent => questions.isNotEmpty;
}

/// Time left until [endsAt], counted on the phone; after the end it shows
/// [endedText], or nothing when that is null.
class CountdownBlock extends PageBlock {
  const CountdownBlock({
    required super.id,
    super.title,
    required this.heading,
    required this.endsAt,
    this.subheading,
    this.endedText,
    this.label,
    this.action,
  });

  final String heading;
  final String? subheading;
  final DateTime endsAt;
  final String? endedText;

  /// The button's text, shown with [action].
  final String? label;
  final PageAction? action;
}

/// A button for each way to reach the business.
class ContactBlock extends PageBlock {
  const ContactBlock({
    required super.id,
    super.title,
    this.phone,
    this.whatsapp,
    this.email,
    this.website,
    this.address,
    this.latitude,
    this.longitude,
  });

  final String? phone;
  final String? whatsapp;
  final String? email;
  final String? website;
  final String? address;
  final double? latitude;
  final double? longitude;

  /// Directions: to the coordinates when set, else the address.
  bool get hasPlace =>
      (latitude != null && longitude != null) ||
      (address?.trim().isNotEmpty ?? false);

  @override
  bool get hasContent =>
      [
        phone,
        whatsapp,
        email,
        website,
      ].any((v) => v?.trim().isNotEmpty ?? false) ||
      hasPlace;
}

enum Weekday { mon, tue, wed, thu, fri, sat, sun }

/// An opening period: [closes] at or before [opens] ends the next day.
class OpeningPeriod {
  const OpeningPeriod({
    required this.day,
    required this.opens,
    required this.closes,
  });

  static OpeningPeriod? tryParse(Json json) {
    final day = enumOrNull(Weekday.values, json['day']);
    final opens = _minutes(optString(json, 'opens'));
    final closes = _minutes(optString(json, 'closes'));
    if (day == null || opens == null || closes == null) return null;
    return OpeningPeriod(day: day, opens: opens, closes: closes);
  }

  final Weekday day;

  /// Minutes after midnight.
  final int opens;
  final int closes;

  bool get overnight => closes <= opens;
}

int? _minutes(String? clock) {
  final match = RegExp(r'^([01]\d|2[0-3]):([0-5]\d)$').firstMatch(clock ?? '');
  if (match == null) return null;
  return int.parse(match.group(1)!) * 60 + int.parse(match.group(2)!);
}

class HoursBlock extends PageBlock {
  const HoursBlock({
    required super.id,
    super.title,
    required this.hours,
    this.closedDates = const [],
    this.note,
  });

  final List<OpeningPeriod> hours;

  /// Days closed although the weekday has hours, as `2026-12-31`.
  final List<String> closedDates;
  final String? note;

  @override
  bool get hasContent => hours.isNotEmpty || (note?.trim().isNotEmpty ?? false);

  /// Whether the business is open at [now], in the phone's local time.
  bool isOpenAt(DateTime now) {
    final minute = now.hour * 60 + now.minute;
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = DateTime(now.year, now.month, now.day - 1);
    for (final p in hours) {
      // Today's periods, and the part of last night's after midnight.
      if (_isDay(today, p.day) && minute >= p.opens) {
        if (p.overnight || minute < p.closes) return true;
      }
      if (p.overnight && _isDay(yesterday, p.day) && minute < p.closes) {
        return true;
      }
    }
    return false;
  }

  /// Whether [date] is [day] and not one of [closedDates].
  bool _isDay(DateTime date, Weekday day) =>
      Weekday.values[date.weekday - 1] == day &&
      !closedDates.contains(_isoDate(date));
}

String _isoDate(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-'
    '${d.month.toString().padLeft(2, '0')}-'
    '${d.day.toString().padLeft(2, '0')}';

enum SocialNetwork {
  instagram,
  facebook,
  x,
  tiktok,
  youtube,
  linkedin,
  snapchat,
  telegram,
  whatsappChannel,
}

class SocialProfile {
  const SocialProfile({required this.network, required this.url});

  static SocialProfile? tryParse(Json json) {
    final wire = json['network'];
    final url = optString(json, 'url');
    for (final network in SocialNetwork.values) {
      if (snake(network) == wire && url != null) {
        return SocialProfile(network: network, url: url);
      }
    }
    return null;
  }

  final SocialNetwork network;
  final String url;
}

class SocialBlock extends PageBlock {
  const SocialBlock({required super.id, super.title, required this.profiles});

  final List<SocialProfile> profiles;

  @override
  bool get hasContent => profiles.isNotEmpty;
}

class TeamMember {
  const TeamMember({
    required this.name,
    this.role,
    this.bio,
    this.photoUrl,
    this.action,
  });

  static TeamMember? tryParse(Json json) {
    final name = optString(json, 'name');
    if (name == null || name.trim().isEmpty) return null;
    return TeamMember(
      name: name,
      role: optString(json, 'role'),
      bio: optString(json, 'bio'),
      photoUrl: optString(json, 'photo_url'),
      action: PageAction.tryParse(json['action']),
    );
  }

  final String name;
  final String? role;
  final String? bio;
  final String? photoUrl;
  final PageAction? action;
}

class TeamBlock extends PageBlock {
  const TeamBlock({
    required super.id,
    super.title,
    required this.people,
    this.layout = ItemsLayout.carousel,
  });

  final ItemsLayout layout;
  final List<TeamMember> people;

  @override
  bool get hasContent => people.isNotEmpty;
}

class StatEntry {
  const StatEntry({required this.value, required this.label});

  static StatEntry? tryParse(Json json) {
    final value = optString(json, 'value');
    final label = optString(json, 'label');
    if (value == null || label == null) return null;
    return StatEntry(value: value, label: label);
  }

  final String value;
  final String label;
}

class StatsBlock extends PageBlock {
  const StatsBlock({required super.id, super.title, required this.stats});

  final List<StatEntry> stats;

  @override
  bool get hasContent => stats.isNotEmpty;
}

enum NoticeTone { info, success, warning }

class NoticeBlock extends PageBlock {
  const NoticeBlock({
    required super.id,
    super.title,
    required this.tone,
    required this.text,
    this.label,
    this.action,
  });

  final NoticeTone tone;
  final String text;

  /// The link's text, shown with [action].
  final String? label;
  final PageAction? action;
}

// ------------------------------- 99.4 Cards, gallery, map, divider and form

/// 99.4 Two or three columns, as the block asks; else [fallback].
int _columns(Json json, int fallback) => switch (optInt(json, 'columns')) {
  2 => 2,
  3 => 3,
  _ => fallback,
};

/// 99.4 A card in a cards block: a title, and a line of text, a picture on
/// top and a tap when it has them.
class PageCard {
  const PageCard({required this.title, this.text, this.imageUrl, this.action});

  /// Null without a title.
  static PageCard? tryParse(Json json) {
    final title = optString(json, 'title');
    if (title == null || title.trim().isEmpty) return null;
    return PageCard(
      title: title,
      text: optString(json, 'text'),
      imageUrl: optString(json, 'image_url'),
      action: PageAction.tryParse(json['action']),
    );
  }

  final String title;
  final String? text;
  final String? imageUrl;

  /// Null when the action is missing or unknown to this app: the card then
  /// does nothing.
  final PageAction? action;
}

/// 99.4 Cards in a grid of two or three columns.
class CardsBlock extends PageBlock {
  const CardsBlock({
    required super.id,
    super.title,
    required this.cards,
    this.columns = 2,
  });

  /// 2 or 3.
  final int columns;
  final List<PageCard> cards;

  @override
  bool get hasContent => cards.isNotEmpty;
}

/// 99.4 A photo in a gallery, with its caption.
class GalleryImage {
  const GalleryImage({required this.imageUrl, this.caption});

  /// Null without a picture.
  static GalleryImage? tryParse(Json json) {
    final url = optString(json, 'image_url');
    if (url == null || url.trim().isEmpty) return null;
    return GalleryImage(imageUrl: url, caption: optString(json, 'caption'));
  }

  final String imageUrl;
  final String? caption;
}

/// 99.4 Photos in a grid of two or three columns; a tap opens them full
/// screen, to swipe through with their captions.
class GalleryBlock extends PageBlock {
  const GalleryBlock({
    required super.id,
    super.title,
    required this.images,
    this.columns = 3,
  });

  /// 2 or 3.
  final int columns;
  final List<GalleryImage> images;

  @override
  bool get hasContent => images.isNotEmpty;
}

/// 99.4 A place: its name and address on a card with a pin, and a button
/// that opens directions in the phone's maps. No map tiles are loaded.
class MapBlock extends PageBlock {
  const MapBlock({
    required super.id,
    super.title,
    required this.latitude,
    required this.longitude,
    this.name,
    this.address,
    this.label,
  });

  /// Null without a latitude and a longitude on Earth.
  static MapBlock? tryParse(Json json, {required String id, String? title}) {
    final latitude = optDouble(json, 'latitude');
    final longitude = optDouble(json, 'longitude');
    if (latitude == null ||
        longitude == null ||
        !(latitude.abs() <= 90 && longitude.abs() <= 180)) {
      return null;
    }
    return MapBlock(
      id: id,
      title: title,
      latitude: latitude,
      longitude: longitude,
      name: optString(json, 'name'),
      address: optString(json, 'address'),
      label: optString(json, 'label'),
    );
  }

  final double latitude;
  final double longitude;
  final String? name;
  final String? address;

  /// The button's text; null: the app's own "Directions".
  final String? label;
}

/// 99.4 A solid, dashed or dotted line.
enum DividerStyle { line, dashed, dots }

/// 99.4 A line between blocks.
class DividerBlock extends PageBlock {
  const DividerBlock({
    required super.id,
    super.title,
    this.style = DividerStyle.line,
  });

  final DividerStyle style;
}

/// 99.4 Where a form's answers go: by email to the business
/// (`POST /forms/{slug}/{block_id}`), or as a chat message to it.
enum FormSendTo { email, chat }

enum FormFieldKind { text, longText, email, phone, number, choice }

/// 99.4 What needs a change in an answer before the form is sent.
enum FormProblem { missing, email, phone, number, choice }

final _fieldId = RegExp(r'^[A-Za-z0-9_-]{1,40}$');
final _email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
final _phone = RegExp(r'^[0-9 +()-]+$');

FormFieldKind? _fieldKind(Object? wire) {
  for (final kind in FormFieldKind.values) {
    if (snake(kind) == wire) return kind;
  }
  return null;
}

/// 99.4 One field of a form block.
class PageFormField {
  const PageFormField({
    required this.id,
    required this.kind,
    required this.label,
    this.required = false,
    this.options = const [],
  });

  /// Null without a usable id, a kind this app knows or a label; a choice
  /// also needs its options.
  static PageFormField? tryParse(Json json) {
    final id = optString(json, 'id');
    final kind = _fieldKind(json['kind']);
    final label = optString(json, 'label');
    if (id == null ||
        !_fieldId.hasMatch(id) ||
        kind == null ||
        label == null ||
        label.trim().isEmpty) {
      return null;
    }
    final options = <String>{
      for (final option in stringList(json, 'options'))
        if (option.trim().isNotEmpty) option,
    }.toList();
    if (kind == FormFieldKind.choice && options.isEmpty) return null;
    return PageFormField(
      id: id,
      kind: kind,
      label: label,
      required: boolOr(json, 'required', false),
      options: kind == FormFieldKind.choice ? options : const [],
    );
  }

  /// The longest answer the server takes.
  static const maxLength = 2000;

  /// The key of its answer.
  final String id;
  final FormFieldKind kind;
  final String label;
  final bool required;

  /// The choices of a [FormFieldKind.choice] field.
  final List<String> options;

  /// What needs a change in [answer], checked as the server checks it; null
  /// when it can be sent (an empty answer to a field that isn't required is
  /// left out).
  FormProblem? problem(String answer) {
    final value = answer.trim();
    if (value.isEmpty) return required ? FormProblem.missing : null;
    final ok = switch (kind) {
      FormFieldKind.email => _email.hasMatch(value),
      FormFieldKind.phone => isPhone(value),
      FormFieldKind.number => double.tryParse(value)?.isFinite ?? false,
      FormFieldKind.choice => options.contains(value),
      FormFieldKind.text || FormFieldKind.longText => true,
    };
    if (ok) return null;
    return switch (kind) {
      FormFieldKind.email => FormProblem.email,
      FormFieldKind.phone => FormProblem.phone,
      FormFieldKind.number => FormProblem.number,
      _ => FormProblem.choice,
    };
  }

  /// Digits, spaces, +, - and parentheses, with 6 to 20 digits.
  static bool isPhone(String value) {
    if (!_phone.hasMatch(value)) return false;
    final digits = value.replaceAll(RegExp('[^0-9]'), '').length;
    return digits >= 6 && digits <= 20;
  }
}

/// 99.4 A form's answers, checked: what to send and what needs a change.
class FormCheck {
  const FormCheck({required this.answers, required this.problems});

  /// Trimmed, by field id; empty answers are left out.
  final Map<String, String> answers;

  /// By field id.
  final Map<String, FormProblem> problems;

  bool get ok => problems.isEmpty;
}

/// 99.4 A short form. Its answers go by email to the business, or as a chat
/// message to it (the person signs in first; shown only in apps with chat).
class FormBlock extends PageBlock {
  const FormBlock({
    required super.id,
    super.title,
    required this.fields,
    required this.sendTo,
    this.submitLabel,
    this.successText,
  });

  /// Null without a field it can show, or sent somewhere this app doesn't
  /// know. Fields it can't read, and repeated ids, are left out.
  static FormBlock? tryParse(Json json, {required String id, String? title}) {
    final sendTo = enumOrNull(FormSendTo.values, json['send_to']);
    if (sendTo == null) return null;
    final ids = <String>{};
    final fields = [
      for (final field in _entries(json, 'fields', PageFormField.tryParse))
        if (ids.add(field.id)) field,
    ];
    if (fields.isEmpty) return null;
    return FormBlock(
      id: id,
      title: title,
      fields: fields,
      sendTo: sendTo,
      submitLabel: optString(json, 'submit_label'),
      successText: optString(json, 'success_text'),
    );
  }

  final List<PageFormField> fields;
  final FormSendTo sendTo;

  /// The button's text; null: the app's own "Send".
  final String? submitLabel;

  /// Shown once the answers are sent; null: the app's own "Sent".
  final String? successText;

  @override
  bool get hasContent => fields.isNotEmpty;

  /// [raw] answers by field id, checked as the server checks them. A form
  /// with nothing filled in asks for its first field.
  FormCheck check(Map<String, String> raw) {
    final answers = <String, String>{};
    final problems = <String, FormProblem>{};
    for (final field in fields) {
      final answer = (raw[field.id] ?? '').trim();
      final problem = field.problem(answer);
      if (problem != null) {
        problems[field.id] = problem;
      } else if (answer.isNotEmpty) {
        answers[field.id] = answer;
      }
    }
    if (answers.isEmpty && problems.isEmpty) {
      problems[fields.first.id] = FormProblem.missing;
    }
    return FormCheck(answers: answers, problems: problems);
  }

  /// The chat message for [answers]: the form's title, then one line per
  /// answered field, `Label: answer`.
  String chatText(Map<String, String> answers) {
    final heading = title?.trim() ?? '';
    final lines = [if (heading.isNotEmpty) heading];
    for (final field in fields) {
      final answer = answers[field.id];
      if (answer != null) lines.add('${field.label.trim()}: $answer');
    }
    return lines.join('\n');
  }

  /// The server's message for each field that needs a change, by field id
  /// (`details.fields` of an `invalid_answers` error).
  static Map<String, String> fieldErrors(Object? details) {
    final fields = details is Map ? details['fields'] : null;
    if (fields is! Map) return const {};
    return {
      for (final MapEntry(:key, :value) in fields.entries)
        if (key is String && value is String) key: value,
    };
  }
}

/// 103R `StudioPage`: a page designed in Yallapp Studio, a header and a
/// body of elements laid out in rows, columns, layers, grids and sliders.
class StudioPage {
  const StudioPage({
    required this.body,
    this.header,
    this.background,
    this.darkBackground,
    this.showTabs = true,
  });

  /// Null when it is missing or its body can't be read.
  static StudioPage? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final body = StudioNode.tryParse(json['body']);
    if (body == null) return null;
    return StudioPage(
      body: body,
      header: StudioHeader.tryParse(json['header']),
      background: optString(json, 'background'),
      darkBackground: optString(json, 'dark_background'),
      showTabs: boolOr(json, 'show_tabs', true),
    );
  }

  final StudioNode body;
  final StudioHeader? header;
  final String? background;
  final String? darkBackground;
  final bool showTabs;
}

enum StudioHeaderType { logoCenter, titleSearch, logoActions, transparent }

enum StudioHeaderButton { menu, search, cart, notifications, chat, account }

/// 103R `StudioHeader`: the bar at the top of a Studio page.
class StudioHeader {
  const StudioHeader({
    required this.type,
    this.title,
    this.logoUrl,
    this.buttons = const [],
    this.background,
    this.color,
    this.darkBackground,
    this.darkColor,
  });

  /// Null for none, or a type this app doesn't know.
  static StudioHeader? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final type = _snakeOrNull(StudioHeaderType.values, json['type']);
    if (type == null) return null;
    final raw = json['buttons'];
    return StudioHeader(
      type: type,
      title: optString(json, 'title'),
      logoUrl: optString(json, 'logo_url'),
      buttons: [
        for (final b in raw is List ? raw : const [])
          ?enumOrNull(StudioHeaderButton.values, b),
      ],
      background: optString(json, 'background'),
      color: optString(json, 'color'),
      darkBackground: optString(json, 'dark_background'),
      darkColor: optString(json, 'dark_color'),
    );
  }

  final StudioHeaderType type;
  final String? title;
  final String? logoUrl;
  final List<StudioHeaderButton> buttons;
  final String? background;
  final String? color;
  final String? darkBackground;
  final String? darkColor;
}

enum StudioNodeType {
  row,
  column,
  stack,
  grid,
  slider,
  spacer,
  // 107.3 Questions that open, and tabs.
  accordion,
  tabs,
  text,
  image,
  button,
  icon,
  items,
  categories,
  video,
  form,
  map,
  ratings,
  search,
  divider,
  // 107.3 A countdown, and a list with an icon on each line.
  countdown,
  bullets,
}

/// 103R `StudioSize`: fill the parent's space, hug the content, or [fixed]
/// logical pixels.
class StudioSize {
  const StudioSize.fill() : fixed = null, hug = false;
  const StudioSize.hug() : fixed = null, hug = true;
  const StudioSize.fixed(double this.fixed) : hug = false;

  static StudioSize? tryParse(Object? value) => switch (value) {
    'fill' => const StudioSize.fill(),
    'hug' => const StudioSize.hug(),
    final num n when n >= 0 => StudioSize.fixed(n.toDouble()),
    _ => null,
  };

  final double? fixed;
  final bool hug;
  bool get fill => fixed == null && !hug;
}

/// 103R `StudioSides`: logical sides, a side left out is 0.
class StudioSides {
  const StudioSides({
    this.top = 0,
    this.end = 0,
    this.bottom = 0,
    this.start = 0,
  });

  static StudioSides? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    double n(String key) => (optDouble(json, key) ?? 0).clamp(0, 400);
    return StudioSides(
      top: n('top'),
      end: n('end'),
      bottom: n('bottom'),
      start: n('start'),
    );
  }

  final double top;
  final double end;
  final double bottom;
  final double start;
}

class StudioGradient {
  const StudioGradient({
    required this.from,
    required this.to,
    this.angle = 180,
  });

  static StudioGradient? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final from = optString(json, 'from');
    final to = optString(json, 'to');
    if (from == null || to == null) return null;
    return StudioGradient(
      from: from,
      to: to,
      angle: optDouble(json, 'angle') ?? 180,
    );
  }

  final String from;
  final String to;

  /// Degrees, as in CSS: 180 from top to bottom.
  final double angle;
}

class StudioFont {
  const StudioFont({
    this.family,
    this.weight,
    this.size,
    this.lineHeight,
    this.letterSpacing,
    this.italic = false,
    this.underline = false,
    this.strike = false,
    this.uppercase = false,
  });

  static StudioFont? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    return StudioFont(
      family: optString(json, 'family'),
      weight: optInt(json, 'weight'),
      size: optDouble(json, 'size'),
      lineHeight: optDouble(json, 'line_height'),
      letterSpacing: optDouble(json, 'letter_spacing'),
      italic: boolOr(json, 'italic', false),
      underline: boolOr(json, 'underline', false),
      strike: boolOr(json, 'strike', false),
      uppercase: boolOr(json, 'uppercase', false),
    );
  }

  final String? family;
  final int? weight;
  final double? size;
  final double? lineHeight;
  final double? letterSpacing;
  final bool italic;
  final bool underline;

  /// 107.2 Struck through (an old price).
  final bool strike;

  /// 107.2 In capitals; scripts without capitals are unchanged.
  final bool uppercase;
}

/// 107.2 Each corner rounded on its own, instead of [StudioNode.radius];
/// logical corners.
class StudioCorners {
  const StudioCorners({
    this.topStart = 0,
    this.topEnd = 0,
    this.bottomEnd = 0,
    this.bottomStart = 0,
  });

  static StudioCorners? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    double corner(String key) =>
        (optDouble(json, key) ?? 0).clamp(0, 500).toDouble();
    return StudioCorners(
      topStart: corner('top_start'),
      topEnd: corner('top_end'),
      bottomEnd: corner('bottom_end'),
      bottomStart: corner('bottom_start'),
    );
  }

  final double topStart;
  final double topEnd;
  final double bottomEnd;
  final double bottomStart;
}

/// 107.2 A colour over the element's picture.
class StudioOverlay {
  const StudioOverlay({required this.color, required this.opacity});

  static StudioOverlay? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final color = optString(json, 'color');
    final opacity = optDouble(json, 'opacity');
    if (color == null || opacity == null) return null;
    return StudioOverlay(color: color, opacity: opacity.clamp(0, 1).toDouble());
  }

  final String color;
  final double opacity;
}

enum StudioEnter { none, fade, slideUp, slideDown, slideStart, slideEnd, zoom }

enum StudioPress { none, shrink, bounce }

enum StudioLoop { none, pulse, float, shake }

class StudioMotion {
  const StudioMotion({
    this.enter = StudioEnter.none,
    this.durationMs = 400,
    this.delayMs = 0,
    this.press = StudioPress.none,
    this.loop = StudioLoop.none,
  });

  static StudioMotion? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    return StudioMotion(
      enter: enumFromSnake(StudioEnter.values, json['enter'], StudioEnter.none),
      durationMs: intOr(json, 'duration_ms', 400).clamp(100, 3000),
      delayMs: intOr(json, 'delay_ms', 0).clamp(0, 5000),
      press: enumFrom(StudioPress.values, json['press'], StudioPress.none),
      loop: enumFrom(StudioLoop.values, json['loop'], StudioLoop.none),
    );
  }

  final StudioEnter enter;
  final int durationMs;
  final int delayMs;
  final StudioPress press;
  final StudioLoop loop;

  bool get moves =>
      enter != StudioEnter.none ||
      press != StudioPress.none ||
      loop != StudioLoop.none;
}

enum StudioAlign { start, center, end, between, around }

enum StudioCross { start, center, end, stretch }

enum StudioPin { none, top, bottom }

enum StudioShadow { none, light, medium, strong }

enum StudioTextAlign { start, center, end }

enum StudioBind { title, subtitle, image, price, badge }

enum StudioVisibility { everyone, signedIn, signedOut }

enum StudioPlatform { android, ios }

/// 103R `StudioNode`: one element of a Studio page.
class StudioNode {
  const StudioNode({
    required this.id,
    required this.type,
    this.children = const [],
    this.width,
    this.height,
    this.minHeight,
    this.aspectRatio,
    this.padding,
    this.margin,
    this.gap = 0,
    this.align = StudioAlign.start,
    this.cross = StudioCross.stretch,
    this.selfAlign,
    this.columns = 2,
    this.pin = StudioPin.none,
    this.background,
    this.color,
    this.darkBackground,
    this.darkColor,
    this.gradient,
    this.imageBackgroundUrl,
    this.radius = 0,
    this.corners,
    this.rotation = 0,
    this.overlay,
    this.borderColor,
    this.borderWidth = 0,
    this.shadow = StudioShadow.none,
    this.opacity = 1,
    this.font,
    this.textAlign = StudioTextAlign.start,
    this.text,
    this.title,
    this.endsAt,
    this.maxLines,
    this.imageUrl,
    this.contain = false,
    this.icon,
    this.iconAtStart = false,
    this.iconSize = 24,
    this.videoUrl,
    this.autoplay = false,
    this.intervalMs = 4000,
    this.perView = 1,
    this.dots = true,
    this.scroll = false,
    this.source,
    this.layout = ItemsLayout.grid,
    this.card,
    this.bind,
    this.items = const [],
    this.categories = const [],
    this.form,
    this.map,
    this.rating,
    this.action,
    this.platforms,
    this.visibility = StudioVisibility.everyone,
    this.motion,
    this.hidden = false,
  });

  /// Null for a type this app doesn't know (left out with what it holds),
  /// or one it can't read.
  static StudioNode? tryParse(Object? value, {int depth = 0}) {
    if (value is! Map || depth > 16) return null;
    try {
      final json = asJson(value);
      final id = reqString(json, 'id');
      final type = enumOrNull(StudioNodeType.values, json['type']);
      if (type == null) return null;
      double n(String key, double fallback, double min, double max) =>
          (optDouble(json, key) ?? fallback).clamp(min, max).toDouble();
      final rawChildren = json['children'];
      final rawPlatforms = json['platforms'];
      final mapJson = json['map'];
      return StudioNode(
        id: id,
        type: type,
        children: [
          for (final child in rawChildren is List ? rawChildren : const [])
            ?StudioNode.tryParse(child, depth: depth + 1),
        ],
        width: StudioSize.tryParse(json['width']),
        height: StudioSize.tryParse(json['height']),
        minHeight: optDouble(json, 'min_height'),
        aspectRatio: optDouble(json, 'aspect_ratio'),
        padding: StudioSides.tryParse(json['padding']),
        margin: StudioSides.tryParse(json['margin']),
        gap: n('gap', 0, 0, 200),
        align: enumFrom(StudioAlign.values, json['align'], StudioAlign.start),
        cross: enumFrom(StudioCross.values, json['cross'], StudioCross.stretch),
        selfAlign: enumOrNull(StudioCross.values, json['self_align']),
        columns: intOr(json, 'columns', 2).clamp(1, 6),
        pin: enumFrom(StudioPin.values, json['pin'], StudioPin.none),
        background: optString(json, 'background'),
        color: optString(json, 'color'),
        darkBackground: optString(json, 'dark_background'),
        darkColor: optString(json, 'dark_color'),
        gradient: StudioGradient.tryParse(json['gradient']),
        imageBackgroundUrl: optString(json, 'image_background_url'),
        radius: n('radius', 0, 0, 500),
        corners: StudioCorners.tryParse(json['corners']),
        rotation: n('rotation', 0, -180, 180),
        overlay: StudioOverlay.tryParse(json['overlay']),
        borderColor: optString(json, 'border_color'),
        borderWidth: n('border_width', 0, 0, 20),
        shadow: enumFrom(
          StudioShadow.values,
          json['shadow'],
          StudioShadow.none,
        ),
        opacity: n('opacity', 1, 0, 1),
        font: StudioFont.tryParse(json['font']),
        textAlign: enumFrom(
          StudioTextAlign.values,
          json['text_align'],
          StudioTextAlign.start,
        ),
        text: optString(json, 'text'),
        title: optString(json, 'title'),
        endsAt: DateTime.tryParse(optString(json, 'ends_at') ?? ''),
        maxLines: optInt(json, 'max_lines'),
        imageUrl: optString(json, 'image_url'),
        contain: json['fit'] == 'contain',
        icon: optString(json, 'icon'),
        iconAtStart: json['icon_position'] == 'start',
        iconSize: n('icon_size', 24, 8, 200),
        videoUrl: optString(json, 'video_url'),
        autoplay: boolOr(json, 'autoplay', false),
        intervalMs: intOr(json, 'interval_ms', 4000).clamp(1500, 20000),
        perView: n('per_view', 1, 1, 4),
        dots: boolOr(json, 'dots', true),
        scroll: boolOr(json, 'scroll', false),
        source: enumOrNull(ItemSource.values, json['source']),
        layout: enumFrom(ItemsLayout.values, json['layout'], ItemsLayout.grid),
        card: StudioNode.tryParse(json['card'], depth: depth + 1),
        bind: enumOrNull(StudioBind.values, json['bind']),
        items: _entries(json, 'items', _itemOrNull),
        categories: _entries(json, 'categories', _categoryOrNull),
        form: json['form'] is Map
            ? FormBlock.tryParse(asJson(json['form'], 'form'), id: id)
            : null,
        map: mapJson is Map ? StudioMapPlace.tryParse(asJson(mapJson)) : null,
        rating: optDouble(json, 'rating'),
        action: PageAction.tryParse(json['action']),
        platforms: rawPlatforms is List
            ? [
                for (final p in rawPlatforms)
                  ?enumOrNull(StudioPlatform.values, p),
              ]
            : null,
        visibility: enumFromSnake(
          StudioVisibility.values,
          json['visibility'],
          StudioVisibility.everyone,
        ),
        motion: StudioMotion.tryParse(json['motion']),
        hidden: boolOr(json, 'hidden', false),
      );
    } on FormatException {
      return null;
    }
  }

  final String id;
  final StudioNodeType type;
  final List<StudioNode> children;
  final StudioSize? width;
  final StudioSize? height;
  final double? minHeight;
  final double? aspectRatio;
  final StudioSides? padding;
  final StudioSides? margin;
  final double gap;
  final StudioAlign align;
  final StudioCross cross;
  final StudioCross? selfAlign;
  final int columns;
  final StudioPin pin;
  final String? background;
  final String? color;
  final String? darkBackground;
  final String? darkColor;
  final StudioGradient? gradient;
  final String? imageBackgroundUrl;
  final double radius;

  /// 107.2 Each corner on its own; null, [radius] for all four.
  final StudioCorners? corners;

  /// 107.2 Degrees, clockwise.
  final double rotation;

  /// 107.2 A colour over the picture (an image, or the background picture).
  final StudioOverlay? overlay;
  final String? borderColor;
  final double borderWidth;
  final StudioShadow shadow;
  final double opacity;
  final StudioFont? font;
  final StudioTextAlign textAlign;
  final String? text;

  /// 107.3 For a child of an accordion or tabs: its question or tab name.
  final String? title;

  /// 107.3 For a countdown: when the time is up.
  final DateTime? endsAt;
  final int? maxLines;
  final String? imageUrl;

  /// The whole picture shows, instead of filling its frame.
  final bool contain;

  /// A Google Material Symbols (Rounded) name.
  final String? icon;
  final bool iconAtStart;
  final double iconSize;
  final String? videoUrl;
  final bool autoplay;
  final int intervalMs;
  final double perView;
  final bool dots;

  /// 107.2 For a row: it scrolls sideways, its children keeping their widths.
  final bool scroll;
  final ItemSource? source;
  final ItemsLayout layout;

  /// For [StudioNodeType.items]: the card drawn for each entry; null, the
  /// app's own card.
  final StudioNode? card;
  final StudioBind? bind;
  final List<PageItem> items;
  final List<Category> categories;

  /// For [StudioNodeType.form], as a form block with this element's id.
  final FormBlock? form;
  final StudioMapPlace? map;
  final double? rating;
  final PageAction? action;

  /// Null: both.
  final List<StudioPlatform>? platforms;
  final StudioVisibility visibility;
  final StudioMotion? motion;

  /// 107.2 Kept in the editor only; the servers leave it out, and the app
  /// doesn't draw one that reaches it.
  final bool hidden;

  bool get holdsChildren => switch (type) {
    StudioNodeType.row ||
    StudioNodeType.column ||
    StudioNodeType.stack ||
    StudioNodeType.grid ||
    StudioNodeType.slider ||
    StudioNodeType.accordion ||
    StudioNodeType.tabs => true,
    _ => false,
  };
}

/// 103R `StudioMap`: a place on the map.
class StudioMapPlace {
  const StudioMapPlace({
    required this.lat,
    required this.lng,
    this.zoom = 15,
    this.label,
  });

  static StudioMapPlace? tryParse(Json json) {
    final lat = optDouble(json, 'lat');
    final lng = optDouble(json, 'lng');
    if (lat == null || lng == null || lat.abs() > 90 || lng.abs() > 180) {
      return null;
    }
    return StudioMapPlace(
      lat: lat,
      lng: lng,
      zoom: optDouble(json, 'zoom') ?? 15,
      label: optString(json, 'label'),
    );
  }

  final double lat;
  final double lng;
  final double zoom;
  final String? label;
}

PageItem? _itemOrNull(Json json) {
  try {
    return PageItem.fromJson(json);
  } on FormatException {
    return null;
  }
}

Category? _categoryOrNull(Json json) {
  try {
    return Category.fromJson(json);
  } on FormatException {
    return null;
  }
}

/// [enumFromSnake] without a fallback: null for a value this app doesn't know.
T? _snakeOrNull<T extends Enum>(List<T> values, Object? wire) {
  for (final value in values) {
    if (snake(value) == wire) return value;
  }
  return null;
}
