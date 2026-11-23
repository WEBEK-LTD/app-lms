import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/format/money.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/app_router.dart' show openLocation;
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/cart_controller.dart';
import '../widgets/tech_widgets.dart';

/// 211 Build your PC (`StoreConfig.pc_builder`, a `flow: pc_builder`
/// action, the `pc_builder` element's button): one step per part in the
/// shop's order, the products of that part's category to choose from, each
/// checked against the parts already chosen by their specs ([checkBuild]:
/// the socket, the memory type, the power, the size); a part that doesn't
/// fit stays in the list, dimmed, with the reason. Then the whole build,
/// its total and the power it needs, into the cart in one tap.

/// A part's products (its category's, with their specs): those that can go
/// in the cart on their own.
final pcPartsProvider = FutureProvider.autoDispose
    .family<List<ProductSummary>, int>((ref, category) async {
      final page = await ref
          .watch(yallappApiProvider)
          .listProducts(
            ProductQuery(category: category, perPage: 50, withSpecs: true),
          );
      return [
        for (final p in page.items)
          if (p.purchasable &&
              p.type != ProductType.variable &&
              !p.addon &&
              p.stockStatus != StockStatus.outOfStock)
            p,
      ];
    });

/// The words for a problem a part has with another.
String buildProblemText(BuildContext context, BuildProblem problem, int watts) {
  final other = pcPartName(context, problem.withPart);
  return switch (problem.reason) {
    BuildReason.socket ||
    BuildReason.cooler => context.l10n.pcIssueSocket(other),
    BuildReason.memory => context.l10n.pcIssueMemory(other),
    BuildReason.power => context.l10n.pcIssuePower(watts),
    BuildReason.size => context.l10n.pcIssueSize(other),
  };
}

class PcBuilderScreen extends ConsumerStatefulWidget {
  const PcBuilderScreen({super.key});

  @override
  ConsumerState<PcBuilderScreen> createState() => _PcBuilderScreenState();
}

class _PcBuilderScreenState extends ConsumerState<PcBuilderScreen> {
  /// The step shown; one past the last is the review.
  int _step = 0;
  final Map<PcPart, ProductSummary> _chosen = {};

  Map<PcPart, List<ProductSpec>?> get _specs => {
    for (final e in _chosen.entries) e.key: e.value.specs,
  };

  int get _totalCents =>
      _chosen.values.fold(0, (sum, p) => sum + centsOf(p.price.amount));

  /// The problems [candidate] would have as [part], with the others chosen.
  List<BuildProblem> _problemsOf(PcPart part, ProductSummary candidate) {
    final specs = {..._specs, part: candidate.specs};
    return [
      for (final x in checkBuild(specs))
        if (x.part == part || x.withPart == part) x,
    ];
  }

