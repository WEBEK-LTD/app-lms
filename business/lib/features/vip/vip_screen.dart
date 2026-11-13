import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../studio/studio_widgets.dart';

final callSlotsProvider = FutureProvider.autoDispose<List<CallDay>>(
  (ref) => ref.watch(apiProvider).accountManagerSlots(),
);

/// 125 VIP service (the Vip board): the business's account manager at
/// Yallapp, WhatsApp and a call, the priority line, and a call booked.
class VipScreen extends ConsumerWidget {
  const VipScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final me = ref.watch(meProvider);
    final app = ref.watch(currentAppProvider);
    final manager = me?.accountManager;
    if (me == null) return const SizedBox.shrink();
    return Scaffold(
      appBar: AppBar(title: Text(l10n.vipTitle)),
      body: manager == null
          ? EmptyState(icon: AppIcons.manager, title: l10n.vipTitle)
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 20,
                  ),
                  decoration: BoxDecoration(
                    color: Brand.midnight,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Column(
                    children: [
                      _Photo(url: manager.photoUrl),
                      const SizedBox(height: 10),
                      Text(
                        manager.name,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: Brand.ivory,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        l10n.vipManagerAt,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFFB8B3C8),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        height: 26,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: Brand.goldLight,
                          borderRadius: BorderRadius.circular(13),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              AppIcons.vip,
                              fill: 1,
                              size: 15,
                              color: Brand.midnight,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              app?.features.vip == true && app?.plan != null
                                  ? app!.plan!.name
                                  : l10n.vipPlan,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Brand.midnight,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    if (manager.whatsappUrl != null)
                      Expanded(
                        child: BigButton(
                          label: l10n.whatsappAction,
                          icon: AppIcons.chat,
                          onPressed: () =>
                              openLink(context, ref, manager.whatsappUrl),
                        ),
                      ),
                    if (manager.whatsappUrl != null && manager.phone != null)
                      const SizedBox(width: 10),
                    if (manager.phone != null)
                      Expanded(
                        child: BigButton(
                          label: l10n.call,
                          icon: AppIcons.phone,
                          filled: false,
                          onPressed: () =>
                              callNumber(context, ref, manager.phone),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: c.goldBg,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Row(
                    children: [
                      Icon(AppIcons.priority, color: c.gold),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text.rich(
                          TextSpan(
                            style: TextStyle(
                              fontSize: 14,
                              height: 1.4,
                              color: c.ink,
                            ),
                            children: [
                              TextSpan(
                                text: l10n.priorityLine,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              TextSpan(text: ' · ${l10n.priorityFirst}'),
                              if (manager.hoursLabel != null)
                                TextSpan(
                                  text: '\n${manager.hoursLabel}',
                                  style: TextStyle(color: c.ink2),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                const _BookCall(),
                const SizedBox(height: 12),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Text(
                    l10n.vipFooter,
                    style: TextStyle(fontSize: 13, color: c.ink2),
                  ),
                ),
              ],
            ),
    );
  }
}

class _Photo extends StatelessWidget {
  const _Photo({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    const fallback = Center(
      child: Icon(AppIcons.person, size: 40, color: Brand.goldLight),
    );
    return ExcludeSemantics(
      child: Container(
        width: 84,
        height: 84,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: const Color(0xFF26254A),
          border: Border.all(color: Brand.goldLight, width: 3),
        ),
        clipBehavior: Clip.antiAlias,
        child: url == null
            ? fallback
            : Image.network(
                url!,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => fallback,
              ),
      ),
    );
  }
}

class _BookCall extends ConsumerStatefulWidget {
  const _BookCall();

  @override
  ConsumerState<_BookCall> createState() => _BookCallState();
}

class _BookCallState extends ConsumerState<_BookCall> {
  String? _date;
  String? _time;
  bool _busy = false;

  String _weekday(String date, {bool short = false}) {
    final d = DateTime.tryParse(date);
    if (d == null) return date;
    return DateFormat(short ? 'EEE' : 'EEEE', context.lang).format(d);
  }

  Future<void> _book(String date, String time) async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiProvider)
          .bookAccountManagerCall(date: date, time: time);
      if (!mounted) return;
      showMessage(context, l10n.callRequested(_weekday(date), time));
      setState(() => _time = null);
      ref.invalidate(callSlotsProvider);
    } on Object catch (e) {
      if (mounted) showError(context, e);
      ref.invalidate(callSlotsProvider);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final slots = ref.watch(callSlotsProvider);
    return Box(
      radius: 18,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.bookCall,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          ...slots.when(
            skipLoadingOnRefresh: true,
            data: (days) {
              final open = [
                for (final d in days)
                  if (d.times.isNotEmpty) d,
              ];
              if (open.isEmpty) return [Text(l10n.noSlots)];
              final day =
                  open.where((d) => d.date == _date).firstOrNull ?? open.first;
              final time = day.times.contains(_time) ? _time : day.times.first;
              return [
                Row(
                  children: [
                    for (var i = 0; i < open.length; i++) ...[
                      if (i > 0) const SizedBox(width: 8),
                      Expanded(
                        child: _DayChip(
                          weekday: _weekday(open[i].date, short: true),
                          date: DateTime.tryParse(open[i].date) == null
                              ? open[i].label
                              : DateFormat(
                                  'd MMM',
                                  context.lang,
                                ).format(DateTime.parse(open[i].date)),
                          label: open[i].label,
                          chosen: open[i].date == day.date,
                          onTap: () => setState(() {
                            _date = open[i].date;
                            _time = null;
                          }),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final t in day.times)
                      Semantics(
                        selected: t == time,
                        button: true,
                        child: Material(
                          color: t == time ? c.ink : Colors.transparent,
                          shape: StadiumBorder(
                            side: t == time
                                ? BorderSide.none
                                : BorderSide(color: c.line),
                          ),
                          child: InkWell(
                            customBorder: const StadiumBorder(),
                            onTap: () => setState(() {
                              _date = day.date;
                              _time = t;
                            }),
                            child: Container(
                              constraints: const BoxConstraints(minHeight: 40),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                              ),
                              child: Center(
                                widthFactor: 1,
                                child: Text(
                                  t,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: t == time ? c.onInk : c.ink,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                FilledButton(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(64, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    textStyle: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  onPressed: _busy || time == null
                      ? null
                      : () => _book(day.date, time),
                  child: Text(l10n.bookOn(_weekday(day.date), time ?? '')),
                ),
              ];
            },
            loading: () => [const LoadingState()],
            error: (e, _) => [
              SizedBox(
                height: 200,
                child: ErrorState(
                  error: e,
                  onRetry: () => ref.invalidate(callSlotsProvider),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DayChip extends StatelessWidget {
  const _DayChip({
    required this.weekday,
    required this.date,
    required this.label,
    required this.chosen,
    required this.onTap,
  });

  final String weekday;
  final String date;
  final String label;
  final bool chosen;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return Semantics(
      selected: chosen,
      button: true,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: chosen ? c.ink : Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: chosen ? BorderSide.none : BorderSide(color: c.line),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Container(
            constraints: const BoxConstraints(minHeight: 56),
            alignment: Alignment.center,
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    weekday,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: chosen ? c.onInk : c.ink,
                    ),
                  ),
                  Text(
                    date,
                    style: TextStyle(
                      fontSize: 12,
                      color: chosen ? c.onInk : c.ink2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
