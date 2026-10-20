import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_exception.dart';
import '../providers.dart';
import '../theme/icons.dart';
import '../theme/theme.dart';
import 'l10n.dart';

/// 59 Loading, error and empty states, and the pieces every screen shares.

/// Text for an error, in the person's language.
String errorMessage(BuildContext context, Object error) {
  final l10n = context.l10n;
  return errorText(error, (code) {
    return switch (code) {
      ApiException.network => l10n.errorOffline,
      ApiException.timeout => l10n.errorTimeout,
      ApiException.notAvailable => l10n.errorNotAvailable,
      ApiException.notFound => l10n.errorNotFound,
      ApiException.rateLimited => l10n.errorRateLimited,
      // 60 The person's role on the team doesn't include it.
      ApiException.notAllowed => l10n.askOwnerText,
      ApiException.accountPending ||
      ApiException.accountSuspended => l10n.errorAccount,
      _ => l10n.errorGeneric,
    };
  });
}

bool isOffline(Object error) {
  final e = unwrapError(error);
  return e is ApiException && e.isOffline;
}

/// Shows [value]'s data, or a spinner, or the error with "Try again".
class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({
    super.key,
    required this.value,
    required this.builder,
    required this.onRetry,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) builder;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return value.when(
      skipLoadingOnRefresh: true,
      skipLoadingOnReload: true,
      // A failed refresh keeps what was there (pull to refresh says why).
      skipError: true,
      data: builder,
      loading: () => const LoadingState(),
      error: (error, _) => ErrorState(error: error, onRetry: onRetry),
    );
  }
}

class LoadingState extends StatelessWidget {
  const LoadingState({super.key});

  @override
  Widget build(BuildContext context) => Center(
    child: Semantics(
      label: context.l10n.loading,
      child: const Padding(
        padding: EdgeInsets.all(32),
        child: CircularProgressIndicator(),
      ),
    ),
  );
}

class ErrorState extends StatelessWidget {
  const ErrorState({super.key, required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final offline = isOffline(error);
    return MessageState(
      icon: offline ? AppIcons.offline : AppIcons.error,
      title: offline ? context.l10n.offlineTitle : context.l10n.errorTitle,
      text: errorMessage(context, error),
      action: OutlinedButton.icon(
        onPressed: onRetry,
        icon: const Icon(AppIcons.refresh),
        label: Text(context.l10n.tryAgain),
      ),
    );
  }
}

/// A centred icon, title and text; scrollable so pull to refresh works.
class MessageState extends StatelessWidget {
  const MessageState({
    super.key,
    required this.icon,
    required this.title,
    this.text,
    this.action,
  });

  final IconData icon;
  final String title;
  final String? text;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: context.yb.muted,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, size: 34, color: context.yb.ink),
                ),
                const SizedBox(height: 20),
                Text(
                  title,
                  style: theme.textTheme.titleMedium,
                  textAlign: TextAlign.center,
                ),
                if (text != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    text!,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: context.yb.ink2,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                if (action != null) ...[const SizedBox(height: 20), action!],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    this.text,
    this.icon = AppIcons.empty,
  });

  final String title;
  final String? text;
  final IconData icon;

  @override
  Widget build(BuildContext context) =>
      MessageState(icon: icon, title: title, text: text);
}

enum Tone { neutral, good, warn, bad, info, accent }

class StatusChip extends StatelessWidget {
  const StatusChip(this.label, {super.key, this.tone = Tone.neutral});

  final String label;
  final Tone tone;

  static Tone toneOf(String status) => switch (status) {
    'completed' ||
    'approved' ||
    'ready' ||
    'published' ||
    'paid' ||
    'admitted' ||
    'active' ||
    'open' => Tone.good,
    'processing' ||
    'pending' ||
    'preparing' ||
    'building' ||
    'queued' ||
    'uploading' ||
    'draft' ||
    'scheduled' ||
    'expired' => Tone.warn,
    'frozen' => Tone.info,
    'cancelled' ||
    'rejected' ||
    'failed' ||
    'refunded' ||
    'no_show' ||
    'suspended' ||
    'archived' ||
    'closed' => Tone.bad,
    'received' || 'out_for_delivery' => Tone.info,
    _ => Tone.neutral,
  };

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) {
      Tone.good => (context.yb.successBg, context.yb.success),
      Tone.warn => (context.yb.warningBg, context.yb.warning),
      Tone.bad => (context.yb.dangerBg, context.yb.danger),
      Tone.info => (context.yb.infoBg, context.yb.info),
      Tone.accent => (Brand.ember, Brand.midnight),
      Tone.neutral => (context.yb.muted, context.yb.ink),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall
            ?.copyWith(color: fg, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key, this.trailing});

  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsetsDirectional.fromSTEB(20, 24, 12, 8),
    child: Row(
      children: [
        Expanded(
          child: Semantics(
            header: true,
            child: Text(text, style: Theme.of(context).textTheme.titleMedium),
          ),
        ),
        ?trailing,
      ],
    ),
  );
}

/// A full-width "Load more" for paged lists.
class LoadMore extends StatelessWidget {
  const LoadMore({super.key, required this.onPressed, this.busy = false});

  final VoidCallback onPressed;
  final bool busy;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(16),
    child: OutlinedButton(
      onPressed: busy ? null : onPressed,
      child: busy
          ? const SizedBox.square(
              dimension: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Text(context.l10n.loadMore),
    ),
  );
}

void showMessage(BuildContext context, String text) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text)));
}

void showError(BuildContext context, Object error) =>
    showMessage(context, errorMessage(context, error));

Future<bool> confirm(
  BuildContext context, {
  required String title,
  String? text,
  required String action,
  bool destructive = false,
}) async {
  final l10n = context.l10n;
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: text == null ? null : Text(text),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: Text(l10n.cancel),
        ),
        FilledButton(
          style: destructive
              ? FilledButton.styleFrom(
                  backgroundColor: context.yb.danger,
                  foregroundColor: context.yb.onDanger,
                )
              : null,
          onPressed: () => Navigator.pop(context, true),
          child: Text(action),
        ),
      ],
    ),
  );
  return ok ?? false;
}

/// A white card with the brand's border.
class Panel extends StatelessWidget {
  const Panel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.color,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) => Card(
    color: color,
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Padding(padding: padding, child: child),
    ),
  );
}

/// Opens a link outside the app, or says it couldn't.
Future<void> openLink(BuildContext context, WidgetRef ref, String? url) async {
  if (url == null || url.isEmpty) return;
  final ok = await ref.read(openExternalProvider)(url);
  if (!ok && context.mounted) showMessage(context, context.l10n.linkFailed);
}

/// Pull to refresh that tells the owner when it failed, keeping what was
/// on screen.
Future<void> Function() pullToRefresh(
  BuildContext context,
  Future<Object?> Function() refresh,
) => () async {
  try {
    await refresh();
  } on Object catch (e) {
    if (context.mounted) showError(context, e);
  }
};
