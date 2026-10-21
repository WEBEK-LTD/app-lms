import 'json.dart';
import 'learning_models.dart';

/// How the iPhone app handles donations (`DonationsConfig.ios_mode`).
enum IosDonationMode {
  /// The button reads "Donate on our website" and opens the system browser.
  browser,

  /// No donate button on iPhone.
  off,
}

/// `Config.donations`: Charity & donations apps (roadmap 29).
class DonationsConfig {
  const DonationsConfig({
    this.currency = 'TRY',
    this.iosMode = IosDonationMode.browser,
    this.monthly = false,
    this.updatesPush = false,
  });

  factory DonationsConfig.fromJson(Json json) => DonationsConfig(
    currency: optString(json, 'currency') ?? 'TRY',
    iosMode: enumFrom(
      IosDonationMode.values,
      json['ios_mode'],
      IosDonationMode.browser,
    ),
    monthly: boolOr(json, 'monthly', false),
    updatesPush: boolOr(json, 'updates_push', false),
  );

  final String currency;
  final IosDonationMode iosMode;

  /// Whether monthly donations can be chosen.
  final bool monthly;

  /// Whether the charity pushes campaign updates: Settings offers the switch.
  final bool updatesPush;
}

enum CampaignStatus { open, closed }

/// A campaign in a list (`CampaignSummary`).
class CampaignSummary {
  const CampaignSummary({
    required this.id,
    required this.title,
    this.summary,
    this.imageUrl,
    this.goal,
    this.goalFormatted,
    this.raised = '0.00',
    this.raisedFormatted = '',
    this.donorCount = 0,
    this.currency = 'TRY',
    this.progress,
    this.endsAt,
    this.status = CampaignStatus.open,
    this.featured = false,
  });

  factory CampaignSummary.fromJson(Json json) => CampaignSummary(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    summary: optString(json, 'summary'),
    imageUrl: optString(json, 'image_url'),
    goal: optString(json, 'goal'),
    goalFormatted: optString(json, 'goal_formatted'),
    raised: optString(json, 'raised') ?? '0.00',
    raisedFormatted: optString(json, 'raised_formatted') ?? '',
    donorCount: intOr(json, 'donor_count', 0),
    currency: optString(json, 'currency') ?? 'TRY',
    progress: optDouble(json, 'progress'),
    endsAt: optDate(json, 'ends_at'),
    status: enumFrom(
      CampaignStatus.values,
      json['status'],
      CampaignStatus.open,
    ),
    featured: boolOr(json, 'featured', false),
  );

  final int id;
  final String title;
  final String? summary;
  final String? imageUrl;

  /// Decimal strings, as the API sends them; null without a goal.
  final String? goal;
  final String? goalFormatted;
  final String raised;
  final String raisedFormatted;
  final int donorCount;
  final String currency;

  /// raised / goal (1 = reached); null without a goal.
  final double? progress;
  final DateTime? endsAt;
  final CampaignStatus status;
  final bool featured;

  bool get isOpen => status == CampaignStatus.open;
}

/// A donation on a campaign's page; [name] is null for anonymous donors.
class RecentDonation {
  const RecentDonation({
    this.name,
    required this.amountFormatted,
    this.message,
    required this.createdAt,
  });

  factory RecentDonation.fromJson(Json json) => RecentDonation(
    name: optString(json, 'name'),
    amountFormatted: reqString(json, 'amount_formatted'),
    message: optString(json, 'message'),
    createdAt: reqDate(json, 'created_at'),
  );

  final String? name;
  final String amountFormatted;
  final String? message;
  final DateTime createdAt;
}

/// A campaign with its story (processed like an article) and how to give.
class Campaign extends CampaignSummary {
  const Campaign({
    required super.id,
    required super.title,
    super.summary,
    super.imageUrl,
    super.goal,
    super.goalFormatted,
    super.raised,
    super.raisedFormatted,
    super.donorCount,
    super.currency,
    super.progress,
    super.endsAt,
    super.status,
    super.featured,
    this.images = const [],
    this.renderMode = RenderMode.native,
    this.html,
    this.webviewUrl,
    this.embeds = const [],
    this.presetAmounts = const [],
    this.allowCustomAmount = true,
    this.minAmount = '1.00',
    this.recentDonations = const [],
  });

