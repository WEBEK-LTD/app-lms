# Yallapp Community: notes for the app reviewers (draft)

Roadmap 231. A draft of the "Notes" field for App Review and Google Play's
app access instructions. Nothing is sent until the owner approves. The
demo account is made at submission time: no credentials are in the
repository.

## The notes (to paste, after filling the account)

> Yallapp Community is a free community app for people who build apps with
> Yallapp: questions and answers, official tutorials, member profiles, and
> following and friends.
>
> Sign-in: Continue with Apple, Continue with Google, or email. A demo
> account for review:
>   Email: {filled in at submission}
>   Password: {filled in at submission}
> It has sample questions, answers and a profile with badges. To see the
> email flows, sign up with any address you can read.
>
> No in-app purchases and no paid content: the app sells nothing, and
> this version has nothing paid in it. There are no prices, no buy buttons
> and no links to buy anything, and nothing in the app is bought elsewhere.
>
> User-generated content (Guideline 1.2):
> - Every question, answer, reply and member has Report (long-press, or the
>   ⋯ menu on a profile), with reasons.
> - Members can block anyone. A blocked member's content and profile
>   disappear for both.
> - A spam and bad-link filter holds new members' first posts for review,
>   and content reported by several members is held until a moderator
>   decides.
> - Moderators review every report. The community rules are at
>   {community rules URL}. Contact: info@yallapp.com.tr.
>
> Account deletion (5.1.1(v)): Settings → Delete account. It deletes the
> account at once.
>
> Sign in with Apple is offered beside Google (4.8).
>
> Linking a Yallapp account (optional) opens yallapp.com.tr in the browser
> and comes back to the app; the demo account is already linked.

For Google Play's "App access": the same account under "All or some
functionality is restricted", with "Sign in with email" as the
instructions.

## Making the demo account (at submission)

1. Sign up on the production app or the website with a new mailbox the team
   controls (not a person's own). Confirm the email.
2. Fill the profile, ask one question, answer one, and link a Yallapp demo
   account so the profile shows apps and badges.
3. Put the email and password only in App Store Connect and the Play
   Console, never in the repository, a chat or a ticket.
4. After review, keep the account (reviewers come back for updates), or
   change its password.

## Paid content and the App Store (decided)

Apple's guideline 3.1.1 asks that digital content unlocked in an app be
sold through in-app purchase. Its exceptions (3.1.3(a) "reader" apps,
3.1.3(b) "multiplatform services") may not cover tutorials bought on a
website.

The coordinator's decision (24 November 2026), option (b):

- Phase 1 has no paid content at all. Paid content (the academy) arrives
  in phase 3.
- On iOS, any paid or locked item stays locked:
  - there is no path to unlock it;
  - there is no wording about unlocking it or about the website. The lock
    reads only "Locked" (`lockedLabel`), never a price;
  - Settings' note about paid things doesn't show
    (`settings_test.dart`, "on iOS, no word about paid things or the
    website").
- Before phase 3, the owner gets the options again:
  - in-app purchase for the academy on iOS;
  - asking App Review;
  - keeping paid items locked on iOS.

To keep an unlocked paid item locked on iOS, the contract will need to say
which items are paid, not only `locked`. That's for phase 3.

Google Play's payments policy allows content bought outside the app to be
used in it, with no link to buy; Android keeps "Unlocks on the account that
has it".
