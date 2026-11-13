import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../studio/studio_widgets.dart';

/// 125 Prime for an app on a regular plan (the PrimeLocked board): what
/// Prime is, that it comes with every Studio app, and a link to the website.
/// Nothing is sold in the app.
class PrimeLockedScreen extends ConsumerWidget {
  const PrimeLockedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final app = ref.watch(currentAppProvider);
    final website = ref.watch(configProvider).websiteUrl;
    final rows = [
      (AppIcons.insights, l10n.insightsTitle, l10n.insightsHelp),
      (AppIcons.smartAlerts, l10n.smartAlerts, l10n.alertsHelp),
      (AppIcons.brief, l10n.morningBrief, l10n.briefHelp),
      (AppIcons.look, l10n.primeLooks, l10n.primeLooksHelp),
    ];
    return Scaffold(
      appBar: AppBar(title: Text(l10n.primeTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 22),
            decoration: BoxDecoration(
              color: Brand.midnight,
              borderRadius: BorderRadius.circular(22),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  AppIcons.prime,
                  fill: 1,
                  size: 36,
                  color: Brand.goldLight,
                ),
                const SizedBox(height: 10),
                Text(
                  l10n.primeComes,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                    color: Brand.ivory,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  l10n.primeRegular(app?.name ?? ''),
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.4,
                    color: Color(0xFFB8B3C8),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Box(
            radius: 18,
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (var i = 0; i < rows.length; i++)
                  MergeSemantics(
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        border: i == rows.length - 1
                            ? null
                            : Border(bottom: BorderSide(color: c.line)),
                      ),
                      child: Row(
                        children: [
                          Icon(rows[i].$1, color: c.gold),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  rows[i].$2,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Text(
                                  rows[i].$3,
                                  style: TextStyle(fontSize: 13, color: c.ink2),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          BigButton(
            label: l10n.learnMoreWebsite,
            filled: false,
            icon: AppIcons.web,
            onPressed: () => openLink(context, ref, '$website/yallapp-studio'),
          ),
          const SizedBox(height: 12),
          Text(
            l10n.nothingSold,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: c.ink2),
          ),
        ],
      ),
    );
  }
}
