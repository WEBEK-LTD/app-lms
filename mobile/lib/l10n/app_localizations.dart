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