  factory Campaign.fromJson(Json json) {
    final s = CampaignSummary.fromJson(json);
    return Campaign(
      id: s.id,
      title: s.title,
      summary: s.summary,
      imageUrl: s.imageUrl,
      goal: s.goal,
      goalFormatted: s.goalFormatted,
      raised: s.raised,
      raisedFormatted: s.raisedFormatted,
      donorCount: s.donorCount,
      currency: s.currency,
      progress: s.progress,
      endsAt: s.endsAt,
      status: s.status,
      featured: s.featured,
      images: [
        for (final i in listOf(json, 'images', (j) => j))
          if (optString(i, 'url') case final String url) url,
      ],
      renderMode: enumFrom(
        RenderMode.values,
        json['render_mode'],
        RenderMode.native,
      ),
      html: optString(json, 'html'),
      webviewUrl: optString(json, 'webview_url'),
      embeds: listOf(json, 'embeds', Embed.fromJson),
      presetAmounts: stringList(json, 'preset_amounts'),
      allowCustomAmount: boolOr(json, 'allow_custom_amount', true),
      minAmount: optString(json, 'min_amount') ?? '1.00',
      recentDonations: listOf(
        json,
        'recent_donations',
        RecentDonation.fromJson,
      ),
    );
  }

  final List<String> images;
  final RenderMode renderMode;
  final String? html;
  final String? webviewUrl;
  final List<Embed> embeds;

  /// Decimal strings, smallest first.
  final List<String> presetAmounts;
  final bool allowCustomAmount;
  final String minAmount;
  final List<RecentDonation> recentDonations;
}

/// A confirmed donation in the user's history (`Donation`).
class Donation {
  const Donation({
    required this.id,
    required this.reference,
    this.campaignId,
    required this.campaignTitle,
    required this.amount,
    required this.amountFormatted,
    this.monthly = false,
    this.anonymous = false,
    required this.createdAt,
    required this.receiptUrl,
    this.refundedTotal,
    this.receiptPdfUrl,
  });

  factory Donation.fromJson(Json json) => Donation(
    id: reqInt(json, 'id'),
    reference: reqString(json, 'reference'),
    campaignId: optInt(json, 'campaign_id'),
    campaignTitle: reqString(json, 'campaign_title'),
    amount: reqString(json, 'amount'),
    amountFormatted: reqString(json, 'amount_formatted'),
    monthly: json['recurring'] == 'monthly',
    anonymous: boolOr(json, 'anonymous', false),
    createdAt: reqDate(json, 'created_at'),
    receiptUrl: reqString(json, 'receipt_url'),
    refundedTotal: optString(json, 'refunded_total'),
    receiptPdfUrl: optString(json, 'receipt_pdf_url'),
  );

  final int id;
  final String reference;
  final int? campaignId;
  final String campaignTitle;
  final String amount;
  final String amountFormatted;
  final bool monthly;
  final bool anonymous;
  final DateTime createdAt;
  final String receiptUrl;

  /// 47 What the charity refunded of it, formatted; null for nothing.
  final String? refundedTotal;

  /// 71 The same receipt as a PDF, to download; null on older servers.
  final String? receiptPdfUrl;
}

/// `POST /donations/checkout-link`.
class DonationRequest {
  const DonationRequest({
    required this.campaignId,
    required this.amount,
    this.monthly = false,
    this.anonymous = false,
    this.message,
  });

  final int campaignId;

  /// A decimal string, like "250.00".
  final String amount;
  final bool monthly;
  final bool anonymous;
  final String? message;

  Json toJson() => {
    'campaign_id': campaignId,
    'amount': amount,
    'recurring': monthly ? 'monthly' : 'none',
    'anonymous': anonymous,
    if (message != null && message!.trim().isNotEmpty)
      'message': message!.trim(),
  };
}

/// An amount typed in the app ("250", "250,5", "1.250,00") as a decimal
/// string ("250.00"), or null when it isn't one.
String? parseAmount(String text) {
  var t = text.trim().replaceAll(RegExp(r'[\s₺$€]'), '');
  if (!RegExp(r'^\d[\d.,]*$').hasMatch(t)) return null;
  final decimalAt = [
    t.lastIndexOf(','),
    t.lastIndexOf('.'),
  ].reduce((a, b) => a > b ? a : b);
  if (decimalAt >= 0 && t.length - decimalAt - 1 <= 2) {
    t =
        '${t.substring(0, decimalAt).replaceAll(RegExp('[.,]'), '')}.'
        '${t.substring(decimalAt + 1)}';
  } else {
    t = t.replaceAll(RegExp('[.,]'), '');
  }
  final value = double.tryParse(t);
  if (value == null || value <= 0 || value >= 1e9) return null;
  return value.toStringAsFixed(2);
}
