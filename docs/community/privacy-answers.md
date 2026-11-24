# Yallapp Community: privacy answers for the stores (draft)

Roadmap 231. These are the answers for the App Store's privacy labels ("App
Privacy") and Google Play's Data safety form, drawn from what the code
does. Nothing is submitted until the owner approves.

## What the app and its server keep, and why

Checked against `community/` (the app, areas D and E) and A's schema
(`platform/web/src/lib/db/community-schema.ts`, `wip-community-security`):

| Data | Where it comes from | Why | Required? |
| --- | --- | --- | --- |
| Email address | Sign-up, or from Apple or Google | The account, its confirmation and password resets | Yes for an email account; Apple may give a private relay address |
| Name (display name), username | Sign-up, the profile | The public profile | Yes |
| Password | Sign-up | Signing in; the server keeps only a hash | Only for email accounts |
| Apple or Google account id | Continue with Apple or Google | Signing in | Only with Apple or Google |
| Profile picture | The member chooses a photo | The public profile | No |
| Bio, headline, skills, links | The profile | The public profile | No |
| Questions, answers, replies, votes, bookmarks, follows, friends, blocks, reports | What the member does in the app | The community itself | No |
| Proof of identity (a photo or PDF), full name, portfolio links | The Gold badge form | Checking a Pro Developer before giving the badge; private, seen only by the reviewers | No: only when applying |
| The linked Yallapp account and its apps | The member links it on yallapp.com.tr | Showing their apps; the Gold and Green badges | No |
| Device name and platform ("iPhone", "Android phone"), last seen | Each sign-in | The member's list of signed-in devices, to sign one out | Yes |
| Language and theme | Settings | The member's choices on every device | Yes |

What the app does not collect:

- No analytics, crash reporting or advertising SDK. The pubspec has none, in
  areas D and E alike.
- No push device tokens: there are no push notifications in phase 1, and no
  Firebase or APNs registration.
- No purchases and no purchase history: nothing in the app is paid, and
  every tutorial is free (the owner, 24 November 2026).
- No location, contacts, calendar, health or financial details. No IP
  address is stored with a session. No tracking across other companies' apps
  or websites.
- No search history: searches are sent to answer them, not kept with the
  member.
- View counts are plain counters, not who viewed.

If any of this changes before submission (push in a later phase, an
analytics tool), these answers change with it.

## App Store: App Privacy

Data used to track you: **None**.

Data linked to you (all for **App Functionality**, none for advertising,
analytics or third-party purposes):

| Apple's category | Type | Note |
| --- | --- | --- |
| Contact Info | Email Address | The account |
| Contact Info | Name | The display name |
| User Content | Photos or Videos | The profile picture; the proof of identity (Gold badge) |
| User Content | Other User Content | Questions, answers, replies, the profile's bio and links, reports |
| Identifiers | User ID | The member's id; their Apple or Google sign-in id |
| Other Data | Other Data Types | Device name and platform for the signed-in devices list |

Data not linked to you: **None**.

Apple's "Sensitive Info" covers race, religion, health and the like, so
it's **not** declared. The proof of identity is declared as a photo. It is
used only to check a Gold applicant.

## Google Play: Data safety

- Does the app collect or share user data? **Collects; does not share.**
  Signing in with Apple or Google is the member's own action, not sharing.
- Is all of the user data encrypted in transit? **Yes** (HTTPS only).
- Can users ask for their data to be deleted? **Yes.** In the app: Settings →
  Delete account. On the website: the same, once area F's page has it (to
  confirm).

Collected (all for **App functionality** and **Account management**; none
processed ephemerally; none shared):

| Google's category | Type | Required or optional |
| --- | --- | --- |
| Personal info | Name | Required |
| Personal info | Email address | Required |
| Personal info | User IDs | Required |
| Personal info | Other info (the proof of identity, portfolio links) | Optional |
| Photos and videos | Photos | Optional |
| App activity | Other user-generated content (questions, answers, replies, profile text) | Optional |
| App activity | Other actions (follows, friends, votes, bookmarks, blocks, reports) | Optional |
| Device or other IDs | None | – |
| App info and performance | None (no crash logs or diagnostics) | – |
| Location, contacts, messages, audio, files, calendar, health, web browsing | None | – |

Security practices to declare:

- Data is encrypted in transit.
- Users can request deletion.
- Not independently validated.
- Committed to Play's Families policy: no. The app is not for children.

## Needed before any store submission

F's answer, 24 November 2026: neither of the first two exists in phase 1.
Both are outside the approved phase 1 scope, and F has flagged them to the
coordinator.

1. **A Community privacy policy.** community.yallapp.com.tr has no
   `/privacy`. Yallapp's own policy (yallapp.com.tr/privacy) doesn't list
   the community's data. Both stores require a policy URL.
2. **Account deletion on the website.** The API has `DELETE /me` and the app
   has Settings → Delete account, but the site has no page for it. Google's
   Data safety form asks for a deletion URL.
3. **How long the proof of identity is kept after the decision** (area C).
   C hasn't answered; the coordinator suggests 30 days. The policy should
   say.
