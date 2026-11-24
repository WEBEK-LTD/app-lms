# Yallapp Community: phase 1 (ROADMAP 231)

The owner approved a new product: **Yallapp Community**. It is a public community for app makers, delivered as a website (`community.yallapp.com.tr`) and its own mobile app ("Yallapp Community", with its own icon). Anyone can sign up; a Yallapp account is not required, but one can be linked.

The coordinator is session_01MSAbbHjPLVdK4KhggTQ4Tg.

## Source of truth for the look

This branch (`wip-community-design`) holds the approved design:

- `design/mobile.html` and `design/yallapp-community-mobile.png` are the **approved app design**. They contain four screens: the welcome screen, Home (header with menu and profile), the side menu, and a question in dark mode. The design includes the floating tab bar.
- `design/desktop.html` and `design/yallapp-community-desktop.png` give the **website layout**:
  - a header with search, the Ask button and the avatar;
  - a start-side nav;
  - a centre feed;
  - an end-side rail.
  The site is **English first and LTR**, so mirror that file's Arabic/RTL layout and use the mobile file's English words and style.
- `design/logo.svg` is the Community logo and app icon. It must stay distinct from the Yallapp icon.

The owner's words: «التزم بنفس الشكل والامكانيات الي اتفقنا عليها». **Build exactly this look and these features. Nothing missing, nothing changed.**

- For every screen you build, take a real screenshot at 390 px, deviceScaleFactor 2 (desktop at 1440 px).
- Put it beside the matching part of the mockup and fix any difference: spacing, radius, colours, blur, type, icons.
- Push the comparison shots to your `wip-community-shots-<area>` branch.

## Decisions already made (do not reopen)

- **Language:**
  - The app and site are **English by default**. Arabic (MSA, RTL) and Turkish are optional languages that the user picks.
  - **All code, identifiers, keys and comments are in English.**
- **Sign-in:** Continue with Apple, Continue with Google, and Sign up with email (plus Log in). The mockup's welcome screen shows Apple and email only. Add a **"Continue with Google" button between them**, styled like the Apple button (white, same size), with the Google "G" mark.
- **Social graph:** both **Follow** (one way, no approval) and **Friends** (request, then accept).
- **No payments in the app.** No prices, no buy buttons and no payment links in the mobile app, ever. Paid things are bought on the website and unlock in the app on sign-in, shown with a lock and no price. Add a test that guards this.
- **Verification badges.** Only the highest badge shows, in the order Gold, then Green, then Blue. All earned badges are listed on the profile.
  - **Gold, "Pro Developer":**
    - It needs **at least 5 apps** made with Yallapp. Studio Market templates count.
    - The member applies through a **verification form**: full name, ID proof upload, portfolio links, and their apps.
    - The apps list is auto-filled from the **linked Yallapp account**, so nobody can claim apps that aren't theirs.
    - The "Apply" button only shows when the member has 5 or more apps.
    - An admin approves or rejects the request with a reason, and the member is notified either way.
  - **Blue, "Active Member":**
    - Granted automatically, with no form.
    - Default rules, all editable by the admin in settings:
      - account at least 60 days old;
      - at least 1,000 points;
      - at least 20 accepted answers or 10 approved tutorials;
      - no violations in the last 90 days.
    - It is removed after 90 days without activity and comes back when the member is active again.
  - **Green, "Verified Business":**
    - Granted automatically once the linked Yallapp account has an app on a **paid** plan. The badge shows the company name and app link.
    - It is removed when the plan lapses.
  - **Admin overrides:**
    - The admin can grant any badge to anyone, even when the rules aren't met.
    - Each grant has a private reason and an optional expiry. Manual badges never auto-expire.
    - The admin can also revoke any badge, with a reason.
    - Every grant and revoke goes into an **audit log** (who, when, why).
- **Groups** are phase 2. The admin setting "Who can create groups" (Everyone, Badge holders, or Chosen people, default Everyone) is created now so phase 2 only reads it.
- **Moderation:**
  - A new member's first 2 posts or questions are reviewed before they appear.
  - Members can report content.
  - There is an automatic spam and bad-link filter.
  - Admins get a moderation queue.
- **Navigation:**
  - App header: menu (☰), logo, search, messages, notifications, avatar.
  - The side menu lists every section, the member's groups, and theme, saved, settings and log out.
  - Floating tab bar: Home, Q&A, + (create), Learn, Groups.
  - Sections that come in later phases appear as "Coming soon" with no dead taps.

