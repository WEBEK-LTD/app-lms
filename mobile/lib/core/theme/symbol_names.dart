import 'package:flutter/widgets.dart';
import 'package:material_symbols_icons/symbols.dart';

import 'app_icons.dart';

/// Icons the dashboard can pick for tabs and buttons, by their Google
/// Material Symbols name (always drawn Rounded). Names outside this list
/// get [fallbackSymbol]: the icon font is tree-shaken, so only icons named
/// here ship with the app.
const symbolsByName = <String, IconData>{
  // Used in the app already.
  'home': AppIcons.home,
  'menu_book': AppIcons.courses,
  'play_circle': AppIcons.myCourses,
  'person': AppIcons.account,
  'notifications': AppIcons.notifications,
  'search': AppIcons.search,
  'tune': AppIcons.filters,
  'star': AppIcons.star,
  'check': AppIcons.check,
  'check_circle': AppIcons.checkCircle,
  'chevron_left': AppIcons.back,
  'chevron_right': AppIcons.forward,
  'favorite': AppIcons.favorite,
  'lock': AppIcons.lock,
  'schedule': AppIcons.schedule,
  'play_arrow': AppIcons.play,
  'language': AppIcons.web,
  'code': AppIcons.code,
  'workspace_premium': AppIcons.certificate,
  'fact_check': AppIcons.quizResults,
  'quiz': AppIcons.quiz,
  'receipt_long': AppIcons.orders,
  'help': AppIcons.help,
  'logout': AppIcons.logout,
  'dark_mode': AppIcons.appearance,
  'devices': AppIcons.devices,
  'live_tv': AppIcons.live,
  'article': AppIcons.article,
  'chat': AppIcons.chat,
  'inbox': AppIcons.empty,
  'shopping_cart': AppIcons.cart,
  'storefront': AppIcons.shop,
  'calendar_month': AppIcons.calendar,
  'redeem': AppIcons.gift,
  'sell': AppIcons.sale,
  'event_available': AppIcons.book,
  'event_note': AppIcons.appointments,
  'groups': AppIcons.staff,
  'fitness_center': AppIcons.fitness,
  'card_membership': AppIcons.membership,
  'location_on': AppIcons.location,
  'open_in_new': AppIcons.openInNew,
  'volunteer_activism': AppIcons.campaigns,
  'campaign': AppIcons.campaignUpdate,
  'settings': Symbols.settings_rounded,
  // Common choices for tabs and buttons.
  'account_circle': Symbols.account_circle_rounded,
  'apartment': Symbols.apartment_rounded,
  'apps': Symbols.apps_rounded,
  'arrow_forward': Symbols.arrow_forward_rounded,
  'bed': Symbols.bed_rounded,
  'bathtub': Symbols.bathtub_rounded,
  'bolt': Symbols.bolt_rounded,
  'bookmark': Symbols.bookmark_rounded,
  'business': Symbols.business_rounded,
  'call': Symbols.call_rounded,
  'card_giftcard': Symbols.card_giftcard_rounded,
  'category': Symbols.category_rounded,
  'chat_bubble': Symbols.chat_bubble_rounded,
  // 28 Events & tickets apps' My tickets tab.
  'confirmation_number': AppIcons.ticket,
  'cottage': Symbols.cottage_rounded,
  'dashboard': Symbols.dashboard_rounded,
  'description': Symbols.description_rounded,
  'domain': Symbols.domain_rounded,
  'emoji_events': Symbols.emoji_events_rounded,
  'event': Symbols.event_rounded,
  'explore': Symbols.explore_rounded,
  'forum': Symbols.forum_rounded,
  'grid_view': Symbols.grid_view_rounded,
  'handshake': Symbols.handshake_rounded,
  'house': Symbols.house_rounded,
  'info': Symbols.info_rounded,
  'inventory_2': Symbols.inventory_2_rounded,
  'key': Symbols.key_rounded,
  'lightbulb': Symbols.lightbulb_rounded,
  'link': Symbols.link_rounded,
  'list': Symbols.list_rounded,
  'local_offer': Symbols.local_offer_rounded,
  'local_shipping': Symbols.local_shipping_rounded,
  'location_city': Symbols.location_city_rounded,
  'mail': Symbols.mail_rounded,
  'map': Symbols.map_rounded,
  'newspaper': Symbols.newspaper_rounded,
  'percent': Symbols.percent_rounded,
  'phone': Symbols.phone_rounded,
  'photo_library': Symbols.photo_library_rounded,
  'public': Symbols.public_rounded,
  'real_estate_agent': Symbols.real_estate_agent_rounded,
  'school': Symbols.school_rounded,
  'send': Symbols.send_rounded,
  'shopping_bag': Symbols.shopping_bag_rounded,
  'square_foot': Symbols.square_foot_rounded,
  'support_agent': Symbols.support_agent_rounded,
  'travel_explore': Symbols.travel_explore_rounded,
  'trending_up': Symbols.trending_up_rounded,
  'videocam': Symbols.videocam_rounded,
  'villa': Symbols.villa_rounded,
  // 33 What quick links offer (platform/web/src/lib/pages/icons.ts).
  'checkroom': Symbols.checkroom_rounded,
  'child_care': Symbols.child_care_rounded,
  'content_cut': Symbols.content_cut_rounded,
  'directions': Symbols.directions_rounded,
  'grocery': Symbols.grocery_rounded,
  'home_work': Symbols.home_work_rounded,
  'payments': Symbols.payments_rounded,
  'photo_camera': Symbols.photo_camera_rounded,
  'restaurant_menu': Symbols.restaurant_menu_rounded,
  'spa': Symbols.spa_rounded,
  'stethoscope': Symbols.stethoscope_rounded,
  // 104 Delivery and courier companies.
  'package_2': Symbols.package_2_rounded,
  'two_wheeler': Symbols.two_wheeler_rounded,
  // 105.2 Ride hailing.
  'local_taxi': Symbols.local_taxi_rounded,
};

/// Shown for a name the app doesn't have.
const fallbackSymbol = Symbols.apps_rounded;

/// The icon for a Material Symbols name such as `home` or `home_rounded`.
IconData symbolByName(String? name) {
  if (name == null) return fallbackSymbol;
  var key = name.trim().toLowerCase().replaceAll(RegExp(r'[\s-]+'), '_');
  for (final suffix in ['_rounded', '_outlined', '_sharp']) {
    if (key.endsWith(suffix)) {
      key = key.substring(0, key.length - suffix.length);
    }
  }
  return symbolsByName[key] ?? fallbackSymbol;
}
