import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/owner_contact.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/widgets/buttons.dart';
import 'sign_in_screen.dart';
import '../../../core/l10n/l10n.dart';

class SignupArgs {
  const SignupArgs({required this.signup});
  final SignupRequired signup;
}

/// After verifying a new number: the name and any other fields the site
/// requires ("Required at sign-up"), then `POST /auth/register`.
class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key, required this.args});

  final SignupArgs args;

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _city = TextEditingController();
  bool _saving = false;
  String? _error;

  late final Set<SignupField> _required = {
    SignupField.name,
    ...widget.args.signup.fields,
  };

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _city.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_saving || !(_form.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(authControllerProvider.notifier)
          .register(
            signupToken: widget.args.signup.signupToken,
            name: _name.text.trim(),
            email: _email.text.trim(),
            city: _city.text.trim(),
          );
      // Signed in: the router leaves the sign-in screens by itself.
    } on ApiException catch (e) {
      if (!mounted) return;
      // 13.2 The app reached its owner's number of users: say so, with their contact.
      if (e.code == ApiException.appUserLimit) {
        await showMembersClosed(context, ref, e.contact);
        return;
      }
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final site = ref.watch(appConfigProvider).site.name;
    final showEmail = _required.contains(SignupField.email);
    final showCity = _required.contains(SignupField.city);
    return Scaffold(
      body: SafeArea(
        child: Form(
          key: _form,
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: AppBackButton(),
                      ),
                      const SizedBox(height: 28),
                      Semantics(
                        header: true,
                        child: Text(
                          context.l10n.createYourAccount,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        context.l10n.signupIntro(site),
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      const SizedBox(height: 28),
                      _Field(
                        label: context.l10n.fullName,
                        controller: _name,
                        autofill: AutofillHints.name,
                        capitalization: TextCapitalization.words,
                        validator: (v) => (v == null || v.trim().length < 2)
                            ? context.l10n.enterName
                            : null,
                      ),
                      if (showEmail) ...[
                        const SizedBox(height: 18),
                        _Field(
                          label: context.l10n.email,
                          controller: _email,
                          autofill: AutofillHints.email,
                          keyboard: TextInputType.emailAddress,
                          validator: (v) {
                            final value = v?.trim() ?? '';
                            if (value.isEmpty) return context.l10n.enterEmail;
                            return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                                    .hasMatch(value)
                                ? null
                                : context.l10n.enterValidEmail;
                          },
                        ),
                      ],
                      if (showCity) ...[
                        const SizedBox(height: 18),
                        _Field(
                          label: context.l10n.city,
                          controller: _city,
                          autofill: AutofillHints.addressCity,
                          capitalization: TextCapitalization.words,
                          validator: (v) => (v == null || v.trim().isEmpty)
                              ? context.l10n.enterCity
                              : null,
                        ),
                      ],
                      if (_error != null) ...[
                        const SizedBox(height: 14),
                        InlineError(_error!),
                      ],
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                child: PrimaryButton(
                  label: context.l10n.createAccount,
                  loading: _saving,
                  onPressed: _submit,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.label,
    required this.controller,
    required this.validator,
    this.autofill,
    this.keyboard,
    this.capitalization = TextCapitalization.none,
  });

  final String label;
  final TextEditingController controller;
  final FormFieldValidator<String> validator;
  final String? autofill;
  final TextInputType? keyboard;
  final TextCapitalization capitalization;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text(
        label,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
      const SizedBox(height: 8),
      TextFormField(
        controller: controller,
        keyboardType: keyboard,
        textCapitalization: capitalization,
        autofillHints: autofill == null ? null : [autofill!],
        textInputAction: TextInputAction.next,
        decoration: InputDecoration(hintText: label),
        validator: validator,
      ),
    ],
  );
}
