import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/lesson/content/html_content.dart';
import '../../lms/lesson/video/video_screen.dart';
import '../data/real_estate_providers.dart';
import '../widgets/listing_widgets.dart';
import '../../../core/services/share_links.dart';

/// A listing: photos, price, key facts, features, description, location,
/// the office's contacts, a message to the office and similar listings.
class ListingScreen extends ConsumerWidget {
  const ListingScreen({super.key, required this.listingId});

  final int listingId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listing = ref.watch(listingProvider(listingId));
    Future<void> refresh() => ref.refresh(listingProvider(listingId).future);
    return Scaffold(
      body: switch (listing) {
        AsyncData(:final value) => _ListingBody(
          listing: value,
          onRefresh: refresh,
        ),
        AsyncError(:final error) => SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsetsDirectional.fromSTEB(16, 8, 16, 0),
                child: AppBackButton(),
              ),
              Expanded(
                child: ErrorView(error: error, onRetry: refresh),
              ),
            ],
          ),
        ),
        _ => SkeletonDetail(label: context.l10n.loadingListing),
      },
    );
  }
}

class _ListingBody extends ConsumerWidget {
  const _ListingBody({required this.listing, required this.onRefresh});

  final ListingDetail listing;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final config = ref.watch(listingsConfigProvider);
    final messages = ref.watch(messagesEnabledProvider);
    final s = listing.summary;
    final unit = config?.areaUnit ?? AreaUnit.m2;
    final contact = config?.contact;

    final facts = <(IconData, String, String)>[
      if (s.area != null)
        (ListingIcons.area, areaText(context, s.area!, unit), l10n.factArea),
      if (s.bedrooms != null)
        (ListingIcons.bedrooms, '${s.bedrooms}', l10n.bedrooms),
      if (s.bathrooms != null)
        (ListingIcons.bathrooms, '${s.bathrooms}', l10n.bathrooms),
      if (listing.floor != null)
        (ListingIcons.floor, '${listing.floor}', l10n.factFloor),
      if (listing.yearBuilt != null)
        (ListingIcons.yearBuilt, '${listing.yearBuilt}', l10n.factYearBuilt),
      if (listing.furnished != null)
        (
          ListingIcons.furnished,
          listing.furnished! ? l10n.yes : l10n.no,
          l10n.factFurnished,
        ),
    ];

