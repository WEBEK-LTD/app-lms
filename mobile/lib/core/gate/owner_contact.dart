import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/models.dart';
import '../l10n/l10n.dart';
import '../providers.dart';
import '../services/external_links.dart';
import '../storage/local_settings.dart';
import '../theme/app_icons.dart';
import '../theme/palette.dart';
import '../widgets/buttons.dart';

/// The owner's contact from the last `/config` that loaded, kept on the phone
/// so a paused app can still say how to reach its owner (step 13.5).
class OwnerContactStore {
  const OwnerContactStore._();

  static const key = 'gate.owner_contact';

  static OwnerContact? read(WidgetRef ref) {
    try {
      final raw = ref.read(sharedPreferencesProvider).getString(key);
      if (raw == null) return null;
      final json = jsonDecode(raw);
      return json is Map<String, dynamic> ? OwnerContact.fromJson(json) : null;
    } on Object {
      return null;
    }
  }

  static Future<void> save(Ref ref, OwnerContact contact) async {
    try {
      await ref
          .read(sharedPreferencesProvider)
          .setString(key, jsonEncode(contact.toJson()));
    } on Object {
      // No preferences (some tests): nothing to keep.
    }
  }
}

/// The contact to offer: the error's, else the one kept from the last
/// config, else just the app's name from the build.
OwnerContact resolveOwnerContact(WidgetRef ref, OwnerContact? fromError) {
  final name = ref.read(appEnvironmentProvider).build.appName;
  final kept = OwnerContactStore.read(ref);
  final contact = (fromError != null && fromError.reachable)
      ? fromError
      : (kept != null && kept.reachable ? kept : fromError);
  if (contact == null) return OwnerContact(name: name);
  return contact.name.trim().isEmpty
      ? OwnerContact(
          name: name,
          whatsapp: contact.whatsapp,
          email: contact.email,
        )
      : contact;
}

/// WhatsApp first, else email. False when there's no way to reach them.
Future<bool> contactOwner(OwnerContact contact) async {
  if (contact.whatsapp != null) {
    return openExternal(whatsappLink(contact.whatsapp!));
  }
  if (contact.email != null) {
    return openExternal(Uri(scheme: 'mailto', path: contact.email).toString());
  }
  return false;
}

/// A full-screen message about the app's owner: a paused app, or an app that
/// isn't taking new members. "Contact {App}" (when there's a way) and one more
/// action.
class OwnerMessageView extends StatelessWidget {
  const OwnerMessageView({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    required this.contact,
    required this.secondaryLabel,
    required this.onSecondary,
  });

  final IconData icon;
  final String title;
  final String message;
  final OwnerContact contact;
  final String secondaryLabel;
  final VoidCallback onSecondary;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: p.accentSoft,
                  borderRadius: BorderRadius.circular(18),
                ),
                alignment: Alignment.center,
                child: AppIcon(icon, size: 30, color: p.text),
              ),
              const SizedBox(height: 18),
              Semantics(
                header: true,
                child: Text(
                  title,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  height: 1.6,
                  color: p.textSecondary,
                ),
              ),
              const SizedBox(height: 22),
              if (contact.reachable) ...[
                PrimaryButton(
                  label: context.l10n.contactOwner(contact.name),
                  icon: contact.whatsapp != null
                      ? AppIcons.chat
                      : AppIcons.mail,
                  onPressed: () => contactOwner(contact),
                ),
                const SizedBox(height: 10),
                SecondaryButton(label: secondaryLabel, onPressed: onSecondary),
              ] else
                PrimaryButton(label: secondaryLabel, onPressed: onSecondary),
            ],
          ),
        ),
      ),
    );
  }
}

/// Step 13.2: the app reached the number of users its owner's plan allows.
/// Shown on sign-up; people who already have an account aren't affected.
class MembersClosedScreen extends StatelessWidget {
  const MembersClosedScreen({super.key, required this.contact});

  final OwnerContact contact;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: OwnerMessageView(
        icon: AppIcons.group,
        title: context.l10n.membersClosedTitle(contact.name),
        message: context.l10n.membersClosedMessage(contact.name),
        contact: contact,
        secondaryLabel: context.l10n.back,
        onSecondary: () => Navigator.of(context).maybePop(),
      ),
    ),
  );
}

/// Shows [MembersClosedScreen] over the sign-in screens.
Future<void> showMembersClosed(
  BuildContext context,
  WidgetRef ref,
  OwnerContact? fromError,
) {
  final contact = resolveOwnerContact(ref, fromError);
  return Navigator.of(context, rootNavigator: true).push(
    MaterialPageRoute<void>(
      builder: (_) => MembersClosedScreen(contact: contact),
    ),
  );
}
