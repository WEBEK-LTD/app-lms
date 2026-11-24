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
> No in-app purchases: the app sells nothing. It has no prices, no buy
> buttons and no links to buy. A few tutorials are paid on our website.
> If the member has one unlocked, it opens; if not, it shows a lock and the
> words "Unlocks on the account that has it". There is no price, link or
> call to buy.
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

## A risk for the owner to decide before submitting

Apple's guideline 3.1.1 asks that digital content unlocked in an app be
sold through in-app purchase. Its exceptions are:

- **3.1.3(a) "Reader" apps:** previously bought magazines, newspapers,
  books, audio, music and video.
- **3.1.3(b) "Multiplatform services":** content bought elsewhere,
  provided those items are also available as in-app purchases.

Paid tutorials bought on the website and opened in the app may be read as
neither. Tutorial videos are close to "video", but courses are not named,
and there is no in-app purchase. The brief's rule (no payments in the app,
ever) keeps the app clear of buy links, but it doesn't by itself settle
whether unlocking is allowed.

Options for the owner:

- **(a)** Keep it as it is and explain it as above. It may pass as a
  reader-type app for video and articles.
- **(b)** In phase 1, show paid tutorials only as locked in the iOS app,
  without opening them even when unlocked.
- **(c)** Ask App Review first, through Apple's Developer contact form, before
  the first submission.

Google Play's payments policy allows content bought outside the app to be
used in it, with no link to buy, so this is about the App Store only.