    Widget section(String title, Widget child) => Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SectionHeader(title: title),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );

    final location = listing.location;
    final address = location.address?.trim();
    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: onRefresh,
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                _Gallery(listing: listing),
                Padding(
                  padding: readablePadding(context, top: 18, bottom: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 10,
                        runSpacing: 6,
                        children: [
                          Text(
                            listingPriceText(l10n, s.price),
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              color: p.text,
                            ),
                          ),
                          if (s.price.negotiable)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: p.accentSoft,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                l10n.negotiable,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: p.link,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Semantics(
                        header: true,
                        child: Text(
                          s.title,
                          style: TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        [
                          purposeLabel(l10n, s.purpose),
                          s.typeLabel ?? s.type,
                          s.place,
                        ].join(' · '),
                        style: TextStyle(fontSize: 14, color: p.textSecondary),
                      ),
                      if (s.reference != null && s.reference!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          l10n.listingReference(s.reference!),
                          style: TextStyle(fontSize: 13, color: p.textTertiary),
                        ),
                      ],
                      if (facts.isNotEmpty)
                        section(l10n.keyFacts, _Facts(facts: facts)),
                      if (listing.features.isNotEmpty)
                        section(
                          l10n.features,
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              for (final f in listing.features)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 7,
                                  ),
                                  decoration: BoxDecoration(
                                    color: p.surfaceMuted,
                                    border: Border.all(color: p.border),
                                    borderRadius: BorderRadius.circular(
                                      context.shapes.chip,
                                    ),
                                  ),
                                  child: Text(
                                    f,
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: p.text,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      if (listing.descriptionHtml.trim().isNotEmpty)
                        section(
                          l10n.description,
                          HtmlContent(
                            html: listing.descriptionHtml,
                            title: s.title,
                          ),
                        ),
                      if (listing.videoUrl != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 16),
                          child: SecondaryButton(
                            label: l10n.watchVideo,
                            icon: AppIcons.playCircle,
                            // 51 In the app's own player: a video site's
                            // page would show where it's hosted.
                            onPressed: () => Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => VideoScreen(
                                  url: listing.videoUrl!,
                                  title: s.title,
                                ),
                              ),
                            ),
                          ),
                        ),
                      if ((address != null && address.isNotEmpty) ||
                          location.hasCoordinates)
                        section(
                          l10n.location,
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  AppIcon(
                                    AppIcons.location,
                                    size: 18,
                                    color: p.textSecondary,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      (address == null || address.isEmpty)
                                          ? s.place
                                          : address,
                                      style: TextStyle(
                                        fontSize: 14,
                                        height: 1.5,
                                        color: p.textBody,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              if (location.hasCoordinates)
                                TextButton.icon(
                                  onPressed: () => openExternal(
                                    mapsLink(
                                      location.latitude!,
                                      location.longitude!,
                                    ),
                                  ),
                                  style: TextButton.styleFrom(
                                    foregroundColor: p.link,
                                    minimumSize: const Size(44, 44),
                                  ),
                                  icon: AppIcon(
                                    ListingIcons.map,
                                    size: 18,
                                    color: p.link,
                                  ),
                                  label: Text(l10n.openInMaps),
                                ),
                            ],
                          ),
                        ),
                      if (contact != null)
                        section(l10n.contactOffice, _Contact(contact: contact)),
                      if (listing.similar.isNotEmpty)
                        section(
                          l10n.similarListings,
                          _Similar(listings: listing.similar),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        if (messages)
          BottomActionBar(
            child: PrimaryButton(
              label: l10n.messageOffice,
              icon: AppIcons.chat,
              onPressed: () => _message(context, ref),
            ),
          ),
      ],
    );
  }

  Future<void> _message(BuildContext context, WidgetRef ref) async {
    if (!ref.read(authControllerProvider).isSignedIn) {
      signInFor(context, Paths.listing(listing.id));
      return;
    }
    final inquiry = await showModalBottomSheet<Inquiry>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: context.palette.surface,
      builder: (context) => _MessageSheet(listing: listing),
    );
    if (inquiry != null && context.mounted) {
      ref.invalidate(inquiriesProvider);
      context.push(Paths.conversation(inquiry.id));
    }
  }
}

/// A map search for a point, opened in the maps app or the browser.
String mapsLink(double latitude, double longitude) =>
    'https://www.google.com/maps/search/?api=1&query=$latitude,$longitude';

class _Gallery extends StatefulWidget {
  const _Gallery({required this.listing});

  final ListingDetail listing;

  @override
  State<_Gallery> createState() => _GalleryState();
}

