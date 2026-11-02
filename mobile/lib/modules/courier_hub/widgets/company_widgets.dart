import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/courier_hub.dart';
import '../data/courier_hub_api.dart';

/// 104.8.4 A company's logo, else its initials on its colour.
class CompanyLogo extends StatelessWidget {
  const CompanyLogo({super.key, required this.company, this.size = 44});

  final CourierCompany company;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final radius = size * 0.27;
    final logo = company.logoUrl;
    if (logo != null && logo.isNotEmpty) {
      return AppNetworkImage(
        url: logo,
        width: size,
        height: size,
        radius: radius,
        fit: BoxFit.contain,
        semanticLabel: context.l10n.logoOf(company.name),
      );
    }
    final color = company.primaryColor == null
        ? p.primary
        : Color(company.primaryColor!);
    final dark = ThemeData.estimateBrightnessForColor(color) == Brightness.dark;
    return Semantics(
      label: context.l10n.logoOf(company.name),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(radius),
        ),
        alignment: Alignment.center,
        child: ExcludeSemantics(
          child: Text(
            InitialsAvatar.initialsOf(company.name),
            style: TextStyle(
              color: dark ? Colors.white : const Color(0xFF0E0D24),
              fontSize: size * 0.36,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

/// 104.8.4 Inside Yallapp Courier, the company the courier's screens are
/// on, at the top of them: its logo and name, and a way to the others.
/// Nothing in any other build.
class CompanyBar extends ConsumerWidget {
  const CompanyBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final link = ref.watch(courierHubLinkProvider);
    if (link == null) return const SizedBox.shrink();
    final p = context.palette;
    return Padding(
      key: const ValueKey('hub-company-bar'),
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
      child: Row(
        children: [
          CompanyLogo(company: link.company, size: 36),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              link.company.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
          ),
          if (link.canSwitch)
            TextButton.icon(
              key: const ValueKey('hub-switch-company'),
              onPressed: link.switchCompany,
              icon: const AppIcon(AppIcons.swap, size: 18),
              label: Text(context.l10n.hubSwitchCompany),
            ),
        ],
      ),
    );
  }
}
