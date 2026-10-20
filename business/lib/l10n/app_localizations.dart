import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';
import 'app_localizations_tr.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
    Locale('tr'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Yallapp Business'**
  String get appTitle;

  /// No description provided for @signInTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signInTitle;

  /// No description provided for @signInText.
  ///
  /// In en, this message translates to:
  /// **'Use the email and password of your Yallapp dashboard.'**
  String get signInText;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @emailInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter your email address.'**
  String get emailInvalid;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @passwordEmpty.
  ///
  /// In en, this message translates to:
  /// **'Enter your password.'**
  String get passwordEmpty;

  /// No description provided for @showPassword.
  ///
  /// In en, this message translates to:
  /// **'Show password'**
  String get showPassword;

  /// No description provided for @hidePassword.
  ///
  /// In en, this message translates to:
  /// **'Hide password'**
  String get hidePassword;

  /// No description provided for @forgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get forgotPassword;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signIn;

  /// No description provided for @signingIn.
  ///
  /// In en, this message translates to:
  /// **'Signing in'**
  String get signingIn;

  /// No description provided for @invalidCredentials.
  ///
  /// In en, this message translates to:
  /// **'The email or password is incorrect.'**
  String get invalidCredentials;

  /// No description provided for @useWebsiteButton.
  ///
  /// In en, this message translates to:
  /// **'Open yallapp.com.tr'**
  String get useWebsiteButton;

  /// No description provided for @signedOutNotice.
  ///
  /// In en, this message translates to:
  /// **'You were signed out. Sign in again to carry on.'**
  String get signedOutNotice;

  /// No description provided for @newToYallapp.
  ///
  /// In en, this message translates to:
  /// **'New to Yallapp? Create your app on the website.'**
  String get newToYallapp;

  /// No description provided for @openWebsite.
  ///
  /// In en, this message translates to:
  /// **'Go to yallapp.com.tr'**
  String get openWebsite;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @lockTitle.
  ///
  /// In en, this message translates to:
  /// **'Yallapp Business is locked'**
  String get lockTitle;

  /// No description provided for @lockText.
  ///
  /// In en, this message translates to:
  /// **'Unlock with your fingerprint, face or phone lock.'**
  String get lockText;

  /// No description provided for @lockFailed.
  ///
  /// In en, this message translates to:
  /// **'That didn\'t work. Try again, or sign out and use your password.'**
  String get lockFailed;

  /// No description provided for @unlock.
  ///
  /// In en, this message translates to:
  /// **'Unlock'**
  String get unlock;

  /// No description provided for @unlockReason.
  ///
  /// In en, this message translates to:
  /// **'Unlock Yallapp Business'**
  String get unlockReason;

  /// No description provided for @signOutUsePassword.
  ///
  /// In en, this message translates to:
  /// **'Sign out and use my password'**
  String get signOutUsePassword;

  /// No description provided for @accountPendingTitle.
  ///
  /// In en, this message translates to:
  /// **'Your account is waiting for activation'**
  String get accountPendingTitle;

  /// No description provided for @accountPendingText.
  ///
  /// In en, this message translates to:
  /// **'We\'ll let you know as soon as it\'s active. You can follow it on yallapp.com.tr.'**
  String get accountPendingText;

  /// No description provided for @accountSuspendedTitle.
  ///
  /// In en, this message translates to:
  /// **'Your account is suspended'**
  String get accountSuspendedTitle;

  /// No description provided for @accountSuspendedText.
  ///
  /// In en, this message translates to:
  /// **'Talk to us to find out why and how to bring it back.'**
  String get accountSuspendedText;

  /// No description provided for @noAppTitle.
  ///
  /// In en, this message translates to:
  /// **'No app yet'**
  String get noAppTitle;

  /// No description provided for @noAppText.
  ///
  /// In en, this message translates to:
  /// **'Create your first app on yallapp.com.tr. It shows up here as soon as it\'s there.'**
  String get noAppText;

  /// No description provided for @openDashboard.
  ///
  /// In en, this message translates to:
  /// **'Open the dashboard'**
  String get openDashboard;

  /// No description provided for @chooseApp.
  ///
  /// In en, this message translates to:
  /// **'Choose an app'**
  String get chooseApp;

  /// No description provided for @yourApps.
  ///
  /// In en, this message translates to:
  /// **'Your apps'**
  String get yourApps;

  /// No description provided for @currentApp.
  ///
  /// In en, this message translates to:
  /// **'Current app'**
  String get currentApp;

  /// No description provided for @switchApp.
  ///
  /// In en, this message translates to:
  /// **'Switch'**
  String get switchApp;

  /// No description provided for @stateActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get stateActive;

  /// No description provided for @statePending.
  ///
  /// In en, this message translates to:
  /// **'Pending activation'**
  String get statePending;

  /// No description provided for @stateExpired.
  ///
  /// In en, this message translates to:
  /// **'Plan ended'**
  String get stateExpired;

  /// No description provided for @stateSuspended.
  ///
  /// In en, this message translates to:
  /// **'Suspended'**
  String get stateSuspended;

  /// No description provided for @today.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get today;

  /// No description provided for @orders.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get orders;

  /// No description provided for @order.
  ///
  /// In en, this message translates to:
  /// **'Order'**
  String get order;

  /// No description provided for @appointments.
  ///
  /// In en, this message translates to:
  /// **'Appointments'**
  String get appointments;

  /// No description provided for @events.
  ///
  /// In en, this message translates to:
  /// **'Events'**
  String get events;

  /// No description provided for @donations.
  ///
  /// In en, this message translates to:
  /// **'Donations'**
  String get donations;

  /// No description provided for @catalog.
  ///
  /// In en, this message translates to:
  /// **'Catalog'**
  String get catalog;

  /// No description provided for @menu.
  ///
  /// In en, this message translates to:
  /// **'Menu'**
  String get menu;

  /// No description provided for @products.
  ///
  /// In en, this message translates to:
  /// **'Products'**
  String get products;

  /// No description provided for @courses.
  ///
  /// In en, this message translates to:
  /// **'Courses'**
  String get courses;

  /// No description provided for @articles.
  ///
  /// In en, this message translates to:
  /// **'Articles'**
  String get articles;

  /// No description provided for @listings.
  ///
  /// In en, this message translates to:
  /// **'Listings'**
  String get listings;

  /// No description provided for @inbox.
  ///
  /// In en, this message translates to:
  /// **'Inbox'**
  String get inbox;

  /// No description provided for @stats.
  ///
  /// In en, this message translates to:
  /// **'Stats'**
  String get stats;

  /// No description provided for @more.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get more;

  /// No description provided for @media.
  ///
  /// In en, this message translates to:
  /// **'Media'**
  String get media;

  /// No description provided for @appUsers.
  ///
  /// In en, this message translates to:
  /// **'App users'**
  String get appUsers;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading'**
  String get loading;

  /// No description provided for @tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get tryAgain;

  /// No description provided for @offlineTitle.
  ///
  /// In en, this message translates to:
  /// **'You\'re offline'**
  String get offlineTitle;

  /// No description provided for @errorTitle.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get errorTitle;

  /// No description provided for @errorOffline.
  ///
  /// In en, this message translates to:
  /// **'Check your connection and try again.'**
  String get errorOffline;

  /// No description provided for @errorTimeout.
  ///
  /// In en, this message translates to:
  /// **'Yallapp is taking too long to answer. Try again in a moment.'**
  String get errorTimeout;

  /// No description provided for @errorNotAvailable.
  ///
  /// In en, this message translates to:
  /// **'This app doesn\'t have this.'**
  String get errorNotAvailable;

  /// No description provided for @errorNotFound.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t find this. It may have been deleted.'**
  String get errorNotFound;

  /// No description provided for @errorRateLimited.
  ///
  /// In en, this message translates to:
  /// **'That\'s a lot at once. Wait a little and try again.'**
  String get errorRateLimited;

  /// No description provided for @errorAccount.
  ///
  /// In en, this message translates to:
  /// **'Your account isn\'t active right now.'**
  String get errorAccount;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Try again.'**
  String get errorGeneric;

  /// No description provided for @loadMore.
  ///
  /// In en, this message translates to:
  /// **'Load more'**
  String get loadMore;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @saved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get saved;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @refresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get refresh;

  /// No description provided for @open.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get open;

  /// No description provided for @send.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get send;

  /// No description provided for @moreActions.
  ///
  /// In en, this message translates to:
  /// **'More actions'**
  String get moreActions;

  /// No description provided for @linkFailed.
  ///
  /// In en, this message translates to:
  /// **'This link couldn\'t be opened.'**
  String get linkFailed;

  /// No description provided for @justNow.
  ///
  /// In en, this message translates to:
  /// **'just now'**
  String get justNow;

  /// No description provided for @now.
  ///
  /// In en, this message translates to:
  /// **'now'**
  String get now;

  /// No description provided for @needsYouNow.
  ///
  /// In en, this message translates to:
  /// **'Needs you now'**
  String get needsYouNow;

  /// No description provided for @allCaughtUp.
  ///
  /// In en, this message translates to:
  /// **'All caught up. Nothing is waiting for you.'**
  String get allCaughtUp;

  /// No description provided for @quickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get quickActions;

  /// No description provided for @actionNotify.
  ///
  /// In en, this message translates to:
  /// **'Notify'**
  String get actionNotify;

  /// No description provided for @actionScan.
  ///
  /// In en, this message translates to:
  /// **'Scan'**
  String get actionScan;

  /// No description provided for @actionUpload.
  ///
  /// In en, this message translates to:
  /// **'Upload'**
  String get actionUpload;

  /// No description provided for @actionPreview.
  ///
  /// In en, this message translates to:
  /// **'Preview'**
  String get actionPreview;

  /// No description provided for @salesToday.
  ///
  /// In en, this message translates to:
  /// **'Sales today'**
  String get salesToday;

  /// No description provided for @ordersToday.
  ///
  /// In en, this message translates to:
  /// **'Orders today'**
  String get ordersToday;

  /// No description provided for @appointmentsToday.
  ///
  /// In en, this message translates to:
  /// **'Appointments today'**
  String get appointmentsToday;

  /// No description provided for @ticketsToday.
  ///
  /// In en, this message translates to:
  /// **'Tickets sold today'**
  String get ticketsToday;

  /// No description provided for @checkInsToday.
  ///
  /// In en, this message translates to:
  /// **'Checked in today'**
  String get checkInsToday;

  /// No description provided for @donationsToday.
  ///
  /// In en, this message translates to:
  /// **'Donations today'**
  String get donationsToday;

  /// No description provided for @newUsers.
  ///
  /// In en, this message translates to:
  /// **'New users'**
  String get newUsers;

  /// No description provided for @appOpens.
  ///
  /// In en, this message translates to:
  /// **'App opens'**
  String get appOpens;

  /// No description provided for @bell.
  ///
  /// In en, this message translates to:
  /// **'Updates from Yallapp'**
  String get bell;

  /// No description provided for @planEndedTitle.
  ///
  /// In en, this message translates to:
  /// **'This app\'s plan has ended'**
  String get planEndedTitle;

  /// No description provided for @planEndedText.
  ///
  /// In en, this message translates to:
  /// **'The app is paused until the plan is renewed on yallapp.com.tr. You can still see and edit everything here.'**
  String get planEndedText;

  /// No description provided for @seePlan.
  ///
  /// In en, this message translates to:
  /// **'See the plan'**
  String get seePlan;

  /// No description provided for @updatesTitle.
  ///
  /// In en, this message translates to:
  /// **'Updates from Yallapp'**
  String get updatesTitle;

  /// No description provided for @markAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all as read'**
  String get markAllRead;

  /// No description provided for @noUpdates.
  ///
  /// In en, this message translates to:
  /// **'Nothing from Yallapp yet'**
  String get noUpdates;

  /// No description provided for @noUpdatesText.
  ///
  /// In en, this message translates to:
  /// **'Updates, announcements, maintenance notices and offers from our team show up here, with news about your account.'**
  String get noUpdatesText;

  /// No description provided for @kindUpdate.
  ///
  /// In en, this message translates to:
  /// **'Update'**
  String get kindUpdate;

  /// No description provided for @kindAnnouncement.
  ///
  /// In en, this message translates to:
  /// **'Announcement'**
  String get kindAnnouncement;

  /// No description provided for @kindMaintenance.
  ///
  /// In en, this message translates to:
  /// **'Maintenance'**
  String get kindMaintenance;

  /// No description provided for @kindOffer.
  ///
  /// In en, this message translates to:
  /// **'Offer'**
  String get kindOffer;

  /// No description provided for @kindAccount.
  ///
  /// In en, this message translates to:
  /// **'Your account'**
  String get kindAccount;

  /// No description provided for @newLabel.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get newLabel;

  /// No description provided for @ended.
  ///
  /// In en, this message translates to:
  /// **'Ended'**
  String get ended;

  /// No description provided for @learnMore.
  ///
  /// In en, this message translates to:
  /// **'Learn more'**
  String get learnMore;

  /// No description provided for @kitchenMode.
  ///
  /// In en, this message translates to:
  /// **'Kitchen mode'**
  String get kitchenMode;

  /// No description provided for @kitchenEmpty.
  ///
  /// In en, this message translates to:
  /// **'No orders in the kitchen'**
  String get kitchenEmpty;

  /// No description provided for @kitchenEmptyText.
  ///
  /// In en, this message translates to:
  /// **'New orders appear here with a sound while this screen is open.'**
  String get kitchenEmptyText;

  /// No description provided for @soundOn.
  ///
  /// In en, this message translates to:
  /// **'Sound on for new orders'**
  String get soundOn;

  /// No description provided for @soundOff.
  ///
  /// In en, this message translates to:
  /// **'Sound off for new orders'**
  String get soundOff;

  /// No description provided for @tabInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get tabInProgress;

  /// No description provided for @statusProcessing.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get statusProcessing;

  /// No description provided for @statusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get statusCompleted;

  /// No description provided for @statusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get statusCancelled;

  /// No description provided for @statusRefunded.
  ///
  /// In en, this message translates to:
  /// **'Refunded'**
  String get statusRefunded;

  /// No description provided for @stepNew.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get stepNew;

  /// No description provided for @stepPreparing.
  ///
  /// In en, this message translates to:
  /// **'Preparing'**
  String get stepPreparing;

  /// No description provided for @stepReady.
  ///
  /// In en, this message translates to:
  /// **'Ready'**
  String get stepReady;

  /// No description provided for @outForDelivery.
  ///
  /// In en, this message translates to:
  /// **'Out for delivery'**
  String get outForDelivery;

  /// No description provided for @accept.
  ///
  /// In en, this message translates to:
  /// **'Accept'**
  String get accept;

  /// No description provided for @decline.
  ///
  /// In en, this message translates to:
  /// **'Decline'**
  String get decline;

  /// No description provided for @startPreparing.
  ///
  /// In en, this message translates to:
  /// **'Start preparing'**
  String get startPreparing;

  /// No description provided for @markReady.
  ///
  /// In en, this message translates to:
  /// **'Ready'**
  String get markReady;

  /// No description provided for @markCompleted.
  ///
  /// In en, this message translates to:
  /// **'Mark completed'**
  String get markCompleted;

  /// No description provided for @pickedUp.
  ///
  /// In en, this message translates to:
  /// **'Picked up'**
  String get pickedUp;

  /// No description provided for @delivered.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get delivered;

  /// No description provided for @cancelOrder.
  ///
  /// In en, this message translates to:
  /// **'Cancel order'**
  String get cancelOrder;

  /// No description provided for @cancelOrderTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel order {number}?'**
  String cancelOrderTitle(String number);

  /// No description provided for @cancelOrderText.
  ///
  /// In en, this message translates to:
  /// **'The customer is told. A payment taken for it is refunded separately.'**
  String get cancelOrderText;

  /// No description provided for @orderUpdated.
  ///
  /// In en, this message translates to:
  /// **'Order {number}: {status}'**
  String orderUpdated(String number, String status);

  /// No description provided for @noOrdersInProgress.
  ///
  /// In en, this message translates to:
  /// **'No orders in progress'**
  String get noOrdersInProgress;

  /// No description provided for @noOrders.
  ///
  /// In en, this message translates to:
  /// **'No orders here yet'**
  String get noOrders;

  /// No description provided for @delivery.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get delivery;

  /// No description provided for @pickup.
  ///
  /// In en, this message translates to:
  /// **'Pickup'**
  String get pickup;

  /// No description provided for @paidAt.
  ///
  /// In en, this message translates to:
  /// **'Paid {date}'**
  String paidAt(String date);

  /// No description provided for @customer.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get customer;

  /// No description provided for @items.
  ///
  /// In en, this message translates to:
  /// **'Items'**
  String get items;

  /// No description provided for @total.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get total;

  /// No description provided for @refunded.
  ///
  /// In en, this message translates to:
  /// **'Refunded'**
  String get refunded;

  /// No description provided for @refunds.
  ///
  /// In en, this message translates to:
  /// **'Refunds'**
  String get refunds;

  /// No description provided for @refund.
  ///
  /// In en, this message translates to:
  /// **'Refund'**
  String get refund;

  /// No description provided for @refundLeft.
  ///
  /// In en, this message translates to:
  /// **'Up to {amount} can be refunded.'**
  String refundLeft(String amount);

  /// No description provided for @refundButton.
  ///
  /// In en, this message translates to:
  /// **'Refund'**
  String get refundButton;

  /// No description provided for @refundRecord.
  ///
  /// In en, this message translates to:
  /// **'Record the refund'**
  String get refundRecord;

  /// No description provided for @refundTitle.
  ///
  /// In en, this message translates to:
  /// **'Refund order {number}'**
  String refundTitle(String number);

  /// No description provided for @refundAmount.
  ///
  /// In en, this message translates to:
  /// **'Amount ({currency})'**
  String refundAmount(String currency);

  /// No description provided for @refundReason.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get refundReason;

  /// No description provided for @refundNote.
  ///
  /// In en, this message translates to:
  /// **'Note (optional)'**
  String get refundNote;

  /// No description provided for @refundHow.
  ///
  /// In en, this message translates to:
  /// **'How'**
  String get refundHow;

  /// No description provided for @refundByProvider.
  ///
  /// In en, this message translates to:
  /// **'Through the payment provider'**
  String get refundByProvider;

  /// No description provided for @refundManual.
  ///
  /// In en, this message translates to:
  /// **'Already refunded in its panel'**
  String get refundManual;

  /// No description provided for @refundReference.
  ///
  /// In en, this message translates to:
  /// **'The provider\'s reference'**
  String get refundReference;

  /// No description provided for @refundTakeBack.
  ///
  /// In en, this message translates to:
  /// **'Also take back'**
  String get refundTakeBack;

  /// No description provided for @notRefundable.
  ///
  /// In en, this message translates to:
  /// **'This order can\'t be refunded here.'**
  String get notRefundable;

  /// No description provided for @scopeToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get scopeToday;

  /// No description provided for @scopeUpcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get scopeUpcoming;

  /// No description provided for @scopePast.
  ///
  /// In en, this message translates to:
  /// **'Past'**
  String get scopePast;

  /// No description provided for @noAppointmentsToday.
  ///
  /// In en, this message translates to:
  /// **'No appointments today'**
  String get noAppointmentsToday;

  /// No description provided for @noUpcomingAppointments.
  ///
  /// In en, this message translates to:
  /// **'No upcoming appointments'**
  String get noUpcomingAppointments;

  /// No description provided for @noPastAppointments.
  ///
  /// In en, this message translates to:
  /// **'No past appointments'**
  String get noPastAppointments;

  /// No description provided for @apptPending.
  ///
  /// In en, this message translates to:
  /// **'To confirm'**
  String get apptPending;

  /// No description provided for @apptApproved.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get apptApproved;

  /// No description provided for @apptRejected.
  ///
  /// In en, this message translates to:
  /// **'Declined'**
  String get apptRejected;

  /// No description provided for @apptNoShow.
  ///
  /// In en, this message translates to:
  /// **'No-show'**
  String get apptNoShow;

  /// No description provided for @confirmAction.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get confirmAction;

  /// No description provided for @cancelAppointment.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancelAppointment;

  /// No description provided for @markDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get markDone;

  /// No description provided for @declineAppointmentTitle.
  ///
  /// In en, this message translates to:
  /// **'Decline this appointment?'**
  String get declineAppointmentTitle;

  /// No description provided for @cancelAppointmentTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel this appointment?'**
  String get cancelAppointmentTitle;

  /// No description provided for @appointmentChangeText.
  ///
  /// In en, this message translates to:
  /// **'{name}\'s appointment changes, and this can\'t be undone.'**
  String appointmentChangeText(String name);

  /// No description provided for @appointmentUpdated.
  ///
  /// In en, this message translates to:
  /// **'Appointment: {status}'**
  String appointmentUpdated(String status);

  /// No description provided for @notes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get notes;

  /// No description provided for @rescheduleNote.
  ///
  /// In en, this message translates to:
  /// **'To move an appointment to another time, cancel it and ask the customer to book again. The dashboard works the same way.'**
  String get rescheduleNote;

  /// No description provided for @eventsOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get eventsOpen;

  /// No description provided for @eventsAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get eventsAll;

  /// No description provided for @noEvents.
  ///
  /// In en, this message translates to:
  /// **'No events here'**
  String get noEvents;

  /// No description provided for @scanTickets.
  ///
  /// In en, this message translates to:
  /// **'Scan tickets'**
  String get scanTickets;

  /// No description provided for @scanForEvent.
  ///
  /// In en, this message translates to:
  /// **'Scan for this event'**
  String get scanForEvent;

  /// No description provided for @ticketCounts.
  ///
  /// In en, this message translates to:
  /// **'{used} in · {left} to come · capacity {capacity}'**
  String ticketCounts(String used, String left, String capacity);

  /// No description provided for @ticketsInLabel.
  ///
  /// In en, this message translates to:
  /// **'{used} of {issued} tickets checked in'**
  String ticketsInLabel(int used, int issued);

  /// No description provided for @statusDraft.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get statusDraft;

  /// No description provided for @flashOn.
  ///
  /// In en, this message translates to:
  /// **'Turn the flashlight on'**
  String get flashOn;

  /// No description provided for @flashOff.
  ///
  /// In en, this message translates to:
  /// **'Turn the flashlight off'**
  String get flashOff;

  /// No description provided for @cameraLabel.
  ///
  /// In en, this message translates to:
  /// **'Camera, point it at the ticket\'s QR code'**
  String get cameraLabel;

  /// No description provided for @cameraDenied.
  ///
  /// In en, this message translates to:
  /// **'The camera isn\'t available. Allow Yallapp Business to use it in the phone\'s settings, or type the code.'**
  String get cameraDenied;

  /// No description provided for @scanHint.
  ///
  /// In en, this message translates to:
  /// **'Hold the ticket\'s QR code inside the frame.'**
  String get scanHint;

  /// No description provided for @typeCode.
  ///
  /// In en, this message translates to:
  /// **'Type the code'**
  String get typeCode;

  /// No description provided for @typeCodeTitle.
  ///
  /// In en, this message translates to:
  /// **'Check a ticket by its code'**
  String get typeCodeTitle;

  /// No description provided for @ticketCode.
  ///
  /// In en, this message translates to:
  /// **'Ticket code'**
  String get ticketCode;

  /// No description provided for @checkTicket.
  ///
  /// In en, this message translates to:
  /// **'Check'**
  String get checkTicket;

  /// No description provided for @letIn.
  ///
  /// In en, this message translates to:
  /// **'Let in'**
  String get letIn;

  /// No description provided for @alreadyUsed.
  ///
  /// In en, this message translates to:
  /// **'Already used'**
  String get alreadyUsed;

  /// No description provided for @otherEvent.
  ///
  /// In en, this message translates to:
  /// **'Ticket for another event'**
  String get otherEvent;

  /// No description provided for @ticketCancelled.
  ///
  /// In en, this message translates to:
  /// **'Ticket cancelled'**
  String get ticketCancelled;

  /// No description provided for @ticketNotPaid.
  ///
  /// In en, this message translates to:
  /// **'Ticket not paid'**
  String get ticketNotPaid;

  /// No description provided for @notATicket.
  ///
  /// In en, this message translates to:
  /// **'Not a ticket of this app'**
  String get notATicket;

  /// No description provided for @ticketNotFound.
  ///
  /// In en, this message translates to:
  /// **'Ticket not found'**
  String get ticketNotFound;

  /// No description provided for @usedAt.
  ///
  /// In en, this message translates to:
  /// **'Used {date}'**
  String usedAt(String date);

  /// No description provided for @letInHere.
  ///
  /// In en, this message translates to:
  /// **'Let in on this phone'**
  String get letInHere;

  /// No description provided for @refusedHere.
  ///
  /// In en, this message translates to:
  /// **'Refused'**
  String get refusedHere;

  /// No description provided for @inOfIssued.
  ///
  /// In en, this message translates to:
  /// **'In / tickets'**
  String get inOfIssued;

  /// No description provided for @noDonations.
  ///
  /// In en, this message translates to:
  /// **'No donations yet'**
  String get noDonations;

  /// No description provided for @allCampaigns.
  ///
  /// In en, this message translates to:
  /// **'All campaigns'**
  String get allCampaigns;

  /// No description provided for @anonymous.
  ///
  /// In en, this message translates to:
  /// **'Anonymous'**
  String get anonymous;

  /// No description provided for @ofGoal.
  ///
  /// In en, this message translates to:
  /// **'of {goal}'**
  String ofGoal(String goal);

  /// No description provided for @noProducts.
  ///
  /// In en, this message translates to:
  /// **'No products yet'**
  String get noProducts;

  /// No description provided for @stockUnlimited.
  ///
  /// In en, this message translates to:
  /// **'No stock limit'**
  String get stockUnlimited;

  /// No description provided for @soldOut.
  ///
  /// In en, this message translates to:
  /// **'Sold out'**
  String get soldOut;

  /// No description provided for @hidden.
  ///
  /// In en, this message translates to:
  /// **'Hidden'**
  String get hidden;

  /// No description provided for @priceIn.
  ///
  /// In en, this message translates to:
  /// **'Price ({currency})'**
  String priceIn(String currency);

  /// No description provided for @salePriceIn.
  ///
  /// In en, this message translates to:
  /// **'Sale price ({currency})'**
  String salePriceIn(String currency);

  /// No description provided for @salePriceHelp.
  ///
  /// In en, this message translates to:
  /// **'Lower than the price. Leave it empty for no sale.'**
  String get salePriceHelp;

  /// No description provided for @stock.
  ///
  /// In en, this message translates to:
  /// **'Stock'**
  String get stock;

  /// No description provided for @stockHelp.
  ///
  /// In en, this message translates to:
  /// **'A whole number from 0 to 1,000,000. Leave it empty for no limit.'**
  String get stockHelp;

  /// No description provided for @stockInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a whole number.'**
  String get stockInvalid;

  /// No description provided for @availableNotSoldOut.
  ///
  /// In en, this message translates to:
  /// **'Available to order (off: sold out)'**
  String get availableNotSoldOut;

  /// No description provided for @showInApp.
  ///
  /// In en, this message translates to:
  /// **'Shown in the app'**
  String get showInApp;

  /// No description provided for @availableToOrder.
  ///
  /// In en, this message translates to:
  /// **'{name} can be ordered'**
  String availableToOrder(String name);

  /// No description provided for @shownInApp.
  ///
  /// In en, this message translates to:
  /// **'{name} is shown in the app'**
  String shownInApp(String name);

  /// No description provided for @noCourses.
  ///
  /// In en, this message translates to:
  /// **'No courses yet'**
  String get noCourses;

  /// No description provided for @free.
  ///
  /// In en, this message translates to:
  /// **'Free'**
  String get free;

  /// No description provided for @publishedSwitch.
  ///
  /// In en, this message translates to:
  /// **'{title} is published'**
  String publishedSwitch(String title);

  /// No description provided for @statusPublished.
  ///
  /// In en, this message translates to:
  /// **'Published'**
  String get statusPublished;

  /// No description provided for @statusScheduled.
  ///
  /// In en, this message translates to:
  /// **'Scheduled'**
  String get statusScheduled;

  /// No description provided for @statusArchived.
  ///
  /// In en, this message translates to:
  /// **'Archived'**
  String get statusArchived;

  /// No description provided for @featured.
  ///
  /// In en, this message translates to:
  /// **'Featured'**
  String get featured;

  /// No description provided for @freePreview.
  ///
  /// In en, this message translates to:
  /// **'Free preview'**
  String get freePreview;

  /// No description provided for @freePreviewHelp.
  ///
  /// In en, this message translates to:
  /// **'Anyone can watch this lesson before buying the course.'**
  String get freePreviewHelp;

  /// No description provided for @lessonAdded.
  ///
  /// In en, this message translates to:
  /// **'“{title}” added'**
  String lessonAdded(String title);

  /// No description provided for @addLesson.
  ///
  /// In en, this message translates to:
  /// **'Add a lesson'**
  String get addLesson;

  /// No description provided for @lessonTitle.
  ///
  /// In en, this message translates to:
  /// **'Lesson title'**
  String get lessonTitle;

  /// No description provided for @lessonTitleRule.
  ///
  /// In en, this message translates to:
  /// **'Give the lesson a title of 2 to 120 characters.'**
  String get lessonTitleRule;

  /// No description provided for @lessonMinutes.
  ///
  /// In en, this message translates to:
  /// **'Minutes (optional)'**
  String get lessonMinutes;

  /// No description provided for @lessonMinutesRule.
  ///
  /// In en, this message translates to:
  /// **'From 1 to 600 minutes, or leave it empty.'**
  String get lessonMinutesRule;

  /// No description provided for @lessonText.
  ///
  /// In en, this message translates to:
  /// **'Text (optional)'**
  String get lessonText;

  /// No description provided for @lessonNeedsContent.
  ///
  /// In en, this message translates to:
  /// **'Add a video or some text.'**
  String get lessonNeedsContent;

  /// No description provided for @video.
  ///
  /// In en, this message translates to:
  /// **'Video'**
  String get video;

  /// No description provided for @noVideoChosen.
  ///
  /// In en, this message translates to:
  /// **'No video chosen.'**
  String get noVideoChosen;

  /// No description provided for @removeVideo.
  ///
  /// In en, this message translates to:
  /// **'Remove the video'**
  String get removeVideo;

  /// No description provided for @chooseFromMedia.
  ///
  /// In en, this message translates to:
  /// **'Choose from Media'**
  String get chooseFromMedia;

  /// No description provided for @recordOrUpload.
  ///
  /// In en, this message translates to:
  /// **'Record or upload'**
  String get recordOrUpload;

  /// No description provided for @noVideos.
  ///
  /// In en, this message translates to:
  /// **'No videos in Media yet'**
  String get noVideos;

  /// No description provided for @noArticles.
  ///
  /// In en, this message translates to:
  /// **'No articles yet'**
  String get noArticles;

  /// No description provided for @noListings.
  ///
  /// In en, this message translates to:
  /// **'No listings yet'**
  String get noListings;

  /// No description provided for @publish.
  ///
  /// In en, this message translates to:
  /// **'Publish'**
  String get publish;

  /// No description provided for @unpublish.
  ///
  /// In en, this message translates to:
  /// **'Unpublish'**
  String get unpublish;

  /// No description provided for @archive.
  ///
  /// In en, this message translates to:
  /// **'Archive'**
  String get archive;

  /// No description provided for @feature.
  ///
  /// In en, this message translates to:
  /// **'Feature'**
  String get feature;

  /// No description provided for @unfeature.
  ///
  /// In en, this message translates to:
  /// **'Stop featuring'**
  String get unfeature;

  /// No description provided for @upload.
  ///
  /// In en, this message translates to:
  /// **'Upload'**
  String get upload;

  /// No description provided for @uploading.
  ///
  /// In en, this message translates to:
  /// **'Uploading'**
  String get uploading;

  /// No description provided for @storage.
  ///
  /// In en, this message translates to:
  /// **'Storage'**
  String get storage;

  /// No description provided for @storageUsed.
  ///
  /// In en, this message translates to:
  /// **'{used} of {limit} used'**
  String storageUsed(String used, String limit);

  /// No description provided for @storageUsedNoPlan.
  ///
  /// In en, this message translates to:
  /// **'{used} used'**
  String storageUsedNoPlan(String used);

  /// No description provided for @storageFull.
  ///
  /// In en, this message translates to:
  /// **'The storage is full. New uploads wait until there\'s room: delete files, or add storage on yallapp.com.tr.'**
  String get storageFull;

  /// No description provided for @manageOnWebsite.
  ///
  /// In en, this message translates to:
  /// **'Manage on yallapp.com.tr'**
  String get manageOnWebsite;

  /// No description provided for @allFiles.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get allFiles;

  /// No description provided for @videos.
  ///
  /// In en, this message translates to:
  /// **'Videos'**
  String get videos;

  /// No description provided for @pictures.
  ///
  /// In en, this message translates to:
  /// **'Pictures'**
  String get pictures;

  /// No description provided for @pdfs.
  ///
  /// In en, this message translates to:
  /// **'PDFs'**
  String get pdfs;

  /// No description provided for @noMedia.
  ///
  /// In en, this message translates to:
  /// **'No files here yet.'**
  String get noMedia;

  /// No description provided for @takePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take a photo'**
  String get takePhoto;

  /// No description provided for @recordVideo.
  ///
  /// In en, this message translates to:
  /// **'Record a video'**
  String get recordVideo;

  /// No description provided for @chooseFromGallery.
  ///
  /// In en, this message translates to:
  /// **'Choose from the gallery'**
  String get chooseFromGallery;

  /// No description provided for @fileTypeNotAllowed.
  ///
  /// In en, this message translates to:
  /// **'Media takes videos (MP4, MOV, WebM), pictures (JPG, PNG, WebP, GIF) and PDFs.'**
  String get fileTypeNotAllowed;

  /// No description provided for @uploaded.
  ///
  /// In en, this message translates to:
  /// **'{name} is in Media'**
  String uploaded(String name);

  /// No description provided for @uploadingFile.
  ///
  /// In en, this message translates to:
  /// **'Uploading {name}'**
  String uploadingFile(String name);

  /// No description provided for @uploadPaused.
  ///
  /// In en, this message translates to:
  /// **'Paused'**
  String get uploadPaused;

  /// No description provided for @uploadFailed.
  ///
  /// In en, this message translates to:
  /// **'The upload stopped.'**
  String get uploadFailed;

  /// No description provided for @pause.
  ///
  /// In en, this message translates to:
  /// **'Pause'**
  String get pause;

  /// No description provided for @resume.
  ///
  /// In en, this message translates to:
  /// **'Resume'**
  String get resume;

  /// No description provided for @cancelUpload.
  ///
  /// In en, this message translates to:
  /// **'Cancel the upload'**
  String get cancelUpload;

  /// No description provided for @unfinishedUpload.
  ///
  /// In en, this message translates to:
  /// **'Upload not finished'**
  String get unfinishedUpload;

  /// No description provided for @fileMissing.
  ///
  /// In en, this message translates to:
  /// **'The file isn\'t on this phone any more. Upload it again.'**
  String get fileMissing;

  /// No description provided for @deleteFileTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete {name}?'**
  String deleteFileTitle(String name);

  /// No description provided for @deleteFileText.
  ///
  /// In en, this message translates to:
  /// **'Its space comes back. Lessons and pages that use it lose it.'**
  String get deleteFileText;

  /// No description provided for @copyLink.
  ///
  /// In en, this message translates to:
  /// **'Copy the link'**
  String get copyLink;

  /// No description provided for @linkCopied.
  ///
  /// In en, this message translates to:
  /// **'Link copied'**
  String get linkCopied;

  /// No description provided for @inboxOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get inboxOpen;

  /// No description provided for @inboxClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get inboxClosed;

  /// No description provided for @noMessages.
  ///
  /// In en, this message translates to:
  /// **'No messages here'**
  String get noMessages;

  /// No description provided for @noMessagesText.
  ///
  /// In en, this message translates to:
  /// **'Questions about your listings arrive here.'**
  String get noMessagesText;

  /// No description provided for @message.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get message;

  /// No description provided for @aboutListing.
  ///
  /// In en, this message translates to:
  /// **'About: {title}'**
  String aboutListing(String title);

  /// No description provided for @writeReply.
  ///
  /// In en, this message translates to:
  /// **'Write a reply'**
  String get writeReply;

  /// No description provided for @replySent.
  ///
  /// In en, this message translates to:
  /// **'Reply sent'**
  String get replySent;

  /// No description provided for @call.
  ///
  /// In en, this message translates to:
  /// **'Call'**
  String get call;

  /// No description provided for @sendEmail.
  ///
  /// In en, this message translates to:
  /// **'Send an email'**
  String get sendEmail;

  /// No description provided for @searchUsers.
  ///
  /// In en, this message translates to:
  /// **'Name, phone number or email'**
  String get searchUsers;

  /// No description provided for @noUsers.
  ///
  /// In en, this message translates to:
  /// **'No one has signed in to the app yet'**
  String get noUsers;

  /// No description provided for @noUsersFound.
  ///
  /// In en, this message translates to:
  /// **'No one matches this search'**
  String get noUsersFound;

  /// No description provided for @joined.
  ///
  /// In en, this message translates to:
  /// **'Joined {date}'**
  String joined(String date);

  /// No description provided for @days7.
  ///
  /// In en, this message translates to:
  /// **'7 days'**
  String get days7;

  /// No description provided for @days30.
  ///
  /// In en, this message translates to:
  /// **'30 days'**
  String get days30;

  /// No description provided for @days90.
  ///
  /// In en, this message translates to:
  /// **'90 days'**
  String get days90;

  /// No description provided for @customRange.
  ///
  /// In en, this message translates to:
  /// **'Choose dates'**
  String get customRange;

  /// No description provided for @noStats.
  ///
  /// In en, this message translates to:
  /// **'No numbers yet'**
  String get noStats;

  /// No description provided for @noStatsText.
  ///
  /// In en, this message translates to:
  /// **'Numbers show up once people use the latest build of your app.'**
  String get noStatsText;

  /// No description provided for @rangeDates.
  ///
  /// In en, this message translates to:
  /// **'{from} – {to} · {zone}'**
  String rangeDates(String from, String to, String zone);

  /// No description provided for @everyDay.
  ///
  /// In en, this message translates to:
  /// **'Every day'**
  String get everyDay;

  /// No description provided for @activeUsers.
  ///
  /// In en, this message translates to:
  /// **'Active users'**
  String get activeUsers;

  /// No description provided for @installs.
  ///
  /// In en, this message translates to:
  /// **'Installs'**
  String get installs;

  /// No description provided for @sessions.
  ///
  /// In en, this message translates to:
  /// **'Sessions'**
  String get sessions;

  /// No description provided for @activeAvg.
  ///
  /// In en, this message translates to:
  /// **'Active a day'**
  String get activeAvg;

  /// No description provided for @weeklyActive.
  ///
  /// In en, this message translates to:
  /// **'Active this week'**
  String get weeklyActive;

  /// No description provided for @monthlyActive.
  ///
  /// In en, this message translates to:
  /// **'Active this month'**
  String get monthlyActive;

  /// No description provided for @vsPrevious.
  ///
  /// In en, this message translates to:
  /// **'{change} vs before'**
  String vsPrevious(String change);

  /// No description provided for @retention.
  ///
  /// In en, this message translates to:
  /// **'Who comes back'**
  String get retention;

  /// No description provided for @platforms.
  ///
  /// In en, this message translates to:
  /// **'Platforms'**
  String get platforms;

  /// No description provided for @countries.
  ///
  /// In en, this message translates to:
  /// **'Countries'**
  String get countries;

  /// No description provided for @screens.
  ///
  /// In en, this message translates to:
  /// **'Screens'**
  String get screens;

  /// No description provided for @chartLabel.
  ///
  /// In en, this message translates to:
  /// **'{metric} every day: {total} in all, {highest} on the busiest day'**
  String chartLabel(String metric, String total, String highest);

  /// No description provided for @sendNotification.
  ///
  /// In en, this message translates to:
  /// **'Send a notification'**
  String get sendNotification;

  /// No description provided for @sendsToEveryone.
  ///
  /// In en, this message translates to:
  /// **'To everyone who uses {app}'**
  String sendsToEveryone(String app);

  /// No description provided for @inboxAndPush.
  ///
  /// In en, this message translates to:
  /// **'It lands in the app\'s inbox, and as a push on phones that allow it.'**
  String get inboxAndPush;

  /// No description provided for @inboxOnly.
  ///
  /// In en, this message translates to:
  /// **'It lands in the app\'s inbox. Pushes need a plan with push and the app\'s Firebase key, set on the dashboard.'**
  String get inboxOnly;

  /// No description provided for @notificationTitle.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get notificationTitle;

  /// No description provided for @notificationMessage.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get notificationMessage;

  /// No description provided for @previewOnPhone.
  ///
  /// In en, this message translates to:
  /// **'How it looks on a phone'**
  String get previewOnPhone;

  /// No description provided for @sendNow.
  ///
  /// In en, this message translates to:
  /// **'Send now'**
  String get sendNow;

  /// No description provided for @sendLimit.
  ///
  /// In en, this message translates to:
  /// **'Up to 10 an hour, with the ones sent from the dashboard.'**
  String get sendLimit;

  /// No description provided for @sendToEveryoneTitle.
  ///
  /// In en, this message translates to:
  /// **'Send to everyone?'**
  String get sendToEveryoneTitle;

  /// No description provided for @sendToEveryoneText.
  ///
  /// In en, this message translates to:
  /// **'Everyone who uses {app} gets it now. It can\'t be taken back.'**
  String sendToEveryoneText(String app);

  /// No description provided for @sentBefore.
  ///
  /// In en, this message translates to:
  /// **'Sent before'**
  String get sentBefore;

  /// No description provided for @nothingSent.
  ///
  /// In en, this message translates to:
  /// **'Nothing sent yet.'**
  String get nothingSent;

  /// No description provided for @previewApp.
  ///
  /// In en, this message translates to:
  /// **'Preview your app'**
  String get previewApp;

  /// No description provided for @openInBrowser.
  ///
  /// In en, this message translates to:
  /// **'Open in the browser'**
  String get openInBrowser;

  /// No description provided for @previewDraft.
  ///
  /// In en, this message translates to:
  /// **'Show unpublished pages'**
  String get previewDraft;

  /// No description provided for @previewDraftHelp.
  ///
  /// In en, this message translates to:
  /// **'See your changes before you publish them.'**
  String get previewDraftHelp;

  /// No description provided for @buildsTitle.
  ///
  /// In en, this message translates to:
  /// **'Builds & publishing'**
  String get buildsTitle;

  /// No description provided for @builds.
  ///
  /// In en, this message translates to:
  /// **'Builds & downloads'**
  String get builds;

  /// No description provided for @publishing.
  ///
  /// In en, this message translates to:
  /// **'Publishing'**
  String get publishing;

  /// No description provided for @publishManaged.
  ///
  /// In en, this message translates to:
  /// **'We publish for you'**
  String get publishManaged;

  /// No description provided for @publishSelf.
  ///
  /// In en, this message translates to:
  /// **'You publish on your own store accounts'**
  String get publishSelf;

  /// No description provided for @noBuilds.
  ///
  /// In en, this message translates to:
  /// **'No builds yet.'**
  String get noBuilds;

  /// No description provided for @buildsOnDashboard.
  ///
  /// In en, this message translates to:
  /// **'New builds are started on the dashboard.'**
  String get buildsOnDashboard;

  /// No description provided for @startedAt.
  ///
  /// In en, this message translates to:
  /// **'Started {date}'**
  String startedAt(String date);

  /// No description provided for @finishedAt.
  ///
  /// In en, this message translates to:
  /// **'Finished {date}'**
  String finishedAt(String date);

  /// No description provided for @yourAppTools.
  ///
  /// In en, this message translates to:
  /// **'Your app'**
  String get yourAppTools;

  /// No description provided for @account.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get account;

  /// No description provided for @planAndStorage.
  ///
  /// In en, this message translates to:
  /// **'Plan & storage'**
  String get planAndStorage;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @notificationSettings.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notificationSettings;

  /// No description provided for @signedInDevices.
  ///
  /// In en, this message translates to:
  /// **'Signed-in devices'**
  String get signedInDevices;

  /// No description provided for @biometricLock.
  ///
  /// In en, this message translates to:
  /// **'Unlock with fingerprint or face'**
  String get biometricLock;

  /// No description provided for @biometricLockHelp.
  ///
  /// In en, this message translates to:
  /// **'Asked when the app opens, and after 5 minutes away.'**
  String get biometricLockHelp;

  /// No description provided for @biometricUnavailable.
  ///
  /// In en, this message translates to:
  /// **'This phone has no fingerprint, face or screen lock set up.'**
  String get biometricUnavailable;

  /// No description provided for @help.
  ///
  /// In en, this message translates to:
  /// **'Help'**
  String get help;

  /// No description provided for @helpWhatsapp.
  ///
  /// In en, this message translates to:
  /// **'Talk to us on WhatsApp'**
  String get helpWhatsapp;

  /// No description provided for @helpEmail.
  ///
  /// In en, this message translates to:
  /// **'Email us'**
  String get helpEmail;

  /// No description provided for @helpCenter.
  ///
  /// In en, this message translates to:
  /// **'Guides'**
  String get helpCenter;

  /// No description provided for @legal.
  ///
  /// In en, this message translates to:
  /// **'Legal'**
  String get legal;

  /// No description provided for @terms.
  ///
  /// In en, this message translates to:
  /// **'Terms of service'**
  String get terms;

  /// No description provided for @privacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy policy'**
  String get privacy;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @signOutTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign out of Yallapp Business?'**
  String get signOutTitle;

  /// No description provided for @signOutText.
  ///
  /// In en, this message translates to:
  /// **'This phone stops getting your notifications.'**
  String get signOutText;

  /// No description provided for @appVersion.
  ///
  /// In en, this message translates to:
  /// **'Version {version}'**
  String appVersion(String version);

  /// No description provided for @phoneLanguage.
  ///
  /// In en, this message translates to:
  /// **'The phone\'s language'**
  String get phoneLanguage;

  /// No description provided for @languageHelp.
  ///
  /// In en, this message translates to:
  /// **'The same choice as the dashboard\'s language. Your notifications follow it too.'**
  String get languageHelp;

  /// No description provided for @pushOff.
  ///
  /// In en, this message translates to:
  /// **'Notifications aren\'t set up in this build of the app.'**
  String get pushOff;

  /// No description provided for @pushSettingsHelp.
  ///
  /// In en, this message translates to:
  /// **'Choose what this phone tells you about.'**
  String get pushSettingsHelp;

  /// No description provided for @pushNewOrder.
  ///
  /// In en, this message translates to:
  /// **'New orders'**
  String get pushNewOrder;

  /// No description provided for @pushNewOrderHelp.
  ///
  /// In en, this message translates to:
  /// **'When an order is paid.'**
  String get pushNewOrderHelp;

  /// No description provided for @pushNewBooking.
  ///
  /// In en, this message translates to:
  /// **'New bookings'**
  String get pushNewBooking;

  /// No description provided for @pushNewBookingHelp.
  ///
  /// In en, this message translates to:
  /// **'When an appointment is booked.'**
  String get pushNewBookingHelp;

  /// No description provided for @pushNewMessage.
  ///
  /// In en, this message translates to:
  /// **'New messages'**
  String get pushNewMessage;

  /// No description provided for @pushNewMessageHelp.
  ///
  /// In en, this message translates to:
  /// **'When someone writes about a listing.'**
  String get pushNewMessageHelp;

  /// No description provided for @pushPayment.
  ///
  /// In en, this message translates to:
  /// **'Payments'**
  String get pushPayment;

  /// No description provided for @pushPaymentHelp.
  ///
  /// In en, this message translates to:
  /// **'Donations, and your payments to Yallapp.'**
  String get pushPaymentHelp;

  /// No description provided for @pushBuild.
  ///
  /// In en, this message translates to:
  /// **'Builds'**
  String get pushBuild;

  /// No description provided for @pushBuildHelp.
  ///
  /// In en, this message translates to:
  /// **'When a build is ready or fails.'**
  String get pushBuildHelp;

  /// No description provided for @pushUpdates.
  ///
  /// In en, this message translates to:
  /// **'Updates from Yallapp'**
  String get pushUpdates;

  /// No description provided for @pushUpdatesHelp.
  ///
  /// In en, this message translates to:
  /// **'Our news, maintenance and offers.'**
  String get pushUpdatesHelp;

  /// No description provided for @pushNotices.
  ///
  /// In en, this message translates to:
  /// **'Account notices'**
  String get pushNotices;

  /// No description provided for @pushNoticesHelp.
  ///
  /// In en, this message translates to:
  /// **'The plan ending, storage, app users and your site.'**
  String get pushNoticesHelp;

  /// No description provided for @devicesHelp.
  ///
  /// In en, this message translates to:
  /// **'Phones signed in to Yallapp Business. They\'re also listed on the dashboard.'**
  String get devicesHelp;

  /// No description provided for @thisPhone.
  ///
  /// In en, this message translates to:
  /// **'This phone'**
  String get thisPhone;

  /// No description provided for @lastSeen.
  ///
  /// In en, this message translates to:
  /// **'last used {when}'**
  String lastSeen(String when);

  /// No description provided for @signOutDeviceTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign out {name}?'**
  String signOutDeviceTitle(String name);

  /// No description provided for @signOutAll.
  ///
  /// In en, this message translates to:
  /// **'Sign out every phone'**
  String get signOutAll;

  /// No description provided for @signOutAllTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign out every phone?'**
  String get signOutAllTitle;

  /// No description provided for @signOutAllText.
  ///
  /// In en, this message translates to:
  /// **'Every phone, this one too, has to sign in again. The website stays signed in.'**
  String get signOutAllText;

  /// No description provided for @noPlan.
  ///
  /// In en, this message translates to:
  /// **'No plan'**
  String get noPlan;

  /// No description provided for @planEnded.
  ///
  /// In en, this message translates to:
  /// **'Ended on {date}'**
  String planEnded(String date);

  /// No description provided for @nextPlan.
  ///
  /// In en, this message translates to:
  /// **'{plan} starts on {date}'**
  String nextPlan(String plan, String date);

  /// No description provided for @manageOnWebsiteText.
  ///
  /// In en, this message translates to:
  /// **'Renewing, changing plans and adding storage are done on yallapp.com.tr.'**
  String get manageOnWebsiteText;

  /// No description provided for @goodMorning.
  ///
  /// In en, this message translates to:
  /// **'Good morning, {name}'**
  String goodMorning(String name);

  /// No description provided for @goodAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon, {name}'**
  String goodAfternoon(String name);

  /// No description provided for @goodEvening.
  ///
  /// In en, this message translates to:
  /// **'Good evening, {name}'**
  String goodEvening(String name);

  /// No description provided for @switchAppLabel.
  ///
  /// In en, this message translates to:
  /// **'{name}. Switch app'**
  String switchAppLabel(String name);

  /// No description provided for @bellUnread.
  ///
  /// In en, this message translates to:
  /// **'Updates from Yallapp, {count} unread'**
  String bellUnread(int count);

  /// No description provided for @unreadCount.
  ///
  /// In en, this message translates to:
  /// **'{count} unread'**
  String unreadCount(int count);

  /// No description provided for @buildVersion.
  ///
  /// In en, this message translates to:
  /// **'Version {version} (build {number})'**
  String buildVersion(String version, int number);

  /// No description provided for @usersMatches.
  ///
  /// In en, this message translates to:
  /// **'{matches} of {total} users'**
  String usersMatches(int matches, int total);

  /// No description provided for @minutesAgo.
  ///
  /// In en, this message translates to:
  /// **'{count} min ago'**
  String minutesAgo(int count);

  /// No description provided for @hoursAgo.
  ///
  /// In en, this message translates to:
  /// **'{count} h ago'**
  String hoursAgo(int count);

  /// No description provided for @donorsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 donor} other{{count} donors}}'**
  String donorsCount(int count);

  /// No description provided for @lessonsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 lesson} other{{count} lessons}}'**
  String lessonsCount(int count);

  /// No description provided for @studentsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 student} other{{count} students}}'**
  String studentsCount(int count);

  /// No description provided for @stockLeft.
  ///
  /// In en, this message translates to:
  /// **'{count} in stock'**
  String stockLeft(int count);

  /// No description provided for @minutes.
  ///
  /// In en, this message translates to:
  /// **'{count} min'**
  String minutes(int count);

  /// No description provided for @pushedTo.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{The push went to 1 phone.} other{The push went to {count} phones.}}'**
  String pushedTo(int count);

  /// No description provided for @retentionDay.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, =1{Came back the next day} other{Came back after {days} days}}'**
  String retentionDay(int days);

  /// No description provided for @usersTotal.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 user} other{{count} users}}'**
  String usersTotal(int count);

  /// No description provided for @planEnds.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, =0{Ends today} =1{Ends tomorrow} other{Ends in {days} days}} ({date})'**
  String planEnds(String date, int days);
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en', 'tr'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
    case 'tr':
      return AppLocalizationsTr();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
