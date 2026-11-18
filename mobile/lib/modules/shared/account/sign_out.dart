import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../courier_hub/data/courier_hub.dart';
import '../../courier_hub/screens/companies_screen.dart' show deleteHubAccount;

/// 167 Signing out, wherever the Account is drawn (its own screen in every
/// look, a Studio page's Sign out element, the end the app adds to a Studio
/// page that stands for the Account): asked first, then the app is back to
/// signed out. In Yallapp Courier it ends every company's session (104.8.4).
Future<void> confirmSignOut(BuildContext context, WidgetRef ref) async {
  final hub = ref.read(courierHubLinkProvider);
  final ok = await confirmAction(
    context,
    title: context.l10n.logOutTitle,
    message: hub != null
        ? context.l10n.hubSignOutMessage
        : context.l10n.logOutMessage,
    confirmLabel: context.l10n.logOut,
    destructive: true,
  );
  if (!ok) return;
  if (hub != null) return hub.signOut();
  await ref.read(authControllerProvider.notifier).signOut();
}

/// 167 Deleting the account (the App Store and Google Play ask for it to be
/// reachable from the app): asked first; Yallapp Courier's own account in
/// Yallapp Courier.
Future<void> confirmDeleteAccount(BuildContext context, WidgetRef ref) async {
  final hub = ref.read(courierHubLinkProvider);
  if (hub != null) return deleteHubAccount(context, hub.deleteAccount);
  final ok = await confirmAction(
    context,
    title: context.l10n.deleteAccountTitle,
    message: context.l10n.deleteAccountMessage,
    confirmLabel: context.l10n.deleteAccount,
    destructive: true,
  );
  if (!ok || !context.mounted) return;
  try {
    await ref.read(authControllerProvider.notifier).deleteAccount();
    if (context.mounted) showMessage(context, context.l10n.accountDeleted);
  } on ApiException catch (e) {
    if (context.mounted) showMessage(context, e.message);
  }
}

/// 167 Where the Account's list ends: [base] past the end of what is under
/// the tab bar when it floats over the page (the petal, the pill, the dock,
/// frosted glass; `Scaffold.extendBody` puts its height in the bottom
/// padding) and past the phone's own bottom edge, so the last entry, Sign
/// out, can always be scrolled into view and tapped.
double accountListEnd(BuildContext context, double base) =>
    base + MediaQuery.paddingOf(context).bottom;

/// 167 The end the app adds to a Studio page that stands for the Account
/// and has no Sign out of its own: Sign out, then Delete account, on a card
/// in the page's colours ([background], its text in [ink]), for a signed-in
/// person only.
class AccountPageEnd extends ConsumerWidget {
  const AccountPageEnd({super.key, required this.background});

  /// The page's background, which the card and its words are drawn on.
  final Color background;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(authControllerProvider).user == null) {
      return const SizedBox.shrink();
    }
    final p = context.palette;
    final dark = background.computeLuminance() < 0.4;
    final card = Color.alphaBlend(
      (dark ? Colors.white : Colors.black).withValues(alpha: 0.06),
      background,
    );
    final danger = dark ? Color.lerp(p.danger, Colors.white, 0.35)! : p.danger;
    Widget line(Key key, IconData icon, String title, VoidCallback onTap) =>
        InkWell(
          key: key,
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
            child: Row(
              children: [
                AppIcon(icon, size: 22, color: danger),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w600,
                      color: danger,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
    return Padding(
      key: const ValueKey('account-page-end'),
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
      child: Material(
        color: card,
        borderRadius: BorderRadius.circular(context.shapes.r(18)),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            line(
              const ValueKey('account-sign-out'),
              AppIcons.logout,
              context.l10n.logOut,
              () => confirmSignOut(context, ref),
            ),
            Divider(height: 1, color: danger.withValues(alpha: 0.15)),
            line(
              const ValueKey('account-delete'),
              AppIcons.delete,
              context.l10n.deleteAccount,
              () => confirmDeleteAccount(context, ref),
            ),
          ],
        ),
      ),
    );
  }
}
