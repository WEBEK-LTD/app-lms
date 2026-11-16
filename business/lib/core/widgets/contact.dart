import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../theme/icons.dart';
import '../theme/theme.dart';
import 'l10n.dart';
import 'states.dart';

/// 132 The phone's own maps at a place: the pin when there is one, else
/// the address searched. Android's `geo:` and Apple Maps' `maps:` open the
/// map app the person uses, with no web address in between.
String mapsUrl(
  TargetPlatform platform, {
  String? query,
  double? lat,
  double? lng,
}) {
  final pin = lat != null && lng != null ? '$lat,$lng' : null;
  final q = Uri.encodeComponent(query ?? '');
  if (platform == TargetPlatform.iOS || platform == TargetPlatform.macOS) {
    return pin != null
        ? 'maps:?ll=$pin&q=${q.isEmpty ? pin : q}'
        : 'maps:?q=$q';
  }
  return pin != null
      ? 'geo:$pin?q=$pin${q.isEmpty ? '' : '($q)'}'
      : 'geo:0,0?q=$q';
}

/// 132 A chat on WhatsApp with a number ("+20 100 123 4567": its digits).
String whatsappUrl(String phone) =>
    'whatsapp://send?phone=${phone.replaceAll(RegExp(r'[^0-9]'), '')}';

/// The dialler with a number.
String telUrl(String phone) =>
    'tel:${phone.replaceAll(RegExp(r'[^0-9+]'), '')}';

/// 132 A person on an order: their name, and their phone with Call and
/// WhatsApp; the email opens the mail app.
class PersonCard extends ConsumerWidget {
  const PersonCard({
    super.key,
    required this.name,
    this.label,
    this.phone,
    this.email,
    this.note,
    this.icon = AppIcons.person,
  });

  final String? name;

  /// "Sender", "Recipient", "From their account in the app".
  final String? label;
  final String? phone;
  final String? email;
  final String? note;
  final IconData icon;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.yb;
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: c.accentText),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (label != null)
                    Text(label!, style: TextStyle(fontSize: 12, color: c.ink2)),
                  Text(
                    name == null ? l10n.noName : isolate(name!),
                    style: text.titleMedium,
                  ),
                  if (phone != null)
                    Text(
                      phone!,
                      textDirection: TextDirection.ltr,
                      style: text.bodyMedium?.copyWith(color: c.ink2),
                    ),
                  if (email != null)
                    InkWell(
                      onTap: () => openLink(context, ref, 'mailto:$email'),
                      child: Text(
                        email!,
                        textDirection: TextDirection.ltr,
                        style: text.bodyMedium?.copyWith(color: c.accentText),
                      ),
                    ),
                  if (note != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        note!,
                        style: TextStyle(fontSize: 12, color: c.ink2),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        if (phone != null) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ActionPill(
                icon: AppIcons.phone,
                label: l10n.call,
                onPressed: () => openLink(context, ref, telUrl(phone!)),
              ),
              ActionPill(
                icon: AppIcons.whatsapp,
                label: l10n.whatsappAction,
                onPressed: () => openLink(context, ref, whatsappUrl(phone!)),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

/// 132 Where something goes: the address, with Open in Maps and Copy
/// address.
class PlaceCard extends ConsumerWidget {
  const PlaceCard({
    super.key,
    required this.address,
    this.title,
    this.detail,
    this.lat,
    this.lng,
    this.icon = AppIcons.location,
  });

  /// The full address ("14 Brazil St, Zamalek, Cairo"); may be empty with a pin.
  final String address;

  /// Who takes it there, when it isn't the customer.
  final String? title;

  /// The zone, the country, the distance.
  final String? detail;
  final double? lat;
  final double? lng;
  final IconData icon;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.yb;
    final l10n = context.l10n;
    final platform = Theme.of(context).platform;
    final hasPin = lat != null && lng != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: c.accentText),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (title != null)
                    Text(
                      title!,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  if (address.isNotEmpty)
                    Text(
                      isolate(address),
                      style: const TextStyle(fontSize: 15),
                    ),
                  if (detail != null)
                    Text(
                      detail!,
                      style: TextStyle(fontSize: 13, color: c.ink2),
                    ),
                ],
              ),
            ),
          ],
        ),
        if (address.isNotEmpty || hasPin) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ActionPill(
                icon: AppIcons.map,
                label: l10n.openInMaps,
                onPressed: () => openLink(
                  context,
                  ref,
                  mapsUrl(platform, query: address, lat: lat, lng: lng),
                ),
              ),
              if (address.isNotEmpty)
                ActionPill(
                  icon: AppIcons.copy,
                  label: l10n.copyAddress,
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: address));
                    if (context.mounted) {
                      showMessage(context, l10n.addressCopied);
                    }
                  },
                ),
            ],
          ),
        ],
      ],
    );
  }
}

/// A small outlined action under a person or a place (Call, WhatsApp, Open
/// in Maps, Copy address): 40 points high, the icon and its word.
class ActionPill extends StatelessWidget {
  const ActionPill({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 18),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 40),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        foregroundColor: c.ink,
        side: BorderSide(color: c.line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        // The theme's font (a style of its own would fall back to the platform's).
        textStyle: Theme.of(context).textTheme.labelLarge
            ?.copyWith(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    );
  }
}
