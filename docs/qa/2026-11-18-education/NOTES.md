# 18 November 2026: the education templates, tested by hand (ROADMAP Phase 179)

Scope: Nakhla School (`school`, Signature looks A and B), Rawaq Academy (`instructors`, looks A and B), the premium academy (`premium_academy`), and the classic courses app (`lms`, hosted). Branch `wip-qa-education`, from `origin/main` (app release 9).

## How it was tested

- **Every education template, from both entry points.** A probe test made a project from each template, both through Studio's template and through its demo on /start (`makeStudioProject`, with and without `fromDemo`), in English and Arabic. It published each one and served every page (`GET /pages/{slug}`) to English, Arabic and Turkish phones. The probe looked for [brackets], the demos' own names, empty rows and empty lists, and dumped each home's text. The templates checked were `school_signature_a/b`, `school`, `instructors_signature_a/b`, `teachers`, `premium_academy_signature_a/b` and `academy_premium`. There are no brackets and no sample words left anywhere, except the bugs below.
- **The real site, end to end** (`tests/e2e/education-templates.spec.ts`, against a production build in memory mode). The spec signs up, activates the account, and makes the app on `/start/<demo>/make` for each look. It opens Studio's editor, publishes, and opens the published app preview (the committed web build of release 9) at 360×780 in English and Arabic, light and dark. The served homes are checked for the school's news and the academy's teachers. Screenshots are in this folder at deviceScaleFactor 1: `*-studio.png`, `*-dashboard-*.png`, and `*-app-<lang>-<theme>-{sign-in,home,home-end}.png`.
- **Every tab, at 360 points wide, text 1.0 and 1.3, English and Arabic** (Flutter widget test, `phase179_education_page_end_test.dart`). Rawaq looks A and B and Nakhla looks A and B, on a 360×640 phone and on a 360×800 phone with Android's three buttons. Each tab is dragged to its end as a finger would, and its last words must lie above the floating tab bar.

## Bugs, most serious first

### 1. Nakhla School's News pill is empty in every real school (fixed, 179.1)

**Where.** Look A's home. The pill under the photo shows "News" with nothing after it (`school-a-studio.png` shows the template's version).

**Cause.** The ticker is the template's own words, `nkNewsLines`, in `lib/studio/demo-designs/nakhla-signature.ts:229`. These are "[This week's news, a line each]", or the demo's "Parents' evening for Grade 5…" (`DEMO_FACTS.school`) when the app starts from /start. The customers' pass (156.9, `withoutPlaceholders`) rightly leaves a placeholder, or a demo's facts in a business's own app, out of a customer's app. That leaves the pill holding only its label. The school's real news (Dashboard › School › News) never reached it.

**Fix.** `lib/school/news-ticker.ts`, applied in `servedLayout` (`lib/pages/layout.ts`) before the customers' pass.
- A ticker still holding the template's words, in any language, runs the titles of the school-wide news, newest first, five at most.
- With no news, the pill is left out.
- A ticker in the owner's own words is kept as they wrote it.
- The layout's version follows the news, so an open app asks for the pages again.
- Studio's inspector now says what the ticker shows (179.4).
- `school-a-app-en-light-home.png` shows the real app running the school's news ("Science fair projects are due next Friday", one of the sample news a new school starts with).

**Test.** `phase179-education.test.ts` covers both entry points, three languages, no news, and the version. 5 of 6 fail without the fix.

### 2. Rawaq Academy names the template's four teachers in every academy (fixed, 179.2)

**Where.** Look A's faculty index and look B's slides "on air" and teacher rings on the home. In every academy they show "Hannah Clarke", "Deniz Kaya", "Salma Nasser" and "Omar Farouk". Look B also shows the template's courses ("Arabic for Beginners", "Start Your Own Small Business", "UX Design Fundamentals"). One teacher is marked "Live classes" or "Teaches live".

**Cause.** `FACULTY` and `ON_AIR` in `lib/studio/demo-designs/rawaq-signature.ts:73` and `:328` are written as words (`raT1`…`raT4`, `raS1`…`raS3`), not bound to the academy's teachers. A new project gets sample teachers with the same English names, so it looked right until the owner put in their own. An Arabic academy was wrong from the start: the template says "هانا كلارك" and "دنيز كايا", but the sample teachers are "هبة السيد" and "رنا الخطيب".

**Fix.** `lib/teachers/faculty.ts`, applied in `servedLayout`.
- Each template entry becomes one of the academy's active teachers, in the Teachers screen's order (featured first): their initials, name and subjects.
- On look B, a slide shows the teacher's newest published course and its first line, else the first line of their bio.
- An entry with no teacher left for it goes, with the hairline before it. The faculty heading goes with the last entry, and the slider or the rings go when none is left.
- Nobody is marked live: the app can't know who teaches live.
- An entry whose name the owner changed in Studio is kept.
- The version follows the teachers, and Studio's inspector says what the faculty shows.

