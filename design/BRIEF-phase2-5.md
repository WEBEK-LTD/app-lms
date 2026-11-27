# Yallapp Community: phases 2 to 5 (ROADMAP 232 to 235)

The owner asked for phases 2, 3, 4 and 5 to be built now and to land together: **one PR, one merge, one Netlify deploy.** Netlify build credits are tight, so the rules below on PRs and pushes are strict.

The coordinator is session_01MSAbbHjPLVdK4KhggTQ4Tg.

## How we work

### Netlify rules (strict)
- **Open no PRs**, except the one final PR that F opens. Every PR push builds a Netlify deploy preview and costs credits.
- Push only to your own `wip-community-*` branches. Pushing a branch does not build on Netlify; only PRs do.
- F integrates everything into `wip-community-next`.
  - When all areas are done and green locally, F opens **one** PR from `wip-community-next` to `main`.
  - After that, every fix-up commit to that PR, except the last one, carries `[skip netlify]` in its message, so Netlify builds only once.

### Testing
Because there are no PRs, GitHub Actions won't run for you. Run locally what CI runs:
- Web: typecheck, lint, the full vitest, and the community e2e on a production build, including the stand-in reverse-proxy test.
- MariaDB: migrations against MariaDB when you add migrations (docker or a local mariadb).
- Flutter: `flutter analyze` and `flutter test` in `community/` and, for phase 5, in `mobile/`.
- Never claim a test passed unless you ran it.

### Migrations
Migrations continue from 0159. Each area takes the block it is given below, so numbers never clash.

### Starting point
Start from current `main` (e02d5aeb or later). Merge `origin/main` when needed, by merging and not rebasing.

## The look (already approved; do not reopen)
- The flat Community look from #527:
  - Yallapp's own dark colours (paper #0e0d24, card #161530, line #2c2a49, and the rest from `app/globals.css`) and the light cream/navy.
  - 1px lines, radii of 12 on cards and 8–10 on controls, Readex Pro headings.
  - No glow, gradient, blur blob or coloured shadow, anywhere.
  - Orange is the accent only.
- Every new page and screen must exist in light and dark, at 1440 and at 390, and in en, ar (RTL) and tr.
- Material Symbols Rounded icons only. No emoji in the interface's own text.
- Sections in the side menu that were "Soon" become live as their phase lands.

## Scope

### Phase 2 (232): Members connect
1. **Posts**
   - Text with photos (up to 10) and video (upload to the existing blob store; size limits as for ID proof; a poster frame).
   - Links show a preview.
   - Likes, comments with replies, save, share and report.
   - The home feed (For you / Latest / Following) mixes posts and questions.
   - Moderation and spam rules from phase 1 apply.
2. **Stories**: photo or short video. They last 24 hours and show as a ring row on home, with a viewer list for the author.
3. **Showcase**
   - A member shows an app they built:
     - pictures;
     - a description;
     - store links;
     - "Made with Yallapp" verified when the app belongs to their linked account.
   - Likes and comments. A gallery page with filters (type, newest, most liked).
4. **Messages**
   - One-to-one and small group chats.
   - Text, photos and replies, plus read state.
   - Blocks are respected.
   - Report a conversation.
   - On the site the inbox updates by polling; the app polls and also gets push.
5. **Groups**
   - Creating a group follows the existing admin setting "Who can create groups".
   - Public or private (join by request).
   - Owner and moderators; group posts and group questions; a group page; member lists.
   - "My groups" in the side menu.
6. **Push for the Community app**
   - Firebase Cloud Messaging through Yallapp's existing keyless setup. Never commit firebase config files.
   - Every notification kind can be turned on or off. Email stays as in phase 1.

### Phase 3 (233): Learn and grow
1. **Academy** (website only for buying)
   - Courses with lessons (video and article), quizzes, progress, and a certificate as a PDF with a public verification link.
   - **Price:** the admin sets each course's price; the admin can also mark a course free.
   - **Payment:** through Yallapp's existing Stripe checkout on the website.
   - **The mobile app** shows bought courses unlocked on sign-in, with a lock and **no price, no buy button and no payment link**. Keep the existing guard test and extend it.
2. **Points and levels**, in full:
   - points for each action (admin-editable table);
   - levels with names;
   - a weekly and all-time leaderboard;
   - abuse limits (daily caps).
3. **Challenges**
   - The admin posts a challenge with dates and rules.
   - Members submit (a showcase item or a link) and vote.
   - The admin picks the winners, who get badges or points.
   - A challenge card on home.