class _GalleryState extends State<_Gallery> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final listing = widget.listing;
    final images = listing.images.isNotEmpty
        ? listing.images
        : [
            if (listing.summary.imageUrl != null)
              ListingImage(url: listing.summary.imageUrl!),
          ];
    final top = MediaQuery.paddingOf(context).top;
    return AspectRatio(
      aspectRatio: MediaQuery.sizeOf(context).width >= 600 ? 16 / 9 : 4 / 3,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (images.isEmpty)
            AppNetworkImage(url: null, seed: listing.id)
          else
            Semantics(
              label: l10n.photoOf(_index + 1, images.length),
              child: PageView.builder(
                itemCount: images.length,
                onPageChanged: (i) => setState(() => _index = i),
                itemBuilder: (context, i) => AppNetworkImage(
                  url: images[i].url,
                  seed: listing.id + i,
                  semanticLabel: images[i].alt,
                ),
              ),
            ),
          const HeroScrim(),
          PositionedDirectional(
            top: top + 8,
            start: 16,
            child: const AppBackButton(),
          ),
          PositionedDirectional(
            top: top + 8,
            end: 16,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // 46 A link that opens the listing in the app.
                ShareLinkButton(
                  kind: 'listing',
                  id: listing.id,
                  title: listing.summary.title,
                  onImage: true,
                ),
                const SizedBox(width: 4),
                FavoriteButton(
                  listingId: listing.id,
                  favorited: listing.summary.favorited,
                  size: 44,
                ),
              ],
            ),
          ),
          if (images.length > 1)
            PositionedDirectional(
              bottom: 12,
              end: 16,
              child: ExcludeSemantics(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xA60E0D24),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_index + 1} / ${images.length}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Facts extends StatelessWidget {
  const _Facts({required this.facts});

  final List<(IconData, String, String)> facts;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return LayoutBuilder(
      builder: (context, box) {
        const spacing = 10.0;
        final columns = box.maxWidth >= 560 ? 3 : 2;
        final width = (box.maxWidth - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final (icon, value, label) in facts)
              SizedBox(
                width: width,
                child: Semantics(
                  label: '$label: $value',
                  excludeSemantics: true,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: p.surface,
                      border: Border.all(color: p.border),
                      borderRadius: BorderRadius.circular(context.shapes.r(12)),
                    ),
                    child: Row(
                      children: [
                        AppIcon(icon, size: 20, color: p.text),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                value,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: p.text,
                                ),
                              ),
                              Text(
                                label,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: p.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _Contact extends StatelessWidget {
  const _Contact({required this.contact});

  final OfficeContact contact;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final buttons = [
      if (contact.phone != null)
        SecondaryButton(
          label: l10n.call,
          icon: ListingIcons.call,
          height: 48,
          onPressed: () => openExternal('tel:${contact.phone}'),
        ),
      if (contact.whatsapp != null)
        SecondaryButton(
          label: l10n.whatsapp,
          icon: AppIcons.chat,
          height: 48,
          onPressed: () => openExternal(whatsappLink(contact.whatsapp!)),
        ),
      if (contact.email != null)
        SecondaryButton(
          label: l10n.email,
          icon: ListingIcons.email,
          height: 48,
          onPressed: () => openExternal('mailto:${contact.email}'),
        ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          contact.name,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: p.text,
          ),
        ),
        if (buttons.isNotEmpty) ...[
          const SizedBox(height: 10),
          LayoutBuilder(
            builder: (context, box) {
              // Side by side when they fit, else one per row.
              final perRow = box.maxWidth >= 120.0 * buttons.length
                  ? buttons.length
                  : 1;
              final width = (box.maxWidth - 8 * (perRow - 1)) / perRow;
              return Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final b in buttons) SizedBox(width: width, child: b),
                ],
              );
            },
          ),
        ],
      ],
    );
  }
}

class _Similar extends StatelessWidget {
  const _Similar({required this.listings});

  final List<ListingSummary> listings;

  @override
  Widget build(BuildContext context) {
    final height = 160 + MediaQuery.textScalerOf(context).scale(100);
    return SizedBox(
      height: height,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        itemCount: listings.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, i) => SizedBox(
          width: 250,
          child: Align(
            alignment: AlignmentDirectional.topStart,
            child: ListingCard(listing: listings[i], compact: true),
          ),
        ),
      ),
    );
  }
}

/// Writes the first message to the office about a listing. Pops with the
/// conversation.
class _MessageSheet extends ConsumerStatefulWidget {
  const _MessageSheet({required this.listing});

  final ListingDetail listing;

  @override
  ConsumerState<_MessageSheet> createState() => _MessageSheetState();
}

class _MessageSheetState extends ConsumerState<_MessageSheet> {
  late final _text = TextEditingController(
    text: context.l10n.inquiryTemplate(widget.listing.title),
  );
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _text.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final inquiry = await ref
          .read(yallappApiProvider)
          .sendInquiry(widget.listing.id, text);
      if (mounted) Navigator.of(context).pop(inquiry);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _sending = false;
          _error = e.message;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          0,
          20,
          16 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.messageOffice,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              widget.listing.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 14, color: p.textSecondary),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _text,
              minLines: 3,
              maxLines: 6,
              maxLength: 2000,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                hintText: l10n.writeMessage,
                errorText: _error,
              ),
            ),
            const SizedBox(height: 8),
            PrimaryButton(
              label: l10n.send,
              icon: ListingIcons.send,
              loading: _sending,
              onPressed: _send,
            ),
          ],
        ),
      ),
    );
  }
}
