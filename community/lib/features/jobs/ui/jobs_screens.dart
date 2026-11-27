import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/auth/session.dart';
import '../../../core/l10n.dart';
import '../../../core/routing/feature_routes.dart';
import '../../../core/theme/tokens.dart';
import '../../qa/ui/content_direction.dart';
import '../../showcase/ui/flat_kit.dart';
import '../data/jobs_api.dart';

final jobsProvider = FutureProvider.autoDispose<List<Job>>(
  (ref) =>
      ref.watch(jobsApiProvider).jobs(me: ref.watch(meProvider)?.member.id),
);

final jobProvider = FutureProvider.autoDispose.family<Job, String>(
  (ref, id) =>
      ref.watch(jobsApiProvider).job(id, me: ref.watch(meProvider)?.member.id),
);

final applicantsProvider = FutureProvider.autoDispose
    .family<List<JobApplication>, String>(
      (ref, id) => ref.watch(jobsApiProvider).applicants(id),
    );

String jobTypeLabel(BuildContext context, JobType t) {
  final l = context.l10n;
  return switch (t) {
    JobType.fullTime => l.jobFullTime,
    JobType.partTime => l.jobPartTime,
    JobType.contract => l.jobContract,
    JobType.freelance => l.jobFreelance,
    JobType.internship => l.jobInternship,
  };
}

List<Widget> _tags(BuildContext context, Job j) => [
  FlatTag(jobTypeLabel(context, j.type)),
  if (j.remote)
    FlatTag(context.l10n.jobRemote, icon: Symbols.public_rounded)
  else if (j.location.isNotEmpty)
    FlatTag(j.location, icon: Symbols.location_on_rounded),
  if (j.budget.isNotEmpty) FlatTag(context.l10n.jobBudget(j.budget)),
];

/// 234.2 Jobs.
class JobsScreen extends ConsumerWidget {
  const JobsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = context.palette;
    return FlatPage(
      title: l.jobsTitle,
      body: FlatAsyncList<Job>(
        value: ref.watch(jobsProvider),
        onRetry: () => ref.refresh(jobsProvider.future),
        empty: l.jobsEmpty,
        item: (j) => FlatCard(
          semanticLabel: j.title,
          onTap: () => context.push(FeatureLinks.job(j.id)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FlatHeading(j.title, size: 15.5),
              Text(
                j.poster.name,
                style: TextStyle(fontSize: 12.5, color: p.muted),
              ),
              const SizedBox(height: 8),
              Wrap(spacing: 6, runSpacing: 6, children: _tags(context, j)),
            ],
          ),
        ),
      ),
    );
  }
}

/// A job: its description and skills; Apply, or the poster's applicants.
class JobScreen extends ConsumerWidget {
  const JobScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = context.palette;
    final value = ref.watch(jobProvider(id));
    final j = value.value;
    final signedIn = ref.watch(meProvider) != null;
    return FlatPage(
      title: j?.title ?? l.jobsTitle,
      body: j == null
          ? Center(
              child: value.hasError
                  ? TextButton(
                      onPressed: () => ref.invalidate(jobProvider(id)),
                      child: Text(l.commonRetry),
                    )
                  : const CircularProgressIndicator(),
            )
          : ListView(
              padding: EdgeInsets.fromLTRB(
                16,
                4,
                16,
                120 + MediaQuery.paddingOf(context).bottom,
              ),
              children: [
                Wrap(spacing: 6, runSpacing: 6, children: _tags(context, j)),
                const SizedBox(height: 14),
                Text(
                  j.description,
                  textDirection: contentDirection(j.description),
                  style: TextStyle(fontSize: 15, height: 1.6, color: p.ink),
                ),
                if (j.skills.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [for (final s in j.skills) FlatTag(s)],
                  ),
                ],
                const SizedBox(height: 18),
                if (j.mine) ...[
                  FlatHeading(l.jobApplicants(j.applicationCount), size: 15),
                  const SizedBox(height: 8),
                  for (final a
                      in ref.watch(applicantsProvider(id)).value ??
                          const <JobApplication>[])
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: FlatCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              a.member.name,
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: p.ink,
                              ),
                            ),
                            Text(a.message, style: TextStyle(color: p.ink)),
                            for (final link in a.links)
                              InkWell(
                                onTap: () => openLink(context, ref, link),
                                child: Text(
                                  link,
                                  style: const TextStyle(color: Brand.orange),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                ] else if (j.applied)
                  FlatTag(
                    l.jobApplied,
                    icon: Symbols.check_rounded,
                    accent: true,
                  )
                else if (signedIn)
                  FlatButton(
                    label: l.jobApply,
                    icon: Symbols.send_rounded,
                    onPressed: () => _apply(context, ref, j.id),
                  ),
              ],
            ),
    );
  }
}

Future<void> _apply(BuildContext context, WidgetRef ref, String id) async {
  final l = context.l10n;
  final message = await askText(
    context,
    title: l.jobApply,
    hint: l.jobApplyHint,
    send: l.challengeSend,
    long: true,
  );
  if (message == null || message.length < 10) return;
  try {
    await ref.read(jobsApiProvider).apply(id, message: message);
    ref.invalidate(jobProvider(id));
  } catch (e) {
    if (context.mounted) showFailure(context, e);
  }
}
