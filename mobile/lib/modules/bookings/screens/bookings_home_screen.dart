import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show SystemUiOverlayStyle;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_look.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/data/lms_providers.dart' show unreadNotificationsProvider;
import '../data/bookings_providers.dart';
import '../widgets/booking_widgets.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/vertical_wording.dart';

/// The Bookings app's Home: sections from `GET /bookings/home` in the order
/// set in the plugin.
class BookingsHomeScreen extends ConsumerWidget {
  const BookingsHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sections = ref.watch(bookingsHomeProvider);
    Future<void> refresh() => ref.refresh(bookingsHomeProvider.future);
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: refresh,
        edgeOffset: MediaQuery.paddingOf(context).top,
        child: switch (sections) {
          AsyncData(:final value) => _Sections(sections: value),
          AsyncError(:final error) => ListView(
            children: [
              SizedBox(
                height: MediaQuery.sizeOf(context).height * 0.8,
                child: ErrorView(error: error, onRetry: refresh),
              ),
            ],
          ),
          _ => const SkeletonHome(),
        },
      ),
    );
  }
}

class _Sections extends ConsumerWidget {
  const _Sections({required this.sections});

  final List<BookingsHomeSection> sections;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final site = ref.watch(appConfigProvider).site.name;
    final known = [
      for (final s in sections)
        if (s.type != BookingsSectionType.unknown) s,
    ];
    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        _Header(site: site),
        if (known.isEmpty)
          Padding(
            padding: EdgeInsets.only(top: 48),
            child: MessageView(
              icon: AppIcons.book,
              title: context.l10n.gettingReady,
              message: context.l10n.servicesSoon,
              compact: true,
            ),
          ),
        for (final s in known) _section(context, s),
      ],
    );
  }

  Widget _section(BuildContext context, BookingsHomeSection s) {
    switch (s.type) {
      case BookingsSectionType.banner:
        final image = s.bannerImageUrl;
        if (image == null) return const SizedBox.shrink();
        final service = s.bannerServiceId;
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Semantics(
            button: service != null,
            image: true,
            label: context.l10n.offer,
            excludeSemantics: true,
            child: GestureDetector(
              onTap: service == null
                  ? null
                  : () => context.push(Paths.service(service)),
              child: AspectRatio(
                aspectRatio: 16 / 7,
                child: AppNetworkImage(url: image, radius: context.shapes.card),
              ),
            ),
          ),
        );
      case BookingsSectionType.nextAppointment:
        final appointment = s.appointment;
        if (appointment == null) return const SizedBox.shrink();
        final words = context.words;
        return _Block(
          // 21 A clinic's words win over the server's ("Your next visit").
          title: words.isClinic
              ? words.nextAppointment
              : s.title ?? words.nextAppointment,
          onSeeAll: () => context.go(Paths.appointments),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: AppointmentCard(
              appointment: appointment,
              onTap: () => context.push(Paths.appointment(appointment.id)),
            ),
          ),
        );
      case BookingsSectionType.categories:
        if (s.categories.isEmpty) return const SizedBox.shrink();
        return _Block(
          title: s.title ?? context.l10n.categories,
          onSeeAll: () => context.go(Paths.services),
          child: SizedBox(
            height: chipRowHeight(context),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: s.categories.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final c = s.categories[i];
                return PillChip(
                  label: c.name,
                  selected: false,
                  onTap: () =>
                      context.go(Paths.servicesFiltered(category: c.id)),
                );
              },
            ),
          ),
        );
      case BookingsSectionType.services:
        if (s.services.isEmpty) return const SizedBox.shrink();
        return _Block(
          title: s.title ?? context.l10n.services,
          onSeeAll: () => context.go(Paths.services),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              children: [
                for (final service in s.services)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: ServiceTile(
                      service: service,
                      onTap: () => context.push(Paths.service(service.id)),
                    ),
                  ),
              ],
            ),
          ),
        );
      case BookingsSectionType.staff:
        if (s.staff.isEmpty) return const SizedBox.shrink();
        final scale = MediaQuery.textScalerOf(context);
        final words = context.words;
        return _Block(
          title: words.isClinic ? words.ourTeam : s.title ?? words.ourTeam,
          child: SizedBox(
            height: 72 + scale.scale(36),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: s.staff.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) => _StaffCard(staff: s.staff[i]),
            ),
          ),
        );
      case BookingsSectionType.unknown:
        return const SizedBox.shrink();
    }
  }
}

class _StaffCard extends StatelessWidget {
  const _StaffCard({required this.staff});

