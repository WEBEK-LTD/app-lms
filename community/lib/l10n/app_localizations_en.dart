// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Yallapp Community';

  @override
  String get commonComingSoon => 'Coming soon';

  @override
  String get commonComingSoonBody =>
      'We’re building this. It arrives in a coming update.';

  @override
  String get commonOk => 'OK';

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonSave => 'Save';

  @override
  String get commonRetry => 'Try again';

  @override
  String get commonClose => 'Close';

  @override
  String get commonBack => 'Back';

  @override
  String get commonSeeAll => 'See all';

  @override
  String get commonError => 'Something went wrong. Try again.';

  @override
  String get commonOffline =>
      'You’re offline. Check your connection and try again.';

  @override
  String get commonEmpty => 'Nothing here yet.';

  @override
  String get langTitle => 'Language';

  @override
  String get langEnglish => 'English';

  @override
  String get langArabic => 'العربية';

  @override
  String get langTurkish => 'Türkçe';

  @override
  String get authHeadline1 => 'Build apps.';

  @override
  String get authHeadline2 => 'Build together.';

  @override
  String get authPitch =>
      'Join 18,000+ app makers. Learn, ask,\nand show what you built.';

  @override
  String get authBubbleNour => 'Launched my store today';

  @override
  String get authBubbleAccepted => 'Answer accepted';

  @override
  String get authBubblePoints => '+25 points';

  @override
  String get authBubbleChallenge => 'Winter challenge';

  @override
  String get authBubbleDays => '4 days left';

  @override
  String get authContinueApple => 'Continue with Apple';

  @override
  String get authContinueGoogle => 'Continue with Google';

  @override
  String get authContinueYallapp => 'Continue with Yallapp';

  @override
  String get authSignUpEmail => 'Sign up with email';

  @override
  String get authAlreadyMember => 'Already a member?';

  @override
  String get authLogIn => 'Log in';

  @override
  String get authSignUpTitle => 'Create your account';

  @override
  String get authSignUpLine =>
      'Learn, ask and show your apps with 18,000+ app makers.';

  @override
  String get authLogInTitle => 'Welcome back';

  @override
  String get authLogInLine => 'Log in to your Community account.';

  @override
  String get authName => 'Your name';

  @override
  String get authEmail => 'Email';

  @override
  String get authPassword => 'Password';

  @override
  String get authCreateAccount => 'Create account';

  @override
  String get authForgot => 'Forgot password?';

  @override
  String get authResetSent =>
      'If that email has an account, a reset link is on its way.';

  @override
  String get authResetTitle => 'Reset your password';

  @override
  String get authSendLink => 'Send reset link';

  @override
  String get authNoAccount => 'New here?';

  @override
  String get authOr => 'or';

  @override
  String get authNameNeeded => 'Enter your name.';

  @override
  String get authEmailInvalid => 'Enter a valid email.';

  @override
  String get authPasswordShort => 'Use at least 8 characters.';

  @override
  String get authTerms =>
      'By continuing you agree to the Community rules and privacy policy.';

  @override
  String get authProviderNotReady =>
      'This sign-in isn’t set up in this build. Use email for now.';

  @override
  String get tabHome => 'Home';

  @override
  String get tabQa => 'Q&A';

  @override
  String get tabCreate => 'Create';

  @override
  String get tabLearn => 'Learn';

  @override
  String get tabGroups => 'Groups';

  @override
  String get headerMenu => 'Menu';

  @override
  String get headerSearch => 'Search';

  @override
  String get headerMessages => 'Messages';

  @override
  String get headerNotifications => 'Notifications';

  @override
  String get headerProfile => 'Your profile';

  @override
  String get homeMorning => 'Good morning';

  @override
  String get homeAfternoon => 'Good afternoon';

  @override
  String get homeEvening => 'Good evening';

  @override
  String get homeRead => 'Read';

  @override
  String get homeJoin => 'Join now';

  @override
  String get homeStartTutorial => 'Start tutorial';

  @override
  String homeAnswers(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count answers',
      one: '1 answer',
    );
    return '$_temp0';
  }

  @override
  String get homeTeam => 'Yallapp Team';

  @override
  String get homeDays => 'days';

  @override
  String get homeHours => 'hrs';

  @override
  String get homeMinutes => 'min';

  @override
  String get homeStoryLive => 'Live Thu';

  @override
  String get homeStoryTutorial => 'New tutorial';

  @override
  String get homeStoryShowcase => 'Showcase';

  @override
  String get homeStoryTip => 'Daily tip';

  @override
  String get homeStoryNews => 'What’s new';

  @override
  String get homeFeedEmpty =>
      'Questions and tutorials from the community show here.';

  @override
  String get menuCommunity => 'Community';

  @override
  String get menuHome => 'Home';

  @override
  String get menuQa => 'Q&A';

  @override
  String get menuTutorials => 'Tutorials';

  @override
  String get menuAcademy => 'Academy';

  @override
  String get menuShowcase => 'Showcase';

  @override
  String get menuChallenges => 'Challenges';

  @override
  String get menuGroups => 'Groups';

  @override
  String get menuFriends => 'Friends';

  @override
  String get menuPros => 'Pros';

  @override
  String get menuEvents => 'Events';

  @override
  String get menuYourGroups => 'Your groups';

  @override
  String get menuGroupsSoon => 'Groups arrive in a coming update.';

  @override
  String get menuLight => 'Light';

  @override
  String get menuDark => 'Dark';

  @override
  String get menuSaved => 'Saved';

  @override
  String get menuSettings => 'Settings';

  @override
  String get menuLogOut => 'Log out';

  @override
  String menuPoints(int points) {
    final intl.NumberFormat pointsNumberFormat =
        intl.NumberFormat.decimalPattern(localeName);
    final String pointsString = pointsNumberFormat.format(points);

    return '$pointsString pts';
  }

  @override
  String get createTitle => 'Create';

  @override
  String get createAsk => 'Ask a question';

  @override
  String get createAskLine =>
      'Get answers from the community and the Yallapp Team.';

  @override
  String get createShowcase => 'Show your app';

  @override
  String get createShowcaseLine => 'Share what you built with Yallapp.';

  @override
  String get createChallenge => 'Join a challenge';

  @override
  String get createChallengeLine => 'Build to a theme and win.';

  @override
  String get profileTitle => 'Profile';

  @override
  String get profileEdit => 'Edit profile';

  @override
  String get profileFollowers => 'Followers';

  @override
  String get profileFollowing => 'Following';

  @override
  String get profileFriends => 'Friends';

  @override
  String get profilePoints => 'Points';

  @override
  String get profileAnswers => 'Answers';

  @override
  String get profileQuestions => 'Questions';

  @override
  String get profileBadges => 'Badges';

  @override
  String get profileNoBadges =>
      'No badges yet. Answer, teach and build to earn them.';

  @override
  String get profileBadgeGold => 'Pro Developer';

  @override
  String get profileBadgeGreen => 'Verified Business';

  @override
  String get profileBadgeBlue => 'Active Member';

  @override
  String get profileSkills => 'Skills';

  @override
  String get profileApps => 'Apps on Yallapp';

  @override
  String get profileNoApps => 'No apps linked yet.';

  @override
  String get profileLinkYallapp => 'Link your Yallapp account';

  @override
  String get profileLinkLine =>
      'Show the apps you made and qualify for badges.';

  @override
  String get profileLinkOpened =>
      'Confirm the link on the page that opened, then come back.';

  @override
  String profileJoined(String date) {
    return 'Joined $date';
  }

  @override
  String get profileBio => 'Bio';

  @override
  String get profileName => 'Name';

  @override
  String get profileUsername => 'Username';

  @override
  String get profileAddSkill => 'Add a skill';

  @override
  String get profileChangePhoto => 'Change photo';

  @override
  String get profileSaved => 'Profile saved.';

  @override
  String get profileTeam => 'Yallapp Team';

  @override
  String get socialFollow => 'Follow';

  @override
  String get socialFollowingState => 'Following';

  @override
  String get socialFollowsYou => 'Follows you';

  @override
  String get socialAddFriend => 'Add friend';

  @override
  String get socialRequested => 'Requested';

  @override
  String get socialAccept => 'Accept';

  @override
  String get socialDecline => 'Decline';

  @override
  String get socialFriendsState => 'Friends';

  @override
  String get socialRemoveFriend => 'Remove friend';

  @override
  String get socialCancelRequest => 'Cancel request';

  @override
  String get socialUnfollow => 'Unfollow';

  @override
  String get socialBlock => 'Block';

  @override
  String get socialUnblock => 'Unblock';

  @override
  String socialBlockConfirm(String name) {
    return 'Block $name? They won’t see your posts or message you, and you won’t see theirs.';
  }

  @override
  String get socialBlockedNote => 'You blocked this member.';

  @override
  String get socialReport => 'Report';

  @override
  String get socialReportTitle => 'Why are you reporting this?';

  @override
  String get socialReasonSpam => 'Spam or ads';

  @override
  String get socialReasonHarassment => 'Harassment or bullying';

  @override
  String get socialReasonHate => 'Hate speech';

  @override
  String get socialReasonMisinformation => 'False information';

  @override
  String get socialReasonImpersonation => 'Pretending to be someone else';

  @override
  String get socialReasonInappropriate => 'Inappropriate content';

  @override
  String get socialReasonOther => 'Something else';

  @override
  String get socialReportNote => 'Anything to add? (optional)';

  @override
  String get socialReportSend => 'Send report';

  @override
  String get socialReportSent => 'Thanks. Our moderators will review it.';

  @override
  String get socialFriendRequests => 'Friend requests';

  @override
  String get socialNoRequests => 'No friend requests.';

  @override
  String get socialNoFollowers => 'No followers yet.';

  @override
  String get socialNoFollowing => 'Not following anyone yet.';

  @override
  String get socialNoFriends => 'No friends yet.';

  @override
  String get socialMore => 'More';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get settingsAccount => 'Account';

  @override
  String get settingsAppearance => 'Appearance';

  @override
  String get settingsSystem => 'Phone setting';

  @override
  String get settingsLight => 'Light';

  @override
  String get settingsDark => 'Dark';

  @override
  String get settingsBlocked => 'Blocked members';

  @override
  String get settingsNoBlocked => 'You haven’t blocked anyone.';

  @override
  String get settingsYallapp => 'Yallapp account';

  @override
  String get settingsLinked => 'Linked';

  @override
  String get settingsNotLinked => 'Not linked';

  @override
  String get settingsLink => 'Link';

  @override
  String get settingsUnlink => 'Unlink';

  @override
  String get settingsUnlinkConfirm =>
      'Unlink your Yallapp account? Your apps leave your profile, and badges that need them go.';

  @override
  String get linkSuggestTitle => 'We found your Yallapp account. Link it?';

  @override
  String linkSuggestNamed(String name) {
    return 'We found your Yallapp account, $name. Link it?';
  }

  @override
  String get linkSuggestLine => 'Your apps will show on your profile.';

  @override
  String get linkSuggestLink => 'Link';

  @override
  String get linkSuggestDismiss => 'Dismiss';

  @override
  String get linkSuggestDone => 'Linked to Yallapp.';

  @override
  String get settingsAbout => 'About';

  @override
  String get settingsPrivacy => 'Privacy policy';

  @override
  String settingsVersion(String version) {
    return 'Version $version';
  }

  @override
  String get settingsLogOutConfirm =>
      'Log out of Yallapp Community on this phone?';

  @override
  String get savedEmpty => 'Questions and tutorials you save show here.';

  @override
  String get profileApply => 'Apply';

  @override
  String get profileApplyLine =>
      'You have 5+ apps on Yallapp. Apply for the Pro Developer badge.';

  @override
  String get commonShowMore => 'Show more';

  @override
  String get settingsEmail => 'Email';

  @override
  String get settingsEmailUnconfirmed => 'Not confirmed';

  @override
  String get settingsResend => 'Send the link again';

  @override
  String get settingsResent => 'Sent. Check your inbox.';

  @override
  String get settingsDeleteAccount => 'Delete account';

  @override
  String get settingsDeleteLine =>
      'This deletes your profile, follows and friends at once. Your questions and answers stay, shown as from “Deleted member”.';

  @override
  String get settingsDeletePassword => 'Your password';

  @override
  String get settingsDeleteConfirm => 'Delete my account';

  @override
  String get openingTag => 'Build apps. Build together.';

  @override
  String get socialReasonMisleading => 'Misleading or a scam';

  @override
  String get qaTitle => 'Q&A';

  @override
  String get qaAskQuestion => 'Ask a question';

  @override
  String qaViews(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count views',
      one: '1 view',
    );
    return '$_temp0';
  }

  @override
  String qaAnswerCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count answers',
      one: '1 answer',
      zero: 'No answers',
    );
    return '$_temp0';
  }

  @override
  String qaReplyCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count replies',
      one: '1 reply',
      zero: 'Reply',
    );
    return '$_temp0';
  }

  @override
  String get qaAccepted => 'Accepted';

  @override
  String get qaOfficial => 'Official';

  @override
  String get qaJustNow => 'now';

  @override
  String qaMinutes(int count) {
    return '${count}m';
  }

  @override
  String qaHours(int count) {
    return '${count}h';
  }

  @override
  String qaDays(int count) {
    return '${count}d';
  }

  @override
  String qaAgo(String time) {
    return '$time ago';
  }

  @override
  String get qaSave => 'Save';

  @override
  String get qaSaved => 'Saved';

  @override
  String get qaVoteUp => 'Vote up';

  @override
  String get qaVoteDown => 'Vote down';

  @override
  String get qaAccept => 'Accept this answer';

  @override
  String get qaUnaccept => 'Undo accept';

  @override
  String get qaWriteAnswer => 'Write an answer';

  @override
  String get qaAnswerHint => 'Share what worked for you…';

  @override
  String get qaPost => 'Post';

  @override
  String get qaReplyHint => 'Write a reply…';

  @override
  String get qaPending =>
      'Waiting for review. It shows to others once a moderator approves it.';

  @override
  String qaTooShort(int count) {
    return 'Write at least $count characters.';
  }

  @override
  String get qaOwnVote => 'You can’t vote on your own post.';

  @override
  String get qaReport => 'Report';

  @override
  String get qaRankNewcomer => 'Newcomer';

  @override
  String get qaRankMember => 'Member';

  @override
  String get qaRankContributor => 'Contributor';

  @override
  String get qaRankExpert => 'Expert';

  @override
  String get qaRankPro => 'Pro';

  @override
  String get qaFilterAll => 'All';

  @override
  String get qaFilterUnanswered => 'Unanswered';

  @override
  String get qaFilterAnswered => 'Answered';

  @override
  String get qaFilterOfficial => 'Official answers';

  @override
  String get qaFilterFollowing => 'Following';

  @override
  String get qaSortActive => 'Active';

  @override
  String get qaSortNewest => 'Newest';

  @override
  String get qaSortVotes => 'Most votes';

  @override
  String get qaEmpty => 'No questions here yet. Be the first to ask.';

  @override
  String get qaAskTitleLabel => 'Your question';

  @override
  String get qaAskTitleHint => 'How do I…';

  @override
  String get qaAskBodyLabel => 'Details';

  @override
  String get qaAskBodyHint =>
      'What are you trying to do, and what have you tried?';

  @override
  String get qaAskSection => 'Section';

  @override
  String get qaAskTags => 'Tags (up to 5)';

  @override
  String get qaAskLanguage => 'Language';

  @override
  String get qaSimilarTitle => 'Already asked?';

  @override
  String get qaSimilarBody =>
      'These look like yours. One may already have your answer.';

  @override
  String get qaAskSend => 'Post question';

  @override
  String get qaSearchHint => 'Search questions and tutorials';

  @override
  String qaSearchEmpty(String query) {
    return 'Nothing matches “$query”.';
  }

  @override
  String get qaSearchQuestions => 'Questions';

  @override
  String get qaSearchTutorials => 'Tutorials';

  @override
  String get tutTitle => 'Learn';

  @override
  String get tutSubtitle => 'Official tutorials from the Yallapp team';

  @override
  String get tutArticle => 'Article';

  @override
  String get tutVideo => 'Video';

  @override
  String get tutAllKinds => 'All';

  @override
  String get tutLevelBeginner => 'Beginner';

  @override
  String get tutLevelIntermediate => 'Intermediate';

  @override
  String get tutLevelAdvanced => 'Advanced';

  @override
  String get tutAnyLevel => 'Any level';

  @override
  String get tutAnyLanguage => 'Any language';

  @override
  String tutMinRead(int count) {
    return '$count min read';
  }

  @override
  String get tutWatch => 'Watch the video';

  @override
  String get tutOfficial => 'Official';

  @override
  String get tutEmpty => 'No tutorials here yet.';

  @override
  String get tutCannotOpen => 'The video could not be opened.';

  @override
  String get verifyTitle => 'Pro Developer';

  @override
  String get verifyIntro =>
      'The gold badge for members who have built 5 or more apps with Yallapp. Studio Market templates count.';

  @override
  String get verifyNotLinked =>
      'Link your Yallapp account first. Your apps come from it, so only your own apps count.';

  @override
  String get verifyLink => 'Link my Yallapp account';

  @override
  String verifyProgress(int count, int needed) {
    return '$count of $needed apps';
  }

  @override
  String verifyNeedMore(int needed) {
    return 'You can apply once your Yallapp account has $needed apps.';
  }

  @override
  String get verifyHasGold =>
      'You’re a Pro Developer. The gold badge shows beside your name.';

  @override
  String get verifyPending =>
      'We’re reviewing your request. We’ll let you know either way.';

  @override
  String verifySentOn(String date) {
    return 'Sent on $date';
  }

  @override
  String get verifyRejected => 'Your last request wasn’t approved.';

  @override
  String verifyReason(String reason) {
    return 'Reason: $reason';
  }

  @override
  String get verifyFullName => 'Full name (as on your ID)';

  @override
  String get verifyIdProof => 'ID proof';

  @override
  String get verifyIdProofHint =>
      'A photo of your ID card or passport. Only the team reviewing your request sees it.';

  @override
  String get verifyPickId => 'Choose a photo';

  @override
  String get verifyChangeId => 'Change';

  @override
  String get verifyPortfolio => 'Portfolio links (up to 5)';

  @override
  String get verifyAddLink => 'Add a link';

  @override
  String get verifyApps => 'Your apps';

  @override
  String get verifyAppsFrom => 'From your linked Yallapp account';

  @override
  String get verifyTemplate => 'Template';

  @override
  String get verifySend => 'Send my request';

  @override
  String get verifyNameNeeded => 'Write your full name.';

  @override
  String get verifyIdNeeded => 'Add a photo of your ID.';

  @override
  String get verifyBadLink => 'Links start with https://';

  @override
  String get verifySent => 'Sent. We’ll let you know when it’s reviewed.';

  @override
  String get notifTitle => 'Notifications';

  @override
  String get notifMarkAll => 'Mark all read';

  @override
  String get notifEmpty =>
      'Nothing new. Answers, follows and badges show here.';

  @override
  String get notifUnread => 'Unread';

  @override
  String get notifAll => 'All';

  @override
  String get notifEmail => 'Email me about';

  @override
  String get notifEmailBody =>
      'Notifications always show here. Choose which also come by email.';

  @override
  String get notifKindAnswer => 'Answers to my questions';

  @override
  String get notifKindAccepted => 'My answer accepted';

  @override
  String get notifKindOfficial => 'Official answers';

  @override
  String get notifKindFriend => 'Friend requests';

  @override
  String get notifKindFollow => 'New followers';

  @override
  String get notifKindBadge => 'Badges';

  @override
  String get notifKindVerification => 'My verification request';

  @override
  String get notifKindOther => 'Other';

  @override
  String get qaSearchMembers => 'Members';

  @override
  String get qaSearchTags => 'Tags';

  @override
  String get qaAcceptShort => 'Accept';

  @override
  String get feedForYou => 'For you';

  @override
  String get feedLatest => 'Latest';

  @override
  String get feedFollowing => 'Following';

  @override
  String get feedFollowingEmpty =>
      'Posts from the members you follow show here.';

  @override
  String get postTitle => 'Post';

  @override
  String get postNew => 'New post';

  @override
  String get postHint => 'Share something with the community';

  @override
  String get postPublish => 'Post';

  @override
  String postPhotos(int n, int max) {
    return 'Photos $n/$max';
  }

  @override
  String get postVideo => 'Video';

  @override
  String get postPickPoster => 'Choose a cover photo';

  @override
  String get postVideoReady => 'Video and cover ready';

  @override
  String get postPending => 'Waiting for review';

  @override
  String get postMore => 'More';

  @override
  String get postLike => 'Like';

  @override
  String get postComments => 'Comments';

  @override
  String get postShare => 'Share';

  @override
  String get postSave => 'Save';

  @override
  String get postDelete => 'Delete';

  @override
  String get postDeleteConfirm => 'Delete this post?';

  @override
  String get postReport => 'Report';

  @override
  String get postLinkCopied => 'Link copied';

  @override
  String get postNoComments => 'No comments yet. Be the first.';

  @override
  String get postReply => 'Reply';

  @override
  String postReplyingTo(String name) {
    return 'Replying to $name';
  }

  @override
  String get postCommentHint => 'Write a comment';

  @override
  String get postSend => 'Send';

  @override
  String get postSaved => 'Saved posts';

  @override
  String get createPost => 'Write a post';

  @override
  String get createPostLine => 'Words, up to 10 photos or a video';

  @override
  String get createStory => 'Add a story';

  @override
  String get createStoryLine => 'A photo or short video for 24 hours';

  @override
  String get storyYours => 'Your story';

  @override
  String get storyAddPhoto => 'Photo';

  @override
  String get storyAddVideo => 'Short video';

  @override
  String get storyAdded => 'Your story is up for 24 hours';

  @override
  String storyViews(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n views',
      one: '1 view',
    );
    return '$_temp0';
  }

  @override
  String get postSavedEmpty => 'Posts you save show here.';

  @override
  String get msgNew => 'New message';

  @override
  String get msgEmpty =>
      'No conversations yet. Write to a member from their profile, or start one here.';

  @override
  String get msgDeleted => 'Message deleted';

  @override
  String get msgPhoto => 'Photo';

  @override
  String get msgStart => 'Start';

  @override
  String get msgGroupTitle => 'Group name (optional)';

  @override
  String msgPickPeople(int n, int max) {
    return 'Chosen $n of $max';
  }

  @override
  String get msgNotAllowed => 'You can\'t message this member.';

  @override
  String get msgHint => 'Message';

  @override
  String get msgSeen => 'Seen';

  @override
  String get msgMute => 'Mute notifications';

  @override
  String get msgUnmute => 'Turn notifications on';

  @override
  String get msgRename => 'Rename the group';

  @override
  String get msgReport => 'Report the conversation';

  @override
  String get msgLeave => 'Leave the group';

  @override
  String get msgHide => 'Hide the conversation';

  @override
  String get msgBlocked => 'You can\'t reply to this conversation.';

  @override
  String get msgMessage => 'Message';

  @override
  String get groupCreate => 'New group';

  @override
  String get groupDiscover => 'Discover';

  @override
  String get groupNoneYet => 'You haven\'t joined a group yet.';

  @override
  String get groupAll => 'All groups';

  @override
  String groupMembers(int n) {
    String _temp0 = intl.Intl.pluralLogic(
      n,
      locale: localeName,
      other: '$n members',
      one: '1 member',
    );
    return '$_temp0';
  }

  @override
  String get groupMembersTitle => 'Members';

  @override
  String get groupName => 'Name';

  @override
  String get groupAbout => 'What the group is about';

  @override
  String get groupPrivate => 'Private';

  @override
  String get groupPublic => 'Public';

  @override
  String get groupPrivateLine =>
      'Members join by request; only they see its posts.';

  @override
  String get groupPublicLine => 'Anyone can join and read it.';

  @override
  String get groupCreateNotAllowed =>
      'Creating groups isn\'t open to your account yet.';

  @override
  String get groupJoin => 'Join';

  @override
  String get groupAskToJoin => 'Ask to join';

  @override
  String get groupRequested => 'Requested';

  @override
  String get groupLeave => 'Leave';

  @override
  String get groupOwnerMustTransfer =>
      'Hand the group over to another member before you leave.';

  @override
  String get groupWrite => 'Write in the group';

  @override
  String get groupJoinToRead =>
      'This group is private. Join to read its posts.';

  @override
  String get groupNoPosts => 'No posts yet.';

  @override
  String get groupCover => 'Change the cover';

  @override
  String get groupRequests => 'Requests to join';

  @override
  String get groupDecline => 'Decline';

  @override
  String get groupOwner => 'Owner';

  @override
  String get groupModerator => 'Moderator';

  @override
  String get groupMakeModerator => 'Make moderator';

  @override
  String get groupMakeMember => 'Make a member again';

  @override
  String get groupHandOver => 'Hand the group over';

  @override
  String get groupRemove => 'Remove from the group';

  @override
  String get pushTitle => 'Push notifications';

  @override
  String get pushBody =>
      'Choose what reaches your phone. The app\'s list and your email choices stay as they are.';

  @override
  String get pushOpen => 'Open';

  @override
  String get pushKindMessage => 'Messages';

  @override
  String get pushKindComment => 'Comments on my posts';

  @override
  String get pushKindReply => 'Replies to my comments';

  @override
  String get pushKindLike => 'Likes on my posts';

  @override
  String get pushKindGroup => 'Group requests and invitations';
}
