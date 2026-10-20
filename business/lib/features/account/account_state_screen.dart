import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../auth/sign_in_screen.dart';

/// 59 What a pending or suspended account sees, an account with no app yet,
/// or Yallapp out of reach.
class AccountStateScreen extends ConsumerWidget {
  const AccountStateScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final session = ref.watch(sessionProvider);
    final notifier = ref.read(sessionProvider.notifier);
    final me = session is SignedIn ? session.me : null;
    final website = ref.watch(configProvider).websiteUrl;

    final (IconData icon, String title, String text) = switch (session) {
      Unreachable(:final error) => (
        isOffline(error) ? AppIcons.offline : AppIcons.error,
        isOffline(error) ? l10n.offlineTitle : l10n.errorTitle,
        errorMessage(context, error),
      ),
      SignedIn(:final me) when me.state == AccountState.pending => (
        AppIcons.schedule,
        l10n.accountPendingTitle,
        me.stateMessage ?? l10n.accountPendingText,
      ),
      SignedIn(:final me) when me.state == AccountState.suspended => (
        AppIcons.lock,
        l10n.accountSuspendedTitle,
        me.stateMessage ?? l10n.accountSuspendedText,
      ),
      _ => (AppIcons.store, l10n.noAppTitle, l10n.noAppText),
    };

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const Padding(padding: EdgeInsets.all(24), child: Wordmark()),
            Expanded(
              child: RefreshIndicator(
                onRefresh: notifier.load,
                child: MessageState(
                  icon: icon,
                  title: title,
                  text: text,
                  action: Column(
                    children: [
                      OutlinedButton.icon(
                        onPressed: notifier.load,
                        icon: const Icon(AppIcons.refresh),
                        label: Text(l10n.tryAgain),
                      ),
                      const SizedBox(height: 8),
                      TextButton.icon(
                        onPressed: () => openLink(
                          context,
                          ref,
                          me?.links.dashboard ?? website,
                        ),
                        icon: const DirectionalIcon(AppIcons.web),
                        label: Text(l10n.openDashboard),
                      ),
                      if (me?.links.supportWhatsapp != null)
                        TextButton.icon(
                          onPressed: () =>
                              openLink(context, ref, me!.links.supportWhatsapp),
                          icon: const Icon(AppIcons.whatsapp),
                          label: Text(l10n.helpWhatsapp),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextButton.icon(
                onPressed: notifier.signOut,
                icon: const DirectionalIcon(AppIcons.signOut),
                label: Text(l10n.signOut),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
