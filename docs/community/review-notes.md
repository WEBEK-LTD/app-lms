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
> every tutorial is free. There are no prices, no buy buttons, no links to
> buy anything and nothing locked; nothing in the app is bought elsewhere.
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
> account at once. It can also be deleted on the website, signed in, at
> https://community.yallapp.com.tr/settings/delete-account; how to delete,
> with or without the app, is at https://community.yallapp.com.tr/delete-account.
>
> Privacy policy: https://community.yallapp.com.tr/privacy (also in the
> app's Settings → About).
>
> Sign in with Apple is offered beside Google (4.8).
>
> Linking a Yallapp account (optional) opens yallapp.com.tr in the browser
> and comes back to the app; the demo account is already linked.

For Google Play's Data safety form, the account deletion URL is
https://community.yallapp.com.tr/delete-account.

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

## Paid content (decided)

The owner's decision (24 November 2026): every tutorial is free, always.
There is no paid content in the Community app or its tutorials.

So the App Store's guideline 3.1.1 (digital content sold through in-app
purchase) has nothing to apply to. The app has:

- no lock or "unlock" wording;
- no note about the website;
- no `locked` field. Area B removes it from the API.

`no_payments_test.dart` still guards against prices, buy buttons, payment
links and "unlock" wording on every platform.
