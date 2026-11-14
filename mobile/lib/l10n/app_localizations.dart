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
  /// **'My courses'**
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
  /// **'Place or reference'**
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

  /// Button on the empty Favorites and Messages lists of a Real estate app: opens the search.
  ///
  /// In en, this message translates to:
  /// **'Browse listings'**
  String get browseListings;

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

  /// No description provided for @sideMenuOpen.
  ///
  /// In en, this message translates to:
  /// **'Open the menu'**
  String get sideMenuOpen;

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

  /// No description provided for @updateRecommendedTitle.
  ///
  /// In en, this message translates to:
  /// **'A new version is ready'**
  String get updateRecommendedTitle;

  /// No description provided for @updateRecommendedMessage.
  ///
  /// In en, this message translates to:
  /// **'A newer version of {name} is on the store. Update now, or carry on and update later.'**
  String updateRecommendedMessage(String name);

  /// No description provided for @appPausedTitle.
  ///
  /// In en, this message translates to:
  /// **'{name} is paused'**
  String appPausedTitle(String name);

  /// No description provided for @appPausedMessage.
  ///
  /// In en, this message translates to:
  /// **'The owner of {name} can bring it back. Contact them to find out more, or try again later.'**
  String appPausedMessage(String name);

  /// No description provided for @contactOwner.
  ///
  /// In en, this message translates to:
  /// **'Contact {name}'**
  String contactOwner(String name);

  /// No description provided for @membersClosedTitle.
  ///
  /// In en, this message translates to:
  /// **'{name} isn\'t taking new members right now'**
  String membersClosedTitle(String name);

  /// No description provided for @membersClosedMessage.
  ///
  /// In en, this message translates to:
  /// **'Contact {name} to ask about joining. If you already have an account, sign in with the number you used before.'**
  String membersClosedMessage(String name);

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
  /// **'The app is unavailable right now. Please try again later.'**
  String get error503;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get errorGeneric;

  /// No description provided for @errorInvalidResponse.
  ///
  /// In en, this message translates to:
  /// **'The app received a response it couldn\'t read.'**
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

  /// Registered devices when the app has no device limit (limit 0).
  ///
  /// In en, this message translates to:
  /// **'You can use this account on as many devices as you like.'**
  String get deviceNoLimit;

  /// Settings › Registered devices when the app has no device limit.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 device} other{{count} devices}}'**
  String devicesCount(int count);

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

  /// No description provided for @signInWithPhone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get signInWithPhone;

  /// No description provided for @signInWithEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get signInWithEmail;

  /// No description provided for @signInMethodLabel.
  ///
  /// In en, this message translates to:
  /// **'Sign in with'**
  String get signInMethodLabel;

  /// No description provided for @emailAddress.
  ///
  /// In en, this message translates to:
  /// **'Email address'**
  String get emailAddress;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @forgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot your password?'**
  String get forgotPassword;

  /// No description provided for @signInIntroEmail.
  ///
  /// In en, this message translates to:
  /// **'Sign in with your email address and we\'ll send you a verification code.'**
  String get signInIntroEmail;

  /// No description provided for @signInIntroPassword.
  ///
  /// In en, this message translates to:
  /// **'Sign in with the email address and password of your account.'**
  String get signInIntroPassword;

  /// No description provided for @signInNewHereEmail.
  ///
  /// In en, this message translates to:
  /// **'New here? We\'ll ask for your name after verification and create your account with this email address.'**
  String get signInNewHereEmail;

  /// No description provided for @signInPasswordAccountsOnly.
  ///
  /// In en, this message translates to:
  /// **'Use the email address and password of your account on {site}.'**
  String signInPasswordAccountsOnly(String site);

  /// No description provided for @changeEmail.
  ///
  /// In en, this message translates to:
  /// **'Change email'**
  String get changeEmail;

  /// No description provided for @noAccountForEmail.
  ///
  /// In en, this message translates to:
  /// **'There\'s no account with this email address.'**
  String get noAccountForEmail;

  /// No description provided for @invalidEmail.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address.'**
  String get invalidEmail;

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

  /// No description provided for @courseLearn.
  ///
  /// In en, this message translates to:
  /// **'What you\'ll learn'**
  String get courseLearn;

  /// No description provided for @courseRequirements.
  ///
  /// In en, this message translates to:
  /// **'Requirements'**
  String get courseRequirements;

  /// No description provided for @courseAudience.
  ///
  /// In en, this message translates to:
  /// **'Who this course is for'**
  String get courseAudience;

  /// No description provided for @courseIncludes.
  ///
  /// In en, this message translates to:
  /// **'This course includes'**
  String get courseIncludes;

  /// No description provided for @studentCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 student} other{{count} students}}'**
  String studentCount(int count);

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
  /// **'Mark complete'**
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

  /// No description provided for @back10Seconds.
  ///
  /// In en, this message translates to:
  /// **'Back 10 seconds'**
  String get back10Seconds;

  /// No description provided for @forward10Seconds.
  ///
  /// In en, this message translates to:
  /// **'Forward 10 seconds'**
  String get forward10Seconds;

  /// No description provided for @captionsTurnOn.
  ///
  /// In en, this message translates to:
  /// **'Turn captions on'**
  String get captionsTurnOn;

  /// No description provided for @captionsTurnOff.
  ///
  /// In en, this message translates to:
  /// **'Turn captions off'**
  String get captionsTurnOff;

  /// No description provided for @videoQuality.
  ///
  /// In en, this message translates to:
  /// **'Video quality'**
  String get videoQuality;

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

  /// No description provided for @previewTitle.
  ///
  /// In en, this message translates to:
  /// **'App preview'**
  String get previewTitle;

  /// No description provided for @previewInstalledAppOnly.
  ///
  /// In en, this message translates to:
  /// **'Available in the installed app'**
  String get previewInstalledAppOnly;

  /// No description provided for @previewWebPageNote.
  ///
  /// In en, this message translates to:
  /// **'Pages from the web, such as embedded videos and payment pages, open in the installed app.'**
  String get previewWebPageNote;

  /// No description provided for @previewOpenInNewTab.
  ///
  /// In en, this message translates to:
  /// **'Open in a new tab'**
  String get previewOpenInNewTab;

  /// No description provided for @previewCheckoutNote.
  ///
  /// In en, this message translates to:
  /// **'Checkout and payments work in the installed app. The preview never takes payments.'**
  String get previewCheckoutNote;

  /// No description provided for @previewSignInNote.
  ///
  /// In en, this message translates to:
  /// **'This is a preview. Sign in with your app\'s store review number and its code. The preview never sends sign-in codes.'**
  String get previewSignInNote;

  /// No description provided for @previewSignInUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Signing in works in the installed app. Your app\'s server can\'t sign people in from the preview yet.'**
  String get previewSignInUnavailable;

  /// No description provided for @previewNoLink.
  ///
  /// In en, this message translates to:
  /// **'Open the preview from your Yallapp dashboard.'**
  String get previewNoLink;

  /// No description provided for @previewExpired.
  ///
  /// In en, this message translates to:
  /// **'This preview link has expired. Open the preview again from your Yallapp dashboard.'**
  String get previewExpired;

  /// No description provided for @previewInvalid.
  ///
  /// In en, this message translates to:
  /// **'This preview link isn\'t valid. Open the preview from your Yallapp dashboard.'**
  String get previewInvalid;

  /// No description provided for @previewUnreachable.
  ///
  /// In en, this message translates to:
  /// **'The preview couldn\'t load. Check your connection and try again.'**
  String get previewUnreachable;

  /// No description provided for @previewNoContent.
  ///
  /// In en, this message translates to:
  /// **'Choose where your app\'s content comes from on the Website step of your setup, then reload the preview.'**
  String get previewNoContent;

  /// No description provided for @previewNoPlugin.
  ///
  /// In en, this message translates to:
  /// **'Install the Yallapp plugin on your WordPress site and activate your license key in it (Yallapp in the WordPress menu), then reload the preview.'**
  String get previewNoPlugin;

  /// No description provided for @previewBeingSetUp.
  ///
  /// In en, this message translates to:
  /// **'Our team is setting up your WordPress site. The preview shows your app\'s content once it\'s ready.'**
  String get previewBeingSetUp;

  /// No description provided for @previewApiBlocked.
  ///
  /// In en, this message translates to:
  /// **'The preview couldn\'t reach your app\'s content. If your site or API blocks requests from other addresses, allow {origin}. The guide Connect your own API in the Yallapp docs shows how.'**
  String previewApiBlocked(String origin);

  /// What the app calls the business that owns it. lib/core/l10n/vertical_wording.dart picks the word by the app's kind of business (Config.vertical); clinics use their own word, every other kind this default.
  ///
  /// In en, this message translates to:
  /// **'Business'**
  String get wordingBusiness;

  /// What the app calls the business's customers. lib/core/l10n/vertical_wording.dart picks the word by the app's kind of business (Config.vertical); clinics use their own word, every other kind this default.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get wordingCustomer;

  /// What a clinic app calls the business that owns it (vertical_wording.dart).
  ///
  /// In en, this message translates to:
  /// **'Clinic'**
  String get wordingClinic;

  /// What a clinic app calls the clinic's customers (vertical_wording.dart).
  ///
  /// In en, this message translates to:
  /// **'Patient'**
  String get wordingPatient;

  /// Heading above the doctor picker when booking. lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Doctor'**
  String get clinicDoctor;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Our doctors'**
  String get clinicOurDoctors;

  /// The tab and screen with the patient's visits. lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Visits'**
  String get clinicVisits;

  /// Title of one visit. lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Visit'**
  String get clinicVisit;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Book a visit'**
  String get clinicBookVisit;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Your next visit'**
  String get clinicNextVisit;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'No upcoming visits'**
  String get clinicNoUpcomingVisits;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Book a visit and it shows up here.'**
  String get clinicNoUpcomingVisitsMessage;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'No past visits'**
  String get clinicNoPastVisits;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Loading visits'**
  String get clinicLoadingVisits;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Loading visit'**
  String get clinicLoadingVisit;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Cancel visit'**
  String get clinicCancelVisit;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Cancel this visit?'**
  String get clinicCancelVisitTitle;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Your visit is cancelled.'**
  String get clinicVisitCancelled;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Your visit is booked.'**
  String get clinicVisitBooked;

  /// The doctor picker's choice for the first doctor free. lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Any doctor'**
  String get clinicAnyDoctor;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Any available doctor'**
  String get clinicAnyDoctorAvailable;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Note for the clinic (optional)'**
  String get clinicNoteForClinic;

  /// lib/core/l10n/vertical_wording.dart uses it in clinic apps (Config.vertical clinic) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Confirm your visit'**
  String get clinicConfirmVisit;

  /// Title of the intake form shown before booking, when the business asks questions (BookingsConfig.intake_fields).
  ///
  /// In en, this message translates to:
  /// **'A few questions'**
  String get intakeTitle;

  /// Under the intake form's title; business is the business's name.
  ///
  /// In en, this message translates to:
  /// **'Answer these before you book. Only you and {business} see your answers.'**
  String intakeIntro(String business);

  /// Next to an intake question that can be left empty.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get intakeOptional;

  /// No description provided for @intakeRequired.
  ///
  /// In en, this message translates to:
  /// **'Please answer this.'**
  String get intakeRequired;

  /// No description provided for @intakeChooseOne.
  ///
  /// In en, this message translates to:
  /// **'Please choose one.'**
  String get intakeChooseOne;

  /// No description provided for @intakeTooLong.
  ///
  /// In en, this message translates to:
  /// **'Please use at most {max} characters.'**
  String intakeTooLong(int max);

  /// An intake question's date field before a date is chosen.
  ///
  /// In en, this message translates to:
  /// **'Choose a date'**
  String get intakeChooseDate;

  /// Heading of the customer's intake answers on their appointment.
  ///
  /// In en, this message translates to:
  /// **'Your answers'**
  String get yourAnswers;

  /// No description provided for @answersPrivate.
  ///
  /// In en, this message translates to:
  /// **'Only you and {business} see these answers.'**
  String answersPrivate(String business);

  /// On a staff member's (a doctor's) profile.
  ///
  /// In en, this message translates to:
  /// **'Specialties'**
  String get staffSpecialties;

  /// On a staff member's profile: the languages they speak.
  ///
  /// In en, this message translates to:
  /// **'Languages'**
  String get staffLanguages;

  /// On a staff member's profile, above a few lines about them.
  ///
  /// In en, this message translates to:
  /// **'About {name}'**
  String staffAbout(String name);

  /// Opens a staff member's profile (also read by screen readers).
  ///
  /// In en, this message translates to:
  /// **'View profile'**
  String get staffViewProfile;

  /// No description provided for @tabLatest.
  ///
  /// In en, this message translates to:
  /// **'Latest'**
  String get tabLatest;

  /// No description provided for @tabSaved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get tabSaved;

  /// No description provided for @newsTopStories.
  ///
  /// In en, this message translates to:
  /// **'Top stories'**
  String get newsTopStories;

  /// No description provided for @newsLatest.
  ///
  /// In en, this message translates to:
  /// **'Latest'**
  String get newsLatest;

  /// No description provided for @newsAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get newsAll;

  /// No description provided for @newsSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search articles'**
  String get newsSearchHint;

  /// No description provided for @loadingArticles.
  ///
  /// In en, this message translates to:
  /// **'Loading articles'**
  String get loadingArticles;

  /// No description provided for @noArticlesTitle.
  ///
  /// In en, this message translates to:
  /// **'No articles yet'**
  String get noArticlesTitle;

  /// No description provided for @noArticlesMessage.
  ///
  /// In en, this message translates to:
  /// **'New articles will show here.'**
  String get noArticlesMessage;

  /// No description provided for @noArticlesFoundTitle.
  ///
  /// In en, this message translates to:
  /// **'No articles found'**
  String get noArticlesFoundTitle;

  /// No description provided for @noArticlesFoundMessage.
  ///
  /// In en, this message translates to:
  /// **'Try other words or another section.'**
  String get noArticlesFoundMessage;

  /// No description provided for @noSavedTitle.
  ///
  /// In en, this message translates to:
  /// **'No saved articles'**
  String get noSavedTitle;

  /// No description provided for @noSavedMessage.
  ///
  /// In en, this message translates to:
  /// **'Tap the bookmark on an article to keep it here and read it later, even without a connection.'**
  String get noSavedMessage;

  /// Button on the empty Saved list of a News app: opens the articles.
  ///
  /// In en, this message translates to:
  /// **'Browse articles'**
  String get browseArticles;

  /// No description provided for @articleSave.
  ///
  /// In en, this message translates to:
  /// **'Save article'**
  String get articleSave;

  /// No description provided for @articleUnsave.
  ///
  /// In en, this message translates to:
  /// **'Remove from saved'**
  String get articleUnsave;

  /// No description provided for @articleSavedMessage.
  ///
  /// In en, this message translates to:
  /// **'Saved. Find it under Saved.'**
  String get articleSavedMessage;

  /// No description provided for @articleShare.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get articleShare;

  /// No description provided for @articleBy.
  ///
  /// In en, this message translates to:
  /// **'By {author}'**
  String articleBy(String author);

  /// No description provided for @articleOpenOnSite.
  ///
  /// In en, this message translates to:
  /// **'Read on the website'**
  String get articleOpenOnSite;

  /// No description provided for @notifyBreakingNews.
  ///
  /// In en, this message translates to:
  /// **'Breaking news'**
  String get notifyBreakingNews;

  /// What a restaurant app calls the business that owns it (vertical_wording.dart).
  ///
  /// In en, this message translates to:
  /// **'Restaurant'**
  String get wordingRestaurant;

  /// The tab and screen with a restaurant's dishes. lib/core/l10n/vertical_wording.dart uses it in restaurant apps (Config.vertical restaurant) instead of Shop.
  ///
  /// In en, this message translates to:
  /// **'Menu'**
  String get menuTitle;

  /// Search box hint on a restaurant's menu. lib/core/l10n/vertical_wording.dart uses it in restaurant apps (Config.vertical restaurant).
  ///
  /// In en, this message translates to:
  /// **'Search the menu'**
  String get menuSearch;

  /// Button of an empty cart in a restaurant app. lib/core/l10n/vertical_wording.dart uses it in restaurant apps (Config.vertical restaurant).
  ///
  /// In en, this message translates to:
  /// **'See the menu'**
  String get menuBrowse;

  /// The menu has no dishes. lib/core/l10n/vertical_wording.dart uses it in restaurant apps (Config.vertical restaurant).
  ///
  /// In en, this message translates to:
  /// **'No dishes yet'**
  String get menuEmptyTitle;

  /// The menu has no dishes. lib/core/l10n/vertical_wording.dart uses it in restaurant apps (Config.vertical restaurant).
  ///
  /// In en, this message translates to:
  /// **'The menu will be here soon.'**
  String get menuEmptyMessage;

  /// Screen reader label while the menu loads. lib/core/l10n/vertical_wording.dart uses it in restaurant apps (Config.vertical restaurant).
  ///
  /// In en, this message translates to:
  /// **'Loading the menu'**
  String get menuLoading;

  /// The menu's last section: dishes without a category.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get menuMore;

  /// An option group the customer must choose from.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get optionsRequired;

  /// An option group the customer may skip.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get optionsOptional;

  /// How many options of a group to choose.
  ///
  /// In en, this message translates to:
  /// **'Choose 1'**
  String get optionsChooseOne;

  /// How many options of a group to choose.
  ///
  /// In en, this message translates to:
  /// **'Choose up to {count}'**
  String optionsChooseUpTo(int count);

  /// How many options of a group to choose.
  ///
  /// In en, this message translates to:
  /// **'Choose at least {count}'**
  String optionsChooseAtLeast(int count);

  /// The option sheet's button, with the price of the chosen dish and quantity.
  ///
  /// In en, this message translates to:
  /// **'Add to cart · {price}'**
  String optionsAddToCart(String price);

  /// The option sheet's button while a required group has no choice.
  ///
  /// In en, this message translates to:
  /// **'Choose: {group}'**
  String optionsMissing(String group);

  /// Under the option sheet's price.
  ///
  /// In en, this message translates to:
  /// **'The final price is confirmed in the cart.'**
  String get optionsPriceNote;

  /// Heading of the cart's choice between pickup and delivery.
  ///
  /// In en, this message translates to:
  /// **'Pickup or delivery'**
  String get fulfilmentHow;

  /// The customer collects the order.
  ///
  /// In en, this message translates to:
  /// **'Pickup'**
  String get fulfilmentPickup;

  /// The order is delivered.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get fulfilmentDelivery;

  /// Where pickup orders are collected.
  ///
  /// In en, this message translates to:
  /// **'Pick up at {address}'**
  String fulfilmentPickupAt(String address);

  /// Field for the delivery address.
  ///
  /// In en, this message translates to:
  /// **'Delivery address'**
  String get deliveryAddress;

  /// Hint of the delivery address field.
  ///
  /// In en, this message translates to:
  /// **'Street, building and flat'**
  String get deliveryAddressHint;

  /// The district the order goes to.
  ///
  /// In en, this message translates to:
  /// **'District'**
  String get deliveryDistrict;

  /// Field for a note to the courier.
  ///
  /// In en, this message translates to:
  /// **'Note for the courier (optional)'**
  String get deliveryNotes;

  /// The delivery fee line in the cart and on an order.
  ///
  /// In en, this message translates to:
  /// **'Delivery fee'**
  String get deliveryFee;

  /// Shown when a delivery's subtotal is below the minimum.
  ///
  /// In en, this message translates to:
  /// **'The minimum order for delivery is {amount}.'**
  String deliveryMinimum(String amount);

  /// Why checkout is blocked.
  ///
  /// In en, this message translates to:
  /// **'Enter your delivery address.'**
  String get deliveryEnterAddress;

  /// Heading of the cart's time choice.
  ///
  /// In en, this message translates to:
  /// **'When'**
  String get orderTimeTitle;

  /// An order without a chosen time.
  ///
  /// In en, this message translates to:
  /// **'As soon as possible'**
  String get orderAsap;

  /// Under As soon as possible.
  ///
  /// In en, this message translates to:
  /// **'Ready in about {minutes} min'**
  String orderReadyIn(int minutes);

  /// Choose a time for the order.
  ///
  /// In en, this message translates to:
  /// **'Schedule for later'**
  String get orderLater;

  /// Title of the time picker and why checkout is blocked.
  ///
  /// In en, this message translates to:
  /// **'Choose a time'**
  String get orderChooseTime;

  /// A time today.
  ///
  /// In en, this message translates to:
  /// **'Today {time}'**
  String orderToday(String time);

  /// A time tomorrow.
  ///
  /// In en, this message translates to:
  /// **'Tomorrow {time}'**
  String orderTomorrow(String time);

  /// Shown when the kitchen is closed.
  ///
  /// In en, this message translates to:
  /// **'Closed now — opens at {time}'**
  String closedNowOpensAt(String time);

  /// Shown when the kitchen is closed and no opening is known.
  ///
  /// In en, this message translates to:
  /// **'Closed now'**
  String get closedNow;

  /// Under Closed now, when scheduled orders are allowed.
  ///
  /// In en, this message translates to:
  /// **'You can order for later.'**
  String get closedOrderLater;

  /// Under Closed now, when only orders as soon as possible are taken.
  ///
  /// In en, this message translates to:
  /// **'Please order when we\'re open.'**
  String get closedComeBack;

  /// An order's step: received by the kitchen.
  ///
  /// In en, this message translates to:
  /// **'Received'**
  String get fulfilmentReceived;

  /// An order's step.
  ///
  /// In en, this message translates to:
  /// **'Preparing'**
  String get fulfilmentPreparing;

  /// An order's step.
  ///
  /// In en, this message translates to:
  /// **'Ready'**
  String get fulfilmentReady;

  /// An order's step, for pickup orders.
  ///
  /// In en, this message translates to:
  /// **'Ready for pickup'**
  String get fulfilmentReadyPickup;

  /// An order's step, for deliveries.
  ///
  /// In en, this message translates to:
  /// **'Out for delivery'**
  String get fulfilmentOutForDelivery;

  /// An order's step.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get fulfilmentCompleted;

  /// An order's state.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get fulfilmentCancelled;

  /// On a cancelled order.
  ///
  /// In en, this message translates to:
  /// **'This order was cancelled. Please contact us if you have any questions.'**
  String get orderCancelledMessage;

  /// How an order is collected.
  ///
  /// In en, this message translates to:
  /// **'Pickup, as soon as possible'**
  String get orderPickupAsap;

  /// How an order is collected.
  ///
  /// In en, this message translates to:
  /// **'Delivery, as soon as possible'**
  String get orderDeliveryAsap;

  /// How an order is collected.
  ///
  /// In en, this message translates to:
  /// **'Pickup at {time}'**
  String orderPickupAt(String time);

  /// How an order is collected.
  ///
  /// In en, this message translates to:
  /// **'Delivery at {time}'**
  String orderDeliveryAt(String time);

  /// On an order's tracking screen.
  ///
  /// In en, this message translates to:
  /// **'We\'ll send you a notification at each step.'**
  String get orderUpdatesNote;

  /// Heading of an order's items.
  ///
  /// In en, this message translates to:
  /// **'Your order'**
  String get orderYourOrder;

  /// An order's total.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get orderTotal;

  /// Screen reader label while an order loads.
  ///
  /// In en, this message translates to:
  /// **'Loading your order'**
  String get loadingOrder;

  /// What a gym or studio app calls the business that owns it (vertical_wording.dart).
  ///
  /// In en, this message translates to:
  /// **'Gym'**
  String get wordingGym;

  /// What a gym or studio app calls its customers (vertical_wording.dart).
  ///
  /// In en, this message translates to:
  /// **'Member'**
  String get wordingMember;

  /// Heading above the coach picker when booking a personal session. lib/core/l10n/vertical_wording.dart uses it in gym apps (Config.vertical fitness).
  ///
  /// In en, this message translates to:
  /// **'Coach'**
  String get fitnessCoach;

  /// lib/core/l10n/vertical_wording.dart uses it in gym apps (Config.vertical fitness) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Our coaches'**
  String get fitnessOurCoaches;

  /// lib/core/l10n/vertical_wording.dart uses it in gym apps (Config.vertical fitness) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Any coach'**
  String get fitnessAnyCoach;

  /// lib/core/l10n/vertical_wording.dart uses it in gym apps (Config.vertical fitness) instead of the general bookings word.
  ///
  /// In en, this message translates to:
  /// **'Any coach who\'s free'**
  String get fitnessAnyCoachAvailable;

  /// The class timetable's title and tab (a gym's or studio's group classes).
  ///
  /// In en, this message translates to:
  /// **'Classes'**
  String get classesTitle;

  /// Read by screen readers while the timetable loads.
  ///
  /// In en, this message translates to:
  /// **'Loading classes'**
  String get classesLoading;

  /// The timetable on a day without classes.
  ///
  /// In en, this message translates to:
  /// **'No classes this day'**
  String get classesNone;

  /// No description provided for @classesNoneMessage.
  ///
  /// In en, this message translates to:
  /// **'Pick another day to see its classes.'**
  String get classesNoneMessage;

  /// Button on a day without classes in the timetable: opens the next day of the week with a class.
  ///
  /// In en, this message translates to:
  /// **'See the next class'**
  String get classesNextClass;

  /// When the business has no classes in the app.
  ///
  /// In en, this message translates to:
  /// **'No classes yet'**
  String get classesNoTimetable;

  /// No description provided for @classesNoTimetableMessage.
  ///
  /// In en, this message translates to:
  /// **'{business} hasn\'t added its classes to the app yet.'**
  String classesNoTimetableMessage(String business);

  /// Spots left in a class.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 spot left} other{{count} spots left}}'**
  String classSpotsLeft(int count);

  /// A class with no spots left.
  ///
  /// In en, this message translates to:
  /// **'Full'**
  String get classFull;

  /// A class the business called off.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get classCancelledLabel;

  /// On a class the member has a spot in.
  ///
  /// In en, this message translates to:
  /// **'You\'re booked'**
  String get classBookedLabel;

  /// Books a spot in a class.
  ///
  /// In en, this message translates to:
  /// **'Book'**
  String get classBook;

  /// Gives back the member's spot in a class.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get classCancel;

  /// Read by screen readers on a class's Book button.
  ///
  /// In en, this message translates to:
  /// **'Book {name}'**
  String classBookName(String name);

  /// Read by screen readers on a class's Cancel button.
  ///
  /// In en, this message translates to:
  /// **'Cancel your spot in {name}'**
  String classCancelName(String name);

  /// Asks before cancelling a spot in a class.
  ///
  /// In en, this message translates to:
  /// **'Give back your spot?'**
  String get classCancelTitle;

  /// No description provided for @classCancelMessage.
  ///
  /// In en, this message translates to:
  /// **'{name} on {when}. Someone else can take your spot.'**
  String classCancelMessage(String name, String when);

  /// No description provided for @classKeepSpot.
  ///
  /// In en, this message translates to:
  /// **'Keep my spot'**
  String get classKeepSpot;

  /// No description provided for @classBooked.
  ///
  /// In en, this message translates to:
  /// **'You\'re booked for {name}.'**
  String classBooked(String name);

  /// No description provided for @classSpotCancelled.
  ///
  /// In en, this message translates to:
  /// **'Your spot is free again.'**
  String get classSpotCancelled;

  /// Under a class's name: its coach.
  ///
  /// In en, this message translates to:
  /// **'with {name}'**
  String classWith(String name);

  /// No description provided for @classSignInToBook.
  ///
  /// In en, this message translates to:
  /// **'Sign in to book a spot.'**
  String get classSignInToBook;

  /// The membership screen's title and tab.
  ///
  /// In en, this message translates to:
  /// **'Membership'**
  String get membershipTitle;

  /// Read by screen readers.
  ///
  /// In en, this message translates to:
  /// **'Loading your membership'**
  String get membershipLoading;

  /// No description provided for @membershipMine.
  ///
  /// In en, this message translates to:
  /// **'My membership'**
  String get membershipMine;

  /// No description provided for @membershipNone.
  ///
  /// In en, this message translates to:
  /// **'No membership yet'**
  String get membershipNone;

  /// No description provided for @membershipNoneMessage.
  ///
  /// In en, this message translates to:
  /// **'Choose a plan to book classes.'**
  String get membershipNoneMessage;

  /// No description provided for @membershipSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see your membership and buy a plan.'**
  String get membershipSignIn;

  /// No description provided for @membershipUnlimited.
  ///
  /// In en, this message translates to:
  /// **'Unlimited classes'**
  String get membershipUnlimited;

  /// No description provided for @membershipClassesLeft.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 class left} other{{count} classes left}}'**
  String membershipClassesLeft(int count);

  /// Classes a plan includes.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 class} other{{count} classes}}'**
  String membershipClasses(int count);

  /// When a membership ends.
  ///
  /// In en, this message translates to:
  /// **'Until {date}'**
  String membershipUntil(String date);

  /// A pack of classes.
  ///
  /// In en, this message translates to:
  /// **'No end date'**
  String get membershipNoEnd;

  /// No description provided for @membershipEnded.
  ///
  /// In en, this message translates to:
  /// **'Ended'**
  String get membershipEnded;

  /// No description provided for @membershipCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get membershipCancelled;

  /// No description provided for @membershipActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get membershipActive;

  /// Above the membership plans on sale.
  ///
  /// In en, this message translates to:
  /// **'Plans'**
  String get membershipPlans;

  /// No description provided for @membershipNoPlans.
  ///
  /// In en, this message translates to:
  /// **'Plans aren\'t on sale in the app right now. Ask us when you come in.'**
  String get membershipNoPlans;

  /// Buys a membership plan on the payment page.
  ///
  /// In en, this message translates to:
  /// **'Buy'**
  String get membershipBuy;

  /// Read by screen readers on a plan's Buy button.
  ///
  /// In en, this message translates to:
  /// **'Buy {name}'**
  String membershipBuyName(String name);

  /// After a plan's price.
  ///
  /// In en, this message translates to:
  /// **'a month'**
  String get membershipPerMonth;

  /// After a plan's price.
  ///
  /// In en, this message translates to:
  /// **'every 3 months'**
  String get membershipPerQuarter;

  /// After a plan's price.
  ///
  /// In en, this message translates to:
  /// **'a year'**
  String get membershipPerYear;

  /// After a pack's price.
  ///
  /// In en, this message translates to:
  /// **'class pack'**
  String get membershipPack;

  /// No description provided for @membershipBought.
  ///
  /// In en, this message translates to:
  /// **'Your membership is active.'**
  String get membershipBought;

  /// Opens the membership plans, for example when booking a class needs one.
  ///
  /// In en, this message translates to:
  /// **'See plans'**
  String get membershipSeePlans;

  /// Confirms giving back a spot in a class.
  ///
  /// In en, this message translates to:
  /// **'Give back my spot'**
  String get classGiveBack;

  /// No description provided for @tabEvents.
  ///
  /// In en, this message translates to:
  /// **'Events'**
  String get tabEvents;

  /// No description provided for @tabTickets.
  ///
  /// In en, this message translates to:
  /// **'My tickets'**
  String get tabTickets;

  /// No description provided for @eventsSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search events'**
  String get eventsSearchHint;

  /// No description provided for @eventsAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get eventsAll;

  /// Shows the events as a list (beside Calendar).
  ///
  /// In en, this message translates to:
  /// **'List'**
  String get eventsListView;

  /// Shows the events on a month calendar.
  ///
  /// In en, this message translates to:
  /// **'Calendar'**
  String get eventsCalendarView;

  /// No description provided for @loadingEvents.
  ///
  /// In en, this message translates to:
  /// **'Loading events'**
  String get loadingEvents;

  /// No description provided for @noEventsTitle.
  ///
  /// In en, this message translates to:
  /// **'Nothing on yet'**
  String get noEventsTitle;

  /// No description provided for @noEventsMessage.
  ///
  /// In en, this message translates to:
  /// **'New events will show here.'**
  String get noEventsMessage;

  /// No description provided for @noEventsFoundTitle.
  ///
  /// In en, this message translates to:
  /// **'No events found'**
  String get noEventsFoundTitle;

  /// No description provided for @noEventsFoundMessage.
  ///
  /// In en, this message translates to:
  /// **'Try other words or another category.'**
  String get noEventsFoundMessage;

  /// No description provided for @noEventsOnDay.
  ///
  /// In en, this message translates to:
  /// **'Nothing on this day.'**
  String get noEventsOnDay;

  /// No description provided for @eventsPreviousMonth.
  ///
  /// In en, this message translates to:
  /// **'Previous month'**
  String get eventsPreviousMonth;

  /// No description provided for @eventsNextMonth.
  ///
  /// In en, this message translates to:
  /// **'Next month'**
  String get eventsNextMonth;

  /// No description provided for @eventsOnDay.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 event} other{{count} events}}'**
  String eventsOnDay(int count);

  /// No description provided for @eventOnline.
  ///
  /// In en, this message translates to:
  /// **'Online'**
  String get eventOnline;

  /// No description provided for @eventSoldOut.
  ///
  /// In en, this message translates to:
  /// **'Sold out'**
  String get eventSoldOut;

  /// No description provided for @eventCancelledBadge.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get eventCancelledBadge;

  /// No description provided for @eventEndedBadge.
  ///
  /// In en, this message translates to:
  /// **'Ended'**
  String get eventEndedBadge;

  /// No description provided for @eventSpotsLeft.
  ///
  /// In en, this message translates to:
  /// **'{count} left'**
  String eventSpotsLeft(int count);

  /// No description provided for @eventCancelledMessage.
  ///
  /// In en, this message translates to:
  /// **'This event is cancelled.'**
  String get eventCancelledMessage;

  /// No description provided for @eventEndedMessage.
  ///
  /// In en, this message translates to:
  /// **'This event has ended.'**
  String get eventEndedMessage;

  /// No description provided for @eventAddToCalendar.
  ///
  /// In en, this message translates to:
  /// **'Add to calendar'**
  String get eventAddToCalendar;

  /// No description provided for @eventShare.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get eventShare;

  /// No description provided for @eventJoinOnline.
  ///
  /// In en, this message translates to:
  /// **'Join online'**
  String get eventJoinOnline;

  /// No description provided for @eventOnlineNote.
  ///
  /// In en, this message translates to:
  /// **'The link to join is on your ticket.'**
  String get eventOnlineNote;

  /// No description provided for @eventOrganiser.
  ///
  /// In en, this message translates to:
  /// **'By {name}'**
  String eventOrganiser(String name);

  /// No description provided for @eventTicketsTitle.
  ///
  /// In en, this message translates to:
  /// **'Tickets'**
  String get eventTicketsTitle;

  /// No description provided for @eventNoTickets.
  ///
  /// In en, this message translates to:
  /// **'Tickets aren\'t out yet.'**
  String get eventNoTickets;

  /// No description provided for @eventGetTickets.
  ///
  /// In en, this message translates to:
  /// **'Get tickets'**
  String get eventGetTickets;

  /// No description provided for @eventBuyTickets.
  ///
  /// In en, this message translates to:
  /// **'Buy tickets'**
  String get eventBuyTickets;

  /// No description provided for @eventSalesEnded.
  ///
  /// In en, this message translates to:
  /// **'Sales ended'**
  String get eventSalesEnded;

  /// No description provided for @eventSalesEnd.
  ///
  /// In en, this message translates to:
  /// **'Sales end {date}'**
  String eventSalesEnd(String date);

  /// Paid tickets that can't be bought here (an online event on iPhone, or no card payments). Never a link to buy elsewhere.
  ///
  /// In en, this message translates to:
  /// **'Not sold in the app'**
  String get eventNotInApp;

  /// No description provided for @eventYourTickets.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{You have 1 ticket} other{You have {count} tickets}}'**
  String eventYourTickets(int count);

  /// No description provided for @eventSeeTickets.
  ///
  /// In en, this message translates to:
  /// **'See my tickets'**
  String get eventSeeTickets;

  /// No description provided for @eventSeeEvent.
  ///
  /// In en, this message translates to:
  /// **'See the event'**
  String get eventSeeEvent;

  /// No description provided for @ticketsHowMany.
  ///
  /// In en, this message translates to:
  /// **'How many tickets'**
  String get ticketsHowMany;

  /// No description provided for @ticketsNamesTitle.
  ///
  /// In en, this message translates to:
  /// **'Name on each ticket'**
  String get ticketsNamesTitle;

  /// No description provided for @ticketNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Ticket {number}'**
  String ticketNameLabel(int number);

  /// No description provided for @ticketsGetFree.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Get 1 free ticket} other{Get {count} free tickets}}'**
  String ticketsGetFree(int count);

  /// No description provided for @ticketsContinueToPayment.
  ///
  /// In en, this message translates to:
  /// **'Continue to payment'**
  String get ticketsContinueToPayment;

  /// No description provided for @ticketsIssuedMessage.
  ///
  /// In en, this message translates to:
  /// **'Done. Your tickets are under My tickets.'**
  String get ticketsIssuedMessage;

  /// No description provided for @ticketsPaidMessage.
  ///
  /// In en, this message translates to:
  /// **'Payment received. Your tickets are under My tickets.'**
  String get ticketsPaidMessage;

  /// No description provided for @ticketsSignInTitle.
  ///
  /// In en, this message translates to:
  /// **'Your tickets live here'**
  String get ticketsSignInTitle;

  /// No description provided for @ticketsSignInMessage.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see your tickets and show them at the door.'**
  String get ticketsSignInMessage;

  /// No description provided for @noTicketsTitle.
  ///
  /// In en, this message translates to:
  /// **'No tickets yet'**
  String get noTicketsTitle;

  /// No description provided for @noTicketsMessage.
  ///
  /// In en, this message translates to:
  /// **'Tickets you get show here, with a QR code for the door.'**
  String get noTicketsMessage;

  /// Button on the empty My tickets list of an Events app: opens the events.
  ///
  /// In en, this message translates to:
  /// **'Browse events'**
  String get browseEvents;

  /// No description provided for @ticketsOfflineNote.
  ///
  /// In en, this message translates to:
  /// **'You\'re offline: these are the tickets saved on this phone.'**
  String get ticketsOfflineNote;

  /// No description provided for @ticketStatusValid.
  ///
  /// In en, this message translates to:
  /// **'Valid'**
  String get ticketStatusValid;

  /// No description provided for @ticketStatusUsed.
  ///
  /// In en, this message translates to:
  /// **'Used'**
  String get ticketStatusUsed;

  /// No description provided for @ticketStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get ticketStatusCancelled;

  /// 47 A ticket the organiser refunded (it is cancelled and its place freed).
  ///
  /// In en, this message translates to:
  /// **'Refunded'**
  String get ticketStatusRefunded;

  /// 47 What the business refunded of an order or donation, like "Refunded ₺100.00".
  ///
  /// In en, this message translates to:
  /// **'Refunded {amount}'**
  String refundedAmount(String amount);

  /// No description provided for @ticketUsedAt.
  ///
  /// In en, this message translates to:
  /// **'Checked in {time}'**
  String ticketUsedAt(String time);

  /// No description provided for @ticketShowAtDoor.
  ///
  /// In en, this message translates to:
  /// **'Show this code at the door'**
  String get ticketShowAtDoor;

  /// No description provided for @ticketCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel ticket'**
  String get ticketCancel;

  /// No description provided for @ticketCancelTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel this ticket?'**
  String get ticketCancelTitle;

  /// No description provided for @ticketCancelMessage.
  ///
  /// In en, this message translates to:
  /// **'Your place goes back on sale. You can\'t undo this.'**
  String get ticketCancelMessage;

  /// No description provided for @ticketCancelledMessage.
  ///
  /// In en, this message translates to:
  /// **'Ticket cancelled.'**
  String get ticketCancelledMessage;

  /// No description provided for @ticketQrLabel.
  ///
  /// In en, this message translates to:
  /// **'QR code of the ticket for {name}'**
  String ticketQrLabel(String name);

  /// No description provided for @tabCampaigns.
  ///
  /// In en, this message translates to:
  /// **'Campaigns'**
  String get tabCampaigns;

  /// No description provided for @tabMyDonations.
  ///
  /// In en, this message translates to:
  /// **'My donations'**
  String get tabMyDonations;

  /// No description provided for @loadingCampaigns.
  ///
  /// In en, this message translates to:
  /// **'Loading campaigns'**
  String get loadingCampaigns;

  /// No description provided for @noCampaignsTitle.
  ///
  /// In en, this message translates to:
  /// **'No campaigns yet'**
  String get noCampaignsTitle;

  /// No description provided for @noCampaignsMessage.
  ///
  /// In en, this message translates to:
  /// **'Campaigns will show here.'**
  String get noCampaignsMessage;

  /// What a campaign has raised and its goal.
  ///
  /// In en, this message translates to:
  /// **'{raised} of {goal}'**
  String campaignRaisedOf(String raised, String goal);

  /// What a campaign without a goal has raised.
  ///
  /// In en, this message translates to:
  /// **'{raised} raised'**
  String campaignRaised(String raised);

  /// No description provided for @campaignDonors.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No donors yet} =1{1 donor} other{{count} donors}}'**
  String campaignDonors(int count);

  /// No description provided for @campaignGoalReached.
  ///
  /// In en, this message translates to:
  /// **'Goal reached'**
  String get campaignGoalReached;

  /// No description provided for @campaignEnded.
  ///
  /// In en, this message translates to:
  /// **'Ended'**
  String get campaignEnded;

  /// No description provided for @campaignEndsOn.
  ///
  /// In en, this message translates to:
  /// **'Ends {date}'**
  String campaignEndsOn(String date);

  /// No description provided for @donateTitle.
  ///
  /// In en, this message translates to:
  /// **'Donate'**
  String get donateTitle;

  /// No description provided for @donateChooseAmount.
  ///
  /// In en, this message translates to:
  /// **'Choose an amount'**
  String get donateChooseAmount;

  /// No description provided for @donateOtherAmount.
  ///
  /// In en, this message translates to:
  /// **'Other amount'**
  String get donateOtherAmount;

  /// No description provided for @donateMinimum.
  ///
  /// In en, this message translates to:
  /// **'The smallest donation is {amount}.'**
  String donateMinimum(String amount);

  /// No description provided for @donateAmountInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter an amount, like 250.'**
  String get donateAmountInvalid;

  /// No description provided for @donateChooseOne.
  ///
  /// In en, this message translates to:
  /// **'Choose one of the amounts.'**
  String get donateChooseOne;

  /// No description provided for @donateOnce.
  ///
  /// In en, this message translates to:
  /// **'Once'**
  String get donateOnce;

  /// No description provided for @donateMonthly.
  ///
  /// In en, this message translates to:
  /// **'Monthly'**
  String get donateMonthly;

  /// No description provided for @donateAnonymous.
  ///
  /// In en, this message translates to:
  /// **'Give anonymously'**
  String get donateAnonymous;

  /// No description provided for @donateAnonymousHint.
  ///
  /// In en, this message translates to:
  /// **'Your name won\'t show on the campaign.'**
  String get donateAnonymousHint;

  /// No description provided for @donateMessage.
  ///
  /// In en, this message translates to:
  /// **'Message (optional)'**
  String get donateMessage;

  /// No description provided for @donateMessageHint.
  ///
  /// In en, this message translates to:
  /// **'A few words shown with your donation'**
  String get donateMessageHint;

  /// No description provided for @donateButton.
  ///
  /// In en, this message translates to:
  /// **'Donate {amount}'**
  String donateButton(String amount);

  /// The iPhone app's donate button: it opens the donation page in the browser (App Store rules).
  ///
  /// In en, this message translates to:
  /// **'Donate on our website'**
  String get donateOnWebsite;

  /// No description provided for @donateOnWebsiteNote.
  ///
  /// In en, this message translates to:
  /// **'Your donation is made on our website, in your browser. Come back to the app when you\'re done.'**
  String get donateOnWebsiteNote;

  /// No description provided for @donateClosed.
  ///
  /// In en, this message translates to:
  /// **'This campaign has ended. Thank you for your support.'**
  String get donateClosed;

  /// No description provided for @donateThanks.
  ///
  /// In en, this message translates to:
  /// **'Thank you for your donation!'**
  String get donateThanks;

  /// No description provided for @donateFailed.
  ///
  /// In en, this message translates to:
  /// **'The donation page couldn\'t open. Please try again.'**
  String get donateFailed;

  /// No description provided for @donateSignInHint.
  ///
  /// In en, this message translates to:
  /// **'Sign in first to keep your donations and receipts in the app.'**
  String get donateSignInHint;

  /// No description provided for @recentDonations.
  ///
  /// In en, this message translates to:
  /// **'Recent donations'**
  String get recentDonations;

  /// No description provided for @anonymousDonor.
  ///
  /// In en, this message translates to:
  /// **'Anonymous'**
  String get anonymousDonor;

  /// No description provided for @loadingDonations.
  ///
  /// In en, this message translates to:
  /// **'Loading donations'**
  String get loadingDonations;

  /// No description provided for @myDonationsSignInTitle.
  ///
  /// In en, this message translates to:
  /// **'Your donations'**
  String get myDonationsSignInTitle;

  /// No description provided for @myDonationsSignInMessage.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see your donations and their receipts.'**
  String get myDonationsSignInMessage;

  /// No description provided for @noDonationsTitle.
  ///
  /// In en, this message translates to:
  /// **'No donations yet'**
  String get noDonationsTitle;

  /// No description provided for @noDonationsMessage.
  ///
  /// In en, this message translates to:
  /// **'Donations you make while signed in show here, with their receipts.'**
  String get noDonationsMessage;

  /// No description provided for @donationReceipt.
  ///
  /// In en, this message translates to:
  /// **'Receipt'**
  String get donationReceipt;

  /// 71 Button on an order and a donation: downloads the receipt as a PDF (opens in the browser).
  ///
  /// In en, this message translates to:
  /// **'Download receipt'**
  String get downloadReceipt;

  /// 80.4 An order's shipment card, when the shop gave no carrier name.
  ///
  /// In en, this message translates to:
  /// **'Shipment'**
  String get shipmentTitle;

  /// 80.4 When the shop shipped the order.
  ///
  /// In en, this message translates to:
  /// **'Shipped {date}'**
  String shippedOnDate(String date);

  /// No description provided for @trackingNumberLine.
  ///
  /// In en, this message translates to:
  /// **'Tracking number: {number}'**
  String trackingNumberLine(String number);

  /// No description provided for @copyTrackingNumber.
  ///
  /// In en, this message translates to:
  /// **'Copy tracking number'**
  String get copyTrackingNumber;

  /// No description provided for @trackingNumberCopied.
  ///
  /// In en, this message translates to:
  /// **'Tracking number copied.'**
  String get trackingNumberCopied;

  /// 80.4 Opens the carrier's tracking page in the browser.
  ///
  /// In en, this message translates to:
  /// **'Track shipment'**
  String get trackShipment;

  /// No description provided for @waybillLine.
  ///
  /// In en, this message translates to:
  /// **'Waybill: {waybill}'**
  String waybillLine(String waybill);

  /// No description provided for @openWaybill.
  ///
  /// In en, this message translates to:
  /// **'Open the waybill'**
  String get openWaybill;

  /// No description provided for @donationSeeCampaign.
  ///
  /// In en, this message translates to:
  /// **'See the campaign'**
  String get donationSeeCampaign;

  /// No description provided for @notifyCampaignUpdates.
  ///
  /// In en, this message translates to:
  /// **'Campaign updates'**
  String get notifyCampaignUpdates;

  /// Opening hours block: the business is open at this moment.
  ///
  /// In en, this message translates to:
  /// **'Open now'**
  String get pageOpenNow;

  /// Opening hours block: a weekday without opening hours.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get pageClosedDay;

  /// Opening hours block: marks today's row.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get pageToday;

  /// Contact block: opens the address in the phone's maps.
  ///
  /// In en, this message translates to:
  /// **'Directions'**
  String get pageDirections;

  /// Contact block: opens the business's website.
  ///
  /// In en, this message translates to:
  /// **'Website'**
  String get pageWebsite;

  /// No description provided for @countdownDays.
  ///
  /// In en, this message translates to:
  /// **'Days'**
  String get countdownDays;

  /// No description provided for @countdownHours.
  ///
  /// In en, this message translates to:
  /// **'Hours'**
  String get countdownHours;

  /// Countdown block: short for minutes.
  ///
  /// In en, this message translates to:
  /// **'Min'**
  String get countdownMinutes;

  /// Countdown block: short for seconds.
  ///
  /// In en, this message translates to:
  /// **'Sec'**
  String get countdownSeconds;

  /// No description provided for @socialWhatsappChannel.
  ///
  /// In en, this message translates to:
  /// **'WhatsApp channel'**
  String get socialWhatsappChannel;

  /// No description provided for @ratingOutOfFive.
  ///
  /// In en, this message translates to:
  /// **'{count} out of 5 stars'**
  String ratingOutOfFive(int count);

  /// Slider block: which slide is shown, for screen readers.
  ///
  /// In en, this message translates to:
  /// **'Slide {index} of {count}'**
  String slideOf(int index, int count);

  /// No description provided for @privacyGroup.
  ///
  /// In en, this message translates to:
  /// **'Privacy'**
  String get privacyGroup;

  /// No description provided for @shareUsageStatistics.
  ///
  /// In en, this message translates to:
  /// **'Share usage statistics'**
  String get shareUsageStatistics;

  /// No description provided for @shareUsageNote.
  ///
  /// In en, this message translates to:
  /// **'Helps {app} see how the app is used, like which screens and items are opened. Your name, phone number and email address are never sent.'**
  String shareUsageNote(String app);

  /// No description provided for @shareLink.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get shareLink;

  /// No description provided for @sendCrashReports.
  ///
  /// In en, this message translates to:
  /// **'Send crash reports'**
  String get sendCrashReports;

  /// No description provided for @sendCrashReportsHint.
  ///
  /// In en, this message translates to:
  /// **'When something goes wrong, the app sends what happened, its version and the kind of phone, so it can be fixed. Never your name, number or what you typed.'**
  String get sendCrashReportsHint;

  /// No description provided for @downloadNeedsInternetVideo.
  ///
  /// In en, this message translates to:
  /// **'This lesson\'s video plays from a video site, so it needs the internet. It can\'t be saved for offline viewing.'**
  String get downloadNeedsInternetVideo;

  /// No description provided for @downloadNeedsInternetPage.
  ///
  /// In en, this message translates to:
  /// **'This lesson shows a web page, so it needs the internet. It can\'t be saved for offline viewing.'**
  String get downloadNeedsInternetPage;

  /// No description provided for @downloadsOff.
  ///
  /// In en, this message translates to:
  /// **'Saving lessons for offline viewing isn\'t available in this app.'**
  String get downloadsOff;

  /// No description provided for @downloadNotAvailable.
  ///
  /// In en, this message translates to:
  /// **'This lesson can\'t be saved for offline viewing.'**
  String get downloadNotAvailable;

  /// No description provided for @downloadFailed.
  ///
  /// In en, this message translates to:
  /// **'The download didn\'t finish. Try again.'**
  String get downloadFailed;

  /// No description provided for @downloadWaitsForConnection.
  ///
  /// In en, this message translates to:
  /// **'Waiting for a connection.'**
  String get downloadWaitsForConnection;

  /// No description provided for @downloadsSkipped.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 lesson wasn\'t saved: its video plays from a video site, so it needs the internet.} other{{count} lessons weren\'t saved: their videos play from a video site, so they need the internet.}}'**
  String downloadsSkipped(int count);

  /// No description provided for @downloadsExpired.
  ///
  /// In en, this message translates to:
  /// **'Your saved lessons were deleted: the app couldn\'t check your access for {days} days. Connect to the internet and save them again.'**
  String downloadsExpired(int days);

  /// No description provided for @downloadsTurnedOff.
  ///
  /// In en, this message translates to:
  /// **'Your saved lessons were deleted: saving lessons is no longer available in this app.'**
  String get downloadsTurnedOff;

  /// No description provided for @downloadsAccessEnded.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 saved lesson was deleted because your access to it ended.} other{{count} saved lessons were deleted because your access to them ended.}}'**
  String downloadsAccessEnded(int count);

  /// No description provided for @downloadsNotificationRunning.
  ///
  /// In en, this message translates to:
  /// **'Saving for offline'**
  String get downloadsNotificationRunning;

  /// No description provided for @downloadsNotificationPaused.
  ///
  /// In en, this message translates to:
  /// **'Download paused'**
  String get downloadsNotificationPaused;

  /// No description provided for @downloadsNotificationDone.
  ///
  /// In en, this message translates to:
  /// **'Saved for offline'**
  String get downloadsNotificationDone;

  /// No description provided for @downloadsNotificationDoneBody.
  ///
  /// In en, this message translates to:
  /// **'Your lessons are ready to watch without the internet.'**
  String get downloadsNotificationDoneBody;

  /// No description provided for @downloadsNotificationFailed.
  ///
  /// In en, this message translates to:
  /// **'Download failed'**
  String get downloadsNotificationFailed;

  /// No description provided for @downloads.
  ///
  /// In en, this message translates to:
  /// **'Downloads'**
  String get downloads;

  /// No description provided for @downloadLesson.
  ///
  /// In en, this message translates to:
  /// **'Save for offline'**
  String get downloadLesson;

  /// No description provided for @downloadCourse.
  ///
  /// In en, this message translates to:
  /// **'Save course for offline'**
  String get downloadCourse;

  /// No description provided for @downloadSaving.
  ///
  /// In en, this message translates to:
  /// **'Saving for offline · {saved} of {total}'**
  String downloadSaving(int saved, int total);

  /// No description provided for @downloadSavingLesson.
  ///
  /// In en, this message translates to:
  /// **'Saving for offline · {percent}%'**
  String downloadSavingLesson(int percent);

  /// No description provided for @downloadSaved.
  ///
  /// In en, this message translates to:
  /// **'Saved for offline'**
  String get downloadSaved;

  /// No description provided for @downloadCourseSaved.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 lesson saved for offline} other{{count} lessons saved for offline}}'**
  String downloadCourseSaved(int count);

  /// No description provided for @downloadQueued.
  ///
  /// In en, this message translates to:
  /// **'Waiting to download'**
  String get downloadQueued;

  /// No description provided for @downloadPaused.
  ///
  /// In en, this message translates to:
  /// **'Paused'**
  String get downloadPaused;

  /// No description provided for @downloadPause.
  ///
  /// In en, this message translates to:
  /// **'Pause'**
  String get downloadPause;

  /// No description provided for @downloadResume.
  ///
  /// In en, this message translates to:
  /// **'Resume'**
  String get downloadResume;

  /// No description provided for @downloadRetry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get downloadRetry;

  /// No description provided for @downloadCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel download'**
  String get downloadCancel;

  /// No description provided for @downloadDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete from this phone'**
  String get downloadDelete;

  /// No description provided for @downloadsDeleteAll.
  ///
  /// In en, this message translates to:
  /// **'Delete all downloads'**
  String get downloadsDeleteAll;

  /// No description provided for @downloadsDeleteAllConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete every saved lesson from this phone? You can save them again with a connection.'**
  String get downloadsDeleteAllConfirm;

  /// No description provided for @downloadsDeleteCourseConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete this course\'s saved lessons from this phone?'**
  String get downloadsDeleteCourseConfirm;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @downloadsStorage.
  ///
  /// In en, this message translates to:
  /// **'Storage used'**
  String get downloadsStorage;

  /// No description provided for @downloadsWifiOnly.
  ///
  /// In en, this message translates to:
  /// **'Download on Wi-Fi only'**
  String get downloadsWifiOnly;

  /// No description provided for @downloadsWifiOnlyHint.
  ///
  /// In en, this message translates to:
  /// **'Saves your mobile data: downloads wait until you\'re on Wi-Fi.'**
  String get downloadsWifiOnlyHint;

  /// No description provided for @downloadsEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No downloads yet'**
  String get downloadsEmptyTitle;

  /// No description provided for @downloadsEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Save a lesson or a whole course to watch and read it without the internet: look for Save for offline on a course or a lesson.'**
  String get downloadsEmptyMessage;

  /// No description provided for @downloadsNote.
  ///
  /// In en, this message translates to:
  /// **'Saved lessons are kept encrypted inside this app, never in your gallery or files. They\'re deleted when your access to the course ends, or after {days} days without a connection.'**
  String downloadsNote(int days);

  /// No description provided for @downloadsKeptFor.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, =1{Kept for 1 more day without a connection} other{Kept for {days} more days without a connection}}'**
  String downloadsKeptFor(int days);

  /// No description provided for @downloadsUnsupported.
  ///
  /// In en, this message translates to:
  /// **'Downloads work in the app on your phone.'**
  String get downloadsUnsupported;

  /// No description provided for @downloadStarted.
  ///
  /// In en, this message translates to:
  /// **'Saving for offline. You can keep using the app.'**
  String get downloadStarted;

  /// No description provided for @downloadCourseStarted.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Every lesson you can open is already saved.} =1{Saving 1 lesson for offline.} other{Saving {count} lessons for offline.}}'**
  String downloadCourseStarted(int count);

  /// No description provided for @downloadCourseSize.
  ///
  /// In en, this message translates to:
  /// **'{lessons} · {size}'**
  String downloadCourseSize(String lessons, String size);

  /// No description provided for @sizeGigabytes.
  ///
  /// In en, this message translates to:
  /// **'{size} GB'**
  String sizeGigabytes(String size);

  /// No description provided for @lessonCompleteOffline.
  ///
  /// In en, this message translates to:
  /// **'Marked complete. It\'s sent when you\'re back online.'**
  String get lessonCompleteOffline;

  /// No description provided for @reviewCourse.
  ///
  /// In en, this message translates to:
  /// **'Review course'**
  String get reviewCourse;

  /// No description provided for @courseCompletedOn.
  ///
  /// In en, this message translates to:
  /// **'Completed on {date}'**
  String courseCompletedOn(String date);

  /// No description provided for @courseCompletedTitle.
  ///
  /// In en, this message translates to:
  /// **'You\'ve completed this course'**
  String get courseCompletedTitle;

  /// No description provided for @viewCertificate.
  ///
  /// In en, this message translates to:
  /// **'View certificate'**
  String get viewCertificate;

  /// 73 The button of a finished course whose progress can be cleared to take it again.
  ///
  /// In en, this message translates to:
  /// **'Start the course again'**
  String get startCourseAgain;

  /// No description provided for @startCourseAgainTitle.
  ///
  /// In en, this message translates to:
  /// **'Start the course again?'**
  String get startCourseAgainTitle;

  /// No description provided for @startCourseAgainMessage.
  ///
  /// In en, this message translates to:
  /// **'Your progress in this course is cleared: the lessons you completed and where each video stopped. You stay enrolled and start from the first lesson.'**
  String get startCourseAgainMessage;

  /// No description provided for @startCourseAgainConfirm.
  ///
  /// In en, this message translates to:
  /// **'Start again'**
  String get startCourseAgainConfirm;

  /// No description provided for @completedCourseLabel.
  ///
  /// In en, this message translates to:
  /// **'{title}, completed'**
  String completedCourseLabel(String title);

  /// No description provided for @screenProtected.
  ///
  /// In en, this message translates to:
  /// **'This content is protected. It\'s hidden while the screen is recorded or shared.'**
  String get screenProtected;

  /// No description provided for @screenshotProtected.
  ///
  /// In en, this message translates to:
  /// **'This content is protected: screenshots of it aren\'t allowed.'**
  String get screenshotProtected;

  /// No description provided for @fileOpenFailed.
  ///
  /// In en, this message translates to:
  /// **'This file couldn\'t be opened.'**
  String get fileOpenFailed;

  /// No description provided for @fileInAppOnly.
  ///
  /// In en, this message translates to:
  /// **'This file can\'t be shown here'**
  String get fileInAppOnly;

  /// No description provided for @fileInAppOnlyMessage.
  ///
  /// In en, this message translates to:
  /// **'Course files open only inside the app, which shows PDFs, pictures and text. Ask your teacher for this one as a PDF.'**
  String get fileInAppOnlyMessage;

  /// No description provided for @pageOf.
  ///
  /// In en, this message translates to:
  /// **'Page {page} of {total}'**
  String pageOf(int page, int total);

  /// Course page: a course the website protects with a password. The app never asks for the password.
  ///
  /// In en, this message translates to:
  /// **'This course has a password'**
  String get coursePasswordTitle;

  /// Course page, under the password notice, when the course can be opened on the website.
  ///
  /// In en, this message translates to:
  /// **'Enter its password on the website. Once you\'ve joined the course there, it opens here too.'**
  String get coursePasswordWebsite;

  /// Course page, under the password notice, on iPhone for a paid course: no link to the website there.
  ///
  /// In en, this message translates to:
  /// **'It can\'t be opened in the app.'**
  String get coursePasswordInApp;

  /// Course page button that opens a password-protected course on the website, where its password is entered.
  ///
  /// In en, this message translates to:
  /// **'Open on the website'**
  String get courseOpenOnWebsite;

  /// Under a gym member's QR code on the membership screen.
  ///
  /// In en, this message translates to:
  /// **'Show this at the door'**
  String get membershipShowAtDoor;

  /// Read aloud for a gym member's QR code.
  ///
  /// In en, this message translates to:
  /// **'QR code of your {plan} membership'**
  String membershipQrLabel(String plan);

  /// Above the business's reply under a course review.
  ///
  /// In en, this message translates to:
  /// **'Reply from the academy'**
  String get reviewReplyTitle;

  /// Under the student's own review when the business hid it.
  ///
  /// In en, this message translates to:
  /// **'Hidden by the academy. Only you can see it.'**
  String get reviewHiddenNote;

  /// Under the student's own question or answer in a course when the business hid it.
  ///
  /// In en, this message translates to:
  /// **'Hidden by the academy. Only you can see it.'**
  String get qnaHiddenNote;

  /// Status of a membership the business froze.
  ///
  /// In en, this message translates to:
  /// **'Frozen'**
  String get membershipFrozen;

  /// On a frozen membership: the day it's back.
  ///
  /// In en, this message translates to:
  /// **'Frozen until {date}'**
  String membershipFrozenUntil(String date);

  /// On a frozen membership without a day it's back.
  ///
  /// In en, this message translates to:
  /// **'Frozen until it\'s unfrozen'**
  String get membershipFrozenOpen;

  /// On a membership the business will freeze from a later day.
  ///
  /// In en, this message translates to:
  /// **'Frozen from {date}'**
  String membershipFreezesOn(String date);

  /// Under a gym member's QR code while the membership is frozen.
  ///
  /// In en, this message translates to:
  /// **'Your membership is frozen, so this code won\'t let you in until it\'s back.'**
  String get membershipFrozenAtDoor;

  /// No description provided for @tabChat.
  ///
  /// In en, this message translates to:
  /// **'Chat'**
  String get tabChat;

  /// No description provided for @chatTitle.
  ///
  /// In en, this message translates to:
  /// **'Chat'**
  String get chatTitle;

  /// No description provided for @chatLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading chats'**
  String get chatLoading;

  /// No description provided for @chatEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No chats yet'**
  String get chatEmptyTitle;

  /// No description provided for @chatEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Your chats show up here.'**
  String get chatEmptyMessage;

  /// No description provided for @chatSignInTitle.
  ///
  /// In en, this message translates to:
  /// **'Chat with {business}'**
  String chatSignInTitle(String business);

  /// No description provided for @chatSignInMessage.
  ///
  /// In en, this message translates to:
  /// **'Sign in to send messages and get answers here.'**
  String get chatSignInMessage;

  /// No description provided for @chatStart.
  ///
  /// In en, this message translates to:
  /// **'Send a message'**
  String get chatStart;

  /// No description provided for @chatCourseGroup.
  ///
  /// In en, this message translates to:
  /// **'Course group'**
  String get chatCourseGroup;

  /// No description provided for @chatMemberCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 member} other{{count} members}}'**
  String chatMemberCount(int count);

  /// No description provided for @chatNoMessagesTitle.
  ///
  /// In en, this message translates to:
  /// **'Say hello'**
  String get chatNoMessagesTitle;

  /// No description provided for @chatNoMessagesMessage.
  ///
  /// In en, this message translates to:
  /// **'Messages you send and receive show up here.'**
  String get chatNoMessagesMessage;

  /// No description provided for @chatLoadingMessages.
  ///
  /// In en, this message translates to:
  /// **'Loading messages'**
  String get chatLoadingMessages;

  /// No description provided for @chatOlder.
  ///
  /// In en, this message translates to:
  /// **'Show earlier messages'**
  String get chatOlder;

  /// No description provided for @chatAttach.
  ///
  /// In en, this message translates to:
  /// **'Attach'**
  String get chatAttach;

  /// No description provided for @chatGallery.
  ///
  /// In en, this message translates to:
  /// **'Photo or video'**
  String get chatGallery;

  /// No description provided for @chatTakePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take a photo'**
  String get chatTakePhoto;

  /// No description provided for @chatRecordVideo.
  ///
  /// In en, this message translates to:
  /// **'Record a video'**
  String get chatRecordVideo;

  /// No description provided for @chatChooseFile.
  ///
  /// In en, this message translates to:
  /// **'File'**
  String get chatChooseFile;

  /// No description provided for @chatPhoto.
  ///
  /// In en, this message translates to:
  /// **'Photo'**
  String get chatPhoto;

  /// No description provided for @chatVideo.
  ///
  /// In en, this message translates to:
  /// **'Video'**
  String get chatVideo;

  /// No description provided for @chatVoice.
  ///
  /// In en, this message translates to:
  /// **'Voice message'**
  String get chatVoice;

  /// No description provided for @chatFile.
  ///
  /// In en, this message translates to:
  /// **'File'**
  String get chatFile;

  /// No description provided for @chatRecord.
  ///
  /// In en, this message translates to:
  /// **'Record a voice message'**
  String get chatRecord;

  /// No description provided for @chatRecording.
  ///
  /// In en, this message translates to:
  /// **'Recording {time}'**
  String chatRecording(String time);

  /// No description provided for @chatStopAndSend.
  ///
  /// In en, this message translates to:
  /// **'Send voice message'**
  String get chatStopAndSend;

  /// No description provided for @chatMicDenied.
  ///
  /// In en, this message translates to:
  /// **'Allow the microphone in your phone\'s settings to record voice messages.'**
  String get chatMicDenied;

  /// No description provided for @chatSending.
  ///
  /// In en, this message translates to:
  /// **'Sending'**
  String get chatSending;

  /// No description provided for @chatUploading.
  ///
  /// In en, this message translates to:
  /// **'Sending {percent}%'**
  String chatUploading(int percent);

  /// No description provided for @chatNotSent.
  ///
  /// In en, this message translates to:
  /// **'Not sent. Tap to try again.'**
  String get chatNotSent;

  /// No description provided for @chatDeleted.
  ///
  /// In en, this message translates to:
  /// **'This message was deleted.'**
  String get chatDeleted;

  /// No description provided for @chatDeleteMessage.
  ///
  /// In en, this message translates to:
  /// **'Delete message'**
  String get chatDeleteMessage;

  /// No description provided for @chatDeleteConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete this message for everyone?'**
  String get chatDeleteConfirm;

  /// No description provided for @chatReport.
  ///
  /// In en, this message translates to:
  /// **'Report'**
  String get chatReport;

  /// No description provided for @chatReportTitle.
  ///
  /// In en, this message translates to:
  /// **'Why are you reporting this message?'**
  String get chatReportTitle;

  /// No description provided for @chatReportSpam.
  ///
  /// In en, this message translates to:
  /// **'Spam'**
  String get chatReportSpam;

  /// No description provided for @chatReportAbuse.
  ///
  /// In en, this message translates to:
  /// **'Abuse or harassment'**
  String get chatReportAbuse;

  /// No description provided for @chatReportInappropriate.
  ///
  /// In en, this message translates to:
  /// **'Inappropriate content'**
  String get chatReportInappropriate;

  /// No description provided for @chatReportOther.
  ///
  /// In en, this message translates to:
  /// **'Something else'**
  String get chatReportOther;

  /// No description provided for @chatReported.
  ///
  /// In en, this message translates to:
  /// **'Thanks. {business} will look into it.'**
  String chatReported(String business);

  /// No description provided for @chatMembers.
  ///
  /// In en, this message translates to:
  /// **'Members'**
  String get chatMembers;

  /// No description provided for @chatBlock.
  ///
  /// In en, this message translates to:
  /// **'Block'**
  String get chatBlock;

  /// No description provided for @chatUnblock.
  ///
  /// In en, this message translates to:
  /// **'Unblock'**
  String get chatUnblock;

  /// No description provided for @chatBlockTitle.
  ///
  /// In en, this message translates to:
  /// **'Block {name}?'**
  String chatBlockTitle(String name);

  /// No description provided for @chatBlockMessage.
  ///
  /// In en, this message translates to:
  /// **'You won\'t see {name}\'s messages in any group. They won\'t be told.'**
  String chatBlockMessage(String name);

  /// No description provided for @chatBlocked.
  ///
  /// In en, this message translates to:
  /// **'Blocked'**
  String get chatBlocked;

  /// No description provided for @chatCantSend.
  ///
  /// In en, this message translates to:
  /// **'You can read this chat, but you can\'t send messages in it.'**
  String get chatCantSend;

  /// No description provided for @chatTooBig.
  ///
  /// In en, this message translates to:
  /// **'This file is too big to send.'**
  String get chatTooBig;

  /// No description provided for @chatStorageFull.
  ///
  /// In en, this message translates to:
  /// **'Files can\'t be sent right now. You can still send text.'**
  String get chatStorageFull;

  /// No description provided for @chatFileType.
  ///
  /// In en, this message translates to:
  /// **'This kind of file can\'t be sent. Send a photo, a video, or a PDF, Word, Excel, PowerPoint or text file.'**
  String get chatFileType;

  /// No description provided for @chatUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Chat isn\'t available right now.'**
  String get chatUnavailable;

  /// 110 Chat: why a photo or file the customer is sending didn't go.
  ///
  /// In en, this message translates to:
  /// **'The file couldn\'t be sent. Try again.'**
  String get chatUploadRefused;

  /// 110 Chat: why a photo or file the customer is sending didn't go.
  ///
  /// In en, this message translates to:
  /// **'The link for sending the file ran out. Try again.'**
  String get chatUploadExpired;

  /// No description provided for @chatPlayVoice.
  ///
  /// In en, this message translates to:
  /// **'Play voice message'**
  String get chatPlayVoice;

  /// No description provided for @chatPauseVoice.
  ///
  /// In en, this message translates to:
  /// **'Pause voice message'**
  String get chatPauseVoice;

  /// No description provided for @chatOpenFile.
  ///
  /// In en, this message translates to:
  /// **'Open {name}'**
  String chatOpenFile(String name);

  /// No description provided for @chatMessageFrom.
  ///
  /// In en, this message translates to:
  /// **'{name}: {text}'**
  String chatMessageFrom(String name, String text);

  /// No description provided for @chatMore.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get chatMore;

  /// No description provided for @chatBlockPerson.
  ///
  /// In en, this message translates to:
  /// **'Block {name}'**
  String chatBlockPerson(String name);

  /// 90.1 A course lesson that opens later (drip), with its day.
  ///
  /// In en, this message translates to:
  /// **'Opens {date}'**
  String opensOn(String date);

  /// 90.1 The day a student's access to a course ends.
  ///
  /// In en, this message translates to:
  /// **'Access until {date}'**
  String accessUntil(String date);

  /// 90.3 The account item and screen listing the student's memberships, subscriptions and groups on the website.
  ///
  /// In en, this message translates to:
  /// **'My memberships'**
  String get siteMemberships;

  /// No description provided for @siteMembershipsNoneTitle.
  ///
  /// In en, this message translates to:
  /// **'No memberships'**
  String get siteMembershipsNoneTitle;

  /// No description provided for @siteMembershipsNoneMessage.
  ///
  /// In en, this message translates to:
  /// **'Memberships and subscriptions you have on our website show here.'**
  String get siteMembershipsNoneMessage;

  /// No description provided for @siteMembershipsManaged.
  ///
  /// In en, this message translates to:
  /// **'Memberships are managed on our website.'**
  String get siteMembershipsManaged;

  /// No description provided for @siteMembershipActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get siteMembershipActive;

  /// No description provided for @siteMembershipOnHold.
  ///
  /// In en, this message translates to:
  /// **'On hold'**
  String get siteMembershipOnHold;

  /// No description provided for @siteMembershipCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get siteMembershipCancelled;

  /// No description provided for @siteMembershipRenews.
  ///
  /// In en, this message translates to:
  /// **'Renews on {date}'**
  String siteMembershipRenews(String date);

  /// No description provided for @siteMembershipEnds.
  ///
  /// In en, this message translates to:
  /// **'Ends on {date}'**
  String siteMembershipEnds(String date);

  /// No description provided for @siteMembershipCourses.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 course} other{{count} courses}}'**
  String siteMembershipCourses(int count);

  /// No description provided for @courseMembershipTitle.
  ///
  /// In en, this message translates to:
  /// **'For members'**
  String get courseMembershipTitle;

  /// No description provided for @courseMembershipPlans.
  ///
  /// In en, this message translates to:
  /// **'This course comes with a membership on our website: {plans}.'**
  String courseMembershipPlans(String plans);

  /// No description provided for @courseMembershipAny.
  ///
  /// In en, this message translates to:
  /// **'This course comes with a membership on our website.'**
  String get courseMembershipAny;

  /// No description provided for @courseMembershipWebsite.
  ///
  /// In en, this message translates to:
  /// **'See memberships on the website'**
  String get courseMembershipWebsite;

  /// 91.1 The cart's button that shows the coupon field.
  ///
  /// In en, this message translates to:
  /// **'Have a coupon?'**
  String get couponHave;

  /// No description provided for @couponCode.
  ///
  /// In en, this message translates to:
  /// **'Coupon code'**
  String get couponCode;

  /// No description provided for @couponApply.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get couponApply;

  /// No description provided for @couponRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove coupon'**
  String get couponRemove;

  /// 91.1 Under the coupon in the cart when it takes money off.
  ///
  /// In en, this message translates to:
  /// **'{code} applied'**
  String couponApplied(String code);

  /// 91.1 The shop checks coupons only on its own checkout.
  ///
  /// In en, this message translates to:
  /// **'{code} is applied at checkout.'**
  String couponAtCheckout(String code);

  /// 91.1 Shown when the shop gives no reason.
  ///
  /// In en, this message translates to:
  /// **'{code} doesn\'t apply.'**
  String couponNotApplied(String code);

  /// No description provided for @cartDiscount.
  ///
  /// In en, this message translates to:
  /// **'Discount'**
  String get cartDiscount;

  /// No description provided for @cartShipping.
  ///
  /// In en, this message translates to:
  /// **'Shipping'**
  String get cartShipping;

  /// No description provided for @cartTaxes.
  ///
  /// In en, this message translates to:
  /// **'Taxes'**
  String get cartTaxes;

  /// No description provided for @cartTotal.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get cartTotal;

  /// 91.1 Under the cart's total when the checkout still adds to it.
  ///
  /// In en, this message translates to:
  /// **'Plus shipping and taxes at checkout.'**
  String get plusShippingAtCheckout;

  /// 91.2 The settings switch for pushes about the customer's orders: shipped, completed, cancelled or refunded.
  ///
  /// In en, this message translates to:
  /// **'Order updates'**
  String get notifyOrderUpdates;

  /// 91.3 On a completed order: asks the shop to take it back.
  ///
  /// In en, this message translates to:
  /// **'Return this order'**
  String get requestReturn;

  /// 91.3 The title of the sheet where the customer picks the return's reason.
  ///
  /// In en, this message translates to:
  /// **'Why are you returning it?'**
  String get returnReasonTitle;

  /// 91.3 A return reason.
  ///
  /// In en, this message translates to:
  /// **'It arrived damaged'**
  String get returnReasonDamaged;

  /// 91.3 A return reason: not what was ordered.
  ///
  /// In en, this message translates to:
  /// **'Wrong item'**
  String get returnReasonWrongItem;

  /// 91.3 A return reason.
  ///
  /// In en, this message translates to:
  /// **'Not as described'**
  String get returnReasonNotAsDescribed;

  /// 91.3 A return reason.
  ///
  /// In en, this message translates to:
  /// **'No longer needed'**
  String get returnReasonNoLongerNeeded;

  /// 91.3 A return reason; then a note is needed.
  ///
  /// In en, this message translates to:
  /// **'Another reason'**
  String get returnReasonOther;

  /// 91.3 The note field of a return request.
  ///
  /// In en, this message translates to:
  /// **'Note for the shop (optional)'**
  String get returnNote;

  /// 91.3 The note field when the reason is 'Another reason', where it is needed.
  ///
  /// In en, this message translates to:
  /// **'Tell the shop why'**
  String get returnNoteRequired;

  /// 91.3 Sends the return request to the shop.
  ///
  /// In en, this message translates to:
  /// **'Send request'**
  String get sendReturnRequest;

  /// 91.3 Shown after the return request is sent.
  ///
  /// In en, this message translates to:
  /// **'Return requested. The shop will answer here.'**
  String get returnRequested;

  /// 91.3 A return the shop hasn't answered yet.
  ///
  /// In en, this message translates to:
  /// **'Return requested'**
  String get returnStatusRequested;

  /// 91.3 The shop approved the return.
  ///
  /// In en, this message translates to:
  /// **'Return approved'**
  String get returnStatusApproved;

  /// 91.3 The shop declined the return.
  ///
  /// In en, this message translates to:
  /// **'Return declined'**
  String get returnStatusDeclined;

  /// 91.3 What the shop wrote with its answer.
  ///
  /// In en, this message translates to:
  /// **'The shop: {reply}'**
  String returnShopReply(String reply);

  /// 91.4 The account entry and title of the customer's loyalty points.
  ///
  /// In en, this message translates to:
  /// **'My points'**
  String get myPoints;

  /// 91.4 The customer's loyalty points balance.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 point} other{{count} points}}'**
  String pointsBalance(int count);

  /// 91.4 What the balance takes off later orders.
  ///
  /// In en, this message translates to:
  /// **'Worth {value} off your next orders'**
  String pointsWorth(String value);

  /// 91.4 How points are earned and what one is worth.
  ///
  /// In en, this message translates to:
  /// **'Earn 1 point for every {spend} you spend on products. Each point is worth {value}.'**
  String pointsRule(String spend, String value);

  /// 91.4 Under the points in the cart and on My points: the fewest used at once.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Use them once you have 1 point.} other{Use them once you have {count} points.}}'**
  String cartPointsFrom(int count);

  /// 91.4 The cart's switch that uses the customer's points on this order.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Use 1 point} other{Use {count} points}}'**
  String cartUsePoints(int count);

  /// 91.4 Under the cart's points switch: what the points take off.
  ///
  /// In en, this message translates to:
  /// **'{value} off this order'**
  String cartPointsWorth(String value);

  /// 91.4 The cart's line for what the loyalty points take off.
  ///
  /// In en, this message translates to:
  /// **'Points'**
  String get cartPointsDiscount;

  /// 91.4 The heading over the changes to the customer's points.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get pointsHistory;

  /// 91.4 A change to the points: earned on a completed order.
  ///
  /// In en, this message translates to:
  /// **'Earned'**
  String get pointsReasonEarned;

  /// 91.4 A change to the points: used on an order.
  ///
  /// In en, this message translates to:
  /// **'Used'**
  String get pointsReasonUsed;

  /// 91.4 A change to the points: given back when a paid order was cancelled or refunded.
  ///
  /// In en, this message translates to:
  /// **'Given back'**
  String get pointsReasonGivenBack;

  /// 91.4 A change to the points: taken back when an order was refunded or returned.
  ///
  /// In en, this message translates to:
  /// **'Taken back'**
  String get pointsReasonTakenBack;

  /// 91.4 My points without any changes yet.
  ///
  /// In en, this message translates to:
  /// **'No points yet. You earn them when your orders are completed.'**
  String get noPointsYet;

  /// 91.4 On an order: the loyalty points used on it and what they took off.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 point used: −{amount}} other{{count} points used: −{amount}}}'**
  String orderPointsUsed(int count, String amount);

  /// 91.4 On a completed order: the loyalty points it earned.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 point earned} other{{count} points earned}}'**
  String orderPointsEarned(int count);

  /// 91.5 Under the cart's total when the shop's prices include tax: how much of it is tax.
  ///
  /// In en, this message translates to:
  /// **'Includes {amount} {tax}'**
  String cartTaxIncluded(String amount, String tax);

  /// 96.2 On an order to pay by bank transfer or the shop's own method, above the shop's details.
  ///
  /// In en, this message translates to:
  /// **'Pay {total} by {date} as shown below, and give the order number {number} with your payment. The shop confirms your order once the payment arrives.'**
  String payOutsideDue(String total, String date, String number);

  /// 99.4 Form block: shown in place of the form once its answers are sent, when the owner wrote no text for it.
  ///
  /// In en, this message translates to:
  /// **'Sent. Thank you.'**
  String get pageFormSent;

  /// 99.4 Form block whose answers go to the chat: its button while the person is signed out; opens sign-in.
  ///
  /// In en, this message translates to:
  /// **'Sign in to send'**
  String get pageFormSignIn;

  /// 99.4 Form block: under a required field left empty.
  ///
  /// In en, this message translates to:
  /// **'This field is required'**
  String get pageFormRequired;

  /// 99.4 Form block: under an email field whose answer isn't an email address.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email'**
  String get pageFormInvalidEmail;

  /// 99.4 Form block: under a phone field whose answer isn't a phone number.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid phone number'**
  String get pageFormInvalidPhone;

  /// 99.4 Form block: under a number field whose answer isn't a number.
  ///
  /// In en, this message translates to:
  /// **'Enter a number'**
  String get pageFormInvalidNumber;

  /// 99.4 Form block: under a choice field, when none of its choices is picked.
  ///
  /// In en, this message translates to:
  /// **'Choose one'**
  String get pageFormChooseOne;

  /// 100 A membership's subscription in the app: its price in the store, charged each month.
  ///
  /// In en, this message translates to:
  /// **'{price} / month'**
  String storePricePerMonth(String price);

  /// 100 A membership's subscription in the app: its price in the store, charged each year.
  ///
  /// In en, this message translates to:
  /// **'{price} / year'**
  String storePricePerYear(String price);

  /// 100 Course page of a course that comes with a membership: the button that shows the membership's subscriptions sold in the app, and each subscription's button to buy it in the store.
  ///
  /// In en, this message translates to:
  /// **'Subscribe'**
  String get storeSubscribe;

  /// 100 Course page of a course that comes with a membership sold in the app, for a student who has none.
  ///
  /// In en, this message translates to:
  /// **'Subscribe to a membership to open this course.'**
  String get storeMembershipSubscribe;

  /// 100 The subscription terms shown next to a membership's subscriptions sold in the app, as the stores ask. {store} is Google Play or App Store.
  ///
  /// In en, this message translates to:
  /// **'Payment is charged to your {store} account when you confirm the purchase. The subscription renews automatically at the same price each period until you cancel it. You can manage or cancel it in your {store} account settings.'**
  String storeSubscriptionTerms(String store);

  /// 100 Opens the store's page of the person's subscriptions (Google Play or the App Store), to change or cancel one.
  ///
  /// In en, this message translates to:
  /// **'Manage subscription'**
  String get storeManageSubscription;

  /// 100 Course page and Settings: gives this account the courses and memberships bought before with the same store account.
  ///
  /// In en, this message translates to:
  /// **'Restore purchases'**
  String get storeRestorePurchases;

  /// 100 Settings: the heading over Restore purchases and Manage subscription.
  ///
  /// In en, this message translates to:
  /// **'Purchases'**
  String get storePurchasesGroup;

  /// 100 After Restore purchases, when purchases were found for this account.
  ///
  /// In en, this message translates to:
  /// **'Your purchases are restored.'**
  String get storeRestored;

  /// 100 After Restore purchases, when nothing was found for this account.
  ///
  /// In en, this message translates to:
  /// **'There are no purchases to restore for this account.'**
  String get storeRestoredNone;

  /// 100 A purchase in the store that waits for the payment (for example cash at a shop): nothing is given yet.
  ///
  /// In en, this message translates to:
  /// **'Waiting for payment. You\'ll get access once the payment is complete.'**
  String get storePending;

  /// 100 After a membership's subscription was bought in the app and confirmed.
  ///
  /// In en, this message translates to:
  /// **'Your membership is active.'**
  String get storeMembershipActive;

  /// 100 A purchase made in the store that couldn't be confirmed yet (no connection, the store not answering); the app sends it again later.
  ///
  /// In en, this message translates to:
  /// **'Your purchase went through. We couldn\'t confirm it just now and will try again automatically.'**
  String get storeRetryLater;

  /// 100 A purchase from the store that isn't a valid purchase of this app's product.
  ///
  /// In en, this message translates to:
  /// **'This purchase couldn\'t be used. If you were charged, contact us.'**
  String get storeInvalidReceipt;

  /// 100 A purchase from the store that already gives access to another account of the app.
  ///
  /// In en, this message translates to:
  /// **'This purchase belongs to another account in this app. Sign in with that account to use it.'**
  String get storePurchaseInUse;

  /// 100 A purchase from the store that no longer gives access (an ended subscription, a refund).
  ///
  /// In en, this message translates to:
  /// **'This purchase has ended or was refunded.'**
  String get storePurchaseEnded;

  /// 100 The store couldn't make the purchase.
  ///
  /// In en, this message translates to:
  /// **'The purchase didn\'t go through. Try again.'**
  String get storePurchaseFailed;

  /// 100 Buying in the app when the phone's store can't take payments (no Google Play, purchases turned off).
  ///
  /// In en, this message translates to:
  /// **'Purchases aren\'t available on this device right now.'**
  String get storeUnavailable;

  /// 101 The search button and search field in the header of the pages in the bottom tabs.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get headerSearch;

  /// 104 Delivery apps: the tab for sending a parcel.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get tabSend;

  /// 104 Delivery apps: the customer's shipments tab.
  ///
  /// In en, this message translates to:
  /// **'My shipments'**
  String get tabShipments;

  /// 104 Delivery apps: the courier's tab, shown to the company's couriers only.
  ///
  /// In en, this message translates to:
  /// **'Courier'**
  String get tabCourier;

  /// 104 The send screen's title.
  ///
  /// In en, this message translates to:
  /// **'Send a parcel'**
  String get sendTitle;

  /// 104 Choosing a delivery service.
  ///
  /// In en, this message translates to:
  /// **'Service'**
  String get sendService;

  /// 104 Where the courier picks up the parcel.
  ///
  /// In en, this message translates to:
  /// **'Pickup'**
  String get sendPickup;

  /// 104 Where the parcel goes.
  ///
  /// In en, this message translates to:
  /// **'Drop-off'**
  String get sendDropoff;

  /// 104 A place's address field.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get placeAddress;

  /// 104 A place's details field.
  ///
  /// In en, this message translates to:
  /// **'Building, floor, landmark (optional)'**
  String get placeDetails;

  /// 104 Sets a place to the phone's position.
  ///
  /// In en, this message translates to:
  /// **'My location'**
  String get placeUseMyLocation;

  /// 104 Sets a place from a Google Maps or Apple Maps link.
  ///
  /// In en, this message translates to:
  /// **'Paste a maps link'**
  String get placePasteLink;

  /// 104 Sets a place by moving a map.
  ///
  /// In en, this message translates to:
  /// **'On the map'**
  String get placeOnMap;

  /// 104 The place has coordinates.
  ///
  /// In en, this message translates to:
  /// **'Location set'**
  String get placeLocated;

  /// 104 The place has no coordinates, and the price doesn't need them.
  ///
  /// In en, this message translates to:
  /// **'No location yet (optional)'**
  String get placeNotLocated;

  /// 104 The place needs coordinates for pricing by distance.
  ///
  /// In en, this message translates to:
  /// **'Set this place with your location, a maps link or the map: the price is by distance.'**
  String get placeLocationNeeded;

  /// 104 Removes a place's coordinates.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get placeRemoveLocation;

  /// 104 The paste-a-link dialog's title.
  ///
  /// In en, this message translates to:
  /// **'Paste a maps link'**
  String get pasteLinkTitle;

  /// 104 The paste-a-link field's hint.
  ///
  /// In en, this message translates to:
  /// **'A Google Maps or Apple Maps link, or a location shared on WhatsApp'**
  String get pasteLinkHint;

  /// 104 Confirms a pasted link.
  ///
  /// In en, this message translates to:
  /// **'Use this place'**
  String get pasteLinkUse;

  /// 104 A pasted link had no coordinates.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t find a place in this link.'**
  String get pasteLinkFailed;

  /// 104 Location services are off.
  ///
  /// In en, this message translates to:
  /// **'Turn on location in your phone\'s settings.'**
  String get locateOff;

  /// 104 The location permission was refused.
  ///
  /// In en, this message translates to:
  /// **'Allow the app to use your location in your phone\'s settings.'**
  String get locateDenied;

  /// 104 The position couldn't be read.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t find where you are. Try again or set the place on the map.'**
  String get locateFailed;

  /// 104 The map picker's title.
  ///
  /// In en, this message translates to:
  /// **'Move the map to the place'**
  String get mapPickTitle;

  /// 104 Confirms the place under the pin.
  ///
  /// In en, this message translates to:
  /// **'Use this place'**
  String get mapPickConfirm;

  /// 104 The drop-off area (pricing by area).
  ///
  /// In en, this message translates to:
  /// **'Area'**
  String get sendZone;

  /// 104 Who receives the parcel.
  ///
  /// In en, this message translates to:
  /// **'Recipient'**
  String get sendRecipient;

  /// 104 The recipient's name field.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get recipientName;

  /// 104 The recipient's number field.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get recipientPhone;

  /// 104 The parcel's size and contents.
  ///
  /// In en, this message translates to:
  /// **'Parcel'**
  String get sendParcelSection;

  /// 104 A parcel's size.
  ///
  /// In en, this message translates to:
  /// **'Small'**
  String get parcelSmall;

  /// 104 A parcel's size.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get parcelMedium;

  /// 104 A parcel's size.
  ///
  /// In en, this message translates to:
  /// **'Large'**
  String get parcelLarge;

  /// 104 The parcel's contents field.
  ///
  /// In en, this message translates to:
  /// **'What\'s inside (optional)'**
  String get parcelDescription;

  /// 104 Notes for the courier.
  ///
  /// In en, this message translates to:
  /// **'Notes for the courier (optional)'**
  String get sendNotes;

  /// 104 How the customer pays.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get sendPayment;

  /// 104 Paying in cash at the drop-off.
  ///
  /// In en, this message translates to:
  /// **'Cash to the courier'**
  String get payCash;

  /// 104 Paying by card on the company's payment page.
  ///
  /// In en, this message translates to:
  /// **'Card'**
  String get payCard;

  /// 104 The price before sending.
  ///
  /// In en, this message translates to:
  /// **'Price'**
  String get sendPrice;

  /// 104 The price is being worked out.
  ///
  /// In en, this message translates to:
  /// **'Calculating…'**
  String get sendPriceCalculating;

  /// 104 No price yet.
  ///
  /// In en, this message translates to:
  /// **'Enter both addresses to see the price.'**
  String get sendPriceMissing;

  /// 104 A distance in kilometres.
  ///
  /// In en, this message translates to:
  /// **'{km} km'**
  String distanceKm(String km);

  /// 104 Sends the parcel.
  ///
  /// In en, this message translates to:
  /// **'Send the parcel'**
  String get sendButton;

  /// 104 Sending needs an account.
  ///
  /// In en, this message translates to:
  /// **'Sign in to send'**
  String get sendSignIn;

  /// 104 An address is missing.
  ///
  /// In en, this message translates to:
  /// **'Enter the pickup and drop-off addresses.'**
  String get sendFillPlace;

  /// 104 The recipient is missing.
  ///
  /// In en, this message translates to:
  /// **'Enter the recipient\'s name and mobile number.'**
  String get sendFillRecipient;

  /// 104 A cash shipment was sent.
  ///
  /// In en, this message translates to:
  /// **'Sent. We\'ll tell you when a courier is on the way.'**
  String get sendSent;

  /// 104 A card shipment was paid.
  ///
  /// In en, this message translates to:
  /// **'Paid. Your parcel is waiting for a courier.'**
  String get sendPaid;

  /// 104 The shipments list is loading.
  ///
  /// In en, this message translates to:
  /// **'Loading shipments'**
  String get loadingShipments;

  /// 104 The customer has sent nothing.
  ///
  /// In en, this message translates to:
  /// **'No shipments yet'**
  String get noShipmentsTitle;

  /// 104 The empty shipments list.
  ///
  /// In en, this message translates to:
  /// **'Parcels you send show here, with each stage.'**
  String get noShipmentsMessage;

  /// 104 Signed out on My shipments.
  ///
  /// In en, this message translates to:
  /// **'Your shipments'**
  String get shipmentsSignInTitle;

  /// 104 Signed out on My shipments.
  ///
  /// In en, this message translates to:
  /// **'Sign in to send parcels and follow them.'**
  String get shipmentsSignInMessage;

  /// 104 A shipment's page title, like "Shipment S-1042".
  ///
  /// In en, this message translates to:
  /// **'Shipment {reference}'**
  String shipmentHeading(String reference);

  /// 104 A shipment's stage.
  ///
  /// In en, this message translates to:
  /// **'Waiting for payment'**
  String get shipmentAwaitingPayment;

  /// 104 A shipment's stage.
  ///
  /// In en, this message translates to:
  /// **'Waiting for a courier'**
  String get shipmentPending;

  /// 104 A shipment's stage.
  ///
  /// In en, this message translates to:
  /// **'Courier on the way to pick up'**
  String get shipmentAssigned;

  /// 104 A shipment's stage.
  ///
  /// In en, this message translates to:
  /// **'Picked up'**
  String get shipmentPickedUp;

  /// 104 A shipment's stage.
  ///
  /// In en, this message translates to:
  /// **'On the way'**
  String get shipmentOnTheWay;

  /// 104 A shipment's stage.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get shipmentDelivered;

  /// 104 A shipment's stage.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t be delivered'**
  String get shipmentFailed;

  /// 104 A shipment's stage.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get shipmentCancelled;

  /// 104 The shipment's courier.
  ///
  /// In en, this message translates to:
  /// **'Courier'**
  String get shipmentCourier;

  /// 104 Calls the courier.
  ///
  /// In en, this message translates to:
  /// **'Call'**
  String get callCourier;

  /// 104 No courier yet.
  ///
  /// In en, this message translates to:
  /// **'We\'re finding a courier for your parcel.'**
  String get shipmentWaitingCourier;

  /// 104 When the courier's position was sent.
  ///
  /// In en, this message translates to:
  /// **'The courier\'s position at {time}'**
  String trackingCourierAt(String time);

  /// 104 Opens the courier's position in the phone's maps.
  ///
  /// In en, this message translates to:
  /// **'Open in maps'**
  String get trackingOpenMap;

  /// 104 Live tracking without a position yet.
  ///
  /// In en, this message translates to:
  /// **'You\'ll see where the courier is once they share their position.'**
  String get trackingNoPosition;

  /// 104 The shipment is paid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get paymentPaid;

  /// 104 The shipment isn't paid yet.
  ///
  /// In en, this message translates to:
  /// **'Not paid yet'**
  String get paymentUnpaid;

  /// 104 Pays a card shipment.
  ///
  /// In en, this message translates to:
  /// **'Pay now'**
  String get payNow;

  /// 104 Cancels a shipment that waits.
  ///
  /// In en, this message translates to:
  /// **'Cancel the shipment'**
  String get cancelShipment;

  /// 104 Asks before cancelling.
  ///
  /// In en, this message translates to:
  /// **'Cancel this shipment?'**
  String get cancelShipmentConfirm;

  /// 104 Confirms cancelling.
  ///
  /// In en, this message translates to:
  /// **'Cancel it'**
  String get cancelShipmentYes;

  /// 104 Doesn't cancel.
  ///
  /// In en, this message translates to:
  /// **'Keep it'**
  String get keepIt;

  /// 104 The shipment was cancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled.'**
  String get shipmentCancelledToast;

  /// 104 The shipment's stages.
  ///
  /// In en, this message translates to:
  /// **'Stages'**
  String get shipmentStages;

  /// 104 Directions to a place in the phone's maps.
  ///
  /// In en, this message translates to:
  /// **'Directions'**
  String get directionsButton;

  /// 104 The courier's screen title.
  ///
  /// In en, this message translates to:
  /// **'Courier'**
  String get courierTitle;

  /// 104 The courier's on-duty switch.
  ///
  /// In en, this message translates to:
  /// **'On duty'**
  String get courierOnDuty;

  /// 104 The courier is off duty.
  ///
  /// In en, this message translates to:
  /// **'Off duty: you\'re not offered new jobs.'**
  String get courierOffDutyHint;

  /// 104 How many the courier delivered today.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Nothing delivered today yet} =1{1 delivered today} other{{count} delivered today}}'**
  String courierDeliveredToday(int count);

  /// 104 The courier's jobs.
  ///
  /// In en, this message translates to:
  /// **'My jobs'**
  String get courierMyJobs;

  /// 104 Jobs waiting for a courier.
  ///
  /// In en, this message translates to:
  /// **'Waiting'**
  String get courierWaiting;

  /// 104 The courier's done jobs.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get courierDone;

  /// 104 The courier's jobs are loading.
  ///
  /// In en, this message translates to:
  /// **'Loading jobs'**
  String get loadingJobs;

  /// 104 An empty job list.
  ///
  /// In en, this message translates to:
  /// **'No jobs here'**
  String get noJobsTitle;

  /// 104 An empty job list.
  ///
  /// In en, this message translates to:
  /// **'New jobs show here, and you get a notification.'**
  String get noJobsMessage;

  /// 104 No jobs waiting for a courier.
  ///
  /// In en, this message translates to:
  /// **'No jobs are waiting'**
  String get noWaitingTitle;

  /// 104 Off duty, waiting jobs aren't shown.
  ///
  /// In en, this message translates to:
  /// **'Go on duty to see waiting jobs.'**
  String get noWaitingOffDuty;

  /// 104 Someone who isn't a courier opened the courier's screen.
  ///
  /// In en, this message translates to:
  /// **'For our couriers'**
  String get notCourierTitle;

  /// 104 Someone who isn't a courier opened the courier's screen.
  ///
  /// In en, this message translates to:
  /// **'This screen is for the company\'s couriers. Ask the company to add your number.'**
  String get notCourierMessage;

  /// 104 A courier switches to the customer's screens.
  ///
  /// In en, this message translates to:
  /// **'Customer view'**
  String get customerView;

  /// 104 The courier's position is being shared.
  ///
  /// In en, this message translates to:
  /// **'While a parcel is on the way and this screen is open, its customer sees where you are.'**
  String get sharingLocation;

  /// 104 A courier's job, like "Job S-1042".
  ///
  /// In en, this message translates to:
  /// **'Job {reference}'**
  String jobTitle(String reference);

  /// 104 Cash to collect, in a job's line.
  ///
  /// In en, this message translates to:
  /// **'Collect {amount}'**
  String jobCollect(String amount);

  /// 104 Cash to collect.
  ///
  /// In en, this message translates to:
  /// **'Collect {amount} in cash at the drop-off.'**
  String jobCollectBanner(String amount);

  /// 104 Nothing to collect.
  ///
  /// In en, this message translates to:
  /// **'Paid by card: nothing to collect.'**
  String get jobPaidByCard;

  /// 104 A waiting job hides the numbers.
  ///
  /// In en, this message translates to:
  /// **'The numbers show once you take the job.'**
  String get jobPhonesAfterTaking;

  /// 104 Calls the sender.
  ///
  /// In en, this message translates to:
  /// **'Call {name}'**
  String callSender(String name);

  /// 104 Calls the recipient.
  ///
  /// In en, this message translates to:
  /// **'Call {name}'**
  String callRecipient(String name);

  /// 104 A courier takes a waiting job.
  ///
  /// In en, this message translates to:
  /// **'Take this job'**
  String get jobTake;

  /// 104 The courier took the job.
  ///
  /// In en, this message translates to:
  /// **'It\'s yours. Go to the pickup.'**
  String get jobTaken;

  /// 104 A job moved on.
  ///
  /// In en, this message translates to:
  /// **'Saved. The customer was told.'**
  String get jobUpdated;

  /// 104 A job was delivered.
  ///
  /// In en, this message translates to:
  /// **'Delivered. Well done.'**
  String get deliveredDone;

  /// 104 The courier picked up the parcel.
  ///
  /// In en, this message translates to:
  /// **'I picked it up'**
  String get stepPickedUp;

  /// 104 The courier is on the way to the drop-off.
  ///
  /// In en, this message translates to:
  /// **'On my way'**
  String get stepOnTheWay;

  /// 104 The courier delivered the parcel.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get stepDelivered;

  /// 104 The courier couldn't deliver it.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t deliver'**
  String get stepFailed;

  /// 104 The courier gives the job back.
  ///
  /// In en, this message translates to:
  /// **'Give the job back'**
  String get stepReleased;

  /// 104 Asks before giving a job back.
  ///
  /// In en, this message translates to:
  /// **'Give this job back? Another courier will take it.'**
  String get releaseConfirm;

  /// 104 Asks why the parcel wasn't delivered.
  ///
  /// In en, this message translates to:
  /// **'Why couldn\'t it be delivered?'**
  String get failReasonTitle;

  /// 104 The reason field's hint.
  ///
  /// In en, this message translates to:
  /// **'Like: nobody answered'**
  String get failReasonHint;

  /// 104 Sends the reason.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get failReasonSend;

  /// 104 Account: a courier opens the courier's screens.
  ///
  /// In en, this message translates to:
  /// **'Courier mode'**
  String get courierMode;

  /// 105.1 The tab with the company's restaurants.
  ///
  /// In en, this message translates to:
  /// **'Restaurants'**
  String get tabRestaurants;

  /// 105.1 The tab with the customer's food orders.
  ///
  /// In en, this message translates to:
  /// **'My orders'**
  String get tabFoodOrders;

  /// 105.1 The tab of a restaurant's staff.
  ///
  /// In en, this message translates to:
  /// **'Restaurant'**
  String get tabRestaurantDesk;

  /// 105.1 Account: a restaurant's staff open the restaurant's screens.
  ///
  /// In en, this message translates to:
  /// **'Restaurant mode'**
  String get restaurantMode;

  /// 105.1 The restaurants list's search box.
  ///
  /// In en, this message translates to:
  /// **'Search restaurants and dishes'**
  String get restaurantsSearchHint;

  /// 105.1 The cuisine chip that shows every restaurant.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get cuisineAll;

  /// 105.1 Read while the restaurants load.
  ///
  /// In en, this message translates to:
  /// **'Loading restaurants'**
  String get loadingRestaurants;

  /// 105.1 The restaurants list is empty.
  ///
  /// In en, this message translates to:
  /// **'No restaurants here yet'**
  String get noRestaurantsTitle;

  /// 105.1 The restaurants list is empty.
  ///
  /// In en, this message translates to:
  /// **'Try another search or cuisine, or come back later.'**
  String get noRestaurantsMessage;

  /// 105.1 A restaurant isn't taking orders now.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get restaurantClosed;

  /// 105.1 When a closed restaurant opens.
  ///
  /// In en, this message translates to:
  /// **'Opens {time}'**
  String restaurantOpensAt(String time);

  /// 105.1 A restaurant paused new orders for a while.
  ///
  /// In en, this message translates to:
  /// **'Busy now'**
  String get restaurantBusy;

  /// 105.1 The restaurant is too far.
  ///
  /// In en, this message translates to:
  /// **'Doesn\'t deliver to you'**
  String get restaurantNoDelivery;

  /// 105.1 A number of minutes.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min'**
  String restaurantMinutes(int minutes);

  /// 105.1 A restaurant's smallest order.
  ///
  /// In en, this message translates to:
  /// **'Min. {amount}'**
  String restaurantMinOrder(String amount);

  /// 105.1 The delivery fee.
  ///
  /// In en, this message translates to:
  /// **'Delivery {amount}'**
  String restaurantFee(String amount);

  /// 105.1 A dish or choice that is sold out.
  ///
  /// In en, this message translates to:
  /// **'Sold out'**
  String get dishSoldOut;

  /// 105.1 A dish the restaurant marks as popular.
  ///
  /// In en, this message translates to:
  /// **'Popular'**
  String get dishPopular;

  /// 105.1 A dish's note.
  ///
  /// In en, this message translates to:
  /// **'Note for the kitchen (optional)'**
  String get dishNote;

  /// 105.1 A dish was added.
  ///
  /// In en, this message translates to:
  /// **'Added to your cart.'**
  String get foodAdded;

  /// 105.1 Asks before replacing another restaurant's dishes.
  ///
  /// In en, this message translates to:
  /// **'Start a new cart?'**
  String get cartReplaceTitle;

  /// 105.1 Asks before replacing another restaurant's dishes.
  ///
  /// In en, this message translates to:
  /// **'Your cart has dishes from {restaurant}. Adding this one empties it.'**
  String cartReplaceMessage(String restaurant);

  /// 105.1 Replaces the cart.
  ///
  /// In en, this message translates to:
  /// **'Start a new cart'**
  String get cartReplaceYes;

  /// 105.1 Opens the cart.
  ///
  /// In en, this message translates to:
  /// **'View cart ({count})'**
  String foodViewCart(int count);

  /// 105.1 The checkout screen's title.
  ///
  /// In en, this message translates to:
  /// **'Your order'**
  String get foodCartTitle;

  /// 105.1 The cart has nothing.
  ///
  /// In en, this message translates to:
  /// **'Your cart is empty'**
  String get foodCartEmptyTitle;

  /// 105.1 The cart has nothing.
  ///
  /// In en, this message translates to:
  /// **'Choose a restaurant and add dishes.'**
  String get foodCartEmptyMessage;

  /// 105.1 The drop-off section.
  ///
  /// In en, this message translates to:
  /// **'Deliver to'**
  String get foodDeliverTo;

  /// 105.1 The dishes' total.
  ///
  /// In en, this message translates to:
  /// **'Subtotal'**
  String get foodSubtotal;

  /// 105.1 The delivery fee.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get foodDeliveryFee;

  /// 105.1 The order's total.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get foodTotal;

  /// 105.1 The total before the address.
  ///
  /// In en, this message translates to:
  /// **'Enter the address to see the total.'**
  String get foodTotalMissing;

  /// 105.1 Asked of accounts without a number.
  ///
  /// In en, this message translates to:
  /// **'Your mobile number, for the courier'**
  String get foodYourPhone;

  /// 105.1 Places the order.
  ///
  /// In en, this message translates to:
  /// **'Place order'**
  String get foodPlaceOrder;

  /// 105.1 The order button for signed-out customers.
  ///
  /// In en, this message translates to:
  /// **'Sign in to order'**
  String get foodSignInToOrder;

  /// 105.1 The address is missing.
  ///
  /// In en, this message translates to:
  /// **'Enter the delivery address.'**
  String get foodFillAddress;

  /// 105.1 The phone is missing.
  ///
  /// In en, this message translates to:
  /// **'Enter your mobile number so the courier can call you.'**
  String get foodFillPhone;

  /// 105.1 A cash order was placed.
  ///
  /// In en, this message translates to:
  /// **'Your order was sent to the restaurant.'**
  String get foodOrderSent;

  /// 105.1 A card order was paid.
  ///
  /// In en, this message translates to:
  /// **'Paid. Your order went to the restaurant.'**
  String get foodOrderPaid;

  /// 105.1 How long until it arrives.
  ///
  /// In en, this message translates to:
  /// **'About {minutes} min'**
  String foodEta(int minutes);

  /// 105.1 A food order's stage.
  ///
  /// In en, this message translates to:
  /// **'Waiting for payment'**
  String get foodAwaitingPayment;

  /// 105.1 A food order's stage.
  ///
  /// In en, this message translates to:
  /// **'Sent to the restaurant'**
  String get foodPlaced;

  /// 105.1 A food order's stage.
  ///
  /// In en, this message translates to:
  /// **'Being prepared'**
  String get foodAccepted;

  /// 105.1 A food order's stage.
  ///
  /// In en, this message translates to:
  /// **'Ready for the courier'**
  String get foodReady;

  /// 105.1 A food order's stage.
  ///
  /// In en, this message translates to:
  /// **'Picked up'**
  String get foodPickedUp;

  /// 105.1 A food order's stage.
  ///
  /// In en, this message translates to:
  /// **'On the way'**
  String get foodOnTheWay;

  /// 105.1 A food order's stage.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get foodDelivered;

  /// 105.1 A food order's stage.
  ///
  /// In en, this message translates to:
  /// **'Not accepted'**
  String get foodRejected;

  /// 105.1 A food order's stage.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get foodCancelled;

  /// 105.1 A food order's stage.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t be delivered'**
  String get foodFailed;

  /// 105.1 A food order's title.
  ///
  /// In en, this message translates to:
  /// **'Order {reference}'**
  String foodOrderHeading(String reference);

  /// 105.1 When the restaurant said it is ready.
  ///
  /// In en, this message translates to:
  /// **'Ready around {time}'**
  String foodReadyAt(String time);

  /// 105.1 Why a restaurant turned an order down.
  ///
  /// In en, this message translates to:
  /// **'The restaurant is closing'**
  String get rejectClosing;

  /// 105.1 Why a restaurant turned an order down.
  ///
  /// In en, this message translates to:
  /// **'Too busy right now'**
  String get rejectTooBusy;

  /// 105.1 Why a restaurant turned an order down.
  ///
  /// In en, this message translates to:
  /// **'Something isn\'t available'**
  String get rejectItemUnavailable;

  /// 105.1 Why a restaurant turned an order down.
  ///
  /// In en, this message translates to:
  /// **'Another reason'**
  String get rejectOther;

  /// 105.1 Cancels a food order.
  ///
  /// In en, this message translates to:
  /// **'Cancel order'**
  String get foodCancel;

  /// 105.1 Asks before cancelling.
  ///
  /// In en, this message translates to:
  /// **'Cancel this order?'**
  String get foodCancelConfirm;

  /// 105.1 The order was cancelled.
  ///
  /// In en, this message translates to:
  /// **'Order cancelled.'**
  String get foodCancelledToast;

  /// 105.1 Calls the restaurant.
  ///
  /// In en, this message translates to:
  /// **'Call the restaurant'**
  String get foodCallRestaurant;

  /// 105.1 The order's restaurant.
  ///
  /// In en, this message translates to:
  /// **'Restaurant'**
  String get foodRestaurant;

  /// 105.1 The order's dishes.
  ///
  /// In en, this message translates to:
  /// **'Dishes'**
  String get foodDishes;

  /// 105.1 The order waits for the restaurant.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the restaurant to accept it.'**
  String get foodWaitingRestaurant;

  /// 105.1 The rating section.
  ///
  /// In en, this message translates to:
  /// **'Rate your order'**
  String get foodRateTitle;

  /// 105.1 The restaurant's stars.
  ///
  /// In en, this message translates to:
  /// **'The restaurant'**
  String get rateRestaurant;

  /// 105.1 The courier's stars.
  ///
  /// In en, this message translates to:
  /// **'The courier'**
  String get rateCourier;

  /// 105.1 The rating's comment.
  ///
  /// In en, this message translates to:
  /// **'Anything to add? (optional)'**
  String get rateComment;

  /// 105.1 Sends the rating.
  ///
  /// In en, this message translates to:
  /// **'Send rating'**
  String get rateSend;

  /// 105.1 The rating was sent.
  ///
  /// In en, this message translates to:
  /// **'Thanks for rating.'**
  String get rateThanks;

  /// 105.1 No stars were chosen.
  ///
  /// In en, this message translates to:
  /// **'Choose the restaurant\'s stars.'**
  String get ratePickStars;

  /// 105.1 The order's rating.
  ///
  /// In en, this message translates to:
  /// **'You rated it {stars} out of 5.'**
  String foodRated(int stars);

  /// 105.1 A star button's label for screen readers.
  ///
  /// In en, this message translates to:
  /// **'{stars} stars'**
  String rateStar(int stars);

  /// 105.1 Read while the orders load.
  ///
  /// In en, this message translates to:
  /// **'Loading your orders'**
  String get loadingFoodOrders;

  /// 105.1 The orders list is empty.
  ///
  /// In en, this message translates to:
  /// **'No orders yet'**
  String get noFoodOrdersTitle;

  /// 105.1 The orders list is empty.
  ///
  /// In en, this message translates to:
  /// **'Your food orders show here.'**
  String get noFoodOrdersMessage;

  /// 105.1 Opens the restaurants.
  ///
  /// In en, this message translates to:
  /// **'Order food'**
  String get foodOrderFood;

  /// 105.1 Orders while signed out.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see your orders'**
  String get foodOrdersSignInTitle;

  /// 105.1 Orders while signed out.
  ///
  /// In en, this message translates to:
  /// **'Your orders and where they are show here.'**
  String get foodOrdersSignInMessage;

  /// 105.1 The restaurant's new orders.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get deskNew;

  /// 105.1 The restaurant's accepted orders.
  ///
  /// In en, this message translates to:
  /// **'Preparing'**
  String get deskPreparing;

  /// 105.1 The restaurant's finished orders.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get deskDone;

  /// 105.1 The restaurant takes orders.
  ///
  /// In en, this message translates to:
  /// **'Taking orders'**
  String get deskAccepting;

  /// 105.1 The restaurant paused new orders.
  ///
  /// In en, this message translates to:
  /// **'Paused until {time}'**
  String deskPausedUntil(String time);

  /// 105.1 Outside the restaurant's hours.
  ///
  /// In en, this message translates to:
  /// **'Closed by its opening hours'**
  String get deskClosedHours;

  /// 105.1 Today's orders and sales.
  ///
  /// In en, this message translates to:
  /// **'Today: {count} orders · {sales}'**
  String deskToday(int count, String sales);

  /// 105.1 Stops new orders for a while.
  ///
  /// In en, this message translates to:
  /// **'Pause new orders'**
  String get deskPause;

  /// 105.1 Asks for how long.
  ///
  /// In en, this message translates to:
  /// **'Pause new orders for'**
  String get deskPauseFor;

  /// 105.1 Ends the pause.
  ///
  /// In en, this message translates to:
  /// **'Take orders again'**
  String get deskOpenAgain;

  /// 105.1 Someone who isn't a restaurant's staff opened its screen.
  ///
  /// In en, this message translates to:
  /// **'For our restaurants'**
  String get notRestaurantTitle;

  /// 105.1 Someone who isn't a restaurant's staff opened its screen.
  ///
  /// In en, this message translates to:
  /// **'This screen is for the staff of the restaurants we deliver for.'**
  String get notRestaurantMessage;

  /// 105.1 Read while the restaurant's orders load.
  ///
  /// In en, this message translates to:
  /// **'Loading orders'**
  String get loadingRestaurantOrders;

  /// 105.1 A restaurant's list is empty.
  ///
  /// In en, this message translates to:
  /// **'No orders here'**
  String get noRestaurantOrdersTitle;

  /// 105.1 A restaurant's list is empty.
  ///
  /// In en, this message translates to:
  /// **'New orders show here as they come in.'**
  String get noRestaurantOrdersMessage;

  /// 105.1 Accepts an order.
  ///
  /// In en, this message translates to:
  /// **'Accept'**
  String get deskAccept;

  /// 105.1 Asks how long the order takes.
  ///
  /// In en, this message translates to:
  /// **'Ready in how many minutes?'**
  String get deskAcceptTitle;

  /// 105.1 The order was accepted.
  ///
  /// In en, this message translates to:
  /// **'Accepted. The customer was told.'**
  String get deskAccepted;

  /// 105.1 Turns an order down.
  ///
  /// In en, this message translates to:
  /// **'Can\'t take it'**
  String get deskReject;

  /// 105.1 Asks why.
  ///
  /// In en, this message translates to:
  /// **'Why can\'t you take it?'**
  String get deskRejectTitle;

  /// 105.1 The reason's note.
  ///
  /// In en, this message translates to:
  /// **'Note for the customer (optional)'**
  String get deskRejectNote;

  /// 105.1 The order was turned down.
  ///
  /// In en, this message translates to:
  /// **'Turned down. The customer was told.'**
  String get deskRejected;

  /// 105.1 Marks the order ready.
  ///
  /// In en, this message translates to:
  /// **'Ready for the courier'**
  String get deskMarkReady;

  /// 105.1 The order is ready.
  ///
  /// In en, this message translates to:
  /// **'Marked ready.'**
  String get deskMarkedReady;

  /// 105.1 The order's customer.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get deskCustomer;

  /// 105.2 The tab where the rider asks for a ride.
  ///
  /// In en, this message translates to:
  /// **'Ride'**
  String get tabRide;

  /// 105.2 The tab with the rider's rides.
  ///
  /// In en, this message translates to:
  /// **'My rides'**
  String get tabMyRides;

  /// 105.2 The tab of the company's drivers.
  ///
  /// In en, this message translates to:
  /// **'Driver'**
  String get tabDriver;

  /// 105.2 The title of the screen where the rider asks for a ride.
  ///
  /// In en, this message translates to:
  /// **'Where to?'**
  String get rideWhereTo;

  /// 105.2 Where the driver picks the rider up.
  ///
  /// In en, this message translates to:
  /// **'Pickup'**
  String get ridePickup;

  /// 105.2 Where the ride ends.
  ///
  /// In en, this message translates to:
  /// **'Drop-off'**
  String get rideDropoff;

  /// 105.2 The pickup's address when the rider used their position.
  ///
  /// In en, this message translates to:
  /// **'My location'**
  String get rideMyLocation;

  /// 105.2 Now or later.
  ///
  /// In en, this message translates to:
  /// **'When'**
  String get rideWhen;

  /// 105.2 A ride now.
  ///
  /// In en, this message translates to:
  /// **'Now'**
  String get rideNow;

  /// 105.2 A ride booked for later.
  ///
  /// In en, this message translates to:
  /// **'Later'**
  String get rideLater;

  /// 105.2 When a booked ride picks the rider up.
  ///
  /// In en, this message translates to:
  /// **'Pickup at {time}'**
  String rideScheduledFor(String time);

  /// 105.2 The vehicle types with their fares.
  ///
  /// In en, this message translates to:
  /// **'Choose a ride'**
  String get rideChooseCar;

  /// 105.2 Fares while signed out.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see the fares.'**
  String get rideSignInForFares;

  /// 105.2 Both places need their position.
  ///
  /// In en, this message translates to:
  /// **'Set the pickup and the drop-off with your location, a maps link or the map.'**
  String get rideFillPlaces;

  /// 105.2 How far and how long a ride is.
  ///
  /// In en, this message translates to:
  /// **'{km} km · about {minutes} min'**
  String rideTrip(String km, int minutes);

  /// 105.2 The company charges what the meter says.
  ///
  /// In en, this message translates to:
  /// **'The meter sets the final fare'**
  String get rideMeteredNote;

  /// 105.2 A vehicle type's seats.
  ///
  /// In en, this message translates to:
  /// **'{seats, plural, =1{1 seat} other{{seats} seats}}'**
  String rideSeats(int seats);

  /// 105.2 How soon a driver can be at the pickup.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min away'**
  String ridePickupIn(int minutes);

  /// 105.2 No online driver of this type is near.
  ///
  /// In en, this message translates to:
  /// **'No car nearby now'**
  String get rideNoneNearby;

  /// 105.2 The promo code's discount.
  ///
  /// In en, this message translates to:
  /// **'Promo code: {amount} off'**
  String rideDiscount(String amount);

  /// 105.2 A cancellation fee carried into this ride.
  ///
  /// In en, this message translates to:
  /// **'Includes {amount} from your last cancelled ride'**
  String ridePreviousFee(String amount);

  /// 105.2 The promo code box.
  ///
  /// In en, this message translates to:
  /// **'Promo code (optional)'**
  String get ridePromoCode;

  /// 105.2 The rider's note.
  ///
  /// In en, this message translates to:
  /// **'Note for the driver'**
  String get rideNotes;

  /// 105.2 When a card ride is paid.
  ///
  /// In en, this message translates to:
  /// **'You pay by card once the ride ends.'**
  String get rideCardAfter;

  /// 105.2 The button that asks for a ride now.
  ///
  /// In en, this message translates to:
  /// **'Request a ride'**
  String get rideRequest;

  /// 105.2 The button that books a ride for later.
  ///
  /// In en, this message translates to:
  /// **'Book the ride'**
  String get rideBook;

  /// 105.2 A ride booked for later.
  ///
  /// In en, this message translates to:
  /// **'Booked'**
  String get rideScheduled;

  /// 105.2 The ride is offered to the drivers.
  ///
  /// In en, this message translates to:
  /// **'Looking for a driver'**
  String get rideSearching;

  /// 105.2 A driver took the ride.
  ///
  /// In en, this message translates to:
  /// **'Driver on the way'**
  String get rideAccepted;

  /// 105.2 The driver is at the pickup.
  ///
  /// In en, this message translates to:
  /// **'Driver is here'**
  String get rideArrived;

  /// 105.2 The ride has started.
  ///
  /// In en, this message translates to:
  /// **'On the way'**
  String get rideInProgress;

  /// 105.2 The ride ended.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get rideCompleted;

  /// 105.2 The ride was cancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get rideCancelled;

  /// 105.2 No driver took the ride.
  ///
  /// In en, this message translates to:
  /// **'No driver found'**
  String get rideNoDriver;

  /// 105.2 While a driver is looked for.
  ///
  /// In en, this message translates to:
  /// **'We\'re asking the nearest drivers.'**
  String get rideSearchingHint;

  /// 105.2 The driver is at the pickup.
  ///
  /// In en, this message translates to:
  /// **'Your driver is waiting at the pickup.'**
  String get rideArrivedHint;

  /// 105.2 What to do when no driver took the ride.
  ///
  /// In en, this message translates to:
  /// **'No driver took it. Try again in a few minutes.'**
  String get rideNoDriverHint;

  /// 105.2 Asking again after no driver took the ride.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get rideTryAgain;

  /// 105.2 A ride's screen title.
  ///
  /// In en, this message translates to:
  /// **'Ride {reference}'**
  String rideHeading(String reference);

  /// 105.2 The code the rider tells the driver.
  ///
  /// In en, this message translates to:
  /// **'Your code'**
  String get ridePin;

  /// 105.2 When to tell the code.
  ///
  /// In en, this message translates to:
  /// **'Tell your driver this code when you get in.'**
  String get ridePinHint;

  /// 105.2 Calls the driver or the rider.
  ///
  /// In en, this message translates to:
  /// **'Call'**
  String get rideCall;

  /// 105.2 When the driver's position was sent.
  ///
  /// In en, this message translates to:
  /// **'Driver\'s position at {time}'**
  String rideDriverSeen(String time);

  /// 105.2 Sends the ride's page to someone.
  ///
  /// In en, this message translates to:
  /// **'Share the ride'**
  String get rideShare;

  /// 105.2 The text sent when sharing the ride.
  ///
  /// In en, this message translates to:
  /// **'Follow my ride: {url}'**
  String rideShareText(String url);

  /// 105.2 The emergency button.
  ///
  /// In en, this message translates to:
  /// **'Emergency'**
  String get rideSos;

  /// 105.2 The emergency button's question.
  ///
  /// In en, this message translates to:
  /// **'Emergency call'**
  String get rideSosTitle;

  /// 105.2 The number the emergency button calls.
  ///
  /// In en, this message translates to:
  /// **'Call {number}? Use it only in an emergency.'**
  String rideSosMessage(String number);

  /// 105.2 Calls the emergency number.
  ///
  /// In en, this message translates to:
  /// **'Call now'**
  String get rideSosCall;

  /// 105.2 Cancels the ride.
  ///
  /// In en, this message translates to:
  /// **'Cancel the ride'**
  String get rideCancel;

  /// 105.2 The question before cancelling a ride.
  ///
  /// In en, this message translates to:
  /// **'Why are you cancelling?'**
  String get rideCancelConfirm;

  /// 105.2 The company's cancellation fee.
  ///
  /// In en, this message translates to:
  /// **'Cancelling more than {minutes} min after a driver accepted costs {fee}, added to your next ride.'**
  String rideCancelFeeNote(String fee, int minutes);

  /// 105.2 A reason to cancel.
  ///
  /// In en, this message translates to:
  /// **'My plans changed'**
  String get rideReasonChangedPlans;

  /// 105.2 A reason to cancel.
  ///
  /// In en, this message translates to:
  /// **'The driver is taking too long'**
  String get rideReasonDriverLate;

  /// 105.2 A reason to cancel.
  ///
  /// In en, this message translates to:
  /// **'The driver asked me to cancel'**
  String get rideReasonDriverAsked;

  /// 105.2 A reason to cancel.
  ///
  /// In en, this message translates to:
  /// **'Wrong pickup place'**
  String get rideReasonWrongPlace;

  /// 105.2 A reason to cancel.
  ///
  /// In en, this message translates to:
  /// **'Something else'**
  String get rideReasonOther;

  /// 105.2 After cancelling.
  ///
  /// In en, this message translates to:
  /// **'Ride cancelled.'**
  String get rideCancelledToast;

  /// 105.2 After cancelling with a fee.
  ///
  /// In en, this message translates to:
  /// **'Ride cancelled. {fee} is added to your next ride.'**
  String rideCancelledFee(String fee);

  /// 105.2 Who cancelled the ride.
  ///
  /// In en, this message translates to:
  /// **'You cancelled it'**
  String get rideCancelledByYou;

  /// 105.2 Who cancelled the ride.
  ///
  /// In en, this message translates to:
  /// **'Cancelled by the company'**
  String get rideCancelledByCompany;

  /// 105.2 The cancellation fee charged.
  ///
  /// In en, this message translates to:
  /// **'Fee: {fee}'**
  String rideFeeCharged(String fee);

  /// 105.2 The fare charged.
  ///
  /// In en, this message translates to:
  /// **'Fare'**
  String get rideFare;

  /// 105.2 The fare before the ride ends.
  ///
  /// In en, this message translates to:
  /// **'Estimated fare'**
  String get rideFareEstimate;

  /// 105.2 After paying a card ride.
  ///
  /// In en, this message translates to:
  /// **'Paid. Thank you.'**
  String get ridePaid;

  /// 105.2 Rating the driver.
  ///
  /// In en, this message translates to:
  /// **'How was your driver?'**
  String get rideRateTitle;

  /// 105.2 The driver's rating.
  ///
  /// In en, this message translates to:
  /// **'You rated your driver {stars} out of 5.'**
  String rideRated(int stars);

  /// 105.2 Rides while signed out.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see your rides'**
  String get myRidesSignInTitle;

  /// 105.2 Rides while signed out.
  ///
  /// In en, this message translates to:
  /// **'Your rides and their receipts show here.'**
  String get myRidesSignInMessage;

  /// 105.2 Read while the rides load.
  ///
  /// In en, this message translates to:
  /// **'Loading the rides'**
  String get loadingRides;

  /// 105.2 The rides list is empty.
  ///
  /// In en, this message translates to:
  /// **'No rides yet'**
  String get noRidesTitle;

  /// 105.2 The rides list is empty.
  ///
  /// In en, this message translates to:
  /// **'Where would you like to go?'**
  String get noRidesMessage;

  /// 105.2 The driver's screen title.
  ///
  /// In en, this message translates to:
  /// **'Driver'**
  String get driverTitle;

  /// 105.2 A driver switches to the riders' screens.
  ///
  /// In en, this message translates to:
  /// **'Rider view'**
  String get riderView;

  /// 105.2 Account: a driver opens the driver's screens.
  ///
  /// In en, this message translates to:
  /// **'Driver mode'**
  String get driverMode;

  /// 105.2 Someone who isn't a driver opened the driver's screen.
  ///
  /// In en, this message translates to:
  /// **'For our drivers'**
  String get notDriverTitle;

  /// 105.2 Someone who isn't a driver opened the driver's screen.
  ///
  /// In en, this message translates to:
  /// **'This screen is for the company\'s drivers. Ask the company to add your number.'**
  String get notDriverMessage;

  /// 105.2 The switch that makes the driver available.
  ///
  /// In en, this message translates to:
  /// **'Online'**
  String get driverOnline;

  /// 105.2 The driver is offline.
  ///
  /// In en, this message translates to:
  /// **'Go online to get rides.'**
  String get driverOfflineHint;

  /// 105.2 The driver's rides today and what they made.
  ///
  /// In en, this message translates to:
  /// **'{rides, plural, =0{No rides today yet} =1{1 ride today · {earned}} other{{rides} rides today · {earned}}}'**
  String driverToday(int rides, String earned);

  /// 105.2 An online driver without a ride.
  ///
  /// In en, this message translates to:
  /// **'Waiting for a ride. Keep this screen open: your position is shared while you are online.'**
  String get driverWaiting;

  /// 105.2 The driver's position is being shared.
  ///
  /// In en, this message translates to:
  /// **'While you are online and this screen is open, your position is shared with the company and your rider.'**
  String get driverSharing;

  /// 105.2 A ride offered to the driver.
  ///
  /// In en, this message translates to:
  /// **'New ride'**
  String get driverOffer;

  /// 105.2 The seconds left to take the offered ride.
  ///
  /// In en, this message translates to:
  /// **'{seconds} s'**
  String driverSecondsLeft(int seconds);

  /// 105.2 How far the pickup is.
  ///
  /// In en, this message translates to:
  /// **'{km} km to the pickup'**
  String driverPickupKm(String km);

  /// 105.2 Takes the offered ride.
  ///
  /// In en, this message translates to:
  /// **'Accept'**
  String get driverAccept;

  /// 105.2 Passes the offered ride to the next driver.
  ///
  /// In en, this message translates to:
  /// **'Decline'**
  String get driverDecline;

  /// 105.2 The driver's ride that isn't over.
  ///
  /// In en, this message translates to:
  /// **'Open my current ride'**
  String get driverOpenRide;

  /// 105.2 The driver's rides that aren't over.
  ///
  /// In en, this message translates to:
  /// **'Current'**
  String get driverCurrent;

  /// 105.2 The driver's finished rides.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get driverDone;

  /// 105.2 What the driver made.
  ///
  /// In en, this message translates to:
  /// **'Earnings'**
  String get driverEarnings;

  /// 105.2 A driver's list is empty.
  ///
  /// In en, this message translates to:
  /// **'No rides here'**
  String get driverNoRides;

  /// 105.2 A driver's list is empty.
  ///
  /// In en, this message translates to:
  /// **'Rides you take show here.'**
  String get driverNoRidesMessage;

  /// 105.2 Earnings over today.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get earningsToday;

  /// 105.2 Earnings over this week.
  ///
  /// In en, this message translates to:
  /// **'This week'**
  String get earningsWeek;

  /// 105.2 Earnings over this month.
  ///
  /// In en, this message translates to:
  /// **'This month'**
  String get earningsMonth;

  /// 105.2 How many rides the driver completed.
  ///
  /// In en, this message translates to:
  /// **'Rides'**
  String get earningsRides;

  /// 105.2 The fares of the driver's rides.
  ///
  /// In en, this message translates to:
  /// **'Fares'**
  String get earningsFares;

  /// 105.2 The cash the driver collected.
  ///
  /// In en, this message translates to:
  /// **'Cash collected'**
  String get earningsCash;

  /// 105.2 The company's share of the fares.
  ///
  /// In en, this message translates to:
  /// **'Company\'s share'**
  String get earningsCompany;

  /// 105.2 What the driver made.
  ///
  /// In en, this message translates to:
  /// **'You made'**
  String get earningsEarned;

  /// 105.2 A day's rides.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 ride} other{{count} rides}}'**
  String earningsRidesCount(int count);

  /// 105.2 The driver is at the pickup.
  ///
  /// In en, this message translates to:
  /// **'I\'ve arrived'**
  String get driverArrived;

  /// 105.2 The rider is in: the ride starts.
  ///
  /// In en, this message translates to:
  /// **'Start the ride'**
  String get driverStart;

  /// 105.2 The ride ends at the drop-off.
  ///
  /// In en, this message translates to:
  /// **'End the ride'**
  String get driverEnd;

  /// 105.2 When the driver arrived at the pickup.
  ///
  /// In en, this message translates to:
  /// **'Waiting since {time}'**
  String driverWaitingSince(String time);

  /// 105.2 The cash the driver collects at the end.
  ///
  /// In en, this message translates to:
  /// **'Collect {amount} in cash.'**
  String driverCollect(String amount);

  /// 105.2 A card ride: nothing to collect.
  ///
  /// In en, this message translates to:
  /// **'The rider pays by card in the app.'**
  String get driverCardRide;

  /// 105.2 The rider's name.
  ///
  /// In en, this message translates to:
  /// **'Rider'**
  String get driverRider;

  /// 105.2 The code the rider tells the driver.
  ///
  /// In en, this message translates to:
  /// **'Rider\'s code'**
  String get driverPinTitle;

  /// 105.2 Where the code is.
  ///
  /// In en, this message translates to:
  /// **'Ask the rider for the 4-digit code in their app.'**
  String get driverPinHint;

  /// 105.2 The question before a driver cancels.
  ///
  /// In en, this message translates to:
  /// **'Cancel this ride?'**
  String get driverCancelTitle;

  /// 105.2 When a driver may cancel because the rider didn't come.
  ///
  /// In en, this message translates to:
  /// **'If the rider doesn\'t come, you can cancel {minutes} min after arriving. Otherwise the ride goes to another driver.'**
  String driverNoShowAfter(int minutes);

  /// 105.2 Cancelling because the rider didn't come.
  ///
  /// In en, this message translates to:
  /// **'The rider didn\'t come: the company\'s cancellation fee is charged to them.'**
  String get driverCancelNoShowHint;

  /// 105.2 The driver gives the ride back.
  ///
  /// In en, this message translates to:
  /// **'I can\'t make it'**
  String get driverCantMakeIt;

  /// 105.2 The driver cancels because the rider didn't come.
  ///
  /// In en, this message translates to:
  /// **'The rider didn\'t come'**
  String get driverNoShow;

  /// 105.2 Paying a ride in cash to the driver.
  ///
  /// In en, this message translates to:
  /// **'Cash to the driver'**
  String get ridePayCash;

  /// 105.3 The list of the academy's teachers.
  ///
  /// In en, this message translates to:
  /// **'Teachers'**
  String get teachersTitle;

  /// 105.3 The search field of the teachers' list.
  ///
  /// In en, this message translates to:
  /// **'Search teachers or subjects'**
  String get teachersSearch;

  /// 105.3 The teachers' list is empty.
  ///
  /// In en, this message translates to:
  /// **'No teachers here yet'**
  String get teachersEmpty;

  /// 105.3 The chip that shows teachers of every subject.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get teachersAllSubjects;

  /// 105.3 A teacher the academy shows first.
  ///
  /// In en, this message translates to:
  /// **'Featured'**
  String get teacherFeatured;

  /// 105.3 How many published courses a teacher has.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No courses yet} =1{1 course} other{{count} courses}}'**
  String teacherCourseCount(int count);

  /// 105.3 How many students a teacher's courses have.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 student} other{{count} students}}'**
  String teacherStudentCount(int count);

  /// 105.3 How many students follow a teacher.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 follower} other{{count} followers}}'**
  String teacherFollowerCount(int count);

  /// 105.3 Follow a teacher: hear of their new courses.
  ///
  /// In en, this message translates to:
  /// **'Follow'**
  String get teacherFollow;

  /// 105.3 The student follows this teacher (tap to stop).
  ///
  /// In en, this message translates to:
  /// **'Following'**
  String get teacherFollowing;

  /// 105.3 Shown after following a teacher.
  ///
  /// In en, this message translates to:
  /// **'You\'ll hear when {name} publishes a new course.'**
  String teacherFollowed(String name);

  /// 105.3 The heading of a teacher's courses on their page.
  ///
  /// In en, this message translates to:
  /// **'Courses by {name}'**
  String teacherCoursesTitle(String name);

  /// 105.3 The button and sheet title to rate a teacher.
  ///
  /// In en, this message translates to:
  /// **'Rate {name}'**
  String teacherRate(String name);

  /// 105.3 Why the student can't rate the teacher yet.
  ///
  /// In en, this message translates to:
  /// **'Join one of their courses to rate them.'**
  String get teacherRateHint;

  /// 105.3 Shown after rating a teacher.
  ///
  /// In en, this message translates to:
  /// **'Thanks for rating {name}!'**
  String teacherRated(String name);

  /// 105.3 The student's own rating of the teacher.
  ///
  /// In en, this message translates to:
  /// **'Your rating'**
  String get teacherYourRating;

  /// 105.3 Opens the academy's list of teachers.
  ///
  /// In en, this message translates to:
  /// **'See all teachers'**
  String get teachersSeeAll;

  /// 105.3 The account menu's item to apply to teach.
  ///
  /// In en, this message translates to:
  /// **'Teach here'**
  String get teachHere;

  /// 105.3 Above the form to apply to teach.
  ///
  /// In en, this message translates to:
  /// **'Tell the academy who you are and what you\'d teach. Its answer shows here.'**
  String get teachIntro;

  /// 105.3 The applicant's name.
  ///
  /// In en, this message translates to:
  /// **'Your name'**
  String get teachName;

  /// 105.3 The applicant's bio.
  ///
  /// In en, this message translates to:
  /// **'About you'**
  String get teachBio;

  /// 105.3 The hint of the applicant's bio.
  ///
  /// In en, this message translates to:
  /// **'Your experience, and what you would teach'**
  String get teachBioHint;

  /// 105.3 The subjects a teacher teaches.
  ///
  /// In en, this message translates to:
  /// **'Subjects'**
  String get teachSubjects;

  /// 105.3 The hint of the subjects field.
  ///
  /// In en, this message translates to:
  /// **'Separated by commas, like Arabic, Grammar'**
  String get teachSubjectsHint;

  /// 105.3 Sends the application to teach.
  ///
  /// In en, this message translates to:
  /// **'Send application'**
  String get teachSend;

  /// 105.3 The application waits for the academy.
  ///
  /// In en, this message translates to:
  /// **'Your application was sent. The academy will answer here.'**
  String get teachPending;

  /// 105.3 The academy approved the application.
  ///
  /// In en, this message translates to:
  /// **'You\'re one of the academy\'s teachers. Open the Teacher tab.'**
  String get teachApproved;

  /// 105.3 The academy declined the application.
  ///
  /// In en, this message translates to:
  /// **'The academy declined your application.'**
  String get teachDeclined;

  /// 105.3 The academy's note on an application or a course.
  ///
  /// In en, this message translates to:
  /// **'The academy\'s note: {note}'**
  String teachNote(String note);

  /// 105.3 Apply again after a declined application.
  ///
  /// In en, this message translates to:
  /// **'Apply again'**
  String get teachApplyAgain;

  /// 105.3 The tab of the academy's teachers.
  ///
  /// In en, this message translates to:
  /// **'Teacher'**
  String get tabTeacher;

  /// 105.3 The teacher's share of their courses' sales.
  ///
  /// In en, this message translates to:
  /// **'Your share: {percent}%'**
  String teacherShare(String percent);

  /// 105.3 The Teacher tab's courses.
  ///
  /// In en, this message translates to:
  /// **'Courses'**
  String get teacherTabCourses;

  /// 105.3 The Teacher tab's students' questions.
  ///
  /// In en, this message translates to:
  /// **'Questions'**
  String get teacherTabQuestions;

  /// 105.3 The Teacher tab's earnings.
  ///
  /// In en, this message translates to:
  /// **'Earnings'**
  String get teacherTabEarnings;

  /// 105.3 Starts a new course.
  ///
  /// In en, this message translates to:
  /// **'New course'**
  String get teacherNewCourse;

  /// 105.3 The teacher has no course yet.
  ///
  /// In en, this message translates to:
  /// **'Start your first course, add its lessons and send it to the academy for review.'**
  String get teacherNoCourses;

  /// 105.3 A teacher's course not sent yet.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get stageDraft;

  /// 105.3 A teacher's course waiting for the academy's review.
  ///
  /// In en, this message translates to:
  /// **'With the academy'**
  String get stageInReview;

  /// 105.3 The academy sent the course back.
  ///
  /// In en, this message translates to:
  /// **'Needs changes'**
  String get stageReturned;

  /// 105.3 Students see the course.
  ///
  /// In en, this message translates to:
  /// **'Published'**
  String get stagePublished;

  /// 105.3 The academy took the course out of the app.
  ///
  /// In en, this message translates to:
  /// **'Hidden'**
  String get stageHidden;

  /// 105.3 A course's title, as its teacher writes it.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get courseFieldTitle;

  /// 105.3 A course's description.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get courseFieldDescription;

  /// 105.3 A course's price in the academy's currency.
  ///
  /// In en, this message translates to:
  /// **'Price ({currency})'**
  String courseFieldPrice(String currency);

  /// 105.3 The hint of a course's price.
  ///
  /// In en, this message translates to:
  /// **'0 for a free course'**
  String get courseFieldPriceHint;

  /// 105.3 A course's level.
  ///
  /// In en, this message translates to:
  /// **'Level'**
  String get courseFieldLevel;

  /// 105.3 The beginner level.
  ///
  /// In en, this message translates to:
  /// **'Beginner'**
  String get levelBeginner;

  /// 105.3 The intermediate level.
  ///
  /// In en, this message translates to:
  /// **'Intermediate'**
  String get levelIntermediate;

  /// 105.3 The advanced level.
  ///
  /// In en, this message translates to:
  /// **'Advanced'**
  String get levelAdvanced;

  /// 105.3 A course's category.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get courseFieldCategory;

  /// 105.3 A course without a category.
  ///
  /// In en, this message translates to:
  /// **'None'**
  String get courseNoCategory;

  /// 105.3 Creates the teacher's course.
  ///
  /// In en, this message translates to:
  /// **'Create course'**
  String get courseCreate;

  /// 105.3 Saves the course's details.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get courseSave;

  /// 105.3 Opens the course's details to change them.
  ///
  /// In en, this message translates to:
  /// **'Edit details'**
  String get courseEditDetails;

  /// 105.3 Adds a section to the course.
  ///
  /// In en, this message translates to:
  /// **'Add a section'**
  String get courseAddSection;

  /// 105.3 A section's title.
  ///
  /// In en, this message translates to:
  /// **'Section title'**
  String get courseSectionTitle;

  /// 105.3 Adds a lesson to a section.
  ///
  /// In en, this message translates to:
  /// **'Add a lesson'**
  String get courseAddLesson;

  /// 105.3 A lesson's title.
  ///
  /// In en, this message translates to:
  /// **'Lesson title'**
  String get lessonFieldTitle;

  /// 105.3 A lesson's text.
  ///
  /// In en, this message translates to:
  /// **'Text (optional)'**
  String get lessonFieldText;

  /// 105.3 A lesson's video address.
  ///
  /// In en, this message translates to:
  /// **'Video address (YouTube, Vimeo or a link)'**
  String get lessonFieldVideo;

  /// 105.3 Picks a video or a PDF from the phone for the lesson.
  ///
  /// In en, this message translates to:
  /// **'Upload a video or PDF'**
  String get lessonPickFile;

  /// 105.3 A lesson's file being sent.
  ///
  /// In en, this message translates to:
  /// **'Uploading… {percent}%'**
  String lessonUploading(int percent);

  /// 105.3 A lesson's length.
  ///
  /// In en, this message translates to:
  /// **'Length in minutes (optional)'**
  String get lessonFieldMinutes;

  /// 105.3 The lesson opens to everyone before they join.
  ///
  /// In en, this message translates to:
  /// **'Free preview: open before joining'**
  String get lessonFieldPreview;

  /// 105.3 A lesson has nothing in it.
  ///
  /// In en, this message translates to:
  /// **'Add a video, a PDF or some text.'**
  String get lessonNeedsContent;

  /// 105.3 The picked file is over the size allowed.
  ///
  /// In en, this message translates to:
  /// **'This file is too big.'**
  String get lessonFileTooBig;

  /// 105.3 The picked file isn't a video or a PDF.
  ///
  /// In en, this message translates to:
  /// **'Choose an MP4, MOV or WebM video, or a PDF.'**
  String get lessonFileType;

  /// 105.3 A video lesson.
  ///
  /// In en, this message translates to:
  /// **'Video'**
  String get lessonKindVideo;

  /// 105.3 A lesson with a PDF.
  ///
  /// In en, this message translates to:
  /// **'PDF'**
  String get lessonKindPdf;

  /// 105.3 A text lesson.
  ///
  /// In en, this message translates to:
  /// **'Text'**
  String get lessonKindText;

  /// 105.3 Removes a lesson from a draft course.
  ///
  /// In en, this message translates to:
  /// **'Remove the lesson'**
  String get lessonRemove;

  /// 105.3 Sends the course to the academy.
  ///
  /// In en, this message translates to:
  /// **'Send for review'**
  String get courseSendForReview;

  /// 105.3 Shown after sending a course for review.
  ///
  /// In en, this message translates to:
  /// **'Sent. The academy will publish it or tell you what to change.'**
  String get courseSentForReview;

  /// 105.3 The course waits for the academy.
  ///
  /// In en, this message translates to:
  /// **'The academy is checking this course.'**
  String get courseInReviewNote;

  /// 105.3 The course is published.
  ///
  /// In en, this message translates to:
  /// **'Students see this course. New lessons go live at once.'**
  String get coursePublishedNote;

  /// 105.3 The teacher has no students' questions.
  ///
  /// In en, this message translates to:
  /// **'No questions from your students yet.'**
  String get teacherNoQuestions;

  /// 105.3 A question the teacher hasn't answered.
  ///
  /// In en, this message translates to:
  /// **'Waiting for you'**
  String get questionWaiting;

  /// 105.3 A question the teacher answered.
  ///
  /// In en, this message translates to:
  /// **'Answered'**
  String get questionAnswered;

  /// 105.3 The earnings of last month.
  ///
  /// In en, this message translates to:
  /// **'Last month'**
  String get periodLastMonth;

  /// 105.3 The earnings of this year.
  ///
  /// In en, this message translates to:
  /// **'This year'**
  String get periodYear;

  /// 105.3 How many of the teacher's courses sold, and for how much.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Nothing sold} =1{1 sold · {amount}} other{{count} sold · {amount}}}'**
  String teacherSold(int count, String amount);

  /// 105.3 What was refunded of the teacher's courses.
  ///
  /// In en, this message translates to:
  /// **'Refunds: {amount}'**
  String teacherRefunds(String amount);

  /// 105.3 The teacher's share of the sales.
  ///
  /// In en, this message translates to:
  /// **'Your share'**
  String get teacherEarned;

  /// 105.3 Under the teacher's earnings.
  ///
  /// In en, this message translates to:
  /// **'Sales on the academy\'s payment page, less refunds. The academy pays you.'**
  String get teacherPaidBy;

  /// 105.3 Opens the teacher's bio and subjects.
  ///
  /// In en, this message translates to:
  /// **'Edit your profile'**
  String get teacherEditProfile;

  /// 105.3 The teacher's profile was saved.
  ///
  /// In en, this message translates to:
  /// **'Saved.'**
  String get teacherProfileSaved;

  /// 105.4 The tab of a school's students and parents.
  ///
  /// In en, this message translates to:
  /// **'School'**
  String get tabSchool;

  /// 105.4 The tab of a school's teachers.
  ///
  /// In en, this message translates to:
  /// **'Classroom'**
  String get tabClassroom;

  /// 105.4 The School tab before signing in.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see your school'**
  String get schoolSignInTitle;

  /// 105.4 Under the School tab's sign-in title.
  ///
  /// In en, this message translates to:
  /// **'Use the mobile number you gave the school. Parents see each of their children.'**
  String get schoolSignInMessage;

  /// 105.4 Someone the school didn't add opens the School tab.
  ///
  /// In en, this message translates to:
  /// **'This number isn\'t on the school\'s list'**
  String get schoolNotMemberTitle;

  /// 105.4 Under the title for someone the school didn't add.
  ///
  /// In en, this message translates to:
  /// **'Ask the school to add the number you signed in with, then open this tab again.'**
  String get schoolNotMemberMessage;

  /// 105.4 A parent the school hasn't linked to a child yet.
  ///
  /// In en, this message translates to:
  /// **'No student yet'**
  String get schoolNoStudents;

  /// 105.4 Under the title for a parent without children linked.
  ///
  /// In en, this message translates to:
  /// **'Ask the school to link your children to your number.'**
  String get schoolNoStudentsMessage;

  /// 113.3 The School tab of someone who works at the school and has no student there (no child, not a student).
  ///
  /// In en, this message translates to:
  /// **'This tab is for students and parents'**
  String get schoolForWorkersTitle;

  /// 113.3 The School tab of someone who works at the school and has no student there (no child, not a student). For staff who don't teach.
  ///
  /// In en, this message translates to:
  /// **'What you need at work is in the Staff tab: checking in and out, your leave, the staff\'s news, the calendar and the library.'**
  String get schoolForStaffMessage;

  /// 113.3 The School tab of someone who works at the school and has no student there (no child, not a student). For teachers.
  ///
  /// In en, this message translates to:
  /// **'What you need at work is in the Classroom tab: your classes, checking in and out, the calendar and the exams.'**
  String get schoolForTeachersMessage;

  /// 113.3 Opens the Staff tab from the School tab of someone who works at the school.
  ///
  /// In en, this message translates to:
  /// **'Open Staff'**
  String get schoolOpenStaff;

  /// 113.3 Opens the Classroom tab from the School tab of a teacher who has no student there.
  ///
  /// In en, this message translates to:
  /// **'Open Classroom'**
  String get schoolOpenClassroom;

  /// 105.4 Today's lessons on the School and Classroom tabs.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get schoolToday;

  /// 105.4 Today's day in the week's timetable.
  ///
  /// In en, this message translates to:
  /// **'Today, {day}'**
  String schoolTodayDay(String day);

  /// 105.4 Today has no lessons.
  ///
  /// In en, this message translates to:
  /// **'No lessons today.'**
  String get schoolNoLessonsToday;

  /// 105.4 The list of the school's parts on the School tab.
  ///
  /// In en, this message translates to:
  /// **'Your school'**
  String get schoolEverything;

  /// 105.4 The student's homework, and a class's on the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Homework'**
  String get schoolHomework;

  /// 105.4 The student's scores by subject.
  ///
  /// In en, this message translates to:
  /// **'Grades'**
  String get schoolGrades;

  /// 105.4 The days the student was absent, late or excused.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get schoolAttendance;

  /// 105.4 The class's lessons in the week.
  ///
  /// In en, this message translates to:
  /// **'Timetable'**
  String get schoolTimetable;

  /// 105.4 What the school asks of the family.
  ///
  /// In en, this message translates to:
  /// **'Fees'**
  String get schoolFees;

  /// 105.4 The school's and the teachers' news.
  ///
  /// In en, this message translates to:
  /// **'School news'**
  String get schoolNews;

  /// 105.4 The school hasn't posted news.
  ///
  /// In en, this message translates to:
  /// **'No news yet.'**
  String get schoolNoNews;

  /// 105.4 Where a lesson is.
  ///
  /// In en, this message translates to:
  /// **'Room {room}'**
  String schoolRoom(String room);

  /// 105.4 The class has no lessons in the week.
  ///
  /// In en, this message translates to:
  /// **'No timetable yet'**
  String get schoolNoTimetable;

  /// 105.4 Under the title when there is no timetable.
  ///
  /// In en, this message translates to:
  /// **'The school adds the week\'s lessons; they show here.'**
  String get schoolNoTimetableMessage;

  /// 105.4 Under Fees on the School tab: what is still due.
  ///
  /// In en, this message translates to:
  /// **'Due: {amount}'**
  String feesDue(String amount);

  /// 105.4 Homework still to hand in.
  ///
  /// In en, this message translates to:
  /// **'To do'**
  String get homeworkDue;

  /// 105.4 Homework handed in, or past its date.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get homeworkDone;

  /// 105.4 No homework still to hand in.
  ///
  /// In en, this message translates to:
  /// **'Nothing to do. Well done!'**
  String get homeworkNoneDue;

  /// 105.4 No homework handed in yet.
  ///
  /// In en, this message translates to:
  /// **'No homework here yet.'**
  String get homeworkNoneDone;

  /// 105.4 When homework is to be handed in.
  ///
  /// In en, this message translates to:
  /// **'Due {date}'**
  String homeworkDueOn(String date);

  /// 105.4 The student handed the homework in.
  ///
  /// In en, this message translates to:
  /// **'Handed in'**
  String get homeworkHandedIn;

  /// 105.4 The homework was handed in after its date.
  ///
  /// In en, this message translates to:
  /// **'Handed in late'**
  String get homeworkLate;

  /// 105.4 The student's work on a homework's page.
  ///
  /// In en, this message translates to:
  /// **'What was handed in'**
  String get homeworkYourWork;

  /// 105.4 The teacher's mark on homework.
  ///
  /// In en, this message translates to:
  /// **'Mark'**
  String get homeworkMark;

  /// 105.4 What the student writes to hand homework in.
  ///
  /// In en, this message translates to:
  /// **'Your answer'**
  String get homeworkAnswer;

  /// 105.4 Adds a photo of the work to homework.
  ///
  /// In en, this message translates to:
  /// **'Take a photo'**
  String get homeworkAddPhoto;

  /// 105.4 Adds a file to homework.
  ///
  /// In en, this message translates to:
  /// **'Add a PDF or a picture'**
  String get homeworkAddFile;

  /// 105.4 Takes the picked file off the homework.
  ///
  /// In en, this message translates to:
  /// **'Remove the file'**
  String get homeworkRemoveFile;

  /// 105.4 The picked file isn't one homework takes.
  ///
  /// In en, this message translates to:
  /// **'Send a photo (JPEG, PNG or WebP) or a PDF.'**
  String get homeworkFileType;

  /// 105.4 The picked file is over the size allowed.
  ///
  /// In en, this message translates to:
  /// **'This file is too big: photos up to 20 MB, PDFs up to 200 MB.'**
  String get homeworkFileTooBig;

  /// 105.4 Handing in empty homework.
  ///
  /// In en, this message translates to:
  /// **'Write your answer or add a photo or a PDF.'**
  String get homeworkNeedsSomething;

  /// 105.4 Hands the homework in.
  ///
  /// In en, this message translates to:
  /// **'Hand in'**
  String get homeworkSend;

  /// 105.4 Hands in homework again before it is marked.
  ///
  /// In en, this message translates to:
  /// **'Hand in again'**
  String get homeworkSendAgain;

  /// 105.4 Shown after handing homework in.
  ///
  /// In en, this message translates to:
  /// **'Handed in. Your teacher sees it now.'**
  String get homeworkSent;

  /// 105.4 The student has no scores yet.
  ///
  /// In en, this message translates to:
  /// **'No grades yet'**
  String get gradesNone;

  /// 105.4 Under the title when there are no grades.
  ///
  /// In en, this message translates to:
  /// **'Scores show here as teachers enter them.'**
  String get gradesNoneMessage;

  /// 105.4 Exams, quizzes and assignments still to come.
  ///
  /// In en, this message translates to:
  /// **'Coming up'**
  String get gradesComing;

  /// 105.4 An exam.
  ///
  /// In en, this message translates to:
  /// **'Exam'**
  String get assessmentExam;

  /// 105.4 A short test.
  ///
  /// In en, this message translates to:
  /// **'Quiz'**
  String get assessmentQuiz;

  /// 105.4 An assignment with a score.
  ///
  /// In en, this message translates to:
  /// **'Assignment'**
  String get assessmentAssignment;

  /// 105.4 The start of the attendance period shown.
  ///
  /// In en, this message translates to:
  /// **'Since {date}'**
  String attendanceSince(String date);

  /// 105.4 The student has no marks besides present.
  ///
  /// In en, this message translates to:
  /// **'No absences or late days. Keep it up!'**
  String get attendanceNone;

  /// 105.4 A student came to school.
  ///
  /// In en, this message translates to:
  /// **'Present'**
  String get attendancePresent;

  /// 105.4 A student didn't come.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get attendanceAbsent;

  /// 105.4 A student came late.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get attendanceLate;

  /// 105.4 A student was away with the school's leave.
  ///
  /// In en, this message translates to:
  /// **'Excused'**
  String get attendanceExcused;

  /// 105.4 The school asks nothing of the family.
  ///
  /// In en, this message translates to:
  /// **'No fees'**
  String get feesNone;

  /// 105.4 Under the title when there are no fees.
  ///
  /// In en, this message translates to:
  /// **'Fees the school adds show here, with a receipt for each payment.'**
  String get feesNoneMessage;

  /// 105.4 The total of the fees not paid yet.
  ///
  /// In en, this message translates to:
  /// **'Still due'**
  String get feesStillDue;

  /// 105.4 The school doesn't take fees by card in the app.
  ///
  /// In en, this message translates to:
  /// **'Pay at the school; the payment shows here with its receipt.'**
  String get feesPayAtSchool;

  /// 105.4 A fee not paid yet.
  ///
  /// In en, this message translates to:
  /// **'Due'**
  String get feeDue;

  /// 105.4 The date a fee is due.
  ///
  /// In en, this message translates to:
  /// **'Due by {date}'**
  String feeDueOn(String date);

  /// 105.4 A fee paid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get feePaid;

  /// 105.4 When a fee was paid.
  ///
  /// In en, this message translates to:
  /// **'Paid on {date}'**
  String feePaidOn(String date);

  /// 105.4 Pays a fee by card.
  ///
  /// In en, this message translates to:
  /// **'Pay {amount}'**
  String feePay(String amount);

  /// 105.4 Shown after paying a fee.
  ///
  /// In en, this message translates to:
  /// **'Paid. The receipt is here.'**
  String get feePaidThanks;

  /// 105.4 Opens a paid fee's receipt.
  ///
  /// In en, this message translates to:
  /// **'Receipt'**
  String get feeReceipt;

  /// 105.4 Someone who isn't a teacher opens the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'For the school\'s teachers'**
  String get classroomNotTeacher;

  /// 105.4 Under the title for someone who isn't a teacher.
  ///
  /// In en, this message translates to:
  /// **'The school adds its teachers\' numbers; they sign in with them and their classes show here.'**
  String get classroomNotTeacherMessage;

  /// 105.4 The classes a teacher teaches.
  ///
  /// In en, this message translates to:
  /// **'Your classes'**
  String get classroomClasses;

  /// 105.4 A teacher without classes.
  ///
  /// In en, this message translates to:
  /// **'No classes yet: the school adds you to its timetable.'**
  String get classroomNoClasses;

  /// 105.4 The class the teacher is the own teacher of.
  ///
  /// In en, this message translates to:
  /// **'Your class'**
  String get classroomYourClass;

  /// 105.4 How many students a class has.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 student} other{{count} students}}'**
  String classroomStudents(int count);

  /// 105.4 Opens a class's attendance for today.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get classroomTakeAttendance;

  /// 105.4 Writes news to a class and its families.
  ///
  /// In en, this message translates to:
  /// **'Write to the class'**
  String get classroomWrite;

  /// 105.4 The title of the message to a class.
  ///
  /// In en, this message translates to:
  /// **'Write to {name}'**
  String classroomWriteTo(String name);

  /// 105.4 A class's exams, quizzes and assignments.
  ///
  /// In en, this message translates to:
  /// **'Exams and scores'**
  String get classroomAssessments;

  /// 105.4 Gives a class homework.
  ///
  /// In en, this message translates to:
  /// **'Give homework'**
  String get classroomGiveHomework;

  /// 105.4 A class has no homework.
  ///
  /// In en, this message translates to:
  /// **'No homework given yet.'**
  String get classroomNoHomework;

  /// 105.4 Adds an exam, a quiz or an assignment.
  ///
  /// In en, this message translates to:
  /// **'New exam or quiz'**
  String get classroomNewAssessment;

  /// 105.4 A class has no assessments.
  ///
  /// In en, this message translates to:
  /// **'No exams or quizzes yet.'**
  String get classroomNoAssessments;

  /// 105.4 How many of a class handed homework in, and how many the teacher marked.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total} handed in · {marked} marked'**
  String classroomHandedIn(int done, int total, int marked);

  /// 105.4 How many of a class have a score, and the full mark.
  ///
  /// In en, this message translates to:
  /// **'{count} scored · out of {max}'**
  String classroomScored(int count, String max);

  /// 105.4 An assessment's full mark.
  ///
  /// In en, this message translates to:
  /// **'out of {max}'**
  String classroomOutOf(String max);

  /// 105.4 The subject of homework or an exam.
  ///
  /// In en, this message translates to:
  /// **'Subject'**
  String get classroomSubject;

  /// 105.4 The title of homework, an exam or a message.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get classroomTitle;

  /// 105.4 What the students are to do.
  ///
  /// In en, this message translates to:
  /// **'Instructions (optional)'**
  String get classroomInstructions;

  /// 105.4 The day homework is due.
  ///
  /// In en, this message translates to:
  /// **'Due'**
  String get classroomDue;

  /// 105.4 The day of an exam or of the attendance.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get classroomDate;

  /// 105.4 No day chosen yet.
  ///
  /// In en, this message translates to:
  /// **'Choose'**
  String get classroomChooseDay;

  /// 105.4 The highest score of an exam.
  ///
  /// In en, this message translates to:
  /// **'Full mark'**
  String get classroomFullMark;

  /// 105.4 Gives the homework.
  ///
  /// In en, this message translates to:
  /// **'Give'**
  String get classroomGive;

  /// 105.4 Adds the exam, quiz or assignment.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get classroomAdd;

  /// 105.4 Giving homework without what it needs.
  ///
  /// In en, this message translates to:
  /// **'Choose the subject, write a title and choose the due day.'**
  String get classroomHomeworkMissing;

  /// 105.4 Shown after giving homework.
  ///
  /// In en, this message translates to:
  /// **'Given. The class and their families were told.'**
  String get classroomHomeworkGiven;

  /// 105.4 Adding an exam without what it needs.
  ///
  /// In en, this message translates to:
  /// **'Choose the subject, and write a title, the full mark and the day.'**
  String get classroomAssessmentMissing;

  /// 105.4 The text of a message to a class.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get classroomMessage;

  /// 105.4 Sending an empty message.
  ///
  /// In en, this message translates to:
  /// **'Write a title and the message.'**
  String get classroomMessageMissing;

  /// 105.4 Shown after writing to a class.
  ///
  /// In en, this message translates to:
  /// **'Sent to the class and their families.'**
  String get classroomMessageSent;

  /// 105.4 The title of a class's attendance.
  ///
  /// In en, this message translates to:
  /// **'Attendance: {name}'**
  String classroomAttendanceOf(String name);

  /// 105.4 The day's attendance wasn't saved yet.
  ///
  /// In en, this message translates to:
  /// **'Not taken yet: everyone is present until you change it.'**
  String get classroomNotTaken;

  /// 105.4 A class without students.
  ///
  /// In en, this message translates to:
  /// **'No students in this class yet.'**
  String get classroomNoStudents;

  /// 105.4 Saves the day's attendance.
  ///
  /// In en, this message translates to:
  /// **'Save attendance'**
  String get classroomSaveAttendance;

  /// 105.4 Shown after saving attendance.
  ///
  /// In en, this message translates to:
  /// **'Saved. Families of those absent or late were told.'**
  String get classroomAttendanceSaved;

  /// 105.4 A student didn't hand the homework in.
  ///
  /// In en, this message translates to:
  /// **'Not handed in'**
  String get classroomNotHandedIn;

  /// 105.4 How a mark may be written.
  ///
  /// In en, this message translates to:
  /// **'Like 9/10, A or Excellent'**
  String get classroomMarkHint;

  /// 105.4 The teacher's words on homework.
  ///
  /// In en, this message translates to:
  /// **'Feedback (optional)'**
  String get classroomFeedback;

  /// 105.4 Saving a mark without one.
  ///
  /// In en, this message translates to:
  /// **'Write the mark.'**
  String get classroomMarkMissing;

  /// 105.4 Saves an exam's scores.
  ///
  /// In en, this message translates to:
  /// **'Save scores'**
  String get classroomSaveScores;

  /// 105.4 Shown after saving scores.
  ///
  /// In en, this message translates to:
  /// **'Saved. Students and families were told of new scores.'**
  String get classroomScoresSaved;

  /// 105.4 A score over the full mark.
  ///
  /// In en, this message translates to:
  /// **'A score is from 0 to {max}.'**
  String classroomScoreRange(String max);

  /// 105.9 How many free taxis are on the map around the rider.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No free taxis near you} =1{1 taxi near you} other{{count} taxis near you}}'**
  String taxiNearby(int count);

  /// 105.9 After the taxis near the rider: how far the nearest one is.
  ///
  /// In en, this message translates to:
  /// **'the nearest {minutes} min away'**
  String taxiNearest(int minutes);

  /// 105.9 The search for where the ride starts.
  ///
  /// In en, this message translates to:
  /// **'Where from?'**
  String get taxiWhereFrom;

  /// 105.9 Where the ride starts, on the map and in the sheet.
  ///
  /// In en, this message translates to:
  /// **'From: {place}'**
  String taxiFrom(String place);

  /// 105.9 Where the ride ends, on the map and in the sheet.
  ///
  /// In en, this message translates to:
  /// **'To: {place}'**
  String taxiTo(String place);

  /// 105.9 The button asking for a ride in the chosen vehicle type (Economy, Comfort).
  ///
  /// In en, this message translates to:
  /// **'Request {type}'**
  String taxiRequestType(String type);

  /// 105.9 Over the map: when the driver reaches the rider.
  ///
  /// In en, this message translates to:
  /// **'Arriving in {minutes} min'**
  String taxiArrivingIn(int minutes);

  /// 105.9 Over the map: the driver's position is live.
  ///
  /// In en, this message translates to:
  /// **'Live'**
  String get taxiLive;

  /// 105.9 The driver's switch over the map: online and taking rides.
  ///
  /// In en, this message translates to:
  /// **'Available for requests'**
  String get taxiAvailable;

  /// 105.9 The place search's field.
  ///
  /// In en, this message translates to:
  /// **'Search for a place'**
  String get taxiSearchHint;

  /// 105.9 The place search found nothing.
  ///
  /// In en, this message translates to:
  /// **'No places found. Try other words.'**
  String get taxiSearchNone;

  /// 105.9 In the place search: pick the place on the map instead.
  ///
  /// In en, this message translates to:
  /// **'Choose on the map'**
  String get taxiChooseOnMap;

  /// 105.9 The name of a place chosen on the map.
  ///
  /// In en, this message translates to:
  /// **'Pinned on the map'**
  String get taxiOnMap;

  /// 105.9 A place from the search has no position.
  ///
  /// In en, this message translates to:
  /// **'This place can\'t be used. Choose another.'**
  String get taxiPlaceFailed;

  /// 112.5 An assignment's page title before it loads.
  ///
  /// In en, this message translates to:
  /// **'Assignment'**
  String get assignmentTitle;

  /// 112.5 An assignment's highest score.
  ///
  /// In en, this message translates to:
  /// **'Out of {points} points'**
  String assignmentOutOf(int points);

  /// 112.5 The score that counts an assignment as done.
  ///
  /// In en, this message translates to:
  /// **'Pass score: {points}'**
  String assignmentPassScore(int points);

  /// 112.5 An assignment handed in, not graded yet.
  ///
  /// In en, this message translates to:
  /// **'Handed in. Waiting for your teacher\'s grade.'**
  String get assignmentWaiting;

  /// 112.5 The teacher asks for the assignment again.
  ///
  /// In en, this message translates to:
  /// **'Your teacher sent it back. Change it and hand it in again.'**
  String get assignmentReturned;

  /// 112.5 An assignment's grade.
  ///
  /// In en, this message translates to:
  /// **'Graded: {score} of {max}'**
  String assignmentGraded(int score, int max);

  /// 112.5 A grade under the assignment's pass score.
  ///
  /// In en, this message translates to:
  /// **'Below the pass score.'**
  String get assignmentBelowPass;

  /// 112.5 Over the teacher's note on an assignment.
  ///
  /// In en, this message translates to:
  /// **'Your teacher\'s note'**
  String get assignmentFeedback;

  /// 112.5 A live class's page title before it loads.
  ///
  /// In en, this message translates to:
  /// **'Live class'**
  String get liveClass;

  /// 112.5 Account: the student's live classes.
  ///
  /// In en, this message translates to:
  /// **'Live classes'**
  String get liveClasses;

  /// 112.5 Live classes still to come.
  ///
  /// In en, this message translates to:
  /// **'Coming up'**
  String get liveUpcoming;

  /// 112.5 Live classes that are over.
  ///
  /// In en, this message translates to:
  /// **'Past'**
  String get livePast;

  /// 112.5 A live class that has started.
  ///
  /// In en, this message translates to:
  /// **'On now'**
  String get liveNow;

  /// 112.5 A live class that ended.
  ///
  /// In en, this message translates to:
  /// **'This live class is over.'**
  String get liveEnded;

  /// 112.5 Opens the live class's meeting link.
  ///
  /// In en, this message translates to:
  /// **'Join the live class'**
  String get liveJoin;

  /// 112.5 A live class not open to join yet.
  ///
  /// In en, this message translates to:
  /// **'You can join from 15 minutes before it starts.'**
  String get liveJoinSoon;

  /// 112.5 A live class open to join before it starts.
  ///
  /// In en, this message translates to:
  /// **'Starts soon. You can join now.'**
  String get liveStartsSoon;

  /// 112.5 Opens a past live class's recording.
  ///
  /// In en, this message translates to:
  /// **'Watch the recording'**
  String get liveRecording;

  /// 112.5 The student has no coming live classes.
  ///
  /// In en, this message translates to:
  /// **'No live classes coming up.'**
  String get liveNone;

  /// 112.5 The student has no past live classes.
  ///
  /// In en, this message translates to:
  /// **'No past live classes yet.'**
  String get liveNonePast;

  /// 112.5 A course taken in order: this item opens after the one before.
  ///
  /// In en, this message translates to:
  /// **'Finish what comes before it in the course first.'**
  String get lockedPreviousNotDone;

  /// 112.5 A locked item of a course whose access ended.
  ///
  /// In en, this message translates to:
  /// **'Your access to this course has ended.'**
  String get lockedAccessEnded;

  /// 112.5 Beside an item that opens once the one before is done.
  ///
  /// In en, this message translates to:
  /// **'After the one before'**
  String get afterPrevious;

  /// 112.5 The field of a quiz question answered in writing.
  ///
  /// In en, this message translates to:
  /// **'Write your answer'**
  String get shortAnswerHint;

  /// 112.5 Over the quiz's questions reviewed after an attempt.
  ///
  /// In en, this message translates to:
  /// **'Your answers'**
  String get quizReviewTitle;

  /// 112.5 What the student answered.
  ///
  /// In en, this message translates to:
  /// **'Your answer: {answer}'**
  String quizReviewYours(String answer);

  /// 112.5 The right answer of a question answered wrong.
  ///
  /// In en, this message translates to:
  /// **'Right answer: {answer}'**
  String quizReviewRight(String answer);

  /// 112.5 A question left unanswered.
  ///
  /// In en, this message translates to:
  /// **'No answer'**
  String get quizReviewNone;

  /// 112.5 Read out for a question answered right.
  ///
  /// In en, this message translates to:
  /// **'Right'**
  String get quizReviewCorrect;

  /// 112.5 Read out for a question answered wrong.
  ///
  /// In en, this message translates to:
  /// **'Wrong'**
  String get quizReviewWrong;

  /// 112 On a ride, delivery or food app's map without tiles: the places are drawn on a plain background.
  ///
  /// In en, this message translates to:
  /// **'Map not available'**
  String get mapNotShown;

  /// 112.1 The rider's saved Home place on Where to?.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get placesHome;

  /// 112.1 The rider's saved Work place on Where to?.
  ///
  /// In en, this message translates to:
  /// **'Work'**
  String get placesWork;

  /// 112.1 Where to?: Home isn't set yet; opens the search to set it.
  ///
  /// In en, this message translates to:
  /// **'Add home'**
  String get placesAddHome;

  /// 112.1 Where to?: Work isn't set yet; opens the search to set it.
  ///
  /// In en, this message translates to:
  /// **'Add work'**
  String get placesAddWork;

  /// 112.1 The title of the search that sets the rider's Home.
  ///
  /// In en, this message translates to:
  /// **'Set your home'**
  String get placesSetHome;

  /// 112.1 The title of the search that sets the rider's Work.
  ///
  /// In en, this message translates to:
  /// **'Set your work'**
  String get placesSetWork;

  /// 112.1 Above the places the rider went to last, on Where to?.
  ///
  /// In en, this message translates to:
  /// **'Recent'**
  String get placesRecent;

  /// 112.1 Where to? in an app whose map has no place search.
  ///
  /// In en, this message translates to:
  /// **'Choose a saved place, your position or a maps link.'**
  String get placesNoSearch;

  /// 112.1 The name of a place chosen with a pasted maps link.
  ///
  /// In en, this message translates to:
  /// **'From a maps link'**
  String get placeFromLink;

  /// 112.1 Button under where from and to: moves the pickup's pin on the map.
  ///
  /// In en, this message translates to:
  /// **'Adjust the pickup on the map'**
  String get rideAdjustPickup;

  /// 112.1 Button: the pickup is where the pin is on the map.
  ///
  /// In en, this message translates to:
  /// **'Confirm pickup'**
  String get rideConfirmPickup;

  /// 112.1 Over the map while the rider moves the pickup's pin.
  ///
  /// In en, this message translates to:
  /// **'Move the map to your pickup'**
  String get rideMovePin;

  /// 112.1 How many free cars are on the map around the rider (ride hailing apps).
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No free cars near you} =1{1 car near you} other{{count} cars near you}}'**
  String rideCarsNearby(int count);

  /// 112.1 Over the map during the ride: how soon the car reaches the drop-off.
  ///
  /// In en, this message translates to:
  /// **'At the drop-off in {minutes} min'**
  String taxiDropoffIn(int minutes);

  /// 112.1 Above a completed ride's fare, places and payment.
  ///
  /// In en, this message translates to:
  /// **'Receipt'**
  String get rideReceipt;

  /// 112 Above the navigation apps a driver or courier may choose (Google Maps, Apple Maps, Waze).
  ///
  /// In en, this message translates to:
  /// **'Navigate with'**
  String get navigateWith;

  /// 112 Button: opens the phone's navigation app with the way to the place.
  ///
  /// In en, this message translates to:
  /// **'Navigate'**
  String get navigateButton;

  /// 112.1 The driver's button: the way to the rider's pickup in the phone's navigation app.
  ///
  /// In en, this message translates to:
  /// **'Navigate to the pickup'**
  String get navigateToPickup;

  /// 112.1 The driver's button during the ride: the way to the drop-off in the phone's navigation app.
  ///
  /// In en, this message translates to:
  /// **'Navigate to the drop-off'**
  String get navigateToDropoff;

  /// 112.2 Under a shipment's or a food order's map while the courier has it.
  ///
  /// In en, this message translates to:
  /// **'On the way from {place} to you'**
  String trackingOnTheWayFrom(String place);

  /// 112.2 How soon the courier reaches the drop-off, from where they are.
  ///
  /// In en, this message translates to:
  /// **'Arrives in about {minutes} min'**
  String trackingArrivesIn(int minutes);

  /// 112.5 Opens a certificate's PDF file.
  ///
  /// In en, this message translates to:
  /// **'Download the PDF'**
  String get certificatePdf;

  /// 112.5 Shares a certificate's link.
  ///
  /// In en, this message translates to:
  /// **'Share the certificate'**
  String get certificateShare;

  /// 112.5 The text shared with a certificate.
  ///
  /// In en, this message translates to:
  /// **'My certificate for {course}: {url}'**
  String certificateShareText(String course, String url);

  /// 112.5 On a course page: the student's cohort and its first day.
  ///
  /// In en, this message translates to:
  /// **'{cohort} · starts {date}'**
  String cohortStarts(String cohort, String date);

  /// 112.5 The Teacher tab's part with the assignments to grade.
  ///
  /// In en, this message translates to:
  /// **'Grading'**
  String get teacherTabGrading;

  /// 112.5 Assignments waiting for the teacher's grade.
  ///
  /// In en, this message translates to:
  /// **'To grade'**
  String get gradingToGrade;

  /// 112.5 Assignments the teacher graded.
  ///
  /// In en, this message translates to:
  /// **'Graded'**
  String get gradingGraded;

  /// 112.5 No assignment waits for the teacher's grade.
  ///
  /// In en, this message translates to:
  /// **'Nothing to grade. Well done!'**
  String get gradingNone;

  /// 112.5 The teacher graded nothing yet.
  ///
  /// In en, this message translates to:
  /// **'Nothing graded yet.'**
  String get gradingNoneGraded;

  /// 112.5 An assignment the teacher sent back.
  ///
  /// In en, this message translates to:
  /// **'Sent back'**
  String get gradingSentBackLabel;

  /// 112.5 The score field when grading.
  ///
  /// In en, this message translates to:
  /// **'Score (out of {max})'**
  String gradingScore(int max);

  /// 112.5 The note field when grading.
  ///
  /// In en, this message translates to:
  /// **'Note to the student'**
  String get gradingNote;

  /// 112.5 Saves an assignment's grade.
  ///
  /// In en, this message translates to:
  /// **'Save the grade'**
  String get gradingSave;

  /// 112.5 Sends an assignment back to the student.
  ///
  /// In en, this message translates to:
  /// **'Send back for another try'**
  String get gradingSendBack;

  /// 112.5 After grading an assignment.
  ///
  /// In en, this message translates to:
  /// **'Graded. Your student sees it in the app.'**
  String get gradingSaved;

  /// 112.5 After sending an assignment back.
  ///
  /// In en, this message translates to:
  /// **'Sent back to your student.'**
  String get gradingSentBack;

  /// 112.5 Sending back without a note.
  ///
  /// In en, this message translates to:
  /// **'Write what to change before sending it back.'**
  String get gradingNeedsNote;

  /// 112.5 A score outside the assignment's range.
  ///
  /// In en, this message translates to:
  /// **'Enter a score from 0 to {max}.'**
  String gradingScoreRange(int max);

  /// 112.5 A student's report card over the term.
  ///
  /// In en, this message translates to:
  /// **'Report card'**
  String get reportCard;

  /// 112.5 A report card's period.
  ///
  /// In en, this message translates to:
  /// **'{from} to {to}'**
  String reportPeriod(String from, String to);

  /// 112.5 The overall percent on a report card or gradebook.
  ///
  /// In en, this message translates to:
  /// **'Overall'**
  String get reportOverall;

  /// 112.5 A report card's attendance line.
  ///
  /// In en, this message translates to:
  /// **'Attendance: {present} present, {absent} absent, {late} late, {excused} excused.'**
  String reportAttendance(int present, int absent, int late, int excused);

  /// 112.5 A report card without scores yet.
  ///
  /// In en, this message translates to:
  /// **'No scores in this term yet.'**
  String get reportCardNone;

  /// 112.5 A class's gradebook for its teachers.
  ///
  /// In en, this message translates to:
  /// **'Gradebook'**
  String get classGradebook;

  /// 112.5 A gradebook of a class without students.
  ///
  /// In en, this message translates to:
  /// **'No students in this class yet.'**
  String get gradebookNone;

  /// 112.5 The gradebook's student column.
  ///
  /// In en, this message translates to:
  /// **'Student'**
  String get gradebookStudent;

  /// 112.5 The gradebook's days-absent column.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get gradebookAbsent;

  /// 112.5 The live classes' month calendar.
  ///
  /// In en, this message translates to:
  /// **'Calendar'**
  String get liveCalendar;

  /// 112.5 A calendar day without a live class.
  ///
  /// In en, this message translates to:
  /// **'No live class on this day.'**
  String get liveNoneThisDay;

  /// 112.5 Read out for a calendar day with live classes.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 live class} other{{count} live classes}}'**
  String liveClassesCount(int count);

  /// 112.5 The calendar's button to the month before.
  ///
  /// In en, this message translates to:
  /// **'Previous month'**
  String get calendarPrevious;

  /// 112.5 The calendar's button to the month after.
  ///
  /// In en, this message translates to:
  /// **'Next month'**
  String get calendarNext;

  /// 112.5 A coupon that applies to a paid course, and the price it leaves.
  ///
  /// In en, this message translates to:
  /// **'{discount} off: you pay {total}.'**
  String couponSaves(String discount, String total);

  /// 112.5 Goes to a paid course's checkout with the coupon.
  ///
  /// In en, this message translates to:
  /// **'Continue with the coupon'**
  String get couponContinue;

  /// 112.5 Goes to a paid course's checkout without a coupon.
  ///
  /// In en, this message translates to:
  /// **'Continue without a coupon'**
  String get couponWithout;

  /// 113.8 The school's calendar: events, holidays and exams.
  ///
  /// In en, this message translates to:
  /// **'Calendar'**
  String get schoolCalendar;

  /// 113.8 The exams' timetable of the student's class.
  ///
  /// In en, this message translates to:
  /// **'Exams'**
  String get schoolExams;

  /// 113.8 The student's merits and notes, with their points.
  ///
  /// In en, this message translates to:
  /// **'Behaviour'**
  String get schoolBehaviour;

  /// 113.8 Shows the school's calendar a month at a time.
  ///
  /// In en, this message translates to:
  /// **'Month'**
  String get calendarMonth;

  /// 113.8 Shows the school's calendar as a list of what is coming.
  ///
  /// In en, this message translates to:
  /// **'List'**
  String get calendarList;

  /// 113.8 A day of the school's calendar without events or exams.
  ///
  /// In en, this message translates to:
  /// **'Nothing on this day'**
  String get calendarNothingThisDay;

  /// 113.8 The school's calendar list with nothing coming.
  ///
  /// In en, this message translates to:
  /// **'Nothing on the calendar in the coming weeks'**
  String get calendarNothingAhead;

  /// 113.8 An event of the school's calendar that lasts all day.
  ///
  /// In en, this message translates to:
  /// **'All day'**
  String get calendarAllDay;

  /// 113.8 Label of a holiday or a break on the school's calendar.
  ///
  /// In en, this message translates to:
  /// **'No school'**
  String get calendarDayOff;

  /// 113.8 Label of exam days on the school's calendar.
  ///
  /// In en, this message translates to:
  /// **'Exam days'**
  String get calendarExamDays;

  /// 113.8 Label of an exam of the timetable on the school's calendar.
  ///
  /// In en, this message translates to:
  /// **'Exam'**
  String get calendarExam;

  /// 113.8 An event of the school's calendar for the staff only.
  ///
  /// In en, this message translates to:
  /// **'Staff'**
  String get calendarStaffOnly;

  /// 113.8 The days of an event of the school's calendar that lasts several days.
  ///
  /// In en, this message translates to:
  /// **'{from} to {to}'**
  String calendarDays(String from, String to);

  /// 113.8 How many events and exams a day of the school's calendar has, for screen readers.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 item} other{{count} items}}'**
  String calendarItems(int count);

  /// 113.8 The exams still to come on the exams' timetable.
  ///
  /// In en, this message translates to:
  /// **'Coming'**
  String get examsComing;

  /// 113.8 The exams already done on the exams' timetable.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get examsDone;

  /// 113.8 The exams' timetable with no exams published.
  ///
  /// In en, this message translates to:
  /// **'No exams on the timetable yet'**
  String get examsNone;

  /// 113.8 Under the empty exams' timetable.
  ///
  /// In en, this message translates to:
  /// **'The school publishes the exams\' timetable here.'**
  String get examsNoneMessage;

  /// 113.8 When an exam is and how long it takes.
  ///
  /// In en, this message translates to:
  /// **'{starts}–{ends} · {minutes} min'**
  String examTime(String starts, String ends, int minutes);

  /// 113.8 The points total of a student's behaviour record.
  ///
  /// In en, this message translates to:
  /// **'Points'**
  String get behaviourPoints;

  /// 113.8 How many merits a student's behaviour record has.
  ///
  /// In en, this message translates to:
  /// **'Merits'**
  String get behaviourMerits;

  /// 113.8 How many negative notes a student's behaviour record has.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get behaviourNotes;

  /// 113.8 A student's behaviour record with nothing in it.
  ///
  /// In en, this message translates to:
  /// **'No merits or notes yet'**
  String get behaviourNone;

  /// 113.8 A merit or a note the school wrote, not a teacher.
  ///
  /// In en, this message translates to:
  /// **'From the school'**
  String get behaviourFromSchool;

  /// 113.8 The points of a merit (+2) or a note (-1).
  ///
  /// In en, this message translates to:
  /// **'{points} points'**
  String behaviourPointsValue(String points);

  /// 113.8 Button and sheet title in the Classroom tab's class behaviour.
  ///
  /// In en, this message translates to:
  /// **'Write a merit or a note'**
  String get behaviourWrite;

  /// 113.8 Whom the teacher writes a merit or a note for.
  ///
  /// In en, this message translates to:
  /// **'For {name}'**
  String behaviourFor(String name);

  /// 113.8 The school's category of a merit or a note, to choose.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get behaviourCategory;

  /// 113.8 The words a teacher adds to a merit or a note.
  ///
  /// In en, this message translates to:
  /// **'A note for the family (optional)'**
  String get behaviourNoteHint;

  /// 113.8 After a teacher wrote a merit or a note.
  ///
  /// In en, this message translates to:
  /// **'Saved. The family sees it in the app.'**
  String get behaviourSaved;

  /// 113.8 A teacher sends a merit or a note without its category.
  ///
  /// In en, this message translates to:
  /// **'Choose a category'**
  String get behaviourChooseCategory;

  /// 113.8 Removes a merit or a note the teacher wrote today.
  ///
  /// In en, this message translates to:
  /// **'Take back'**
  String get behaviourTakeBack;

  /// 113.8 After a teacher took back a merit or a note.
  ///
  /// In en, this message translates to:
  /// **'Taken back'**
  String get behaviourTakenBack;

  /// 113.8 The class's latest merits and notes.
  ///
  /// In en, this message translates to:
  /// **'Latest'**
  String get behaviourLatest;

  /// 113.8 A teacher opens behaviour before the school set any categories.
  ///
  /// In en, this message translates to:
  /// **'The school hasn\'t set behaviour categories yet'**
  String get behaviourNoCategories;

  /// 113.8 The attendance register on a holiday or a break of the school's calendar.
  ///
  /// In en, this message translates to:
  /// **'No school: {title}. Nobody is told of an absence on this day.'**
  String classroomDayOff(String title);

  /// 113.10 On the School tab: opens the child's school bus, live on the map while it runs.
  ///
  /// In en, this message translates to:
  /// **'School bus'**
  String get schoolBus;

  /// 113.10 The bus's trip to school in the morning.
  ///
  /// In en, this message translates to:
  /// **'Morning trip'**
  String get busMorningTrip;

  /// 113.10 The bus's trip home after school.
  ///
  /// In en, this message translates to:
  /// **'Afternoon trip'**
  String get busAfternoonTrip;

  /// 113.10 A bus route's name and its bus's plate.
  ///
  /// In en, this message translates to:
  /// **'{route} · {plate}'**
  String busRouteLine(String route, String plate);

  /// 113.10 The child's bus stop and the bus's time there.
  ///
  /// In en, this message translates to:
  /// **'Stop: {stop} at {time}'**
  String busYourStop(String stop, String time);

  /// 113.10 Today's trip hasn't been started by the driver.
  ///
  /// In en, this message translates to:
  /// **'The bus hasn\'t left yet.'**
  String get busNotStarted;

  /// 113.10 The bus is on its trip now.
  ///
  /// In en, this message translates to:
  /// **'On its way'**
  String get busOnTheWay;

  /// 113.10 How soon the bus reaches the child's stop.
  ///
  /// In en, this message translates to:
  /// **'About {minutes} min to {stop}'**
  String busEtaMinutes(int minutes, String stop);

  /// 113.10 The trip runs but no recent position came from the driver's phone.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the bus\'s position…'**
  String get busWaitingPosition;

  /// 113.10 Today's trip was ended by the driver.
  ///
  /// In en, this message translates to:
  /// **'This trip has ended.'**
  String get busEnded;

  /// 113.10 The child got on the bus at this time.
  ///
  /// In en, this message translates to:
  /// **'On the bus since {time}'**
  String busOnSince(String time);

  /// 113.10 The child got off the bus at this time.
  ///
  /// In en, this message translates to:
  /// **'Got off at {time}'**
  String busGotOffAt(String time);

  /// 113.10 The driver or the supervisor marked the child absent on the trip.
  ///
  /// In en, this message translates to:
  /// **'Marked absent on this trip'**
  String get busAbsentToday;

  /// 113.10 The child isn't on any of the school's bus routes.
  ///
  /// In en, this message translates to:
  /// **'No bus for {name}'**
  String busNoTrips(String name);

  /// 113.10 Under 'No bus for …'.
  ///
  /// In en, this message translates to:
  /// **'The school hasn\'t put {name} on a bus route.'**
  String busNoTripsMessage(String name);

  /// 113.10 The trip's stops, in order.
  ///
  /// In en, this message translates to:
  /// **'Stops'**
  String get busStops;

  /// 113.10 The screens of the school's bus drivers and supervisors.
  ///
  /// In en, this message translates to:
  /// **'Bus duty'**
  String get busDutyTitle;

  /// 113.10 Under 'Bus duty'.
  ///
  /// In en, this message translates to:
  /// **'Your routes and today\'s trips'**
  String get busDutySubtitle;

  /// 113.10 The person drives the route's bus.
  ///
  /// In en, this message translates to:
  /// **'Driver'**
  String get busDriver;

  /// 113.10 The person supervises the students on the route's bus.
  ///
  /// In en, this message translates to:
  /// **'Supervisor'**
  String get busSupervisor;

  /// 113.10 How many students ride a trip.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 student} other{{count} students}}'**
  String busStudents(int count);

  /// 113.10 Button: the driver starts the trip.
  ///
  /// In en, this message translates to:
  /// **'Start'**
  String get busStart;

  /// 113.10 Button: opens today's trip.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get busOpenTrip;

  /// 113.10 Today's trip has ended.
  ///
  /// In en, this message translates to:
  /// **'Ended'**
  String get busDone;

  /// 113.10 Shown to the supervisor before the driver starts the trip.
  ///
  /// In en, this message translates to:
  /// **'The driver starts this trip.'**
  String get busWaitingDriver;

  /// 113.10 The person drives or supervises none of the school's buses.
  ///
  /// In en, this message translates to:
  /// **'No bus routes'**
  String get busNoRoutes;

  /// 113.10 Under 'No bus routes'.
  ///
  /// In en, this message translates to:
  /// **'You don\'t drive or supervise any of the school\'s buses.'**
  String get busNoRoutesMessage;

  /// 113.10 On the driver's trip: their phone sends the bus's position while the screen is open.
  ///
  /// In en, this message translates to:
  /// **'Your phone shares the bus\'s position while this screen is open.'**
  String get busSharing;

  /// 113.10 The driver's phone couldn't read its position.
  ///
  /// In en, this message translates to:
  /// **'Turn on location so families can see the bus.'**
  String get busLocationOff;

  /// 113.10 Marks the student as on the bus.
  ///
  /// In en, this message translates to:
  /// **'On'**
  String get busMarkOn;

  /// 113.10 Marks the student as off the bus.
  ///
  /// In en, this message translates to:
  /// **'Off'**
  String get busMarkOff;

  /// 113.10 Marks the student as absent on the trip.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get busMarkAbsent;

  /// 113.10 The trip's students: on the bus, off it, absent, all.
  ///
  /// In en, this message translates to:
  /// **'{boarded} on · {off} off · {absent} absent · {riders} in all'**
  String busCounts(int boarded, int off, int absent, int riders);

  /// 113.10 Button: the driver ends the trip.
  ///
  /// In en, this message translates to:
  /// **'End the trip'**
  String get busEndTrip;

  /// 113.10 Asks before the trip ends.
  ///
  /// In en, this message translates to:
  /// **'End the trip?'**
  String get busEndTitle;

  /// 113.10 Under 'End the trip?'.
  ///
  /// In en, this message translates to:
  /// **'Families stop seeing the bus on the map.'**
  String get busEndMessage;

  /// 113.10 A trip's title: the route and the trip.
  ///
  /// In en, this message translates to:
  /// **'{route} · {trip}'**
  String busTripTitle(String route, String trip);

  /// 113.11 The school's library: its books, to search and reserve.
  ///
  /// In en, this message translates to:
  /// **'Library'**
  String get libraryTitle;

  /// 113.11 The library's search field.
  ///
  /// In en, this message translates to:
  /// **'Title, author or ISBN'**
  String get librarySearchHint;

  /// 113.11 All the library's categories.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get libraryAll;

  /// 113.11 A book's copies free on the shelf.
  ///
  /// In en, this message translates to:
  /// **'{count} on the shelf'**
  String libraryAvailable(int count);

  /// 113.11 No copy of the book is free now.
  ///
  /// In en, this message translates to:
  /// **'All copies are out'**
  String get libraryAllOut;

  /// 113.11 The book can be read in the app.
  ///
  /// In en, this message translates to:
  /// **'E-book'**
  String get libraryEbook;

  /// 113.11 The library's search found nothing.
  ///
  /// In en, this message translates to:
  /// **'No books found'**
  String get libraryNoBooks;

  /// 113.11 Under 'No books found'.
  ///
  /// In en, this message translates to:
  /// **'Try another title, author or category.'**
  String get libraryNoBooksMessage;

  /// 113.11 The books the person (or their children) has out, reserved and returned.
  ///
  /// In en, this message translates to:
  /// **'Borrowed books'**
  String get libraryBorrowed;

  /// 113.11 Where the book is in the library.
  ///
  /// In en, this message translates to:
  /// **'Shelf {shelf}'**
  String libraryShelf(String shelf);

  /// 113.11 A book's copies free on the shelf, of all its copies.
  ///
  /// In en, this message translates to:
  /// **'{available} of {copies} on the shelf'**
  String libraryCopies(int available, int copies);

  /// 113.11 Button: opens the book's e-book in the app.
  ///
  /// In en, this message translates to:
  /// **'Read the e-book'**
  String get libraryRead;

  /// 113.11 Button: reserves the book at the library.
  ///
  /// In en, this message translates to:
  /// **'Reserve'**
  String get libraryReserve;

  /// 113.11 A parent chooses which child the book is for.
  ///
  /// In en, this message translates to:
  /// **'Reserve it for'**
  String get libraryReserveFor;

  /// 113.11 The book was reserved and a copy is held now.
  ///
  /// In en, this message translates to:
  /// **'Held for you at the library until {date}.'**
  String libraryReservedReady(String date);

  /// 113.11 The book was reserved and waits for a copy to come back.
  ///
  /// In en, this message translates to:
  /// **'Reserved. You\'ll be told when a copy is held for you.'**
  String get libraryReservedWaiting;

  /// 113.11 A copy is held at the library for the person.
  ///
  /// In en, this message translates to:
  /// **'Held for {name} until {date}'**
  String libraryHoldReady(String name, String date);

  /// 113.11 The person reserved the book and waits for a copy.
  ///
  /// In en, this message translates to:
  /// **'{name} is waiting for a copy'**
  String libraryHoldWaiting(String name);

  /// 113.11 Button: cancels a reservation.
  ///
  /// In en, this message translates to:
  /// **'Cancel the reservation'**
  String get libraryCancelHold;

  /// 113.11 The books out on loan now.
  ///
  /// In en, this message translates to:
  /// **'Out now'**
  String get libraryOutNow;

  /// 113.11 When a borrowed book goes back.
  ///
  /// In en, this message translates to:
  /// **'Due {date}'**
  String libraryDue(String date);

  /// 113.11 A borrowed book wasn't returned by its date.
  ///
  /// In en, this message translates to:
  /// **'Overdue since {date}'**
  String libraryOverdue(String date);

  /// 113.11 The books the person reserved.
  ///
  /// In en, this message translates to:
  /// **'Reserved'**
  String get libraryReservedSection;

  /// 113.11 Books borrowed before and returned.
  ///
  /// In en, this message translates to:
  /// **'Returned before'**
  String get libraryReturned;

  /// 113.11 When a book came back.
  ///
  /// In en, this message translates to:
  /// **'Returned {date}'**
  String libraryReturnedOn(String date);

  /// 113.11 Nothing borrowed or reserved yet.
  ///
  /// In en, this message translates to:
  /// **'No books borrowed'**
  String get libraryNoLoans;

  /// 113.11 Under 'No books borrowed'.
  ///
  /// In en, this message translates to:
  /// **'Books lent at the library\'s desk show here with their due dates.'**
  String get libraryNoLoansMessage;

  /// 113.11 How long the library lends a book.
  ///
  /// In en, this message translates to:
  /// **'Books are lent for {days} days.'**
  String libraryLoanDays(int days);

  /// 113.11 The book's description.
  ///
  /// In en, this message translates to:
  /// **'About the book'**
  String get libraryAbout;

  /// 113.6 The School tab's row and the screen of messages between teachers and families.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get schoolMessages;

  /// 113.6 Under Messages on the School tab, for a parent or a student.
  ///
  /// In en, this message translates to:
  /// **'With your teachers'**
  String get schoolMessagesWithTeachers;

  /// 113.6 Under Messages in the Classroom tab, for a teacher.
  ///
  /// In en, this message translates to:
  /// **'With your classes\' families'**
  String get schoolMessagesWithFamilies;

  /// 113.6 Messages when the school doesn't allow them.
  ///
  /// In en, this message translates to:
  /// **'Your school hasn\'t turned on messages between teachers and families.'**
  String get schoolMessagesOff;

  /// 113.6 The row for the conversation with the school's administration.
  ///
  /// In en, this message translates to:
  /// **'The school\'s administration'**
  String get schoolMessagesOffice;

  /// 113.6 Under the school's administration in Messages.
  ///
  /// In en, this message translates to:
  /// **'Write to the school at any time.'**
  String get schoolMessagesOfficeHint;

  /// 113.6 The heading of the teachers one can write to.
  ///
  /// In en, this message translates to:
  /// **'Teachers'**
  String get schoolMessagesTeachers;

  /// 113.6 The heading of the parents and students a teacher can write to.
  ///
  /// In en, this message translates to:
  /// **'Parents and students'**
  String get schoolMessagesFamilies;

  /// 113.6 Under a parent in a teacher's contacts.
  ///
  /// In en, this message translates to:
  /// **'Parent of {names}'**
  String schoolMessagesParentOf(String names);

  /// 113.6 Under a teacher who is the class's own teacher.
  ///
  /// In en, this message translates to:
  /// **'Class teacher'**
  String get schoolMessagesClassTeacher;

  /// 113.6 When only teachers may start a conversation.
  ///
  /// In en, this message translates to:
  /// **'The teacher writes first; you can answer then.'**
  String get schoolMessagesTeacherFirst;

  /// 113.6 The school's messaging hours.
  ///
  /// In en, this message translates to:
  /// **'Messages can be sent on {days}, {from} to {to}.'**
  String schoolMessagesHours(String days, String from, String to);

  /// 113.6 Outside the messaging hours: when one can write again.
  ///
  /// In en, this message translates to:
  /// **'You can write again on {when}.'**
  String schoolMessagesOpensAt(String when);

  /// 113.6 A conversation the school closed.
  ///
  /// In en, this message translates to:
  /// **'The school closed this conversation.'**
  String get schoolMessagesClosed;

  /// 113.6 A conversation the school's rules don't allow now.
  ///
  /// In en, this message translates to:
  /// **'The school doesn\'t allow messages here now.'**
  String get schoolMessagesNotAllowed;

  /// 113.6 When the school doesn't allow photos and files.
  ///
  /// In en, this message translates to:
  /// **'The school allows text messages only.'**
  String get schoolMessagesTextOnly;

  /// 113.6 The privacy note in a conversation the school may read.
  ///
  /// In en, this message translates to:
  /// **'The school\'s administration can read this conversation.'**
  String get schoolMessagesAdminReads;

  /// 113.6 The privacy note in a conversation the school doesn't read.
  ///
  /// In en, this message translates to:
  /// **'This conversation is private: the school reads it only if a message in it is reported.'**
  String get schoolMessagesPrivate;

  /// 113.6 Messages without contacts.
  ///
  /// In en, this message translates to:
  /// **'No one to write to yet.'**
  String get schoolMessagesNone;

  /// 113.6 A teacher's button to write to a whole class at once.
  ///
  /// In en, this message translates to:
  /// **'Write to a whole class'**
  String get schoolMessagesWriteClass;

  /// 113.6 The title of the sheet to write to a whole class.
  ///
  /// In en, this message translates to:
  /// **'Write to {name}'**
  String classMessageTitle(String name);

  /// 113.6 Whom a class message goes to.
  ///
  /// In en, this message translates to:
  /// **'Send to'**
  String get classMessageTo;

  /// 113.6 A class message to the parents.
  ///
  /// In en, this message translates to:
  /// **'Parents'**
  String get classMessageParents;

  /// 113.6 A class message to the students.
  ///
  /// In en, this message translates to:
  /// **'Students'**
  String get classMessageStudents;

  /// 113.6 A class message to the parents and the students.
  ///
  /// In en, this message translates to:
  /// **'Parents and students'**
  String get classMessageFamilies;

  /// 113.6 Under the class message: how it is sent.
  ///
  /// In en, this message translates to:
  /// **'Each one gets it on their own, and their answers come back to you only.'**
  String get classMessageHint;

  /// 113.6 After a class message.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Sent to 1 person.} other{Sent to {count} people.}}'**
  String classMessageSent(int count);

  /// 113.6 After a class message: who couldn't get it yet.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 person hasn\'t signed in to the app yet.} other{{count} people haven\'t signed in to the app yet.}}'**
  String classMessageNotInApp(int count);

  /// 113.6 A class message without text.
  ///
  /// In en, this message translates to:
  /// **'Write the message first.'**
  String get classMessageMissing;

  /// 113.2 The screen where a student, teacher or staff member checks in and out at the school.
  ///
  /// In en, this message translates to:
  /// **'Check in and out'**
  String get checkinTitle;

  /// 113.2 Checks the person in at the school.
  ///
  /// In en, this message translates to:
  /// **'Check in'**
  String get checkinButton;

  /// 113.2 Checks the person out of the school.
  ///
  /// In en, this message translates to:
  /// **'Check out'**
  String get checkoutButton;

  /// 113.2 The card with today's check-in on the School, Classroom and Staff tabs.
  ///
  /// In en, this message translates to:
  /// **'Today at school'**
  String get checkinCardTitle;

  /// 113.2 Today's state: not checked in yet.
  ///
  /// In en, this message translates to:
  /// **'Not checked in yet'**
  String get checkinStateNotYet;

  /// 113.2 Today's state: at school.
  ///
  /// In en, this message translates to:
  /// **'Checked in'**
  String get checkinStateIn;

  /// 113.2 Today's state: checked out.
  ///
  /// In en, this message translates to:
  /// **'Checked out'**
  String get checkinStateLeft;

  /// 113.2 A school day without a check-in.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get checkinStateAbsent;

  /// 113.2 A day the school excused.
  ///
  /// In en, this message translates to:
  /// **'Excused'**
  String get checkinStateExcused;

  /// 113.2 A day of approved leave.
  ///
  /// In en, this message translates to:
  /// **'On leave'**
  String get checkinStateLeave;

  /// 113.2 A day that isn't one of the person's school days.
  ///
  /// In en, this message translates to:
  /// **'Not a school day'**
  String get checkinStateOff;

  /// 113.2 When the person checked in.
  ///
  /// In en, this message translates to:
  /// **'In at {time}'**
  String checkinInAt(String time);

  /// 113.2 When the person checked out.
  ///
  /// In en, this message translates to:
  /// **'Out at {time}'**
  String checkinOutAt(String time);

  /// 113.2 Checked in after the school's late time.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get checkinLate;

  /// 113.2 Checked out before the end of the day.
  ///
  /// In en, this message translates to:
  /// **'Left early'**
  String get checkinLeftEarly;

  /// 113.2 The person's school day and when late starts.
  ///
  /// In en, this message translates to:
  /// **'{starts}–{ends} · late from {late}'**
  String checkinTimes(String starts, String ends, String late);

  /// 113.2 The field for the six digits shown at the school's gate.
  ///
  /// In en, this message translates to:
  /// **'The gate\'s code'**
  String get checkinCodeLabel;

  /// 113.2 Under the gate's code field.
  ///
  /// In en, this message translates to:
  /// **'The six digits on the school\'s screen at the gate'**
  String get checkinCodeHint;

  /// 113.2 Checks in or out with the phone's location inside the school's area.
  ///
  /// In en, this message translates to:
  /// **'Use my location'**
  String get checkinWithLocation;

  /// 113.2 When the school checks both the gate's code and the area.
  ///
  /// In en, this message translates to:
  /// **'Your school asks for the gate\'s code and your location.'**
  String get checkinBothNote;

  /// 113.2 While the phone's location is read.
  ///
  /// In en, this message translates to:
  /// **'Finding your location…'**
  String get checkinLocating;

  /// 113.2 The phone's location is off.
  ///
  /// In en, this message translates to:
  /// **'Turn on your phone\'s location to check in.'**
  String get checkinLocationOff;

  /// 113.2 The app may not use the phone's location.
  ///
  /// In en, this message translates to:
  /// **'Allow the app to use your location to check in.'**
  String get checkinLocationDenied;

  /// 113.2 The phone's location couldn't be read.
  ///
  /// In en, this message translates to:
  /// **'Your location couldn\'t be found. Try again.'**
  String get checkinLocationFailed;

  /// 113.2 A check-in on time.
  ///
  /// In en, this message translates to:
  /// **'Checked in at {time}, on time.'**
  String checkinDoneOnTime(String time);

  /// 113.2 A check-in after the school's late time.
  ///
  /// In en, this message translates to:
  /// **'Checked in at {time}: late.'**
  String checkinDoneLate(String time);

  /// 113.2 A check-out.
  ///
  /// In en, this message translates to:
  /// **'Checked out at {time}.'**
  String checkinDoneOut(String time);

  /// 113.2 A check-out before the end of the day.
  ///
  /// In en, this message translates to:
  /// **'Checked out at {time}, before the end of the day.'**
  String checkinDoneEarly(String time);

  /// 113.2 The month's days at the gate.
  ///
  /// In en, this message translates to:
  /// **'This month'**
  String get checkinMonth;

  /// 113.2 The month's days present.
  ///
  /// In en, this message translates to:
  /// **'Present'**
  String get checkinCountPresent;

  /// 113.2 The month's days absent.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get checkinCountAbsent;

  /// 113.2 A month without school days yet.
  ///
  /// In en, this message translates to:
  /// **'No school days this month yet.'**
  String get checkinNoDays;

  /// 113.2 A day the school's office corrected, with its reason.
  ///
  /// In en, this message translates to:
  /// **'Corrected by the school: {reason}'**
  String checkinCorrected(String reason);

  /// 113.2 The school hasn't turned on checking in.
  ///
  /// In en, this message translates to:
  /// **'Your school doesn\'t take check-ins in the app.'**
  String get checkinOff;

  /// 113.2 Today isn't one of the person's days.
  ///
  /// In en, this message translates to:
  /// **'Today isn\'t one of your school days.'**
  String get checkinNotSchoolDay;

  /// 113.2 A student's days at the gate, on their attendance.
  ///
  /// In en, this message translates to:
  /// **'At the gate'**
  String get checkinAtGate;

  /// 113.3 The tab of the school's staff who don't teach.
  ///
  /// In en, this message translates to:
  /// **'Staff'**
  String get tabStaff;

  /// 113.3 Someone who isn't on the school's staff opens the Staff tab.
  ///
  /// In en, this message translates to:
  /// **'For the school\'s staff'**
  String get staffNotStaff;

  /// 113.3 Under the title for someone who isn't on the school's staff.
  ///
  /// In en, this message translates to:
  /// **'The school adds its staff\'s numbers; they sign in with them and their work shows here.'**
  String get staffNotStaffMessage;

  /// 113.3 The person's job, hours and duties.
  ///
  /// In en, this message translates to:
  /// **'Your work'**
  String get staffWork;

  /// 113.3 The days the person works.
  ///
  /// In en, this message translates to:
  /// **'Days: {days}'**
  String staffDays(String days);

  /// 113.3 The hours the person works.
  ///
  /// In en, this message translates to:
  /// **'Hours: {starts}–{ends}'**
  String staffHours(String starts, String ends);

  /// 113.3 What the person does, as the school wrote it.
  ///
  /// In en, this message translates to:
  /// **'Duties'**
  String get staffDuties;

  /// 113.3 The person's leave requests.
  ///
  /// In en, this message translates to:
  /// **'Leave requests'**
  String get staffLeave;

  /// 113.3 News for the school's teachers and staff only.
  ///
  /// In en, this message translates to:
  /// **'Staff news'**
  String get staffNews;

  /// 113.3 The staff's news is empty.
  ///
  /// In en, this message translates to:
  /// **'No staff news yet.'**
  String get staffNoNews;

  /// 113.3 Opens the form to ask for leave.
  ///
  /// In en, this message translates to:
  /// **'Ask for leave'**
  String get leaveAsk;

  /// 113.3 Sick, annual or other leave.
  ///
  /// In en, this message translates to:
  /// **'Kind of leave'**
  String get leaveKind;

  /// 113.3 Sick leave.
  ///
  /// In en, this message translates to:
  /// **'Sick'**
  String get leaveSick;

  /// 113.3 Annual leave.
  ///
  /// In en, this message translates to:
  /// **'Annual'**
  String get leaveAnnual;

  /// 113.3 Another kind of leave.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get leaveOther;

  /// 113.3 The first day of the leave.
  ///
  /// In en, this message translates to:
  /// **'First day'**
  String get leaveFirstDay;

  /// 113.3 The last day of the leave.
  ///
  /// In en, this message translates to:
  /// **'Last day'**
  String get leaveLastDay;

  /// 113.3 A note with the leave request.
  ///
  /// In en, this message translates to:
  /// **'Note (optional)'**
  String get leaveNote;

  /// 113.3 Adds a photo of a document (a doctor's note) to the leave request.
  ///
  /// In en, this message translates to:
  /// **'Photo of a document'**
  String get leaveAddPhoto;

  /// 113.3 Adds a PDF to the leave request.
  ///
  /// In en, this message translates to:
  /// **'PDF'**
  String get leaveAddFile;

  /// 113.3 Sends the leave request to the school.
  ///
  /// In en, this message translates to:
  /// **'Send the request'**
  String get leaveSend;

  /// 113.3 The leave request was sent.
  ///
  /// In en, this message translates to:
  /// **'Sent. The school answers in the app.'**
  String get leaveSent;

  /// 113.3 The person hasn't asked for leave yet.
  ///
  /// In en, this message translates to:
  /// **'No leave requests yet.'**
  String get leaveNone;

  /// 113.3 How many days a leave request is for.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 day} other{{count} days}}'**
  String leaveDays(int count);

  /// 113.3 A leave request the school hasn't answered.
  ///
  /// In en, this message translates to:
  /// **'Waiting'**
  String get leavePending;

  /// 113.3 A leave request the school approved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get leaveApproved;

  /// 113.3 A leave request the school refused.
  ///
  /// In en, this message translates to:
  /// **'Not approved'**
  String get leaveRefused;

  /// 113.3 A leave request the person withdrew.
  ///
  /// In en, this message translates to:
  /// **'Withdrawn'**
  String get leaveCancelled;

  /// 113.3 Withdraws a leave request the school hasn't answered.
  ///
  /// In en, this message translates to:
  /// **'Withdraw'**
  String get leaveWithdraw;

  /// 113.3 The school's note with its answer to a leave request.
  ///
  /// In en, this message translates to:
  /// **'The school: {note}'**
  String leaveSchoolNote(String note);

  /// 113.3 A leave request's first and last days.
  ///
  /// In en, this message translates to:
  /// **'{from} – {to}'**
  String leaveDates(String from, String to);

  /// 113.3 The leave form's last day is before its first.
  ///
  /// In en, this message translates to:
  /// **'The last day is on or after the first.'**
  String get leaveDatesOrder;

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'Syllabus'**
  String get classroomSyllabus;

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'No syllabus for this class yet'**
  String get syllabusNone;

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'The school writes each subject\'s syllabus. It shows here once it does.'**
  String get syllabusNoneMessage;

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'{covered} of {total} covered ({percent}%)'**
  String syllabusCovered(int covered, int total, int percent);

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'The plan: {percent}% by today'**
  String syllabusPlanned(int percent);

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Behind the plan by 1 lesson} other{Behind the plan by {count} lessons}}'**
  String syllabusBehind(int count);

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'On plan'**
  String get syllabusOnPlan;

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'Ahead of the plan'**
  String get syllabusAhead;

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'The plan now: {topic}'**
  String syllabusPlanNow(String topic);

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'{from} – {to}'**
  String syllabusDays(String from, String to);

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'Covered on {date}'**
  String syllabusCoveredOn(String date);

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'Not covered yet'**
  String get syllabusNotCovered;

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'Mark covered'**
  String get syllabusMarkCovered;

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'Not covered'**
  String get syllabusUnmark;

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'Covered on'**
  String get syllabusCoveredDay;

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'Note (optional)'**
  String get syllabusNote;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Reports to the school'**
  String get classroomReports;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'On your students and classes: drafts, sent, sent back and approved'**
  String get classroomReportsHint;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Drafts'**
  String get reportsDrafts;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Sent'**
  String get reportsSent;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Sent back'**
  String get reportsReturned;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get reportsApproved;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'No reports here'**
  String get reportsNone;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Write a report'**
  String get reportsWrite;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Template'**
  String get reportsTemplate;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'The school hasn\'t made its report templates yet.'**
  String get reportsNoTemplates;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Class'**
  String get reportsClass;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Student'**
  String get reportsStudent;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Subject (optional)'**
  String get reportsSubject;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'No subject'**
  String get reportsNoSubject;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Start the report'**
  String get reportsStart;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Choose a template, a class and, for a report on a student, the student.'**
  String get reportsChooseMissing;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Save draft'**
  String get reportsSaveDraft;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Send to the school'**
  String get reportsSend;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'A note for the school (optional)'**
  String get reportsNoteForSchool;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Draft saved.'**
  String get reportsDraftSaved;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Sent to the school.'**
  String get reportsSentDone;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Delete draft'**
  String get reportsDelete;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Delete this draft?'**
  String get reportsDeleteConfirm;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Draft deleted.'**
  String get reportsDeleted;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Read by the school'**
  String get reportsRead;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Not read yet'**
  String get reportsNotRead;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Shared with the parents'**
  String get reportsShared;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'The school'**
  String get reportsFromSchool;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get reportsFromYou;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Comments'**
  String get reportsComments;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'This report is with the school. You can change it if they send it back.'**
  String get reportsLocked;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'The school sent this back for changes: read its comment, change the report and send it again.'**
  String get reportsReturnedBanner;

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'{value} out of 5'**
  String reportsRatingOf(int value);

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'{from} – {to}'**
  String reportsPeriod(String from, String to);

  /// 113.5 On the teacher's reports to the school, in the Classroom tab.
  ///
  /// In en, this message translates to:
  /// **'Fill in “{label}” before sending.'**
  String reportsRequiredMissing(String label);

  /// 113.5 In a child's school for their parents: the teachers' reports the school shared.
  ///
  /// In en, this message translates to:
  /// **'Teachers\' reports'**
  String get schoolReports;

  /// 113.5 In a child's school for their parents: the teachers' reports the school shared.
  ///
  /// In en, this message translates to:
  /// **'No reports shared yet'**
  String get schoolReportsNone;

  /// 113.5 In a child's school for their parents: the teachers' reports the school shared.
  ///
  /// In en, this message translates to:
  /// **'When the school shares a teacher\'s report on your child, it shows here.'**
  String get schoolReportsNoneMessage;

  /// 113.5 In a child's school for their parents: the teachers' reports the school shared.
  ///
  /// In en, this message translates to:
  /// **'By {name}'**
  String schoolReportsBy(String name);

  /// 113.5 In a child's school for their parents: the teachers' reports the school shared.
  ///
  /// In en, this message translates to:
  /// **'The school shares these with the student\'s parents.'**
  String get schoolReportsParentsOnly;

  /// 113.5 On a class's syllabus screen in the teacher's Classroom tab: the class's progress through each subject's syllabus.
  ///
  /// In en, this message translates to:
  /// **'Saved.'**
  String get syllabusSaved;

  /// 113.1 The courses list's row of course bundles.
  ///
  /// In en, this message translates to:
  /// **'Bundles'**
  String get bundles;

  /// 113.1 How many courses a bundle has.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 course} other{{count} courses}}'**
  String bundleCourseCount(int count);

  /// 113.1 What a bundle's courses cost on their own, next to the bundle's price.
  ///
  /// In en, this message translates to:
  /// **'Instead of {price}'**
  String bundleInsteadOf(String price);

  /// 113.1 Above the price on a bundle's page.
  ///
  /// In en, this message translates to:
  /// **'Bundle price'**
  String get bundlePrice;

  /// 113.1 Buys a bundle of courses.
  ///
  /// In en, this message translates to:
  /// **'Buy the bundle'**
  String get bundleBuy;

  /// 113.1 The heading of a bundle's courses on its page.
  ///
  /// In en, this message translates to:
  /// **'Courses in this bundle'**
  String get bundleCoursesIn;

  /// 113.1 On a bundle's page, when the student has some of its courses.
  ///
  /// In en, this message translates to:
  /// **'You have {count} of these courses already: they stay yours, and the bundle adds the others.'**
  String bundleOwnedSome(int count);

  /// 113.1 On a bundle's page, when the student has all its courses.
  ///
  /// In en, this message translates to:
  /// **'Every course in this bundle is yours.'**
  String get bundleOwned;

  /// 113.1 After a bundle was bought or a coupon made it free.
  ///
  /// In en, this message translates to:
  /// **'You\'re in every course of the bundle. Happy learning!'**
  String get bundleEnrolled;

  /// 113.1 Opens My courses from a bundle the student has.
  ///
  /// In en, this message translates to:
  /// **'Go to My courses'**
  String get bundleMyCourses;

  /// 113.1 On a course's page: the bundles that have it.
  ///
  /// In en, this message translates to:
  /// **'Also in a bundle'**
  String get bundleAlsoIn;

  /// 113.1 A bundle the app doesn't sell on this phone.
  ///
  /// In en, this message translates to:
  /// **'This bundle can\'t be bought in the app.'**
  String get bundleNotSold;

  /// 113.1 While a bundle's page loads.
  ///
  /// In en, this message translates to:
  /// **'Loading the bundle…'**
  String get loadingBundle;

  /// 113.1 A coupon that takes the whole price.
  ///
  /// In en, this message translates to:
  /// **'The coupon makes it free: you pay nothing.'**
  String get couponFree;

  /// 113.1 Enrolls with a coupon that takes the whole price, without paying.
  ///
  /// In en, this message translates to:
  /// **'Enroll for free'**
  String get couponEnrollFree;

  /// 113.7 An exam's attempt whose results show once it closes.
  ///
  /// In en, this message translates to:
  /// **'Results after the exam closes'**
  String get attemptAwaitingResults;

  /// 113.7 Account and the screen title: the academy's learning paths.
  ///
  /// In en, this message translates to:
  /// **'Learning paths'**
  String get learningPaths;

  /// 113.7 The learning paths list when there are none.
  ///
  /// In en, this message translates to:
  /// **'No learning paths yet'**
  String get noLearningPaths;

  /// 113.7 How far the student got in a learning path.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total} courses completed'**
  String pathProgress(int done, int total);

  /// 113.7 A learning path whose courses open one after another.
  ///
  /// In en, this message translates to:
  /// **'Take these courses in order'**
  String get pathInOrder;

  /// 113.7 A course of a learning path that waits for the one before it.
  ///
  /// In en, this message translates to:
  /// **'Opens after the course before it'**
  String get pathLocked;

  /// 113.7 A course the student completed (a learning path, the courses a course needs).
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get courseDoneLabel;

  /// 113.7 A course page: the courses to finish before enrolling.
  ///
  /// In en, this message translates to:
  /// **'Finish these courses first'**
  String get prerequisitesTitle;

  /// 113.7 Under the courses a course needs first.
  ///
  /// In en, this message translates to:
  /// **'You can enrol once you\'ve completed them.'**
  String get prerequisitesHint;

  /// 113.7 A course page: the student's final score (the quizzes' and assignments').
  ///
  /// In en, this message translates to:
  /// **'Final score: {score}%'**
  String finalScore(int score);

  /// 113.7 A course page: the final score and the one the course needs.
  ///
  /// In en, this message translates to:
  /// **'Final score: {score}% · {min}% needed to complete it'**
  String finalScoreNeeded(int score, int min);

  /// 113.7 Account and the screen title: the student's points and badges.
  ///
  /// In en, this message translates to:
  /// **'Points and badges'**
  String get achievementsTitle;

  /// 113.7 A number of points.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 point} other{{count} points}}'**
  String pointsCount(int count);

  /// 113.7 The days in a row the student learned, to today.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1-day streak} other{{count}-day streak}}'**
  String streakDays(int count);

  /// 113.7 The longest streak the student had.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Best streak: 1 day} other{Best streak: {count} days}}'**
  String bestStreak(int count);

  /// 113.7 The badges on the points and badges screen.
  ///
  /// In en, this message translates to:
  /// **'Badges'**
  String get badgesTitle;

  /// 113.7 A badge the student hasn't earned yet.
  ///
  /// In en, this message translates to:
  /// **'Not yet'**
  String get badgeNotYet;

  /// 113.7 A badge: the first lesson completed.
  ///
  /// In en, this message translates to:
  /// **'First lesson'**
  String get badgeFirstLesson;

  /// 113.7 A badge: the first quiz passed.
  ///
  /// In en, this message translates to:
  /// **'First quiz passed'**
  String get badgeFirstQuiz;

  /// 113.7 A badge: a quiz with every answer right.
  ///
  /// In en, this message translates to:
  /// **'Perfect quiz'**
  String get badgePerfectQuiz;

  /// 113.7 A badge: the first assignment done.
  ///
  /// In en, this message translates to:
  /// **'First assignment'**
  String get badgeFirstAssignment;

  /// 113.7 A badge: learning seven days in a row.
  ///
  /// In en, this message translates to:
  /// **'7-day streak'**
  String get badgeStreak7;

  /// 113.7 A badge: a course completed.
  ///
  /// In en, this message translates to:
  /// **'Course completed'**
  String get badgeCourseCompleted;

  /// 113.7 A badge: a learning path completed.
  ///
  /// In en, this message translates to:
  /// **'Path completed'**
  String get badgePathCompleted;

  /// 113.7 A badge: 500 points earned.
  ///
  /// In en, this message translates to:
  /// **'500 points'**
  String get badgePoints500;

  /// 113.7 A course's leaderboard: its button and screen title.
  ///
  /// In en, this message translates to:
  /// **'Leaderboard'**
  String get leaderboardTitle;

  /// 113.7 The leaderboard of the whole course.
  ///
  /// In en, this message translates to:
  /// **'Course'**
  String get leaderboardCourse;

  /// 113.7 The leaderboard of the student's own cohort.
  ///
  /// In en, this message translates to:
  /// **'My cohort'**
  String get leaderboardCohort;

  /// 113.7 The student's place on the leaderboard.
  ///
  /// In en, this message translates to:
  /// **'You\'re #{rank} of {total}'**
  String leaderboardRank(int rank, int total);

  /// 113.7 A leaderboard without students.
  ///
  /// In en, this message translates to:
  /// **'No one on the leaderboard yet'**
  String get leaderboardEmpty;

  /// 113.7 Under a leaderboard: how names show.
  ///
  /// In en, this message translates to:
  /// **'Only first names and an initial are shown.'**
  String get leaderboardPrivacy;

  /// 113.7 The student's own row on a leaderboard.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get leaderboardYou;

  /// 113.7 A course page: the student's notes and bookmarks in it.
  ///
  /// In en, this message translates to:
  /// **'My notes'**
  String get myNotes;

  /// 113.7 A lesson's notes: the button and the sheet's title.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get notesTitle;

  /// 113.7 Under the student's notes.
  ///
  /// In en, this message translates to:
  /// **'Only you can see your notes.'**
  String get notesPrivate;

  /// 113.7 The notes when there are none.
  ///
  /// In en, this message translates to:
  /// **'No notes yet'**
  String get noNotes;

  /// 113.7 The field for a new note on a lesson.
  ///
  /// In en, this message translates to:
  /// **'Write a note for yourself'**
  String get noteHint;

  /// 113.7 Saves a new note on a lesson.
  ///
  /// In en, this message translates to:
  /// **'Add note'**
  String get addNote;

  /// 113.7 Where the video was when a note was written.
  ///
  /// In en, this message translates to:
  /// **'At {time}'**
  String noteAt(String time);

  /// 113.7 Changes a note.
  ///
  /// In en, this message translates to:
  /// **'Edit note'**
  String get editNote;

  /// 113.7 Deletes a note.
  ///
  /// In en, this message translates to:
  /// **'Delete note'**
  String get deleteNote;

  /// 113.7 Bookmarks a lesson.
  ///
  /// In en, this message translates to:
  /// **'Bookmark'**
  String get bookmarkLesson;

  /// 113.7 Takes a lesson's bookmark away.
  ///
  /// In en, this message translates to:
  /// **'Remove bookmark'**
  String get removeBookmark;

  /// 113.7 The lessons the student bookmarked in a course.
  ///
  /// In en, this message translates to:
  /// **'Bookmarks'**
  String get bookmarksTitle;

  /// 113.7 A lesson's discussion: its button and screen title.
  ///
  /// In en, this message translates to:
  /// **'Discussion'**
  String get lessonDiscussion;

  /// 113.7 How many questions a lesson's discussion has.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No questions yet} =1{1 question} other{{count} questions}}'**
  String discussionCount(int count);

  /// 113.7 The field for a question in a lesson's discussion.
  ///
  /// In en, this message translates to:
  /// **'Ask about this lesson'**
  String get askAboutLesson;

  /// 113.7 A question the teacher pinned first.
  ///
  /// In en, this message translates to:
  /// **'Pinned'**
  String get pinnedLabel;

  /// 113.7 The course's teacher pins a question first.
  ///
  /// In en, this message translates to:
  /// **'Pin'**
  String get pinQuestion;

  /// 113.7 The course's teacher unpins a question.
  ///
  /// In en, this message translates to:
  /// **'Unpin'**
  String get unpinQuestion;

  /// 113.7 Deletes a question (its author or the teacher).
  ///
  /// In en, this message translates to:
  /// **'Delete question'**
  String get deleteQuestion;

  /// 113.7 Deletes an answer (its author or the teacher).
  ///
  /// In en, this message translates to:
  /// **'Delete answer'**
  String get deleteAnswer;

  /// 113.7 Asks before deleting a note, a question or an answer.
  ///
  /// In en, this message translates to:
  /// **'Delete it? This can\'t be undone.'**
  String get deleteConfirm;

  /// 113.7 A quiz that is a timed exam.
  ///
  /// In en, this message translates to:
  /// **'Exam'**
  String get examLabel;

  /// 113.7 When an exam opens.
  ///
  /// In en, this message translates to:
  /// **'Opens {time}'**
  String examOpensAt(String time);

  /// 113.7 When an exam closes.
  ///
  /// In en, this message translates to:
  /// **'Closes {time}'**
  String examClosesAt(String time);

  /// 113.7 An exam before it opens.
  ///
  /// In en, this message translates to:
  /// **'This exam isn\'t open yet'**
  String get examNotOpen;

  /// 113.7 An exam after it closed.
  ///
  /// In en, this message translates to:
  /// **'This exam has closed'**
  String get examClosed;

  /// 113.7 Goes back to an exam's attempt that's going on.
  ///
  /// In en, this message translates to:
  /// **'Back to the exam'**
  String get examResume;

  /// 113.7 When an exam's results show.
  ///
  /// In en, this message translates to:
  /// **'Your results show on {time}'**
  String examResultsAt(String time);

  /// 113.7 An exam's answers sent after its time.
  ///
  /// In en, this message translates to:
  /// **'The time was over: your answers came too late.'**
  String get examTimeUp;

  /// 113.7 On an exam's page, before starting.
  ///
  /// In en, this message translates to:
  /// **'The time keeps running if you leave the app.'**
  String get examTimedHint;

  /// 113.7 An assignment's rubric (criteria and levels).
  ///
  /// In en, this message translates to:
  /// **'Rubric'**
  String get rubricTitle;

  /// 113.7 A rubric criterion's points out of its highest.
  ///
  /// In en, this message translates to:
  /// **'{points} of {max}'**
  String rubricPoints(int points, int max);

  /// 113.7 A rubric level and its points.
  ///
  /// In en, this message translates to:
  /// **'{level} · {points}'**
  String rubricLevelPoints(String level, int points);

  /// 113.7 Grading with a rubric in the Teacher tab.
  ///
  /// In en, this message translates to:
  /// **'Choose a level for each criterion'**
  String get rubricChooseAll;

  /// 113.7 The rubric's levels added up while grading.
  ///
  /// In en, this message translates to:
  /// **'Score: {score} of {max}'**
  String rubricTotal(int score, int max);

  /// 113.7 Which try of an assignment it is.
  ///
  /// In en, this message translates to:
  /// **'Try {attempt} of {total}'**
  String tryOf(int attempt, int total);

  /// 113.7 A graded assignment that allows more tries.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{You can hand it in again once.} other{You can hand it in again {count} times.}}'**
  String triesLeft(int count);

  /// 113.7 Hands a graded assignment in again (another try).
  ///
  /// In en, this message translates to:
  /// **'Hand in again'**
  String get handInAgain;

  /// 113.4 The bottom tab only the school's parents see: their children's days, slips, excuses and pick-up.
  ///
  /// In en, this message translates to:
  /// **'Parent'**
  String get tabParent;

  /// 113.4 The Parent tab, for someone the school didn't add as a parent: its title.
  ///
  /// In en, this message translates to:
  /// **'For the school\'s parents'**
  String get parentNotParentTitle;

  /// 113.4 The Parent tab, for someone the school didn't add as a parent: what to do.
  ///
  /// In en, this message translates to:
  /// **'The school hasn\'t added this number as a parent. Ask the school to link it to your children.'**
  String get parentNotParentMessage;

  /// 113.4 On the School tab of a parent who isn't a student: their children's days are in the Parent tab.
  ///
  /// In en, this message translates to:
  /// **'Your children are in the Parent tab'**
  String get parentChildrenTitle;

  /// 113.4 On the School tab of a parent who isn't a student: what the Parent tab has.
  ///
  /// In en, this message translates to:
  /// **'Each child\'s day, the slips to sign, absences to excuse and who picks them up.'**
  String get parentChildrenMessage;

  /// 113.4 Button on the School tab of a parent: opens the Parent tab.
  ///
  /// In en, this message translates to:
  /// **'Open the Parent tab'**
  String get parentOpen;

  /// 113.4 On a child's day: today is a holiday or a break.
  ///
  /// In en, this message translates to:
  /// **'No school today: {title}'**
  String parentDayOff(String title);

  /// 113.4 On a child's day: who picks the child up today.
  ///
  /// In en, this message translates to:
  /// **'Picks up today: {name}'**
  String parentPicksUpToday(String name);

  /// 113.4 On a child's day: the child's check-in today.
  ///
  /// In en, this message translates to:
  /// **'At the gate'**
  String get parentAtTheGate;

  /// 113.4 On a child's day: how much homework is due.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No homework due} =1{1 homework due} other{{count} homework due}}'**
  String parentHomeworkDue(int count);

  /// 113.4 On a child's day: the three latest scores.
  ///
  /// In en, this message translates to:
  /// **'Latest grades'**
  String get parentLatestGrades;

  /// 113.4 On a child's day: the child's behaviour points.
  ///
  /// In en, this message translates to:
  /// **'{points} points'**
  String parentBehaviourPoints(int points);

  /// 113.4 On a child's day: the library books out now.
  ///
  /// In en, this message translates to:
  /// **'Library books'**
  String get parentLibraryBooks;

  /// 113.4 On a child's day: when a library book is due back.
  ///
  /// In en, this message translates to:
  /// **'Due back {date}'**
  String parentBookDue(String date);

  /// 113.4 On a child's day: a library book that is overdue.
  ///
  /// In en, this message translates to:
  /// **'Overdue since {date}'**
  String parentBookOverdue(String date);

  /// 113.4 On a child's day: the child's bus is running now.
  ///
  /// In en, this message translates to:
  /// **'The bus is on its way'**
  String get parentBusOnTheWay;

  /// 113.4 On a child's day: the next events and exams on the calendar.
  ///
  /// In en, this message translates to:
  /// **'Coming up'**
  String get parentComing;

  /// 113.4 The list of a child's parts on the Parent tab.
  ///
  /// In en, this message translates to:
  /// **'Everything for {name}'**
  String parentEverything(String name);

  /// 113.4 Opens the permission slips to sign.
  ///
  /// In en, this message translates to:
  /// **'Permission slips'**
  String get parentSlips;

  /// 113.4 How many permission slips wait for an answer.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Nothing to sign} =1{1 to sign} other{{count} to sign}}'**
  String parentSlipsWaiting(int count);

  /// 113.4 Opens the child's absence excuses.
  ///
  /// In en, this message translates to:
  /// **'Absence excuses'**
  String get parentExcuses;

  /// 113.4 Under the absence excuses tile.
  ///
  /// In en, this message translates to:
  /// **'A day or several, with the reason'**
  String get parentExcusesSubtitle;

  /// 113.4 Opens who may pick the child up.
  ///
  /// In en, this message translates to:
  /// **'Who picks up'**
  String get parentPickup;

  /// 113.4 How many people may pick the child up.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No one listed yet} =1{1 person} other{{count} people}}'**
  String parentPickupPeople(int count);

  /// 113.4 How many teachers' reports the school shared.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{None shared yet} =1{1 shared} other{{count} shared}}'**
  String parentReportsCount(int count);

  /// 113.4 A permission slip's due date.
  ///
  /// In en, this message translates to:
  /// **'Answer by {date}'**
  String slipDue(String date);

  /// 113.4 A permission slip past its due date.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get slipClosed;

  /// 113.4 A permission slip's note of a fee.
  ///
  /// In en, this message translates to:
  /// **'Fee: {note}'**
  String slipFee(String note);

  /// 113.4 Signs a permission slip yes.
  ///
  /// In en, this message translates to:
  /// **'Yes, I agree'**
  String get slipYes;

  /// 113.4 Signs a permission slip no.
  ///
  /// In en, this message translates to:
  /// **'No'**
  String get slipNo;

  /// 113.4 A child's slip signed yes.
  ///
  /// In en, this message translates to:
  /// **'Signed yes by {name}'**
  String slipSignedYes(String name);

  /// 113.4 A child's slip signed no.
  ///
  /// In en, this message translates to:
  /// **'Declined by {name}'**
  String slipSignedNo(String name);

  /// 113.4 A child's slip not answered yet.
  ///
  /// In en, this message translates to:
  /// **'Not answered'**
  String get slipNotAnswered;

  /// 113.4 What a parent signs when they answer yes.
  ///
  /// In en, this message translates to:
  /// **'{child} may take part: {title}.'**
  String slipAgree(String child, String title);

  /// 113.4 What a parent signs when they answer no.
  ///
  /// In en, this message translates to:
  /// **'{child} won\'t take part: {title}.'**
  String slipDecline(String child, String title);

  /// 113.4 The name a parent signs a slip with.
  ///
  /// In en, this message translates to:
  /// **'Your name'**
  String get slipYourName;

  /// 113.4 Signs the permission slip.
  ///
  /// In en, this message translates to:
  /// **'Sign'**
  String get slipSign;

  /// 113.4 After a parent signed a slip.
  ///
  /// In en, this message translates to:
  /// **'Signed. The school sees your answer.'**
  String get slipSigned;

  /// 113.4 The permission slips list when there is none.
  ///
  /// In en, this message translates to:
  /// **'No permission slips.'**
  String get slipsNone;

  /// 113.4 A slip signed without a name.
  ///
  /// In en, this message translates to:
  /// **'Sign with your name.'**
  String get slipNameNeeded;

  /// 113.4 Starts an absence excuse.
  ///
  /// In en, this message translates to:
  /// **'Excuse an absence'**
  String get excuseNew;

  /// 113.4 An excuse's first day.
  ///
  /// In en, this message translates to:
  /// **'First day'**
  String get excuseFirstDay;

  /// 113.4 An excuse's last day.
  ///
  /// In en, this message translates to:
  /// **'Last day'**
  String get excuseLastDay;

  /// 113.4 Why the child was or will be absent.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get excuseReason;

  /// 113.4 Adds a photo of a doctor's note to an excuse.
  ///
  /// In en, this message translates to:
  /// **'Photo of a note'**
  String get excuseAddPhoto;

  /// 113.4 Adds a PDF to an excuse.
  ///
  /// In en, this message translates to:
  /// **'PDF'**
  String get excuseAddFile;

  /// 113.4 Sends an absence excuse.
  ///
  /// In en, this message translates to:
  /// **'Send to the school'**
  String get excuseSend;

  /// 113.4 After an excuse was sent.
  ///
  /// In en, this message translates to:
  /// **'Sent. The school will answer in the app.'**
  String get excuseSent;

  /// 113.4 An excuse sent without a reason.
  ///
  /// In en, this message translates to:
  /// **'Write the reason.'**
  String get excuseReasonNeeded;

  /// 113.4 An excuse the school hasn't answered.
  ///
  /// In en, this message translates to:
  /// **'Waiting'**
  String get excusePending;

  /// 113.4 An excuse the school accepted.
  ///
  /// In en, this message translates to:
  /// **'Excused'**
  String get excuseAccepted;

  /// 113.4 An excuse the school declined.
  ///
  /// In en, this message translates to:
  /// **'Not accepted'**
  String get excuseDeclined;

  /// 113.4 An excuse the parent withdrew.
  ///
  /// In en, this message translates to:
  /// **'Withdrawn'**
  String get excuseWithdrawn;

  /// 113.4 Withdraws an excuse while it waits.
  ///
  /// In en, this message translates to:
  /// **'Withdraw'**
  String get excuseWithdraw;

  /// 113.4 The excuses list when there is none.
  ///
  /// In en, this message translates to:
  /// **'No excuses sent.'**
  String get excusesNone;

  /// 113.4 The school's note with its answer to an excuse.
  ///
  /// In en, this message translates to:
  /// **'The school: {note}'**
  String excuseSchoolNote(String note);

  /// 113.4 At the top of the pick-up screen.
  ///
  /// In en, this message translates to:
  /// **'Who may pick {name} up from school. The school sees this list at the gate.'**
  String pickupIntro(String name);

  /// 113.4 The pick-up list when empty.
  ///
  /// In en, this message translates to:
  /// **'No one on the list yet.'**
  String get pickupNone;

  /// 113.4 Adds a person to the pick-up list.
  ///
  /// In en, this message translates to:
  /// **'Add someone'**
  String get pickupAdd;

  /// 113.4 A pick-up person's name.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get pickupName;

  /// 113.4 A pick-up person's relation to the child (grandmother, uncle…).
  ///
  /// In en, this message translates to:
  /// **'Relation'**
  String get pickupRelation;

  /// 113.4 A pick-up person's phone number.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get pickupPhone;

  /// 113.4 Adds a photo of a pick-up person.
  ///
  /// In en, this message translates to:
  /// **'Add a photo'**
  String get pickupPhoto;

  /// 113.4 Takes a person off the pick-up list.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get pickupRemove;

  /// 113.4 After the pick-up list was saved.
  ///
  /// In en, this message translates to:
  /// **'Saved. The school sees the list.'**
  String get pickupSaved;

  /// 113.4 A pick-up person without a name.
  ///
  /// In en, this message translates to:
  /// **'Write their name.'**
  String get pickupNameNeeded;

  /// 113.4 The one-day pick-up note part.
  ///
  /// In en, this message translates to:
  /// **'Just for one day'**
  String get pickupOneDay;

  /// 113.4 What the one-day pick-up note is for.
  ///
  /// In en, this message translates to:
  /// **'Someone else picks up on a day? Tell the school: it sees it on that day\'s board.'**
  String get pickupOneDayIntro;

  /// 113.4 The day of a one-day pick-up note.
  ///
  /// In en, this message translates to:
  /// **'Day'**
  String get pickupDay;

  /// 113.4 A one-day pick-up note's note.
  ///
  /// In en, this message translates to:
  /// **'Note for the school'**
  String get pickupNote;

  /// 113.4 Sends a one-day pick-up note.
  ///
  /// In en, this message translates to:
  /// **'Tell the school'**
  String get pickupTell;

  /// 113.4 After a one-day pick-up note was sent.
  ///
  /// In en, this message translates to:
  /// **'The school sees it on that day\'s board.'**
  String get pickupTold;

  /// 113.4 A one-day pick-up note: the day and who picks up.
  ///
  /// In en, this message translates to:
  /// **'{date}: {name}'**
  String pickupNoteLine(String date, String name);

  /// 113.4 Deletes a one-day pick-up note.
  ///
  /// In en, this message translates to:
  /// **'Take back'**
  String get pickupTakeBack;

  /// 113.12 Opens the person's own payslips (Staff and Classroom tabs).
  ///
  /// In en, this message translates to:
  /// **'My payslips'**
  String get staffPayslips;

  /// 113.12 The payslips list is empty.
  ///
  /// In en, this message translates to:
  /// **'No payslips yet. They show here once the school makes them final.'**
  String get payslipsNone;

  /// 113.12 Above the payslips: nothing is paid through the app.
  ///
  /// In en, this message translates to:
  /// **'The school records salaries by hand: it pays in cash or by bank transfer and writes it down here.'**
  String get payslipsByHand;

  /// 113.12 A final payslip the school hasn't recorded as paid.
  ///
  /// In en, this message translates to:
  /// **'Not paid yet'**
  String get payslipUnpaid;

  /// 113.12 A payslip paid in part.
  ///
  /// In en, this message translates to:
  /// **'Partly paid'**
  String get payslipPartPaid;

  /// 113.12 A payslip paid in full.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get payslipPaid;

  /// 113.12 A payslip's net pay on the list.
  ///
  /// In en, this message translates to:
  /// **'Net {amount}'**
  String payslipNetLine(String amount);

  /// 113.12 A payslip's base salary.
  ///
  /// In en, this message translates to:
  /// **'Base salary'**
  String get payslipBase;

  /// 113.12 A bonus line without a name.
  ///
  /// In en, this message translates to:
  /// **'Bonus'**
  String get payslipBonus;

  /// 113.12 A deduction line without a name.
  ///
  /// In en, this message translates to:
  /// **'Deduction'**
  String get payslipDeduction;

  /// 113.12 A deduction for days absent, with how many.
  ///
  /// In en, this message translates to:
  /// **'Absences ({count})'**
  String payslipAbsences(int count);

  /// 113.12 A deduction for coming late, with how many times.
  ///
  /// In en, this message translates to:
  /// **'Late arrivals ({count})'**
  String payslipLateness(int count);

  /// 113.12 Part of an advance taken back from the pay.
  ///
  /// In en, this message translates to:
  /// **'Advance taken back'**
  String get payslipAdvance;

  /// 113.12 Base, allowances and bonuses together.
  ///
  /// In en, this message translates to:
  /// **'Gross'**
  String get payslipGross;

  /// 113.12 All deductions together.
  ///
  /// In en, this message translates to:
  /// **'Deductions'**
  String get payslipDeductions;

  /// 113.12 What the person is paid.
  ///
  /// In en, this message translates to:
  /// **'Net pay'**
  String get payslipNet;

  /// 113.12 What the school recorded as paid so far.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get payslipPaidSoFar;

  /// 113.12 What is still to be paid.
  ///
  /// In en, this message translates to:
  /// **'Left to pay'**
  String get payslipLeft;

  /// 113.12 The payments the school recorded.
  ///
  /// In en, this message translates to:
  /// **'Payments'**
  String get payslipPayments;

  /// 113.12 A payment in cash, on a day.
  ///
  /// In en, this message translates to:
  /// **'Cash, {date}'**
  String payslipCash(String date);

  /// 113.12 A payment by bank transfer, on a day.
  ///
  /// In en, this message translates to:
  /// **'Bank transfer, {date}'**
  String payslipBank(String date);

  /// 113.12 The month's days at the gate on a payslip.
  ///
  /// In en, this message translates to:
  /// **'{working} working days · {present} present · {absent} absent · {late} late · {leave} on leave'**
  String payslipDays(int working, int present, int absent, int late, int leave);

  /// 113.12 Opens the payslip's PDF in the app's viewer.
  ///
  /// In en, this message translates to:
  /// **'View the PDF'**
  String get payslipViewPdf;

  /// 113.12 Opens the payslip's PDF outside the app, to keep it.
  ///
  /// In en, this message translates to:
  /// **'Download the PDF'**
  String get payslipDownloadPdf;

  /// 113.12 The person's advances still being taken back.
  ///
  /// In en, this message translates to:
  /// **'Advances'**
  String get payslipAdvances;

  /// 113.12 An advance: how much, when, each month's part and what is left.
  ///
  /// In en, this message translates to:
  /// **'{amount} given on {date} · {instalment} a month · {left} left'**
  String payslipAdvanceLine(
    String amount,
    String date,
    String instalment,
    String left,
  );

  /// 113.9 Opens a university student's registration for the term.
  ///
  /// In en, this message translates to:
  /// **'Register for the term'**
  String get uniRegister;

  /// 113.9 Opens a university student's week of lectures.
  ///
  /// In en, this message translates to:
  /// **'My timetable'**
  String get uniTimetable;

  /// 113.9 Opens a university student's results by term.
  ///
  /// In en, this message translates to:
  /// **'Results'**
  String get uniResults;

  /// 113.9 Opens a university student's transcript.
  ///
  /// In en, this message translates to:
  /// **'Transcript'**
  String get uniTranscript;

  /// 113.9 Opens the courses of the student's program: done, in progress and left.
  ///
  /// In en, this message translates to:
  /// **'Study plan'**
  String get uniStudyPlan;

  /// 113.9 The label of a university student's cumulative GPA.
  ///
  /// In en, this message translates to:
  /// **'GPA'**
  String get uniGpa;

  /// 113.9 The credits a student earned of those their program needs.
  ///
  /// In en, this message translates to:
  /// **'{earned} of {required} credits'**
  String uniCreditsOf(String earned, String required);

  /// 113.9 A course's or a term's credits.
  ///
  /// In en, this message translates to:
  /// **'{credits} credits'**
  String uniCredits(String credits);

  /// 113.9 The lecturer who approves the student's registration.
  ///
  /// In en, this message translates to:
  /// **'Advisor: {name}'**
  String uniAdvisor(String name);

  /// 113.9 A student the university hasn't given a program yet.
  ///
  /// In en, this message translates to:
  /// **'No program yet: the university adds it.'**
  String get uniNoProgram;

  /// 113.9 A registration not sent to the advisor yet.
  ///
  /// In en, this message translates to:
  /// **'Not sent'**
  String get uniStatusDraft;

  /// 113.9 A registration waiting for the advisor's answer.
  ///
  /// In en, this message translates to:
  /// **'With your advisor'**
  String get uniStatusSubmitted;

  /// 113.9 A registration the advisor approved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get uniStatusApproved;

  /// 113.9 A registration the advisor sent back to change.
  ///
  /// In en, this message translates to:
  /// **'Sent back'**
  String get uniStatusReturned;

  /// 113.9 The term's registration isn't open yet.
  ///
  /// In en, this message translates to:
  /// **'Registration opens on {date}'**
  String uniPhaseBefore(String date);

  /// 113.9 The term's registration is open.
  ///
  /// In en, this message translates to:
  /// **'Registration is open until {date}'**
  String uniPhaseOpen(String date);

  /// 113.9 Registration is over; courses can still be dropped.
  ///
  /// In en, this message translates to:
  /// **'You can drop a course until {date}'**
  String uniPhaseDrop(String date);

  /// 113.9 The term's registration and drop days are over.
  ///
  /// In en, this message translates to:
  /// **'Registration for this term is closed'**
  String get uniPhaseClosed;

  /// 113.9 The credits a student holds this term and the program's least and most.
  ///
  /// In en, this message translates to:
  /// **'{taken} credits · {min} to {max} a term'**
  String uniCreditsRange(String taken, String min, String max);

  /// 113.9 The sections a student holds this term, or a lecturer teaches.
  ///
  /// In en, this message translates to:
  /// **'My sections'**
  String get uniMySections;

  /// 113.9 The term's other sections a student can add.
  ///
  /// In en, this message translates to:
  /// **'Sections offered'**
  String get uniOffered;

  /// 113.9 Adds a section to the student's registration.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get uniAdd;

  /// 113.9 Adds a full section's waiting list.
  ///
  /// In en, this message translates to:
  /// **'Join the waiting list'**
  String get uniJoinWaitlist;

  /// 113.9 Drops a section from the student's registration.
  ///
  /// In en, this message translates to:
  /// **'Drop'**
  String get uniDrop;

  /// 113.9 Asks before a section is dropped.
  ///
  /// In en, this message translates to:
  /// **'Drop {course}?'**
  String uniDropConfirm(String course);

  /// 113.9 The seats a section has left.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Full} =1{1 seat left} other{{count} seats left}}'**
  String uniSeatsLeft(int count);

  /// 113.9 A section asked for, waiting for the advisor.
  ///
  /// In en, this message translates to:
  /// **'Waiting for approval'**
  String get uniEnrolPending;

  /// 113.9 A section the student is enrolled in.
  ///
  /// In en, this message translates to:
  /// **'Enrolled'**
  String get uniEnrolEnrolled;

  /// 113.9 A full section the student waits for.
  ///
  /// In en, this message translates to:
  /// **'Waiting list'**
  String get uniEnrolWaitlisted;

  /// 113.9 Sends the student's registration to their advisor.
  ///
  /// In en, this message translates to:
  /// **'Send to my advisor'**
  String get uniSubmit;

  /// 113.9 Shown once the registration is sent to the advisor.
  ///
  /// In en, this message translates to:
  /// **'Sent to your advisor.'**
  String get uniSubmitted;

  /// 113.9 The advisor's note on a registration sent back.
  ///
  /// In en, this message translates to:
  /// **'Your advisor: {note}'**
  String uniAdvisorNote(String note);

  /// 113.9 Shown to a parent looking at their child's registration.
  ///
  /// In en, this message translates to:
  /// **'Only the student changes the registration.'**
  String get uniReadOnly;

  /// 113.9 A term without sections yet.
  ///
  /// In en, this message translates to:
  /// **'No sections in this term yet.'**
  String get uniNoSections;

  /// 113.9 A student's empty week of lectures.
  ///
  /// In en, this message translates to:
  /// **'No lectures this term.'**
  String get uniNoLectures;

  /// 113.9 A day without lectures on the student's home.
  ///
  /// In en, this message translates to:
  /// **'No lectures today.'**
  String get uniNoLecturesToday;

  /// 113.9 A term's GPA in the results.
  ///
  /// In en, this message translates to:
  /// **'Term GPA {gpa}'**
  String uniTermGpa(String gpa);

  /// 113.9 The label of the GPA over every term.
  ///
  /// In en, this message translates to:
  /// **'Cumulative GPA'**
  String get uniCumulative;

  /// 113.9 A student without published results.
  ///
  /// In en, this message translates to:
  /// **'No results yet.'**
  String get uniNoResults;

  /// 113.9 Opens the transcript as a PDF.
  ///
  /// In en, this message translates to:
  /// **'Open the PDF'**
  String get uniOpenPdf;

  /// 113.9 A course of the study plan passed.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get uniPlanDone;

  /// 113.9 A course of the study plan taken this term.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get uniPlanInProgress;

  /// 113.9 A course of the study plan still to take.
  ///
  /// In en, this message translates to:
  /// **'Left'**
  String get uniPlanLeft;

  /// 113.9 The study plan's credits, done, in progress and left.
  ///
  /// In en, this message translates to:
  /// **'{done} done · {inProgress} in progress · {left} left of {required} credits'**
  String uniPlanCredits(
    String done,
    String inProgress,
    String left,
    String required,
  );

  /// 113.9 A year of the study plan.
  ///
  /// In en, this message translates to:
  /// **'Year {year}'**
  String uniYear(int year);

  /// 113.9 A study plan's elective course.
  ///
  /// In en, this message translates to:
  /// **'Elective'**
  String get uniElective;

  /// 113.9 How many students a lecturer's section has.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 student} other{{count} students}}'**
  String uniStudents(int count);

  /// 113.9 Opens the students a lecturer advises.
  ///
  /// In en, this message translates to:
  /// **'My advisees'**
  String get uniAdvisees;

  /// 113.9 Registrations waiting for the advisor's answer.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Nothing waits for you} =1{1 registration waits for you} other{{count} registrations wait for you}}'**
  String uniAdviseesWaiting(int count);

  /// 113.9 A lecturer without sections this term.
  ///
  /// In en, this message translates to:
  /// **'No sections this term: the university adds you as their lecturer.'**
  String get uniNoTeaching;

  /// 113.9 A section whose results the students see.
  ///
  /// In en, this message translates to:
  /// **'Results published'**
  String get uniPublished;

  /// 113.9 Publishes a section's results to its students.
  ///
  /// In en, this message translates to:
  /// **'Publish results'**
  String get uniPublish;

  /// 113.9 Asks before a section's results are published.
  ///
  /// In en, this message translates to:
  /// **'The students and their parents see their grades and are told.'**
  String get uniPublishConfirm;

  /// 113.9 Saves a section's grades.
  ///
  /// In en, this message translates to:
  /// **'Save grades'**
  String get uniSaveGrades;

  /// 113.9 Shown once a section's grades are saved.
  ///
  /// In en, this message translates to:
  /// **'Grades saved.'**
  String get uniGradesSaved;

  /// 113.9 Shown once a section's results are published.
  ///
  /// In en, this message translates to:
  /// **'Published. The students were told.'**
  String get uniResultsPublished;

  /// 113.9 The percent a lecturer gives; the scale's letter comes from it.
  ///
  /// In en, this message translates to:
  /// **'Mark (%)'**
  String get uniMark;

  /// 113.9 A letter of the university's grading scale.
  ///
  /// In en, this message translates to:
  /// **'Grade'**
  String get uniGrade;

  /// 113.9 A student not graded yet.
  ///
  /// In en, this message translates to:
  /// **'No grade'**
  String get uniNoGrade;

  /// 113.9 The advisor approves an advisee's registration.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get uniApprove;

  /// 113.9 The advisor sends a registration back to change.
  ///
  /// In en, this message translates to:
  /// **'Send back'**
  String get uniSendBack;

  /// 113.9 The advisor's note when sending a registration back.
  ///
  /// In en, this message translates to:
  /// **'Note to the student (optional)'**
  String get uniNoteHint;

  /// 113.9 Shown once the advisor approved.
  ///
  /// In en, this message translates to:
  /// **'Approved. The student was told.'**
  String get uniApproved;

  /// 113.9 Shown once the advisor sent it back.
  ///
  /// In en, this message translates to:
  /// **'Sent back. The student was told.'**
  String get uniSentBack;

  /// 113.9 A lecturer without advisees.
  ///
  /// In en, this message translates to:
  /// **'No students to advise this term.'**
  String get uniNoAdvisees;

  /// 113.9 Shown once a lecture's attendance is saved.
  ///
  /// In en, this message translates to:
  /// **'Attendance saved.'**
  String get uniAttendanceSaved;

  /// 104.8.4 Yallapp Courier's sign-in: what to sign in with.
  ///
  /// In en, this message translates to:
  /// **'Sign in with the mobile number or email address the company you deliver for added.'**
  String get hubSignInIntro;

  /// 104.8.4 Yallapp Courier: the list of the companies the person delivers for.
  ///
  /// In en, this message translates to:
  /// **'Your companies'**
  String get hubCompaniesTitle;

  /// 104.8.4 Under the title of the list of companies.
  ///
  /// In en, this message translates to:
  /// **'Pick the company you\'re delivering for now.'**
  String get hubCompaniesIntro;

  /// 104.8.4 No company has added the person as a courier yet.
  ///
  /// In en, this message translates to:
  /// **'No companies yet'**
  String get hubNoCompaniesTitle;

  /// 104.8.4 What to do when no company has added the person yet.
  ///
  /// In en, this message translates to:
  /// **'No company has added your number or email as a courier on Yallapp Courier yet. Ask the company you deliver for to add it, then check again.'**
  String get hubNoCompaniesMessage;

  /// 104.8.4 Loads the list of companies again.
  ///
  /// In en, this message translates to:
  /// **'Check again'**
  String get hubCheckAgain;

  /// 104.8.4 How many jobs wait for a courier at a company.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No jobs waiting} =1{1 job waiting} other{{count} jobs waiting}}'**
  String hubJobsWaiting(int count);

  /// 104.8.4 The courier is off duty at a company.
  ///
  /// In en, this message translates to:
  /// **'Off duty'**
  String get hubOffDuty;

  /// 104.8.4 The company paused this courier.
  ///
  /// In en, this message translates to:
  /// **'Paused by the company'**
  String get hubPaused;

  /// 104.8.4 A paused courier tried to open the company.
  ///
  /// In en, this message translates to:
  /// **'{company} has paused you as a courier. Ask them to turn you back on.'**
  String hubPausedMessage(String company);

  /// 104.8.4 The company is no longer on the person's list.
  ///
  /// In en, this message translates to:
  /// **'{company} isn\'t one of your companies any more.'**
  String hubCompanyGone(String company);

  /// 104.8.4 The company ended the courier's session.
  ///
  /// In en, this message translates to:
  /// **'Your session at {company} ended. Open it again from the list.'**
  String hubSessionEnded(String company);

  /// 104.8.4 Account: the company the courier's screens are on.
  ///
  /// In en, this message translates to:
  /// **'Company'**
  String get hubCompanyGroup;

  /// 104.8.4 Account: back to the list of companies.
  ///
  /// In en, this message translates to:
  /// **'Switch company'**
  String get hubSwitchCompany;

  /// 104.8.4 Confirms signing out of Yallapp Courier.
  ///
  /// In en, this message translates to:
  /// **'You\'ll be signed out of Yallapp Courier and every company on this phone.'**
  String get hubSignOutMessage;

  /// 104.8.4 While a company's courier screens open.
  ///
  /// In en, this message translates to:
  /// **'Opening {company}…'**
  String hubOpening(String company);

  /// 104.8.4 Account and the list of companies: deletes the Yallapp Courier account.
  ///
  /// In en, this message translates to:
  /// **'Delete my Yallapp Courier account'**
  String get hubDeleteAccount;

  /// 104.8.4 Title of the question before deleting the Yallapp Courier account.
  ///
  /// In en, this message translates to:
  /// **'Delete your Yallapp Courier account?'**
  String get hubDeleteAccountTitle;

  /// 104.8.4 What deleting the Yallapp Courier account does.
  ///
  /// In en, this message translates to:
  /// **'You\'ll be signed out on every phone and your sessions at every company will end. Each company keeps its own records of your deliveries: ask the company to remove you there.'**
  String get hubDeleteAccountMessage;

  /// 115 Over the delivery address on the marketplace home.
  ///
  /// In en, this message translates to:
  /// **'Deliver to'**
  String get marketDeliverTo;

  /// 115 The marketplace search field.
  ///
  /// In en, this message translates to:
  /// **'Restaurants, dishes or groceries'**
  String get marketSearchHint;

  /// 115 How long delivery takes.
  ///
  /// In en, this message translates to:
  /// **'{min}–{max} min'**
  String marketEta(int min, int max);

  /// 115 A vendor delivers for free.
  ///
  /// In en, this message translates to:
  /// **'Free delivery'**
  String get marketFreeDelivery;

  /// 115 A vendor's delivery fee.
  ///
  /// In en, this message translates to:
  /// **'{fee} delivery'**
  String marketDeliveryFee(String fee);

  /// 115 On a vendor's card and page instead of its delivery time and fee: it doesn't deliver to the customer's address.
  ///
  /// In en, this message translates to:
  /// **'Outside delivery area'**
  String get marketOutsideArea;

  /// 115 A banner on a vendor's page when it doesn't deliver to the customer's address.
  ///
  /// In en, this message translates to:
  /// **'This place doesn\'t deliver to your address.'**
  String get marketOutsideAreaBanner;

  /// 115 At checkout, when the vendor doesn't deliver to the address chosen.
  ///
  /// In en, this message translates to:
  /// **'This place doesn\'t deliver to your address. Choose another address, or pick the order up if the place offers it.'**
  String get marketOutsideAreaMessage;

  /// 115 The smallest order a vendor takes.
  ///
  /// In en, this message translates to:
  /// **'Min. {amount}'**
  String marketMinOrder(String amount);

  /// 115 The delivery club's short name on a badge.
  ///
  /// In en, this message translates to:
  /// **'Club'**
  String get marketClub;

  /// 115 Free delivery for club members.
  ///
  /// In en, this message translates to:
  /// **'Free with Club'**
  String get marketClubFree;

  /// 115 The club banner's button.
  ///
  /// In en, this message translates to:
  /// **'Join'**
  String get marketJoinClub;

  /// 115 The club banner, for a member.
  ///
  /// In en, this message translates to:
  /// **'You\'re a member'**
  String get marketClubMember;

  /// 115 A vendor with too many orders.
  ///
  /// In en, this message translates to:
  /// **'Busy'**
  String get marketBusy;

  /// 115 A closed vendor.
  ///
  /// In en, this message translates to:
  /// **'Closed · opens {time}'**
  String marketClosedOpens(String time);

  /// 115 A closed vendor.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get marketClosed;

  /// 115 The vendor delivers itself (no live map).
  ///
  /// In en, this message translates to:
  /// **'Own delivery'**
  String get marketOwnDelivery;

  /// 115 The app's couriers deliver, live on the map.
  ///
  /// In en, this message translates to:
  /// **'Live tracking'**
  String get marketLiveTracking;

  /// 115 Opens the whole list.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get marketSeeAll;

  /// 115 Reorders a past order.
  ///
  /// In en, this message translates to:
  /// **'Order again'**
  String get marketOrderAgain;

  /// 115 An offer's code.
  ///
  /// In en, this message translates to:
  /// **'Code {code}'**
  String marketCode(String code);

  /// 115 Adds an item to the basket.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get marketAdd;

  /// 115 After a price per kilogram.
  ///
  /// In en, this message translates to:
  /// **'/ kg'**
  String get marketPerKg;

  /// 115 An item out of stock.
  ///
  /// In en, this message translates to:
  /// **'Sold out'**
  String get marketSoldOut;

  /// 115 How far a vendor is.
  ///
  /// In en, this message translates to:
  /// **'{km} km'**
  String marketKm(String km);

  /// 115 The vendor page's search field.
  ///
  /// In en, this message translates to:
  /// **'Search {name}'**
  String marketSearchVendor(String name);

  /// 115 The basket bar on a vendor page.
  ///
  /// In en, this message translates to:
  /// **'View basket'**
  String get marketViewBasket;

  /// 115 Items in the basket.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 item} other{{count} items}}'**
  String marketBasketItems(int count);

  /// 115 On a vendor page: people reach the app owner, never the vendor.
  ///
  /// In en, this message translates to:
  /// **'Questions about an order? Our support team answers in the app, any time.'**
  String get marketSupportNote;

  /// 115 An item with choices.
  ///
  /// In en, this message translates to:
  /// **'Choices'**
  String get marketChoices;

  /// 115 How many ratings, after the stars.
  ///
  /// In en, this message translates to:
  /// **'({count})'**
  String marketRatingsCount(String count);

  /// 115 A shop's aisles.
  ///
  /// In en, this message translates to:
  /// **'Aisles'**
  String get marketAisles;

  /// 115 A restaurant's menu.
  ///
  /// In en, this message translates to:
  /// **'Menu'**
  String get marketMenu;

  /// 115 A vendor's reviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get marketReviews;

  /// 115 A vendor's details.
  ///
  /// In en, this message translates to:
  /// **'Info'**
  String get marketInfo;

  /// 115 A vendor's opening hours today; `allDay` for a vendor open all day.
  ///
  /// In en, this message translates to:
  /// **'{hours, select, allDay{Open 24 hours} other{Open {hours}}}'**
  String marketHours(String hours);

  /// 115 A vendor nobody rated yet.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get marketNew;

  /// 115 The home's address line before the customer chose one.
  ///
  /// In en, this message translates to:
  /// **'Choose your address'**
  String get marketChooseAddress;

  /// 115 After a price per gram.
  ///
  /// In en, this message translates to:
  /// **'/ g'**
  String get marketPerGram;

  /// 115 After a price per litre.
  ///
  /// In en, this message translates to:
  /// **'/ L'**
  String get marketPerLitre;

  /// 115 The restaurants' tile on the marketplace home.
  ///
  /// In en, this message translates to:
  /// **'Food'**
  String get marketKindRestaurant;

  /// 115 The groceries' tile on the marketplace home.
  ///
  /// In en, this message translates to:
  /// **'Market'**
  String get marketKindGrocery;

  /// 115 The shops' tile on the marketplace home.
  ///
  /// In en, this message translates to:
  /// **'Shops'**
  String get marketKindShop;

  /// 115 How many vendors of a kind.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 place} other{{count} places}}'**
  String marketPlaces(int count);

  /// 115 Adding an item from another vendor: the question's title.
  ///
  /// In en, this message translates to:
  /// **'Start a new basket?'**
  String get marketNewBasketTitle;

  /// 115 Adding an item from another vendor replaces the basket.
  ///
  /// In en, this message translates to:
  /// **'Your basket has items from {vendor}. An order is from one place, so they\'ll be removed.'**
  String marketNewBasketMessage(String vendor);

  /// 115 Confirms starting a new basket.
  ///
  /// In en, this message translates to:
  /// **'New basket'**
  String get marketNewBasketConfirm;

  /// 115 The checkout screen's title.
  ///
  /// In en, this message translates to:
  /// **'Your basket'**
  String get marketCheckoutTitle;

  /// 115 The checkout with nothing in the basket.
  ///
  /// In en, this message translates to:
  /// **'Your basket is empty'**
  String get marketEmptyBasketTitle;

  /// 115 The checkout with nothing in the basket.
  ///
  /// In en, this message translates to:
  /// **'Add dishes or products from a restaurant or a shop.'**
  String get marketEmptyBasketMessage;

  /// 115 Back to the marketplace from an empty basket.
  ///
  /// In en, this message translates to:
  /// **'Browse'**
  String get marketBrowse;

  /// 115 The order is delivered.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get marketDelivery;

  /// 115 The customer picks the order up at the vendor.
  ///
  /// In en, this message translates to:
  /// **'Pick up'**
  String get marketPickup;

  /// 115 The checkout's address section.
  ///
  /// In en, this message translates to:
  /// **'Deliver to'**
  String get marketDeliverHere;

  /// 115 Sets the delivery address from the phone's position.
  ///
  /// In en, this message translates to:
  /// **'Use my location'**
  String get marketUseMyLocation;

  /// 115 The address details field.
  ///
  /// In en, this message translates to:
  /// **'Building, floor, flat, a landmark'**
  String get marketAddressDetails;

  /// 115 Ordering for delivery without an address.
  ///
  /// In en, this message translates to:
  /// **'Choose where to deliver first.'**
  String get marketNeedAddress;

  /// 115 The checkout's time section.
  ///
  /// In en, this message translates to:
  /// **'When'**
  String get marketWhen;

  /// 115 Order now.
  ///
  /// In en, this message translates to:
  /// **'As soon as possible'**
  String get marketNow;

  /// 115 Order for a later time.
  ///
  /// In en, this message translates to:
  /// **'Schedule'**
  String get marketLater;

  /// 115 A scheduled order's time.
  ///
  /// In en, this message translates to:
  /// **'For {time}'**
  String marketScheduledFor(String time);

  /// 115 The coupon field.
  ///
  /// In en, this message translates to:
  /// **'Coupon code'**
  String get marketCoupon;

  /// 115 Applies the coupon.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get marketApply;

  /// 115 Pays part or all of the order from the wallet.
  ///
  /// In en, this message translates to:
  /// **'Use my wallet balance'**
  String get marketUseWallet;

  /// 115 The payment section.
  ///
  /// In en, this message translates to:
  /// **'Pay with'**
  String get marketPayWith;

  /// 115 Payment method.
  ///
  /// In en, this message translates to:
  /// **'Cash on delivery'**
  String get marketPayCash;

  /// 115 Payment method.
  ///
  /// In en, this message translates to:
  /// **'Card'**
  String get marketPayCard;

  /// 115 Payment method.
  ///
  /// In en, this message translates to:
  /// **'Apple Pay'**
  String get marketPayApplePay;

  /// 115 Payment method.
  ///
  /// In en, this message translates to:
  /// **'Google Pay'**
  String get marketPayGooglePay;

  /// 115 Payment method: all from the wallet.
  ///
  /// In en, this message translates to:
  /// **'Wallet'**
  String get marketPayWallet;

  /// 115 The order's notes field.
  ///
  /// In en, this message translates to:
  /// **'A note for the restaurant or the shop'**
  String get marketNotes;

  /// 115 A shop item: what to do when it's out when picked.
  ///
  /// In en, this message translates to:
  /// **'If it\'s out'**
  String get marketIfMissing;

  /// 115 A shop item out of stock: substitute it.
  ///
  /// In en, this message translates to:
  /// **'Replace with a similar one'**
  String get marketIfMissingSimilar;

  /// 115 A shop item out of stock: remove it.
  ///
  /// In en, this message translates to:
  /// **'Remove it'**
  String get marketIfMissingRemove;

  /// 115 Places the order.
  ///
  /// In en, this message translates to:
  /// **'Place order · {total}'**
  String marketPlaceOrder(String total);

  /// 115 While the quote is asked for.
  ///
  /// In en, this message translates to:
  /// **'Working out the total…'**
  String get marketPricing;

  /// 115 After ordering without an online payment.
  ///
  /// In en, this message translates to:
  /// **'Your order is sent.'**
  String get marketOrderSent;

  /// 115 After paying online.
  ///
  /// In en, this message translates to:
  /// **'Paid. Your order is on its way to the restaurant or the shop.'**
  String get marketOrderPaid;

  /// 115 An order's screen title.
  ///
  /// In en, this message translates to:
  /// **'Order {reference}'**
  String marketOrderTitle(String reference);

  /// 115 Order status.
  ///
  /// In en, this message translates to:
  /// **'Waiting for payment'**
  String get marketStatusAwaitingPayment;

  /// 115 Order status.
  ///
  /// In en, this message translates to:
  /// **'Scheduled'**
  String get marketStatusScheduled;

  /// 115 Order status.
  ///
  /// In en, this message translates to:
  /// **'Sent to the restaurant or the shop'**
  String get marketStatusPlaced;

  /// 115 Order status.
  ///
  /// In en, this message translates to:
  /// **'Being prepared'**
  String get marketStatusAccepted;

  /// 115 Order status: a shop picks the items.
  ///
  /// In en, this message translates to:
  /// **'Being picked'**
  String get marketStatusPicking;

  /// 115 Order status.
  ///
  /// In en, this message translates to:
  /// **'Ready'**
  String get marketStatusReady;

  /// 115 Order status.
  ///
  /// In en, this message translates to:
  /// **'On the way'**
  String get marketStatusOnTheWay;

  /// 115 Order status.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get marketStatusDelivered;

  /// 115 Order status.
  ///
  /// In en, this message translates to:
  /// **'Picked up'**
  String get marketStatusPickedUp;

  /// 115 Order status.
  ///
  /// In en, this message translates to:
  /// **'Turned down'**
  String get marketStatusRejected;

  /// 115 Order status.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get marketStatusCancelled;

  /// 115 Shown to the vendor when picking up.
  ///
  /// In en, this message translates to:
  /// **'Pick-up code: {code}'**
  String marketPickupCode(String code);

  /// 115 Cancels an order before the vendor accepts it.
  ///
  /// In en, this message translates to:
  /// **'Cancel order'**
  String get marketCancelOrder;

  /// 115 Opens a new payment page for an order waiting for its payment.
  ///
  /// In en, this message translates to:
  /// **'Pay now'**
  String get marketPayAgain;

  /// 115 The customer's marketplace orders.
  ///
  /// In en, this message translates to:
  /// **'My orders'**
  String get marketMyOrders;

  /// 115 The customer has no marketplace orders.
  ///
  /// In en, this message translates to:
  /// **'No orders yet'**
  String get marketNoOrders;

  /// 115 The app's courier on the way, on the order's map.
  ///
  /// In en, this message translates to:
  /// **'{name} is bringing your order'**
  String marketTrackingCourier(String name);

  /// 115 When the courier's position was last updated.
  ///
  /// In en, this message translates to:
  /// **'Updated {time}'**
  String marketTrackingUpdated(String time);

  /// 115 An order the vendor delivers: stages only, no map.
  ///
  /// In en, this message translates to:
  /// **'The restaurant or the shop delivers this order itself. You\'ll see each step here.'**
  String get marketVendorDelivers;

  /// 115 When the order should arrive.
  ///
  /// In en, this message translates to:
  /// **'Arrives around {time}'**
  String marketArrivesAt(String time);

  /// 115 When a pick-up order should be ready.
  ///
  /// In en, this message translates to:
  /// **'Ready around {time}'**
  String marketReadyAt(String time);

  /// 115.9 Opens a complaint on an order.
  ///
  /// In en, this message translates to:
  /// **'Report a problem'**
  String get marketReportProblem;

  /// 115.9 Opens the order's complaint.
  ///
  /// In en, this message translates to:
  /// **'Your complaint'**
  String get marketViewComplaint;

  /// 115.9 Above the complaint form.
  ///
  /// In en, this message translates to:
  /// **'You can report a problem until 48 hours after the order arrives. Our support team answers here in the app.'**
  String get marketComplaintWindow;

  /// 115.9 A complaint's screen title.
  ///
  /// In en, this message translates to:
  /// **'Complaint {reference}'**
  String marketComplaintTitle(String reference);

  /// 115.9 The complaint's reason section.
  ///
  /// In en, this message translates to:
  /// **'What happened?'**
  String get marketWhatHappened;

  /// 115.9 Complaint reason.
  ///
  /// In en, this message translates to:
  /// **'It came late'**
  String get marketReasonLate;

  /// 115.9 Complaint reason.
  ///
  /// In en, this message translates to:
  /// **'Items were missing'**
  String get marketReasonMissingItems;

  /// 115.9 Complaint reason.
  ///
  /// In en, this message translates to:
  /// **'Wrong items'**
  String get marketReasonWrongItems;

  /// 115.9 Complaint reason.
  ///
  /// In en, this message translates to:
  /// **'The quality wasn\'t right'**
  String get marketReasonQuality;

  /// 115.9 Complaint reason.
  ///
  /// In en, this message translates to:
  /// **'It arrived damaged'**
  String get marketReasonDamaged;

  /// 115.9 Complaint reason.
  ///
  /// In en, this message translates to:
  /// **'It never arrived'**
  String get marketReasonNotDelivered;

  /// 115.9 Complaint reason.
  ///
  /// In en, this message translates to:
  /// **'I was charged wrong'**
  String get marketReasonChargedWrong;

  /// 115.9 Complaint reason.
  ///
  /// In en, this message translates to:
  /// **'About the courier'**
  String get marketReasonCourier;

  /// 115.9 Complaint reason.
  ///
  /// In en, this message translates to:
  /// **'Something else'**
  String get marketReasonOther;

  /// 115.9 The order's lines a complaint is about.
  ///
  /// In en, this message translates to:
  /// **'Which items?'**
  String get marketWhichItems;

  /// 115.9 The complaint's text field.
  ///
  /// In en, this message translates to:
  /// **'Tell us what happened'**
  String get marketTellUs;

  /// 115.9 The complaint's text is too short.
  ///
  /// In en, this message translates to:
  /// **'Write at least a few words.'**
  String get marketTellUsMore;

  /// 115.9 Photos added to a complaint.
  ///
  /// In en, this message translates to:
  /// **'Photos ({count} of 5)'**
  String marketComplaintPhotos(int count);

  /// 115.9 Adds a photo to a complaint.
  ///
  /// In en, this message translates to:
  /// **'Add a photo'**
  String get marketAddPhoto;

  /// 115.9 A complaint photo of the wrong kind or too big.
  ///
  /// In en, this message translates to:
  /// **'Choose a JPEG, PNG or WebP photo up to 8 MB.'**
  String get marketPhotoType;

  /// 115.9 Sends the complaint.
  ///
  /// In en, this message translates to:
  /// **'Send to support'**
  String get marketSendComplaint;

  /// 115.9 After sending a complaint.
  ///
  /// In en, this message translates to:
  /// **'Sent. Our support team will answer here.'**
  String get marketComplaintSent;

  /// 115.9 Complaint status.
  ///
  /// In en, this message translates to:
  /// **'Sent'**
  String get marketComplaintOpen;

  /// 115.9 Complaint status.
  ///
  /// In en, this message translates to:
  /// **'Being reviewed'**
  String get marketComplaintInReview;

  /// 115.9 Complaint status.
  ///
  /// In en, this message translates to:
  /// **'Waiting for your reply'**
  String get marketComplaintWaiting;

  /// 115.9 Complaint status.
  ///
  /// In en, this message translates to:
  /// **'Resolved'**
  String get marketComplaintResolved;

  /// 115.9 Complaint status.
  ///
  /// In en, this message translates to:
  /// **'Closed without a refund'**
  String get marketComplaintRejected;

  /// 115.9 Support's decision: a full refund.
  ///
  /// In en, this message translates to:
  /// **'Refunded {amount}'**
  String marketDecisionRefund(String amount);

  /// 115.9 Support's decision: a partial refund.
  ///
  /// In en, this message translates to:
  /// **'Partly refunded: {amount}'**
  String marketDecisionPartial(String amount);

  /// 115.9 Support's decision: compensation.
  ///
  /// In en, this message translates to:
  /// **'Compensation: {amount}'**
  String marketDecisionCompensation(String amount);

  /// 115.9 Support's decision: no refund.
  ///
  /// In en, this message translates to:
  /// **'No refund'**
  String get marketDecisionNone;

  /// 115.9 Where the refund went.
  ///
  /// In en, this message translates to:
  /// **'Back to how you paid'**
  String get marketDecisionToPayment;

  /// 115.9 Where the refund went.
  ///
  /// In en, this message translates to:
  /// **'Added to your wallet'**
  String get marketDecisionToWallet;

  /// 115.9 Where the refund went: a coupon code.
  ///
  /// In en, this message translates to:
  /// **'As a coupon: {code}'**
  String marketDecisionToCoupon(String code);

  /// 115.9 The message field on a complaint.
  ///
  /// In en, this message translates to:
  /// **'Write to support'**
  String get marketWriteToSupport;

  /// 115.9 A message from the app's support.
  ///
  /// In en, this message translates to:
  /// **'Support'**
  String get marketSupport;

  /// 115.9 A message from the customer.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get marketYou;

  /// 115.9 A closed complaint, no more messages.
  ///
  /// In en, this message translates to:
  /// **'This complaint is closed.'**
  String get marketComplaintClosed;

  /// 115.10 The customer's wallet screen.
  ///
  /// In en, this message translates to:
  /// **'Wallet'**
  String get marketWallet;

  /// 115.10 Above the wallet's balance.
  ///
  /// In en, this message translates to:
  /// **'Your balance'**
  String get marketWalletBalance;

  /// 115.10 Under the wallet's balance.
  ///
  /// In en, this message translates to:
  /// **'Use it on your next orders. It can\'t be taken out as cash.'**
  String get marketWalletNote;

  /// 115.10 The wallet with no history.
  ///
  /// In en, this message translates to:
  /// **'Refunds and credit from support show here.'**
  String get marketWalletEmpty;

  /// 115.10 Joins the club on a plan.
  ///
  /// In en, this message translates to:
  /// **'Join · {price}'**
  String marketClubJoinWith(String price);

  /// 115.10 A monthly club plan.
  ///
  /// In en, this message translates to:
  /// **'a month'**
  String get marketClubPerMonth;

  /// 115.10 A yearly club plan.
  ///
  /// In en, this message translates to:
  /// **'a year'**
  String get marketClubPerYear;

  /// 115.10 A member's paid period.
  ///
  /// In en, this message translates to:
  /// **'Member until {date}'**
  String marketClubActiveUntil(String date);

  /// 115.10 What the club saved the member.
  ///
  /// In en, this message translates to:
  /// **'Saved so far: {amount}'**
  String marketClubSaved(String amount);

  /// 115.10 A membership waiting for its payment.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the payment. Your membership starts once it\'s confirmed.'**
  String get marketClubWaiting;

  /// 115.10 A membership whose payment failed.
  ///
  /// In en, this message translates to:
  /// **'The payment didn\'t go through. Try again.'**
  String get marketClubPayAgain;

  /// 115.10 The club has no automatic renewal.
  ///
  /// In en, this message translates to:
  /// **'Each period is paid on its own; nothing renews by itself.'**
  String get marketClubNoRenew;

  /// 115.10 After joining the club.
  ///
  /// In en, this message translates to:
  /// **'Welcome to the club.'**
  String get marketClubJoined;

  /// 115.10 The app has no delivery club.
  ///
  /// In en, this message translates to:
  /// **'There\'s no club in this app yet.'**
  String get marketClubNone;

  /// 115 The marketplace's Search tab: its places, dishes and products.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get tabSearch;

  /// 115 The marketplace's Orders tab: the customer's orders.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get tabOrders;

  /// 115 The marketplace's Club tab: the delivery club and the member's benefits.
  ///
  /// In en, this message translates to:
  /// **'Club'**
  String get tabClub;

  /// 115 The marketplace's search before anything is typed.
  ///
  /// In en, this message translates to:
  /// **'Find a restaurant, a dish or something from the shops.'**
  String get marketSearchStart;

  /// 115 Above the cuisines and departments the search can start with.
  ///
  /// In en, this message translates to:
  /// **'Start with'**
  String get marketSearchTry;

  /// 115 The places the marketplace's search found.
  ///
  /// In en, this message translates to:
  /// **'Places'**
  String get marketSearchPlaces;

  /// 115 The dishes and products the marketplace's search found, each with its place.
  ///
  /// In en, this message translates to:
  /// **'Dishes and products'**
  String get marketSearchItems;

  /// 115 The marketplace's search found nothing.
  ///
  /// In en, this message translates to:
  /// **'Nothing found for “{query}”.'**
  String marketSearchNone(String query);

  /// 115 A filtered list of restaurants and shops (a kind, a cuisine or offers) with no places near the customer: the title.
  ///
  /// In en, this message translates to:
  /// **'Nothing here near you yet'**
  String get marketListEmptyTitle;

  /// 115 The same empty list: what the customer can do.
  ///
  /// In en, this message translates to:
  /// **'Try another address, or look at everything on the home.'**
  String get marketListEmptyMessage;

  /// 115 The vendor app's orders tab, for a restaurant's or a shop's staff.
  ///
  /// In en, this message translates to:
  /// **'My store'**
  String get tabVendor;

  /// 115 The vendor app's tab that puts items in or out of stock.
  ///
  /// In en, this message translates to:
  /// **'Stock'**
  String get tabVendorStock;

  /// 115 The vendor's screens for someone who doesn't work for a vendor: the title.
  ///
  /// In en, this message translates to:
  /// **'For the stores\' staff'**
  String get notVendorTitle;

  /// 115 The same: how staff get in.
  ///
  /// In en, this message translates to:
  /// **'Sign in with the number or email the app\'s owner added you with.'**
  String get notVendorMessage;

  /// 115 The vendor's list of orders for a later time.
  ///
  /// In en, this message translates to:
  /// **'Later'**
  String get vendorLater;

  /// 115 The vendor stopped new orders until it takes them again.
  ///
  /// In en, this message translates to:
  /// **'Paused: not taking orders'**
  String get vendorPaused;

  /// 115 Pauses the vendor with no end time.
  ///
  /// In en, this message translates to:
  /// **'Until I take orders again'**
  String get vendorPauseUntilBack;

  /// 115 Under the pause choice.
  ///
  /// In en, this message translates to:
  /// **'Orders for later still come.'**
  String get vendorPauseNote;

  /// 115 The vendor's empty order list.
  ///
  /// In en, this message translates to:
  /// **'New orders show here with a sound.'**
  String get vendorNoOrdersMessage;

  /// 115 How many lines an order has, in the vendor's list.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 item} other{{count} items}}'**
  String vendorItems(int count);

  /// 115 The order's items on the vendor's order screen.
  ///
  /// In en, this message translates to:
  /// **'Items'**
  String get vendorItemsTitle;

  /// 115 When a scheduled order is for.
  ///
  /// In en, this message translates to:
  /// **'For {time}'**
  String vendorFor(String time);

  /// 115 Cash to collect from the customer.
  ///
  /// In en, this message translates to:
  /// **'Collect {amount} in cash'**
  String vendorCollect(String amount);

  /// 115 The customer's notes on the vendor's order screen.
  ///
  /// In en, this message translates to:
  /// **'The customer\'s notes'**
  String get vendorCustomerNotes;

  /// 115 The drop-off, when the vendor delivers itself.
  ///
  /// In en, this message translates to:
  /// **'Deliver to'**
  String get vendorDeliverTo;

  /// 115 Vendors never reach customers directly.
  ///
  /// In en, this message translates to:
  /// **'For anything about the customer, write to the app\'s support.'**
  String get vendorNoContact;

  /// 115 A reason to turn an order down.
  ///
  /// In en, this message translates to:
  /// **'Outside our delivery area'**
  String get vendorRejectOutsideArea;

  /// 115 The vendor's own driver took the order.
  ///
  /// In en, this message translates to:
  /// **'Given to our driver'**
  String get vendorHandToDriver;

  /// 115 The vendor's driver delivered the order.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get vendorMarkDelivered;

  /// 115 The customer picked the order up, with their code.
  ///
  /// In en, this message translates to:
  /// **'Picked up by the customer'**
  String get vendorHandToCustomer;

  /// 115 After handing an order over.
  ///
  /// In en, this message translates to:
  /// **'Order updated'**
  String get vendorHandedOver;

  /// 115 Asking for the customer's pick-up code: the title.
  ///
  /// In en, this message translates to:
  /// **'The customer\'s code'**
  String get vendorPickupCodeTitle;

  /// 115 The pick-up code field.
  ///
  /// In en, this message translates to:
  /// **'4-digit code'**
  String get vendorPickupCode;

  /// 115 The stock screen's search field.
  ///
  /// In en, this message translates to:
  /// **'Search items'**
  String get vendorStockSearch;

  /// 115 Shows only the items out of stock.
  ///
  /// In en, this message translates to:
  /// **'Out of stock only'**
  String get vendorOutOfStockOnly;

  /// 115 An item that is out of stock.
  ///
  /// In en, this message translates to:
  /// **'Out of stock'**
  String get vendorOutOfStock;

  /// 115 The stock search found nothing.
  ///
  /// In en, this message translates to:
  /// **'No items found'**
  String get vendorStockEmpty;

  /// 115.16 The button on a grocery's or shop's order that opens its picking, and that screen's title.
  ///
  /// In en, this message translates to:
  /// **'Pick the items'**
  String get vendorPickItems;

  /// 115.16 Opens a picked order's picking again before it is ready.
  ///
  /// In en, this message translates to:
  /// **'Change the picking'**
  String get vendorPickAgain;

  /// 115.16 A line of the order was picked.
  ///
  /// In en, this message translates to:
  /// **'Picked'**
  String get vendorPicked;

  /// 115.16 A line of the order was swapped for another item.
  ///
  /// In en, this message translates to:
  /// **'Swapped'**
  String get vendorSubstituted;

  /// 115.16 A line of the order was not there when picked.
  ///
  /// In en, this message translates to:
  /// **'Missing'**
  String get vendorMissing;

  /// 115.16 The field for how many units were picked.
  ///
  /// In en, this message translates to:
  /// **'How many'**
  String get vendorPickedCount;

  /// 115.16 The field for the weighed amount picked, with its unit (kg, g, l).
  ///
  /// In en, this message translates to:
  /// **'Weight in {unit}'**
  String vendorPickedWeight(String unit);

  /// 115.16 Under the weight: how much more than ordered the customer agreed to.
  ///
  /// In en, this message translates to:
  /// **'Up to {percent}% more than ordered'**
  String vendorWeightTolerance(int percent);

  /// 115.16 What the customer asked for when an item is out: a similar one.
  ///
  /// In en, this message translates to:
  /// **'If it\'s out: a similar item'**
  String get vendorIfMissingSimilar;

  /// 115.16 What the customer asked for when an item is out: the one they chose.
  ///
  /// In en, this message translates to:
  /// **'If it\'s out: the item the customer chose'**
  String get vendorIfMissingChosen;

  /// 115.16 What the customer asked for when an item is out: nothing instead.
  ///
  /// In en, this message translates to:
  /// **'If it\'s out: leave it out'**
  String get vendorIfMissingRemove;

  /// 115.16 A swapped line whose substitute the customer chose.
  ///
  /// In en, this message translates to:
  /// **'Bring the item the customer chose.'**
  String get vendorBringChosen;

  /// 115.16 Opens the vendor's items to choose what to bring instead.
  ///
  /// In en, this message translates to:
  /// **'Choose the item'**
  String get vendorChooseSubstitute;

  /// 115.16 Next to the chosen substitute: choose another.
  ///
  /// In en, this message translates to:
  /// **'Change'**
  String get vendorChangeSubstitute;

  /// 115.16 Sends the picked lines.
  ///
  /// In en, this message translates to:
  /// **'Save the picking'**
  String get vendorPickSave;

  /// 115.16 After the picking was sent.
  ///
  /// In en, this message translates to:
  /// **'Picking saved'**
  String get vendorPickSaved;

  /// 115.16 A picked line without its amount.
  ///
  /// In en, this message translates to:
  /// **'Enter what you picked of {item}.'**
  String vendorPickNeedsAmount(String item);

  /// 115.16 A swapped line without the item brought instead.
  ///
  /// In en, this message translates to:
  /// **'Choose what you\'re bringing instead of {item}.'**
  String vendorPickNeedsSubstitute(String item);

  /// 115.16 Under a line of the order: the amount picked.
  ///
  /// In en, this message translates to:
  /// **'Picked {amount}'**
  String vendorLinePicked(String amount);

  /// 115.16 Under a line of the order: the item brought instead.
  ///
  /// In en, this message translates to:
  /// **'Instead: {item}'**
  String vendorLineSubstituted(String item);

  /// 115.16 The vendor's monthly statements: the button and the screen's title.
  ///
  /// In en, this message translates to:
  /// **'Statements'**
  String get vendorStatementsTitle;

  /// 115.16 Shows the month before on the statements.
  ///
  /// In en, this message translates to:
  /// **'Previous month'**
  String get vendorPreviousMonth;

  /// 115.16 Shows the month after on the statements.
  ///
  /// In en, this message translates to:
  /// **'Next month'**
  String get vendorNextMonth;

  /// 115.16 The month's delivered orders, next to their total.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 order} other{{count} orders}}'**
  String vendorStatementOrders(int count);

  /// 115.16 What the vendor earns on the month's orders.
  ///
  /// In en, this message translates to:
  /// **'You earn'**
  String get vendorStatementEarns;

  /// 115.16 The app's commission on the month's orders.
  ///
  /// In en, this message translates to:
  /// **'The app\'s commission'**
  String get vendorStatementCommission;

  /// 115.16 What the app owes the vendor for the month, after refunds.
  ///
  /// In en, this message translates to:
  /// **'Due to you'**
  String get vendorStatementDue;

  /// 115.16 What the vendor owes the app for the month, after refunds.
  ///
  /// In en, this message translates to:
  /// **'You owe the app'**
  String get vendorStatementYouOwe;

  /// 115.16 A month's statement without orders.
  ///
  /// In en, this message translates to:
  /// **'No delivered orders this month'**
  String get vendorStatementEmpty;

  /// 115.16 The heading over the month's orders on the statement.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get vendorStatementOrdersTitle;

  /// 115.16 Under an order on the statement: what is due to the vendor on it.
  ///
  /// In en, this message translates to:
  /// **'{amount} to you'**
  String vendorStatementDueEach(String amount);

  /// 115.16 The heading over the month's refunds and compensations.
  ///
  /// In en, this message translates to:
  /// **'Refunds and compensations'**
  String get vendorStatementAdjustments;

  /// 115.16 A refund on an order, on the statement.
  ///
  /// In en, this message translates to:
  /// **'Refund on {reference}'**
  String vendorAdjustmentRefund(String reference);

  /// 115.16 A compensation on an order, on the statement.
  ///
  /// In en, this message translates to:
  /// **'Compensation on {reference}'**
  String vendorAdjustmentCompensation(String reference);

  /// 115.16 The vendor pays a refund or a compensation.
  ///
  /// In en, this message translates to:
  /// **'Paid by you'**
  String get vendorPaidByYou;

  /// 115.16 The app pays a refund or a compensation.
  ///
  /// In en, this message translates to:
  /// **'Paid by the app'**
  String get vendorPaidByApp;

  /// 115.16 The complaints shared with the vendor: the button and the screen's title.
  ///
  /// In en, this message translates to:
  /// **'Complaints'**
  String get vendorComplaintsTitle;

  /// 115.16 The vendor's empty complaints list.
  ///
  /// In en, this message translates to:
  /// **'No complaints'**
  String get vendorComplaintsEmptyTitle;

  /// 115.16 Under the vendor's empty complaints list.
  ///
  /// In en, this message translates to:
  /// **'Complaints the app\'s support shares with you show here.'**
  String get vendorComplaintsEmptyMessage;

  /// 115.16 The order a complaint is about.
  ///
  /// In en, this message translates to:
  /// **'Order {reference}'**
  String vendorComplaintOrder(String reference);

  /// 116 A teacher or member of staff with no child at the school opens the main app's School tab once the school has its staff app.
  ///
  /// In en, this message translates to:
  /// **'Your work is in the staff app'**
  String get schoolInStaffAppTitle;

  /// 116 Under the title that sends a teacher or member of staff to the school's staff app.
  ///
  /// In en, this message translates to:
  /// **'The school\'s teachers and staff use its staff app. Sign in to it with this same number.'**
  String get schoolInStaffAppMessage;

  /// 116 In the school's staff app, under the title for someone who isn't on the school's staff.
  ///
  /// In en, this message translates to:
  /// **'This app is for the school\'s teachers and staff. Students and parents use the school\'s main app.'**
  String get staffAppOnlyMessage;

  /// 116 Someone who isn't one of the academy's teachers opens its staff app.
  ///
  /// In en, this message translates to:
  /// **'For the academy\'s teachers'**
  String get teacherAppOnly;

  /// 116 Under the title for someone who isn't one of the academy's teachers, in its staff app.
  ///
  /// In en, this message translates to:
  /// **'This app is for the academy\'s teachers. Students learn in the academy\'s main app.'**
  String get teacherAppOnlyMessage;

  /// 115.20 On a vendor's card: it runs late, still taking orders (its delivery time includes the minutes).
  ///
  /// In en, this message translates to:
  /// **'~{minutes} min late'**
  String marketLateShort(int minutes);

  /// 115.20 A banner on a vendor's page, and the vendor's own desk, while it runs late; `reason` is one of the marketLate reasons or the vendor's own words.
  ///
  /// In en, this message translates to:
  /// **'Running about {minutes} min late: {reason}'**
  String marketLateBanner(int minutes, String reason);

  /// 115.20 Under the running-late banner on a vendor's page.
  ///
  /// In en, this message translates to:
  /// **'Delivery and pick-up times include it.'**
  String get marketLateIncluded;

  /// 115.20 Why a vendor runs late, after a colon in marketLateBanner.
  ///
  /// In en, this message translates to:
  /// **'high demand'**
  String get marketLateDemand;

  /// 115.20 Why a vendor runs late (few couriers), after a colon in marketLateBanner.
  ///
  /// In en, this message translates to:
  /// **'few couriers'**
  String get marketLateCouriers;

  /// 115.20 Why a vendor runs late (the weather), after a colon in marketLateBanner.
  ///
  /// In en, this message translates to:
  /// **'the weather'**
  String get marketLateWeather;

  /// 115.20 The vendor desk's button to tell customers it runs late while still taking orders.
  ///
  /// In en, this message translates to:
  /// **'Running late'**
  String get vendorLate;

  /// 115.20 The title of the running-late sheet.
  ///
  /// In en, this message translates to:
  /// **'Running late?'**
  String get vendorLateTitle;

  /// 115.20 Under the running-late sheet's title.
  ///
  /// In en, this message translates to:
  /// **'Keep taking orders and tell customers it takes longer. Their delivery and pick-up times include the extra minutes.'**
  String get vendorLateText;

  /// 115.20 The running-late sheet: how many minutes more.
  ///
  /// In en, this message translates to:
  /// **'Extra time'**
  String get vendorLateMinutes;

  /// 115.20 One of the extra-minute choices on the running-late sheet.
  ///
  /// In en, this message translates to:
  /// **'+{minutes} min'**
  String vendorLateExtra(int minutes);

  /// 115.20 The running-late sheet: the reason customers see.
  ///
  /// In en, this message translates to:
  /// **'Why'**
  String get vendorLateReason;

  /// 115.20 A reason on the running-late sheet.
  ///
  /// In en, this message translates to:
  /// **'High demand'**
  String get vendorLateDemand;

  /// 115.20 A reason on the running-late sheet (few couriers).
  ///
  /// In en, this message translates to:
  /// **'Few couriers'**
  String get vendorLateCouriers;

  /// 115.20 A reason on the running-late sheet (the weather).
  ///
  /// In en, this message translates to:
  /// **'Weather'**
  String get vendorLateWeather;

  /// 115.20 A reason on the running-late sheet: the vendor writes its own.
  ///
  /// In en, this message translates to:
  /// **'Something else'**
  String get vendorLateOther;

  /// 115.20 The field for the vendor's own reason, up to 80 characters.
  ///
  /// In en, this message translates to:
  /// **'Your words (customers see them)'**
  String get vendorLateNote;

  /// 115.20 The running-late sheet: how long it lasts.
  ///
  /// In en, this message translates to:
  /// **'For'**
  String get vendorLateFor;

  /// 115.20 How long running late lasts, in minutes.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min'**
  String vendorLateForMinutes(int minutes);

  /// 115.20 How long running late lasts, in hours.
  ///
  /// In en, this message translates to:
  /// **'{hours, plural, =1{1 hour} other{{hours} hours}}'**
  String vendorLateForHours(int hours);

  /// 115.20 Running late with no end time.
  ///
  /// In en, this message translates to:
  /// **'Until I end it'**
  String get vendorLateUntilEnd;

  /// 115.20 Sets the running-late notice.
  ///
  /// In en, this message translates to:
  /// **'Tell customers'**
  String get vendorLateSet;

  /// 115.20 Ends the running-late notice: times go back to normal.
  ///
  /// In en, this message translates to:
  /// **'End the delay'**
  String get vendorLateEnd;

  /// 115.20 When running late ends by itself.
  ///
  /// In en, this message translates to:
  /// **'Until {time}'**
  String vendorLateUntil(String time);

  /// 115.20 The vendor's own opening hours, days off and preparation time (its owners and managers).
  ///
  /// In en, this message translates to:
  /// **'Hours & days off'**
  String get vendorHoursTitle;

  /// 115.20 At the top of the vendor's hours screen.
  ///
  /// In en, this message translates to:
  /// **'Changes show in the app at once. The app\'s team sees what you changed and can put it back.'**
  String get vendorHoursNote;

  /// 115.20 The weekly opening hours.
  ///
  /// In en, this message translates to:
  /// **'Every week'**
  String get vendorHoursWeek;

  /// 115.20 Under the weekly hours.
  ///
  /// In en, this message translates to:
  /// **'Up to two periods a day. A day without hours is closed; a time that closes before it opens runs past midnight.'**
  String get vendorHoursHint;

  /// 115.20 A day without opening hours.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get vendorHoursClosed;

  /// 115.20 Adds an opening period to a day.
  ///
  /// In en, this message translates to:
  /// **'Add hours'**
  String get vendorHoursAdd;

  /// 115.20 Removes an opening period or days off.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get vendorHoursRemove;

  /// 115.20 How long an order usually takes at the vendor.
  ///
  /// In en, this message translates to:
  /// **'Preparation time'**
  String get vendorPrepTitle;

  /// 115.20 Under the preparation time.
  ///
  /// In en, this message translates to:
  /// **'How long an order usually takes. Customers\' delivery and pick-up times start from it.'**
  String get vendorPrepHint;

  /// 115.20 The vendor's days off, like holidays.
  ///
  /// In en, this message translates to:
  /// **'Days off'**
  String get vendorDaysOff;

  /// 115.20 Under the days off.
  ///
  /// In en, this message translates to:
  /// **'Holidays and other days you\'re closed all day. Customers see you closed, and when you open again.'**
  String get vendorDaysOffHint;

  /// 115.20 No days off set.
  ///
  /// In en, this message translates to:
  /// **'No days off coming up.'**
  String get vendorDaysOffNone;

  /// 115.20 Opens the calendar to choose days off (the first and the last).
  ///
  /// In en, this message translates to:
  /// **'Add days off'**
  String get vendorDaysOffAdd;

  /// 115.20 Saves the vendor's hours and preparation time.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get vendorHoursSave;

  /// 115.20 After the vendor saved its hours or days off.
  ///
  /// In en, this message translates to:
  /// **'Saved. Customers see it now.'**
  String get vendorHoursSaved;

  /// No description provided for @signInWithUsername.
  ///
  /// In en, this message translates to:
  /// **'Username'**
  String get signInWithUsername;

  /// No description provided for @username.
  ///
  /// In en, this message translates to:
  /// **'Username'**
  String get username;

  /// No description provided for @usernameHint.
  ///
  /// In en, this message translates to:
  /// **'3 to 30 letters, digits, dots or underscores, starting with a letter.'**
  String get usernameHint;

  /// No description provided for @enterUsername.
  ///
  /// In en, this message translates to:
  /// **'Choose a username of 3 to 30 letters, digits, dots or underscores, starting with a letter.'**
  String get enterUsername;

  /// No description provided for @signInIntroPasswordStudio.
  ///
  /// In en, this message translates to:
  /// **'Sign in with your password.'**
  String get signInIntroPasswordStudio;

  /// No description provided for @forgotPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Forgot your password?'**
  String get forgotPasswordTitle;

  /// No description provided for @forgotPasswordIntro.
  ///
  /// In en, this message translates to:
  /// **'Enter the email address or phone number on your account. We\'ll send you a code to set a new password.'**
  String get forgotPasswordIntro;

  /// No description provided for @newPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose a new password'**
  String get newPasswordTitle;

  /// No description provided for @newPassword.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get newPassword;

  /// No description provided for @confirmPassword.
  ///
  /// In en, this message translates to:
  /// **'Type the password again'**
  String get confirmPassword;

  /// No description provided for @passwordsDontMatch.
  ///
  /// In en, this message translates to:
  /// **'The passwords don\'t match.'**
  String get passwordsDontMatch;

  /// No description provided for @saveAndSignIn.
  ///
  /// In en, this message translates to:
  /// **'Save and sign in'**
  String get saveAndSignIn;

  /// No description provided for @signInWithCodeInstead.
  ///
  /// In en, this message translates to:
  /// **'Sign in with a code instead'**
  String get signInWithCodeInstead;

  /// No description provided for @signInWithPasswordInstead.
  ///
  /// In en, this message translates to:
  /// **'Sign in with your password'**
  String get signInWithPasswordInstead;

  /// No description provided for @createAnAccount.
  ///
  /// In en, this message translates to:
  /// **'Create an account'**
  String get createAnAccount;

  /// No description provided for @newHereQuestion.
  ///
  /// In en, this message translates to:
  /// **'New here?'**
  String get newHereQuestion;

  /// No description provided for @createAccountIntroCode.
  ///
  /// In en, this message translates to:
  /// **'We\'ll send you a code to check your phone number or email address, then you choose your password.'**
  String get createAccountIntroCode;

  /// No description provided for @changePassword.
  ///
  /// In en, this message translates to:
  /// **'Change password'**
  String get changePassword;

  /// No description provided for @currentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current password'**
  String get currentPassword;

  /// No description provided for @enterCurrentPassword.
  ///
  /// In en, this message translates to:
  /// **'Enter your current password.'**
  String get enterCurrentPassword;

  /// No description provided for @passwordChanged.
  ///
  /// In en, this message translates to:
  /// **'Your password was changed. Your other phones were signed out.'**
  String get passwordChanged;

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

  /// No description provided for @newPasswordIntro.
  ///
  /// In en, this message translates to:
  /// **'Use at least {min} characters. Your other phones will be signed out.'**
  String newPasswordIntro(int min);

  /// No description provided for @passwordTooShort.
  ///
  /// In en, this message translates to:
  /// **'At least {min} characters'**
  String passwordTooShort(int min);

  /// 118.3 Night account look: the title on the membership card.
  ///
  /// In en, this message translates to:
  /// **'Membership card'**
  String get accountMemberCard;

  /// 118.3 What the points are worth, formatted (₺84.00).
  ///
  /// In en, this message translates to:
  /// **'Worth {value}'**
  String accountPointsWorth(String value);

  /// 118.3 Points still needed before they can be used.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 more point and you can use them} other{{count} more points and you can use them}}'**
  String accountPointsToUse(int count);

  /// 123 The greeting header in the morning, with the person's first name.
  ///
  /// In en, this message translates to:
  /// **'Good morning, {name}'**
  String studioGreetingMorning(String name);

  /// 123 The greeting header after noon, with the person's first name.
  ///
  /// In en, this message translates to:
  /// **'Good evening, {name}'**
  String studioGreetingEvening(String name);

  /// 123 The greeting header in the morning, without a name.
  ///
  /// In en, this message translates to:
  /// **'Good morning'**
  String get studioGreetingMorningAlone;

  /// 123 The greeting header after noon, without a name.
  ///
  /// In en, this message translates to:
  /// **'Good evening'**
  String get studioGreetingEveningAlone;

  /// 123 The course the student is taking: the lesson they are on.
  ///
  /// In en, this message translates to:
  /// **'In progress · lesson {current} of {total}'**
  String learningLessonOf(int current, int total);

  /// 123 The minutes left in the lesson the student is on.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min left'**
  String learningMinutesLeft(int minutes);

  /// 123 The card with the days in a row the student learned.
  ///
  /// In en, this message translates to:
  /// **'Learning streak'**
  String get learningStreakTitle;

  /// 123 The word after the number of days in a row.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{day} other{days}}'**
  String learningStreakDays(int count);

  /// 123 The card with the student's next live class.
  ///
  /// In en, this message translates to:
  /// **'Live class'**
  String get learningLiveTitle;

  /// 123 A live class that has started.
  ///
  /// In en, this message translates to:
  /// **'Now · {time}'**
  String learningLiveNow(String time);

  /// 123 A live class starting within the hour.
  ///
  /// In en, this message translates to:
  /// **'In {minutes} min · {time}'**
  String learningLiveInMinutes(int minutes, String time);

  /// 123 A live class starting today.
  ///
  /// In en, this message translates to:
  /// **'In {hours} h · {time}'**
  String learningLiveInHours(int hours, String time);

  /// 123 A live class on another day.
  ///
  /// In en, this message translates to:
  /// **'{day} · {time}'**
  String learningLiveOn(String day, String time);

  /// 123 The card with this week's learning time.
  ///
  /// In en, this message translates to:
  /// **'This week'**
  String get learningWeekTitle;

  /// 123 More learning than the week before.
  ///
  /// In en, this message translates to:
  /// **'+{percent}% on last week'**
  String learningWeekUp(int percent);

  /// 123 Less learning than the week before.
  ///
  /// In en, this message translates to:
  /// **'−{percent}% on last week'**
  String learningWeekDown(int percent);

  /// 123 A learning time of an hour or more.
  ///
  /// In en, this message translates to:
  /// **'{hours} h {minutes} min'**
  String learningHoursMinutes(int hours, int minutes);

  /// 123 A learning time under an hour.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min'**
  String learningMinutesOnly(int minutes);

  /// 128.8 The course the student is taking on its photo: the lesson they are on.
  ///
  /// In en, this message translates to:
  /// **'Lesson {current} of {total}'**
  String learningLessonShort(int current, int total);

  /// 128.8 The student's live class today on its photo, in capitals: when it starts.
  ///
  /// In en, this message translates to:
  /// **'LIVE AT {time}'**
  String learningLiveAt(String time);

  /// 128.8 The student's live class on its photo, once it has started.
  ///
  /// In en, this message translates to:
  /// **'LIVE NOW'**
  String get learningLiveNowShort;

  /// 128.8 The compact streak card's title.
  ///
  /// In en, this message translates to:
  /// **'Streak'**
  String get learningStreakShort;

  /// 128.8 A card's rating, read out by screen readers.
  ///
  /// In en, this message translates to:
  /// **'Rated {rating} out of 5'**
  String itemRating(String rating);

  /// 123 The search box on the premium academy's Explore.
  ///
  /// In en, this message translates to:
  /// **'Course, skill or teacher'**
  String get exploreSearchHint;

  /// 123 The chip that shows the free courses on Explore.
  ///
  /// In en, this message translates to:
  /// **'Free'**
  String get freeCourses;

  /// 123 The badge of a course published lately.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get courseBadgeNew;

  /// 123 The badge of one of the courses with the most students.
  ///
  /// In en, this message translates to:
  /// **'Bestseller'**
  String get courseBadgeBestseller;

  /// 123 The tag on a premium course page's picture when the course gives a certificate.
  ///
  /// In en, this message translates to:
  /// **'Certified certificate'**
  String get certifiedCertificate;

  /// 123 The tab with what a course teaches, on its premium page.
  ///
  /// In en, this message translates to:
  /// **'About the course'**
  String get aboutCourse;

  /// 123 The tab with the course's questions and answers, on its premium page.
  ///
  /// In en, this message translates to:
  /// **'Questions'**
  String get courseQuestions;

  /// 123 How much a course on sale saves, by its old price.
  ///
  /// In en, this message translates to:
  /// **'Save {percent}%'**
  String saveShare(int percent);

  /// 123 The purchase button on a premium course page.
  ///
  /// In en, this message translates to:
  /// **'Join now'**
  String get joinNow;

  /// 123 The lessons a student finished of a course's, on My courses.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total}'**
  String lessonsDoneOf(int done, int total);

  /// 123 How many certificates the student has, on My courses.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 certificate} other{{count} certificates}}'**
  String certificatesCount(int count);

  /// 123 Under the student's certificates on My courses.
  ///
  /// In en, this message translates to:
  /// **'Ready to download'**
  String get certificatesReady;

  /// 123 The chip with the courses the student is taking, on the premium My courses.
  ///
  /// In en, this message translates to:
  /// **'Learning'**
  String get myCoursesLearning;

  /// 123 The chip with the courses the student finished, on the premium My courses.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get myCoursesFinished;

  /// 123 The chip with the courses the student saved, on the premium My courses.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get myCoursesSaved;

  /// 123 After how many courses the student has, on their academy card.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{course} other{courses}}'**
  String statCourses(int count);

  /// 123 After how many certificates the student has, on their academy card.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{certificate} other{certificates}}'**
  String statCertificates(int count);

  /// 123 After the student's hours of learning, on their academy card.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{hour} other{hours}}'**
  String statHours(int count);

  /// 123 The dark mode switch on the premium account page.
  ///
  /// In en, this message translates to:
  /// **'Dark mode'**
  String get darkModeSwitch;

  /// 123 The lesson's files, a chip on a premium lesson.
  ///
  /// In en, this message translates to:
  /// **'Files'**
  String get lessonFiles;

  /// 123 The lesson's own text, a chip on a premium lesson.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get lessonOverview;

  /// 123 Over the next lesson on a premium lesson.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get upNext;

  /// 123 Under a quiz that unlocks once the lesson is done, on a premium lesson.
  ///
  /// In en, this message translates to:
  /// **'Opens after this lesson'**
  String get quizOpensAfter;

  /// 123 The heading of the premium sign-in with a phone number.
  ///
  /// In en, this message translates to:
  /// **'Sign in with your phone'**
  String get signInPhoneTitle;

  /// 123 The heading of the premium sign-in with an email address.
  ///
  /// In en, this message translates to:
  /// **'Sign in with your email'**
  String get signInEmailTitle;

  /// 123 Under the heading of the premium sign-in with a code.
  ///
  /// In en, this message translates to:
  /// **'We send you a code to sign in, no password.'**
  String get signInCodeNote;

  /// 123 The premium sign-in's button to create an account.
  ///
  /// In en, this message translates to:
  /// **'New account'**
  String get newAccountShort;

  /// 123 The premium sign-in's button to sign in with a code instead of a password.
  ///
  /// In en, this message translates to:
  /// **'Code'**
  String get signInCodeShort;

  /// 123 The premium sign-in's button to sign in by email instead.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get emailShort;

  /// 123 The title of the premium sign-in code screen.
  ///
  /// In en, this message translates to:
  /// **'Verification code'**
  String get verificationCodeTitle;

  /// 123 Under the title of the premium sign-in code screen.
  ///
  /// In en, this message translates to:
  /// **'We sent a {count}-digit code to {number}'**
  String codeSentDigits(int count, String number);

  /// 123 Before the way to send the code again, on the premium sign-in code screen.
  ///
  /// In en, this message translates to:
  /// **'Didn\'t get it?'**
  String get didntGetCode;

  /// 123 Sends the sign-in code again, on the premium sign-in code screen.
  ///
  /// In en, this message translates to:
  /// **'Resend'**
  String get resendCode;

  /// 123 The button of the premium sign-in code screen.
  ///
  /// In en, this message translates to:
  /// **'Confirm and sign in'**
  String get confirmAndSignIn;

  /// 123 The title of the course cart.
  ///
  /// In en, this message translates to:
  /// **'Cart'**
  String get courseCartTitle;

  /// 123 How many courses the cart holds, beside its title.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 course} other{{count} courses}}'**
  String courseCartCount(int count);

  /// 123 The empty course cart.
  ///
  /// In en, this message translates to:
  /// **'The courses you choose show up here.'**
  String get courseCartEmpty;

  /// 123 The courses' total before the coupon, on the course cart.
  ///
  /// In en, this message translates to:
  /// **'Subtotal'**
  String get subtotalShort;

  /// 123 The course cart's button.
  ///
  /// In en, this message translates to:
  /// **'Pay {amount} securely'**
  String payAmountSecurely(String amount);

  /// 123 On the course cart when the student has no saved card.
  ///
  /// In en, this message translates to:
  /// **'Your card is entered on the secure checkout'**
  String get cardAtCheckout;

  /// 123 The sheet of the student's saved cards, on the course cart.
  ///
  /// In en, this message translates to:
  /// **'Choose a card'**
  String get chooseCard;

  /// 123 Pays with a card not saved yet, on the course cart.
  ///
  /// In en, this message translates to:
  /// **'Another card on the checkout'**
  String get anotherCard;

  /// No description provided for @webPageMediaRefused.
  ///
  /// In en, this message translates to:
  /// **'Allow the camera and microphone in your phone\'s settings so this page can use them.'**
  String get webPageMediaRefused;

  /// 124.15 Over the app's name on the Editorial launch screen.
  ///
  /// In en, this message translates to:
  /// **'Welcome to'**
  String get launchWelcome;

  /// 128 A live order card: the order was sent to the restaurant or shop.
  ///
  /// In en, this message translates to:
  /// **'Your order is with {place}'**
  String liveOrderPlaced(String place);

  /// 128 A live order card: the restaurant accepted it and is cooking the dish (its first dish, in a sentence).
  ///
  /// In en, this message translates to:
  /// **'{place} is preparing your {dish}'**
  String liveOrderCooking(String place, String dish);

  /// 128 A live order card: the food is ready, waiting for the courier.
  ///
  /// In en, this message translates to:
  /// **'Your {dish} is ready for the courier'**
  String liveOrderReady(String dish);

  /// 128 A live order card: the courier has the food.
  ///
  /// In en, this message translates to:
  /// **'Your {dish} is on its way'**
  String liveOrderOnTheWay(String dish);

  /// 128 A live order card: a marketplace shop accepted it and is picking it.
  ///
  /// In en, this message translates to:
  /// **'{place} is getting your order ready'**
  String liveOrderPicking(String place);

  /// 128 A live order card: a marketplace order is ready.
  ///
  /// In en, this message translates to:
  /// **'Your order from {place} is ready'**
  String liveMarketReady(String place);

  /// 128 A live order card: a marketplace order is with the courier.
  ///
  /// In en, this message translates to:
  /// **'Your order from {place} is on its way'**
  String liveMarketOnTheWay(String place);

  /// 128 After the minutes left on a live order card ("12 min").
  ///
  /// In en, this message translates to:
  /// **'min'**
  String get liveOrderMin;

  /// 128 The soonest a place delivers, in minutes (a place's chip, the address bar).
  ///
  /// In en, this message translates to:
  /// **'{min} min'**
  String marketMinutes(String min);

  /// 128 The live card of the person's shipment on a Studio page, before a courier has it.
  ///
  /// In en, this message translates to:
  /// **'{reference} is waiting for a courier'**
  String studioTrackWaiting(String reference);

  /// 128 The live shipment card once a courier has the shipment, before the pickup.
  ///
  /// In en, this message translates to:
  /// **'{reference} has its courier'**
  String studioTrackAssigned(String reference);

  /// 128 The live shipment card once the courier has the parcel.
  ///
  /// In en, this message translates to:
  /// **'{reference} is picked up'**
  String studioTrackPickedUp(String reference);

  /// 128 The live shipment card while the parcel is on its way to the drop-off.
  ///
  /// In en, this message translates to:
  /// **'{reference} is on the way'**
  String studioTrackOnTheWay(String reference);

  /// 128 Under the live shipment card's title: the courier's first name and the drop-off.
  ///
  /// In en, this message translates to:
  /// **'{courier} is bringing it to {place}'**
  String studioTrackBringing(String courier, String place);

  /// 128 Under the live shipment card's title before a courier has it: the drop-off.
  ///
  /// In en, this message translates to:
  /// **'To {place}'**
  String studioTrackTo(String place);

  /// 128 The live shipment card's button, opening the shipment.
  ///
  /// In en, this message translates to:
  /// **'Track'**
  String get studioTrackButton;

  /// 128 The live ride card while the driver comes to the pickup.
  ///
  /// In en, this message translates to:
  /// **'Arriving in {minutes} min'**
  String studioRideArriving(int minutes);

  /// 128 The live ride card while the driver comes, without the minutes.
  ///
  /// In en, this message translates to:
  /// **'Your driver is coming'**
  String get studioRideComing;

  /// 128 The live ride card once the driver is at the pickup.
  ///
  /// In en, this message translates to:
  /// **'Your driver is here'**
  String get studioRideHere;

  /// 128 The live ride card during the ride.
  ///
  /// In en, this message translates to:
  /// **'On the way to {place}'**
  String studioRideOnBoard(String place);

  /// 128 The live ride card while the ride looks for a driver.
  ///
  /// In en, this message translates to:
  /// **'Finding your driver'**
  String get studioRideSearching;

  /// 128 The call button on the live ride card, read out.
  ///
  /// In en, this message translates to:
  /// **'Call {name}'**
  String studioRideCall(String name);

  /// 128 The school's greeting on its home in the morning, to the family of the parent's first child (the photo hero).
  ///
  /// In en, this message translates to:
  /// **'Good morning,\n{name}\'s family'**
  String studioSchoolMorning(String name);

  /// 128 The school's greeting on its home after noon, to the family of the parent's first child.
  ///
  /// In en, this message translates to:
  /// **'Good evening,\n{name}\'s family'**
  String studioSchoolEvening(String name);

  /// 128 Today's card on a school's home: the child came in through the gate at this time.
  ///
  /// In en, this message translates to:
  /// **'{name} checked in at {time}'**
  String studioSchoolCheckedIn(String name, String time);

  /// 128 Today's card: the child left the school at this time.
  ///
  /// In en, this message translates to:
  /// **'{name} left at {time}'**
  String studioSchoolLeft(String name, String time);

  /// 128 Today's card: the child hasn't come in through the gate yet today.
  ///
  /// In en, this message translates to:
  /// **'{name} isn\'t at school yet'**
  String studioSchoolNotYet(String name);

  /// 128 Today's card: the child is absent, excused or on leave today.
  ///
  /// In en, this message translates to:
  /// **'{name} is away today'**
  String studioSchoolAway(String name);

  /// 128 Today's card, under the check-in: the child came in on time, at the school's gate.
  ///
  /// In en, this message translates to:
  /// **'On time · the gate'**
  String get studioSchoolOnTime;

  /// 128 Today's card, under the check-in: the child came in late, at the school's gate.
  ///
  /// In en, this message translates to:
  /// **'Late · the gate'**
  String get studioSchoolLate;

  /// 128 Today's card: the lesson going on now and its teacher.
  ///
  /// In en, this message translates to:
  /// **'Now · {subject} with {teacher}'**
  String studioSchoolNow(String subject, String teacher);

  /// 128 Today's card: the lesson going on now, without a teacher's name.
  ///
  /// In en, this message translates to:
  /// **'Now · {subject}'**
  String studioSchoolNowAlone(String subject);

  /// 128 Today's card, under the lesson now: the next lesson and when it starts.
  ///
  /// In en, this message translates to:
  /// **'Next: {subject} at {time}'**
  String studioSchoolNext(String subject, String time);

  /// 128 Today's card before school: the day's first lesson and when it starts.
  ///
  /// In en, this message translates to:
  /// **'First · {subject} at {time}'**
  String studioSchoolFirst(String subject, String time);

  /// 128 Today's card, under the lesson now when no lesson follows it.
  ///
  /// In en, this message translates to:
  /// **'The day\'s last lesson'**
  String get studioSchoolLastLesson;

  /// 128 Today's card once the day's lessons have ended.
  ///
  /// In en, this message translates to:
  /// **'Lessons are over for today'**
  String get studioSchoolLessonsOver;

  /// 128 Today's card once the lessons are over: when the last one ended.
  ///
  /// In en, this message translates to:
  /// **'The last ended at {time}'**
  String studioSchoolLessonsEnded(String time);

  /// 128 Today's card: when the afternoon school bus leaves for home.
  ///
  /// In en, this message translates to:
  /// **'Bus home leaves {time}'**
  String studioSchoolBusLeaves(String time);

  /// 128 Today's card: the child's school bus is running, this many minutes from their stop.
  ///
  /// In en, this message translates to:
  /// **'Bus on its way · {minutes} min'**
  String studioSchoolBusComing(String minutes);

  /// 128 Today's card, under the bus: its route and the child's stop.
  ///
  /// In en, this message translates to:
  /// **'{route} · {stop} stop'**
  String studioSchoolBusRoute(String route, String stop);

  /// 128 Today's card on a holiday or break; its name is under it.
  ///
  /// In en, this message translates to:
  /// **'No school today'**
  String get studioSchoolDayOff;

  /// 126 Travel (hotels and flights): the module's words, from here on.
  ///
  /// In en, this message translates to:
  /// **'Explore'**
  String get travelTabExplore;

  /// No description provided for @travelTabStays.
  ///
  /// In en, this message translates to:
  /// **'Stays'**
  String get travelTabStays;

  /// No description provided for @travelTabFlights.
  ///
  /// In en, this message translates to:
  /// **'Flights'**
  String get travelTabFlights;

  /// No description provided for @travelTabTrips.
  ///
  /// In en, this message translates to:
  /// **'Trips'**
  String get travelTabTrips;

  /// No description provided for @travelTabSaved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get travelTabSaved;

  /// No description provided for @travelTabBookings.
  ///
  /// In en, this message translates to:
  /// **'Bookings'**
  String get travelTabBookings;

  /// No description provided for @travelTabAlerts.
  ///
  /// In en, this message translates to:
  /// **'Alerts'**
  String get travelTabAlerts;

  /// No description provided for @travelTabSearch.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get travelTabSearch;

  /// No description provided for @travelTabHelp.
  ///
  /// In en, this message translates to:
  /// **'Help'**
  String get travelTabHelp;

  /// No description provided for @travelMorning.
  ///
  /// In en, this message translates to:
  /// **'Good morning'**
  String get travelMorning;

  /// No description provided for @travelAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon'**
  String get travelAfternoon;

  /// No description provided for @travelEvening.
  ///
  /// In en, this message translates to:
  /// **'Good evening'**
  String get travelEvening;

  /// No description provided for @travelGreeting.
  ///
  /// In en, this message translates to:
  /// **'{part}, {name}'**
  String travelGreeting(String part, String name);

  /// No description provided for @travelExploreTitle.
  ///
  /// In en, this message translates to:
  /// **'Where does the next story begin?'**
  String get travelExploreTitle;

  /// No description provided for @travelHeroPhoto.
  ///
  /// In en, this message translates to:
  /// **'A place to travel to'**
  String get travelHeroPhoto;

  /// No description provided for @travelStayFlight.
  ///
  /// In en, this message translates to:
  /// **'Stay + Flight'**
  String get travelStayFlight;

  /// No description provided for @travelFrom.
  ///
  /// In en, this message translates to:
  /// **'From'**
  String get travelFrom;

  /// No description provided for @travelTo.
  ///
  /// In en, this message translates to:
  /// **'To'**
  String get travelTo;

  /// No description provided for @travelWhereTo.
  ///
  /// In en, this message translates to:
  /// **'Where to?'**
  String get travelWhereTo;

  /// No description provided for @travelAnywhere.
  ///
  /// In en, this message translates to:
  /// **'Anywhere'**
  String get travelAnywhere;

  /// No description provided for @travelDates.
  ///
  /// In en, this message translates to:
  /// **'Dates'**
  String get travelDates;

  /// No description provided for @travelDatesNights.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Dates · 1 night} other{Dates · {count} nights}}'**
  String travelDatesNights(int count);

  /// No description provided for @travelTravellers.
  ///
  /// In en, this message translates to:
  /// **'Travellers'**
  String get travelTravellers;

  /// No description provided for @travelGuestsLabel.
  ///
  /// In en, this message translates to:
  /// **'Guests'**
  String get travelGuestsLabel;

  /// No description provided for @travelRoomsLabel.
  ///
  /// In en, this message translates to:
  /// **'Rooms'**
  String get travelRoomsLabel;

  /// No description provided for @travelTravellersLabel.
  ///
  /// In en, this message translates to:
  /// **'Travellers'**
  String get travelTravellersLabel;

  /// No description provided for @travelPeopleLabel.
  ///
  /// In en, this message translates to:
  /// **'People'**
  String get travelPeopleLabel;

  /// No description provided for @travelNightsLabel.
  ///
  /// In en, this message translates to:
  /// **'Nights'**
  String get travelNightsLabel;

  /// No description provided for @travelFindTrip.
  ///
  /// In en, this message translates to:
  /// **'Find my trip'**
  String get travelFindTrip;

  /// No description provided for @travelSearchStays.
  ///
  /// In en, this message translates to:
  /// **'Search stays'**
  String get travelSearchStays;

  /// No description provided for @travelSearchFlights.
  ///
  /// In en, this message translates to:
  /// **'Search flights'**
  String get travelSearchFlights;

  /// No description provided for @travelTogether.
  ///
  /// In en, this message translates to:
  /// **'Flight + hotel together'**
  String get travelTogether;

  /// No description provided for @travelOneBooking.
  ///
  /// In en, this message translates to:
  /// **'one booking, one price'**
  String get travelOneBooking;

  /// No description provided for @travelTrending.
  ///
  /// In en, this message translates to:
  /// **'Trending this month'**
  String get travelTrending;

  /// No description provided for @travelSeeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get travelSeeAll;

  /// No description provided for @travelTripFrom.
  ///
  /// In en, this message translates to:
  /// **'Stay + flight from {price}'**
  String travelTripFrom(String price);

  /// No description provided for @travelNightFrom.
  ///
  /// In en, this message translates to:
  /// **'Stays from {price} a night'**
  String travelNightFrom(String price);

  /// No description provided for @travelHotelsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 hotel} other{{count} hotels}}'**
  String travelHotelsCount(int count);

  /// No description provided for @travelAlertDropped.
  ///
  /// In en, this message translates to:
  /// **'{route} dropped {amount}'**
  String travelAlertDropped(String route, String amount);

  /// No description provided for @travelAlertNow.
  ///
  /// In en, this message translates to:
  /// **'Your alert · now from {price}'**
  String travelAlertNow(String price);

  /// No description provided for @travelPriceAlerts.
  ///
  /// In en, this message translates to:
  /// **'Price alerts'**
  String get travelPriceAlerts;

  /// No description provided for @travelMember.
  ///
  /// In en, this message translates to:
  /// **'Member'**
  String get travelMember;

  /// No description provided for @travelMemberPrices.
  ///
  /// In en, this message translates to:
  /// **'Member prices · −{percent}%'**
  String travelMemberPrices(int percent);

  /// No description provided for @travelMemberOff.
  ///
  /// In en, this message translates to:
  /// **'Member price · −{percent}%'**
  String travelMemberOff(int percent);

  /// No description provided for @travelMemberPrice.
  ///
  /// In en, this message translates to:
  /// **'Member price'**
  String get travelMemberPrice;

  /// No description provided for @travelStaysTitle.
  ///
  /// In en, this message translates to:
  /// **'Stay somewhere'**
  String get travelStaysTitle;

  /// No description provided for @travelStaysTitleEnd.
  ///
  /// In en, this message translates to:
  /// **'unforgettable.'**
  String get travelStaysTitleEnd;

  /// No description provided for @travelFlightsTitle.
  ///
  /// In en, this message translates to:
  /// **'The whole sky,'**
  String get travelFlightsTitle;

  /// No description provided for @travelFlightsTitleEnd.
  ///
  /// In en, this message translates to:
  /// **'one search.'**
  String get travelFlightsTitleEnd;

  /// No description provided for @travelAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get travelAll;

  /// No description provided for @travelFeaturedIn.
  ///
  /// In en, this message translates to:
  /// **'Featured · {city}'**
  String travelFeaturedIn(String city);

  /// No description provided for @travelPerNight.
  ///
  /// In en, this message translates to:
  /// **'{price} / night'**
  String travelPerNight(String price);

  /// No description provided for @travelReturn.
  ///
  /// In en, this message translates to:
  /// **'Return'**
  String get travelReturn;

  /// No description provided for @travelOneWay.
  ///
  /// In en, this message translates to:
  /// **'One way'**
  String get travelOneWay;

  /// No description provided for @travelDepart.
  ///
  /// In en, this message translates to:
  /// **'Depart'**
  String get travelDepart;

  /// No description provided for @travelSwap.
  ///
  /// In en, this message translates to:
  /// **'Swap'**
  String get travelSwap;

  /// No description provided for @travelDirectOnly.
  ///
  /// In en, this message translates to:
  /// **'Direct only'**
  String get travelDirectOnly;

  /// No description provided for @travelAdults.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 adult} other{{count} adults}}'**
  String travelAdults(int count);

  /// No description provided for @travelAdultsEconomy.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 adult · Economy} other{{count} adults · Economy}}'**
  String travelAdultsEconomy(int count);

  /// No description provided for @travelGuests.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 guest} other{{count} guests}}'**
  String travelGuests(int count);

  /// No description provided for @travelRooms.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 room} other{{count} rooms}}'**
  String travelRooms(int count);

  /// No description provided for @travelGuestsRooms.
  ///
  /// In en, this message translates to:
  /// **'{rooms, plural, =1{{guests} · 1 room} other{{guests} · {rooms} rooms}}'**
  String travelGuestsRooms(int guests, int rooms);

  /// No description provided for @travelPeople.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 person} other{{count} people}}'**
  String travelPeople(int count);

  /// No description provided for @travelTravellersCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 traveller} other{{count} travellers}}'**
  String travelTravellersCount(int count);

  /// No description provided for @travelNights.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 night} other{{count} nights}}'**
  String travelNights(int count);

  /// No description provided for @travelPickDates.
  ///
  /// In en, this message translates to:
  /// **'Choose your dates to see the prices.'**
  String get travelPickDates;

  /// No description provided for @travelLess.
  ///
  /// In en, this message translates to:
  /// **'Fewer'**
  String get travelLess;

  /// No description provided for @travelMore.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get travelMore;

  /// No description provided for @travelDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get travelDone;

  /// No description provided for @travelChoose.
  ///
  /// In en, this message translates to:
  /// **'Choose'**
  String get travelChoose;

  /// No description provided for @travelSearchPlaces.
  ///
  /// In en, this message translates to:
  /// **'City or airport'**
  String get travelSearchPlaces;

  /// No description provided for @travelNoPlaces.
  ///
  /// In en, this message translates to:
  /// **'Nothing matches. Try another name.'**
  String get travelNoPlaces;

  /// No description provided for @travelAmenityPool.
  ///
  /// In en, this message translates to:
  /// **'Pool'**
  String get travelAmenityPool;

  /// No description provided for @travelAmenitySpa.
  ///
  /// In en, this message translates to:
  /// **'Spa'**
  String get travelAmenitySpa;

  /// No description provided for @travelAmenityWifi.
  ///
  /// In en, this message translates to:
  /// **'Free Wi-Fi'**
  String get travelAmenityWifi;

  /// No description provided for @travelAmenityBreakfast.
  ///
  /// In en, this message translates to:
  /// **'Breakfast'**
  String get travelAmenityBreakfast;

  /// No description provided for @travelAmenityShuttle.
  ///
  /// In en, this message translates to:
  /// **'Airport shuttle'**
  String get travelAmenityShuttle;

  /// No description provided for @travelAmenityGym.
  ///
  /// In en, this message translates to:
  /// **'Gym'**
  String get travelAmenityGym;

  /// No description provided for @travelAmenityParking.
  ///
  /// In en, this message translates to:
  /// **'Parking'**
  String get travelAmenityParking;

  /// No description provided for @travelAmenityBeach.
  ///
  /// In en, this message translates to:
  /// **'Beach'**
  String get travelAmenityBeach;

  /// No description provided for @travelAmenityRestaurant.
  ///
  /// In en, this message translates to:
  /// **'Restaurant'**
  String get travelAmenityRestaurant;

  /// No description provided for @travelAmenityBar.
  ///
  /// In en, this message translates to:
  /// **'Bar'**
  String get travelAmenityBar;

  /// No description provided for @travelAmenityAirConditioning.
  ///
  /// In en, this message translates to:
  /// **'Air conditioning'**
  String get travelAmenityAirConditioning;

  /// No description provided for @travelAmenityFamily.
  ///
  /// In en, this message translates to:
  /// **'Family rooms'**
  String get travelAmenityFamily;

  /// No description provided for @travelAmenityPets.
  ///
  /// In en, this message translates to:
  /// **'Pets allowed'**
  String get travelAmenityPets;

  /// No description provided for @travelAmenityAccessible.
  ///
  /// In en, this message translates to:
  /// **'Accessible'**
  String get travelAmenityAccessible;

  /// No description provided for @travelAmenityKitchen.
  ///
  /// In en, this message translates to:
  /// **'Kitchen'**
  String get travelAmenityKitchen;

  /// No description provided for @travelAmenityView.
  ///
  /// In en, this message translates to:
  /// **'View'**
  String get travelAmenityView;

  /// No description provided for @travelKindResort.
  ///
  /// In en, this message translates to:
  /// **'Resort'**
  String get travelKindResort;

  /// No description provided for @travelKindBoutique.
  ///
  /// In en, this message translates to:
  /// **'Boutique hotel'**
  String get travelKindBoutique;

  /// No description provided for @travelKindApartments.
  ///
  /// In en, this message translates to:
  /// **'Apartments'**
  String get travelKindApartments;

  /// No description provided for @travelKindVilla.
  ///
  /// In en, this message translates to:
  /// **'Villa'**
  String get travelKindVilla;

  /// No description provided for @travelKindHostel.
  ///
  /// In en, this message translates to:
  /// **'Hostel'**
  String get travelKindHostel;

  /// No description provided for @travelKindGuesthouse.
  ///
  /// In en, this message translates to:
  /// **'Guesthouse'**
  String get travelKindGuesthouse;

  /// No description provided for @travelKindHotel.
  ///
  /// In en, this message translates to:
  /// **'Hotel'**
  String get travelKindHotel;

  /// No description provided for @travelBoardBreakfast.
  ///
  /// In en, this message translates to:
  /// **'Breakfast included'**
  String get travelBoardBreakfast;

  /// No description provided for @travelBoardHalf.
  ///
  /// In en, this message translates to:
  /// **'Half board'**
  String get travelBoardHalf;

  /// No description provided for @travelBoardFull.
  ///
  /// In en, this message translates to:
  /// **'Full board'**
  String get travelBoardFull;

  /// No description provided for @travelBoardAll.
  ///
  /// In en, this message translates to:
  /// **'All inclusive'**
  String get travelBoardAll;

  /// No description provided for @travelBoardRoomOnly.
  ///
  /// In en, this message translates to:
  /// **'Room only'**
  String get travelBoardRoomOnly;

  /// No description provided for @travelStatusOnTime.
  ///
  /// In en, this message translates to:
  /// **'On time'**
  String get travelStatusOnTime;

  /// No description provided for @travelStatusDelayed.
  ///
  /// In en, this message translates to:
  /// **'Delayed'**
  String get travelStatusDelayed;

  /// No description provided for @travelStatusBoarding.
  ///
  /// In en, this message translates to:
  /// **'Boarding'**
  String get travelStatusBoarding;

  /// No description provided for @travelStatusDeparted.
  ///
  /// In en, this message translates to:
  /// **'Departed'**
  String get travelStatusDeparted;

  /// No description provided for @travelStatusLanded.
  ///
  /// In en, this message translates to:
  /// **'Landed'**
  String get travelStatusLanded;

  /// No description provided for @travelStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get travelStatusCancelled;

  /// No description provided for @travelStatusScheduled.
  ///
  /// In en, this message translates to:
  /// **'Scheduled'**
  String get travelStatusScheduled;

  /// No description provided for @travelRequestLate.
  ///
  /// In en, this message translates to:
  /// **'Late arrival'**
  String get travelRequestLate;

  /// No description provided for @travelRequestEarly.
  ///
  /// In en, this message translates to:
  /// **'Early arrival'**
  String get travelRequestEarly;

  /// No description provided for @travelRequestHighFloor.
  ///
  /// In en, this message translates to:
  /// **'High floor'**
  String get travelRequestHighFloor;

  /// No description provided for @travelRequestQuiet.
  ///
  /// In en, this message translates to:
  /// **'Quiet room'**
  String get travelRequestQuiet;

  /// No description provided for @travelRequestPickup.
  ///
  /// In en, this message translates to:
  /// **'Airport pickup'**
  String get travelRequestPickup;

  /// No description provided for @travelRequestTwin.
  ///
  /// In en, this message translates to:
  /// **'Twin beds'**
  String get travelRequestTwin;

  /// No description provided for @travelRequestAccessible.
  ///
  /// In en, this message translates to:
  /// **'Accessible room'**
  String get travelRequestAccessible;

  /// No description provided for @travelLineNights.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 night × {unit}} other{{count} nights × {unit}}}'**
  String travelLineNights(int count, String unit);

  /// No description provided for @travelLineFare.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Fare · 1 traveller} other{Fare · {count} travellers}}'**
  String travelLineFare(int count);

  /// No description provided for @travelLineSeats.
  ///
  /// In en, this message translates to:
  /// **'Seats'**
  String get travelLineSeats;

  /// No description provided for @travelLineBags.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 extra bag} other{{count} extra bags}}'**
  String travelLineBags(int count);

  /// No description provided for @travelLineMeals.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 meal} other{{count} meals}}'**
  String travelLineMeals(int count);

  /// No description provided for @travelLineTransfer.
  ///
  /// In en, this message translates to:
  /// **'Airport transfer'**
  String get travelLineTransfer;

  /// No description provided for @travelLineTaxes.
  ///
  /// In en, this message translates to:
  /// **'Taxes and fees'**
  String get travelLineTaxes;

  /// No description provided for @travelLineMember.
  ///
  /// In en, this message translates to:
  /// **'Member price'**
  String get travelLineMember;

  /// No description provided for @travelLineBundle.
  ///
  /// In en, this message translates to:
  /// **'Stay + flight saving'**
  String get travelLineBundle;

  /// No description provided for @travelLineChangeFee.
  ///
  /// In en, this message translates to:
  /// **'Change fee'**
  String get travelLineChangeFee;

  /// No description provided for @travelSaveHotel.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get travelSaveHotel;

  /// No description provided for @travelUnsave.
  ///
  /// In en, this message translates to:
  /// **'Remove from saved'**
  String get travelUnsave;

  /// No description provided for @travelScoreExceptional.
  ///
  /// In en, this message translates to:
  /// **'Exceptional'**
  String get travelScoreExceptional;

  /// No description provided for @travelScoreSuperb.
  ///
  /// In en, this message translates to:
  /// **'Superb'**
  String get travelScoreSuperb;

  /// No description provided for @travelScoreVeryGood.
  ///
  /// In en, this message translates to:
  /// **'Very good'**
  String get travelScoreVeryGood;

  /// No description provided for @travelScoreGood.
  ///
  /// In en, this message translates to:
  /// **'Good'**
  String get travelScoreGood;

  /// No description provided for @travelScorePleasant.
  ///
  /// In en, this message translates to:
  /// **'Pleasant'**
  String get travelScorePleasant;

  /// No description provided for @travelReviews.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 review} other{{count} reviews}}'**
  String travelReviews(int count);

  /// No description provided for @travelStars.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 star} other{{count} stars}}'**
  String travelStars(int count);

  /// No description provided for @travelFreeCancellation.
  ///
  /// In en, this message translates to:
  /// **'Free cancellation'**
  String get travelFreeCancellation;

  /// No description provided for @travelNightsTaxes.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 night, taxes included} other{{count} nights, taxes included}}'**
  String travelNightsTaxes(int count);

  /// No description provided for @travelNightsAtHotel.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 night · pay at the hotel} other{{count} nights · pay at the hotel}}'**
  String travelNightsAtHotel(int count);

  /// No description provided for @travelANight.
  ///
  /// In en, this message translates to:
  /// **'a night'**
  String get travelANight;

  /// No description provided for @travelStaysCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No stays} =1{1 stay} other{{count} stays}}'**
  String travelStaysCount(int count);

  /// No description provided for @travelSortedBy.
  ///
  /// In en, this message translates to:
  /// **'sorted by {sort}'**
  String travelSortedBy(String sort);

  /// No description provided for @travelSort.
  ///
  /// In en, this message translates to:
  /// **'Sort'**
  String get travelSort;

  /// No description provided for @travelSortRecommended.
  ///
  /// In en, this message translates to:
  /// **'Recommended'**
  String get travelSortRecommended;

  /// No description provided for @travelSortPrice.
  ///
  /// In en, this message translates to:
  /// **'Lowest price'**
  String get travelSortPrice;

  /// No description provided for @travelSortScore.
  ///
  /// In en, this message translates to:
  /// **'Guest score'**
  String get travelSortScore;

  /// No description provided for @travelSortStars.
  ///
  /// In en, this message translates to:
  /// **'Stars'**
  String get travelSortStars;

  /// No description provided for @travelSuperbPlus.
  ///
  /// In en, this message translates to:
  /// **'Superb 9+'**
  String get travelSuperbPlus;

  /// No description provided for @travelShowMap.
  ///
  /// In en, this message translates to:
  /// **'Map'**
  String get travelShowMap;

  /// No description provided for @travelBackToList.
  ///
  /// In en, this message translates to:
  /// **'List'**
  String get travelBackToList;

  /// No description provided for @travelMapCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No stays} =1{1 stay · {nights}-night totals} other{{count} stays · {nights}-night totals}}'**
  String travelMapCount(int count, int nights);

  /// No description provided for @travelPinNights.
  ///
  /// In en, this message translates to:
  /// **'{nights, plural, =1{{price} · 1 night} other{{price} · {nights} nights}}'**
  String travelPinNights(String price, int nights);

  /// No description provided for @travelView.
  ///
  /// In en, this message translates to:
  /// **'View'**
  String get travelView;

  /// No description provided for @travelPhotosCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 photo} other{{count} photos}}'**
  String travelPhotosCount(int count);

  /// No description provided for @travelQuoteBy.
  ///
  /// In en, this message translates to:
  /// **'{name} · stayed {stayed}'**
  String travelQuoteBy(String name, String stayed);

  /// No description provided for @travelOverall.
  ///
  /// In en, this message translates to:
  /// **'Overall'**
  String get travelOverall;

  /// No description provided for @travelScoreStaff.
  ///
  /// In en, this message translates to:
  /// **'Staff'**
  String get travelScoreStaff;

  /// No description provided for @travelScoreClean.
  ///
  /// In en, this message translates to:
  /// **'Cleanliness'**
  String get travelScoreClean;

  /// No description provided for @travelScoreLocation.
  ///
  /// In en, this message translates to:
  /// **'Location'**
  String get travelScoreLocation;

  /// No description provided for @travelScoreValue.
  ///
  /// In en, this message translates to:
  /// **'Value for money'**
  String get travelScoreValue;

  /// No description provided for @travelCheckInOut.
  ///
  /// In en, this message translates to:
  /// **'Check-in from {checkIn} · check-out by {checkOut}'**
  String travelCheckInOut(String checkIn, String checkOut);

  /// No description provided for @travelChooseRoom.
  ///
  /// In en, this message translates to:
  /// **'Choose a room'**
  String get travelChooseRoom;

  /// No description provided for @travelChooseYourRoom.
  ///
  /// In en, this message translates to:
  /// **'Choose your room'**
  String get travelChooseYourRoom;

  /// No description provided for @travelFromANight.
  ///
  /// In en, this message translates to:
  /// **'from, a night'**
  String get travelFromANight;

  /// No description provided for @travelSleeps.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Sleeps 1} other{Sleeps {count}}}'**
  String travelSleeps(int count);

  /// No description provided for @travelLeftAtPrice.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 left at this price} other{{count} left at this price}}'**
  String travelLeftAtPrice(int count);

  /// No description provided for @travelMostChosen.
  ///
  /// In en, this message translates to:
  /// **'Most chosen'**
  String get travelMostChosen;

  /// No description provided for @travelSoldOut.
  ///
  /// In en, this message translates to:
  /// **'Sold out for your dates'**
  String get travelSoldOut;

  /// No description provided for @travelNoRooms.
  ///
  /// In en, this message translates to:
  /// **'No rooms are open for these dates.'**
  String get travelNoRooms;

  /// No description provided for @travelNonRefundable.
  ///
  /// In en, this message translates to:
  /// **'Non-refundable'**
  String get travelNonRefundable;

  /// No description provided for @travelFreeCancelUntil.
  ///
  /// In en, this message translates to:
  /// **'Free cancellation until {day}'**
  String travelFreeCancelUntil(String day);

  /// No description provided for @travelPayNowOrAtHotel.
  ///
  /// In en, this message translates to:
  /// **'Pay now or at the hotel'**
  String get travelPayNowOrAtHotel;

  /// No description provided for @travelPayAtHotel.
  ///
  /// In en, this message translates to:
  /// **'Pay at the hotel'**
  String get travelPayAtHotel;

  /// No description provided for @travelPayNow.
  ///
  /// In en, this message translates to:
  /// **'Pay now'**
  String get travelPayNow;

  /// No description provided for @travelReserve.
  ///
  /// In en, this message translates to:
  /// **'Reserve'**
  String get travelReserve;

  /// No description provided for @travelTotalPrice.
  ///
  /// In en, this message translates to:
  /// **'Total price'**
  String get travelTotalPrice;

  /// No description provided for @travelNoStays.
  ///
  /// In en, this message translates to:
  /// **'No stays found'**
  String get travelNoStays;

  /// No description provided for @travelNoStaysText.
  ///
  /// In en, this message translates to:
  /// **'Try other dates or fewer filters.'**
  String get travelNoStaysText;

  /// No description provided for @travelNoSaved.
  ///
  /// In en, this message translates to:
  /// **'Nothing saved yet'**
  String get travelNoSaved;

  /// No description provided for @travelNoSavedText.
  ///
  /// In en, this message translates to:
  /// **'Tap the heart on a stay to keep it here.'**
  String get travelNoSavedText;

  /// No description provided for @travelSavedSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see your saved stays'**
  String get travelSavedSignIn;

  /// No description provided for @travelSavedSignInText.
  ///
  /// In en, this message translates to:
  /// **'Your saved stays follow you on every phone.'**
  String get travelSavedSignInText;

  /// No description provided for @travelMessageHotel.
  ///
  /// In en, this message translates to:
  /// **'Message the hotel'**
  String get travelMessageHotel;

  /// No description provided for @travelDirect.
  ///
  /// In en, this message translates to:
  /// **'Direct'**
  String get travelDirect;

  /// No description provided for @travelStops.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 stop} other{{count} stops}}'**
  String travelStops(int count);

  /// No description provided for @travelStopsVia.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 stop · {via}} other{{count} stops · {via}}}'**
  String travelStopsVia(int count, String via);

  /// No description provided for @travelViaTime.
  ///
  /// In en, this message translates to:
  /// **'via {via} · {time}'**
  String travelViaTime(String via, String time);

  /// No description provided for @travelDuration.
  ///
  /// In en, this message translates to:
  /// **'{hours}h {minutes}m'**
  String travelDuration(int hours, String minutes);

  /// No description provided for @travelBothWays.
  ///
  /// In en, this message translates to:
  /// **'{stops} both ways'**
  String travelBothWays(String stops);

  /// No description provided for @travelCalendar.
  ///
  /// In en, this message translates to:
  /// **'Calendar'**
  String get travelCalendar;

  /// No description provided for @travelPriceGraph.
  ///
  /// In en, this message translates to:
  /// **'Price graph'**
  String get travelPriceGraph;

  /// No description provided for @travelReturnPricesFor.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Return prices for 1 · Economy} other{Return prices for {count} · Economy}}'**
  String travelReturnPricesFor(int count);

  /// No description provided for @travelOneWayPricesFor.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{One-way prices for 1 · Economy} other{One-way prices for {count} · Economy}}'**
  String travelOneWayPricesFor(int count);

  /// No description provided for @travelPreviousMonth.
  ///
  /// In en, this message translates to:
  /// **'Previous month'**
  String get travelPreviousMonth;

  /// No description provided for @travelNextMonth.
  ///
  /// In en, this message translates to:
  /// **'Next month'**
  String get travelNextMonth;

  /// No description provided for @travelLowest.
  ///
  /// In en, this message translates to:
  /// **'Lowest'**
  String get travelLowest;

  /// No description provided for @travelAverage.
  ///
  /// In en, this message translates to:
  /// **'Average'**
  String get travelAverage;

  /// No description provided for @travelHigher.
  ///
  /// In en, this message translates to:
  /// **'Higher'**
  String get travelHigher;

  /// No description provided for @travelLeaveInstead.
  ///
  /// In en, this message translates to:
  /// **'Leave {day} instead and save {saving}'**
  String travelLeaveInstead(String day, String saving);

  /// No description provided for @travelSameNights.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Same night} other{Same {count} nights}}'**
  String travelSameNights(int count);

  /// No description provided for @travelFromPerPerson.
  ///
  /// In en, this message translates to:
  /// **'from {price} per person'**
  String travelFromPerPerson(String price);

  /// No description provided for @travelShowFlights.
  ///
  /// In en, this message translates to:
  /// **'Show flights'**
  String get travelShowFlights;

  /// No description provided for @travelNoFlightsMonth.
  ///
  /// In en, this message translates to:
  /// **'No flights this month'**
  String get travelNoFlightsMonth;

  /// No description provided for @travelPricesAre.
  ///
  /// In en, this message translates to:
  /// **'Prices are'**
  String get travelPricesAre;

  /// No description provided for @travelLow.
  ///
  /// In en, this message translates to:
  /// **'low'**
  String get travelLow;

  /// No description provided for @travelHigh.
  ///
  /// In en, this message translates to:
  /// **'high'**
  String get travelHigh;

  /// No description provided for @travelTypical.
  ///
  /// In en, this message translates to:
  /// **'typical'**
  String get travelTypical;

  /// No description provided for @travelForYourDates.
  ///
  /// In en, this message translates to:
  /// **'for your dates'**
  String get travelForYourDates;

  /// No description provided for @travelUsually.
  ///
  /// In en, this message translates to:
  /// **'Usually {from}–{to} for these dates'**
  String travelUsually(String from, String to);

  /// No description provided for @travelBest.
  ///
  /// In en, this message translates to:
  /// **'Best'**
  String get travelBest;

  /// No description provided for @travelCheapest.
  ///
  /// In en, this message translates to:
  /// **'Cheapest'**
  String get travelCheapest;

  /// No description provided for @travelFastest.
  ///
  /// In en, this message translates to:
  /// **'Fastest'**
  String get travelFastest;

  /// No description provided for @travelTrack.
  ///
  /// In en, this message translates to:
  /// **'Track'**
  String get travelTrack;

  /// No description provided for @travelTracking.
  ///
  /// In en, this message translates to:
  /// **'We\'ll tell you when the price drops.'**
  String get travelTracking;

  /// No description provided for @travelSignInToWatch.
  ///
  /// In en, this message translates to:
  /// **'Sign in to watch prices.'**
  String get travelSignInToWatch;

  /// No description provided for @travelPerPerson.
  ///
  /// In en, this message translates to:
  /// **'per person'**
  String get travelPerPerson;

  /// No description provided for @travelPerPersonReturn.
  ///
  /// In en, this message translates to:
  /// **'per person, return'**
  String get travelPerPersonReturn;

  /// No description provided for @travelFreeChanges.
  ///
  /// In en, this message translates to:
  /// **'Free changes'**
  String get travelFreeChanges;

  /// No description provided for @travelCabinOnly.
  ///
  /// In en, this message translates to:
  /// **'Cabin bag only'**
  String get travelCabinOnly;

  /// No description provided for @travelCabinBag.
  ///
  /// In en, this message translates to:
  /// **'Cabin + {kg} kg bag'**
  String travelCabinBag(int kg);

  /// No description provided for @travelNoFlights.
  ///
  /// In en, this message translates to:
  /// **'No flights found'**
  String get travelNoFlights;

  /// No description provided for @travelNoFlightsText.
  ///
  /// In en, this message translates to:
  /// **'Try other dates or another airport.'**
  String get travelNoFlightsText;

  /// No description provided for @travelOut.
  ///
  /// In en, this message translates to:
  /// **'Outbound'**
  String get travelOut;

  /// No description provided for @travelWifi.
  ///
  /// In en, this message translates to:
  /// **'Wi-Fi'**
  String get travelWifi;

  /// No description provided for @travelMeal.
  ///
  /// In en, this message translates to:
  /// **'Meal'**
  String get travelMeal;

  /// No description provided for @travelTerminal.
  ///
  /// In en, this message translates to:
  /// **'Terminal {terminal}'**
  String travelTerminal(String terminal);

  /// No description provided for @travelChooseFare.
  ///
  /// In en, this message translates to:
  /// **'Choose your fare'**
  String get travelChooseFare;

  /// No description provided for @travelBestValue.
  ///
  /// In en, this message translates to:
  /// **'Best value'**
  String get travelBestValue;

  /// No description provided for @travelSeatsLeft.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 seat left} other{{count} seats left}}'**
  String travelSeatsLeft(int count);

  /// No description provided for @travelCabinKg.
  ///
  /// In en, this message translates to:
  /// **'Cabin bag {kg} kg'**
  String travelCabinKg(int kg);

  /// No description provided for @travelBagsKg.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 checked bag · {kg} kg} other{{count} checked bags · {kg} kg each}}'**
  String travelBagsKg(int count, int kg);

  /// No description provided for @travelNoCheckedBag.
  ///
  /// In en, this message translates to:
  /// **'No checked bag'**
  String get travelNoCheckedBag;

  /// No description provided for @travelChangeFor.
  ///
  /// In en, this message translates to:
  /// **'Changes for {fee}'**
  String travelChangeFor(String fee);

  /// No description provided for @travelNoChanges.
  ///
  /// In en, this message translates to:
  /// **'No changes'**
  String get travelNoChanges;

  /// No description provided for @travelFullRefund.
  ///
  /// In en, this message translates to:
  /// **'Full refund'**
  String get travelFullRefund;

  /// No description provided for @travelRefundAtFee.
  ///
  /// In en, this message translates to:
  /// **'Refund for a fee'**
  String get travelRefundAtFee;

  /// No description provided for @travelNoRefund.
  ///
  /// In en, this message translates to:
  /// **'No refund'**
  String get travelNoRefund;

  /// No description provided for @travelAnySeat.
  ///
  /// In en, this message translates to:
  /// **'Any seat included'**
  String get travelAnySeat;

  /// No description provided for @travelStandardSeat.
  ///
  /// In en, this message translates to:
  /// **'Standard seat included'**
  String get travelStandardSeat;

  /// No description provided for @travelSeatAtFee.
  ///
  /// In en, this message translates to:
  /// **'Seat for a fee'**
  String get travelSeatAtFee;

  /// No description provided for @travelFareTravellers.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{{fare} · 1 traveller} other{{fare} · {count} travellers}}'**
  String travelFareTravellers(String fare, int count);

  /// No description provided for @travelChooseSeats.
  ///
  /// In en, this message translates to:
  /// **'Choose seats'**
  String get travelChooseSeats;

  /// No description provided for @travelContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get travelContinue;

  /// No description provided for @travelChooseFlightFirst.
  ///
  /// In en, this message translates to:
  /// **'Choose a flight first'**
  String get travelChooseFlightFirst;

  /// No description provided for @travelSeatsOn.
  ///
  /// In en, this message translates to:
  /// **'Seats · {route}'**
  String travelSeatsOn(String route);

  /// No description provided for @travelSeatsAtAirport.
  ///
  /// In en, this message translates to:
  /// **'Seats are given at the airport on this flight'**
  String get travelSeatsAtAirport;

  /// No description provided for @travelFree.
  ///
  /// In en, this message translates to:
  /// **'Free'**
  String get travelFree;

  /// No description provided for @travelTaken.
  ///
  /// In en, this message translates to:
  /// **'Taken'**
  String get travelTaken;

  /// No description provided for @travelExtraLegroom.
  ///
  /// In en, this message translates to:
  /// **'Extra legroom · {price}'**
  String travelExtraLegroom(String price);

  /// No description provided for @travelSeatTaken.
  ///
  /// In en, this message translates to:
  /// **'{id}, taken'**
  String travelSeatTaken(String id);

  /// No description provided for @travelSeatExtra.
  ///
  /// In en, this message translates to:
  /// **'{id}, extra legroom'**
  String travelSeatExtra(String id);

  /// No description provided for @travelSeatFee.
  ///
  /// In en, this message translates to:
  /// **'Choosing a seat costs {price} on this fare'**
  String travelSeatFee(String price);

  /// No description provided for @travelSeatsNext.
  ///
  /// In en, this message translates to:
  /// **'You can skip this: seats are given at check-in.'**
  String get travelSeatsNext;

  /// No description provided for @travelBagsMeals.
  ///
  /// In en, this message translates to:
  /// **'Bags and meals'**
  String get travelBagsMeals;

  /// No description provided for @travelBagsMealsText.
  ///
  /// In en, this message translates to:
  /// **'Add them now, for less than at the airport.'**
  String get travelBagsMealsText;

  /// No description provided for @travelExtraBags.
  ///
  /// In en, this message translates to:
  /// **'Extra checked bags'**
  String get travelExtraBags;

  /// No description provided for @travelExtraBagsText.
  ///
  /// In en, this message translates to:
  /// **'{legs, plural, =1{For the flight, per bag} other{For each flight, per bag}}'**
  String travelExtraBagsText(int legs);

  /// No description provided for @travelMeals.
  ///
  /// In en, this message translates to:
  /// **'Meals'**
  String get travelMeals;

  /// No description provided for @travelMealsText.
  ///
  /// In en, this message translates to:
  /// **'{legs, plural, =1{A hot meal on the flight} other{A hot meal on each flight}}'**
  String travelMealsText(int legs);

  /// No description provided for @travelAtAirport.
  ///
  /// In en, this message translates to:
  /// **'At the airport'**
  String get travelAtAirport;

  /// No description provided for @travelNoTripFlight.
  ///
  /// In en, this message translates to:
  /// **'No flight on these dates. Try other dates.'**
  String get travelNoTripFlight;

  /// No description provided for @travelNoTripStay.
  ///
  /// In en, this message translates to:
  /// **'No stay open in that city on these dates.'**
  String get travelNoTripStay;

  /// No description provided for @travelWatchTrip.
  ///
  /// In en, this message translates to:
  /// **'Watch this trip\'s price'**
  String get travelWatchTrip;

  /// No description provided for @travelOnePrice.
  ///
  /// In en, this message translates to:
  /// **'One price'**
  String get travelOnePrice;

  /// No description provided for @travelOnePriceText.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 traveller · flights, {nights}-night stay and taxes} other{{count} travellers · flights, {nights}-night stay and taxes}}'**
  String travelOnePriceText(int count, int nights);

  /// No description provided for @travelSave.
  ///
  /// In en, this message translates to:
  /// **'Save {amount}'**
  String travelSave(String amount);

  /// No description provided for @travelChange.
  ///
  /// In en, this message translates to:
  /// **'Change'**
  String get travelChange;

  /// No description provided for @travelBagIncluded.
  ///
  /// In en, this message translates to:
  /// **'{kg} kg bag included'**
  String travelBagIncluded(int kg);

  /// No description provided for @travelStay.
  ///
  /// In en, this message translates to:
  /// **'Stay'**
  String get travelStay;

  /// No description provided for @travelTransfer.
  ///
  /// In en, this message translates to:
  /// **'Airport transfer'**
  String get travelTransfer;

  /// No description provided for @travelTotalFor.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Total for 1 traveller} other{Total for {count} travellers}}'**
  String travelTotalFor(int count);

  /// No description provided for @travelReserveTrip.
  ///
  /// In en, this message translates to:
  /// **'Reserve trip'**
  String get travelReserveTrip;

  /// No description provided for @travelConfirmPay.
  ///
  /// In en, this message translates to:
  /// **'Confirm and pay'**
  String get travelConfirmPay;

  /// No description provided for @travelSecureCheckout.
  ///
  /// In en, this message translates to:
  /// **'Secure checkout'**
  String get travelSecureCheckout;

  /// No description provided for @travelGuest.
  ///
  /// In en, this message translates to:
  /// **'Guest'**
  String get travelGuest;

  /// No description provided for @travelTravellersAsPassport.
  ///
  /// In en, this message translates to:
  /// **'Travellers, as on the passport'**
  String get travelTravellersAsPassport;

  /// No description provided for @travelSavedTraveller.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get travelSavedTraveller;

  /// No description provided for @travelFirstName.
  ///
  /// In en, this message translates to:
  /// **'First name (traveller {n})'**
  String travelFirstName(int n);

  /// No description provided for @travelLastName.
  ///
  /// In en, this message translates to:
  /// **'Last name'**
  String get travelLastName;

  /// No description provided for @travelNamesNeeded.
  ///
  /// In en, this message translates to:
  /// **'Enter every traveller\'s name.'**
  String get travelNamesNeeded;

  /// No description provided for @travelAtHotelText.
  ///
  /// In en, this message translates to:
  /// **'Nothing to pay now. You pay at the hotel.'**
  String get travelAtHotelText;

  /// No description provided for @travelPayNowText.
  ///
  /// In en, this message translates to:
  /// **'You pay on the secure payment page next.'**
  String get travelPayNowText;

  /// No description provided for @travelConfirmAtHotel.
  ///
  /// In en, this message translates to:
  /// **'Confirm booking'**
  String get travelConfirmAtHotel;

  /// No description provided for @travelConfirmAndPay.
  ///
  /// In en, this message translates to:
  /// **'Confirm and pay {total}'**
  String travelConfirmAndPay(String total);

  /// No description provided for @travelTotal.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get travelTotal;

  /// No description provided for @travelFreeCancelUntilHotel.
  ///
  /// In en, this message translates to:
  /// **'Free cancellation until {day} · full refund'**
  String travelFreeCancelUntilHotel(String day);

  /// No description provided for @travelBooked.
  ///
  /// In en, this message translates to:
  /// **'Booked. Have a good trip!'**
  String get travelBooked;

  /// No description provided for @travelTripsSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see your trips'**
  String get travelTripsSignIn;

  /// No description provided for @travelBookingsSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in to see your bookings'**
  String get travelBookingsSignIn;

  /// No description provided for @travelTripsSignInText.
  ///
  /// In en, this message translates to:
  /// **'Your bookings, boarding passes and changes, in one place.'**
  String get travelTripsSignInText;

  /// No description provided for @travelNoTrips.
  ///
  /// In en, this message translates to:
  /// **'No trips yet'**
  String get travelNoTrips;

  /// No description provided for @travelNoTripsText.
  ///
  /// In en, this message translates to:
  /// **'When you book, your trip shows here.'**
  String get travelNoTripsText;

  /// No description provided for @travelAwaitingPayment.
  ///
  /// In en, this message translates to:
  /// **'Awaiting payment'**
  String get travelAwaitingPayment;

  /// No description provided for @travelCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get travelCancelled;

  /// No description provided for @travelCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get travelCompleted;

  /// No description provided for @travelConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get travelConfirmed;

  /// No description provided for @travelCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Check-in'**
  String get travelCheckIn;

  /// No description provided for @travelBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get travelBack;

  /// No description provided for @travelTripsUpcoming.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Your next trip} other{Your next trip · {count} coming up}}'**
  String travelTripsUpcoming(int count);

  /// No description provided for @travelManage.
  ///
  /// In en, this message translates to:
  /// **'Manage booking'**
  String get travelManage;

  /// No description provided for @travelStartsIn.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, =0{Starts in {hours} h} =1{Starts in 1 day, {hours} h} other{Starts in {days} days, {hours} h}}'**
  String travelStartsIn(int days, int hours);

  /// No description provided for @travelPayDue.
  ///
  /// In en, this message translates to:
  /// **'Pay {amount}'**
  String travelPayDue(String amount);

  /// No description provided for @travelReviewStay.
  ///
  /// In en, this message translates to:
  /// **'Review your stay'**
  String get travelReviewStay;

  /// No description provided for @travelTerminalLabel.
  ///
  /// In en, this message translates to:
  /// **'Terminal'**
  String get travelTerminalLabel;

  /// No description provided for @travelGate.
  ///
  /// In en, this message translates to:
  /// **'Gate'**
  String get travelGate;

  /// No description provided for @travelSeatsLabel.
  ///
  /// In en, this message translates to:
  /// **'Seats'**
  String get travelSeatsLabel;

  /// No description provided for @travelBoards.
  ///
  /// In en, this message translates to:
  /// **'Boards'**
  String get travelBoards;

  /// No description provided for @travelBoardingPasses.
  ///
  /// In en, this message translates to:
  /// **'Boarding passes'**
  String get travelBoardingPasses;

  /// No description provided for @travelPassesLater.
  ///
  /// In en, this message translates to:
  /// **'They open 48 hours before the flight.'**
  String get travelPassesLater;

  /// No description provided for @travelPassOf.
  ///
  /// In en, this message translates to:
  /// **'{n} of {total}'**
  String travelPassOf(int n, int total);

  /// No description provided for @travelGateStatus.
  ///
  /// In en, this message translates to:
  /// **'Gate {gate} · {status}'**
  String travelGateStatus(String gate, String status);

  /// No description provided for @travelSeat.
  ///
  /// In en, this message translates to:
  /// **'Seat'**
  String get travelSeat;

  /// No description provided for @travelGroup.
  ///
  /// In en, this message translates to:
  /// **'Group'**
  String get travelGroup;

  /// No description provided for @travelPassenger.
  ///
  /// In en, this message translates to:
  /// **'Passenger'**
  String get travelPassenger;

  /// No description provided for @travelClass.
  ///
  /// In en, this message translates to:
  /// **'Fare'**
  String get travelClass;

  /// No description provided for @travelPassCode.
  ///
  /// In en, this message translates to:
  /// **'Boarding pass code'**
  String get travelPassCode;

  /// No description provided for @travelWorksOffline.
  ///
  /// In en, this message translates to:
  /// **'Works offline'**
  String get travelWorksOffline;

  /// No description provided for @travelKeptOffline.
  ///
  /// In en, this message translates to:
  /// **'Kept on this phone: it shows without a connection.'**
  String get travelKeptOffline;

  /// No description provided for @travelChangeSeat.
  ///
  /// In en, this message translates to:
  /// **'Change seat'**
  String get travelChangeSeat;

  /// No description provided for @travelPaid.
  ///
  /// In en, this message translates to:
  /// **'Paid: {amount}'**
  String travelPaid(String amount);

  /// No description provided for @travelDue.
  ///
  /// In en, this message translates to:
  /// **'Due: {amount}'**
  String travelDue(String amount);

  /// No description provided for @travelRefund.
  ///
  /// In en, this message translates to:
  /// **'Refund: {amount}'**
  String travelRefund(String amount);

  /// No description provided for @travelChangeDates.
  ///
  /// In en, this message translates to:
  /// **'Change dates'**
  String get travelChangeDates;

  /// No description provided for @travelChangeDatesText.
  ///
  /// In en, this message translates to:
  /// **'Same room, if it is free on the new dates.'**
  String get travelChangeDatesText;

  /// No description provided for @travelChanged.
  ///
  /// In en, this message translates to:
  /// **'Your booking is changed.'**
  String get travelChanged;

  /// No description provided for @travelChangeSeatOn.
  ///
  /// In en, this message translates to:
  /// **'Change seats on {number}'**
  String travelChangeSeatOn(String number);

  /// No description provided for @travelSeatsOf.
  ///
  /// In en, this message translates to:
  /// **'Seats: {seats}'**
  String travelSeatsOf(String seats);

  /// No description provided for @travelCancelTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel this booking?'**
  String get travelCancelTitle;

  /// No description provided for @travelCancelNoRefund.
  ///
  /// In en, this message translates to:
  /// **'Nothing is refunded on this booking.'**
  String get travelCancelNoRefund;

  /// No description provided for @travelCancelRefund.
  ///
  /// In en, this message translates to:
  /// **'You\'ll get {amount} back.'**
  String travelCancelRefund(String amount);

  /// No description provided for @travelCancelBooking.
  ///
  /// In en, this message translates to:
  /// **'Cancel booking'**
  String get travelCancelBooking;

  /// No description provided for @travelCancelledDone.
  ///
  /// In en, this message translates to:
  /// **'Your booking is cancelled.'**
  String get travelCancelledDone;

  /// No description provided for @travelCancelledRefund.
  ///
  /// In en, this message translates to:
  /// **'Cancelled · {amount} refunded'**
  String travelCancelledRefund(String amount);

  /// No description provided for @travelTravellerN.
  ///
  /// In en, this message translates to:
  /// **'Traveller {n}'**
  String travelTravellerN(int n);

  /// No description provided for @travelTripCouple.
  ///
  /// In en, this message translates to:
  /// **'Couple'**
  String get travelTripCouple;

  /// No description provided for @travelTripFamily.
  ///
  /// In en, this message translates to:
  /// **'Family'**
  String get travelTripFamily;

  /// No description provided for @travelTripFriends.
  ///
  /// In en, this message translates to:
  /// **'Friends'**
  String get travelTripFriends;

  /// No description provided for @travelTripSolo.
  ///
  /// In en, this message translates to:
  /// **'Solo'**
  String get travelTripSolo;

  /// No description provided for @travelTripBusiness.
  ///
  /// In en, this message translates to:
  /// **'Business'**
  String get travelTripBusiness;

  /// No description provided for @travelReviewWords.
  ///
  /// In en, this message translates to:
  /// **'A few words for other guests'**
  String get travelReviewWords;

  /// No description provided for @travelSendReview.
  ///
  /// In en, this message translates to:
  /// **'Send review'**
  String get travelSendReview;

  /// No description provided for @travelThanksReview.
  ///
  /// In en, this message translates to:
  /// **'Thank you for your review.'**
  String get travelThanksReview;

  /// No description provided for @travelAlertsSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in to watch prices'**
  String get travelAlertsSignIn;

  /// No description provided for @travelAlertsSignInText.
  ///
  /// In en, this message translates to:
  /// **'We watch the routes you choose and tell you when the price drops.'**
  String get travelAlertsSignInText;

  /// No description provided for @travelAlertsEyebrow.
  ///
  /// In en, this message translates to:
  /// **'We watch, you relax'**
  String get travelAlertsEyebrow;

  /// No description provided for @travelNewAlert.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get travelNewAlert;

  /// No description provided for @travelNoAlerts.
  ///
  /// In en, this message translates to:
  /// **'No price alerts yet'**
  String get travelNoAlerts;

  /// No description provided for @travelNoAlertsText.
  ///
  /// In en, this message translates to:
  /// **'Watch a route and we\'ll tell you when it gets cheaper.'**
  String get travelNoAlertsText;

  /// No description provided for @travelAnywhereUnder.
  ///
  /// In en, this message translates to:
  /// **'Anywhere under {price}'**
  String travelAnywhereUnder(String price);

  /// No description provided for @travelStayAndFlightTo.
  ///
  /// In en, this message translates to:
  /// **'{city} · stay + flight'**
  String travelStayAndFlightTo(String city);

  /// No description provided for @travelFromCity.
  ///
  /// In en, this message translates to:
  /// **'From {city}'**
  String travelFromCity(String city);

  /// No description provided for @travelAnyDates.
  ///
  /// In en, this message translates to:
  /// **'any dates'**
  String get travelAnyDates;

  /// No description provided for @travelAnyDatesIn.
  ///
  /// In en, this message translates to:
  /// **'any dates in {month}'**
  String travelAnyDatesIn(String month);

  /// No description provided for @travelChangeSince.
  ///
  /// In en, this message translates to:
  /// **'{change} so far'**
  String travelChangeSince(String change);

  /// No description provided for @travelNothingOnSale.
  ///
  /// In en, this message translates to:
  /// **'Nothing on sale right now'**
  String get travelNothingOnSale;

  /// No description provided for @travelFewSeatsAtPrice.
  ///
  /// In en, this message translates to:
  /// **'Few seats left at this price.'**
  String get travelFewSeatsAtPrice;

  /// No description provided for @travelPriceDropped.
  ///
  /// In en, this message translates to:
  /// **'The price went down.'**
  String get travelPriceDropped;

  /// No description provided for @travelWeWatch.
  ///
  /// In en, this message translates to:
  /// **'We check the price every day and tell you when it drops.'**
  String get travelWeWatch;

  /// No description provided for @travelGoodTimeToBook.
  ///
  /// In en, this message translates to:
  /// **'Good time to book.'**
  String get travelGoodTimeToBook;

  /// No description provided for @travelSeeTrip.
  ///
  /// In en, this message translates to:
  /// **'See the trip'**
  String get travelSeeTrip;

  /// No description provided for @travelSeeFlights.
  ///
  /// In en, this message translates to:
  /// **'See flights'**
  String get travelSeeFlights;

  /// No description provided for @travelNewMatches.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{None yet} =1{1 new} other{{count} new}}'**
  String travelNewMatches(int count);

  /// No description provided for @travelStopWatching.
  ///
  /// In en, this message translates to:
  /// **'Stop watching'**
  String get travelStopWatching;

  /// No description provided for @travelChooseRoute.
  ///
  /// In en, this message translates to:
  /// **'Choose the route to watch.'**
  String get travelChooseRoute;

  /// No description provided for @travelChooseMax.
  ///
  /// In en, this message translates to:
  /// **'Enter the most you\'d pay.'**
  String get travelChooseMax;

  /// No description provided for @travelAlertRoute.
  ///
  /// In en, this message translates to:
  /// **'Route'**
  String get travelAlertRoute;

  /// No description provided for @travelAlertTrip.
  ///
  /// In en, this message translates to:
  /// **'Stay + flight'**
  String get travelAlertTrip;

  /// No description provided for @travelAlertAnywhere.
  ///
  /// In en, this message translates to:
  /// **'Anywhere'**
  String get travelAlertAnywhere;

  /// No description provided for @travelMaxPrice.
  ///
  /// In en, this message translates to:
  /// **'Most you\'d pay ({currency})'**
  String travelMaxPrice(String currency);

  /// No description provided for @travelWhen.
  ///
  /// In en, this message translates to:
  /// **'When'**
  String get travelWhen;

  /// No description provided for @travelWatchPrice.
  ///
  /// In en, this message translates to:
  /// **'Watch the price'**
  String get travelWatchPrice;

  /// No description provided for @travelTravellersCabin.
  ///
  /// In en, this message translates to:
  /// **'Travellers and cabin'**
  String get travelTravellersCabin;

  /// 129.2 A story's spoken name in a row of stories and full screen.
  ///
  /// In en, this message translates to:
  /// **'Story {index} of {total}'**
  String studioStoryOf(int index, int total);

  /// 129.2 The button over a story that opens its link.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get studioStoryOpen;

  /// 129.3 Spoken while a ticker is held still.
  ///
  /// In en, this message translates to:
  /// **'Paused'**
  String get studioTickerPaused;

  /// 129.4 The button over a video banner that plays it.
  ///
  /// In en, this message translates to:
  /// **'Play the video'**
  String get studioVideoPlay;

  /// 129.4 The button over a video banner that pauses it.
  ///
  /// In en, this message translates to:
  /// **'Pause the video'**
  String get studioVideoPause;

  /// 129.6 The spoken name of a before and after photo.
  ///
  /// In en, this message translates to:
  /// **'Before and after: {before} and {after}'**
  String studioCompareLabel(String before, String after);

  /// 129.6 The spoken hint of the handle between the two photos.
  ///
  /// In en, this message translates to:
  /// **'Drag to compare'**
  String get studioCompareHandle;

  /// 129.12 The monthly side of the plans' switch on a Studio page's pricing cards.
  ///
  /// In en, this message translates to:
  /// **'Monthly'**
  String get studioPremiumMonthly;

  /// 129.12 The yearly side of the plans' switch on a Studio page's pricing cards.
  ///
  /// In en, this message translates to:
  /// **'Yearly'**
  String get studioPremiumYearly;

  /// 129.12 After a plan's monthly price on a Studio page ("₺450 / month").
  ///
  /// In en, this message translates to:
  /// **'/ month'**
  String get studioPremiumPerMonth;

  /// 129.12 After a plan's yearly price on a Studio page ("₺4,500 / year").
  ///
  /// In en, this message translates to:
  /// **'/ year'**
  String get studioPremiumPerYear;

  /// 129.12 The chip on the highlighted plan of a Studio page's pricing cards.
  ///
  /// In en, this message translates to:
  /// **'Most popular'**
  String get studioPremiumPopular;

  /// 129.11 What a screen reader says for the stars on a quote card of a Studio page.
  ///
  /// In en, this message translates to:
  /// **'{rating} out of 5 stars'**
  String studioPremiumStars(int rating);

  /// 129.14 What a screen reader says for a progress bar or ring on a Studio page.
  ///
  /// In en, this message translates to:
  /// **'{label}: {value} percent'**
  String studioPremiumProgress(String label, int value);

  /// 129.15 What a screen reader says before a step of a timeline on a Studio page.
  ///
  /// In en, this message translates to:
  /// **'Step {number} of {count}'**
  String studioPremiumStep(int number, int count);

  /// 129.15 What a screen reader says for the active step of a timeline on a Studio page.
  ///
  /// In en, this message translates to:
  /// **'Current step'**
  String get studioPremiumCurrentStep;

  /// 129.23 The word on a two-ink map's roof-sign markers when the Studio element has none.
  ///
  /// In en, this message translates to:
  /// **'TAXI'**
  String get studioMapSign;

  /// 129.23 A radar lens's minute ring on a Studio map, and a live route's minutes without a name.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min'**
  String studioMapMinutes(int minutes);

  /// 129.24 The chip over the pickup on a Studio map's live route while the driver comes.
  ///
  /// In en, this message translates to:
  /// **'Pickup'**
  String get studioMapPickup;

  /// 129.24 The bubble by the driver on a Studio map's live route: their first name and the minutes to the pickup.
  ///
  /// In en, this message translates to:
  /// **'{name} · {minutes} min'**
  String studioMapEta(String name, int minutes);

  /// 130.11 Over the city of the person's next trip (Studio's `tracking` trip ticket).
  ///
  /// In en, this message translates to:
  /// **'Your next trip'**
  String get studioTripNext;

  /// 130.11 When the person's next trip starts.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Today} =1{Tomorrow} other{In {count} days}}'**
  String studioTripIn(int count);

  /// 130.11 After the days left, large: to which city.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{day to {city}} other{days to {city}}}'**
  String studioTripDaysTo(int count, String city);

  /// 130.11 The trip's stay: its nights ("4 nights") at the hotel.
  ///
  /// In en, this message translates to:
  /// **'{nights} at {hotel}'**
  String studioTripStay(String nights, String hotel);

  /// 130.11 The trip's airport transfer, one of its legs.
  ///
  /// In en, this message translates to:
  /// **'Transfer'**
  String get studioTripTransfer;

  /// 130.11 The trip ticket's button to the boarding passes.
  ///
  /// In en, this message translates to:
  /// **'Boarding pass'**
  String get studioTripPass;

  /// 130.11 After a number of minutes shown large ("3 min").
  ///
  /// In en, this message translates to:
  /// **'min'**
  String get studioMinutesShort;

  /// 130.11 Beside the nearest free taxi's minutes, large.
  ///
  /// In en, this message translates to:
  /// **'Nearest free taxi'**
  String get studioTaxiNearestFree;

  /// 130.11 How many free taxis are around the person, live.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 taxi around you, live} other{{count} taxis around you, live}}'**
  String studioTaxisAroundLive(int count);

  /// 130.11 After the count of free taxis, large ("8 free taxis around you.").
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{free taxi around you.} other{free taxis around you.}}'**
  String studioTaxisFreeAround(int count);

  /// 130.11 Over the driver's name while they come to the pickup.
  ///
  /// In en, this message translates to:
  /// **'On the way'**
  String get studioRideOnTheWayShort;

  /// 130.11 On the trip ticket: where the flight stops.
  ///
  /// In en, this message translates to:
  /// **'via {via}'**
  String studioTripVia(String via);
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
