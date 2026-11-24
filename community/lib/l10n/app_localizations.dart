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

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'Yallapp Community'**
  String get appName;

  /// No description provided for @commonComingSoon.
  ///
  /// In en, this message translates to:
  /// **'Coming soon'**
  String get commonComingSoon;

  /// No description provided for @commonComingSoonBody.
  ///
  /// In en, this message translates to:
  /// **'We’re building this. It arrives in a coming update.'**
  String get commonComingSoonBody;

  /// No description provided for @commonOk.
  ///
  /// In en, this message translates to:
  /// **'OK'**
  String get commonOk;

  /// No description provided for @commonCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get commonCancel;

  /// No description provided for @commonSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get commonSave;

  /// No description provided for @commonRetry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get commonRetry;

  /// No description provided for @commonClose.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get commonClose;

  /// No description provided for @commonBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get commonBack;

  /// No description provided for @commonSeeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get commonSeeAll;

  /// No description provided for @commonError.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Try again.'**
  String get commonError;

  /// No description provided for @commonOffline.
  ///
  /// In en, this message translates to:
  /// **'You’re offline. Check your connection and try again.'**
  String get commonOffline;

  /// No description provided for @commonEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing here yet.'**
  String get commonEmpty;

  /// No description provided for @commonLocked.
  ///
  /// In en, this message translates to:
  /// **'Unlocks on the account that has it'**
  String get commonLocked;

  /// No description provided for @langTitle.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get langTitle;

  /// No description provided for @langEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get langEnglish;

  /// No description provided for @langArabic.
  ///
  /// In en, this message translates to:
  /// **'العربية'**
  String get langArabic;

  /// No description provided for @langTurkish.
  ///
  /// In en, this message translates to:
  /// **'Türkçe'**
  String get langTurkish;

  /// No description provided for @authHeadline1.
  ///
  /// In en, this message translates to:
  /// **'Build apps.'**
  String get authHeadline1;

  /// No description provided for @authHeadline2.
  ///
  /// In en, this message translates to:
  /// **'Build together.'**
  String get authHeadline2;

  /// No description provided for @authPitch.
  ///
  /// In en, this message translates to:
  /// **'Join 18,000+ app makers. Learn, ask,\nand show what you built.'**
  String get authPitch;

  /// No description provided for @authBubbleNour.
  ///
  /// In en, this message translates to:
  /// **'Launched my store today 🎉'**
  String get authBubbleNour;

  /// No description provided for @authBubbleAccepted.
  ///
  /// In en, this message translates to:
  /// **'Answer accepted'**
  String get authBubbleAccepted;

  /// No description provided for @authBubblePoints.
  ///
  /// In en, this message translates to:
  /// **'+25 points'**
  String get authBubblePoints;

  /// No description provided for @authBubbleChallenge.
  ///
  /// In en, this message translates to:
  /// **'Winter challenge'**
  String get authBubbleChallenge;

  /// No description provided for @authBubbleDays.
  ///
  /// In en, this message translates to:
  /// **'4 days left'**
  String get authBubbleDays;

  /// No description provided for @authContinueApple.
  ///
  /// In en, this message translates to:
  /// **'Continue with Apple'**
  String get authContinueApple;

  /// No description provided for @authContinueGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get authContinueGoogle;

  /// No description provided for @authSignUpEmail.
  ///
  /// In en, this message translates to:
  /// **'Sign up with email'**
  String get authSignUpEmail;

  /// No description provided for @authAlreadyMember.
  ///
  /// In en, this message translates to:
  /// **'Already a member?'**
  String get authAlreadyMember;

  /// No description provided for @authLogIn.
  ///
  /// In en, this message translates to:
  /// **'Log in'**
  String get authLogIn;

  /// No description provided for @authSignUpTitle.
  ///
  /// In en, this message translates to:
  /// **'Create your account'**
  String get authSignUpTitle;

  /// No description provided for @authSignUpLine.
  ///
  /// In en, this message translates to:
  /// **'Learn, ask and show your apps with 18,000+ app makers.'**
  String get authSignUpLine;

  /// No description provided for @authLogInTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get authLogInTitle;

  /// No description provided for @authLogInLine.
  ///
  /// In en, this message translates to:
  /// **'Log in to your Community account.'**
  String get authLogInLine;

  /// No description provided for @authName.
  ///
  /// In en, this message translates to:
  /// **'Your name'**
  String get authName;

  /// No description provided for @authEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get authEmail;

  /// No description provided for @authPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get authPassword;

  /// No description provided for @authCreateAccount.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get authCreateAccount;

  /// No description provided for @authForgot.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get authForgot;

  /// No description provided for @authResetSent.
  ///
  /// In en, this message translates to:
  /// **'If that email has an account, a reset link is on its way.'**
  String get authResetSent;

  /// No description provided for @authResetTitle.
  ///
  /// In en, this message translates to:
  /// **'Reset your password'**
  String get authResetTitle;

  /// No description provided for @authSendLink.
  ///
  /// In en, this message translates to:
  /// **'Send reset link'**
  String get authSendLink;

  /// No description provided for @authNoAccount.
  ///
  /// In en, this message translates to:
  /// **'New here?'**
  String get authNoAccount;

  /// No description provided for @authOr.
  ///
  /// In en, this message translates to:
  /// **'or'**
  String get authOr;

  /// No description provided for @authNameNeeded.
  ///
  /// In en, this message translates to:
  /// **'Enter your name.'**
  String get authNameNeeded;

  /// No description provided for @authEmailInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email.'**
  String get authEmailInvalid;

  /// No description provided for @authPasswordShort.
  ///
  /// In en, this message translates to:
  /// **'Use at least 8 characters.'**
  String get authPasswordShort;

  /// No description provided for @authTerms.
  ///
  /// In en, this message translates to:
  /// **'By continuing you agree to the Community rules and privacy policy.'**
  String get authTerms;

  /// No description provided for @authProviderNotReady.
  ///
  /// In en, this message translates to:
  /// **'This sign-in isn’t set up in this build. Use email for now.'**
  String get authProviderNotReady;

  /// No description provided for @tabHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get tabHome;

  /// No description provided for @tabQa.
  ///
  /// In en, this message translates to:
  /// **'Q&A'**
  String get tabQa;

  /// No description provided for @tabCreate.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get tabCreate;

  /// No description provided for @tabLearn.
  ///
  /// In en, this message translates to:
  /// **'Learn'**
  String get tabLearn;

  /// No description provided for @tabGroups.
  ///
  /// In en, this message translates to:
  /// **'Groups'**
  String get tabGroups;

  /// No description provided for @headerMenu.
  ///
  /// In en, this message translates to:
  /// **'Menu'**
  String get headerMenu;

  /// No description provided for @headerSearch.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get headerSearch;

  /// No description provided for @headerMessages.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get headerMessages;

  /// No description provided for @headerNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get headerNotifications;

  /// No description provided for @headerProfile.
  ///
  /// In en, this message translates to:
  /// **'Your profile'**
  String get headerProfile;

  /// No description provided for @homeMorning.
  ///
  /// In en, this message translates to:
  /// **'Good morning ☀️'**
  String get homeMorning;

  /// No description provided for @homeAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon 🌤️'**
  String get homeAfternoon;

  /// No description provided for @homeEvening.
  ///
  /// In en, this message translates to:
  /// **'Good evening 🌙'**
  String get homeEvening;

  /// No description provided for @homeRead.
  ///
  /// In en, this message translates to:
  /// **'Read'**
  String get homeRead;

  /// No description provided for @homeJoin.
  ///
  /// In en, this message translates to:
  /// **'Join now'**
  String get homeJoin;

  /// No description provided for @homeDays.
  ///
  /// In en, this message translates to:
  /// **'days'**
  String get homeDays;

  /// No description provided for @homeHours.
  ///
  /// In en, this message translates to:
  /// **'hrs'**
  String get homeHours;

  /// No description provided for @homeMinutes.
  ///
  /// In en, this message translates to:
  /// **'min'**
  String get homeMinutes;

  /// No description provided for @homeStoryLive.
  ///
  /// In en, this message translates to:
  /// **'Live Thu'**
  String get homeStoryLive;

  /// No description provided for @homeStoryTutorial.
  ///
  /// In en, this message translates to:
  /// **'New tutorial'**
  String get homeStoryTutorial;

  /// No description provided for @homeStoryShowcase.
  ///
  /// In en, this message translates to:
  /// **'Showcase'**
  String get homeStoryShowcase;

  /// No description provided for @homeStoryTip.
  ///
  /// In en, this message translates to:
  /// **'Daily tip'**
  String get homeStoryTip;

  /// No description provided for @homeStoryNews.
  ///
  /// In en, this message translates to:
  /// **'What’s new'**
  String get homeStoryNews;

  /// No description provided for @homeFeedEmpty.
  ///
  /// In en, this message translates to:
  /// **'Questions and tutorials from the community show here.'**
  String get homeFeedEmpty;

  /// No description provided for @menuCommunity.
  ///
  /// In en, this message translates to:
  /// **'Community'**
  String get menuCommunity;

  /// No description provided for @menuHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get menuHome;

  /// No description provided for @menuQa.
  ///
  /// In en, this message translates to:
  /// **'Q&A'**
  String get menuQa;

  /// No description provided for @menuTutorials.
  ///
  /// In en, this message translates to:
  /// **'Tutorials'**
  String get menuTutorials;

  /// No description provided for @menuAcademy.
  ///
  /// In en, this message translates to:
  /// **'Academy'**
  String get menuAcademy;

  /// No description provided for @menuShowcase.
  ///
  /// In en, this message translates to:
  /// **'Showcase'**
  String get menuShowcase;

  /// No description provided for @menuChallenges.
  ///
  /// In en, this message translates to:
  /// **'Challenges'**
  String get menuChallenges;

  /// No description provided for @menuGroups.
  ///
  /// In en, this message translates to:
  /// **'Groups'**
  String get menuGroups;

  /// No description provided for @menuFriends.
  ///
  /// In en, this message translates to:
  /// **'Friends'**
  String get menuFriends;

  /// No description provided for @menuPros.
  ///
  /// In en, this message translates to:
  /// **'Pros'**
  String get menuPros;

  /// No description provided for @menuEvents.
  ///
  /// In en, this message translates to:
  /// **'Events'**
  String get menuEvents;

  /// No description provided for @menuYourGroups.
  ///
  /// In en, this message translates to:
  /// **'Your groups'**
  String get menuYourGroups;

  /// No description provided for @menuGroupsSoon.
  ///
  /// In en, this message translates to:
  /// **'Groups arrive in a coming update.'**
  String get menuGroupsSoon;

  /// No description provided for @menuLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get menuLight;

  /// No description provided for @menuDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get menuDark;

  /// No description provided for @menuSaved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get menuSaved;

  /// No description provided for @menuSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get menuSettings;

  /// No description provided for @menuLogOut.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get menuLogOut;

  /// No description provided for @menuPoints.
  ///
  /// In en, this message translates to:
  /// **'{points} pts'**
  String menuPoints(int points);

  /// No description provided for @createTitle.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get createTitle;

  /// No description provided for @createAsk.
  ///
  /// In en, this message translates to:
  /// **'Ask a question'**
  String get createAsk;

  /// No description provided for @createAskLine.
  ///
  /// In en, this message translates to:
  /// **'Get answers from the community and the Yallapp Team.'**
  String get createAskLine;

  /// No description provided for @createShowcase.
  ///
  /// In en, this message translates to:
  /// **'Show your app'**
  String get createShowcase;

  /// No description provided for @createShowcaseLine.
  ///
  /// In en, this message translates to:
  /// **'Share what you built with Yallapp.'**
  String get createShowcaseLine;

  /// No description provided for @createChallenge.
  ///
  /// In en, this message translates to:
  /// **'Join a challenge'**
  String get createChallenge;

  /// No description provided for @createChallengeLine.
  ///
  /// In en, this message translates to:
  /// **'Build to a theme and win.'**
  String get createChallengeLine;

  /// No description provided for @profileTitle.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profileTitle;

  /// No description provided for @profileEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit profile'**
  String get profileEdit;

  /// No description provided for @profileFollowers.
  ///
  /// In en, this message translates to:
  /// **'Followers'**
  String get profileFollowers;

  /// No description provided for @profileFollowing.
  ///
  /// In en, this message translates to:
  /// **'Following'**
  String get profileFollowing;

  /// No description provided for @profileFriends.
  ///
  /// In en, this message translates to:
  /// **'Friends'**
  String get profileFriends;

  /// No description provided for @profilePoints.
  ///
  /// In en, this message translates to:
  /// **'Points'**
  String get profilePoints;

  /// No description provided for @profileAnswers.
  ///
  /// In en, this message translates to:
  /// **'Answers'**
  String get profileAnswers;

  /// No description provided for @profileQuestions.
  ///
  /// In en, this message translates to:
  /// **'Questions'**
  String get profileQuestions;

  /// No description provided for @profileBadges.
  ///
  /// In en, this message translates to:
  /// **'Badges'**
  String get profileBadges;

  /// No description provided for @profileNoBadges.
  ///
  /// In en, this message translates to:
  /// **'No badges yet. Answer, teach and build to earn them.'**
  String get profileNoBadges;

  /// No description provided for @profileBadgeGold.
  ///
  /// In en, this message translates to:
  /// **'Pro Developer'**
  String get profileBadgeGold;

  /// No description provided for @profileBadgeGreen.
  ///
  /// In en, this message translates to:
  /// **'Verified Business'**
  String get profileBadgeGreen;

  /// No description provided for @profileBadgeBlue.
  ///
  /// In en, this message translates to:
  /// **'Active Member'**
  String get profileBadgeBlue;

  /// No description provided for @profileSkills.
  ///
  /// In en, this message translates to:
  /// **'Skills'**
  String get profileSkills;

  /// No description provided for @profileApps.
  ///
  /// In en, this message translates to:
  /// **'Apps on Yallapp'**
  String get profileApps;

  /// No description provided for @profileNoApps.
  ///
  /// In en, this message translates to:
  /// **'No apps linked yet.'**
  String get profileNoApps;

  /// No description provided for @profileLinkYallapp.
  ///
  /// In en, this message translates to:
  /// **'Link your Yallapp account'**
  String get profileLinkYallapp;

  /// No description provided for @profileLinkLine.
  ///
  /// In en, this message translates to:
  /// **'Show the apps you made and qualify for badges.'**
  String get profileLinkLine;

  /// No description provided for @profileLinkOpened.
  ///
  /// In en, this message translates to:
  /// **'Confirm the link on the page that opened, then come back.'**
  String get profileLinkOpened;

  /// No description provided for @profileJoined.
  ///
  /// In en, this message translates to:
  /// **'Joined {date}'**
  String profileJoined(String date);

  /// No description provided for @profileBio.
  ///
  /// In en, this message translates to:
  /// **'Bio'**
  String get profileBio;

  /// No description provided for @profileName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get profileName;

  /// No description provided for @profileUsername.
  ///
  /// In en, this message translates to:
  /// **'Username'**
  String get profileUsername;

  /// No description provided for @profileAddSkill.
  ///
  /// In en, this message translates to:
  /// **'Add a skill'**
  String get profileAddSkill;

  /// No description provided for @profileChangePhoto.
  ///
  /// In en, this message translates to:
  /// **'Change photo'**
  String get profileChangePhoto;

  /// No description provided for @profileSaved.
  ///
  /// In en, this message translates to:
  /// **'Profile saved.'**
  String get profileSaved;

  /// No description provided for @profileTeam.
  ///
  /// In en, this message translates to:
  /// **'Yallapp Team'**
  String get profileTeam;

  /// No description provided for @socialFollow.
  ///
  /// In en, this message translates to:
  /// **'Follow'**
  String get socialFollow;

  /// No description provided for @socialFollowingState.
  ///
  /// In en, this message translates to:
  /// **'Following'**
  String get socialFollowingState;

  /// No description provided for @socialFollowsYou.
  ///
  /// In en, this message translates to:
  /// **'Follows you'**
  String get socialFollowsYou;

  /// No description provided for @socialAddFriend.
  ///
  /// In en, this message translates to:
  /// **'Add friend'**
  String get socialAddFriend;

  /// No description provided for @socialRequested.
  ///
  /// In en, this message translates to:
  /// **'Requested'**
  String get socialRequested;

  /// No description provided for @socialAccept.
  ///
  /// In en, this message translates to:
  /// **'Accept'**
  String get socialAccept;

  /// No description provided for @socialDecline.
  ///
  /// In en, this message translates to:
  /// **'Decline'**
  String get socialDecline;

  /// No description provided for @socialFriendsState.
  ///
  /// In en, this message translates to:
  /// **'Friends'**
  String get socialFriendsState;

  /// No description provided for @socialRemoveFriend.
  ///
  /// In en, this message translates to:
  /// **'Remove friend'**
  String get socialRemoveFriend;

  /// No description provided for @socialCancelRequest.
  ///
  /// In en, this message translates to:
  /// **'Cancel request'**
  String get socialCancelRequest;

  /// No description provided for @socialUnfollow.
  ///
  /// In en, this message translates to:
  /// **'Unfollow'**
  String get socialUnfollow;

  /// No description provided for @socialBlock.
  ///
  /// In en, this message translates to:
  /// **'Block'**
  String get socialBlock;

  /// No description provided for @socialUnblock.
  ///
  /// In en, this message translates to:
  /// **'Unblock'**
  String get socialUnblock;

  /// No description provided for @socialBlockConfirm.
  ///
  /// In en, this message translates to:
  /// **'Block {name}? They won’t see your posts or message you, and you won’t see theirs.'**
  String socialBlockConfirm(String name);

  /// No description provided for @socialBlockedNote.
  ///
  /// In en, this message translates to:
  /// **'You blocked this member.'**
  String get socialBlockedNote;

  /// No description provided for @socialReport.
  ///
  /// In en, this message translates to:
  /// **'Report'**
  String get socialReport;

  /// No description provided for @socialReportTitle.
  ///
  /// In en, this message translates to:
  /// **'Why are you reporting this?'**
  String get socialReportTitle;

  /// No description provided for @socialReasonSpam.
  ///
  /// In en, this message translates to:
  /// **'Spam or ads'**
  String get socialReasonSpam;

  /// No description provided for @socialReasonAbuse.
  ///
  /// In en, this message translates to:
  /// **'Harassment or hate'**
  String get socialReasonAbuse;

  /// No description provided for @socialReasonInappropriate.
  ///
  /// In en, this message translates to:
  /// **'Inappropriate content'**
  String get socialReasonInappropriate;

  /// No description provided for @socialReasonMisleading.
  ///
  /// In en, this message translates to:
  /// **'Misleading or a scam'**
  String get socialReasonMisleading;

  /// No description provided for @socialReasonOther.
  ///
  /// In en, this message translates to:
  /// **'Something else'**
  String get socialReasonOther;

  /// No description provided for @socialReportNote.
  ///
  /// In en, this message translates to:
  /// **'Anything to add? (optional)'**
  String get socialReportNote;

  /// No description provided for @socialReportSend.
  ///
  /// In en, this message translates to:
  /// **'Send report'**
  String get socialReportSend;

  /// No description provided for @socialReportSent.
  ///
  /// In en, this message translates to:
  /// **'Thanks. Our moderators will review it.'**
  String get socialReportSent;

  /// No description provided for @socialFriendRequests.
  ///
  /// In en, this message translates to:
  /// **'Friend requests'**
  String get socialFriendRequests;

  /// No description provided for @socialNoRequests.
  ///
  /// In en, this message translates to:
  /// **'No friend requests.'**
  String get socialNoRequests;

  /// No description provided for @socialNoFollowers.
  ///
  /// In en, this message translates to:
  /// **'No followers yet.'**
  String get socialNoFollowers;

  /// No description provided for @socialNoFollowing.
  ///
  /// In en, this message translates to:
  /// **'Not following anyone yet.'**
  String get socialNoFollowing;

  /// No description provided for @socialNoFriends.
  ///
  /// In en, this message translates to:
  /// **'No friends yet.'**
  String get socialNoFriends;

  /// No description provided for @socialMore.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get socialMore;

  /// No description provided for @settingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settingsTitle;

  /// No description provided for @settingsAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get settingsAccount;

  /// No description provided for @settingsAppearance.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get settingsAppearance;

  /// No description provided for @settingsSystem.
  ///
  /// In en, this message translates to:
  /// **'Phone setting'**
  String get settingsSystem;

  /// No description provided for @settingsLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get settingsLight;

  /// No description provided for @settingsDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get settingsDark;

  /// No description provided for @settingsBlocked.
  ///
  /// In en, this message translates to:
  /// **'Blocked members'**
  String get settingsBlocked;

  /// No description provided for @settingsNoBlocked.
  ///
  /// In en, this message translates to:
  /// **'You haven’t blocked anyone.'**
  String get settingsNoBlocked;

  /// No description provided for @settingsYallapp.
  ///
  /// In en, this message translates to:
  /// **'Yallapp account'**
  String get settingsYallapp;

  /// No description provided for @settingsLinked.
  ///
  /// In en, this message translates to:
  /// **'Linked'**
  String get settingsLinked;

  /// No description provided for @settingsNotLinked.
  ///
  /// In en, this message translates to:
  /// **'Not linked'**
  String get settingsNotLinked;

  /// No description provided for @settingsLink.
  ///
  /// In en, this message translates to:
  /// **'Link'**
  String get settingsLink;

  /// No description provided for @settingsUnlink.
  ///
  /// In en, this message translates to:
  /// **'Unlink'**
  String get settingsUnlink;

  /// No description provided for @settingsUnlinkConfirm.
  ///
  /// In en, this message translates to:
  /// **'Unlink your Yallapp account? Your apps leave your profile, and badges that need them go.'**
  String get settingsUnlinkConfirm;

  /// No description provided for @settingsPaidNote.
  ///
  /// In en, this message translates to:
  /// **'Paid items are bought on the website and unlock here when you sign in.'**
  String get settingsPaidNote;

  /// No description provided for @settingsAbout.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get settingsAbout;

  /// No description provided for @settingsVersion.
  ///
  /// In en, this message translates to:
  /// **'Version {version}'**
  String settingsVersion(String version);

  /// No description provided for @settingsLogOutConfirm.
  ///
  /// In en, this message translates to:
  /// **'Log out of Yallapp Community on this phone?'**
  String get settingsLogOutConfirm;

  /// No description provided for @savedEmpty.
  ///
  /// In en, this message translates to:
  /// **'Questions and tutorials you save show here.'**
  String get savedEmpty;

  /// No description provided for @profileApply.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get profileApply;

  /// No description provided for @profileApplyLine.
  ///
  /// In en, this message translates to:
  /// **'You have 5+ apps on Yallapp. Apply for the Pro Developer badge.'**
  String get profileApplyLine;
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
