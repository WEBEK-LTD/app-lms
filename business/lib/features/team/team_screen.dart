import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

final teamProvider = FutureProvider.autoDispose<Team>(
  (ref) => ref.watch(apiProvider).team(),
);

/// 60 The words for a role and an area, in the app's language.
String roleName(BuildContext context, TeamRole role) => switch (role) {
  TeamRole.owner => context.l10n.roleOwner,
  TeamRole.manager => context.l10n.roleManager,
  TeamRole.staff => context.l10n.roleStaff,
};

String areaName(BuildContext context, String area) {
  final l10n = context.l10n;
  return switch (area) {
    'orders' => l10n.areaOrders,
    'bookings' => l10n.areaBookings,
    'events' => l10n.areaEvents,
    'donations' => l10n.areaDonations,
    'catalog' => l10n.areaCatalog,
    'media' => l10n.areaMedia,
    'messages' => l10n.areaMessages,
    'chat' => l10n.areaChat,
    'app_users' => l10n.areaAppUsers,
    'analytics' => l10n.areaAnalytics,
    'notifications' => l10n.areaNotifications,
    _ => area,
  };
}

/// 60 The owner's team, as on Dashboard › Team: who is on it and what each
/// may do, the invitations waiting (send again, cancel), inviting someone,
/// changing what someone can do and removing them (signed out at once).
class TeamScreen extends ConsumerWidget {
  const TeamScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final team = ref.watch(teamProvider);
    final me = ref.watch(meProvider);
    final apps = me?.apps ?? const <AppSummary>[];

    Future<void> run(Future<void> Function() action, String done) async {
      try {
        await action();
        ref.invalidate(teamProvider);
        if (context.mounted) showMessage(context, done);
      } on Object catch (e) {
        if (context.mounted) showError(context, e);
      }
    }

    String appsLine(List<String>? ids) => ids == null
        ? l10n.allApps
        : apps.where((a) => ids.contains(a.id)).map((a) => a.name).join(', ');

