import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/paged_list.dart';
import '../../core/widgets/states.dart';

/// 59 The people who signed in to the app, newest first, with search by
/// name, phone number or email.
class UsersScreen extends ConsumerStatefulWidget {
  const UsersScreen({super.key});

  @override
  ConsumerState<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends ConsumerState<UsersScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  String _query = '';
  int? _count;
  int? _matches;

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _changed(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted) setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final appId = ref.watch(appIdProvider);
    final api = ref.watch(apiProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.appUsers)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: TextField(
              controller: _search,
              onChanged: _changed,
              maxLength: 100,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: l10n.searchUsers,
                prefixIcon: const Icon(AppIcons.search),
                counterText: '',
              ),
            ),
          ),
          if (_count != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: Text(
                  _query.isEmpty
                      ? l10n.usersTotal(_count!)
                      : l10n.usersMatches(_matches ?? 0, _count!),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ),
          Expanded(
            child: PagedList<AppUser>(
              key: ValueKey('$appId-$_query'),
              load: (page) async {
                final result = await api.appUsers(
                  appId,
                  query: _query,
                  page: page,
                );
                if (page == 1 && mounted) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (mounted) {
                      setState(() {
                        _count = result.count;
                        _matches = result.page.total;
                      });
                    }
                  });
                }
                return result.page;
              },
              empty: EmptyState(
                icon: AppIcons.users,
                title: _query.isEmpty ? l10n.noUsers : l10n.noUsersFound,
              ),
              spacing: 8,
              itemBuilder: (context, u) => _UserTile(user: u),
            ),
          ),
        ],
      ),
    );
  }
}

class _UserTile extends StatelessWidget {
  const _UserTile({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    final contact = [?user.phone, ?user.email, ?user.city];
    return Panel(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: context.yb.muted,
            foregroundColor: context.yb.ink,
            child: Text(
              user.name.isEmpty
                  ? '?'
                  : user.name.characters.first.toUpperCase(),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(user.name, style: theme.textTheme.titleSmall),
                if (contact.isNotEmpty)
                  Text(contact.join(' · '), style: theme.textTheme.bodySmall),
                Text(
                  l10n.joined(context.date(user.createdAt)),
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
