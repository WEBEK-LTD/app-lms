import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/session.dart';
import '../../core/l10n.dart';
import '../../core/providers.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/avatar.dart';
import '../../core/widgets/sym.dart';

/// Picks a photo for the avatar (the gallery); null when closed.
typedef PickPhoto = Future<String?> Function();

final pickPhotoProvider = Provider<PickPhoto>(
  (ref) =>
      () async => (await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        imageQuality: 88,
      ))?.path,
);

/// Edit profile: the photo, name, username, bio and skills.
class EditProfilePage extends ConsumerStatefulWidget {
  const EditProfilePage({super.key});

  @override
  ConsumerState<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends ConsumerState<EditProfilePage> {
  late final _name = TextEditingController(
    text: ref.read(meProvider)?.member.name ?? '',
  );
  late final _username = TextEditingController(
    text: ref.read(meProvider)?.member.username ?? '',
  );
  late final _bio = TextEditingController(
    text: ref.read(meProvider)?.bio ?? '',
  );
  final _skill = TextEditingController();
  late final List<String> _skills = [...?ref.read(meProvider)?.skills];
  bool _busy = false;
  Map<String, String> _errors = const {};

  @override
  void dispose() {
    _name.dispose();
    _username.dispose();
    _bio.dispose();
    _skill.dispose();
    super.dispose();
  }

  void _addSkill() {
    final s = _skill.text.trim();
    if (s.isEmpty || _skills.contains(s) || _skills.length >= 12) return;
    setState(() {
      _skills.add(s);
      _skill.clear();
    });
  }

  Future<void> _photo() async {
    final path = await ref.read(pickPhotoProvider)();
    if (path == null || !mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    final l = context.l10n;
    try {
      ref
          .read(sessionProvider.notifier)
          .replace(await ref.read(communityApiProvider).uploadAvatar(path));
    } on ApiException catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            e.offline
                ? l.commonOffline
                : (e.message.isEmpty ? l.commonError : e.message),
          ),
        ),
      );
    }
  }

  Future<void> _save() async {
    if (_busy) return;
    final l = context.l10n;
    final messenger = ScaffoldMessenger.of(context);
    final router = GoRouter.of(context);
    if (_name.text.trim().isEmpty) {
      setState(() => _errors = {'display_name': l.authNameNeeded});
      return;
    }
    setState(() {
      _busy = true;
      _errors = const {};
    });
    try {
      final me = await ref
          .read(communityApiProvider)
          .updateMe(
            name: _name.text.trim(),
            username: _username.text.trim(),
            bio: _bio.text.trim(),
            skills: _skills,
          );
      ref.read(sessionProvider.notifier).replace(me);
      messenger.showSnackBar(SnackBar(content: Text(l.profileSaved)));
      router.pop();
    } on ApiException catch (e) {
      setState(() => _errors = e.fieldErrors);
      if (e.fieldErrors.isEmpty) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(
              e.offline
                  ? l.commonOffline
                  : (e.message.isEmpty ? l.commonError : e.message),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    final me = ref.watch(meProvider);
    if (me == null) return const SizedBox.shrink();
    final m = me.member;
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(
          l.profileEdit,
          style: TextStyle(fontWeight: FontWeight.w800, color: p.ink),
        ),
        actions: [
          Padding(
            padding: const EdgeInsetsDirectional.only(end: 10),
            child: TextButton(
              key: const ValueKey('edit-save'),
              onPressed: _busy ? null : _save,
              style: TextButton.styleFrom(
                foregroundColor: Brand.orange,
                textStyle: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                ),
              ),
              child: Text(l.commonSave),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
        children: [
          Center(
            child: GestureDetector(
              key: const ValueKey('edit-photo'),
              onTap: _photo,
              child: Column(
                children: [
                  MeAvatar(id: m.id, name: m.name, url: m.avatarUrl, size: 88),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Sym(
                        Symbols.photo_camera_rounded,
                        size: 18,
                        color: Brand.orange,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        l.profileChangePhoto,
                        style: const TextStyle(
                          color: Brand.orange,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 22),
          TextField(
            key: const ValueKey('edit-name'),
            controller: _name,
            style: TextStyle(color: p.ink),
            decoration: InputDecoration(
              labelText: l.profileName,
              errorText: _errors['display_name'] ?? _errors['name'],
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            key: const ValueKey('edit-username'),
            controller: _username,
            style: TextStyle(color: p.ink),
            decoration: InputDecoration(
              labelText: l.profileUsername,
              prefixText: '@',
              errorText: _errors['username'],
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            key: const ValueKey('edit-bio'),
            controller: _bio,
            maxLines: 4,
            minLines: 3,
            maxLength: 280,
            style: TextStyle(color: p.ink),
            decoration: InputDecoration(
              labelText: l.profileBio,
              alignLabelWithHint: true,
              errorText: _errors['bio'],
            ),
          ),
          const SizedBox(height: 6),
          Text(
            l.profileSkills,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: p.ink,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final s in _skills)
                InputChip(
                  key: ValueKey('skill-$s'),
                  label: Text(s),
                  onDeleted: () => setState(() => _skills.remove(s)),
                  deleteIcon: const Sym(Symbols.close_rounded, size: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            key: const ValueKey('edit-skill'),
            controller: _skill,
            style: TextStyle(color: p.ink),
            onSubmitted: (_) => _addSkill(),
            decoration: InputDecoration(
              hintText: l.profileAddSkill,
              suffixIcon: IconButton(
                key: const ValueKey('edit-skill-add'),
                onPressed: _addSkill,
                icon: const Sym(Symbols.add_rounded, color: Brand.orange),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
