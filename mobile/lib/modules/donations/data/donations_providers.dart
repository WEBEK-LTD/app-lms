import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/api/models/models.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';

/// How donations work (`Config.donations`); the defaults on older servers.
final donationsConfigProvider = Provider<DonationsConfig>(
  (ref) => ref.watch(appConfigProvider).donations ?? const DonationsConfig(),
);

/// Campaigns, open ones first, page by page.
class CampaignsController extends PagedController<CampaignSummary> {
  @override
  Future<Paged<CampaignSummary>> fetch(int page) =>
      ref.read(yallappApiProvider).listCampaigns(page: page);
}

final campaignsProvider =
    NotifierProvider.autoDispose<
      CampaignsController,
      PagedState<CampaignSummary>
    >(CampaignsController.new);

final campaignProvider = FutureProvider.autoDispose.family<Campaign, int>(
  (ref, id) => ref.contentApi.getCampaign(id),
);

/// The signed-in user's confirmed donations, newest first.
class MyDonationsController extends PagedController<Donation> {
  @override
  Future<Paged<Donation>> fetch(int page) =>
      ref.read(yallappApiProvider).listMyDonations(page: page);
}

final myDonationsProvider =
    NotifierProvider.autoDispose<MyDonationsController, PagedState<Donation>>(
      MyDonationsController.new,
    );

const _symbols = {'TRY': '₺', 'USD': r'$', 'EUR': '€'};

/// "₺1,200" or "₺75.50": an amount the API sent as a decimal string.
String formatAmount(String amount, String currency) {
  final value = double.tryParse(amount) ?? 0;
  final whole = value == value.roundToDouble();
  final number = NumberFormat(whole ? '#,##0' : '#,##0.00', 'en_US');
  return '${_symbols[currency] ?? '$currency '}${number.format(value)}';
}

/// Where the Android app's in-app donation page ends: our thank-you page.
bool isDonationDone(Uri url) => url.pathSegments.contains('thank-you');