4. **Member tutorials**
   - Members write tutorials (article or video).
   - The first ones go through review, and the "Official" mark stays for the Yallapp team.

### Phase 4 (234): Work and events
1. **Pros**
   - A member opens a pro profile: services, rates as text, portfolio from showcase, and availability.
   - Clients send a hire request, which becomes a message thread.
   - **No money moves on the platform.**
   - Reviews after a request is marked done.
2. **Jobs**
   - Post a job (title, type, remote/location, skills, budget as text).
   - Apply with a message and portfolio links.
   - The poster sees the applicants.
   - Admin moderation.
3. **Live**
   - A live session is an event with an embed URL (YouTube Live or a meeting link). **No own streaming server.**
   - Comments during live and a replay link after.
4. **Events**
   - Online or in person, with date and time in the viewer's time zone and RSVP.
   - Reminders by push and email, an add-to-calendar (.ics) file, and an attendees list.
   - Free only; no tickets for money.

### Phase 5 (235): "Community" app type in Studio
- A client can add a community to **their own** app.
- Built as a Studio app type with its own screens:
  - feed;
  - Q&A;
  - groups;
  - profile;
  - messages.
- Each client app's community is separate, with its own members (the app's customers), moderation and admin in the client's dashboard.
- It reuses the community engine with a tenant key (app id). Yallapp Community itself is the tenant "yallapp".
- Studio:
  - a template with light and dark designs;
  - a demo;
  - every screen editable like the other Studio screens.
- The client app (`mobile/`) gets the screens behind the template flag. **No CLIENT_APP_RELEASE bump**: the coordinator does release 16 at the end with the owner's approval.
- The WordPress plugin is out of scope unless the engine needs nothing from it.

## Who does what

| Area | Session | Branch | Migrations |
|---|---|---|---|
| **A**: messages, groups, pros, jobs; the tenant key in the engine (phase 5 groundwork, first) | session_01PYAXYarYR6EuUg8syy5NuV | wip-community-a2 | 0159–0168 |
| **B**: posts, stories, showcase, member tutorials, academy courses, lessons, quizzes and certificates | session_01PYAXYcUdMEm2E8mMQSohYa | wip-community-b2 | 0169–0178 |
| **C**: push, points and levels, leaderboard, challenges, events and live; moderation and admin for everything new; academy checkout on Stripe | session_01PYAXYcfvFkNyoZy1D4Qc1D | wip-community-c2 | 0179–0188 |
| **D**: Community app (Flutter `community/`): shell updates, posts and feed, stories, messages, groups, push wiring | session_01PYAXYaoBzviNy7pGFmGeym | wip-community-d2 | – |
| **E**: Community app: showcase, academy (locked, no prices), challenges, leaderboard, pros, jobs, events and live. **Then phase 5 in `mobile/` and Studio.** | session_01PYAXYaXRxrPVjMvxup3rNK | wip-community-e2 | – |
| **F**: website for all of phases 2–4, the client dashboard pages for phase 5, and the **integrator**: merge everything into `wip-community-next`, then open the one PR | session_01PYAXYcncLY9hbcCRudL4E1 | wip-community-f2 → wip-community-next | – |

### Order
1. **A pushes the contract first**: OpenAPI for every new endpoint, plus the tenant key, within the first hours. The others build against it.
2. Agree folder splits directly with each other (send_message).
3. Tell the coordinator at milestones only.

## Rules (unchanged)
- **Never commit:**
  - secrets, keys or tokens;
  - google-services.json, GoogleService-Info.plist or config/firebase.json;
  - model names or "AI" wording;
  - the company's registration details.
- The host is yallapp.com.tr. All code, identifiers, keys and comments are in English.
- Dependencies must be at least 2 weeks old. Don't run prettier.
- **Commits:** `git -c user.name="WEBEK LTD" -c user.email="info@webek.org" commit`. End each message with your own `Claude-Session:` line, with no Co-Authored-By.
- **Git:**
  - No force-push, no history rewrite.
  - Never delete branches, tags or releases.
  - Never push to main.
- **Production:** no production settings, no DNS, no store publishing, no CLIENT_APP_RELEASE bump.
- **ROADMAP:** add sub-items for 232–235 in your area. **STATUS:** one line each.
- **Credits are low.** Build what's listed, no extras. When your area is done and handed to F, stop and stay idle.
