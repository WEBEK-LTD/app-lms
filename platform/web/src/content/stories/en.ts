import type { StoryCopy } from "@/site/story/types";

/**
 * The Studio story pages in English (src/site/story). Every feature named
 * here is in the apps and Studio today; the screens are the demos' own.
 * Arabic and Turkish (./ar.ts, ./tr.ts) follow this item by item.
 */
export const STORIES_EN: StoryCopy = {
  ui: {
    studio: "Yallapp Studio",
    tryDemo: "Try the demo",
    seePlans: "See the plans",
    readStory: "Read the story",
    scroll: "Scroll to begin",
    chapter: "Chapter",
    inTheApp: "In the app",
    everything: "Everything it does",
    realScreen: "Real screen from the demo",
    plansTitle: "The Studio plans",
    plansText: "This bundle is a Yallapp Studio project. Pick the plan that fits, and the team sets it up with you.",
    allPlans: "All plans and prices",
    compareLabel: "How this compares with companies that make such apps",
    compareChecked: "As stated on their own sites, checked in November 2026. Their offers change: read their pages for today's terms.",
    compareSources: "Where each line comes from",
    compareRows: {
      kind: "What it is",
      apps: "Apps included",
      ownName: "Under your own name",
      pricing: "How it's priced",
      published: "Prices published",
      arabic: "Arabic stated",
    },
    yallapp: "Yallapp Studio",
    agency: "Custom build by an agency",
    creditsTitle: "Photo credits",
    creditsText: "The photos on this page are by these photographers, under the licences named. Thank you.",
    creditsNone: "This page uses no outside photos yet: every picture on it is a real screen of the app.",
    photoBy: "Photo by {creator}",
    photoSource: "Source",
    otherStories: "More stories from Yallapp Studio",
    demoTitle: "Now try it yourself",
    demoText: "Install the demo on your phone and sign in with the demo number. You play every part of the story, and nothing you do reaches a real person.",
    solutionLink: "The short version",
    fromStudioTitle: "Six apps, six stories",
    fromStudioText: "Follow a day with each app made in Studio, scene by scene, with the real apps' screens, every part explained and how they compare.",
    storyOfThis: "The whole story, scene by scene",
    now: "now",
    art: {
      gate: "The gate",
      gateNote: "A new code every 30 seconds",
      present: "Present",
      late: "Late",
      absent: "Absent",
      fareParts: ["A start", "Per km", "Per minute", "Never under the minimum"],
      priceWays: ["By distance", "By area", "One fixed price"],
      newRide: "New ride request",
      secondsLeft: "seconds left",
      accept: "Accept",
      running: "Running about 20 min late: high demand",
      runningNote: "Ends by itself in 1 hour",
      weighed: "Weighed when picked",
      estimate: "Estimate",
      perKg: "per kg",
      liveMap: "Live on the map",
      registerNames: ["Lina", "Omar", "Farida", "Ziad", "Malak"],
      when: "When should it arrive?",
      today: "Today",
      todayClosed: "Orders for today closed at 16:00.",
      tomorrow: "Tomorrow, 15 Nov",
      pickDate: "Pick a date",
      slotFull: "Full",
      flashSale: "Flash sale",
      flashItem: "Blush Garden · Deluxe",
      onlyLeft: "Only 4 left",
      cardTo: "To Salma Adel",
      cardFrom: "From Omar Hassan",
      cardMessage: "“Happy birthday! May this year bloom like these flowers.”",
      cardOccasion: "Birthday",
      codeApplied: "Code applied",
      feeTitle: "Delivery fee",
      feeParts: ["Base fee", "Distance · 2 km", "Time slot", "Delivery"],
    },
  },
  stories: {
    school: {
      navName: "School app",
      metaTitle: "A school app with apps for students, parents, teachers and staff",
      metaDescription: "A day at Nakhla School: the bus on the parent's map, homework handed in, attendance in seconds, salaries and payslips. A Yallapp Studio bundle.",
      summary: "The school's app for students and parents, its staff app, and Studio for the office.",
      eyebrow: "Yallapp Studio · The school bundle",
      title: "A day at Nakhla School",
      intro: "Before the sun is up over Maadi, a mother checks her phone. By the end of the month, the office closes the salaries. In between: one school, four kinds of people, two apps and one day you can follow minute by minute.",
      cast: "Lina is in Grade 5 A. Her mother, Rania, drops nothing and forgets nothing, because the app remembers for her. Ms. Mona teaches Lina's class. Ms. Samia runs the office. Every screen below is the real app, from the Nakhla School demo you can try tonight.",
      chapters: [
        {
          time: "06:40",
          kicker: "Before dawn",
          title: "The house is still dark",
          text: "Lina's mother, Rania, makes tea and opens the Parent tab. Lina's day is already there: five lessons, two pieces of homework due, and a note Rania wrote last night so the school knows Grandpa Samir picks Lina up today. One tap and she switches to Adam's day, Lina's little brother. Same account, two children.",
        },
        {
          time: "07:16",
          kicker: "The bus",
          title: "Four minutes away",
          text: "Rania's phone buzzes while Lina ties her shoes. The bus is near. She opens the map and watches it turn off Victoria Square, a small bus moving between the stops it has passed and the one where they wait. When Lina climbs in, a second message comes: she's on.",
          push: { app: "Nakhla School", title: "The bus is near", body: "Lina's bus is about 5 min from Road 9, Maadi." },
        },
        {
          time: "07:46",
          kicker: "The gate",
          title: "A code that changes every thirty seconds",
          text: "At the gate a screen shows a six-digit code and its QR code, new every thirty seconds. Lina types it and she is in. A photo of the code taken a minute ago would fail, and the school can also ask for the phone to be on its grounds. At home, Rania reads one line.",
          push: { app: "Nakhla School", title: "Lina arrived at school", body: "Lina checked in at 07:46." },
        },
        {
          time: "08:00",
          kicker: "First lesson",
          title: "The register, before the bell stops ringing",
          text: "Ms. Mona opens Grade 5 A in her staff app. Present, present, late, absent. Each name has the time it came through the gate next to it, so she isn't guessing. She saves, and the parents of the boy who isn't there know before the first sum is on the board.",
        },
        {
          time: "12:30",
          kicker: "Homework",
          title: "Handed in from the playground",
          text: "Lina finished the fractions last night. She writes one line, attaches nothing, and hands it in from the app. By the afternoon Ms. Mona has marked it: 9 out of 10, and a note to look at number 7 again. Rania sees the mark the moment Lina does.",
        },
        {
          time: "13:10",
          kicker: "The library",
          title: "Waiting in turn for the atlas",
          text: "Omar has the Atlas of Egypt, so Lina reserves it and joins the queue. When it comes back, it is held for her for a few school days, and the app reminds her before it's due back. The Little Prince she can open right now, as an e-book, in the app.",
        },
        {
          time: "16:05",
          kicker: "After school",
          title: "The museum trip, paid before dinner",
          text: "The science museum trip costs E£350. Rania pays it by card from the Fees screen, through the school's own payment account, and the receipt lands in the app. The term's fees, paid at the office in September, are there too.",
          push: { app: "Nakhla School", title: "Payment received", body: "Science museum trip for Lina: E£350.00. The receipt is in the app." },
        },
        {
          time: "30th",
          kicker: "End of the month",
          title: "Ms. Samia closes the salaries",
          text: "In Studio, Ms. Samia makes the month's payslips from each person's salary and allowances. The system suggests deductions from the gate's records; she accepts one, changes another, writes a bonus for bus duty and takes back an advance's instalment. She records each payment as cash or bank transfer. No money moves through the app. Ms. Mona opens her own payslip, and its PDF, in the staff app, like every teacher.",
        },
      ],
      interlude: {
        quote: "Nobody called the school today. Nobody had to.",
        text: "Every message above was sent by the apps themselves, to the right person, in their own language.",
      },
      statsTitle: "Small numbers that change a school day",
      stats: [
        "the gate's code changes, so an old photo of it fails",
        "apps in one bundle: the school's, and its staff's",
        "kinds of people, each seeing only their part",
        "payment gateways salaries go through: they're recorded by hand",
      ],
      systemsTitle: "Every part, explained",
      systemsText: "Nothing here is a mock-up. These are the screens and tools a school gets, role by role.",
      systems: [
        {
          name: "Student",
          title: "Everything a student needs, and nothing a parent does",
          text: "The School tab shows the day; the rest is one tap away. Students never see fees, permission slips or their parents' messages.",
          features: [
            ["Timetable", "The week's lessons with the teacher and the room, and today's at the top."],
            ["Homework", "What is due, handed in with a line of text or a file, marked late after the date, then the mark and the teacher's feedback."],
            ["Exams and scores", "The exams' timetable with the room and what it covers, and each quiz, exam and assignment's score."],
            ["Check in and attendance", "The gate's six-digit code typed in the app, today's times and the month's days."],
            ["Report card", "The term's results subject by subject, with attendance."],
            ["Library", "Search by title, author or ISBN, reserve a book, wait in turn, read e-books in the app, get reminders before the due date."],
            ["Messages", "Write to their own teachers, when the school allows it, within the hours the school sets."],
            ["News and calendar", "The school's and the class's news, events, holidays and exam days, added to the phone's calendar."],
            ["Behaviour", "Merits and notes from teachers, with the points they add up to."],
            ["The bus", "Their route, their stop and the bus on its way."],
          ],
        },
        {
          name: "Teacher",
          title: "A Classroom tab built for a teacher's real morning",
          text: "Teachers work in the staff app, with the number the school added them with. Their classes, their day and their own pay, in one place.",
          features: [
            ["Today's lessons", "Each class and subject of the day, in order, with the room."],
            ["Attendance", "Present, absent or late for each student, with the gate's time next to each name. Absent students' parents are told."],
            ["Homework, set and marked", "Set homework with files for a class; read what came in, mark it and write feedback."],
            ["Scores and gradebook", "Enter the scores of quizzes, exams and assignments; see the class's gradebook for the term."],
            ["Behaviour", "Give merits and notes from the school's categories, and take back your own on the same day."],
            ["Syllabus", "Mark each topic of the plan as covered on a date, with a note."],
            ["Reports", "Write a report on a student or a class, keep it as a draft, send it, and answer the office's comments."],
            ["Messages", "Write to one family or to a whole class at once, inside the hours the school allows."],
            ["Bus duty", "Drivers and supervisors start the trip, share the bus's position and mark who got on and off."],
            ["Check in and leave", "Check in at the gate, and ask for sick or annual leave with a photo or PDF of the note."],
            ["Payslips", "Each month's payslip, what was paid and how, and its PDF."],
          ],
        },
        {
          name: "Parent",
          title: "A Parent tab only parents ever see",
          text: "One account for every child at the school. The server refuses the parent's screens to anyone else.",
          features: [
            ["Several children, one account", "Switch between children at the top; each has their own day."],
            ["Arrivals", "Told when a child checks in or out, and when they're late or leave early."],
            ["Attendance and scores", "Each child's days, the latest grades and the report card."],
            ["Fees", "What is due and what is paid, paid by card through the school's own account, with receipts."],
            ["The bus on the map", "The bus live, the child's stop and how soon it gets there; told when it's near and when the child gets on and off."],
            ["Permission slips", "Sign yes or no with your name, until the due date. Reminded the evening before."],
            ["Absence excuses", "A day or several, the reason and a photo of the doctor's note; the school answers in the app."],
            ["Pick-up", "Who may pick the child up, and today's note: \"Her grandfather picks her up.\""],
            ["Library books", "Each child's books, and when they're due."],
            ["Teachers' reports", "The reports the school chose to share."],
            ["Messages", "Write to your children's teachers, when the school allows it."],
            ["Calendar, exams, behaviour", "Events and exams per child, reminders the day before, and behaviour notes as the school chooses."],
          ],
        },
        {
          name: "Administration and staff",
          title: "The office, the gate, the buses and the books",
          text: "The principal and the office work in Studio on the web; office staff, caretakers and bus crews also have the staff app, Nakhla School Staff, in the same bundle.",
          features: [
            ["The staff app", "Its own app in the stores for teachers, office staff and bus crews, separate from the families' app."],
            ["The gate and the check-in board", "The gate's screen, the day's board (in, late, not in yet, left, absent, excused, on leave), the month's report as CSV, and corrections with a reason."],
            ["Salaries and payslips", "Salaries and allowances, the month's payslips, suggested deductions to accept or change, bonuses, advances paid back in instalments, the month locked, a CSV and a PDF for each payslip."],
            ["Leave", "Requests arrive with their papers; approve or refuse with a note, and approved days count as leave."],
            ["Teachers' reports", "An inbox of reports: comment, send back for changes, approve, and share with the parents."],
            ["Syllabus progress", "Every class against its plan, the ones behind first."],
            ["Buses", "Routes, stops on the map with their times, the students on each stop, each trip's history and a live map of the buses running now."],
            ["Library desk", "Lend and return by the student's code and the copy's code, the overdue list, the books held to collect, and books imported from a CSV file."],
            ["News", "For the whole school, a class, or teachers and staff only."],
            ["Messages", "Write to one teacher, all of them or a department; decide whether teachers and families may write to each other, when, and with files or text only."],
            ["Calendar and exams", "Events, holidays and exam days for the school, a grade, a class or the staff; publish the exams' timetable and the families are told."],
            ["Fees", "Fees per student, paid at the office or by card in the app, with receipts."],
            ["People from a sheet", "Classes, students, parents, teachers and staff imported from a spreadsheet."],
          ],
        },
        {
          name: "Universities",
          title: "The same project, in university mode",
          text: "A School project can run a university: faculties, programs, registration and results, with lecturers and advisors.",
          features: [
            ["Faculties and programs", "Departments and programs with their degree, credits to graduate and study plan."],
            ["Registration in the app", "Sections with the seats left, lectures that don't clash, prerequisites passed and the program's credits."],
            ["Waiting lists", "A full section takes a waiting list; the first student who fits takes a freed seat."],
            ["Advisors", "Each registration goes to the student's advisor, who approves it or sends it back with a note."],
            ["Lecturers", "Their sections, each lecture's attendance and grades on the university's scale."],
            ["Results and transcript", "Results by term with the term and cumulative GPA, and the transcript in the app and as a PDF."],
            ["Study plan", "What is done, in progress and left."],
            ["Parents", "They see their child's results, read only."],
          ],
        },
      ],
      bundleTitle: "Two apps and one dashboard, talking to each other",
      bundleText: "The families' app and the staff app are built and published under the school's name, from one Studio project. What happens in one shows up in the other at once.",
      bundleNodes: [
        ["Nakhla School", "Students and parents"],
        ["Yallapp Studio", "The principal and the office, on the web"],
        ["Nakhla School Staff", "Teachers, office staff and bus crews"],
      ],
      bundleFlows: [
        "Homework set in the Classroom reaches the student and the parent",
        "A check-in at the gate tells the parent",
        "The crew's phone moves the bus on the parent's map",
        "A payslip made in Studio opens in the teacher's app",
        "News for staff only never reaches families",
      ],
      compareTitle: "How it compares",
      compareText: "Companies that sell school apps, as their own sites describe them, next to Yallapp and to having an agency build one for you.",
      finale: {
        title: "In June, the hall is full",
        text: "A year of mornings like this one ends in a hall full of families. The marks, the days, the books and the trips are all in the app, and the school starts September with nothing to rebuild.",
      },
      photos: {
        "school-dawn": "Two children walking to school in the morning, hand in hand",
        "school-bus": "An old red and white school bus, with children waiting beside it",
        "school-gate": "A mother and her son on the pavement outside a school building",
        "school-teacher": "A teacher at the blackboard in front of a full classroom",
        "school-homework": "A girl writing in her notebook, a glass of water by her hand",
        "school-library": "Someone reading an open book in front of shelves of books",
        "school-office": "A school's staff room with desks, files and a blackboard",
        "school-graduation-1": "Graduates throwing their caps into the sky at sunset",
        "school-graduation-2": "Graduation caps thrown high over a crowd of graduates",
      },
    },
    rides: {
      navName: "Ride-hailing app",
      metaTitle: "A ride-hailing and taxi app, with its drivers' app",
      metaDescription: "A night ride across Cairo: the map with the taxis around, fares before you ask, the driver coming second by second, and home safe. A Yallapp Studio bundle.",
      summary: "The riders' app, the drivers' app under your name, and Studio for your team.",
      eyebrow: "Yallapp Studio · The ride-hailing bundle",
      title: "Home, after midnight",
      intro: "It is 23:40 and the last metro has gone. Ahmed stands at the curb with a dying phone and a long way home. Somewhere across the city, Hany's phone is on the dashboard of his car. In the next half hour, two apps will bring them together and get Ahmed to his door.",
      cast: "Ahmed is the passenger. Hany drives. The screens are the real apps, from our two demos: Lamha Taxi, the live taxi on the map, and Masar Rides.",
      chapters: [
        {
          time: "23:40",
          kicker: "At the curb",
          title: "The map wakes up around him",
          text: "Ahmed opens the app and it opens on the map, centred on him. Small taxis move on the streets nearby, live. He doesn't type his street: he taps My location for the pickup, and writes the name of the place he's going.",
        },
        {
          time: "23:41",
          kicker: "Where to",
          title: "He knows the fare before he asks",
          text: "Each kind of car comes with its fare and how soon it can be there. The company set those fares itself: a start, so much per kilometre and per minute, never under its minimum. Ahmed picks the cheapest, now, not later, and asks.",
        },
        {
          time: "23:41",
          kicker: "Hany's phone",
          title: "Twenty seconds to say yes",
          text: "The request goes to the nearest free driver first. Hany's phone sounds, and the offer counts down: the pickup, and the seconds left. If he lets it go, it moves to the next driver, and he isn't asked again. He taps Accept.",
          push: { app: "Lamha Taxi Driver", title: "New ride request", body: "R-2001: pickup at Talaat Harb Street. Accept it in the app." },
        },
        {
          time: "23:44",
          kicker: "The car comes",
          title: "Second by second, down the street",
          text: "Ahmed watches the car come round the corner on his screen before he sees it in the street. Hany's name, the car, its colour and plate, and a four-digit code. Hany won't start the trip until Ahmed tells him the code.",
          push: { app: "Lamha Taxi", title: "Your driver is on the way", body: "Hany Saeed accepted R-2001 (White Compact sedan · TX 4821)." },
        },
        {
          time: "23:52",
          kicker: "The back seat",
          title: "Someone at home is watching too",
          text: "Ahmed shares the ride with his sister, who is still awake. She follows the car on a page in her browser, no app needed. There is an emergency button on the ride's screen, and it calls the number the company chose. Tonight he won't need it.",
        },
        {
          time: "00:14",
          kicker: "Home",
          title: "The door, the fare, the stars",
          text: "The app shows the fare at the end. Ahmed pays Hany in cash; another night he might pay by card through the company's own payment page. He gives five stars. Hany's earnings for the night tick up, by day, by week and by month.",
          push: { app: "Lamha Taxi", title: "You've arrived", body: "R-2001 ended. The fare is E£85.00. Rate your driver in the app." },
        },
      ],
      interlude: {
        quote: "Two strangers, one city, thirty-four minutes.",
        text: "Matching, fares, the live map, the code, the receipt and the earnings: all of it ran by itself, by the company's own rules.",
      },
      statsTitle: "The rules are yours",
      stats: [
        "digits in the code the rider tells the driver, when you turn it on",
        "apps: one for riders, one for drivers, both under your name",
        "a ride booked for later starts looking for a driver",
        "of each fare goes to Yallapp: the fares, and your share of them, are yours",
      ],
      systemsTitle: "Every part, explained",
      systemsText: "A rider's app, a driver's app and the company's tools, as they are today.",
      systems: [
        {
          name: "Passenger app",
          title: "The map is home",
          text: "Riders start from \"Where to?\" and see everything before they ask.",
          features: [
            ["The map first", "The app opens on the map at the rider's place; for a taxi company, with the free taxis around them, moving."],
            ["Where to", "A place's name, My location, a pasted maps link, or a point on the map."],
            ["Now or later", "Ride now, or book a time when the company allows it."],
            ["Vehicle types", "Each type with its fare and how soon it can come."],
            ["The driver coming", "The driver's name, photo, car and plate, followed on the map."],
            ["The code", "A four-digit code the rider tells the driver to start, when the company turns it on."],
            ["Share the ride", "A link to the ride for someone at home, opened in any browser."],
            ["Emergency button", "On the ride's screen, calling the company's emergency number or the phone's own."],
            ["Cancel", "With a reason, free in the first minutes, then by the company's rule."],
            ["Pay", "In cash to the driver, or a card ride paid on the company's own payment page."],
            ["Rate", "Stars for the driver at the end."],
            ["My rides", "Every ride with its fare."],
          ],
        },
        {
          name: "Driver app",
          title: "One offer at a time, and the night's earnings",
          text: "Drivers have their own app, under the company's name, with their offers, rides and money.",
          features: [
            ["Online and offline", "The driver's position is sent only while they're online with the app open."],
            ["Offers with a countdown", "One offer at a time with a sound and the seconds left; accept, or let it go to the next driver."],
            ["Navigation", "The pickup and the drop-off open in the phone's own maps app."],
            ["The ride's stages", "Arrived, started with the rider's code, ended."],
            ["The fare", "Shown at the end: the fare given before the ride, or worked out from the distance and minutes."],
            ["Cash to collect", "What to take from the rider on a cash ride."],
            ["Earnings", "By day, week and month."],
            ["Its own app", "\"Lamha Taxi Driver\": its own store listing, icon and notifications."],
          ],
        },
        {
          name: "The company, in Studio",
          title: "Pricing, matching and the rules of the road",
          text: "The company runs everything from Studio on the web. Yallapp sets none of the amounts: every fare and fee is the company's.",
          features: [
            ["Vehicle types and fares", "A start, per kilometre, per minute, a minimum fare and paid waiting after the free minutes."],
            ["Fixed or metered", "The fare shown before the ride is the fare, or it is worked out at the end from the distance and the minutes."],
            ["Matching", "The nearest free driver of that type first, for the seconds you set, then the next; or your team gives each ride to a driver."],
            ["Cancellations", "Free minutes for the rider, a fee after them, and a no-show fee after the driver has waited."],
            ["Service areas", "Where pickups may be, or anywhere."],
            ["Rides for later", "A booked ride starts looking for a driver 15 minutes before its time."],
            ["Drivers", "Their documents, car and plate; approve them or suspend them."],
            ["Rides now", "The drivers online, each ride's stage; give a ride to a driver or cancel it."],
            ["Promo codes", "A share off the fare, up to a limit."],
            ["Statements", "The company's share of each fare, for all drivers or one driver's own."],
            ["Emergency number", "The number the ride's emergency button calls."],
          ],
        },
        {
          name: "Live taxi on the map",
          title: "Lamha Taxi: everything moves as it happens",
          text: "For taxi companies, a kind of its own, on the same rides engine.",
          features: [
            ["A full-screen map", "The free taxis around the rider, moving."],
            ["Live, on your own database", "Positions on the company's own Firebase Realtime Database; without one, the app asks every five seconds."],
            ["Your maps", "Google Maps with your own key, or your own OpenStreetMap tile server, with place search and routes."],
            ["The company's live map", "Drivers free and on a ride, and rides waiting, on the dashboard."],
          ],
        },
      ],
      bundleTitle: "Two apps and one dashboard",
      bundleText: "Riders and drivers have separate apps in the stores, both under the company's name, from one Studio project.",
      bundleNodes: [
        ["Lamha Taxi", "Riders"],
        ["Yallapp Studio", "The company, on the web"],
        ["Lamha Taxi Driver", "Drivers"],
      ],
      bundleFlows: [
        "A request goes to the nearest free driver",
        "The driver's position moves the car on the rider's map",
        "The fare follows the company's rules",
        "A card ride is paid into the company's own account",
        "Each fare lands in the driver's earnings and the company's statement",
      ],
      compareTitle: "How it compares",
      compareText: "Companies that sell ride-hailing apps, as their own sites describe them, next to Yallapp and to having an agency build one.",
      finale: {
        title: "Tomorrow night, again",
        text: "Hany goes back online at ten. Ahmed won't think about the app until he needs it. That is how it should be.",
      },
      photos: {
        "rides-night-city": "A city's streets at night, full of car lights",
        "rides-waiting": "Someone waiting alone on a bench at night",
        "rides-driver": "A driver's hands on the steering wheel",
        "rides-backseat": "A passenger looking out of a car window",
        "rides-arrive-home": "The lit entrance of a building at night",
      },
    },
    delivery: {
      navName: "Delivery app",
      metaTitle: "A delivery and courier app, with a courier app under your name",
      metaDescription: "From a small shop's shelf to the customer's door: send a parcel, see the price, follow the courier live, cash or card. A Yallapp Studio bundle.",
      summary: "The customers' app, a courier app under your name, and Studio for dispatch.",
      eyebrow: "Yallapp Studio · The delivery bundle",
      title: "From Hany's shelf to a stranger's door",
      intro: "Hany sells handmade leather in a shop the size of a kitchen. This morning, twelve orders came in overnight. Karim rides for the courier company two streets away. By lunchtime every box will be at its door, and Hany won't have made a single phone call.",
      cast: "Hany owns the shop. Karim is the courier. The screens are the real apps, from our delivery demo, Sahm Express.",
      chapters: [
        {
          time: "09:10",
          kicker: "The shop",
          title: "Twelve boxes on the counter",
          text: "Hany tapes the last box and writes nothing on paper. Everything he needs is in the courier company's app: the service, where to pick up, where to drop off, who receives it and what is inside.",
        },
        {
          time: "09:25",
          kicker: "Send",
          title: "The price, while he types",
          text: "He taps My location for the pickup and pastes the customer's maps link for the drop-off. The price appears as he types, worked out by the company's own rule: by distance, by area, or one fixed price. He chooses cash, and the app will show the courier exactly what to collect.",
          push: { app: "Sahm Express", title: "We got your shipment", body: "S-1001 is waiting for a courier. We'll tell you when one is on the way." },
        },
        {
          time: "09:31",
          kicker: "Karim",
          title: "The first to accept takes it",
          text: "Karim is on duty. The job appears on his phone with the pickup and the cash to collect, and he takes it before anyone else does. The company could also give jobs out itself, one by one. He works in the courier app with the company's own name on it.",
          push: { app: "Sahm Express Courier", title: "A new job is waiting", body: "S-1001 from Hany's Leather, Nasr City. Take it in the app." },
        },
        {
          time: "10:05",
          kicker: "On the way",
          title: "A dot crossing the bridge",
          text: "The customer follows the parcel stage by stage, and on the map while it's on the way and Karim has the job open. Nothing is shared when his app is closed, and the last position disappears after ten minutes.",
          push: { app: "Sahm Express", title: "Your parcel is on the way", body: "S-1001 is on its way to the drop-off." },
        },
        {
          time: "10:32",
          kicker: "The door",
          title: "Two hands, one box",
          text: "Karim rings, hands the box over and marks it delivered. Had nobody been home, he would have marked it \"couldn't deliver\" with the reason, and the company would know at once.",
          push: { app: "Sahm Express", title: "Delivered", body: "S-1001 was delivered. Thank you for sending with us." },
        },
      ],
      interlude: {
        quote: "Twelve parcels. No phone calls.",
        text: "Hany is packing tomorrow's orders. Karim is three jobs further. The company's dashboard shows all of it as it happens.",
      },
      statsTitle: "Built around the company's own rules",
      stats: [
        "ways to price: by distance, by area, or one fixed price",
        "ways to pay: cash to the courier, or card through your own account",
        "the last position stays on the map, then it's gone",
        "of each delivery goes to Yallapp: your prices are yours",
      ],
      systemsTitle: "Every part, explained",
      systemsText: "The customers' app, the couriers' app and the company's dispatch, as they are today.",
      systems: [
        {
          name: "Customer app",
          title: "Send it, see the price, follow it",
          text: "For shops and people who send parcels with the company.",
          features: [
            ["Send a parcel", "The service, the pickup, the drop-off, the recipient and the parcel."],
            ["Places in seconds", "A place's name, My location, a pasted maps link or the map."],
            ["The price as they type", "By the company's rule, before they confirm."],
            ["Card or cash", "By card on the company's own payment page, or in cash to the courier."],
            ["Follow it", "Each stage, and the courier on the map while it's on the way."],
            ["My shipments", "Every shipment; pay for one or cancel it."],
            ["Notifications", "Picked up, on the way, delivered, or couldn't be delivered."],
          ],
        },
        {
          name: "Courier app",
          title: "Jobs, steps and the cash to collect",
          text: "Couriers work in their own app under the company's name, or in the courier mode of the main app.",
          features: [
            ["On and off duty", "One switch; only couriers on duty get waiting jobs."],
            ["My jobs", "Their jobs, the ones waiting to be taken, and the ones done."],
            ["Each job's steps", "Picked up, on the way, delivered, couldn't deliver with a reason, or give it back."],
            ["Cash to collect", "The amount, on the job."],
            ["Calls and directions", "Call the customer; open the way in the phone's maps app."],
            ["Position, only when needed", "Shared while a parcel is on the way and the screen is open."],
            ["Its own store app", "\"Sahm Express Courier\": its own listing, icon and notifications, unlisted on the App Store for your couriers only."],
            ["Or Yallapp Courier", "One app for couriers who ride for several companies; it's coming to Google Play and the App Store."],
          ],
        },
        {
          name: "Dispatch, in Studio",
          title: "Every parcel and every courier, on one page",
          text: "The company runs deliveries from Studio on the web: today's shipments and the couriers on duty first.",
          features: [
            ["Shipments", "Give one to a courier, move it on, or cancel it."],
            ["Couriers", "Add them by mobile number or email; see who is active and who is on duty."],
            ["Prices", "By distance (a start, per kilometre, a minimum and a longest distance), by area, or fixed; a service may add to it."],
            ["Jobs", "Given out by the team, or taken by the first courier on duty who accepts."],
            ["Payment", "Cash, card through the company's own gateway, or both; the paid orders listed."],
            ["Maps", "Stages only, or the courier live on the map."],
            ["Notifications", "To customers at every step, and to couriers for new jobs and changes."],
            ["Languages", "Studio in English, Arabic and Turkish; the apps in your customers' languages."],
          ],
        },
      ],
      bundleTitle: "Two apps and one dashboard",
      bundleText: "Customers and couriers have separate apps, both under the company's name, from one Studio project.",
      bundleNodes: [
        ["Sahm Express", "Customers and shops"],
        ["Yallapp Studio", "Dispatch, on the web"],
        ["Sahm Express Courier", "Couriers"],
      ],
      bundleFlows: [
        "A new shipment goes to the couriers on duty",
        "Each step the courier taps tells the customer",
        "The courier's position moves the parcel on the customer's map",
        "Cash collected and card payments show in Studio",
      ],
      compareTitle: "How it compares",
      compareText: "Companies that sell delivery software and courier apps, as their own sites describe them, next to Yallapp and to an agency build.",
      finale: {
        title: "Tomorrow, twelve more",
        text: "Hany writes back to a customer who loved the wallet. Karim is already on his next job. The company's day is on one page.",
      },
      photos: {
        "delivery-rider": "A courier sitting on his motorbike with a delivery box",
        "delivery-boxes": "Someone stacking boxes in a dark storeroom",
        "delivery-handover": "A cardboard box passed from one pair of hands to another",
        "delivery-shop-owner": "A man packing a parcel at his desk",
        "delivery-van": "A delivery tricycle in a narrow street",
        "delivery-map": "A city at night, seen from above",
      },
    },
    "multi-vendor": {
      navName: "Multi-vendor app",
      metaTitle: "A multi-vendor app for restaurants and supermarkets, like the big ones",
      metaDescription: "Friday lunch in Cairo: a busy kitchen running late, a supermarket weighing apples, a courier on the map and a family at the table. A Yallapp Studio bundle.",
      summary: "The customers' app, the places' app and web panel, the couriers' app, and Studio for you.",
      eyebrow: "Yallapp Studio · The multi-vendor bundle",
      title: "Friday lunch in Cairo",
      intro: "Friday, a little after noon. Every family in the city is hungry at the same moment. In Zamalek a grill is on fire with orders, in Mohandessin a supermarket is weighing apples, and in one flat the Fathys are deciding what everyone wants. One app holds all of it together.",
      cast: "Chef Hassan runs Bab El Sharq Grill. Zad Market is the supermarket. Mona Fathy's family is hungry. The screens are the real app, from Zad, our multi-vendor demo.",
      chapters: [
        {
          time: "12:40",
          kicker: "The living room",
          title: "Five people, five opinions",
          text: "Mona Fathy opens Zad. Restaurants and the supermarket in one app, the offers at the top, her address already set. The grill for lunch, and fruit and bread for the week from Zad Market, in two orders she'll follow side by side.",
        },
        {
          time: "13:05",
          kicker: "The kitchen",
          title: "Chef Hassan doesn't close",
          text: "The grill is full and the orders keep coming. Before, he would have closed the shop for an hour. Now he taps Running late: twenty more minutes, \"high demand\", for one hour. Customers see the longer time and a note on his card, and keep ordering. It ends by itself.",
        },
        {
          time: "13:15",
          kicker: "The supermarket",
          title: "One and a half kilos of red apples",
          text: "At Zad Market the picker weighs the apples. They're sold by the kilo in half-kilo steps, so the basket showed an estimate; the weighed price can change a little, never by more than the percent the app's owner set. The mangoes are out, and she chose \"leave it out\" for anything missing.",
        },
        {
          time: "13:40",
          kicker: "On the road",
          title: "Karim, across the city",
          text: "Karim, a courier, carries the groceries. Mrs. Fathy watches his motorbike on the map. The grill brings its own order with its own driver and she follows that one by its steps. Each place chooses who delivers.",
          push: { app: "Zad", title: "Your order is on the way", body: "Z-1207 is on its way to you." },
        },
        {
          time: "14:30",
          kicker: "The table",
          title: "Everyone eats",
          text: "The kofta is still hot. The bread is warm. Nobody remembers the twenty minutes. If something had been missing, Mrs. Fathy could have opened a complaint from the order, until forty-eight hours after it arrived, and the app's own support team would have decided: a refund to her card or wallet, a coupon, or a reason.",
        },
      ],
      interlude: {
        quote: "The kitchen ran late. Nobody went hungry.",
        text: "Places run their own hours, delays and offers. The app's owner sees every change, and can undo it.",
      },
      statsTitle: "The rules of a city's lunch",
      stats: [
        "kinds of places: restaurants, supermarkets and shops",
        "roles in a place's team: owner, manager, order taker, picker",
        "to complain about an order after it arrives",
        "of each order goes to Yallapp: commission and fees are between you and the places",
      ],
      systemsTitle: "Every part, explained",
      systemsText: "Customers, the places, the couriers and the app's owner, each with their own app or panel.",
      systems: [
        {
          name: "Customer app",
          title: "Restaurants and the supermarket, in one basket of habits",
          text: "Home, Search, Orders, Club and Account, in your colours and your name.",
          features: [
            ["Browse and search", "Places, dishes and products, by kind, cuisine and offers, with filters."],
            ["Dishes with their options", "Sizes, sides and extras, as each restaurant sets them."],
            ["Groceries by the piece or the kilo", "Weighed items priced by weight, and the choice when something is missing: a similar one, a chosen one, or leave it out."],
            ["Delivery or pick-up, now or later", "Pick up at the place with a code, or order for a time from the place's hours."],
            ["Pay", "Cash, card, or Apple Pay and Google Pay where your payment provider offers them."],
            ["Coupons and offers", "Your codes, automatic offers and the places' own."],
            ["The club", "Free or cheaper delivery, monthly or yearly, at the prices you set."],
            ["The wallet", "Refunds and credit, used for all or part of an order."],
            ["Follow the order", "The courier on the map, or the steps when the place delivers itself."],
            ["Support and complaints", "Talk to your support team in the app; complain about an order until 48 hours after it arrives."],
          ],
        },
        {
          name: "The places: app and web panel",
          title: "Every restaurant and shop runs its own counter",
          text: "Each place has its own app in the bundle, \"Zad Partner\", and its own panel on the web with its own sign-in.",
          features: [
            ["Orders, live", "New orders with a sound; accept with a time, turn down, mark ready and handed over."],
            ["Running late", "Ten to sixty more minutes with a reason customers see, for half an hour to two hours or until it ends it."],
            ["Hours and days off", "Its own weekly hours, days off and preparation time, applied at once."],
            ["Menu, catalog and stock", "Dishes, departments, aisles and products; in or out of stock."],
            ["Imports", "Products from Excel, CSV and other sheets, and photos placed by SKU or barcode."],
            ["Photos", "A main photo and up to eight more for each product; the ones that need a photo marked."],
            ["Its own offers", "Coupons and automatic offers it pays for itself."],
            ["Its own delivery", "When it delivers itself: its fee, fixed or by the kilometre, and its smallest order."],
            ["Its team", "Owner, managers, order takers and pickers, each seeing only their part."],
            ["Statements", "Sales, discounts, commission, tax and refunds, exported as Excel, CSV or PDF."],
            ["No customer's contact", "Only the first name and the order; complaints about its orders to read."],
          ],
        },
        {
          name: "Couriers",
          title: "The app's couriers, or the place's own",
          text: "Each place chooses: the app's couriers, followed live on the map, or its own delivery.",
          features: [
            ["Jobs", "Pickups from the places and drop-offs at the customers."],
            ["Live on the map", "The customer follows the courier while the order is on its way."],
            ["Cash to collect", "On cash orders, the amount on the job."],
            ["Its own app", "A courier app under your name, with its own listing and notifications."],
          ],
        },
        {
          name: "The owner, in Studio",
          title: "You run the city's lunch from one dashboard",
          text: "The app's owner, its support team and its managers work in Studio on the web.",
          features: [
            ["Joining", "Your own joining form; accept a place and it gets its account and first staff member."],
            ["Commission and tax", "A percentage or a fixed amount per place, and taxes included or added."],
            ["Delivery areas", "Each place by a radius from its address, or by your named areas; with no areas, open everywhere. Outside, the app says so instead of a time."],
            ["Offers and coupons", "Codes and automatic offers; let places make their own, up to the largest percentage you allow, and pause any of them."],
            ["The club", "Its plans and prices, monthly or yearly."],
            ["Wallets", "Credit and refunds in the customers' wallets."],
            ["Complaints and refunds", "A queue of cases: refund all or part to the payment, the wallet or as a coupon, a compensation, or no refund with the reason."],
            ["Statements", "Every place's account for any period: sales, who paid each discount, commission, delivery, tax and refunds."],
            ["Changed by the place", "When a place changes its hours, days off or delay, you see it, and keep it or undo it."],
            ["Photos required", "Whether every product needs a photo before customers see it."],
            ["All orders", "Every order across every place, and stepping in when needed."],
          ],
        },
      ],
      bundleTitle: "Four apps and one dashboard",
      bundleText: "Customers, places and couriers each have their own app under your name, and the places a web panel too, all from one Studio project.",
      bundleNodes: [
        ["Zad", "Customers"],
        ["Yallapp Studio", "You and your support team"],
        ["Zad Partner", "Restaurants and shops"],
        ["Zad Courier", "Couriers"],
      ],
      bundleFlows: [
        "An order rings at the place's counter",
        "A delay or new hours show on the customer's screen at once",
        "The courier's position moves on the customer's map",
        "A complaint reaches your support team, never the place's phone",
        "Every order lands in the place's statement",
      ],
      compareTitle: "How it compares",
      compareText: "Companies that sell multi-vendor delivery apps, as their own sites describe them, next to Yallapp and to an agency build.",
      finale: {
        title: "Next Friday, the same table",
        text: "Chef Hassan's delay ended at two. Zad Market is restocking mangoes. The Fathys will argue about lunch again next week, and the app will be ready.",
      },
      photos: {
        "zad-family-meal": "Plates, bread and a pot of stew on a family table",
        "zad-kitchen-rush": "Cooks at work over the flames of a busy kitchen",
        "zad-grill": "Skewers of meat over a charcoal grill, smoke rising",
        "zad-market-aisle": "Limes weighed on a scale at a market stall",
        "zad-rider-food": "A courier on a motorbike with a delivery box",
        "zad-cafe": "A barista at work behind a café counter",
        "zad-friday": "Friends sharing a meal around a small table outside",
      },
    },
    academy: {
      navName: "Academy app",
      metaTitle: "An online academy app with live classes, designed in Yallapp Studio",
      metaDescription: "A day with Ufuq Academy: calligraphy at breakfast, two courses in one checkout, a live class at 19:30 and a 12-day streak. The premium academy template in Studio.",
      summary: "The academy's own app for its students, its courses in Yallapp or on WordPress, and every screen designed in Studio.",
      eyebrow: "Yallapp Studio · The premium academy",
      title: "Twelve days in a row",
      intro: "Sara learns before work, on the way, at lunch and after dinner, a few minutes at a time. Her academy's app keeps her place, counts her minutes and tells her when class starts. This is one of her days, from the first code of the morning to the last lesson at night.",
      cast: "Sara Yılmaz is learning Arabic calligraphy with Leila Haddad and, by tonight, UX design with Deniz Kaya; at 19:30 she has a live class on content marketing. Ufuq Academy is the premium academy template's demo, and every screen below is the real app. The demo's lessons are written ones; the video player you see is the one an academy with video lessons gets.",
      chapters: [
        {
          time: "07:20",
          kicker: "A new phone",
          title: "No password to remember",
          text: "Sara's old phone gave up last week. On the new one she installs Ufuq Academy, types her number and the one-time code that comes to it, while a ring on the screen counts down the time it's good for. No password to type. Her account opens as she left it: two courses, thirty-eight hours of learning, her orders and her quiz results. Her place in every lesson was kept by the academy, not by the old phone.",
        },
        {
          time: "07:35",
          kicker: "Breakfast",
          title: "Good morning, Sara",
          text: "Wednesday, 11 November, and her name at the top. Below it, the course she's taking: Arabic Calligraphy for Beginners with Leila Haddad, lesson 12 of 18, Alif and Ba in Naskh, 14 minutes left, 61% done, and a button to go on. Beside her learning streak of twelve days is tonight's live class, Content marketing, at 19:30. Further down, courses picked for her.",
        },
        {
          time: "08:10",
          kicker: "On the way",
          title: "A quarter more than last week",
          text: "On the tram she looks at her week: 3 h 20 min so far, 25% more than last week, a bar for each day, counted from the time she really spent in lessons. One course in progress, one completed, and the calligraphy in a ring at 61%, eleven lessons of eighteen behind her.",
        },
        {
          time: "12:30",
          kicker: "Lunch break",
          title: "Something new to learn",
          text: "In Explore she searches and taps a subject: Design, Business, Languages, Photography. The chips narrow it down: all, free, top rated, newest. Each course is a row with its badge, rating, lessons, teacher and price. UX Design Fundamentals by Deniz Kaya is New and rated 4.9; Excel for Small Business Owners is a Bestseller, and free.",
        },
        {
          time: "12:36",
          kicker: "The course's page",
          title: "Before she decides",
          text: "A tall cover with the subject, Design, a Certified certificate tag, 4.9 from 418 reviews, 32 lessons and 10 h 10 min. Deniz Kaya on a card of their own. The curriculum, About the course and the reviews are chips; she opens the units and reads the reviews. At the foot: ₺1,450, and Join now in gold.",
        },
        {
          time: "12:44",
          kicker: "The cart",
          title: "Two courses, one checkout",
          text: "She adds Social Media That Sells beside it: ₺2,550 for both, a field for the academy's coupon, and the card she saved, shown only by its brand, its last four digits and its expiry. Pay ₺2,550 securely, in gold. Paying by card in the app is for Android, when the academy turns it on; on iPhone, courses are bought through Apple's in-app purchase or not at all. The cart, the coupon and the saved card come with academies on WordPress with Tutor LMS selling through WooCommerce: the site's payment gateway keeps the card, and its number never reaches the app or Yallapp. The demo runs on Yallapp, so there Join now opens a demo payment page that takes no card.",
        },
        {
          time: "19:15",
          kicker: "The live class",
          title: "Fifteen minutes early",
          text: "The reminder came in the hour before. At a quarter past seven, fifteen minutes before it starts, the Join button opens Content marketing in the meeting app the academy uses. Had she missed it, the recording would have been in the app once the class was over.",
        },
        {
          time: "21:50",
          kicker: "Night",
          title: "Layout principles",
          text: "By night she's three lessons into her new course: lesson 4 of 5, Unit 2, Layout principles. At 04:32 she wrote a note, and it keeps its moment in the video: \"The rule: 8 px for every space, doubled between sections.\" Two files wait beside her notes, the spacing guide among them, and 24 messages in the discussion. Next comes Grids and spacing, 22 minutes; the Unit 2 quiz, ten questions, opens after this lesson.",
        },
      ],
      interlude: {
        quote: "Twelve days in a row, a few minutes at a time.",
        text: "Every card on Sara's home screen comes from what she really did: the lessons she finished, the minutes she spent, the class she joined.",
      },
      statsTitle: "Small facts behind a student's day",
      stats: [
        "before a live class, its Join button opens",
        "back or forward in a lesson's video, with one tap",
        "languages the template comes in: English, Arabic right to left, and Turkish",
        "card numbers that reach the app or Yallapp: a saved card stays with the site's payment gateway",
      ],
      systemsTitle: "Every part, explained",
      systemsText: "The student's app, buying courses, the academy's dashboard, the design in Studio and what a WordPress site adds, as they are today.",
      systems: [
        {
          name: "Student app",
          title: "A home that knows where she stopped",
          text: "Home, Explore, My courses and Account, under a frosted bar in the academy's colours, in light and dark.",
          features: [
            ["Greeting and her own cards", "Today's date and the student's name; the course she's taking with the lesson she's on, the minutes left and a button to go on."],
            ["Learning streak", "The days in a row she learned, over this week's days."],
            ["This week's learning", "Bars by day and the change from last week, from the time really spent in lessons while the app is open."],
            ["Explore", "A large title, search with filters, subjects as icons, and chips for all, free, top rated and newest."],
            ["The video player", "Speed, full screen, and ten seconds back or forward, for academies with video lessons."],
            ["Notes, files and discussion", "Her own notes at their moment of the video, the lesson's files and its discussion."],
            ["Quizzes and certificates", "The unit's quiz after its lessons, the score at once, and a certificate when the course is done."],
            ["Live classes", "When the next one starts, joining from fifteen minutes before in the meeting app, and the recording afterwards."],
            ["My courses", "Learning and completed, and saved where the site keeps a wishlist, with their counts; each course with a ring for how far she is."],
            ["Downloads", "Lessons saved on the phone for when there's no connection, kept encrypted, where the academy offers them."],
            ["Account", "Her courses, certificates and hours of learning; orders, certificates, quiz results, dark mode, notifications, language and settings."],
            ["Sign in by phone", "A one-time code instead of a password, with a timer ring on the code screen; or by email."],
            ["Protected video", "Uploaded videos play from links that expire, with a watermark of the student's number."],
          ],
        },
        {
          name: "Buying courses",
          title: "Join now, by the stores' rules",
          text: "Free courses are one tap away on Android and iPhone. Paid ones are bought only where the stores' rules allow it.",
          features: [
            ["Free courses", "Joined with one tap, on Android and iPhone."],
            ["Join now, in gold", "On the course's page, with its price, and the old price and the saving when it's on sale."],
            ["Card on Android", "Paid by card in the app on Android, when the academy turns it on."],
            ["On iPhone", "Courses bought through Apple's in-app purchase, or not sold in the app at all."],
            ["The cart", "With WordPress and WooCommerce, several courses in one checkout, each with its picture and its price."],
            ["The site's coupon", "With WordPress and WooCommerce, a coupon of the site's and what it takes off."],
            ["The saved card", "With WordPress and WooCommerce, the card saved with the site's payment gateway: its brand, last four digits and expiry. Card numbers never reach the app or Yallapp."],
            ["Orders", "Every order, in the student's account."],
          ],
        },
        {
          name: "The academy's dashboard",
          title: "Courses, classes and students, on the web",
          text: "An academy without a website runs its courses from the dashboard's Courses page, and changes show in the app at once.",
          features: [
            ["Courses", "A title, a cover, a price or free, a teacher, a level and categories; hidden while it's being made."],
            ["Sections and lessons", "Written lessons, or video from the media library, YouTube, Vimeo or a file's address; files and free previews."],
            ["Quizzes", "A pass mark, attempts and a time limit; the right answers never reach the app."],
            ["Assignments and live classes", "In the course's sections, in the academy's own order."],
            ["Certificates", "For students who finish every lesson and pass every quiz, with the academy's logo and colour, and a code that proves them."],
            ["Lessons that open later", "Some days after enrolling or on a date; and access that ends after the days you choose."],
            ["Learning paths", "Courses one after another, and courses to finish before another."],
            ["Students' progress", "Each student's lessons, best scores and last time learned, and all of it as a CSV file."],
            ["Add a student by phone", "For a course sold another way, by the number they sign in with."],
            ["Devices", "How many devices each student may use."],
            ["Notifications", "A new lesson, a live class in the hour before, a graded assignment and the study reminder go by themselves; and your own messages."],
            ["Questions and reviews", "Answer students' questions; reply to reviews or hide them."],
            ["Points and badges", "When you turn them on: points for lessons, quizzes and streak days, badges, and leaderboards with first names only."],
          ],
        },
        {
          name: "Designed in Yallapp Studio",
          title: "Every colour is the academy's",
          text: "The premium academy is a Studio template: navy and gold to begin with, and every part of it the owner's to change.",
          features: [
            ["Colours", "The main colour is the brand's, gold the second; every colour can be changed."],
            ["The bar", "A frosted floating bar that names every tab, the open one in the academy's colour."],
            ["Every screen's look", "Home, Explore, the course's page, the lesson, My courses, the account and the cart, each designed in Studio."],
            ["Light and dark", "Every screen in both, and the student chooses."],
            ["Sign-in", "The welcome over a photo or the app's colours, and the form on a card."],
            ["Course cards", "Rows with their badge, rating, lessons, teacher and price, or covers with a gold badge."],
            ["Three languages", "English, Arabic right to left, and Turkish."],
            ["A web page as a tab", "On WordPress, the site's blog in the app, with its header and footer hidden."],
          ],
        },
        {
          name: "With a WordPress site",
          title: "Tutor LMS and WooCommerce, in step with the app",
          text: "An academy that already sells on WordPress with Tutor LMS keeps its site: the app takes its courses, students and orders from it.",
          features: [
            ["Courses from the site", "Its courses, lessons and quizzes, graded by the LMS."],
            ["Progress in step", "A lesson completed in the app is completed on the site."],
            ["Reviews, questions, wishlist", "When the LMS has them."],
            ["Following teachers", "On WordPress, and in an academy with many teachers: follow a teacher, and their new course reaches the inbox and the phone."],
            ["One checkout", "Every course in the cart goes to the site's WooCommerce checkout, with the coupon and the saved card chosen."],
            ["Saved cards", "Kept by the site's payment gateway; the app shows only the brand, the last four digits and the expiry."],
          ],
        },
      ],
      bundleTitle: "One app, one dashboard, and your website if you have one",
      bundleText: "The students' app is built and published under the academy's name from one Studio project. Its courses come from Yallapp, or from the academy's WordPress site.",
      bundleNodes: [
        ["Ufuq Academy", "Students, on Android and iPhone"],
        ["Yallapp Studio", "The academy: its design, courses and students"],
        ["The academy's website", "WordPress with Tutor LMS, if it has one"],
      ],
      bundleFlows: [
        "A lesson completed keeps her place on every device",
        "Minutes in a lesson add up in this week's learning",
        "A new lesson reaches the course's students",
        "The last quiz passed brings the certificate",
        "A design published in Studio shows in the app",
        "On WordPress, progress and orders stay in step with the site",
      ],
      compareTitle: "How it compares",
      compareText: "Companies that sell course platforms with apps, as their own sites describe them, next to Yallapp and to having an agency build an app for you.",
      finale: {
        title: "Tomorrow makes thirteen",
        text: "Sara will open the app with her breakfast again, on lesson 12 of the calligraphy and lesson 4 of the design course. Leila Haddad is writing next week's lesson, and when it's added, her students will hear of it. One day there will be a certificate; the mornings before it are what the app is for.",
      },
      photos: {
        "academy-desk": "A woman studying at her desk with a laptop and a notebook",
        "academy-phone": "A woman with a cup of coffee, looking at her phone",
        "academy-breakfast": "A young woman at her desk with a laptop, a book and her breakfast",
        "academy-live": "Someone at a laptop late in the evening, by a window over the city",
        "academy-evening": "Buildings lit up in the evening",
        "academy-graduation": "A graduate in her cap, laughing",
      },
    },
    flowers: {
      navName: "Flower shop app",
      metaTitle: "A flower shop app with delivery slots and a gift checkout, designed in Yallapp Studio",
      metaDescription: "A day with Leqaa: a birthday remembered at 20:40, tomorrow's slot, the card's words and flowers at her door by two. The flower shop template in Studio.",
      summary: "Same-day and next-day delivery in time slots, a gift checkout, card messages by occasion and flash sales, on your products or your shop's platform.",
      eyebrow: "Yallapp Studio · The flower shop",
      title: "Tomorrow, between one and four",
      intro: "Omar works in Alexandria. His mother lives in Cairo, and tomorrow is her birthday. He remembers at 20:40, with his dinner on the stove. This is how that evening becomes flowers at her door the next afternoon, one step at a time.",
      cast: "Omar Hassan sends flowers to his mother, Salma Adel, in Zamalek. Leqaa is the flower shop template's demo: a shop in Cairo whose bouquets and prices are made up, and every screen below is the real app. The delivery days, card messages, flash sales and codes in the story come with every store app; in the demo, the payment page takes no card.",
      chapters: [
        {
          time: "20:40",
          kicker: "Alexandria, after work",
          title: "Tomorrow is the fifteenth",
          text: "Omar is warming up his dinner when he sees the date on his phone. Tomorrow is the fifteenth: his mother's birthday. He is three hours away, with a meeting at ten. He has had Leqaa on his phone since Mother's Day in March. He opens it, and the shop's occasions fill the screen one after another, in its night colours. Send today says that orders for today closed at 16:00. Tomorrow is open.",
        },
        {
          time: "20:44",
          kicker: "Blush hour",
          title: "Two hours left",
          text: "Further down, a garnet band says Flash sale, with a timer counting down from 1:59. It's the shop's Blush hour: Blush Garden at a quarter off, the old price struck through, and a bar that shows only four of twelve are left. When the timer reaches zero, the price goes back up. He doesn't think for long. Blush is the colour of her curtains.",
        },
        {
          time: "20:47",
          kicker: "The bouquet's page",
          title: "Add a little more",
          text: "On Blush Garden's page the same timer keeps counting, beside the sale price and the price before it. Blush roses, lisianthus and eucalyptus, made on the day it is delivered, in three sizes by the stems: Classic with 12, Deluxe with 24, Grand with 36. He takes Deluxe. Under Add a little more are the shop's extras: a ceramic vase, a box of chocolates and a card. He adds the chocolates and the card. She always says she doesn't want chocolates, and she always finishes them.",
        },
        {
          time: "20:52",
          kicker: "From, for, when",
          title: "Tomorrow, after lunch",
          text: "The checkout is five steps on one screen: from, for, when, the message, pay. From: his name, phone and email, and no address, because the flowers aren't going to him. For: her name, her phone and her address in Zamalek, in Cairo, one of the cities the shop delivers to, with her door pinned on the map, because Leqaa prices delivery by distance. When: today is struck through. He taps Tomorrow. The morning slot is full: other people remembered earlier. He takes 13:00–16:00.",
        },
        {
          time: "20:55",
          kicker: "The card",
          title: "The words he couldn't find",
          text: "He taps Birthday among the occasions, and the shop's ready messages appear as cards. The first one says what he would say, if he were better with words. He could change every word, or write his own. He changes nothing. Send anonymously stays off: she should know it's him. At the top of the screen, the card already reads To Salma Adel, From Omar Hassan, beside a photo of the bouquet.",
        },
        {
          time: "20:58",
          kicker: "Pay",
          title: "A code, and the fee line by line",
          text: "The last step lists the bouquet, the chocolates and the card, and keeps Tomorrow, 13:00–16:00 in view. The shop shows its code in the app, LEQAA10; he copies it, and ten percent comes off. The delivery fee says how it was worked out: a base fee, two kilometres from the shop, and nothing extra for his slot. He pays by card on the shop's payment page. The order is in Orders, with tomorrow's slot on it. He finishes his dinner.",
        },
        {
          time: "08:30",
          kicker: "Sunday, at the shop",
          title: "The day's orders, slot by slot",
          text: "Mariam opens Leqaa's orders for the day. Omar's says Sunday, 15 November, 13:00–16:00, with its delivery fee. Under it: who it's from and who it's for, their phones, the address in Zamalek, and the card's words. She writes them by hand inside a folded card, makes Blush Garden with twenty-four stems and wraps it in blush paper. A little after one, it leaves with the shop's courier.",
        },
        {
          time: "14:05",
          kicker: "Zamalek, third floor",
          title: "At her door",
          text: "Salma opens the door to a bouquet the colour of her curtains, a box of chocolates and a small card. The courier is already on the stairs when she reads it. At the shop, Mariam marks the order complete. In Alexandria, between two meetings, Omar's phone lights up.",
          push: { app: "Leqaa", title: "Order 1042", body: "Your order is complete. Thank you!" },
        },
      ],
      interlude: {
        quote: "Remembered at 20:40. At her door by two.",
        text: "Everything in between was the shop's own: its cut-off, its slots and their limits, its card messages, its offers and its delivery prices, set once and checked on every order.",
      },
      statsTitle: "Small facts behind one bouquet",
      stats: [
        "steps in the gift checkout: from, for, when, the message and pay",
        "occasions the card messages start with, each with ready words in English, Arabic and Turkish",
        "time slots a day at most, each with its own limit and its own fee",
        "ways to price delivery: one price, by city, by the km and by the kg",
      ],
      systemsTitle: "Every part, explained",
      systemsText: "Delivery days and times, the bouquet and its add-ons, the gift checkout, card messages, where the shop delivers and what it costs, flash sales and codes, the two looks and where the products come from, as they are today.",
      systems: [
        {
          name: "Delivery days and times",
          title: "Today until the cut-off, then tomorrow",
          text: "The shop decides when it delivers. The app offers only what can still be chosen, and the server checks it again on every order, in the shop's time zone.",
          features: [
            ["Same day, until a cut-off", "Today can be chosen until the time you set. After it, today is struck through."],
            ["Next day and days ahead", "Tomorrow, and up to 60 days ahead, as far as you allow."],
            ["Closed days", "The weekdays you don't deliver are never offered."],
            ["Time slots", "Up to 8 a day, like 10:00–13:00. Today's slots can be chosen until they start."],
            ["A limit per slot", "How many orders a slot takes. A full slot can't be chosen, and the server checks it again at checkout."],
            ["A fee per slot", "An extra for the evening, added to the delivery fee."],
            ["Always asked", "In the gift checkout, the day and the slot are required."],
          ],
        },
        {
          name: "The bouquet and its add-ons",
          title: "Add a little more",
          text: "A bouquet's page made for giving: its sizes, its flash sale, and the small extras that go with it.",
          features: [
            ["Sizes", "A bouquet in sizes, like Classic, Deluxe and Grand by the stems, each with its own price."],
            ["Add a little more", "Chocolates, a card, a vase and the like, offered with the bouquet on its page."],
            ["Never on their own", "An add-on is sold only with a bouquet, never as a main product in the shop."],
            ["You decide", "You mark which products are add-ons, and which products they are offered with."],
            ["In the cart and at checkout", "The add-ons are offered again in the cart and at checkout, and listed with the bouquet."],
            ["Its flash sale on its page", "The countdown, the price before it struck through, the share off and how many are left."],
            ["Collections and occasions", "Each bouquet in its collection and in every occasion it suits."],
          ],
        },
        {
          name: "The gift checkout",
          title: "Five steps, and only what's needed",
          text: "A checkout made for sending, which any store app can turn on. It asks for exactly what a delivery to someone else needs, and nothing more.",
          features: [
            ["Five steps on one screen", "From, for, when, the message and pay, under a stepper that stays at the top."],
            ["The sender", "Name, phone and email. No address: the flowers aren't going to them."],
            ["The recipient", "Name, phone and address, only in the countries and cities you deliver to."],
            ["The door on a map", "When delivery is priced by distance, the recipient's door is pinned on the map."],
            ["The card's preview", "The card with the bouquet's photo, changing as the words are typed."],
            ["Send anonymously", "The card doesn't say who it's from. The shop still knows."],
            ["Pay", "The bouquet and its add-ons, the day and the slot always in view, the code, and the delivery fee line by line."],
            ["Checked on the server", "An order without the day, the slot or the people's details is refused, whatever the app sends."],
          ],
        },
        {
          name: "Card messages",
          title: "Ready words for every occasion",
          text: "The shop writes the beginnings, and the customer makes them their own. A new store starts with a warm set, so it's never empty.",
          features: [
            ["Eleven occasions to start", "Love, birthday, anniversary, congratulations, new baby, get well, thank you, sorry, sympathy, Eid and Ramadan, and Mother's Day."],
            ["Your own occasions", "Add the ones your customers send flowers for."],
            ["Ready messages", "Two or three for each occasion to begin with, in English, Arabic and Turkish."],
            ["In every language", "Each message in each of the app's languages, shown in the customer's."],
            ["Yours to change", "Edit them, put them in order, hide them or delete them."],
            ["Or their own words", "The customer taps a message and changes it, or writes their own."],
          ],
        },
        {
          name: "Where you deliver, and what it costs",
          title: "Delivery priced the way it really works",
          text: "The fee is worked out at checkout from the shop's own rules, and shown with every part.",
          features: [
            ["Countries and cities", "One country or several, all their cities or some, with a starter list for Turkey, Egypt and the Gulf."],
            ["One price", "The same fee everywhere you deliver."],
            ["By city", "A price for each city, and one for the other cities."],
            ["By the km", "A base fee and a price per km, in a straight line from the shop to the pin, up to the distance you set."],
            ["By the kg", "A price per kg of the products, with the first kilos included, on top of any of the others."],
            ["A city's own price", "A fixed fee for a city, whatever the rule works out."],
            ["A minimum fee", "Delivery never costs less than the minimum."],
            ["Free over an amount", "Free delivery from an order total you choose."],
            ["Every part shown", "The base, the distance, the weight and the slot's extra, line by line."],
          ],
        },
        {
          name: "Flash sales and codes",
          title: "Offers that end when they say",
          text: "Sales with a timer, and codes the customer can see without hunting for them.",
          features: [
            ["Flash sales", "Products or a whole category, a share off or one sale price, from a start time to an end."],
            ["The timer", "A live countdown on the sale's banner, carousel or grid, on product cards and on the product's page. It hides when the sale is over."],
            ["Only a few left", "An optional number of units, with a bar that shows how many are left."],
            ["Sale badges", "A chip with the share off, a ribbon across the corner or the two prices, wherever the product shows."],
            ["Discount codes", "A percent or an amount, a minimum order, start and end days, and a number of uses."],
            ["Shown in the app", "The codes you choose, on a ticket or a glass card with a copy button."],
          ],
        },
        {
          name: "Designed in Yallapp Studio",
          title: "Two looks, and new pieces for every app",
          text: "Leqaa comes in two premium looks. Their header, bar and account screens are new in Studio, and other apps made in it can use them too.",
          features: [
            ["Rose hour", "Look A: blush paper and plum ink, the occasions as full-screen stories, and a plum night lit in candle rose."],
            ["Botanical press", "Look B: sage paper and forest ink with peach, \"Who are the flowers for?\" and the edit as numbered cards."],
            ["Light and dark", "Both looks have a designed night, and the customer chooses."],
            ["The petal header", "A soft wash of two colours, the name in the middle, a fine floral line and a curved petal edge. It folds as the page scrolls."],
            ["The petal bar", "A floating bar, the open tab on a petal-shaped leaf, and a raised bloom in the middle for Send."],
            ["Petal account and sign-in", "The account, sign-in and the code screen in the same soft look."],
            ["Ready sections", "Send today, the flash sale, the collections, Build your bouquet and more, ready for any store."],
            ["Three languages", "English, Arabic right to left, and Turkish."],
          ],
        },
        {
          name: "Where the products come from",
          title: "Your products, or your shop's platform",
          text: "Leqaa works with products kept in Yallapp, or with the online shop you already have. Here is what each one supports.",
          features: [
            ["Products in Yallapp", "No website needed. Everything on this page works, and Yallapp's checkout charges the slot's fee and the delivery as you set them."],
            ["WordPress and WooCommerce", "Through the Yallapp plugin: the cut-off, the slots with their limits and fees, the gift checkout, the card messages, sale prices and the codes you tick. WooCommerce's own shipping zones price the delivery, so there's no price by the km or by the kg."],
            ["Shopify", "The day, the slot, the people and the card go with the order, in the cart's attributes and note. Shopify's checkout charges its own prices and shipping."],
            ["Wix", "The same details, in the buyer's note. Wix's checkout charges its own prices and shipping."],
            ["ikas, Ticimax, IdeaSoft, Salla and Zid", "The app checks the day, the slot and the people. The platform's checkout charges its own prices and shipping."],
            ["Kept for you", "On a connected platform, the gift details of every order from the app stay in your dashboard for 60 days."],
            ["Sales and codes on a platform", "The platform's own sale shows as it is. A flash sale made in Yallapp changes the price in the app; give it the platform's own code with the same terms, and its checkout applies it. The codes you list show in the app."],
            ["Your own API", "The same fields are in the API's contract, all optional."],
          ],
        },
      ],
      bundleTitle: "One app, your dashboard, and your shop if you have one",
      bundleText: "The customers' app is built and published under the shop's name from one Studio project. Its products come from Yallapp, or from the shop's own platform.",
      bundleNodes: [
        ["Leqaa", "Customers, on Android and iPhone"],
        ["Yallapp Studio", "The shop: its look, delivery, card messages and offers"],
        ["The shop's website", "WooCommerce, Shopify, Wix or another, if it has one"],
      ],
      bundleFlows: [
        "Today closes at the cut-off, in the shop's time zone",
        "A slot that's full can't be chosen",
        "A card message the shop adds shows at checkout, in each language",
        "A flash sale's timer runs in the app until it ends",
        "An order arrives with its day, slot, sender, recipient and card",
        "On a connected platform, the gift details go with the order",
      ],
      compareTitle: "How it compares",
      compareText: "Companies that make apps for online shops, and one that makes flower delivery apps, as their own sites describe them, next to Yallapp and to having an agency build an app for you.",
      finale: {
        title: "Next March, he won't wait",
        text: "The bouquet will stand on her table for a week, beside the open box of chocolates. Omar has already put Mother's Day in his calendar. And at the shop, Mariam is making tomorrow's orders, slot by slot.",
      },
      photos: {
        "flowers-hero": "A bouquet of pink roses and lisianthus on a deep pink background",
        "flowers-blush": "Pink and white ranunculus on a wooden barrel",
        "flowers-card": "White and pink roses",
        "flowers-shop": "Bunches of flowers wrapped for sale",
        "flowers-door": "A bouquet wrapped in paper, held in both hands",
        "flowers-table": "Bouquets of tulips wrapped in pink paper",
        "flowers-vase": "Tulips and roses in a white vase",
      },
    },
    // 208 Lujain, the clothes shop: a wedding dress bought on a Monday evening, in its look A (LUJAIN); look B (NOUN) in its section.
    clothes: {
      navName: "Clothes shop app",
      metaTitle: "A clothes shop app with sizes, a category menu and complete the look, designed in Yallapp Studio",
      metaDescription: "A day with Lujain: a wedding on Thursday, the category menu, a dress in her size and colour, the size guide and the heels that complete the look.",
      summary: "Sizes and colours with the stock of each, a category menu of every row, a size chart, complete the look and exchanges, in two premium looks.",
      eyebrow: "Yallapp Studio · The clothes shop",
      title: "Thursday, in rust satin",
      intro: "Noura has a wedding on Thursday and nothing she wants to wear. It's Monday evening in Riyadh. This is how a few minutes with her phone become a dress in her size, and the heels to go with it.",
      cast: "Noura shops at Lujain, a women's fashion house in Riyadh. Lujain is the clothes shop template's demo: its clothes, names and prices are made up, its photos are real, and every screen below is the real app.",
      chapters: [
        {
          time: "21:10",
          kicker: "Riyadh, after dinner",
          title: "A wedding on Thursday",
          text: "Noura opens Lujain on the sofa. The home is small and quick: the search, the categories in circles, and the season's collections in cards that slide, the next one peeking from the edge. Under them, what came in this week."
        },
        {
          time: "21:13",
          kicker: "The menu",
          title: "Every category, a row",
          text: "She taps the menu beside the bell. Every category of the shop is a row of cards with their photos: Dresses first, with Midi, Maxi and Mini sliding after it, then Abayas, Coats & jackets, Shoes, Bags. She slides the Dresses row and taps Midi."
        },
        {
          time: "21:17",
          kicker: "The dress's page",
          title: "M is gone in black",
          text: "A rust satin midi dress, on sale. Black is chosen when the page opens, and M is greyed out: none left in black. She taps Rust, and M comes back. Beside the sizes, Size guide opens the shop's chart: bust, waist, hips and length, in centimetres."
        },
        {
          time: "21:20",
          kicker: "Complete the look",
          title: "Heels, a clutch, the sunglasses",
          text: "Under the dress, the shop has put a piece from each of its other categories: black strappy heels, a patent clutch, round sunglasses. Under the price, one line says exchanges and returns are free within 14 days."
        },
        {
          time: "21:24",
          kicker: "Deal of the day",
          title: "The heels, 30% off",
          text: "Back on the home, a dark card says Deal of the day, its timer counting down. The strappy heels are in it, the old price struck through. She adds them in her size, 38, and copies the shop's code, LUJAIN10, at checkout."
        },
        {
          time: "09:30",
          kicker: "Tuesday, at the shop",
          title: "M in rust, 38 in black",
          text: "At Lujain, Reem opens the morning's orders. Noura's says the dress in rust, size M, and the heels in black, size 38. The stock of each goes down by one, size by size and colour by colour, so no one can buy a dress that isn't there.",
          push: {
            app: "Lujain",
            title: "Order 2108",
            body: "Your order is on its way. Exchanges are free within 14 days."
          }
        }
      ],
      interlude: {
        quote: "Monday at nine. Thursday in rust satin.",
        text: "Everything in between was the shop's own: its categories and their rows, its sizes and colours and the stock of each, its size chart, its offers and its exchanges, set once in the dashboard."
      },
      statsTitle: "Small facts behind one dress",
      stats: [
        "main categories in the demo's menu, each a row of cards",
        "sub-categories sliding in their rows",
        "days to exchange or return, shown under every price",
        "languages, Arabic right to left"
      ],
      systemsTitle: "Every part, explained",
      systemsText: "The category menu, sizes and colours, complete the look and the offers, the two looks, and where the products come from.",
      systems: [
        {
          name: "The category menu",
          title: "Every category, one row each",
          text: "The menu beside the bell opens all of the shop's categories at once, each a row of cards with their photos.",
          features: [
            [
              "A row per category",
              "Each main category is a row of cards that slides sideways."
            ],
            [
              "All of it first",
              "The first card is the category itself, with how many pieces it has."
            ],
            [
              "Sub-categories in the row",
              "Midi, Maxi and Mini slide after Dresses, each with its own photo."
            ],
            [
              "Search on top",
              "One field searches every category."
            ],
            [
              "The account at the foot",
              "My account, my orders, the language and how to reach the shop."
            ],
            [
              "In the editor too",
              "The category menu is an element of Studio's library, for any store."
            ]
          ]
        },
        {
          name: "Sizes and colours",
          title: "The stock of every size",
          text: "A piece comes in its sizes and colours, and the shop keeps the stock of each one.",
          features: [
            [
              "Size by colour",
              "Every size in every colour is its own piece of stock."
            ],
            [
              "Gone is gone",
              "A size with none left in the colour chosen is greyed out and can't be chosen."
            ],
            [
              "The size guide",
              "Beside the sizes, the shop's own chart opens in a sheet."
            ],
            [
              "In three languages",
              "The chart's titles in English, Arabic and Turkish, in centimetres or inches."
            ],
            [
              "Chosen when it opens",
              "The size and colour the shop chose are ready when the page opens."
            ],
            [
              "Shoes too",
              "Shoes in their sizes, bags and accessories in one size."
            ]
          ]
        },
        {
          name: "Complete the look, and the offers",
          title: "What goes with it",
          text: "The shop sells the whole look, not only the dress.",
          features: [
            [
              "Complete the look",
              "Under every piece, one from each of the shop's other main categories."
            ],
            [
              "Shop the look",
              "A photo with numbered spots, each opening its piece."
            ],
            [
              "Exchanges in sight",
              "The shop's exchange and return days under the price."
            ],
            [
              "Deal of the day",
              "A flash sale with its countdown and how many are left."
            ],
            [
              "Codes",
              "The shop's code on a ticket, copied in one tap."
            ]
          ]
        },
        {
          name: "Designed in Yallapp Studio",
          title: "Two looks, every part yours to change",
          text: "Lujain comes in two premium looks, built only from Studio's elements.",
          features: [
            [
              "LUJAIN",
              "Look A: a boutique in black and white, big photos and a quiet type."
            ],
            [
              "NOUN",
              "Look B: streetwear, electric blue on concrete grey, drops and a ticker."
            ],
            [
              "Light and dark",
              "Both looks have a designed night."
            ],
            [
              "A compact hero",
              "The collections in cards about 210 points tall, the next one peeking."
            ],
            [
              "A floating bar",
              "Home, Shop, Cart, Orders and Account, the open one a pill with its name."
            ],
            [
              "Ready sections",
              "The category menu, the deal, shop the look, the size card and more, for any store."
            ],
            [
              "Three languages",
              "English, Arabic right to left, and Turkish."
            ]
          ]
        },
        {
          name: "Where the products come from",
          title: "Your products, or your shop's platform",
          text: "Lujain works with products kept in Yallapp, or with the online shop you already have.",
          features: [
            [
              "Products in Yallapp",
              "Everything on this page: categories inside categories, the size chart and complete the look."
            ],
            [
              "WordPress and other platforms",
              "Their categories and sub-categories in the menu, their sizes and stock on the page."
            ],
            [
              "Coming next",
              "The size chart and complete the look from a connected platform."
            ]
          ]
        }
      ],
      bundleTitle: "One app, your dashboard, and your shop if you have one",
      bundleText: "The customers' app is built and published under the shop's name from one Studio project. Its products come from Yallapp, or from the shop's own platform.",
      bundleNodes: [
        [
          "Lujain",
          "Customers, on Android and iPhone"
        ],
        [
          "Yallapp Studio",
          "The shop: its look, categories, sizes and offers"
        ],
        [
          "The shop's website",
          "WooCommerce, Shopify or another, if it has one"
        ]
      ],
      bundleFlows: [
        "A new sub-category shows in its row of the menu",
        "A size sold out is greyed out in the app",
        "The size chart shows in the customer's language",
        "An order arrives with its size and colour"
      ],
      compareTitle: "How it compares",
      compareText: "Companies that make apps for online shops, as their own sites describe them, next to Yallapp and to having an agency build an app for you.",
      finale: {
        title: "Thursday, at nine",
        text: "The dress fits. The heels hurt a little after midnight, as heels do. Reem has already added the new season's abayas to their row, and somewhere in Riyadh someone else is sliding through it."
      },
      photos: {
        "clothes-hero": "A woman in a long green dress in a narrow sunlit passage",
        "clothes-dress": "A woman in a rust satin dress on a porch",
        "clothes-heels": "Black strappy heels beside a small flower",
        "clothes-rack": "White dresses on hangers",
        "clothes-street": "A woman in a black hat and a yellow coat on a city street",
        "clothes-walk": "A woman in white walking over white sand dunes"
      }
    },
    // 209 Toys
    // 209 Toot, the toy shop: a fourth birthday on Saturday, in its look A (Toot); look B (Mukaab) in its section.
    toys: {
      navName: "Toy shop app",
      metaTitle: "A toy shop app with shopping by age, safety and materials and birthday gifts with a card, designed in Yallapp Studio",
      metaDescription: "A day with Toot: a fourth birthday on Saturday, the toys for 3 to 5 years, a bear's safety and materials, the gift finder, the wrapping and the card in her words.",
      summary: "Shopping by age and by type of toy, each toy's age, safety and materials, a gift finder, gift wrapping and a birthday card, gifts under a price, in two premium looks.",
      eyebrow: "Yallapp Studio · The toy shop",
      title: "Four candles and a bear",
      intro: "Huda's nephew Adam turns four on Saturday, and she is at work until Friday night. It's Wednesday evening in Dubai. This is how a few minutes with her phone become a wrapped present, with a card in her words.",
      cast: "Huda shops at Toot, a toy shop in Dubai. Toot is the toy shop template's demo: its toys, names and prices are made up, its photos are real, and every screen below is the real app.",
      chapters: [
        {
          time: "20:40",
          kicker: "Dubai, after dinner",
          title: "A birthday on Saturday",
          text: "Huda opens Toot on the balcony. The home is small and quick: the search, the categories in circles, the collections in cards that slide, the next one peeking from the edge. Under them, the ages in tall photos: 0–12 months, 1–2 years, 3–5 years."
        },
        {
          time: "20:42",
          kicker: "By age",
          title: "3–5 years",
          text: "She taps 3–5 years and the shop opens on the toys for that age only. From the menu beside the bell, every category is a row of cards: Wooden toys, Building, Plush, Puzzles & games, then By age and Birthday gifts, each with its own sub-categories sliding after it."
        },
        {
          time: "20:46",
          kicker: "The toy's page",
          title: "From birth, tested, washable",
          text: "A golden bear in a hand-knitted jumper. Under the price: From birth, tested to EN 71, gift wrapping on offer. Its safety says why: embroidered eyes, no buttons or small parts. Its materials and its care follow, and a table of its age, size and batteries: none needed."
        },
        {
          time: "20:50",
          kicker: "The gift finder",
          title: "Three questions",
          text: "Not sure, she goes back to the home and answers the perfect gift in 3 steps: four years old, loves building, up to 300. The finder says 3–5 years and opens it. She adds the little architect tower to the bear."
        },
        {
          time: "20:54",
          kicker: "The cart",
          title: "Kraft, blush and a card",
          text: "In the cart, the shop offers a little more: the kraft and blush wrap, the black and gold one, and the birthday card in your words. She picks kraft and the card, taps Happy birthday, little one! at checkout and finishes the message herself, with the shop's code, TOOT10."
        },
        {
          time: "10:15",
          kicker: "Thursday, at the shop",
          title: "Wrapped, with her words",
          text: "At Toot, Salma opens the morning's orders. Huda's says the bear and the tower, kraft and blush, and the card's message to write by hand. The order goes to Adam's address, with Huda's name on the card.",
          push: {
            app: "Toot",
            title: "Order 3107",
            body: "Your gift is wrapped and on its way. Returns are free within 30 days."
          }
        }
      ],
      interlude: {
        quote: "Wednesday at nine. Saturday, four candles and a bear.",
        text: "Everything in between was the shop's own: its ages and its types of toy, each toy's safety and materials, its wraps and its card, its offers and its returns, set once in the dashboard."
      },
      statsTitle: "Small facts behind one present",
      stats: [
        "main categories in the demo's menu, each a row of cards",
        "ages, each a category a tap away",
        "days to return a toy, free",
        "languages, Arabic right to left"
      ],
      systemsTitle: "Every part, explained",
      systemsText: "Shopping by age, safety and materials, the birthday gifts and the offers, the two looks, and where the toys come from.",
      systems: [
        {
          name: "Shopping by age",
          title: "Every toy in the ages it is for",
          text: "The ages are categories of the shop, and every toy is in its type and in its ages.",
          features: [
            [
              "The ages on the home",
              "Tall photos or chips, each opening the toys for that age."
            ],
            [
              "The category menu",
              "Every category a row of cards, its sub-categories sliding after it."
            ],
            [
              "By type too",
              "Wooden toys, Building, Plush, Puzzles, Science, Arts, Outdoor and Baby."
            ],
            [
              "Search on top",
              "One field searches every category."
            ],
            [
              "The gift finder",
              "Three questions; the answer is an age that opens."
            ],
            [
              "In the editor too",
              "The category menu and the ages are elements of Studio's library, for any store."
            ]
          ]
        },
        {
          name: "Safety and materials",
          title: "What a parent reads before buying",
          text: "Each toy's page tells its age, its safety, its materials and its care, in the shop's own words.",
          features: [
            [
              "Tested",
              "A badge for toys tested for children's safety."
            ],
            [
              "Its materials",
              "Wood, paint, fabric and filling, in a few lines."
            ],
            [
              "Its facts",
              "Age, material, pieces, size and batteries, as a table."
            ],
            [
              "The age",
              "From birth, 18+ months, 3+ years: on the page and in the categories."
            ],
            [
              "In three languages",
              "The page's titles in English, Arabic and Turkish."
            ]
          ]
        },
        {
          name: "Birthday gifts, and the offers",
          title: "Wrapped, with a card",
          text: "The shop sells the present, not only the toy.",
          features: [
            [
              "The gift finder",
              "The child's age, what they love and the budget, one at a time."
            ],
            [
              "Gift wrapping",
              "Wraps offered in the cart with every toy."
            ],
            [
              "The card's message",
              "Written at checkout, with beginnings to tap in each language."
            ],
            [
              "Gifts under a price",
              "Rows of toys under 100 and under 200, from the shop's own prices."
            ],
            [
              "Toy of the day",
              "A flash sale with its countdown and how many are left."
            ],
            [
              "Codes",
              "The shop's code on a ticket, copied in one tap."
            ]
          ]
        },
        {
          name: "Designed in Yallapp Studio",
          title: "Two looks, every part yours to change",
          text: "Toot comes in two premium looks, built only from Studio's elements.",
          features: [
            [
              "Toot",
              "Look A: playful and colourful, plum and gold on cream, round photos."
            ],
            [
              "Mukaab",
              "Look B: calm and educational, one clear blue on grey, tiles and a lab."
            ],
            [
              "Light and dark",
              "Both looks have a designed night."
            ],
            [
              "A compact hero",
              "The collections in cards about 210 points tall, the next one peeking."
            ],
            [
              "A floating bar",
              "Home, Shop, Cart, Orders and Account, the open one a pill with its name."
            ],
            [
              "Ready sections",
              "The ages, safety first, the gift finder, gifts under a price and more, for any store."
            ],
            [
              "Three languages",
              "English, Arabic right to left, and Turkish."
            ]
          ]
        },
        {
          name: "Where the toys come from",
          title: "Your toys, or your shop's platform",
          text: "Toot works with toys kept in Yallapp, or with the online shop you already have.",
          features: [
            [
              "Toys in Yallapp",
              "Everything on this page: the ages, each toy's safety and materials, the wraps and the card."
            ],
            [
              "WordPress and other platforms",
              "Their categories and sub-categories in the menu, their toys and prices in the app."
            ],
            [
              "Coming next",
              "A toy's safety and materials from a connected platform."
            ]
          ]
        }
      ],
      bundleTitle: "One app, your dashboard, and your shop if you have one",
      bundleText: "The parents' app is built and published under the shop's name from one Studio project. Its toys come from Yallapp, or from the shop's own platform.",
      bundleNodes: [
        [
          "Toot",
          "Parents, on Android and iPhone"
        ],
        [
          "Yallapp Studio",
          "The shop: its look, ages, toys and offers"
        ],
        [
          "The shop's website",
          "WooCommerce, Shopify or another, if it has one"
        ]
      ],
      bundleFlows: [
        "A new toy shows in its type and its ages",
        "A toy's safety shows on its page",
        "The card's message arrives with the order",
        "A wrap is added to the order"
      ],
      compareTitle: "How it compares",
      compareText: "Companies that make apps for online shops, as their own sites describe them, next to Yallapp and to having an agency build an app for you.",
      finale: {
        title: "Saturday, at four",
        text: "Adam builds the tower twice before the cake and puts the bear on top of it. Huda reads her own words aloud from the card. At Toot, Salma is already adding the winter's play tents to their row."
      },
      photos: {
        "toys-hero": "A small child reading in a grey play tent in a sitting room",
        "toys-blocks": "Wooden blocks in bright colours, close up",
        "toys-bear": "A golden teddy bear in a blue knitted jumper",
        "toys-gift": "A gift box tied with a pink ribbon among confetti",
        "toys-play": "A father and two children in a blanket fort with fairy lights",
        "toys-finale": "A family playing together on a living-room rug"
      }
    },
  },
};
