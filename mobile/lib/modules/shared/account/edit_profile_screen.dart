import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/providers.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import 'account_scaffold.dart';

/// Edit name, email and city (`PATCH /me`). The phone number is the sign-in
/// identity and can't be changed here.
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _email;
  late final TextEditingController _city;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authControllerProvider).user;
    _name = TextEditingController(text: user?.name ?? '');
    _email = TextEditingController(text: user?.email ?? '');
    _city = TextEditingController(text: user?.city ?? '');
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _city.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving || !(_form.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    try {
      final user = await ref
          .read(yallappApiProvider)
          .updateMe(
            name: _name.text.trim(),
            email: _email.text.trim().isEmpty ? null : _email.text.trim(),
            city: _city.text.trim().isEmpty ? null : _city.text.trim(),
          );
      ref.read(authControllerProvider.notifier).updateUser(user);
      if (!mounted) return;
      showMessage(context, 'Profile saved');
      Navigator.of(context).maybePop();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final phone = ref.watch(authControllerProvider).user?.phone ?? '';
    InputDecoration deco(String hint) => InputDecoration(hintText: hint);
    Widget label(String text) => Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 16),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: p.text,
        ),
      ),
    );
    return AccountScaffold(
      title: 'Edit profile',
      footer: PrimaryButton(
        label: 'Save',
        loading: _saving,
        onPressed: _save,
        height: 54,
      ),
      child: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            label('Full name'),
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              autofillHints: const [AutofillHints.name],
              decoration: deco('Full name'),
              validator: (v) => (v == null || v.trim().length < 2)
                  ? 'Enter your name.'
                  : null,
            ),
            label('Email'),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              decoration: deco('Email (optional)'),
              validator: (v) {
                final value = v?.trim() ?? '';
                if (value.isEmpty) return null;
                return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value)
                    ? null
                    : 'Enter a valid email address.';
              },
            ),
            label('City'),
            TextFormField(
              controller: _city,
              textCapitalization: TextCapitalization.words,
              decoration: deco('City (optional)'),
            ),
            label('Mobile number'),
            TextFormField(
              initialValue: phone,
              enabled: false,
              decoration: deco('Mobile number'),
            ),
            const SizedBox(height: 6),
            Text(
              'Your mobile number is how you sign in, so it can’t be changed here.',
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
