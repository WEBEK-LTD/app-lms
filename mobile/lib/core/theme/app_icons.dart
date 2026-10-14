import 'package:flutter/widgets.dart';
import 'package:material_symbols_icons/symbols.dart';

/// Every icon the app uses: Google Material Symbols, Rounded style only.
abstract final class AppIcons {
  static const home = Symbols.home_rounded;
  static const courses = Symbols.menu_book_rounded;
  static const myCourses = Symbols.play_circle_rounded;
  static const account = Symbols.person_rounded;
  static const notifications = Symbols.notifications_rounded;
  static const search = Symbols.search_rounded;
  static const filters = Symbols.tune_rounded;
  static const star = Symbols.star_rounded;
  static const check = Symbols.check_rounded;
  static const checkCircle = Symbols.check_circle_rounded;
  static const back = Symbols.chevron_left_rounded;
  static const forward = Symbols.chevron_right_rounded;
  static const favorite = Symbols.favorite_rounded;
  static const lock = Symbols.lock_rounded;
  static const schedule = Symbols.schedule_rounded;
  static const play = Symbols.play_arrow_rounded;
  static const pause = Symbols.pause_rounded;
  static const replay = Symbols.replay_rounded;
  static const playCircle = Symbols.play_circle_rounded;
  static const fullscreen = Symbols.fullscreen_rounded;
  static const fullscreenExit = Symbols.fullscreen_exit_rounded;
  static const close = Symbols.close_rounded;
  static const rotate = Symbols.screen_rotation_rounded;
  static const web = Symbols.language_rounded;
  static const code = Symbols.code_rounded;
  static const copy = Symbols.content_copy_rounded;
  static const certificate = Symbols.workspace_premium_rounded;
  static const quizResults = Symbols.fact_check_rounded;
  static const quiz = Symbols.quiz_rounded;
  static const orders = Symbols.receipt_long_rounded;
  static const settings = Symbols.tune_rounded;
  static const help = Symbols.help_rounded;
  static const logout = Symbols.logout_rounded;
  static const appearance = Symbols.dark_mode_rounded;
  static const quality = Symbols.hd_rounded;
  static const autoplay = Symbols.autoplay_rounded;
  static const devices = Symbols.devices_rounded;
  static const phoneAndroid = Symbols.smartphone_rounded;
  static const phoneIphone = Symbols.phone_iphone_rounded;
  static const delete = Symbols.delete_rounded;
  static const expand = Symbols.expand_more_rounded;
  static const edit = Symbols.edit_rounded;
  static const refresh = Symbols.refresh_rounded;
  static const offline = Symbols.wifi_off_rounded;
  static const maintenance = Symbols.construction_rounded;
  static const update = Symbols.system_update_rounded;
  static const unavailable = Symbols.block_rounded;
  // 13.5 A paused app, the owner's contact, an app taking no new members.
  static const paused = Symbols.pause_circle_rounded;
  static const mail = Symbols.mail_rounded;
  static const group = Symbols.group_rounded;
  static const error = Symbols.error_rounded;
  static const openInNew = Symbols.open_in_new_rounded;
  static const attachment = Symbols.attach_file_rounded;
  static const download = Symbols.download_rounded;
  static const assignment = Symbols.assignment_rounded;
  static const live = Symbols.live_tv_rounded;
  static const article = Symbols.article_rounded;
  static const chat = Symbols.chat_rounded;
  static const empty = Symbols.inbox_rounded;
  static const speed = Symbols.speed_rounded;
  static const visibilityOff = Symbols.visibility_off_rounded;
  static const radioUnchecked = Symbols.radio_button_unchecked_rounded;
  static const radioChecked = Symbols.radio_button_checked_rounded;
  static const checkboxUnchecked = Symbols.check_box_outline_blank_rounded;
  static const checkboxChecked = Symbols.check_box_rounded;
  static const flag = Symbols.flag_rounded;
  static const timer = Symbols.timer_rounded;
  static const cart = Symbols.shopping_cart_rounded;
  static const shop = Symbols.storefront_rounded;
  static const add = Symbols.add_rounded;
  static const remove = Symbols.remove_rounded;
  static const calendar = Symbols.calendar_month_rounded;
  static const gift = Symbols.redeem_rounded;
  static const sort = Symbols.sort_rounded;
  static const sale = Symbols.sell_rounded;
  static const book = Symbols.event_available_rounded;
  static const appointments = Symbols.event_note_rounded;
  static const staff = Symbols.groups_rounded;
  static const location = Symbols.location_on_rounded;
  static const notes = Symbols.notes_rounded;
  static const image = Symbols.image_rounded;
  static const arrowForward = Symbols.arrow_forward_rounded;
  static const send = Symbols.send_rounded;
  static const level = Symbols.signal_cellular_alt_rounded;
}

/// A Material Symbols icon with an optional filled style.
class AppIcon extends StatelessWidget {
  const AppIcon(
    this.icon, {
    super.key,
    this.size = 22,
    this.color,
    this.filled = false,
    this.semanticLabel,
  });

  final IconData icon;
  final double size;
  final Color? color;
  final bool filled;
  final String? semanticLabel;

  /// Icons that point along the reading direction: mirrored right to left.
  static const _directional = [
    AppIcons.back,
    AppIcons.forward,
    Symbols.arrow_forward_rounded,
    Symbols.arrow_back_rounded,
    Symbols.send_rounded,
  ];

  @override
  Widget build(BuildContext context) {
    final glyph = Icon(
      icon,
      size: size,
      color: color,
      fill: filled ? 1 : 0,
      semanticLabel: semanticLabel,
    );
    final rtl = Directionality.maybeOf(context) == TextDirection.rtl;
    if (!rtl || !_directional.contains(icon)) return glyph;
    return Transform.flip(flipX: true, child: glyph);
  }
}
