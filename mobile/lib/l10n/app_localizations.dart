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

  /// The language's own name, shown in the language picker.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageName;

  /// No description provided for @tabHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get tabHome;

  /// No description provided for @tabCourses.
  ///
  /// In en, this message translates to:
  /// **'Courses'**
  String get tabCourses;

  /// No description provided for @tabMyCourses.
  ///
  /// In en, this message translates to:
  /// **'My Courses'**
  String get tabMyCourses;

  /// No description provided for @tabAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get tabAccount;

  /// No description provided for @tabShop.
  ///
  /// In en, this message translates to:
  /// **'Shop'**
  String get tabShop;

  /// No description provided for @tabCart.
  ///
  /// In en, this message translates to:
  /// **'Cart'**
  String get tabCart;

  /// No description provided for @tabBook.
  ///
  /// In en, this message translates to:
  /// **'Book'**
  String get tabBook;

  /// No description provided for @tabAppointments.
  ///
  /// In en, this message translates to:
  /// **'Appointments'**
  String get tabAppointments;

  /// No description provided for @tabFavorites.
  ///
  /// In en, this message translates to:
  /// **'Favorites'**
  String get tabFavorites;

  /// No description provided for @tabMessages.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get tabMessages;

  /// No description provided for @loadingPage.
  ///
  /// In en, this message translates to:
  /// **'Loading page'**
  String get loadingPage;

  /// No description provided for @pageEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Nothing here yet'**
  String get pageEmptyTitle;

  /// No description provided for @playVideo.
  ///
  /// In en, this message translates to:
  /// **'Play video'**
  String get playVideo;

  /// No description provided for @savedItem.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get savedItem;

  /// No description provided for @itemCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 item} other{{count} items}}'**
  String itemCount(int count);

  /// No description provided for @searchListingsHint.
  ///
  /// In en, this message translates to:
  /// **'Search by place, title or reference'**
  String get searchListingsHint;

  /// No description provided for @filters.
  ///
  /// In en, this message translates to:
  /// **'Filters'**
  String get filters;

  /// No description provided for @filtersActive.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Filters, 1 active} other{Filters, {count} active}}'**
  String filtersActive(int count);

  /// No description provided for @sortBy.
  ///
  /// In en, this message translates to:
  /// **'Sort: {order}'**
  String sortBy(String order);

  /// No description provided for @sortNewest.
  ///
  /// In en, this message translates to:
  /// **'Newest'**
  String get sortNewest;

  /// No description provided for @sortPriceLowHigh.
  ///
  /// In en, this message translates to:
  /// **'Price: low to high'**
  String get sortPriceLowHigh;

  /// No description provided for @sortPriceHighLow.
  ///
  /// In en, this message translates to:
  /// **'Price: high to low'**
  String get sortPriceHighLow;

  /// No description provided for @sortLargest.
  ///
  /// In en, this message translates to:
  /// **'Largest first'**
  String get sortLargest;

  /// No description provided for @filterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get filterAll;

  /// No description provided for @filterAny.
  ///
  /// In en, this message translates to:
  /// **'Any'**
  String get filterAny;

  /// No description provided for @forSale.
  ///
  /// In en, this message translates to:
  /// **'For sale'**
  String get forSale;

  /// No description provided for @forRent.
  ///
  /// In en, this message translates to:
  /// **'For rent'**
  String get forRent;

  /// No description provided for @featured.
  ///
  /// In en, this message translates to:
  /// **'Featured'**
  String get featured;

  /// No description provided for @negotiable.
  ///
  /// In en, this message translates to:
  /// **'Negotiable'**
  String get negotiable;

  /// No description provided for @pricePerMonth.
  ///
  /// In en, this message translates to:
  /// **'{price} / month'**
  String pricePerMonth(String price);

  /// No description provided for @pricePerYear.
  ///
  /// In en, this message translates to:
  /// **'{price} / year'**
  String pricePerYear(String price);

  /// No description provided for @areaSquareMetres.
  ///
  /// In en, this message translates to:
  /// **'{area} m²'**
  String areaSquareMetres(String area);

  /// No description provided for @areaSquareFeet.
  ///
  /// In en, this message translates to:
  /// **'{area} ft²'**
  String areaSquareFeet(String area);

  /// No description provided for @bedroomsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 bedroom} other{{count} bedrooms}}'**
  String bedroomsCount(int count);

  /// No description provided for @bathroomsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 bathroom} other{{count} bathrooms}}'**
  String bathroomsCount(int count);

  /// No description provided for @loadingListings.
  ///
  /// In en, this message translates to:
  /// **'Loading listings'**
  String get loadingListings;

  /// No description provided for @loadingMoreListings.
  ///
  /// In en, this message translates to:
  /// **'Loading more listings'**
  String get loadingMoreListings;

  /// No description provided for @noListingsTitle.
  ///
  /// In en, this message translates to:
  /// **'No listings found'**
  String get noListingsTitle;

  /// No description provided for @noListingsMessage.
  ///
  /// In en, this message translates to:
  /// **'Try other words or fewer filters.'**
  String get noListingsMessage;

  /// No description provided for @propertyType.
  ///
  /// In en, this message translates to:
  /// **'Property type'**
  String get propertyType;

  /// No description provided for @city.
  ///
  /// In en, this message translates to:
  /// **'City'**
  String get city;

  /// No description provided for @district.
  ///
  /// In en, this message translates to:
  /// **'District'**
  String get district;

  /// No description provided for @priceRange.
  ///
  /// In en, this message translates to:
  /// **'Price'**
  String get priceRange;

  /// No description provided for @areaRange.
  ///
  /// In en, this message translates to:
  /// **'Area'**
  String get areaRange;

  /// No description provided for @bedrooms.
  ///
  /// In en, this message translates to:
  /// **'Bedrooms'**
  String get bedrooms;

  /// No description provided for @bathrooms.
  ///
  /// In en, this message translates to:
  /// **'Bathrooms'**
  String get bathrooms;

  /// No description provided for @minimum.
  ///
  /// In en, this message translates to:
  /// **'Min'**
  String get minimum;

  /// No description provided for @maximum.
  ///
  /// In en, this message translates to:
  /// **'Max'**
  String get maximum;

  /// No description provided for @reset.
  ///
  /// In en, this message translates to:
  /// **'Reset'**
  String get reset;

  /// No description provided for @showResults.
  ///
  /// In en, this message translates to:
  /// **'Show results'**
  String get showResults;

  /// No description provided for @loadingListing.
  ///
  /// In en, this message translates to:
  /// **'Loading listing'**
  String get loadingListing;

  /// No description provided for @listingReference.
  ///
  /// In en, this message translates to:
  /// **'Ref. {reference}'**
  String listingReference(String reference);

  /// No description provided for @keyFacts.
  ///
  /// In en, this message translates to:
  /// **'Key facts'**
  String get keyFacts;

  /// No description provided for @factArea.
  ///
  /// In en, this message translates to:
  /// **'Area'**
  String get factArea;

  /// No description provided for @factFloor.
  ///
  /// In en, this message translates to:
  /// **'Floor'**
  String get factFloor;

  /// No description provided for @factYearBuilt.
  ///
  /// In en, this message translates to:
  /// **'Year built'**
  String get factYearBuilt;

  /// No description provided for @factFurnished.
  ///
  /// In en, this message translates to:
  /// **'Furnished'**
  String get factFurnished;

  /// No description provided for @yes.
  ///
  /// In en, this message translates to:
  /// **'Yes'**
  String get yes;

  /// No description provided for @no.
  ///
  /// In en, this message translates to:
  /// **'No'**
  String get no;

  /// No description provided for @features.
  ///
  /// In en, this message translates to:
  /// **'Features'**
  String get features;

  /// No description provided for @description.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get description;

  /// No description provided for @watchVideo.
  ///
  /// In en, this message translates to:
  /// **'Watch the video'**
  String get watchVideo;

  /// No description provided for @location.
  ///
  /// In en, this message translates to:
  /// **'Location'**
  String get location;

  /// No description provided for @openInMaps.
  ///
  /// In en, this message translates to:
  /// **'Open in maps'**
  String get openInMaps;

  /// No description provided for @contactOffice.
  ///
  /// In en, this message translates to:
  /// **'Contact the office'**
  String get contactOffice;

  /// No description provided for @call.
  ///
  /// In en, this message translates to:
  /// **'Call'**
  String get call;

  /// No description provided for @whatsapp.
  ///
  /// In en, this message translates to:
  /// **'WhatsApp'**
  String get whatsapp;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @similarListings.
  ///
  /// In en, this message translates to:
  /// **'Similar listings'**
  String get similarListings;

  /// No description provided for @messageOffice.
  ///
  /// In en, this message translates to:
  /// **'Message the office'**
  String get messageOffice;

  /// No description provided for @inquiryTemplate.
  ///
  /// In en, this message translates to:
  /// **'Hello, I am interested in \"{title}\". Is it still available?'**
  String inquiryTemplate(String title);

  /// No description provided for @writeMessage.
  ///
  /// In en, this message translates to:
  /// **'Write a message'**
  String get writeMessage;

  /// No description provided for @send.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get send;

  /// No description provided for @photoOf.
  ///
  /// In en, this message translates to:
  /// **'Photo {index} of {total}'**
  String photoOf(int index, int total);

  /// No description provided for @saveToFavorites.
  ///
  /// In en, this message translates to:
  /// **'Save to favorites'**
  String get saveToFavorites;

  /// No description provided for @removeFromFavorites.
  ///
  /// In en, this message translates to:
  /// **'Remove from favorites'**
  String get removeFromFavorites;

  /// No description provided for @loadingFavorites.
  ///
  /// In en, this message translates to:
  /// **'Loading favorites'**
  String get loadingFavorites;

  /// No description provided for @noFavoritesTitle.
  ///
  /// In en, this message translates to:
  /// **'No favorites yet'**
  String get noFavoritesTitle;

  /// No description provided for @noFavoritesMessage.
  ///
  /// In en, this message translates to:
  /// **'Tap the heart on a listing to save it here.'**
  String get noFavoritesMessage;

  /// No description provided for @favoritesSignInTitle.
  ///
  /// In en, this message translates to:
  /// **'Save the homes you like'**
  String get favoritesSignInTitle;

  /// No description provided for @favoritesSignInMessage.
  ///
  /// In en, this message translates to:
  /// **'Sign in to keep your favorites on all your devices.'**
  String get favoritesSignInMessage;

  /// No description provided for @messagesSignInTitle.
  ///
  /// In en, this message translates to:
  /// **'Talk to the office'**
  String get messagesSignInTitle;

  /// No description provided for @messagesSignInMessage.
  ///
  /// In en, this message translates to:
  /// **'Sign in to message the office about a listing.'**
  String get messagesSignInMessage;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signIn;

  /// No description provided for @loadingMessages.
  ///
  /// In en, this message translates to:
  /// **'Loading messages'**
  String get loadingMessages;

  /// No description provided for @noMessagesTitle.
  ///
  /// In en, this message translates to:
  /// **'No messages yet'**
  String get noMessagesTitle;

  /// No description provided for @noMessagesMessage.
  ///
  /// In en, this message translates to:
  /// **'Questions you send about a listing show up here.'**
  String get noMessagesMessage;

  /// No description provided for @unreadMessages.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 unread message} other{{count} unread messages}}'**
  String unreadMessages(int count);

  /// No description provided for @messageFromYou.
  ///
  /// In en, this message translates to:
  /// **'You: {text}'**
  String messageFromYou(String text);

  /// No description provided for @messageFromOffice.
  ///
  /// In en, this message translates to:
  /// **'Office: {text}'**
  String messageFromOffice(String text);

  /// No description provided for @conversationClosed.
  ///
  /// In en, this message translates to:
  /// **'This conversation is closed.'**
  String get conversationClosed;

  /// No description provided for @progress.
  ///
  /// In en, this message translates to:
  /// **'Progress'**
  String get progress;

  /// No description provided for @seeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get seeAll;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading'**
  String get loading;

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

  /// No description provided for @tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get tryAgain;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @durationMinutes.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min'**
  String durationMinutes(int minutes);

  /// No description provided for @durationHours.
  ///
  /// In en, this message translates to:
  /// **'{hours} h'**
  String durationHours(int hours);

  /// No description provided for @durationHoursMinutes.
  ///
  /// In en, this message translates to:
  /// **'{hours} h {minutes} min'**
  String durationHoursMinutes(int hours, int minutes);

  /// No description provided for @back.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get back;

  /// No description provided for @tabPosition.
  ///
  /// In en, this message translates to:
  /// **'{label}, tab {index} of {count}'**
  String tabPosition(String label, int index, int count);

  /// No description provided for @mainNavigation.
  ///
  /// In en, this message translates to:
  /// **'Main navigation'**
  String get mainNavigation;

  /// No description provided for @tabWithCount.
  ///
  /// In en, this message translates to:
  /// **'{label}, {count}'**
  String tabWithCount(String label, int count);

  /// No description provided for @maintenanceTitle.
  ///
  /// In en, this message translates to:
  /// **'We\'ll be right back'**
  String get maintenanceTitle;

  /// No description provided for @maintenanceMessage.
  ///
  /// In en, this message translates to:
  /// **'{name} is being updated. Please try again in a little while.'**
  String maintenanceMessage(String name);

  /// No description provided for @updateRequiredTitle.
  ///
  /// In en, this message translates to:
  /// **'Update required'**
  String get updateRequiredTitle;

  /// No description provided for @updateRequiredMessage.
  ///
  /// In en, this message translates to:
  /// **'A new version of {name} is available. Update the app to keep learning.'**
  String updateRequiredMessage(String name);

  /// No description provided for @updateNow.
  ///
  /// In en, this message translates to:
  /// **'Update now'**
  String get updateNow;

  /// No description provided for @unavailableTitle.
  ///
  /// In en, this message translates to:
  /// **'The app is unavailable'**
  String get unavailableTitle;

  /// No description provided for @unavailableMessage.
  ///
  /// In en, this message translates to:
  /// **'{name} isn\'t available right now. Please contact the academy for help.'**
  String unavailableMessage(String name);

  /// No description provided for @connectionTitle.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t connect'**
  String get connectionTitle;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @videoQualityAuto.
  ///
  /// In en, this message translates to:
  /// **'Auto'**
  String get videoQualityAuto;

  /// No description provided for @errorTimeout.
  ///
  /// In en, this message translates to:
  /// **'The connection timed out. Check your internet and try again.'**
  String get errorTimeout;

  /// No description provided for @errorCancelled.
  ///
  /// In en, this message translates to:
  /// **'The request was cancelled.'**
  String get errorCancelled;

  /// No description provided for @errorNetwork.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t connect. Check your internet and try again.'**
  String get errorNetwork;

  /// No description provided for @error401.
  ///
  /// In en, this message translates to:
  /// **'Your session has ended. Please sign in again.'**
  String get error401;

  /// No description provided for @error403.
  ///
  /// In en, this message translates to:
  /// **'You don\'t have access to this.'**
  String get error403;

  /// No description provided for @error404.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t find what you were looking for.'**
  String get error404;

  /// No description provided for @error429.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Please wait a moment and try again.'**
  String get error429;

  /// No description provided for @error503.
  ///
  /// In en, this message translates to:
  /// **'The academy is unavailable right now. Please try again later.'**
  String get error503;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get errorGeneric;

  /// No description provided for @errorInvalidResponse.
  ///
  /// In en, this message translates to:
  /// **'The academy sent a response the app couldn\'t read.'**
  String get errorInvalidResponse;

  /// No description provided for @errorPurchaseNotAllowed.
  ///
  /// In en, this message translates to:
  /// **'This course isn\'t available on your account yet.'**
  String get errorPurchaseNotAllowed;

  /// No description provided for @free.
  ///
  /// In en, this message translates to:
  /// **'Free'**
  String get free;

  /// No description provided for @questionSingleChoice.
  ///
  /// In en, this message translates to:
  /// **'Single choice'**
  String get questionSingleChoice;

  /// No description provided for @questionMultipleChoice.
  ///
  /// In en, this message translates to:
  /// **'Multiple choice'**
  String get questionMultipleChoice;

  /// No description provided for @questionTrueFalse.
  ///
  /// In en, this message translates to:
  /// **'True or false'**
  String get questionTrueFalse;

  /// No description provided for @questionShortAnswer.
  ///
  /// In en, this message translates to:
  /// **'Short answer'**
  String get questionShortAnswer;

  /// No description provided for @questionOpenEnded.
  ///
  /// In en, this message translates to:
  /// **'Open answer'**
  String get questionOpenEnded;

  /// No description provided for @questionFillInBlank.
  ///
  /// In en, this message translates to:
  /// **'Fill in the blank'**
  String get questionFillInBlank;

  /// No description provided for @questionOrdering.
  ///
  /// In en, this message translates to:
  /// **'Ordering'**
  String get questionOrdering;

  /// No description provided for @questionMatching.
  ///
  /// In en, this message translates to:
  /// **'Matching'**
  String get questionMatching;

  /// No description provided for @questionImageAnswer.
  ///
  /// In en, this message translates to:
  /// **'Image answer'**
  String get questionImageAnswer;

  /// No description provided for @questionOther.
  ///
  /// In en, this message translates to:
  /// **'Question'**
  String get questionOther;

  /// No description provided for @attemptPassed.
  ///
  /// In en, this message translates to:
  /// **'Passed'**
  String get attemptPassed;

  /// No description provided for @attemptFailed.
  ///
  /// In en, this message translates to:
  /// **'Not passed'**
  String get attemptFailed;

  /// No description provided for @attemptPendingReview.
  ///
  /// In en, this message translates to:
  /// **'Waiting for review'**
  String get attemptPendingReview;

  /// A country name by ISO code, for the country code picker.
  ///
  /// In en, this message translates to:
  /// **'{code, select, AF{Afghanistan} AL{Albania} DZ{Algeria} AR{Argentina} AU{Australia} AT{Austria} AZ{Azerbaijan} BH{Bahrain} BD{Bangladesh} BE{Belgium} BA{Bosnia and Herzegovina} BR{Brazil} BG{Bulgaria} CA{Canada} CN{China} HR{Croatia} CY{Cyprus} CZ{Czechia} DK{Denmark} EG{Egypt} FI{Finland} FR{France} GE{Georgia} DE{Germany} GR{Greece} HU{Hungary} IN{India} ID{Indonesia} IR{Iran} IQ{Iraq} IE{Ireland} IT{Italy} JP{Japan} JO{Jordan} KZ{Kazakhstan} KE{Kenya} XK{Kosovo} KW{Kuwait} KG{Kyrgyzstan} LB{Lebanon} LY{Libya} MY{Malaysia} MX{Mexico} MA{Morocco} NL{Netherlands} NZ{New Zealand} NG{Nigeria} MK{North Macedonia} NO{Norway} OM{Oman} PK{Pakistan} PS{Palestine} PH{Philippines} PL{Poland} PT{Portugal} QA{Qatar} RO{Romania} RU{Russia} SA{Saudi Arabia} RS{Serbia} SG{Singapore} SO{Somalia} ZA{South Africa} KR{South Korea} ES{Spain} SD{Sudan} SE{Sweden} CH{Switzerland} SY{Syria} TN{Tunisia} TR{Turkey} TM{Turkmenistan} UA{Ukraine} AE{United Arab Emirates} GB{United Kingdom} US{United States} UZ{Uzbekistan} YE{Yemen} other{{code}}}'**
  String countryName(String code);

  /// No description provided for @pageNotFound.
  ///
  /// In en, this message translates to:
  /// **'This page doesn\'t exist'**
  String get pageNotFound;

  /// No description provided for @goHome.
  ///
  /// In en, this message translates to:
  /// **'Go home'**
  String get goHome;

  /// No description provided for @profileSaved.
  ///
  /// In en, this message translates to:
  /// **'Profile saved'**
  String get profileSaved;

  /// No description provided for @editProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit profile'**
  String get editProfile;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @fullName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get fullName;

  /// No description provided for @enterName.
  ///
  /// In en, this message translates to:
  /// **'Enter your name.'**
  String get enterName;

  /// No description provided for @emailOptional.
  ///
  /// In en, this message translates to:
  /// **'Email (optional)'**
  String get emailOptional;

  /// No description provided for @enterValidEmail.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address.'**
  String get enterValidEmail;

  /// No description provided for @enterEmail.
  ///
  /// In en, this message translates to:
  /// **'Enter your email.'**
  String get enterEmail;

  /// No description provided for @enterCity.
  ///
  /// In en, this message translates to:
  /// **'Enter your city.'**
  String get enterCity;

  /// No description provided for @cityOptional.
  ///
  /// In en, this message translates to:
  /// **'City (optional)'**
  String get cityOptional;

  /// No description provided for @mobileNumber.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get mobileNumber;

  /// No description provided for @mobileNumberLocked.
  ///
  /// In en, this message translates to:
  /// **'Your mobile number is how you sign in, so it can’t be changed here.'**
  String get mobileNumberLocked;

  /// No description provided for @signOutDeviceTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign out {device}?'**
  String signOutDeviceTitle(String device);

  /// No description provided for @signOutDeviceMessage.
  ///
  /// In en, this message translates to:
  /// **'That device will need a verification code to sign in again.'**
  String get signOutDeviceMessage;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @signOutDevice.
  ///
  /// In en, this message translates to:
  /// **'Sign out {device}'**
  String signOutDevice(String device);

  /// No description provided for @registeredDevices.
  ///
  /// In en, this message translates to:
  /// **'Registered devices'**
  String get registeredDevices;

  /// No description provided for @deviceLimit.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{You can use 1 device with this account.} other{You can use {count} devices with this account.}}'**
  String deviceLimit(int count);

  /// No description provided for @thisDevice.
  ///
  /// In en, this message translates to:
  /// **'{device} (this device)'**
  String thisDevice(String device);

  /// No description provided for @lastUsed.
  ///
  /// In en, this message translates to:
  /// **'Last used {date}'**
  String lastUsed(String date);

  /// No description provided for @myCertificates.
  ///
  /// In en, this message translates to:
  /// **'My certificates'**
  String get myCertificates;

  /// No description provided for @noCertificatesTitle.
  ///
  /// In en, this message translates to:
  /// **'No certificates yet'**
  String get noCertificatesTitle;

  /// No description provided for @noCertificatesMessage.
  ///
  /// In en, this message translates to:
  /// **'Complete a course to earn its certificate.'**
  String get noCertificatesMessage;

  /// No description provided for @noQuizResultsTitle.
  ///
  /// In en, this message translates to:
  /// **'No quiz results yet'**
  String get noQuizResultsTitle;

  /// No description provided for @noQuizResultsMessage.
  ///
  /// In en, this message translates to:
  /// **'Your quiz scores will show up here.'**
  String get noQuizResultsMessage;

  /// No description provided for @quizResults.
  ///
  /// In en, this message translates to:
  /// **'Quiz results'**
  String get quizResults;

  /// No description provided for @justNow.
  ///
  /// In en, this message translates to:
  /// **'Just now'**
  String get justNow;

  /// No description provided for @minutesAgo.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min ago'**
  String minutesAgo(int minutes);

  /// No description provided for @hoursAgo.
  ///
  /// In en, this message translates to:
  /// **'{hours} h ago'**
  String hoursAgo(int hours);

  /// No description provided for @yesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get yesterday;

  /// No description provided for @daysAgo.
  ///
  /// In en, this message translates to:
  /// **'{days} days ago'**
  String daysAgo(int days);

  /// No description provided for @noNotificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'No notifications yet'**
  String get noNotificationsTitle;

  /// No description provided for @noNotificationsMessage.
  ///
  /// In en, this message translates to:
  /// **'New lessons, announcements and answers to your questions will show up here.'**
  String get noNotificationsMessage;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @unread.
  ///
  /// In en, this message translates to:
  /// **'Unread'**
  String get unread;

  /// No description provided for @noOrdersTitle.
  ///
  /// In en, this message translates to:
  /// **'No orders yet'**
  String get noOrdersTitle;

  /// No description provided for @noOrdersMessage.
  ///
  /// In en, this message translates to:
  /// **'Your purchases show up here.'**
  String get noOrdersMessage;

  /// No description provided for @myOrders.
  ///
  /// In en, this message translates to:
  /// **'My orders'**
  String get myOrders;

  /// No description provided for @orderNumber.
  ///
  /// In en, this message translates to:
  /// **'Order #{number}'**
  String orderNumber(String number);

  /// No description provided for @lineQuantity.
  ///
  /// In en, this message translates to:
  /// **'{name} × {quantity}'**
  String lineQuantity(String name, int quantity);

  /// No description provided for @logOutTitle.
  ///
  /// In en, this message translates to:
  /// **'Log out?'**
  String get logOutTitle;

  /// No description provided for @logOutMessage.
  ///
  /// In en, this message translates to:
  /// **'You\'ll need a verification code to sign in again.'**
  String get logOutMessage;

  /// No description provided for @logOut.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get logOut;

  /// No description provided for @edit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get edit;

  /// No description provided for @shopping.
  ///
  /// In en, this message translates to:
  /// **'Shopping'**
  String get shopping;

  /// No description provided for @learning.
  ///
  /// In en, this message translates to:
  /// **'Learning'**
  String get learning;

  /// No description provided for @wishlist.
  ///
  /// In en, this message translates to:
  /// **'Wishlist'**
  String get wishlist;

  /// No description provided for @accountAndApp.
  ///
  /// In en, this message translates to:
  /// **'Account & app'**
  String get accountAndApp;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @helpAndSupport.
  ///
  /// In en, this message translates to:
  /// **'Help & support'**
  String get helpAndSupport;

  /// No description provided for @privacyPolicy.
  ///
  /// In en, this message translates to:
  /// **'Privacy Policy'**
  String get privacyPolicy;

  /// No description provided for @termsAndConditions.
  ///
  /// In en, this message translates to:
  /// **'Terms & Conditions'**
  String get termsAndConditions;

  /// No description provided for @deleteAccountTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete your account?'**
  String get deleteAccountTitle;

  /// No description provided for @deleteAccountMessage.
  ///
  /// In en, this message translates to:
  /// **'Your account, progress and enrollments will be deleted and every device signed out. This can’t be undone.'**
  String get deleteAccountMessage;

  /// No description provided for @deleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete account'**
  String get deleteAccount;

  /// No description provided for @accountDeleted.
  ///
  /// In en, this message translates to:
  /// **'Your account was deleted.'**
  String get accountDeleted;

  /// No description provided for @display.
  ///
  /// In en, this message translates to:
  /// **'Display'**
  String get display;

  /// No description provided for @appearance.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get appearance;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @video.
  ///
  /// In en, this message translates to:
  /// **'Video'**
  String get video;

  /// No description provided for @defaultQuality.
  ///
  /// In en, this message translates to:
  /// **'Default quality'**
  String get defaultQuality;

  /// No description provided for @playbackSpeed.
  ///
  /// In en, this message translates to:
  /// **'Playback speed'**
  String get playbackSpeed;

  /// No description provided for @autoplayNext.
  ///
  /// In en, this message translates to:
  /// **'Autoplay next lesson'**
  String get autoplayNext;

  /// No description provided for @newsAndOffers.
  ///
  /// In en, this message translates to:
  /// **'News and offers'**
  String get newsAndOffers;

  /// No description provided for @notifyNewLessons.
  ///
  /// In en, this message translates to:
  /// **'New lessons in my courses'**
  String get notifyNewLessons;

  /// No description provided for @notifyAnnouncements.
  ///
  /// In en, this message translates to:
  /// **'Instructor announcements'**
  String get notifyAnnouncements;

  /// No description provided for @notifyDailyReminder.
  ///
  /// In en, this message translates to:
  /// **'Daily study reminder'**
  String get notifyDailyReminder;

  /// No description provided for @security.
  ///
  /// In en, this message translates to:
  /// **'Security'**
  String get security;

  /// No description provided for @devicesUsed.
  ///
  /// In en, this message translates to:
  /// **'{used} of {limit}'**
  String devicesUsed(int used, int limit);

  /// No description provided for @version.
  ///
  /// In en, this message translates to:
  /// **'Version {version}'**
  String version(String version);

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @notNow.
  ///
  /// In en, this message translates to:
  /// **'Not now'**
  String get notNow;

  /// No description provided for @welcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome'**
  String get welcome;

  /// No description provided for @signInIntro.
  ///
  /// In en, this message translates to:
  /// **'Sign in with your mobile number and we\'ll send you a verification code.'**
  String get signInIntro;

  /// No description provided for @chooseCountryCode.
  ///
  /// In en, this message translates to:
  /// **'Country code {code}. Choose country code'**
  String chooseCountryCode(String code);

  /// No description provided for @sendCode.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get sendCode;

  /// No description provided for @signInNewHere.
  ///
  /// In en, this message translates to:
  /// **'New here? We\'ll ask for your name after verification and create your account with this number.'**
  String get signInNewHere;

  /// No description provided for @signInRegisteredOnly.
  ///
  /// In en, this message translates to:
  /// **'Use the mobile number registered with {site}.'**
  String signInRegisteredOnly(String site);

  /// No description provided for @tooManyAttemptsSeconds.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Try again in {seconds} seconds.'**
  String tooManyAttemptsSeconds(int seconds);

  /// No description provided for @logoOf.
  ///
  /// In en, this message translates to:
  /// **'{name} logo'**
  String logoOf(String name);

  /// No description provided for @legalAgreeBoth.
  ///
  /// In en, this message translates to:
  /// **'By continuing, you agree to the {terms} and {privacy}'**
  String legalAgreeBoth(String terms, String privacy);

  /// No description provided for @legalAgreeOne.
  ///
  /// In en, this message translates to:
  /// **'By continuing, you agree to the {document}'**
  String legalAgreeOne(String document);

  /// No description provided for @searchCountry.
  ///
  /// In en, this message translates to:
  /// **'Search country or code'**
  String get searchCountry;

  /// No description provided for @useCode.
  ///
  /// In en, this message translates to:
  /// **'Use {code}'**
  String useCode(String code);

  /// No description provided for @codeExpired.
  ///
  /// In en, this message translates to:
  /// **'This code has expired. Request a new one.'**
  String get codeExpired;

  /// No description provided for @noAccountForNumber.
  ///
  /// In en, this message translates to:
  /// **'There\'s no account with this number. Please contact the academy.'**
  String get noAccountForNumber;

  /// No description provided for @newCodeSent.
  ///
  /// In en, this message translates to:
  /// **'We sent you a new code.'**
  String get newCodeSent;

  /// No description provided for @enterCode.
  ///
  /// In en, this message translates to:
  /// **'Enter verification code'**
  String get enterCode;

  /// No description provided for @codeSentTo.
  ///
  /// In en, this message translates to:
  /// **'We sent a code to {number}'**
  String codeSentTo(String number);

  /// No description provided for @changeNumber.
  ///
  /// In en, this message translates to:
  /// **'Change number'**
  String get changeNumber;

  /// No description provided for @resendCodeIn.
  ///
  /// In en, this message translates to:
  /// **'You can request a new code in {time}'**
  String resendCodeIn(String time);

  /// No description provided for @sending.
  ///
  /// In en, this message translates to:
  /// **'Sending…'**
  String get sending;

  /// No description provided for @sendNewCode.
  ///
  /// In en, this message translates to:
  /// **'Send a new code'**
  String get sendNewCode;

  /// No description provided for @verifyAndSignIn.
  ///
  /// In en, this message translates to:
  /// **'Verify & sign in'**
  String get verifyAndSignIn;

  /// No description provided for @codeFieldLabel.
  ///
  /// In en, this message translates to:
  /// **'Verification code, {length} digits'**
  String codeFieldLabel(int length);

  /// No description provided for @createYourAccount.
  ///
  /// In en, this message translates to:
  /// **'Create your account'**
  String get createYourAccount;

  /// No description provided for @signupIntro.
  ///
  /// In en, this message translates to:
  /// **'Your number is verified. Tell us your name to finish joining {site}.'**
  String signupIntro(String site);

  /// No description provided for @createAccount.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get createAccount;

  /// No description provided for @loadingHome.
  ///
  /// In en, this message translates to:
  /// **'Loading home'**
  String get loadingHome;

  /// No description provided for @goodMorning.
  ///
  /// In en, this message translates to:
  /// **'Good morning'**
  String get goodMorning;

  /// No description provided for @goodAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon'**
  String get goodAfternoon;

  /// No description provided for @goodEvening.
  ///
  /// In en, this message translates to:
  /// **'Good evening'**
  String get goodEvening;

  /// No description provided for @continueLearning.
  ///
  /// In en, this message translates to:
  /// **'Continue learning'**
  String get continueLearning;

  /// No description provided for @categories.
  ///
  /// In en, this message translates to:
  /// **'Categories'**
  String get categories;

  /// No description provided for @featuredCourses.
  ///
  /// In en, this message translates to:
  /// **'Featured courses'**
  String get featuredCourses;

  /// No description provided for @latestCourses.
  ///
  /// In en, this message translates to:
  /// **'Latest courses'**
  String get latestCourses;

  /// No description provided for @notificationsUnread.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Notifications, 1 unread} other{Notifications, {count} unread}}'**
  String notificationsUnread(int count);

  /// No description provided for @announcement.
  ///
  /// In en, this message translates to:
  /// **'Announcement'**
  String get announcement;

  /// No description provided for @searchForCourse.
  ///
  /// In en, this message translates to:
  /// **'Search for a course'**
  String get searchForCourse;

  /// No description provided for @welcomeBack.
  ///
  /// In en, this message translates to:
  /// **'Welcome back,'**
  String get welcomeBack;

  /// No description provided for @whatToLearn.
  ///
  /// In en, this message translates to:
  /// **'What do you want to learn?'**
  String get whatToLearn;

  /// No description provided for @forYou.
  ///
  /// In en, this message translates to:
  /// **'For you'**
  String get forYou;

  /// No description provided for @newCourses.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get newCourses;

  /// No description provided for @learn.
  ///
  /// In en, this message translates to:
  /// **'Learn'**
  String get learn;

  /// No description provided for @searchCourses.
  ///
  /// In en, this message translates to:
  /// **'Search courses'**
  String get searchCourses;

  /// No description provided for @newCoursesShowHere.
  ///
  /// In en, this message translates to:
  /// **'New courses will show up here.'**
  String get newCoursesShowHere;

  /// No description provided for @noCoursesYet.
  ///
  /// In en, this message translates to:
  /// **'No courses yet'**
  String get noCoursesYet;

  /// No description provided for @courseCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 course} other{{count} courses}}'**
  String courseCount(int count);

  /// No description provided for @lessonCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 lesson} other{{count} lessons}}'**
  String lessonCount(int count);

  /// No description provided for @questionCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 question} other{{count} questions}}'**
  String questionCount(int count);

  /// No description provided for @answerCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 answer} other{{count} answers}}'**
  String answerCount(int count);

  /// No description provided for @ratingCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 rating} other{{count} ratings}}'**
  String ratingCount(int count);

  /// No description provided for @reviewCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 review} other{{count} reviews}}'**
  String reviewCount(int count);

  /// No description provided for @starCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 star} other{{count} stars}}'**
  String starCount(int count);

  /// No description provided for @enrolled.
  ///
  /// In en, this message translates to:
  /// **'Enrolled'**
  String get enrolled;

  /// No description provided for @ratedOutOf5.
  ///
  /// In en, this message translates to:
  /// **'Rated {rating} of 5'**
  String ratedOutOf5(String rating);

  /// No description provided for @continueCourseLabel.
  ///
  /// In en, this message translates to:
  /// **'Continue {title}, {percent}% complete'**
  String continueCourseLabel(String title, int percent);

  /// No description provided for @continueCourseNextLabel.
  ///
  /// In en, this message translates to:
  /// **'Continue {title}, {percent}% complete, next: {next}'**
  String continueCourseNextLabel(String title, int percent, String next);

  /// No description provided for @lessonsDone.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total} lessons'**
  String lessonsDone(int done, int total);

  /// No description provided for @continueAction.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueAction;

  /// No description provided for @sortPopular.
  ///
  /// In en, this message translates to:
  /// **'Popular'**
  String get sortPopular;

  /// No description provided for @sortAtoZ.
  ///
  /// In en, this message translates to:
  /// **'A to Z'**
  String get sortAtoZ;

  /// No description provided for @allCourses.
  ///
  /// In en, this message translates to:
  /// **'All courses'**
  String get allCourses;

  /// No description provided for @searchCoursesHint.
  ///
  /// In en, this message translates to:
  /// **'Course or instructor name'**
  String get searchCoursesHint;

  /// No description provided for @filtersAndSorting.
  ///
  /// In en, this message translates to:
  /// **'Filters and sorting'**
  String get filtersAndSorting;

  /// No description provided for @paid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get paid;

  /// No description provided for @removeFilter.
  ///
  /// In en, this message translates to:
  /// **'{name}  ×'**
  String removeFilter(String name);

  /// No description provided for @noCoursesFound.
  ///
  /// In en, this message translates to:
  /// **'No courses found'**
  String get noCoursesFound;

  /// No description provided for @noCoursesFoundFiltered.
  ///
  /// In en, this message translates to:
  /// **'Try a different search or clear the filters.'**
  String get noCoursesFoundFiltered;

  /// No description provided for @noCoursesPublished.
  ///
  /// In en, this message translates to:
  /// **'Courses will show up here when they are published.'**
  String get noCoursesPublished;

  /// No description provided for @clearFilters.
  ///
  /// In en, this message translates to:
  /// **'Clear filters'**
  String get clearFilters;

  /// No description provided for @loadMoreFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load more. Try again'**
  String get loadMoreFailed;

  /// No description provided for @loadingMoreCourses.
  ///
  /// In en, this message translates to:
  /// **'Loading more courses'**
  String get loadingMoreCourses;

  /// No description provided for @sortByTitle.
  ///
  /// In en, this message translates to:
  /// **'Sort by'**
  String get sortByTitle;

  /// No description provided for @category.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get category;

  /// No description provided for @categoriesFailed.
  ///
  /// In en, this message translates to:
  /// **'Categories couldn\'t be loaded.'**
  String get categoriesFailed;

  /// No description provided for @showCourses.
  ///
  /// In en, this message translates to:
  /// **'Show courses'**
  String get showCourses;

  /// No description provided for @enrollToOpen.
  ///
  /// In en, this message translates to:
  /// **'Enroll in this course to open this item.'**
  String get enrollToOpen;

  /// No description provided for @assignmentsOnWebsite.
  ///
  /// In en, this message translates to:
  /// **'Assignments and live classes are on the website for now.'**
  String get assignmentsOnWebsite;

  /// No description provided for @enrolledMessage.
  ///
  /// In en, this message translates to:
  /// **'You\'re enrolled. Happy learning!'**
  String get enrolledMessage;

  /// No description provided for @checkout.
  ///
  /// In en, this message translates to:
  /// **'Checkout'**
  String get checkout;

  /// No description provided for @checkoutFailed.
  ///
  /// In en, this message translates to:
  /// **'The checkout couldn\'t be opened.'**
  String get checkoutFailed;

  /// No description provided for @loadingCourse.
  ///
  /// In en, this message translates to:
  /// **'Loading course'**
  String get loadingCourse;

  /// No description provided for @overview.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get overview;

  /// No description provided for @curriculum.
  ///
  /// In en, this message translates to:
  /// **'Curriculum'**
  String get curriculum;

  /// No description provided for @reviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get reviews;

  /// No description provided for @questionsAndAnswers.
  ///
  /// In en, this message translates to:
  /// **'Q&A'**
  String get questionsAndAnswers;

  /// No description provided for @removeFromWishlist.
  ///
  /// In en, this message translates to:
  /// **'Remove from wishlist'**
  String get removeFromWishlist;

  /// No description provided for @addToWishlist.
  ///
  /// In en, this message translates to:
  /// **'Add to wishlist'**
  String get addToWishlist;

  /// No description provided for @certificate.
  ///
  /// In en, this message translates to:
  /// **'Certificate'**
  String get certificate;

  /// No description provided for @instructor.
  ///
  /// In en, this message translates to:
  /// **'Instructor'**
  String get instructor;

  /// No description provided for @noDescription.
  ///
  /// In en, this message translates to:
  /// **'No description yet.'**
  String get noDescription;

  /// No description provided for @aboutInstructor.
  ///
  /// In en, this message translates to:
  /// **'About the instructor'**
  String get aboutInstructor;

  /// No description provided for @curriculumEmpty.
  ///
  /// In en, this message translates to:
  /// **'The curriculum will appear here.'**
  String get curriculumEmpty;

  /// No description provided for @loadingCurriculum.
  ///
  /// In en, this message translates to:
  /// **'Loading curriculum'**
  String get loadingCurriculum;

  /// No description provided for @freePreviewLower.
  ///
  /// In en, this message translates to:
  /// **'free preview'**
  String get freePreviewLower;

  /// No description provided for @lockedLower.
  ///
  /// In en, this message translates to:
  /// **'locked'**
  String get lockedLower;

  /// No description provided for @completedLower.
  ///
  /// In en, this message translates to:
  /// **'completed'**
  String get completedLower;

  /// No description provided for @freePreview.
  ///
  /// In en, this message translates to:
  /// **'Free preview'**
  String get freePreview;

  /// No description provided for @enrollForFree.
  ///
  /// In en, this message translates to:
  /// **'Enroll for free'**
  String get enrollForFree;

  /// No description provided for @enrollNow.
  ///
  /// In en, this message translates to:
  /// **'Enroll now'**
  String get enrollNow;

  /// No description provided for @coursePrice.
  ///
  /// In en, this message translates to:
  /// **'Course price'**
  String get coursePrice;

  /// No description provided for @askQuestion.
  ///
  /// In en, this message translates to:
  /// **'Ask a question'**
  String get askQuestion;

  /// No description provided for @askQuestionHint.
  ///
  /// In en, this message translates to:
  /// **'What would you like to ask about this course?'**
  String get askQuestionHint;

  /// No description provided for @sendQuestion.
  ///
  /// In en, this message translates to:
  /// **'Send question'**
  String get sendQuestion;

  /// No description provided for @loadingQuestions.
  ///
  /// In en, this message translates to:
  /// **'Loading questions'**
  String get loadingQuestions;

  /// No description provided for @noQuestionsTitle.
  ///
  /// In en, this message translates to:
  /// **'No questions yet'**
  String get noQuestionsTitle;

  /// No description provided for @noQuestionsMessage.
  ///
  /// In en, this message translates to:
  /// **'Ask the instructor anything about this course.'**
  String get noQuestionsMessage;

  /// No description provided for @loadingEllipsis.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get loadingEllipsis;

  /// No description provided for @showMoreQuestions.
  ///
  /// In en, this message translates to:
  /// **'Show more questions'**
  String get showMoreQuestions;

  /// No description provided for @noAnswersYet.
  ///
  /// In en, this message translates to:
  /// **'No answers yet'**
  String get noAnswersYet;

  /// No description provided for @writeReply.
  ///
  /// In en, this message translates to:
  /// **'Write a reply'**
  String get writeReply;

  /// No description provided for @sendReply.
  ///
  /// In en, this message translates to:
  /// **'Send reply'**
  String get sendReply;

  /// No description provided for @answerNotification.
  ///
  /// In en, this message translates to:
  /// **'You\'ll get a notification when the instructor answers.'**
  String get answerNotification;

  /// No description provided for @loadingQuestion.
  ///
  /// In en, this message translates to:
  /// **'Loading question'**
  String get loadingQuestion;

  /// No description provided for @writeReview.
  ///
  /// In en, this message translates to:
  /// **'Write a review'**
  String get writeReview;

  /// No description provided for @editReview.
  ///
  /// In en, this message translates to:
  /// **'Edit your review'**
  String get editReview;

  /// No description provided for @reviewHint.
  ///
  /// In en, this message translates to:
  /// **'What did you like? What could be better? (optional)'**
  String get reviewHint;

  /// No description provided for @postReview.
  ///
  /// In en, this message translates to:
  /// **'Post review'**
  String get postReview;

  /// No description provided for @chooseRating.
  ///
  /// In en, this message translates to:
  /// **'Choose a rating from 1 to 5 stars.'**
  String get chooseRating;

  /// No description provided for @reviewPending.
  ///
  /// In en, this message translates to:
  /// **'Thanks! Your review will appear once the academy approves it.'**
  String get reviewPending;

  /// No description provided for @reviewThanks.
  ///
  /// In en, this message translates to:
  /// **'Thanks for your review!'**
  String get reviewThanks;

  /// No description provided for @loadingReviews.
  ///
  /// In en, this message translates to:
  /// **'Loading reviews'**
  String get loadingReviews;

  /// No description provided for @noReviewsBeFirst.
  ///
  /// In en, this message translates to:
  /// **'No reviews yet. Be the first to share what you think.'**
  String get noReviewsBeFirst;

  /// No description provided for @noReviews.
  ///
  /// In en, this message translates to:
  /// **'No reviews yet.'**
  String get noReviews;

  /// No description provided for @showMoreReviews.
  ///
  /// In en, this message translates to:
  /// **'Show more reviews'**
  String get showMoreReviews;

  /// No description provided for @starsCount.
  ///
  /// In en, this message translates to:
  /// **'{stars} stars: {count}'**
  String starsCount(int stars, int count);

  /// No description provided for @reviewAwaitingApproval.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the academy to approve it.'**
  String get reviewAwaitingApproval;

  /// No description provided for @personYou.
  ///
  /// In en, this message translates to:
  /// **'{name} (you)'**
  String personYou(String name);

  /// No description provided for @ratingOutOf5.
  ///
  /// In en, this message translates to:
  /// **'{rating} out of 5'**
  String ratingOutOf5(String rating);

  /// No description provided for @inProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get inProgress;

  /// No description provided for @completed.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get completed;

  /// No description provided for @noCoursesInProgress.
  ///
  /// In en, this message translates to:
  /// **'No courses in progress'**
  String get noCoursesInProgress;

  /// No description provided for @noCompletedCourses.
  ///
  /// In en, this message translates to:
  /// **'No completed courses yet'**
  String get noCompletedCourses;

  /// No description provided for @noCoursesInProgressMessage.
  ///
  /// In en, this message translates to:
  /// **'Courses you enroll in will show up here.'**
  String get noCoursesInProgressMessage;

  /// No description provided for @noCompletedCoursesMessage.
  ///
  /// In en, this message translates to:
  /// **'Finish a course to see it here.'**
  String get noCompletedCoursesMessage;

  /// No description provided for @browseCourses.
  ///
  /// In en, this message translates to:
  /// **'Browse courses'**
  String get browseCourses;

  /// No description provided for @courseProgressLabel.
  ///
  /// In en, this message translates to:
  /// **'{title}, {percent}% complete'**
  String courseProgressLabel(String title, int percent);

  /// No description provided for @courseProgressNextLabel.
  ///
  /// In en, this message translates to:
  /// **'{title}, {percent}% complete, next: {next}'**
  String courseProgressNextLabel(String title, int percent, String next);

  /// No description provided for @nextItem.
  ///
  /// In en, this message translates to:
  /// **'Next: {title}'**
  String nextItem(String title);

  /// No description provided for @wishlistEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Your wishlist is empty'**
  String get wishlistEmptyTitle;

  /// No description provided for @wishlistEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Tap the heart on a course to save it for later.'**
  String get wishlistEmptyMessage;

  /// No description provided for @courseComplete.
  ///
  /// In en, this message translates to:
  /// **'Course complete. Well done!'**
  String get courseComplete;

  /// No description provided for @lessonComplete.
  ///
  /// In en, this message translates to:
  /// **'Lesson complete · {percent}% of the course done'**
  String lessonComplete(int percent);

  /// No description provided for @keepWatching.
  ///
  /// In en, this message translates to:
  /// **'Keep watching'**
  String get keepWatching;

  /// No description provided for @watchMore.
  ///
  /// In en, this message translates to:
  /// **'Watch more of the video before marking this lesson complete.'**
  String get watchMore;

  /// No description provided for @watchAtLeast.
  ///
  /// In en, this message translates to:
  /// **'Watch at least {percent}% of the video before marking this lesson complete.'**
  String watchAtLeast(int percent);

  /// No description provided for @ok.
  ///
  /// In en, this message translates to:
  /// **'OK'**
  String get ok;

  /// No description provided for @loadingLesson.
  ///
  /// In en, this message translates to:
  /// **'Loading lesson'**
  String get loadingLesson;

  /// No description provided for @lessonLocked.
  ///
  /// In en, this message translates to:
  /// **'This lesson is locked'**
  String get lessonLocked;

  /// No description provided for @lessonLockedEnroll.
  ///
  /// In en, this message translates to:
  /// **'Enroll in the course to open this lesson.'**
  String get lessonLockedEnroll;

  /// No description provided for @lessonLockedSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in to open this lesson.'**
  String get lessonLockedSignIn;

  /// No description provided for @lessonPosition.
  ///
  /// In en, this message translates to:
  /// **'Lesson {index} of {total}'**
  String lessonPosition(int index, int total);

  /// No description provided for @lesson.
  ///
  /// In en, this message translates to:
  /// **'Lesson'**
  String get lesson;

  /// No description provided for @lessons.
  ///
  /// In en, this message translates to:
  /// **'Lessons'**
  String get lessons;

  /// No description provided for @notes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get notes;

  /// No description provided for @attachments.
  ///
  /// In en, this message translates to:
  /// **'Attachments'**
  String get attachments;

  /// No description provided for @noAttachments.
  ///
  /// In en, this message translates to:
  /// **'This lesson has no attachments.'**
  String get noAttachments;

  /// No description provided for @previousLesson.
  ///
  /// In en, this message translates to:
  /// **'Previous lesson'**
  String get previousLesson;

  /// No description provided for @signInToTrack.
  ///
  /// In en, this message translates to:
  /// **'Sign in to track progress'**
  String get signInToTrack;

  /// No description provided for @markComplete.
  ///
  /// In en, this message translates to:
  /// **'Mark as complete'**
  String get markComplete;

  /// No description provided for @nextLesson.
  ///
  /// In en, this message translates to:
  /// **'Next lesson'**
  String get nextLesson;

  /// No description provided for @playingNow.
  ///
  /// In en, this message translates to:
  /// **'playing now'**
  String get playingNow;

  /// No description provided for @sizeBytes.
  ///
  /// In en, this message translates to:
  /// **'{size} B'**
  String sizeBytes(int size);

  /// No description provided for @sizeKilobytes.
  ///
  /// In en, this message translates to:
  /// **'{size} KB'**
  String sizeKilobytes(String size);

  /// No description provided for @sizeMegabytes.
  ///
  /// In en, this message translates to:
  /// **'{size} MB'**
  String sizeMegabytes(String size);

  /// No description provided for @videoFailed.
  ///
  /// In en, this message translates to:
  /// **'The video couldn\'t be played.'**
  String get videoFailed;

  /// No description provided for @loadingVideo.
  ///
  /// In en, this message translates to:
  /// **'Loading video'**
  String get loadingVideo;

  /// No description provided for @screenRecording.
  ///
  /// In en, this message translates to:
  /// **'Screen recording is on. Stop recording to keep watching.'**
  String get screenRecording;

  /// No description provided for @videoUnavailable.
  ///
  /// In en, this message translates to:
  /// **'This video isn\'t available.'**
  String get videoUnavailable;

  /// No description provided for @pause.
  ///
  /// In en, this message translates to:
  /// **'Pause'**
  String get pause;

  /// No description provided for @play.
  ///
  /// In en, this message translates to:
  /// **'Play'**
  String get play;

  /// No description provided for @playAgain.
  ///
  /// In en, this message translates to:
  /// **'Play again'**
  String get playAgain;

  /// No description provided for @positionOf.
  ///
  /// In en, this message translates to:
  /// **'{position} of {duration}'**
  String positionOf(String position, String duration);

  /// No description provided for @playbackSpeedIs.
  ///
  /// In en, this message translates to:
  /// **'Playback speed {speed}'**
  String playbackSpeedIs(String speed);

  /// No description provided for @exitFullScreen.
  ///
  /// In en, this message translates to:
  /// **'Exit full screen'**
  String get exitFullScreen;

  /// No description provided for @fullScreen.
  ///
  /// In en, this message translates to:
  /// **'Full screen'**
  String get fullScreen;

  /// No description provided for @loadingEmbed.
  ///
  /// In en, this message translates to:
  /// **'Loading embedded content'**
  String get loadingEmbed;

  /// No description provided for @embedFrom.
  ///
  /// In en, this message translates to:
  /// **'Embedded content from {host}'**
  String embedFrom(String host);

  /// No description provided for @openFullScreen.
  ///
  /// In en, this message translates to:
  /// **'Open full screen'**
  String get openFullScreen;

  /// No description provided for @interactive.
  ///
  /// In en, this message translates to:
  /// **'Interactive'**
  String get interactive;

  /// No description provided for @embeddedContent.
  ///
  /// In en, this message translates to:
  /// **'Embedded content'**
  String get embeddedContent;

  /// No description provided for @opensFullScreen.
  ///
  /// In en, this message translates to:
  /// **'This content opens in full screen.'**
  String get opensFullScreen;

  /// No description provided for @open.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get open;

  /// No description provided for @rotateScreen.
  ///
  /// In en, this message translates to:
  /// **'Rotate screen'**
  String get rotateScreen;

  /// No description provided for @code.
  ///
  /// In en, this message translates to:
  /// **'code'**
  String get code;

  /// No description provided for @codeIn.
  ///
  /// In en, this message translates to:
  /// **'Code in {language}'**
  String codeIn(String language);

  /// No description provided for @copyCode.
  ///
  /// In en, this message translates to:
  /// **'Copy code'**
  String get copyCode;

  /// No description provided for @codeCopied.
  ///
  /// In en, this message translates to:
  /// **'Code copied'**
  String get codeCopied;

  /// No description provided for @copy.
  ///
  /// In en, this message translates to:
  /// **'Copy'**
  String get copy;

  /// No description provided for @answerTrue.
  ///
  /// In en, this message translates to:
  /// **'True'**
  String get answerTrue;

  /// No description provided for @answerFalse.
  ///
  /// In en, this message translates to:
  /// **'False'**
  String get answerFalse;

  /// No description provided for @submitQuizTitle.
  ///
  /// In en, this message translates to:
  /// **'Submit the quiz?'**
  String get submitQuizTitle;

  /// No description provided for @unansweredQuestions.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 question has no answer yet.} other{{count} questions have no answer yet.}}'**
  String unansweredQuestions(int count);

  /// No description provided for @submit.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get submit;

  /// No description provided for @timeUp.
  ///
  /// In en, this message translates to:
  /// **'Time\'s up. Your answers were submitted.'**
  String get timeUp;

  /// No description provided for @leaveQuizTitle.
  ///
  /// In en, this message translates to:
  /// **'Leave the quiz?'**
  String get leaveQuizTitle;

  /// No description provided for @leaveQuizMessage.
  ///
  /// In en, this message translates to:
  /// **'Your answers won\'t be submitted.'**
  String get leaveQuizMessage;

  /// No description provided for @leave.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get leave;

  /// No description provided for @closeQuiz.
  ///
  /// In en, this message translates to:
  /// **'Close quiz'**
  String get closeQuiz;

  /// No description provided for @loadingQuiz.
  ///
  /// In en, this message translates to:
  /// **'Loading quiz'**
  String get loadingQuiz;

  /// No description provided for @timeLeft.
  ///
  /// In en, this message translates to:
  /// **'Time left {time}'**
  String timeLeft(String time);

  /// No description provided for @quizNoQuestions.
  ///
  /// In en, this message translates to:
  /// **'This quiz has no questions yet'**
  String get quizNoQuestions;

  /// No description provided for @questionPosition.
  ///
  /// In en, this message translates to:
  /// **'Question {index} of {total}'**
  String questionPosition(int index, int total);

  /// No description provided for @previous.
  ///
  /// In en, this message translates to:
  /// **'Previous'**
  String get previous;

  /// No description provided for @submitQuiz.
  ///
  /// In en, this message translates to:
  /// **'Submit quiz'**
  String get submitQuiz;

  /// No description provided for @nextQuestion.
  ///
  /// In en, this message translates to:
  /// **'Next question'**
  String get nextQuestion;

  /// No description provided for @timeLimit.
  ///
  /// In en, this message translates to:
  /// **'{duration} time limit'**
  String timeLimit(String duration);

  /// No description provided for @passMark.
  ///
  /// In en, this message translates to:
  /// **'Pass mark {percent}%'**
  String passMark(int percent);

  /// No description provided for @unlimitedAttempts.
  ///
  /// In en, this message translates to:
  /// **'Unlimited attempts'**
  String get unlimitedAttempts;

  /// No description provided for @attemptsUsed.
  ///
  /// In en, this message translates to:
  /// **'{used} of {allowed} attempts used'**
  String attemptsUsed(int used, int allowed);

  /// No description provided for @lastResult.
  ///
  /// In en, this message translates to:
  /// **'Last result'**
  String get lastResult;

  /// No description provided for @startQuiz.
  ///
  /// In en, this message translates to:
  /// **'Start quiz'**
  String get startQuiz;

  /// No description provided for @startNewAttempt.
  ///
  /// In en, this message translates to:
  /// **'Start a new attempt'**
  String get startNewAttempt;

  /// No description provided for @noAttemptsLeft.
  ///
  /// In en, this message translates to:
  /// **'You\'ve used all your attempts for this quiz.'**
  String get noAttemptsLeft;

  /// No description provided for @youPassed.
  ///
  /// In en, this message translates to:
  /// **'You passed'**
  String get youPassed;

  /// No description provided for @notPassedThisTime.
  ///
  /// In en, this message translates to:
  /// **'Not passed this time'**
  String get notPassedThisTime;

  /// No description provided for @submittedForReview.
  ///
  /// In en, this message translates to:
  /// **'Submitted for review'**
  String get submittedForReview;

  /// No description provided for @yourScore.
  ///
  /// In en, this message translates to:
  /// **'Your score: {score}%'**
  String yourScore(String score);

  /// No description provided for @passMarkColon.
  ///
  /// In en, this message translates to:
  /// **'Pass mark: {percent}%'**
  String passMarkColon(int percent);

  /// No description provided for @instructorWillReview.
  ///
  /// In en, this message translates to:
  /// **'Your instructor will review your answers.'**
  String get instructorWillReview;

  /// No description provided for @backToCourse.
  ///
  /// In en, this message translates to:
  /// **'Back to the course'**
  String get backToCourse;

  /// No description provided for @questionNotSupported.
  ///
  /// In en, this message translates to:
  /// **'This question can\'t be shown in the app.'**
  String get questionNotSupported;

  /// No description provided for @answerBelow.
  ///
  /// In en, this message translates to:
  /// **'Answer below. Your answer is saved when you move on.'**
  String get answerBelow;

  /// No description provided for @chooseAll.
  ///
  /// In en, this message translates to:
  /// **'Choose all that apply'**
  String get chooseAll;

  /// No description provided for @chooseOne.
  ///
  /// In en, this message translates to:
  /// **'Choose one answer'**
  String get chooseOne;

  /// No description provided for @quiz.
  ///
  /// In en, this message translates to:
  /// **'Quiz'**
  String get quiz;

  /// No description provided for @noDeliveryDays.
  ///
  /// In en, this message translates to:
  /// **'There are no delivery days available right now.'**
  String get noDeliveryDays;

  /// No description provided for @deliveryDate.
  ///
  /// In en, this message translates to:
  /// **'Delivery date'**
  String get deliveryDate;

  /// No description provided for @deliveryDateOptional.
  ///
  /// In en, this message translates to:
  /// **'Delivery date (optional)'**
  String get deliveryDateOptional;

  /// No description provided for @emptyCartTitle.
  ///
  /// In en, this message translates to:
  /// **'Empty your cart?'**
  String get emptyCartTitle;

  /// No description provided for @emptyCartMessage.
  ///
  /// In en, this message translates to:
  /// **'Everything in your cart will be removed.'**
  String get emptyCartMessage;

  /// No description provided for @emptyCart.
  ///
  /// In en, this message translates to:
  /// **'Empty cart'**
  String get emptyCart;

  /// No description provided for @orderPlaced.
  ///
  /// In en, this message translates to:
  /// **'Thank you! Your order has been placed.'**
  String get orderPlaced;

  /// No description provided for @shopClosedTitle.
  ///
  /// In en, this message translates to:
  /// **'The shop is closed right now'**
  String get shopClosedTitle;

  /// No description provided for @tryLater.
  ///
  /// In en, this message translates to:
  /// **'Please try again later.'**
  String get tryLater;

  /// No description provided for @cartEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Your cart is empty'**
  String get cartEmptyTitle;

  /// No description provided for @cartEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Products you add show up here.'**
  String get cartEmptyMessage;

  /// No description provided for @startShopping.
  ///
  /// In en, this message translates to:
  /// **'Start shopping'**
  String get startShopping;

  /// No description provided for @choose.
  ///
  /// In en, this message translates to:
  /// **'Choose'**
  String get choose;

  /// No description provided for @giftMessage.
  ///
  /// In en, this message translates to:
  /// **'Gift message (optional)'**
  String get giftMessage;

  /// No description provided for @giftMessageHint.
  ///
  /// In en, this message translates to:
  /// **'We will add it to your order.'**
  String get giftMessageHint;

  /// No description provided for @subtotal.
  ///
  /// In en, this message translates to:
  /// **'Subtotal'**
  String get subtotal;

  /// No description provided for @deliveryAndTaxes.
  ///
  /// In en, this message translates to:
  /// **'Delivery and taxes are added at checkout.'**
  String get deliveryAndTaxes;

  /// No description provided for @fixCartItems.
  ///
  /// In en, this message translates to:
  /// **'Change or remove the items marked above to continue.'**
  String get fixCartItems;

  /// No description provided for @chooseDeliveryDate.
  ///
  /// In en, this message translates to:
  /// **'Choose a delivery date to continue.'**
  String get chooseDeliveryDate;

  /// No description provided for @removeItem.
  ///
  /// In en, this message translates to:
  /// **'Remove {name}'**
  String removeItem(String name);

  /// No description provided for @customerReviewsShowHere.
  ///
  /// In en, this message translates to:
  /// **'Reviews from customers show up here.'**
  String get customerReviewsShowHere;

  /// No description provided for @loadingProduct.
  ///
  /// In en, this message translates to:
  /// **'Loading product'**
  String get loadingProduct;

  /// No description provided for @addedToCart.
  ///
  /// In en, this message translates to:
  /// **'Added to cart'**
  String get addedToCart;

  /// No description provided for @cartFull.
  ///
  /// In en, this message translates to:
  /// **'Your cart is full.'**
  String get cartFull;

  /// No description provided for @viewCart.
  ///
  /// In en, this message translates to:
  /// **'View cart'**
  String get viewCart;

  /// No description provided for @cartWithItems.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Cart, 1 item} other{Cart, {count} items}}'**
  String cartWithItems(int count);

  /// No description provided for @youMayAlsoLike.
  ///
  /// In en, this message translates to:
  /// **'You may also like'**
  String get youMayAlsoLike;

  /// No description provided for @addToCart.
  ///
  /// In en, this message translates to:
  /// **'Add to cart'**
  String get addToCart;

  /// No description provided for @chooseOptions.
  ///
  /// In en, this message translates to:
  /// **'Choose {options}'**
  String chooseOptions(String options);

  /// No description provided for @notAvailableInOptions.
  ///
  /// In en, this message translates to:
  /// **'Not available in these options'**
  String get notAvailableInOptions;

  /// No description provided for @outOfStock.
  ///
  /// In en, this message translates to:
  /// **'Out of stock'**
  String get outOfStock;

  /// No description provided for @notSoldInApp.
  ///
  /// In en, this message translates to:
  /// **'This item isn\'t sold in the app.'**
  String get notSoldInApp;

  /// No description provided for @optionsLower.
  ///
  /// In en, this message translates to:
  /// **'options'**
  String get optionsLower;

  /// No description provided for @listAnd.
  ///
  /// In en, this message translates to:
  /// **' and '**
  String get listAnd;

  /// No description provided for @productPhoto.
  ///
  /// In en, this message translates to:
  /// **'Product photo'**
  String get productPhoto;

  /// No description provided for @productPhotoOf.
  ///
  /// In en, this message translates to:
  /// **'Product photo {index} of {total}'**
  String productPhotoOf(int index, int total);

  /// No description provided for @quantity.
  ///
  /// In en, this message translates to:
  /// **'Quantity'**
  String get quantity;

  /// No description provided for @sortBestSelling.
  ///
  /// In en, this message translates to:
  /// **'Best selling'**
  String get sortBestSelling;

  /// No description provided for @sortTopRated.
  ///
  /// In en, this message translates to:
  /// **'Top rated'**
  String get sortTopRated;

  /// No description provided for @sortName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get sortName;

  /// No description provided for @searchProducts.
  ///
  /// In en, this message translates to:
  /// **'Search products'**
  String get searchProducts;

  /// No description provided for @onSale.
  ///
  /// In en, this message translates to:
  /// **'On sale'**
  String get onSale;

  /// No description provided for @loadingProducts.
  ///
  /// In en, this message translates to:
  /// **'Loading products'**
  String get loadingProducts;

  /// No description provided for @noProductsTitle.
  ///
  /// In en, this message translates to:
  /// **'No products found'**
  String get noProductsTitle;

  /// No description provided for @noProductsMessage.
  ///
  /// In en, this message translates to:
  /// **'Try another search or category.'**
  String get noProductsMessage;

  /// No description provided for @loadingMoreProducts.
  ///
  /// In en, this message translates to:
  /// **'Loading more products'**
  String get loadingMoreProducts;

  /// No description provided for @loadingShop.
  ///
  /// In en, this message translates to:
  /// **'Loading the shop'**
  String get loadingShop;

  /// No description provided for @shopGettingReady.
  ///
  /// In en, this message translates to:
  /// **'The shop is getting ready'**
  String get shopGettingReady;

  /// No description provided for @newProductsSoon.
  ///
  /// In en, this message translates to:
  /// **'New products will show up here soon.'**
  String get newProductsSoon;

  /// No description provided for @newArrivals.
  ///
  /// In en, this message translates to:
  /// **'New arrivals'**
  String get newArrivals;

  /// No description provided for @bestSellers.
  ///
  /// In en, this message translates to:
  /// **'Best sellers'**
  String get bestSellers;

  /// No description provided for @offer.
  ///
  /// In en, this message translates to:
  /// **'Offer'**
  String get offer;

  /// No description provided for @wasPrice.
  ///
  /// In en, this message translates to:
  /// **'was {price}'**
  String wasPrice(String price);

  /// No description provided for @inStock.
  ///
  /// In en, this message translates to:
  /// **'In stock'**
  String get inStock;

  /// No description provided for @onBackorder.
  ///
  /// In en, this message translates to:
  /// **'Available on backorder'**
  String get onBackorder;

  /// No description provided for @onSaleLower.
  ///
  /// In en, this message translates to:
  /// **'on sale'**
  String get onSaleLower;

  /// No description provided for @outOfStockLower.
  ///
  /// In en, this message translates to:
  /// **'out of stock'**
  String get outOfStockLower;

  /// No description provided for @sale.
  ///
  /// In en, this message translates to:
  /// **'Sale'**
  String get sale;

  /// No description provided for @fewer.
  ///
  /// In en, this message translates to:
  /// **'Fewer'**
  String get fewer;

  /// No description provided for @quantityIs.
  ///
  /// In en, this message translates to:
  /// **'Quantity {quantity}'**
  String quantityIs(int quantity);

  /// No description provided for @more.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get more;

  /// No description provided for @loadingAppointments.
  ///
  /// In en, this message translates to:
  /// **'Loading appointments'**
  String get loadingAppointments;

  /// No description provided for @noUpcomingAppointments.
  ///
  /// In en, this message translates to:
  /// **'No upcoming appointments'**
  String get noUpcomingAppointments;

  /// No description provided for @noUpcomingAppointmentsMessage.
  ///
  /// In en, this message translates to:
  /// **'Book a time and it shows up here.'**
  String get noUpcomingAppointmentsMessage;

  /// No description provided for @bookAppointment.
  ///
  /// In en, this message translates to:
  /// **'Book an appointment'**
  String get bookAppointment;

  /// No description provided for @noPastAppointments.
  ///
  /// In en, this message translates to:
  /// **'No past appointments'**
  String get noPastAppointments;

  /// No description provided for @upcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get upcoming;

  /// No description provided for @past.
  ///
  /// In en, this message translates to:
  /// **'Past'**
  String get past;

  /// No description provided for @cancelAppointmentTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel this appointment?'**
  String get cancelAppointmentTitle;

  /// No description provided for @cancelAppointment.
  ///
  /// In en, this message translates to:
  /// **'Cancel appointment'**
  String get cancelAppointment;

  /// No description provided for @appointmentCancelled.
  ///
  /// In en, this message translates to:
  /// **'Your appointment is cancelled.'**
  String get appointmentCancelled;

  /// No description provided for @appointment.
  ///
  /// In en, this message translates to:
  /// **'Appointment'**
  String get appointment;

  /// No description provided for @loadingAppointment.
  ///
  /// In en, this message translates to:
  /// **'Loading appointment'**
  String get loadingAppointment;

  /// No description provided for @cancelling.
  ///
  /// In en, this message translates to:
  /// **'Cancelling'**
  String get cancelling;

  /// No description provided for @withStaff.
  ///
  /// In en, this message translates to:
  /// **'With {name}'**
  String withStaff(String name);

  /// No description provided for @withStaffLower.
  ///
  /// In en, this message translates to:
  /// **'with {name}'**
  String withStaffLower(String name);

  /// No description provided for @contactToChange.
  ///
  /// In en, this message translates to:
  /// **'To change or cancel it, please contact us.'**
  String get contactToChange;

  /// No description provided for @tooLateToCancel.
  ///
  /// In en, this message translates to:
  /// **'It\'s too late to cancel in the app. To change it, please contact us.'**
  String get tooLateToCancel;

  /// No description provided for @cancelUpTo.
  ///
  /// In en, this message translates to:
  /// **'You can cancel up to {duration} before it starts.'**
  String cancelUpTo(String duration);

  /// No description provided for @gettingReady.
  ///
  /// In en, this message translates to:
  /// **'Getting ready'**
  String get gettingReady;

  /// No description provided for @servicesSoon.
  ///
  /// In en, this message translates to:
  /// **'Services you can book will show up here soon.'**
  String get servicesSoon;

  /// No description provided for @nextAppointment.
  ///
  /// In en, this message translates to:
  /// **'Your next appointment'**
  String get nextAppointment;

  /// No description provided for @services.
  ///
  /// In en, this message translates to:
  /// **'Services'**
  String get services;

  /// No description provided for @ourTeam.
  ///
  /// In en, this message translates to:
  /// **'Our team'**
  String get ourTeam;

  /// No description provided for @loadingService.
  ///
  /// In en, this message translates to:
  /// **'Loading service'**
  String get loadingService;

  /// No description provided for @appointmentBooked.
  ///
  /// In en, this message translates to:
  /// **'Your appointment is booked.'**
  String get appointmentBooked;

  /// No description provided for @slotTaken.
  ///
  /// In en, this message translates to:
  /// **'This time was just taken. Please choose another one.'**
  String get slotTaken;

  /// No description provided for @withTitle.
  ///
  /// In en, this message translates to:
  /// **'With'**
  String get withTitle;

  /// No description provided for @chooseTime.
  ///
  /// In en, this message translates to:
  /// **'Choose a time'**
  String get chooseTime;

  /// No description provided for @findingTimes.
  ///
  /// In en, this message translates to:
  /// **'Finding free times'**
  String get findingTimes;

  /// No description provided for @bookSlot.
  ///
  /// In en, this message translates to:
  /// **'Book {time}'**
  String bookSlot(String time);

  /// No description provided for @dayAtTime.
  ///
  /// In en, this message translates to:
  /// **'{day} at {time}'**
  String dayAtTime(String day, String time);

  /// No description provided for @noTimesThisWeek.
  ///
  /// In en, this message translates to:
  /// **'No free times this week'**
  String get noTimesThisWeek;

  /// No description provided for @tryAnotherWeek.
  ///
  /// In en, this message translates to:
  /// **'Try another week, or anyone available.'**
  String get tryAnotherWeek;

  /// No description provided for @nextWeek.
  ///
  /// In en, this message translates to:
  /// **'Next week'**
  String get nextWeek;

  /// No description provided for @previousWeek.
  ///
  /// In en, this message translates to:
  /// **'Previous week'**
  String get previousWeek;

  /// No description provided for @noTimesThisDay.
  ///
  /// In en, this message translates to:
  /// **'No free times on this day.'**
  String get noTimesThisDay;

  /// No description provided for @timesIn.
  ///
  /// In en, this message translates to:
  /// **'Times are in {zone} time.'**
  String timesIn(String zone);

  /// No description provided for @anyone.
  ///
  /// In en, this message translates to:
  /// **'Anyone'**
  String get anyone;

  /// No description provided for @freeTimeCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 free time} other{{count} free times}}'**
  String freeTimeCount(int count);

  /// No description provided for @noFreeTimes.
  ///
  /// In en, this message translates to:
  /// **'no free times'**
  String get noFreeTimes;

  /// No description provided for @confirmYourBooking.
  ///
  /// In en, this message translates to:
  /// **'Confirm your booking'**
  String get confirmYourBooking;

  /// No description provided for @anyoneAvailable.
  ///
  /// In en, this message translates to:
  /// **'Anyone available'**
  String get anyoneAvailable;

  /// No description provided for @noteForBusiness.
  ///
  /// In en, this message translates to:
  /// **'Note for the business (optional)'**
  String get noteForBusiness;

  /// No description provided for @confirmBooking.
  ///
  /// In en, this message translates to:
  /// **'Confirm booking'**
  String get confirmBooking;

  /// No description provided for @loadingServices.
  ///
  /// In en, this message translates to:
  /// **'Loading services'**
  String get loadingServices;

  /// No description provided for @noServicesYet.
  ///
  /// In en, this message translates to:
  /// **'No services yet'**
  String get noServicesYet;

  /// No description provided for @noMatches.
  ///
  /// In en, this message translates to:
  /// **'No matches'**
  String get noMatches;

  /// No description provided for @servicesShowHere.
  ///
  /// In en, this message translates to:
  /// **'Services you can book will show up here.'**
  String get servicesShowHere;

  /// No description provided for @tryAnotherWord.
  ///
  /// In en, this message translates to:
  /// **'Try another word.'**
  String get tryAnotherWord;

  /// No description provided for @searchServices.
  ///
  /// In en, this message translates to:
  /// **'Search services'**
  String get searchServices;
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
