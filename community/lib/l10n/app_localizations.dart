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

  /// No description provided for @commonLockedIos.
  ///
  /// In en, this message translates to:
  /// **'Locked'**
  String get commonLockedIos;

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

  /// No description provided for @homeStartTutorial.
  ///
  /// In en, this message translates to:
  /// **'Start tutorial'**
  String get homeStartTutorial;

  /// No description provided for @homeAnswers.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 answer} other{{count} answers}}'**
  String homeAnswers(int count);

  /// No description provided for @homeTeam.
  ///
  /// In en, this message translates to:
  /// **'Yallapp Team'**
  String get homeTeam;

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

  /// No description provided for @socialReasonHarassment.
  ///
  /// In en, this message translates to:
  /// **'Harassment or bullying'**
  String get socialReasonHarassment;

  /// No description provided for @socialReasonHate.
  ///
  /// In en, this message translates to:
  /// **'Hate speech'**
  String get socialReasonHate;

  /// No description provided for @socialReasonMisinformation.
  ///
  /// In en, this message translates to:
  /// **'False information'**
  String get socialReasonMisinformation;

  /// No description provided for @socialReasonImpersonation.
  ///
  /// In en, this message translates to:
  /// **'Pretending to be someone else'**
  String get socialReasonImpersonation;

  /// No description provided for @socialReasonInappropriate.
  ///
  /// In en, this message translates to:
  /// **'Inappropriate content'**
  String get socialReasonInappropriate;

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

  /// No description provided for @commonShowMore.
  ///
  /// In en, this message translates to:
  /// **'Show more'**
  String get commonShowMore;

  /// No description provided for @settingsEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get settingsEmail;

  /// No description provided for @settingsEmailUnconfirmed.
  ///
  /// In en, this message translates to:
  /// **'Not confirmed'**
  String get settingsEmailUnconfirmed;

  /// No description provided for @settingsResend.
  ///
  /// In en, this message translates to:
  /// **'Send the link again'**
  String get settingsResend;

  /// No description provided for @settingsResent.
  ///
  /// In en, this message translates to:
  /// **'Sent. Check your inbox.'**
  String get settingsResent;

  /// No description provided for @settingsDeleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete account'**
  String get settingsDeleteAccount;

  /// No description provided for @settingsDeleteLine.
  ///
  /// In en, this message translates to:
  /// **'This deletes your profile, follows and friends at once. Your questions and answers stay, shown as from “Deleted member”.'**
  String get settingsDeleteLine;

  /// No description provided for @settingsDeletePassword.
  ///
  /// In en, this message translates to:
  /// **'Your password'**
  String get settingsDeletePassword;

  /// No description provided for @settingsDeleteConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete my account'**
  String get settingsDeleteConfirm;

  /// No description provided for @openingTag.
  ///
  /// In en, this message translates to:
  /// **'Build apps. Build together.'**
  String get openingTag;

  /// No description provided for @socialReasonMisleading.
  ///
  /// In en, this message translates to:
  /// **'Misleading or a scam'**
  String get socialReasonMisleading;

  /// No description provided for @qaTitle.
  ///
  /// In en, this message translates to:
  /// **'Q&A'**
  String get qaTitle;

  /// No description provided for @qaAskQuestion.
  ///
  /// In en, this message translates to:
  /// **'Ask a question'**
  String get qaAskQuestion;

  /// No description provided for @qaViews.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 view} other{{count} views}}'**
  String qaViews(int count);

  /// No description provided for @qaAnswerCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No answers} =1{1 answer} other{{count} answers}}'**
  String qaAnswerCount(int count);

  /// No description provided for @qaReplyCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Reply} =1{1 reply} other{{count} replies}}'**
  String qaReplyCount(int count);

  /// No description provided for @qaAccepted.
  ///
  /// In en, this message translates to:
  /// **'Accepted'**
  String get qaAccepted;

  /// No description provided for @qaOfficial.
  ///
  /// In en, this message translates to:
  /// **'Official'**
  String get qaOfficial;

  /// No description provided for @qaJustNow.
  ///
  /// In en, this message translates to:
  /// **'now'**
  String get qaJustNow;

  /// No description provided for @qaMinutes.
  ///
  /// In en, this message translates to:
  /// **'{count}m'**
  String qaMinutes(int count);

  /// No description provided for @qaHours.
  ///
  /// In en, this message translates to:
  /// **'{count}h'**
  String qaHours(int count);

  /// No description provided for @qaDays.
  ///
  /// In en, this message translates to:
  /// **'{count}d'**
  String qaDays(int count);

  /// No description provided for @qaAgo.
  ///
  /// In en, this message translates to:
  /// **'{time} ago'**
  String qaAgo(String time);

  /// No description provided for @qaSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get qaSave;

  /// No description provided for @qaSaved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get qaSaved;

  /// No description provided for @qaVoteUp.
  ///
  /// In en, this message translates to:
  /// **'Vote up'**
  String get qaVoteUp;

  /// No description provided for @qaVoteDown.
  ///
  /// In en, this message translates to:
  /// **'Vote down'**
  String get qaVoteDown;

  /// No description provided for @qaAccept.
  ///
  /// In en, this message translates to:
  /// **'Accept this answer'**
  String get qaAccept;

  /// No description provided for @qaUnaccept.
  ///
  /// In en, this message translates to:
  /// **'Undo accept'**
  String get qaUnaccept;

  /// No description provided for @qaWriteAnswer.
  ///
  /// In en, this message translates to:
  /// **'Write an answer'**
  String get qaWriteAnswer;

  /// No description provided for @qaAnswerHint.
  ///
  /// In en, this message translates to:
  /// **'Share what worked for you…'**
  String get qaAnswerHint;

  /// No description provided for @qaPost.
  ///
  /// In en, this message translates to:
  /// **'Post'**
  String get qaPost;

  /// No description provided for @qaReplyHint.
  ///
  /// In en, this message translates to:
  /// **'Write a reply…'**
  String get qaReplyHint;

  /// No description provided for @qaPending.
  ///
  /// In en, this message translates to:
  /// **'Waiting for review. It shows to others once a moderator approves it.'**
  String get qaPending;

  /// No description provided for @qaTooShort.
  ///
  /// In en, this message translates to:
  /// **'Write at least {count} characters.'**
  String qaTooShort(int count);

  /// No description provided for @qaOwnVote.
  ///
  /// In en, this message translates to:
  /// **'You can’t vote on your own post.'**
  String get qaOwnVote;

  /// No description provided for @qaReport.
  ///
  /// In en, this message translates to:
  /// **'Report'**
  String get qaReport;

  /// No description provided for @qaRankNewcomer.
  ///
  /// In en, this message translates to:
  /// **'Newcomer'**
  String get qaRankNewcomer;

  /// No description provided for @qaRankMember.
  ///
  /// In en, this message translates to:
  /// **'Member'**
  String get qaRankMember;

  /// No description provided for @qaRankContributor.
  ///
  /// In en, this message translates to:
  /// **'Contributor'**
  String get qaRankContributor;

  /// No description provided for @qaRankExpert.
  ///
  /// In en, this message translates to:
  /// **'Expert'**
  String get qaRankExpert;

  /// No description provided for @qaRankPro.
  ///
  /// In en, this message translates to:
  /// **'Pro'**
  String get qaRankPro;

  /// No description provided for @qaFilterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get qaFilterAll;

  /// No description provided for @qaFilterUnanswered.
  ///
  /// In en, this message translates to:
  /// **'Unanswered'**
  String get qaFilterUnanswered;

  /// No description provided for @qaFilterAnswered.
  ///
  /// In en, this message translates to:
  /// **'Answered'**
  String get qaFilterAnswered;

  /// No description provided for @qaFilterOfficial.
  ///
  /// In en, this message translates to:
  /// **'Official answers'**
  String get qaFilterOfficial;

  /// No description provided for @qaFilterFollowing.
  ///
  /// In en, this message translates to:
  /// **'Following'**
  String get qaFilterFollowing;

  /// No description provided for @qaSortActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get qaSortActive;

  /// No description provided for @qaSortNewest.
  ///
  /// In en, this message translates to:
  /// **'Newest'**
  String get qaSortNewest;

  /// No description provided for @qaSortVotes.
  ///
  /// In en, this message translates to:
  /// **'Most votes'**
  String get qaSortVotes;

  /// No description provided for @qaEmpty.
  ///
  /// In en, this message translates to:
  /// **'No questions here yet. Be the first to ask.'**
  String get qaEmpty;

  /// No description provided for @qaAskTitleLabel.
  ///
  /// In en, this message translates to:
  /// **'Your question'**
  String get qaAskTitleLabel;

  /// No description provided for @qaAskTitleHint.
  ///
  /// In en, this message translates to:
  /// **'How do I…'**
  String get qaAskTitleHint;

  /// No description provided for @qaAskBodyLabel.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get qaAskBodyLabel;

  /// No description provided for @qaAskBodyHint.
  ///
  /// In en, this message translates to:
  /// **'What are you trying to do, and what have you tried?'**
  String get qaAskBodyHint;

  /// No description provided for @qaAskSection.
  ///
  /// In en, this message translates to:
  /// **'Section'**
  String get qaAskSection;

  /// No description provided for @qaAskTags.
  ///
  /// In en, this message translates to:
  /// **'Tags (up to 5)'**
  String get qaAskTags;

  /// No description provided for @qaAskLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get qaAskLanguage;

  /// No description provided for @qaSimilarTitle.
  ///
  /// In en, this message translates to:
  /// **'Already asked?'**
  String get qaSimilarTitle;

  /// No description provided for @qaSimilarBody.
  ///
  /// In en, this message translates to:
  /// **'These look like yours. One may already have your answer.'**
  String get qaSimilarBody;

  /// No description provided for @qaAskSend.
  ///
  /// In en, this message translates to:
  /// **'Post question'**
  String get qaAskSend;

  /// No description provided for @qaSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search questions and tutorials'**
  String get qaSearchHint;

  /// No description provided for @qaSearchEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing matches “{query}”.'**
  String qaSearchEmpty(String query);

  /// No description provided for @qaSearchQuestions.
  ///
  /// In en, this message translates to:
  /// **'Questions'**
  String get qaSearchQuestions;

  /// No description provided for @qaSearchTutorials.
  ///
  /// In en, this message translates to:
  /// **'Tutorials'**
  String get qaSearchTutorials;

  /// No description provided for @tutTitle.
  ///
  /// In en, this message translates to:
  /// **'Learn'**
  String get tutTitle;

  /// No description provided for @tutSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Official tutorials from the Yallapp team'**
  String get tutSubtitle;

  /// No description provided for @tutArticle.
  ///
  /// In en, this message translates to:
  /// **'Article'**
  String get tutArticle;

  /// No description provided for @tutVideo.
  ///
  /// In en, this message translates to:
  /// **'Video'**
  String get tutVideo;

  /// No description provided for @tutAllKinds.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get tutAllKinds;

  /// No description provided for @tutLevelBeginner.
  ///
  /// In en, this message translates to:
  /// **'Beginner'**
  String get tutLevelBeginner;

  /// No description provided for @tutLevelIntermediate.
  ///
  /// In en, this message translates to:
  /// **'Intermediate'**
  String get tutLevelIntermediate;

  /// No description provided for @tutLevelAdvanced.
  ///
  /// In en, this message translates to:
  /// **'Advanced'**
  String get tutLevelAdvanced;

  /// No description provided for @tutAnyLevel.
  ///
  /// In en, this message translates to:
  /// **'Any level'**
  String get tutAnyLevel;

  /// No description provided for @tutAnyLanguage.
  ///
  /// In en, this message translates to:
  /// **'Any language'**
  String get tutAnyLanguage;

  /// No description provided for @tutMinRead.
  ///
  /// In en, this message translates to:
  /// **'{count} min read'**
  String tutMinRead(int count);

  /// No description provided for @tutWatch.
  ///
  /// In en, this message translates to:
  /// **'Watch the video'**
  String get tutWatch;

  /// No description provided for @tutOfficial.
  ///
  /// In en, this message translates to:
  /// **'Official'**
  String get tutOfficial;

  /// No description provided for @tutLocked.
  ///
  /// In en, this message translates to:
  /// **'Unlocks on the account that has it'**
  String get tutLocked;

  /// No description provided for @tutLockedBody.
  ///
  /// In en, this message translates to:
  /// **'This tutorial opens when you sign in with the account that has it.'**
  String get tutLockedBody;

  /// No description provided for @tutEmpty.
  ///
  /// In en, this message translates to:
  /// **'No tutorials here yet.'**
  String get tutEmpty;

  /// No description provided for @tutCannotOpen.
  ///
  /// In en, this message translates to:
  /// **'The video could not be opened.'**
  String get tutCannotOpen;

  /// No description provided for @verifyTitle.
  ///
  /// In en, this message translates to:
  /// **'Pro Developer'**
  String get verifyTitle;

  /// No description provided for @verifyIntro.
  ///
  /// In en, this message translates to:
  /// **'The gold badge for members who have built 5 or more apps with Yallapp. Studio Market templates count.'**
  String get verifyIntro;

  /// No description provided for @verifyNotLinked.
  ///
  /// In en, this message translates to:
  /// **'Link your Yallapp account first. Your apps come from it, so only your own apps count.'**
  String get verifyNotLinked;

  /// No description provided for @verifyLink.
  ///
  /// In en, this message translates to:
  /// **'Link my Yallapp account'**
  String get verifyLink;

  /// No description provided for @verifyProgress.
  ///
  /// In en, this message translates to:
  /// **'{count} of {needed} apps'**
  String verifyProgress(int count, int needed);

  /// No description provided for @verifyNeedMore.
  ///
  /// In en, this message translates to:
  /// **'You can apply once your Yallapp account has {needed} apps.'**
  String verifyNeedMore(int needed);

  /// No description provided for @verifyHasGold.
  ///
  /// In en, this message translates to:
  /// **'You’re a Pro Developer. The gold badge shows beside your name.'**
  String get verifyHasGold;

  /// No description provided for @verifyPending.
  ///
  /// In en, this message translates to:
  /// **'We’re reviewing your request. We’ll let you know either way.'**
  String get verifyPending;

  /// No description provided for @verifySentOn.
  ///
  /// In en, this message translates to:
  /// **'Sent on {date}'**
  String verifySentOn(String date);

  /// No description provided for @verifyRejected.
  ///
  /// In en, this message translates to:
  /// **'Your last request wasn’t approved.'**
  String get verifyRejected;

  /// No description provided for @verifyReason.
  ///
  /// In en, this message translates to:
  /// **'Reason: {reason}'**
  String verifyReason(String reason);

  /// No description provided for @verifyFullName.
  ///
  /// In en, this message translates to:
  /// **'Full name (as on your ID)'**
  String get verifyFullName;

  /// No description provided for @verifyIdProof.
  ///
  /// In en, this message translates to:
  /// **'ID proof'**
  String get verifyIdProof;

  /// No description provided for @verifyIdProofHint.
  ///
  /// In en, this message translates to:
  /// **'A photo of your ID card or passport. Only the team reviewing your request sees it.'**
  String get verifyIdProofHint;

  /// No description provided for @verifyPickId.
  ///
  /// In en, this message translates to:
  /// **'Choose a photo'**
  String get verifyPickId;

  /// No description provided for @verifyChangeId.
  ///
  /// In en, this message translates to:
  /// **'Change'**
  String get verifyChangeId;

  /// No description provided for @verifyPortfolio.
  ///
  /// In en, this message translates to:
  /// **'Portfolio links (up to 5)'**
  String get verifyPortfolio;

  /// No description provided for @verifyAddLink.
  ///
  /// In en, this message translates to:
  /// **'Add a link'**
  String get verifyAddLink;

  /// No description provided for @verifyApps.
  ///
  /// In en, this message translates to:
  /// **'Your apps'**
  String get verifyApps;

  /// No description provided for @verifyAppsFrom.
  ///
  /// In en, this message translates to:
  /// **'From your linked Yallapp account'**
  String get verifyAppsFrom;

  /// No description provided for @verifyTemplate.
  ///
  /// In en, this message translates to:
  /// **'Template'**
  String get verifyTemplate;

  /// No description provided for @verifySend.
  ///
  /// In en, this message translates to:
  /// **'Send my request'**
  String get verifySend;

  /// No description provided for @verifyNameNeeded.
  ///
  /// In en, this message translates to:
  /// **'Write your full name.'**
  String get verifyNameNeeded;

  /// No description provided for @verifyIdNeeded.
  ///
  /// In en, this message translates to:
  /// **'Add a photo of your ID.'**
  String get verifyIdNeeded;

  /// No description provided for @verifyBadLink.
  ///
  /// In en, this message translates to:
  /// **'Links start with https://'**
  String get verifyBadLink;

  /// No description provided for @verifySent.
  ///
  /// In en, this message translates to:
  /// **'Sent. We’ll let you know when it’s reviewed.'**
  String get verifySent;

  /// No description provided for @notifTitle.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifTitle;

  /// No description provided for @notifMarkAll.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get notifMarkAll;

  /// No description provided for @notifEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing new. Answers, follows and badges show here.'**
  String get notifEmpty;

  /// No description provided for @notifUnread.
  ///
  /// In en, this message translates to:
  /// **'Unread'**
  String get notifUnread;

  /// No description provided for @notifAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get notifAll;

  /// No description provided for @notifEmail.
  ///
  /// In en, this message translates to:
  /// **'Email me about'**
  String get notifEmail;

  /// No description provided for @notifEmailBody.
  ///
  /// In en, this message translates to:
  /// **'Notifications always show here. Choose which also come by email.'**
  String get notifEmailBody;

  /// No description provided for @notifKindAnswer.
  ///
  /// In en, this message translates to:
  /// **'Answers to my questions'**
  String get notifKindAnswer;

  /// No description provided for @notifKindAccepted.
  ///
  /// In en, this message translates to:
  /// **'My answer accepted'**
  String get notifKindAccepted;

  /// No description provided for @notifKindOfficial.
  ///
  /// In en, this message translates to:
  /// **'Official answers'**
  String get notifKindOfficial;

  /// No description provided for @notifKindFriend.
  ///
  /// In en, this message translates to:
  /// **'Friend requests'**
  String get notifKindFriend;

  /// No description provided for @notifKindFollow.
  ///
  /// In en, this message translates to:
  /// **'New followers'**
  String get notifKindFollow;

  /// No description provided for @notifKindBadge.
  ///
  /// In en, this message translates to:
  /// **'Badges'**
  String get notifKindBadge;

  /// No description provided for @notifKindVerification.
  ///
  /// In en, this message translates to:
  /// **'My verification request'**
  String get notifKindVerification;

  /// No description provided for @notifKindOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get notifKindOther;

  /// No description provided for @qaSearchMembers.
  ///
  /// In en, this message translates to:
  /// **'Members'**
  String get qaSearchMembers;

  /// No description provided for @qaSearchTags.
  ///
  /// In en, this message translates to:
  /// **'Tags'**
  String get qaSearchTags;

  /// No description provided for @qaAcceptShort.
  ///
  /// In en, this message translates to:
  /// **'Accept'**
  String get qaAcceptShort;
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