## Phase 1 scope

1. Welcome screen.
2. Sign-in and sign-up with Apple, Google and email.
3. Profile, with edit, avatar, bio, skills, badges, followers, following, friends and linked Yallapp apps.
4. Follow, friend requests, block and report.
5. Q&A:
   - ask, answer, vote, accept;
   - official answers with a "Yallapp Team" badge;
   - tags and sections;
   - search, including similar questions before asking.
6. Official tutorials: article and video, with sections, levels and languages.
7. Badges with the verification form, the admin tools and the audit log.
8. Moderation.
9. Notifications in the app list and by email. Push comes in phase 2.
10. Languages: en (default), ar and tr.
11. Light and dark mode.

## Architecture

- **Platform:** `platform/web`, the same Next.js app and database.
  - The routes live under `src/app/community/...` (the site), served on `community.yallapp.com.tr` through `src/proxy.ts` host routing.
  - The API is `/api/community/v1/...`, documented in an OpenAPI file next to the existing contracts.
  - Add migrations with new numbers.
  - Community users are their own table. Linking a Yallapp account is optional (OAuth-style confirm).
- **App:** a new Flutter project at `community/`, modelled on `business/` (structure, CI job, l10n).
  - Its own bundle id: follow the `business/` naming.
  - Its own icon from `logo.svg`.
  - No store publishing and no release.
- **Do not touch** `mobile/` (the client app) or `business/`.

## Who does what (5 people plus an integrator)

| Area | Session | Branch |
|---|---|---|
| **A. Base:** schema and migrations, community auth (Apple/Google/email), profiles, follow/friends/block, account linking, OpenAPI contract, i18n scaffold, host routing. **Push the contract first, within your first hour**, so the others can build against it. | session_01PYAXYarYR6EuUg8syy5NuV | wip-community-base |
| **B. Q&A and tutorials:** API and logic, search, similar questions, sections and tags, official answers. | session_01PYAXYcUdMEm2E8mMQSohYa | wip-community-qa |
| **C. Badges, verification form, admin tools, audit log, settings, moderation, reports, notifications (list and email).** | session_01PYAXYcfvFkNyoZy1D4Qc1D | wip-community-trust |
| **D. App shell (Flutter `community/`):** theme tokens from the mockup, welcome, auth, header, side menu, tab bar, profile, follow/friends, settings, language, theme. | session_01PYAXYaoBzviNy7pGFmGeym | wip-community-app |
| **E. App features (Flutter):** Q&A screens (list, question, answer composer, ask with similar questions), tutorials, badges display, verification form, notifications list. Build on D's shell; agree the folder split with D first. | session_01PYAXYaXRxrPVjMvxup3rNK | wip-community-app-features |
| **F. Website UI** in the approved style, English and LTR: home, Q&A, tutorials, profile, verification form, admin pages. **Also the integrator:** you merge all branches into `wip-community-integration` and open the single PR. | session_01PYAXYcncLY9hbcCRudL4E1 | wip-community-web |

Coordinate with each other directly by send_message when you share files. Keep the coordinator informed at milestones.

## Credentials and limits

- Sign in with Apple and Google need keys. **Never create, ask the owner for, or commit keys.** Read them from env config, make the code paths testable with fakes, and tell the coordinator which env names are needed.
- No production settings, no DNS changes, no store publishing, no CLIENT_APP_RELEASE bump.

## Rules (unchanged)

- **Icons:** Material Symbols Rounded only.
- **Formatting:** don't run prettier.
- **Dependencies:** any new one must be at least 2 weeks old.
- **Never commit or write:**
  - secrets, keys, google-services.json, GoogleService-Info.plist or config/firebase.json;
  - model names or "AI" wording;
  - the company's registration details.
- **Host:** the host is yallapp.com.tr.
- **Commits:** use `git -c user.name="WEBEK LTD" -c user.email="info@webek.org" commit`. End every message with your own `Claude-Session:` line and no Co-Authored-By.
- **Git:**
  - Push only to your own `wip-*` branches.
  - No force-push and no history rewrite.
  - Never delete branches, tags or releases.
  - Merge `origin/main` when needed (merge, not rebase).
- **Tests:**
  - Never claim a test passed unless you ran it.
  - Run typecheck, lint and the full vitest; flutter analyze and test for the app.
  - Add e2e for the main flows.
- ROADMAP: add 231 sub-items for your area. STATUS: add one line.
- **Do not open PRs.** F integrates into one PR.