  final StaffMember staff;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    // 21 A staff member with a profile opens it.
    final profile = staff.hasProfile;
    return Semantics(
      label: staff.title == null ? staff.name : '${staff.name}, ${staff.title}',
      hint: profile ? context.l10n.staffViewProfile : null,
      button: profile,
      excludeSemantics: true,
      child: InkWell(
        onTap: profile ? () => showStaffProfile(context, staff) : null,
        borderRadius: BorderRadius.circular(context.shapes.card),
        child: SizedBox(
          width: 84,
          child: Column(
            children: [
              StaffAvatar(staff: staff, size: 64),
              const SizedBox(height: 6),
              Text(
                staff.name,
                maxLines: 2,
                textAlign: TextAlign.center,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 12, color: p.text),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Block extends StatelessWidget {
  const _Block({required this.title, required this.child, this.onSeeAll});

  final String title;
  final Widget child;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 22),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(20, 0, 12, 10),
          child: SectionHeader(title: title, onSeeAll: onSeeAll),
        ),
        child,
      ],
    ),
  );
}

/// The top of the Bookings Home in the app's template: the business's name,
/// notifications and the "Book an appointment" button. Bold puts them on a
/// block of the brand color; Minimal uses a large title.
class _Header extends ConsumerWidget {
  const _Header({required this.site});

  final String site;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final template = ref.watch(appLookProvider).template;
    final top = MediaQuery.paddingOf(context).top;
    void book() => context.go(Paths.services);
    final title = Semantics(
      header: true,
      child: Text(
        site,
        maxLines: template == AppTemplate.minimal ? 2 : 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: switch (template) {
            AppTemplate.classic => 22,
            AppTemplate.bold => 24,
            AppTemplate.minimal => 30,
          },
          fontWeight: FontWeight.w800,
          letterSpacing: template == AppTemplate.minimal ? -0.8 : null,
          height: 1.2,
          color: template == AppTemplate.bold ? p.onPrimary : p.text,
        ),
      ),
    );
    if (template != AppTemplate.bold) {
      return Padding(
        padding: EdgeInsets.fromLTRB(
          template == AppTemplate.minimal ? 24 : 20,
          top + (template == AppTemplate.minimal ? 20 : 16),
          20,
          4,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(child: title),
                _NotificationsButton(plain: template == AppTemplate.minimal),
              ],
            ),
            const SizedBox(height: 14),
            PrimaryButton(
              label: context.words.bookAppointment,
              icon: AppIcons.book,
              onPressed: book,
            ),
          ],
        ),
      );
    }
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: overlayStyleOn(p.primary),
      child: Container(
        decoration: BoxDecoration(
          color: p.primary,
          borderRadius: BorderRadius.vertical(
            bottom: Radius.circular(context.shapes.r(28)),
          ),
        ),
        padding: EdgeInsets.fromLTRB(20, top + 20, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.l10n.welcomeBack,
                        style: TextStyle(
                          fontSize: 14,
                          color: p.onPrimary.withValues(alpha: 0.78),
                        ),
                      ),
                      title,
                    ],
                  ),
                ),
                const _NotificationsButton(onPrimary: true),
              ],
            ),
            const SizedBox(height: 18),
            // The light button on the brand color.
            FilledButton(
              onPressed: book,
              style: FilledButton.styleFrom(
                backgroundColor: p.surface,
                foregroundColor: p.text,
                minimumSize: const Size.fromHeight(54),
                shape: const StadiumBorder(),
                textStyle: Theme.of(context).textTheme.labelLarge
                    ?.copyWith(fontSize: 16),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppIcon(AppIcons.book, size: 20, color: p.text),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      context.words.bookAppointment,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationsButton extends ConsumerWidget {
  const _NotificationsButton({this.onPrimary = false, this.plain = false});

  final bool onPrimary;
  final bool plain;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!ref.watch(authControllerProvider).isSignedIn) {
      return const SizedBox.shrink();
    }
    final p = context.palette;
    final unread = ref.watch(unreadNotificationsProvider).value ?? 0;
    return SquareIconButton(
      icon: AppIcons.notifications,
      label: unread > 0
          ? context.l10n.notificationsUnread(unread)
          : context.l10n.notifications,
      badge: unread > 0,
      background: onPrimary
          ? p.primarySoft
          : plain
          ? Colors.transparent
          : null,
      foreground: onPrimary ? p.onPrimarySoft : null,
      bordered: !onPrimary && !plain,
      radius: onPrimary ? 22 : 12,
      onPressed: () => context.push(Paths.notifications),
    );
  }
}
