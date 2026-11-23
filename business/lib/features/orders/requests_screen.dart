import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app.dart' show pushEventsProvider;
import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/contact.dart';
import '../../core/widgets/digits.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/states.dart';
import '../studio/studio_widgets.dart';

/// 210 The shop's custom-order requests (the dashboard's Store › Custom
/// orders): what a customer asked for in the app's custom-order form, and
/// the shop's answer (where it is, a price, a reply).

/// How many requests are new, and how many the shop has at all (the Orders
/// screen's card shows once there is one).
final requestsSummaryProvider =
    FutureProvider.autoDispose<({int fresh, int total})>((ref) async {
      final api = ref.watch(apiProvider);
      final appId = ref.watch(appIdProvider);
      final fresh = await api.requests(appId, status: 'new');
      if (fresh.total > 0) return (fresh: fresh.total, total: fresh.total);
      final all = await api.requests(appId, status: 'all');
      return (fresh: 0, total: all.total);
    });

final _requestProvider = FutureProvider.autoDispose
    .family<StoreRequest, String>(
      (ref, id) => ref.watch(apiProvider).request(ref.watch(appIdProvider), id),
    );

String requestStatusLabel(BuildContext context, RequestStatus status) {
  final l10n = context.l10n;
  return switch (status) {
    RequestStatus.fresh => l10n.requestStatusNew,
    RequestStatus.quoted => l10n.requestStatusQuoted,
    RequestStatus.accepted => l10n.requestStatusAccepted,
    RequestStatus.declined => l10n.requestStatusDeclined,
    RequestStatus.done => l10n.requestStatusDone,
  };
}

/// The dashboard's tones: new waits for the shop.
Tone requestTone(RequestStatus status) => switch (status) {
  RequestStatus.fresh => Tone.warn,
  RequestStatus.quoted => Tone.info,
  RequestStatus.accepted => Tone.good,
  RequestStatus.declined => Tone.bad,
  RequestStatus.done => Tone.neutral,
};

/// Who sent it: their name, else their phone or email.
String requestWho(BuildContext context, StoreRequest r) =>
    r.customer.name ??
    r.customer.phone ??
    r.customer.email ??
    context.l10n.requestSomeone;

/// The Orders screen's way in: the custom orders and how many are new.
class RequestsCard extends ConsumerWidget {
  const RequestsCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(requestsSummaryProvider).value;
    if (summary == null || summary.total == 0) return const SizedBox.shrink();
    final l10n = context.l10n;
    final c = context.yb;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Semantics(
        button: true,
        child: Box(
          key: const ValueKey('requests-card'),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          radius: 16,
          onTap: () async {
            await context.push(Paths.requests);
            ref.invalidate(requestsSummaryProvider);
          },
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: c.muted,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(AppIcons.customOrder, color: c.accentText),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.customOrders,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      summary.fresh > 0
                          ? l10n.requestsNewCount(summary.fresh)
                          : l10n.customOrdersText,
                      style: TextStyle(fontSize: 13, color: c.ink2),
                    ),
                  ],
                ),
              ),
              if (summary.fresh > 0) ...[
                const SizedBox(width: 8),
                CountBadge(summary.fresh),
              ],
              const SizedBox(width: 4),
              DirectionalIcon(AppIcons.forward, color: c.ink2),
            ],
          ),
        ),
      ),
    );
  }
}

/// The requests: open ones (new, quoted, accepted), new ones, or all; new
/// ones first.
class RequestsScreen extends ConsumerStatefulWidget {
  const RequestsScreen({super.key, this.initialStatus});

  /// open, new or all.
  final String? initialStatus;