  void _addAll(PcBuilderRules rules) {
    final cart = ref.read(cartProvider.notifier);
    var added = true;
    for (final step in rules.steps) {
      final p = _chosen[step.part];
      if (p == null) continue;
      added =
          cart.add(
            CartItem(
              productId: p.id,
              quantity: 1,
              name: p.name,
              imageUrl: p.imageUrl,
              price: p.price.formatted,
              shownPrice: p.price.shown,
              shownCurrency: p.price.display?.currency,
            ),
          ) &&
          added;
    }
    ScaffoldMessenger.maybeOf(context)
      ?..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            added ? context.l10n.pcBuilderAdded : context.l10n.cartFull,
          ),
          persist: false,
          action: added
              ? SnackBarAction(
                  label: context.l10n.viewCart,
                  onPressed: () => openLocation(context, Paths.cart),
                )
              : null,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final store = ref.watch(appConfigProvider).store;
    final rules = store?.pcBuilder;
    if (rules == null) {
      return Scaffold(
        appBar: AppBar(leading: const AppBarBackButton()),
        body: const SizedBox.shrink(),
      );
    }
    final steps = rules.steps;
    final review = _step >= steps.length;
    final step = review ? null : steps[_step];
    final watts = buildWatts(_specs);
    final problems = checkBuild(_specs);
    final currency = store?.currency ?? '';
    final missing = steps.any((s) => s.required && _chosen[s.part] == null);
    return Scaffold(
      backgroundColor: p.background,
      appBar: AppBar(
        leading: const AppBarBackButton(),
        title: Text(context.l10n.pcBuilderTitle),
      ),
      body: Column(
        children: [
          _Steps(
            steps: steps,
            current: _step,
            chosen: _chosen,
            onTap: (i) => setState(() => _step = i),
          ),
          Expanded(
            child: review
                ? _Review(
                    steps: steps,
                    chosen: _chosen,
                    problems: problems,
                    watts: watts,
                    onChange: (i) => setState(() => _step = i),
                  )
                : _Candidates(
                    key: ValueKey('pc-step-${pcPartWire(step!.part)}'),
                    step: step,
                    chosen: _chosen[step.part],
                    problemsOf: (c) => _problemsOf(step.part, c),
                    watts: (c) => buildWatts({..._specs, step.part: c.specs}),
                    onChoose: (c) => setState(() {
                      if (_chosen[step.part]?.id == c.id) {
                        _chosen.remove(step.part);
                      } else {
                        _chosen[step.part] = c;
                      }
                    }),
                  ),
          ),
        ],
      ),
      bottomNavigationBar: BottomActionBar(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.l10n.pcBuilderTotal,
                        style: TextStyle(
                          fontSize: 12.5,
                          color: p.textSecondary,
                        ),
                      ),
                      Text(
                        formatMoney(_totalCents, currency),
                        key: const ValueKey('pc-total'),
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: p.surfaceMuted,
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AppIcon(AppIcons.power, size: 16, color: p.text),
                      const SizedBox(width: 4),
                      Text(
                        context.l10n.pcBuilderWatts(watts),
                        key: const ValueKey('pc-watts'),
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (review)
              PrimaryButton(
                key: const ValueKey('pc-add-all'),
                label: context.l10n.pcBuilderAddAll,
                icon: AppIcons.cart,
                onPressed: missing || problems.isNotEmpty || _chosen.isEmpty
                    ? null
                    : () => _addAll(rules),
              )
            else
              Row(
                children: [
                  if (!step!.required && _chosen[step.part] == null) ...[
                    Expanded(
                      child: SecondaryButton(
                        key: const ValueKey('pc-skip'),
                        label: context.l10n.pcBuilderSkip,
                        onPressed: () => setState(() => _step++),
                      ),
                    ),
                    const SizedBox(width: 10),
                  ],
                  Expanded(
                    child: PrimaryButton(
                      key: const ValueKey('pc-next'),
                      label: _step == steps.length - 1
                          ? context.l10n.pcBuilderReview
                          : context.l10n.pcBuilderNext,
                      onPressed: _chosen[step.part] == null
                          ? null
                          : () => setState(() => _step++),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

/// The parts as a row of steps: chosen ones ticked, the current one ringed.
class _Steps extends StatelessWidget {
  const _Steps({
    required this.steps,
    required this.current,
    required this.chosen,
    required this.onTap,
  });

  final List<PcBuildStep> steps;
  final int current;
  final Map<PcPart, ProductSummary> chosen;
  final void Function(int index) onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return SizedBox(
      height: 84,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        scrollDirection: Axis.horizontal,
        itemCount: steps.length,
        separatorBuilder: (_, _) => const SizedBox(width: 6),
        itemBuilder: (context, i) {
          final s = steps[i];
          final done = chosen[s.part] != null;
          final now = i == current;
          return InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () => onTap(i),
            child: SizedBox(
              width: 64,
              child: Column(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: done ? p.primary : p.surface,
                      border: Border.all(
                        color: now || done ? p.primary : p.border,
                        width: now ? 2 : 1,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: AppIcon(
                      done ? AppIcons.check : pcPartIcon(s.part),
                      size: 19,
                      color: done ? p.onPrimary : p.text,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    pcPartName(context, s.part),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: now ? FontWeight.w800 : FontWeight.w500,
                      color: now ? p.text : p.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// A part's products to choose from.
class _Candidates extends ConsumerWidget {
  const _Candidates({
    super.key,
    required this.step,
    required this.chosen,
    required this.problemsOf,
    required this.watts,
    required this.onChoose,
  });

  final PcBuildStep step;
  final ProductSummary? chosen;
  final List<BuildProblem> Function(ProductSummary candidate) problemsOf;
  final int Function(ProductSummary candidate) watts;
  final void Function(ProductSummary candidate) onChoose;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final parts = ref.watch(pcPartsProvider(step.categoryId));
    final steps = ref.watch(appConfigProvider).store?.pcBuilder?.steps;
    final index = steps?.indexWhere((s) => s.part == step.part) ?? 0;
    final header = Padding(
      padding: const EdgeInsets.fromLTRB(4, 0, 4, 10),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.l10n.pcBuilderStep(index + 1, steps?.length ?? 1),
                  style: TextStyle(fontSize: 12.5, color: p.textSecondary),
                ),
                Text(
                  pcPartName(context, step.part),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ],
            ),
          ),
          if (!step.required)
            Text(
              context.l10n.pcBuilderOptional,
              style: TextStyle(fontSize: 12.5, color: p.textSecondary),
            ),
        ],
      ),
    );
    return switch (parts) {
      AsyncData(:final value) when value.isEmpty => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          header,
          MessageView(
            icon: pcPartIcon(step.part),
            title: context.l10n.pcBuilderEmpty,
            compact: true,
          ),
        ],
      ),
      AsyncData(:final value) => ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        itemCount: value.length + 1,
        separatorBuilder: (_, i) => SizedBox(height: i == 0 ? 0 : 10),
        itemBuilder: (context, i) {
          if (i == 0) return header;
          final c = value[i - 1];
          final problems = problemsOf(c);
          final on = chosen?.id == c.id;
          return _CandidateTile(
            product: c,
            selected: on,
            problem: problems.isEmpty
                ? null
                : buildProblemText(context, problems.first, watts(c)),
            onTap: () => onChoose(c),
          );
        },
      ),
      AsyncError(:final error) => ErrorView(
        error: error,
        onRetry: () => ref.invalidate(pcPartsProvider(step.categoryId)),
      ),
      _ => const Center(child: CircularProgressIndicator()),
    };
  }
}

class _CandidateTile extends StatelessWidget {
  const _CandidateTile({
    required this.product,
    required this.selected,
    required this.problem,
    required this.onTap,
  });

  final ProductSummary product;
  final bool selected;
  final String? problem;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Opacity(
      opacity: problem != null && !selected ? 0.55 : 1,
      child: Material(
        color: p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(
            color: selected ? p.primary : p.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: InkWell(
          key: ValueKey('pc-part-${product.id}'),
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Row(
              children: [
                AppNetworkImage(
                  url: product.imageUrl,
                  seed: product.id,
                  width: 64,
                  height: 64,
                  radius: 12,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                      if (product.specLine != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          product.specLine!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: p.textSecondary,
                          ),
                        ),
                      ],
                      const SizedBox(height: 4),
                      Text(
                        product.sale?.nowFormatted ?? product.price.shown,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                      if (problem != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            AppIcon(
                              AppIcons.warning,
                              size: 15,
                              color: p.danger,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                problem!,
                                key: ValueKey('pc-problem-${product.id}'),
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: p.danger,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                AppIcon(
                  selected ? AppIcons.radioChecked : AppIcons.radioUnchecked,
                  color: selected ? p.primary : p.textTertiary,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The whole build: each part chosen (a tap changes it), whether they all
/// fit, and the problems when they don't.
class _Review extends StatelessWidget {
  const _Review({
    required this.steps,
    required this.chosen,
    required this.problems,
    required this.watts,
    required this.onChange,
  });

  final List<PcBuildStep> steps;
  final Map<PcPart, ProductSummary> chosen;
  final List<BuildProblem> problems;
  final int watts;
  final void Function(int step) onChange;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return ListView(
      key: const ValueKey('pc-review'),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: problems.isEmpty ? p.successSoft : p.surfaceMuted,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (problems.isEmpty)
                Row(
                  children: [
                    AppIcon(AppIcons.fits, color: p.success, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      context.l10n.pcBuilderFits,
                      key: const ValueKey('pc-fits'),
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                  ],
                ),
              for (final x in problems)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      AppIcon(AppIcons.warning, color: p.danger, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${pcPartName(context, x.part)}: '
                          '${buildProblemText(context, x, watts)}',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: p.text,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        for (final (i, s) in steps.indexed)
          ListTile(
            key: ValueKey('pc-review-${pcPartWire(s.part)}'),
            contentPadding: const EdgeInsets.symmetric(horizontal: 4),
            leading: chosen[s.part] == null
                ? CircleAvatar(
                    backgroundColor: p.surfaceMuted,
                    child: AppIcon(pcPartIcon(s.part), color: p.textSecondary),
                  )
                : AppNetworkImage(
                    url: chosen[s.part]!.imageUrl,
                    seed: chosen[s.part]!.id,
                    width: 48,
                    height: 48,
                    radius: 12,
                  ),
            title: Text(
              pcPartName(context, s.part),
              style: TextStyle(fontSize: 12.5, color: p.textSecondary),
            ),
            subtitle: Text(
              chosen[s.part]?.name ?? '—',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
            trailing: Text(
              chosen[s.part]?.price.shown ?? '',
              style: TextStyle(fontWeight: FontWeight.w700, color: p.text),
            ),
            onTap: () => onChange(i),
          ),
      ],
    );
  }
}

/// The Build your PC card: its parts as steps and a button that starts it.
class PcBuilderCard extends ConsumerWidget {
  const PcBuilderCard({
    super.key,
    required this.rules,
    this.title,
    this.accent,
  });

  final PcBuilderRules rules;
  final String? title;
  final Color? accent;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final tint = accent ?? p.primary;
    final on = tint.computeLuminance() > 0.45
        ? const Color(0xFF111111)
        : Colors.white;
    return Container(
      key: const ValueKey('pc-builder-card'),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppIcon(AppIcons.pcBuilder, color: tint, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  (title ?? '').trim().isEmpty
                      ? context.l10n.pcBuilderTitle
                      : title!.trim(),
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            context.l10n.pcBuilderLine,
            style: TextStyle(fontSize: 13, height: 1.4, color: p.textSecondary),
          ),
          const SizedBox(height: 14),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final (i, s) in rules.steps.indexed) ...[
                  if (i > 0) Container(width: 14, height: 2, color: p.border),
                  Column(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: i == 0 ? tint : p.surfaceMuted,
                        ),
                        alignment: Alignment.center,
                        child: AppIcon(
                          pcPartIcon(s.part),
                          size: 18,
                          color: i == 0 ? on : p.text,
                        ),
                      ),
                      const SizedBox(height: 4),
                      SizedBox(
                        width: 58,
                        child: Text(
                          pcPartName(context, s.part),
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 10.5,
                            color: p.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            key: const ValueKey('pc-builder-start'),
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 44),
              backgroundColor: tint,
              foregroundColor: on,
              shape: const StadiumBorder(),
            ),
            onPressed: () => context.push(Paths.pcBuilder),
            icon: const AppIcon(AppIcons.pcBuilder, size: 18),
            label: Text(context.l10n.pcBuilderStart),
          ),
        ],
      ),
    );
  }
}