    String accessLine(TeamRole role, List<String> areas) =>
        role == TeamRole.staff
        ? areas.map((a) => areaName(context, a)).join(', ')
        : l10n.everything;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.team)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final sent = await showModalBottomSheet<String>(
            context: context,
            isScrollControlled: true,
            showDragHandle: true,
            builder: (_) => AccessSheet(apps: apps),
          );
          if (sent != null) {
            ref.invalidate(teamProvider);
            if (context.mounted) showMessage(context, l10n.inviteSent(sent));
          }
        },
        icon: const Icon(AppIcons.invite),
        label: Text(l10n.inviteSomeone),
      ),
      body: RefreshIndicator(
        onRefresh: pullToRefresh(
          context,
          () => ref.refresh(teamProvider.future),
        ),
        child: AsyncBody(
          value: team,
          onRetry: () => ref.invalidate(teamProvider),
          builder: (data) => ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
            children: [
              Text(l10n.teamIntro, style: theme.textTheme.bodySmall),
              const SizedBox(height: 12),
              for (final m in data.members)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Panel(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: ListTile(
                      leading: CircleAvatar(
                        child: Text(
                          m.name.trim().isEmpty
                              ? '?'
                              : m.name.trim()[0].toUpperCase(),
                        ),
                      ),
                      title: Text(
                        m.userId == me?.user.id
                            ? '${m.name} (${l10n.you})'
                            : m.name,
                      ),
                      subtitle: Text(
                        [
                          roleName(context, m.role),
                          accessLine(m.role, m.areas),
                          if (apps.length > 1) appsLine(m.appIds),
                        ].join(' · '),
                      ),
                      isThreeLine: apps.length > 1,
                      trailing: m.role == TeamRole.owner
                          ? null
                          : PopupMenuButton<String>(
                              tooltip: l10n.changeAccess,
                              onSelected: (choice) async {
                                if (choice == 'edit') {
                                  final saved =
                                      await showModalBottomSheet<String>(
                                        context: context,
                                        isScrollControlled: true,
                                        showDragHandle: true,
                                        builder: (_) =>
                                            AccessSheet(apps: apps, member: m),
                                      );
                                  if (saved != null) {
                                    ref.invalidate(teamProvider);
                                    if (context.mounted) {
                                      showMessage(context, l10n.accessSaved);
                                    }
                                  }
                                  return;
                                }
                                final ok = await confirm(
                                  context,
                                  title: l10n.removeMemberTitle(m.name),
                                  text: l10n.removeMemberText,
                                  action: l10n.removeMember,
                                  destructive: true,
                                );
                                if (!ok) return;
                                await run(
                                  () => ref
                                      .read(apiProvider)
                                      .removeTeamMember(m.userId),
                                  l10n.memberRemoved(m.name),
                                );
                              },
                              itemBuilder: (_) => [
                                PopupMenuItem(
                                  value: 'edit',
                                  child: Text(l10n.changeAccess),
                                ),
                                PopupMenuItem(
                                  value: 'remove',
                                  child: Text(
                                    l10n.removeMember,
                                    style: TextStyle(color: context.yb.danger),
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ),
              if (data.invitations.isNotEmpty) ...[
                SectionTitle(l10n.invitationsWaiting),
                for (final i in data.invitations)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Panel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(AppIcons.email),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${i.name} · ${roleName(context, i.role)}',
                                      style: theme.textTheme.titleSmall,
                                    ),
                                    Text(
                                      i.email,
                                      textDirection: TextDirection.ltr,
                                      style: theme.textTheme.bodySmall,
                                    ),
                                    Text(
                                      i.expired
                                          ? l10n.invitationExpired
                                          : l10n.invitationExpires(
                                              context.date(i.expiresAt),
                                            ),
                                      style: theme.textTheme.bodySmall
                                          ?.copyWith(
                                            color: i.expired
                                                ? context.yb.danger
                                                : null,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            children: [
                              OutlinedButton(
                                onPressed: () => run(
                                  () => ref
                                      .read(apiProvider)
                                      .resendInvitation(i.id),
                                  l10n.inviteSentAgain,
                                ),
                                child: Text(l10n.resendInvite),
                              ),
                              TextButton(
                                onPressed: () => run(
                                  () => ref
                                      .read(apiProvider)
                                      .cancelInvitation(i.id),
                                  l10n.inviteCancelled,
                                ),
                                child: Text(l10n.cancelInvite),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// 60 Inviting someone (name, email) or changing a member's access: the
/// role, what Staff can work on, and which apps.
class AccessSheet extends ConsumerStatefulWidget {
  const AccessSheet({super.key, required this.apps, this.member});

  final List<AppSummary> apps;

  /// Null: a new invitation.
  final TeamMember? member;

  @override
  ConsumerState<AccessSheet> createState() => _AccessSheetState();
}

class _AccessSheetState extends ConsumerState<AccessSheet> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  late TeamRole _role = widget.member?.role ?? TeamRole.staff;
  late final Set<String> _areas = {...?widget.member?.areas};
  late Set<String>? _apps = widget.member?.appIds?.toSet();
  Map<String, String> _errors = const {};
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = context.l10n;
    final errors = <String, String>{
      if (widget.member == null && _name.text.trim().length < 2)
        'name': l10n.enterName,
      if (widget.member == null && !_email.text.contains('@'))
        'email': l10n.enterEmail,
      if (_role == TeamRole.staff && _areas.isEmpty)
        'areas': l10n.oneAreaAtLeast,
    };
    setState(() => _errors = errors);
    if (errors.isNotEmpty) return;
    setState(() => _busy = true);
    final api = ref.read(apiProvider);
    final areas = [
      for (final a in teamAreas)
        if (_role == TeamRole.staff && _areas.contains(a)) a,
    ];
    final appIds = _apps?.toList();
    try {
      if (widget.member case final member?) {
        await api.updateTeamMember(
          member.userId,
          role: _role,
          areas: areas,
          appIds: appIds,
        );
        if (mounted) Navigator.of(context).pop(member.userId);
      } else {
        final invited = await api.inviteTeamMember(
          name: _name.text.trim(),
          email: _email.text.trim(),
          role: _role,
          areas: areas,
          appIds: appIds,
        );
        if (mounted) Navigator.of(context).pop(invited.email);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _errors = {
          for (final entry in e.fieldErrors.entries)
            entry.key == 'appIds' ? 'apps' : entry.key: entry.value,
        };
      });
      if (e.fieldErrors.isEmpty) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final member = widget.member;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      // The button stays in view under the fields, which scroll.
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    member == null ? l10n.inviteSomeone : member.name,
                    style: theme.textTheme.titleLarge,
                  ),
                  if (member == null) ...[
                    const SizedBox(height: 4),
                    Text(l10n.inviteHelp, style: theme.textTheme.bodySmall),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _name,
                      decoration: InputDecoration(
                        labelText: l10n.personName,
                        errorText: _errors['name'],
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      textDirection: TextDirection.ltr,
                      decoration: InputDecoration(
                        labelText: l10n.email,
                        errorText: _errors['email'],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Text(l10n.role, style: theme.textTheme.titleSmall),
                  RadioGroup<TeamRole>(
                    groupValue: _role,
                    onChanged: (v) => setState(() => _role = v ?? _role),
                    child: Column(
                      children: [
                        RadioListTile<TeamRole>(
                          value: TeamRole.manager,
                          title: Text(l10n.roleManager),
                          subtitle: Text(l10n.roleManagerHelp),
                        ),
                        RadioListTile<TeamRole>(
                          value: TeamRole.staff,
                          title: Text(l10n.roleStaff),
                          subtitle: Text(l10n.roleStaffHelp),
                        ),
                      ],
                    ),
                  ),
                  if (_role == TeamRole.staff) ...[
                    const SizedBox(height: 8),
                    Text(l10n.whatStaff, style: theme.textTheme.titleSmall),
                    for (final area in teamAreas)
                      CheckboxListTile(
                        value: _areas.contains(area),
                        title: Text(areaName(context, area)),
                        onChanged: (v) => setState(
                          () => v == true
                              ? _areas.add(area)
                              : _areas.remove(area),
                        ),
                      ),
                    if (_errors['areas'] case final error?)
                      Text(error, style: TextStyle(color: context.yb.danger)),
                  ],
                  if (widget.apps.length > 1) ...[
                    const SizedBox(height: 8),
                    SwitchListTile(
                      value: _apps == null,
                      title: Text(l10n.allApps),
                      onChanged: (all) => setState(
                        () => _apps = all
                            ? null
                            : widget.apps.map((a) => a.id).toSet(),
                      ),
                    ),
                    if (_apps case final chosen?)
                      for (final app in widget.apps)
                        CheckboxListTile(
                          value: chosen.contains(app.id),
                          title: Text(app.name),
                          onChanged: (v) => setState(
                            () => v == true
                                ? chosen.add(app.id)
                                : chosen.remove(app.id),
                          ),
                        ),
                    if (_errors['apps'] case final error?)
                      Text(error, style: TextStyle(color: context.yb.danger)),
                  ],
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: FilledButton(
              onPressed: _busy ? null : _submit,
              child: Text(member == null ? l10n.sendInvite : l10n.saveChanges),
            ),
          ),
        ],
      ),
    );
  }
}