  @override
  ConsumerState<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends ConsumerState<RequestsScreen> {
  static const statuses = ['open', 'new', 'all'];
  late int _index = statuses.indexOf(widget.initialStatus ?? '').clamp(0, 2);
  int _version = 0;

  void _changed() {
    if (!mounted) return;
    setState(() => _version++);
    ref.invalidate(requestsSummaryProvider);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final api = ref.watch(apiProvider);
    final appId = ref.watch(appIdProvider);
    final fresh = ref.watch(requestsSummaryProvider).value?.fresh ?? 0;
    // A new request while the list is open shows at once.
    ref.listen(pushEventsProvider, (_, notice) {
      if (notice?.data['store_request_id'] != null) _changed();
    });
    final status = statuses[_index];
    return Scaffold(
      appBar: AppBar(title: Text(l10n.customOrders)),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FilterTabs(
            labels: [
              l10n.requestsOpen,
              l10n.requestStatusNew,
              l10n.requestsAll,
            ],
            selected: _index,
            counts: {1: fresh},
            onSelected: (i) => setState(() => _index = i),
          ),
          Expanded(
            child: PagedList<StoreRequest>(
              key: ValueKey('$appId-$status-$_version'),
              load: (page) => api.requests(appId, status: status, page: page),
              empty: status == 'all'
                  ? EmptyState(
                      icon: AppIcons.customOrder,
                      title: l10n.noRequests,
                      text: l10n.noRequestsText,
                    )
                  : EmptyState(
                      icon: AppIcons.customOrder,
                      title: l10n.noOpenRequests,
                    ),
              itemBuilder: (context, r) => _RequestTile(
                request: r,
                onTap: () async {
                  await context.push(Paths.request(r.id));
                  _changed();
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RequestTile extends StatelessWidget {
  const _RequestTile({required this.request, required this.onTap});

  final StoreRequest request;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    final c = context.yb;
    final r = request;
    final first = r.answers.where((a) => a.value.trim().isNotEmpty);
    final line = first.isEmpty ? r.title : first.first.value;
    return Panel(
      key: ValueKey('request-${r.id}'),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  requestWho(context, r),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium,
                ),
              ),
              const SizedBox(width: 8),
              StatusChip(
                requestStatusLabel(context, r.status),
                tone: requestTone(r.status),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            line,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(AppIcons.schedule, size: 16, color: c.ink2),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  context.ago(r.createdAt),
                  style: theme.textTheme.bodySmall,
                ),
              ),
              if (r.quote != null)
                Text(
                  l10n.requestQuote(isolate(r.quote!.formatted)),
                  style: theme.textTheme.titleSmall,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// One request: what was asked, who asked (with Call, WhatsApp and email),
/// and the shop's answer.
class RequestScreen extends ConsumerWidget {
  const RequestScreen({super.key, required this.requestId});

  final String requestId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(_requestProvider(requestId));
    return Scaffold(
      appBar: AppBar(title: Text(context.l10n.customOrders)),
      body: AsyncBody(
        value: value,
        onRetry: () => ref.invalidate(_requestProvider(requestId)),
        builder: (r) => _RequestBody(
          // A saved answer starts the form again from what the server keeps.
          key: ValueKey((r.id, r.updatedAt, r.status, r.quoteCents, r.reply)),
          request: r,
        ),
      ),
    );
  }
}

class _RequestBody extends ConsumerStatefulWidget {
  const _RequestBody({super.key, required this.request});

  final StoreRequest request;

  @override
  ConsumerState<_RequestBody> createState() => _RequestBodyState();
}

class _RequestBodyState extends ConsumerState<_RequestBody> {
  late final _quote = TextEditingController(
    text: widget.request.quoteText ?? '',
  );
  late final _reply = TextEditingController(text: widget.request.reply ?? '');

  /// A new request is answered with a price first (as the dashboard does).
  late RequestStatus _status = widget.request.status == RequestStatus.fresh
      ? RequestStatus.quoted
      : widget.request.status;
  Map<String, String> _errors = const {};
  bool _busy = false;

  @override
  void dispose() {
    _quote.dispose();
    _reply.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final r = widget.request;
    setState(() {
      _busy = true;
      _errors = const {};
    });
    try {
      await ref
          .read(apiProvider)
          .answerRequest(
            ref.read(appIdProvider),
            r.id,
            status: _status.wire,
            reply: _reply.text.trim(),
            // Typed on an Arabic keyboard too.
            quote: typedAmount(_quote.text),
          );
      if (!mounted) return;
      showMessage(context, context.l10n.requestSaved);
      ref
        ..invalidate(_requestProvider(r.id))
        ..invalidate(requestsSummaryProvider);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _errors = e.fieldErrors);
      if (e.fieldErrors.isEmpty) showError(context, e);
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.yb;
    final r = widget.request;
    final who = requestWho(context, r);
    final customer = r.customer;
    final hasContact =
        customer.name != null ||
        customer.phone != null ||
        customer.email != null;
    final answered = [
      if (r.quote != null) l10n.requestQuote(isolate(r.quote!.formatted)),
      ?r.reply,
    ];
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        Box(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Initials(initialsOf(who), size: 44),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          who,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          l10n.requestSentOn(
                            isolate(r.title),
                            context.dateTime(r.createdAt),
                          ),
                          style: TextStyle(fontSize: 13, color: c.ink2),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Tag(
                    requestStatusLabel(context, r.status),
                    tone: requestTone(r.status),
                  ),
                ],
              ),
              if (answered.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  answered.join(' · '),
                  style: TextStyle(fontSize: 13, color: c.ink2),
                ),
              ],
            ],
          ),
        ),
        _Heading(l10n.requestAsked),
        Box(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (r.answers.isEmpty)
                Text(r.title, style: const TextStyle(fontSize: 15)),
              for (final (i, a) in r.answers.indexed) ...[
                if (i > 0) const SizedBox(height: 12),
                MergeSemantics(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (a.label.isNotEmpty)
                        Text(
                          a.label,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: c.ink2,
                          ),
                        ),
                      SelectableText(
                        a.value,
                        style: const TextStyle(fontSize: 15, height: 1.4),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        if (hasContact) ...[
          _Heading(l10n.requestCustomer),
          Box(
            child: PersonCard(
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
            ),
          ),
        ],
        _Heading(l10n.requestAnswerTitle),
        Box(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.requestStatusLabel,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final s in RequestStatus.values)
                    ChoiceChip(
                      key: ValueKey('request-status-${s.wire}'),
                      label: Text(requestStatusLabel(context, s)),
                      selected: s == _status,
                      onSelected: _busy
                          ? null
                          : (_) => setState(() => _status = s),
                    ),
                ],
              ),
              if (_errors['status'] != null)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    _errors['status']!,
                    style: TextStyle(color: c.danger, fontSize: 13),
                  ),
                ),
              const SizedBox(height: 16),
              TextField(
                key: const ValueKey('request-quote'),
                controller: _quote,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                textDirection: TextDirection.ltr,
                decoration: InputDecoration(
                  labelText: l10n.requestPrice(r.currency),
                  hintText: l10n.requestPriceHint,
                  errorText: _errors['quote'],
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const ValueKey('request-reply'),
                controller: _reply,
                maxLength: 2000,
                minLines: 2,
                maxLines: 6,
                decoration: InputDecoration(
                  labelText: l10n.requestReply,
                  hintText: l10n.requestReplyHint,
                  errorText: _errors['reply'],
                ),
              ),
              const SizedBox(height: 12),
              BigButton(
                key: const ValueKey('request-save'),
                label: l10n.requestSave,
                busy: _busy,
                onPressed: _busy ? null : _save,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsetsDirectional.fromSTEB(4, 20, 4, 8),
    child: Semantics(
      header: true,
      child: Text(text, style: Theme.of(context).textTheme.titleMedium),
    ),
  );
}