**Test.** `phase179-education.test.ts` covers looks A and B, from Studio and from the demo, three languages, no teachers, and the Arabic sample names. All 6 fail without the fix.

### 3. The academy's and the school's tabs end under the floating tab bar (fixed, 179.3)

**Where.** On Rawaq look A, the last teacher on the Teachers tab ends at 602 points while the bar starts at 546, so it can't be reached. On Nakhla looks A and B, tab 2 (the school week and the parent's day) has the same problem. On Rawaq's My courses grid, with Android's three buttons, the last card's progress stays 6 points under the bar.

**Cause.** Roadmap 158's `endRoom` wasn't applied to these screens:
- `teachers_screen.dart:155`
- `my_courses_screen.dart:198` and `:437`
- `parent_screens.dart:189`
- `student_screens.dart:112`

Each of these used a fixed 24. The premium My courses grids used a fixed 110 and 120 (`premium_my_courses.dart:163`, `studio_my_courses.dart:229` and `:243`).

**Fix.** `endRoom(context, 24)` on each. The premium grids take the larger of their design's room and `endRoom`.

**Test.** `phase179_education_page_end_test.dart`. Before the fix, 6 of 8 failed. With only the fixed-24 screens fixed, 2 still failed (the premium grid with three buttons). Now 8 pass. The app change reaches phones with the next app build; `CLIENT_APP_RELEASE` was not bumped, as asked.

### 4. Nakhla look A's "Forms to sign" card shows the word "SIGNATURE" in Studio (fixed, 179.5)

**Where.** Studio's canvas, on the floating card at the foot of look A's home (`school-a-studio.png`).

**Cause.** The card's lead icon is `signature` (`cta.lead`, `nakhla-signature.ts:152`). That icon wasn't in the site's subset of Material Symbols (`components/icon-names.ts`), so the browser drew its name instead. The demo icon test in `studio-demo-templates.test.ts:395` checks each element's `icon` only, not a call to action's `lead`.

**Fix.** Added `signature` to the list and fetched the subset again (`node scripts/fetch-icons.mjs`: 276 icons, 106,080 bytes). A new test checks every icon the education templates name: elements', leads', entries', slides', tabs' and the system screens'.

**Test.** `phase179-education.test.ts` ("179.4"). It fails for `school_signature_a` without the icon.

### 5. Rows of buttons run past the screen at text 1.3 (fixed, 179.12; found by the template guard)

**Where.** Three templates' homes, on a 360-point phone at text 1.3:
- `instructors_signature_b`: each slide's "Meet the teacher" and "The courses", 54 points past the screen.
- `teachers`: "Meet the teachers" and "Browse courses", 57 points past in English and 46 in Arabic.
- `university`: its hero's two buttons, 27 points past.

These are the coordinator's guard rows (branch `wip-template-guard`, `docs/qa/2026-11-18-guard/NOTES.md`).

**Cause.** A Studio row is a Flutter `Row`, and two buttons that hug their words can't shrink.

**Fix.** `studioButtonsWrap` in `studio_page.dart`. A row holding only two or more buttons is drawn as a `Wrap`, with the same gap, start, middle or end, and cross alignment. The rule applies only when:
- no button fills the row;
- the row doesn't spread its children apart;
- the row is stretched only when every button has its own height.

On one line it is laid out exactly as the row was. When the buttons don't fit, the last ones go to a second line.

**Test.** `phase179_education_page_end_test.dart`, "its slides' buttons fit at text 1.3". It fails without the fix and passes with it. The guard was run in a scratch worktree (my branch with `wip-template-guard` merged, never pushed, its fixtures regenerated there):
- Flutter: the 4 failing cases fail on the guard branch alone and pass on mine. Every education template's case passes: 90 tests for school, school_brand, school_news, school_today, school_signature_a/b, demo_school, teachers, teachers_brand, teachers_offers, teachers_photo, instructors_signature_a/b, demo_instructors, university, academy_premium and premium_academy_signature_a/b, plus 2 for courses.
- Vitest: 9 failures fail the same way on the guard branch alone. They are all outside education: prices on food, delivery and marketplace, and one tap on `brand`. The tenth failure is the guard's own fixtures check. It fails because the education pages now serve the school's news and the academy's teachers: `demo_school`, `demo_instructors`, `instructors_signature_a/b` and `school_signature_a` need writing again with `mobile/tool/template_guard_fixtures.sh` on the guard's branch. I didn't edit the guard's files.

