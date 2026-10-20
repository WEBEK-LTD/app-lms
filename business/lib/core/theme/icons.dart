import 'package:flutter/widgets.dart';
import 'package:material_symbols_icons/symbols.dart';

/// 59 Every icon Yallapp Business uses: Google Material Symbols, Rounded.
abstract final class AppIcons {
  static const today = Symbols.space_dashboard_rounded;
  static const orders = Symbols.receipt_long_rounded;
  static const inbox = Symbols.forum_rounded;
  static const stats = Symbols.bar_chart_rounded;
  static const more = Symbols.menu_rounded;
  static const bell = Symbols.notifications_rounded;
  static const appointments = Symbols.event_available_rounded;
  static const events = Symbols.confirmation_number_rounded;
  static const scan = Symbols.qr_code_scanner_rounded;
  static const donations = Symbols.volunteer_activism_rounded;
  static const catalog = Symbols.inventory_2_rounded;
  static const products = Symbols.sell_rounded;
  static const menu = Symbols.restaurant_menu_rounded;
  static const courses = Symbols.school_rounded;
  static const articles = Symbols.article_rounded;
  static const listings = Symbols.home_work_rounded;
  static const media = Symbols.perm_media_rounded;
  static const upload = Symbols.upload_rounded;
  static const users = Symbols.group_rounded;
  static const notify = Symbols.campaign_rounded;
  static const preview = Symbols.smartphone_rounded;
  static const builds = Symbols.deployed_code_rounded;
  static const kitchen = Symbols.skillet_rounded;
  static const plan = Symbols.workspace_premium_rounded;
  static const language = Symbols.translate_rounded;
  static const notificationsSettings = Symbols.notifications_active_rounded;
  static const fingerprint = Symbols.fingerprint_rounded;
  static const devices = Symbols.devices_rounded;
  static const help = Symbols.help_rounded;
  static const whatsapp = Symbols.chat_rounded;
  static const email = Symbols.mail_rounded;
  static const phone = Symbols.call_rounded;
  static const web = Symbols.open_in_new_rounded;
  static const legal = Symbols.gavel_rounded;
  static const privacy = Symbols.shield_person_rounded;
  static const deleteAccount = Symbols.person_remove_rounded;
  static const signOut = Symbols.logout_rounded;
  static const info = Symbols.info_rounded;
  static const visible = Symbols.visibility_rounded;
  static const hidden = Symbols.visibility_off_rounded;
  static const lock = Symbols.lock_rounded;
  static const check = Symbols.check_rounded;
  static const checkCircle = Symbols.check_circle_rounded;
  static const close = Symbols.close_rounded;
  static const error = Symbols.error_rounded;
  static const warning = Symbols.warning_rounded;
  static const offline = Symbols.wifi_off_rounded;
  static const refresh = Symbols.refresh_rounded;
  static const empty = Symbols.inbox_rounded;
  static const forward = Symbols.chevron_right_rounded;
  static const back = Symbols.arrow_back_rounded;
  static const expand = Symbols.expand_more_rounded;
  static const swap = Symbols.swap_horiz_rounded;
  static const search = Symbols.search_rounded;
  static const send = Symbols.send_rounded;
  static const flashOn = Symbols.flashlight_on_rounded;
  static const flashOff = Symbols.flashlight_off_rounded;
  static const keyboard = Symbols.keyboard_rounded;
  static const photo = Symbols.photo_camera_rounded;
  static const video = Symbols.videocam_rounded;
  static const gallery = Symbols.photo_library_rounded;
  static const image = Symbols.image_rounded;
  static const movie = Symbols.movie_rounded;
  static const pdf = Symbols.picture_as_pdf_rounded;
  static const delete = Symbols.delete_rounded;
  static const pause = Symbols.pause_rounded;
  // 64 A frozen membership.
  static const freeze = Symbols.pause_circle_rounded;
  static const play = Symbols.play_arrow_rounded;
  static const copy = Symbols.content_copy_rounded;
  static const add = Symbols.add_rounded;
  static const edit = Symbols.edit_rounded;
  static const star = Symbols.star_rounded;
  static const refund = Symbols.currency_exchange_rounded;
  static const location = Symbols.location_on_rounded;
  static const person = Symbols.person_rounded;
  static const schedule = Symbols.schedule_rounded;
  static const download = Symbols.download_rounded;
  static const store = Symbols.storefront_rounded;
  static const trendUp = Symbols.trending_up_rounded;
  static const trendDown = Symbols.trending_down_rounded;
  static const sales = Symbols.payments_rounded;
  static const newUsers = Symbols.person_add_rounded;
  static const opens = Symbols.touch_app_rounded;
  static const checkIns = Symbols.how_to_reg_rounded;
  static const notice = Symbols.priority_high_rounded;
  static const sound = Symbols.volume_up_rounded;
  static const draft = Symbols.edit_note_rounded;
  static const archive = Symbols.archive_rounded;
  static const publish = Symbols.publish_rounded;
  // 61
  static const appearance = Symbols.contrast_rounded;
  static const reschedule = Symbols.edit_calendar_rounded;
  static const scheduled = Symbols.schedule_send_rounded;
  // 60 Team members.
  static const team = Symbols.groups_rounded;
  static const invite = Symbols.person_add_rounded;
  static const business = Symbols.storefront_rounded;
  // 63 Course questions, members at the door.
  static const question = Symbols.contact_support_rounded;
  static const members = Symbols.card_membership_rounded;
  static const markAllRead = Symbols.done_all_rounded;
}

/// Icons that point a way (back, forward, send) turn round in Arabic.
class DirectionalIcon extends StatelessWidget {
  const DirectionalIcon(
    this.icon, {
    super.key,
    this.size,
    this.color,
    this.semanticLabel,
  });

  final IconData icon;
  final double? size;
  final Color? color;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final child = Icon(
      icon,
      size: size,
      color: color,
      semanticLabel: semanticLabel,
    );
    return rtl ? Transform.flip(flipX: true, child: child) : child;
  }
}