### 5b. The second round, from the coordinator (179.6, 179.7, 179.11)

**179.11: a card's price beside a filling title.** Rawaq B's "Popular this month" photo cards are 159 points wide. Their frosted label holds the course's title, which fills the row, and the price beside it. At text 1.3 with "E£1,010.00", the label ran 7 points past the card.

- *Cause.* A Flutter `Row` lays out the price at its own width before the title gets what is left. 163.3's "giving way" applies only to rows where nothing fills.
- *Fix.* `studioCappedText` and `_RowCap` in `studio_page.dart`. In a row with a filling child, a text beside it is held to the row's width less its gaps, and a `FittedBox` scales it down only when it would run past. Whenever it fits, it is laid out exactly as before.
- *Checks.* `phase179_education_page_end_test.dart` fails with the 7-point overflow without the fix and passes with it. `phase163_samsung_layout_test.dart`: 438 passed. The guard's whole Flutter suite was run with and without my changes. On its branch alone 44 cases fail; with mine 40 fail. The 4 that now pass are `instructors_signature_b`, `teachers` (twice) and `university`. The other 40 report the same problems word for word: food, marketplace, rides, taxi, travel, delivery and shop looks, all outside education.

**179.6: a faculty tap opens that teacher.** The contract's `Action` gains `teacher_id` (in both copies of `openapi.yaml`, `types.ts`, and `validate.ts`, which keeps it on a `teachers` screen action).

- Hosted `GET /pages` sets it on every tap in a faculty entry: look A's rows, look B's slides with their "Meet the teacher" button, and the rings.
- The app opens `/teachers/{id}` (`actionLocation`). Apps that don't know the field open the Teachers list, as before.
- *Checks.* The vitest suite checks each entry's taps and the served page against the contract; 4 tests fail without the IDs. The Flutter test taps a row with the ID and gets the teacher's page, and taps one without it and gets the list. It fails without the app change.

**179.7: Studio's canvas draws them as the app does.** `Pickable.schoolNews` and `Pickable.faculty` come from the same helpers the server uses, and `StudioView` applies them.

- While the school has no news, or the academy no teachers, the canvas keeps the template's version so the owner can still select and edit it. The inspector's note says the app hides it.
- *Checks.* The vitest suite fails without the canvas change.

### 6. Studio's editor page didn't build (found and fixed on this branch)

My first version of the inspector note imported the teachers' service into a client component (`node:dns/promises`). `next build` failed on `/studio/editor`. The helpers now have no server code, and the version mark is set in `layout.ts`. The production build passes.

## Seen, not changed

- **Sign-in default country.** The school's and the academy's sign-in open on +90, although this owner signed up with an Egyptian number. That is 160.8's rule: the owner's choice, otherwise the platform's default, which is +90. Nothing was changed for education.
- **Nakhla look B's sign-in without its photo** (`school-b-app-en-light-sign-in.png`). Not a bug. Look B's system screens are its "large" look (`chrome.system: "large"`, `nakhla-signature.ts:484`), which draws the sign-in on the look's own surface. Look A's "photo" look draws it over the school's building. Rawaq A's "brand" look is the same: its green, with no photo.
- **Course prices** follow 135.5: the shop's price, then "≈" the customer's currency (`Price.label`). The hosted lists convert as 161 does. 161.9 is still open for the course screens beyond their cards.
- **Notifications.** Every school, course and teacher push type the platform sends is handled by the app's router (each `type` checked by name in `mobile/lib`). Opening each one on a phone is part of 179.9.
- **The staff's tabs** under a floating bar (the Classroom, the teacher's desk) are 158.7's and still open.

## Not run, or not possible here

- **No real phone.** iPhone and Android, Turkish, VoiceOver and TalkBack are all 179.9.
- **WordPress (Tutor LMS) e2e dev site.** `wp-plugin/yallapp/tests/dev-site` needs WordPress with MySQL, which this container doesn't have. The plugin's PHPUnit suite was run instead: 355 tests, OK. The school and the academy with many teachers are hosted only, so fixes 1 and 2 don't concern the plugin.
- **Yallapp Business by hand.** Not run; only its tests (school, lessons, courses: 9 files, 122 passed).
- **Text at 1.3 in the browser preview.** The web build has no text-scale switch, so 1.3 was checked in the widget tests only.
- **Hand edits in Studio and their publish.** Selecting and editing each kind of element on every page (text, picture, button, list, ring, tile, size, corners, links) was not done by hand. The e2e publishes the template as made; edits reaching the app are covered by 156's tests, which this branch doesn't touch.
- **The classic `lms` app.** Checked through the served pages and the widget suites, not opened in the preview.
