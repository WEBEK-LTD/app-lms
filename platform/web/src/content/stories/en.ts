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
      summary: "Sizes and colours with the stock of each, a category menu of every row, a size chart, complete the look and exchanges, in four premium templates.",
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
          kicker: "On sale",
          title: "The heels, 30% off",
          text: "By night the app turns near black, the looks still edge to edge. In the shop the strappy heels are on sale, the old price struck through. She adds them in her size, 38, and copies the shop's code, LUJAIN10, at checkout."
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
      systemsText: "The category menu, sizes and colours, complete the look and the offers, the four templates, and where the products come from.",
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
          title: "Four templates, every part yours to change",
          text: "Lujain comes in four premium templates, built only from Studio's elements.",
          features: [
            [
              "RUNWAY",
              "Template C, the demo: the season's looks edge to edge, ivory and black with one burgundy."
            ],
            [
              "The outfit builder",
              "Template D: an outfit built from a top, a bottom and shoes, a dock and a round bag button. LUJAIN and NOUN, A and B, kept."
            ],
            [
              "Light and dark",
              "Every template has a designed night."
            ],
            [
              "A lookbook",
              "The season's looks 640 points tall under a tiny wordmark, the pieces tall and boxless."
            ],
            [
              "A minimal bar",
              "Home, Discover, Wishlist, Bag and Account, thin icons over their words."
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
    // 209 Velours, the cosmetics shop: the right foundation before a party, in its look A (VELOURS); look B (NAQA LAB) in its section.
    beauty: {
      navName: "Cosmetics shop app",
      metaTitle: "A cosmetics shop app with shades, a skin quiz, routines and ingredients, designed in Yallapp Studio",
      metaDescription: "A day with Velours: a foundation that ran out, the shade finder, the skin quiz, a ready-made routine, and every product's ingredients and expiry.",
      summary: "Shades as swatches with the stock of each, a skin quiz, filters by skin type and brand, ingredients and how to use, genuine products with their expiry and ready-made routines, in four premium templates.",
      eyebrow: "Yallapp Studio · The cosmetics shop",
      title: "Friday, in warm beige",
      intro: "Layla's foundation ran out on Wednesday, and her cousin's engagement party is on Friday. It's Wednesday night in Dubai. This is how a few minutes with her phone become the right shade, and a routine for her skin.",
      cast: "Layla shops at Velours, a beauty house in Dubai. Velours is the cosmetics shop template's demo: its brands, products and prices are made up, its photos are real, and every screen below is the real app.",
      chapters: [
        {
          time: "22:05",
          kicker: "Dubai, late evening",
          title: "An empty compact",
          text: "Layla opens Velours on her bed. The home is small and quick: the search, the categories as chips, this week's edits in cards that slide, the next one peeking from the edge, and the flash deals with their timer."
        },
        {
          time: "22:08",
          kicker: "The shade finder",
          title: "Twelve shades, one tap",
          text: "Further down, the shade finder shows the cushion foundation's shades as round swatches. Warm beige, 3W, is already chosen: light to medium skin with a warm undertone, the shade most women pick. She taps Shop the foundation."
        },
        {
          time: "22:11",
          kicker: "The foundation's page",
          title: "Genuine, until 2027",
          text: "Its shades are swatches under the price; 6C has none left and is greyed out. Under them, its ingredients, how to use it, and its facts: Rosé Lab, all skin types, 15 g, SPF 25. A badge says genuine, and the batch's expiry is written in the open."
        },
        {
          time: "22:15",
          kicker: "Know your skin type",
          title: "Combination, it says",
          text: "She has never been sure about her skin. The quiz asks four questions, one at a time: how it feels after washing, the pores, a new cream, the end of the day. Combination. One tap opens every product the shop has for combination skin."
        },
        {
          time: "22:19",
          kicker: "A ready-made routine",
          title: "Four steps, for less",
          text: "In the daily routine, the morning routine for combination skin: a cleansing bar, vitamin C, a light gel and SPF 50+, sold together for less than the four on their own. She adds it, with the foundation, and the shop's code VELOURS10 at checkout."
        },
        {
          time: "09:40",
          kicker: "Thursday, at the shop",
          title: "3W, and the routine",
          text: "At Velours, Hind opens the morning's orders. Layla's says the foundation in 3W and the morning routine. The stock of 3W goes down by one, so no one can buy a shade that isn't there, and the parcel leaves before noon.",
          push: {
            app: "Velours",
            title: "Order 3307",
            body: "Your order is on its way. Unopened products can go back within 14 days."
          }
        }
      ],
      interlude: {
        quote: "Wednesday at ten. Friday in warm beige.",
        text: "Everything in between was the shop's own: its shades and the stock of each, its skin types and brands, every product's ingredients and expiry, its routines and its offers, set once in the dashboard."
      },
      statsTitle: "Small facts behind one shade",
      stats: [
        "main categories in the demo's menu, by skin type and by brand among them",
        "shades of the foundation, each with its stock and its colour",
        "skin types in the quiz, each opening its products",
        "languages, Arabic right to left"
      ],
      systemsTitle: "Every part, explained",
      systemsText: "Shades, the skin quiz and the filters, what a product's page tells, routines and offers, the four templates, and where the products come from.",
      systems: [
        {
          name: "Shades",
          title: "Every shade, its colour and its stock",
          text: "A foundation or a lipstick comes in its shades, each drawn in its own colour.",
          features: [
            ["Swatches", "Each shade is a round swatch in its colour on the product's page."],
            ["Chosen when it opens", "The shade the shop picked is ready when the page opens."],
            ["Gone is gone", "A shade with none left is greyed out and can't be chosen."],
            ["Stock per shade", "The shop keeps the stock of every shade on its own."],
            ["The shade finder", "On the home, the shades side by side, the one tapped with its words."]
          ]
        },
        {
          name: "The skin quiz and the filters",
          title: "By skin type, and by brand",
          text: "Customers find what suits their skin without reading every label.",
          features: [
            ["Know your skin type", "A few questions, one at a time, and the skin type with the most answers."],
            ["Results that open", "Each skin type opens the shop's products for it."],
            ["Brands", "The shop's brands in the menu and on the home, each opening its products."],
            ["In three languages", "The questions, the answers and the results in English, Arabic and Turkish."],
            ["In the editor too", "The quiz and the shade finder are elements of Studio's library, for any store."]
          ]
        },
        {
          name: "What a product's page tells",
          title: "Ingredients, how to use, expiry",
          text: "Every product's page answers what a careful customer asks before she buys.",
          features: [
            ["Ingredients", "The full list, in the product's own words."],
            ["How to use", "When and how much, step by step."],
            ["Genuine", "A badge for products bought from the brands themselves."],
            ["Expiry", "The batch's month and year, in the open."],
            ["Cruelty-free", "A badge on the products not tested on animals."],
            ["Facts", "Brand, skin type, volume and finish, as a small table."]
          ]
        },
        {
          name: "Routines and offers",
          title: "The whole routine, not only the cream",
          text: "The shop sells steps that go together.",
          features: [
            ["Ready-made routines", "Products sold together for less, their steps in the description."],
            ["The daily routine", "Morning and evening steps on the home, with the shop's routines under them."],
            ["Flash deals", "A sale with its countdown and how many are left."],
            ["Codes", "The shop's code on a ticket, copied in one tap."],
            ["Returns in sight", "The shop's return days on every product."]
          ]
        },
        {
          name: "Designed in Yallapp Studio",
          title: "Four templates, every part yours to change",
          text: "Velours comes in four premium templates, built only from Studio's elements.",
          features: [
            ["RITUAL CLINIC", "Template C, the demo: a clinic in white and teal, the skin test first and the routine step by step."],
            ["SHADE STUDIO", "Template D: deep plum and gloss, the shade carousel first. Looks A and B, kept."],
            ["Light and dark", "Every template has a designed night."],
            ["A compact hero", "The edits in cards about 210 points tall, the next one peeking."],
            ["A floating bar", "Home, Shop, Cart, Orders and Account, the open one a pill with its name."],
            ["Ready sections", "The shade finder, the skin quiz, the routine, the brands and more, for any store."],
            ["Three languages", "English, Arabic right to left, and Turkish."]
          ]
        },
        {
          name: "Where the products come from",
          title: "Your products, or your shop's platform",
          text: "Velours works with products kept in Yallapp, or with the online shop you already have.",
          features: [
            ["Products in Yallapp", "Everything on this page: shades and their colours, ingredients, expiry and routines."],
            ["WordPress and other platforms", "Their categories in the menu, their shades and stock on the page."],
            ["Coming next", "Ingredients and expiry from a connected platform."]
          ]
        }
      ],
      bundleTitle: "One app, your dashboard, and your shop if you have one",
      bundleText: "The customers' app is built and published under the shop's name from one Studio project. Its products come from Yallapp, or from the shop's own platform.",
      bundleNodes: [
        ["Velours", "Customers, on Android and iPhone"],
        ["Yallapp Studio", "The shop: its look, categories, shades and offers"],
        ["The shop's website", "WooCommerce, Shopify or another, if it has one"]
      ],
      bundleFlows: [
        "A new shade shows as its swatch in the app",
        "A shade sold out is greyed out",
        "The ingredients show in the product's words",
        "An order arrives with its shade"
      ],
      compareTitle: "How it compares",
      compareText: "Companies that make apps for online shops, as their own sites describe them, next to Yallapp and to having an agency build an app for you.",
      finale: {
        title: "Friday, at eight",
        text: "The shade is right; no one can tell where her skin ends and the foundation begins. Hind has already added a new lipstick to the Lips row, and somewhere in Dubai someone else is taking the skin quiz."
      },
      photos: {
        "beauty-hero": "A woman holding a jar of cream against a warm beige wall",
        "beauty-shades": "A woman with bare, glowing skin touching her face",
        "beauty-serum": "A woman holding a serum dropper to her cheek",
        "beauty-routine": "A woman with soft skin and her eyes closed, in warm light",
        "beauty-bath": "A candle, a bath bomb and a rolled towel on a bath tray",
        "beauty-candle": "A lit candle in a glass jar beside a small tin"
      }
    },
    // 209 Toota, the kids' clothes shop: a newborn gift and a raincoat on a rainy Wednesday, in its look A (TOOTA); look B (MINIMO) in its section.
    kids: {
      navName: "Kids' clothes shop app",
      metaTitle: "A kids' clothes shop app with sizes by age, newborn gifts and ready sets, designed in Yallapp Studio",
      metaDescription: "A day with Toota: a new nephew, a gift box wrapped with a card, the size finder by age and a raincoat for a four-year-old.",
      summary: "Sizes by age from birth to 12, a size finder and chart, boys', girls' and baby categories, newborn gifts with wrapping and a card, and ready-made sets, in four premium templates.",
      eyebrow: "Yallapp Studio · The kids' clothes shop",
      title: "A gift for Adam, a raincoat for Youssef",
      intro: "Salma's sister had a baby boy this morning, and her own son Youssef has grown out of his raincoat just as the rain came. It's a Wednesday evening in Cairo. This is how a few minutes with her phone become both.",
      cast: "Salma shops at Toota, a children's clothes shop in Cairo. Toota is the kids' clothes template's demo: its clothes, names and prices are made up, its photos are real, and every screen below is the real app.",
      chapters: [
        {
          time: "20:40",
          kicker: "Cairo, after bath time",
          title: "Two things to buy tonight",
          text: "Salma opens Toota on the sofa while Youssef sleeps. The home is soft and quick: the search, the categories in circles, the season's collection in cards that slide, and under them the ages, from 0–6 months to 8–12 years, each a pastel tile."
        },
        {
          time: "20:43",
          kicker: "The menu",
          title: "Girls, boys and baby",
          text: "She taps the menu beside the bell. Every category of the shop is a row of cards with their photos: Baby & newborn first, with Newborn sets, Bodysuits and Sleepwear sliding after it, then Girls, Boys, Shoes, Newborn gifts and Ready sets."
        },
        {
          time: "20:46",
          kicker: "The size finder",
          title: "Four years old, 104 cm",
          text: "Youssef is four. In the size finder on the home she picks 4–5Y, and the card shows the size with its height, weight and chest from the shop's own chart: 104 to 110 cm. One tap, and the shop opens on the pieces in his size."
        },
        {
          time: "20:52",
          kicker: "Newborn gifts",
          title: "A box, wrapped, with a card",
          text: "For baby Adam, the first newborn box: a bodysuit, a hat, a knitted blanket and a soft toy, in organic cotton. In the cart, the shop offers gift wrapping and a greeting card with it. At checkout she taps \"Welcome to the world, little one!\" and adds a line of her own."
        },
        {
          time: "20:58",
          kicker: "On sale",
          title: "The hoodie, 30% off",
          text: "By night the app turns deep violet, Tooti still smiling. In the shop the grey fleece hoodie is on sale in Youssef's size, the old price struck through. She adds it with the raincoat, and the shop's code, TOOTA10, takes ten per cent off the order."
        },
        {
          time: "10:15",
          kicker: "Thursday, at the shop",
          title: "4–5Y in yellow, a box wrapped",
          text: "At Toota, Mona opens the morning's orders. Salma's says the raincoat in yellow, size 4–5Y, the hoodie in grey, and the newborn box wrapped, with the card's message to write by hand. The stock of each size goes down by one.",
          push: {
            app: "Toota",
            title: "Order 3204",
            body: "Your order is on its way. The gift is wrapped, with your card."
          }
        }
      ],
      interlude: {
        quote: "One gift wrapped, one raincoat that fits.",
        text: "Everything in between was the shop's own: its categories and their rows, its sizes by age and the stock of each, its size chart, its gift wrapping and cards, its offers and its exchanges, set once in the dashboard."
      },
      statsTitle: "Small facts behind one evening",
      stats: [
        "main categories in the demo's menu, each a row of cards",
        "sizes by age, from 0–3 months to 11–12 years",
        "days to exchange a size that doesn't fit",
        "languages, Arabic right to left"
      ],
      systemsTitle: "Every part, explained",
      systemsText: "Sizes by age, the category menu, the gifts and the sets, the four templates, and where the products come from.",
      systems: [
        {
          name: "Sizes by age",
          title: "The size that fits, by age",
          text: "Every piece comes in sizes by age, and the shop keeps the stock of each.",
          features: [
            [
              "Ages for sizes",
              "From 0–3 months to 11–12 years, each piece in the ages it is made for."
            ],
            [
              "The size finder",
              "Pick the child's age, see the height, weight and chest that size fits."
            ],
            [
              "The size chart",
              "The shop's own chart, by age, on its size guide page and beside the sizes."
            ],
            [
              "In three languages",
              "The chart's titles in English, Arabic and Turkish."
            ],
            [
              "Shop their size",
              "The finder's button opens the shop."
            ],
            [
              "Gone is gone",
              "A size with none left is greyed out and can't be chosen."
            ]
          ]
        },
        {
          name: "The category menu",
          title: "Girls, boys and baby, one row each",
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
              "Girls, boys and baby",
              "Each with its own sub-categories, and a piece in two when it belongs there."
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
          name: "Gifts and sets",
          title: "Wrapped, with a card",
          text: "Newborn gift boxes, little gifts under a price and whole outfits sold as one.",
          features: [
            [
              "Gift wrapping and a card",
              "Offered with the newborn gifts in the cart, each priced by the shop."
            ],
            [
              "The card's message",
              "Written at checkout, or started from a line to tap."
            ],
            [
              "Little gifts under a price",
              "A list of the shop's pieces at a price or under."
            ],
            [
              "Ready-made sets",
              "Whole outfits sold as one, with every piece in them named."
            ],
            [
              "What it's made of",
              "The fabric, the fit and how to wash it on every piece's page."
            ],
            [
              "Badges",
              "Organic cotton, gift wrapping on offer, tested for children's safety."
            ]
          ]
        },
        {
          name: "Designed in Yallapp Studio",
          title: "Four templates, every part yours to change",
          text: "Toota comes in four premium templates, built only from Studio's elements.",
          features: [
            [
              "The story world and the nursery",
              "Template C, the demo: Tooti the mascot, the ages as bubbles and wavy edges; template D: linen and sage, a size ruler and the baby gift list. TOOTA and MINIMO, A and B, kept."
            ],
            [
              "Light and dark",
              "Every template has a designed night."
            ],
            [
              "Toota's worlds",
              "Girls, boys, baby and newborn gifts as soft cards, each opening its category."
            ],
            [
              "A bubble bar",
              "Home, Shop, Favourites, Cart and Me, the open one a bubble with its name."
            ],
            [
              "Ready sections",
              "Shopping by age, the size finder, the gift sets and more, for any store."
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
          text: "Toota works with products kept in Yallapp, or with the online shop you already have.",
          features: [
            [
              "Products in Yallapp",
              "Everything on this page: categories inside categories, sizes by age, the gifts and their add-ons."
            ],
            [
              "WordPress and other platforms",
              "Their categories and sub-categories in the menu, their sizes and stock on the page."
            ],
            [
              "Coming next",
              "The size chart from a connected platform."
            ]
          ]
        }
      ],
      bundleTitle: "One app, your dashboard, and your shop if you have one",
      bundleText: "The customers' app is built and published under the shop's name from one Studio project. Its products come from Yallapp, or from the shop's own platform.",
      bundleNodes: [
        [
          "Toota",
          "Parents, on Android and iPhone"
        ],
        [
          "Yallapp Studio",
          "The shop: its look, categories, sizes and gifts"
        ],
        [
          "The shop's website",
          "WooCommerce, Shopify or another, if it has one"
        ]
      ],
      bundleFlows: [
        "A new sub-category shows in its row of the menu",
        "A size sold out is greyed out in the app",
        "The size chart shows in the parent's language",
        "An order arrives with its sizes, its wrapping and its card"
      ],
      compareTitle: "How it compares",
      compareText: "Companies that make apps for online shops, as their own sites describe them, next to Yallapp and to having an agency build an app for you.",
      finale: {
        title: "Saturday, in the rain",
        text: "Youssef jumps in every puddle in his yellow raincoat. Across town, Adam sleeps under the knitted blanket, the card propped on the shelf. Mona has already added the new winter sets to their row."
      },
      photos: {
        "kids-hero": "Two girls in white dresses playing in a sunlit field",
        "kids-newborn": "A newborn baby asleep in a striped knit hat",
        "kids-gift": "A gift box in kraft paper tied with a pink ribbon",
        "kids-school": "A girl drawing at her desk by a window",
        "kids-party": "Pastel balloons against a pink wall",
        "kids-walk": "A little boy in a denim jacket, seen from behind"
      }
    },
    // 209 Toys
    // 209 Toot, the toy shop: a fourth birthday on Saturday, in its look A (Toot); look B (Mukaab) in its section.
    toys: {
      navName: "Toy shop app",
      metaTitle: "A toy shop app with shopping by age, safety and materials and birthday gifts with a card, designed in Yallapp Studio",
      metaDescription: "A day with Toot: a fourth birthday on Saturday, the toys for 3 to 5 years, a bear's safety and materials, the gift finder, the wrapping and the card in her words.",
      summary: "Shopping by age and by type of toy, each toy's age, safety and materials, a gift finder, gift wrapping and a birthday card, gifts under a price, in four premium templates.",
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
      systemsText: "Shopping by age, safety and materials, the birthday gifts and the offers, the four templates, and where the toys come from.",
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
          title: "Four templates, every part yours to change",
          text: "Toot comes in four premium templates, built only from Studio's elements.",
          features: [
            ["ADVENTURE MAP", "Template C, the demo: the shop as a sea chart, its categories islands, chunky pressed-out cards."],
            ["MONTESSORI", "Template D: wood and sage, the toys by skill and by age in quiet rows. Looks A and B, kept."],
            ["Light and dark", "Every template has a designed night."],
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
    // 210 Ghurza, the crochet shop: a blanket ordered in her mother's colours, the days it takes, the maker, yarn and a workshop, in its look A (GHURZA) by day and by night; look B (HABKA) in its section.
    crochet: {
      navName: "Crochet shop app",
      metaTitle: "A crochet and handmade shop app with custom orders, days to make, yarn and workshops, designed in Yallapp Studio",
      metaDescription: "A day with Ghurza: a blanket ordered in her mother's colours, the days it takes to make, the maker behind it, a starter kit and a seat at Saturday's workshop.",
      summary: "Custom orders with their own request page, the days each piece takes to make, the maker's story, yarn and tools, workshops and gift wrapping by hand, in four premium templates.",
      eyebrow: "Yallapp Studio · The crochet shop",
      title: "Olive and cream, in twelve days",
      intro: "Laila's mother turns sixty in two weeks, and Laila wants to give her something nobody else could. It's Wednesday evening in Maadi. This is how a few minutes with her phone become a blanket made by hand in her mother's colours, and a seat at a workshop for herself.",
      cast: "Laila orders from Ghurza, a crochet workshop in Cairo. Ghurza is the crochet and handmade template's demo: its pieces, names and prices are made up, its photos are real, and every screen below is the real app.",
      chapters: [
        {
          time: "21:30",
          kicker: "Maadi, late evening",
          title: "Something nobody else could give",
          text: "Laila opens Ghurza on the balcony. The home is warm and quick: the search, the categories in circles, the winter collection in cards that slide, the next one peeking from the edge. Under them, a card says a piece to your taste is made just for you, ready in 7 to 14 days."
        },
        {
          time: "21:34",
          kicker: "The custom order",
          title: "A blanket, in her mother's colours",
          text: "She taps Start your order. The page says how it works in four steps, then asks: the piece, the size, the yarn's colour and the details. She chooses Blanket, writes 120 by 150 cm, olive and cream like her mother's sofa, and asks for her mother's name stitched in one corner. Her name, her phone, and she sends it."
        },
        {
          time: "21:41",
          kicker: "Days to make",
          title: "Made in 3 to 4 days",
          text: "While she waits, she opens the ribbed scarf from New from the workshop. Every card says how long its piece takes to make, and so does the page: 3 to 4 days in cinnamon, olive or sand. Under the price, the shop offers its gift wrap with a card written by the maker."
        },
        {
          time: "22:05",
          kicker: "The maker",
          title: "Twenty-two years of stitches",
          text: "The phone has gone dark for the night, and so has Ghurza, in coffee brown. Further down the home, Umm Youssef, who runs the workshop, says every piece takes days of her time and more of her heart. Twelve makers, 4,800 pieces, all of them by hand."
        },
        {
          time: "22:10",
          kicker: "Yarn and a workshop",
          title: "Her own first stitch",
          text: "Laila has always wanted to learn. She adds the scarf starter kit, yarn, needles and a pattern in Arabic and English, and books a seat at Crochet basics for beginners, on the first Saturday of the month in Zamalek. Four seats were left; now there are three."
        },
        {
          time: "10:15",
          kicker: "Thursday, at the workshop",
          title: "Olive, cream, and a name",
          text: "At Ghurza, Umm Youssef opens the morning's requests. Laila's says a blanket, 120 by 150 cm, olive and cream, her mother's name in a corner. She calls her with the price and the time, 12 days, and chooses the yarn from the shelf herself.",
          push: {
            app: "Ghurza",
            title: "Your custom order",
            body: "Umm Youssef has started your blanket. It will be ready in 12 days."
          }
        }
      ],
      interlude: {
        quote: "Olive and cream, the colours of her mother's sofa.",
        text: "Everything in between was the shop's own: its pieces and the days each takes, its custom order and its questions, its yarn and tools, its workshops and their seats, set once in the dashboard."
      },
      statsTitle: "Small facts behind one blanket",
      stats: [
        "main categories in the demo's menu, workshops among them",
        "pieces, yarn, tools and seats in the demo",
        "days at most to make a blanket by hand",
        "languages, Arabic right to left"
      ],
      systemsTitle: "Every part, explained",
      systemsText: "The custom order, the days to make, yarn, tools and workshops, the four templates, and where the products come from.",
      systems: [
        {
          name: "The custom order",
          title: "Made just for her",
          text: "A card on the home opens the shop's own request page: how it works, then the questions.",
          features: [
            ["The piece", "A blanket, a cardigan, a scarf, a bag, a toy or something else."],
            ["The size", "In centimetres, or her own measurements."],
            ["The colour", "The yarn's colour in her own words."],
            ["Sent to the shop", "The request arrives with every answer, her name and her phone."],
            ["On the owner's phone", "The shop sees it in the dashboard and in Yallapp Business."]
          ]
        },
        {
          name: "Days to make",
          title: "How long, on every card",
          text: "A piece made to order says how many days it takes, on its card and its page.",
          features: [
            ["From and to", "3 to 4 days for a scarf, 10 to 14 for a blanket."],
            ["Colours and sizes", "Each colour and size with its own stock of yarn."],
            ["Ready to ship", "Yarn and tools say nothing: they leave the same day."],
            ["Set once", "The shop writes the days on the product in the dashboard."]
          ]
        },
        {
          name: "Yarn, tools and workshops",
          title: "Everything to make your own",
          text: "The shop sells what it makes with, and teaches how.",
          features: [
            ["Shop by yarn", "Cotton, merino and raffia, each card opening its category."],
            ["Hooks and kits", "Starter kits with the yarn, the hook and a pattern."],
            ["Workshops", "Each workshop a seat in the shop, in the studio or online."],
            ["Seats left", "A seat booked is one fewer, so no workshop is overbooked."],
            ["Wrapped by hand", "A gift wrap and a card written by the maker, with any piece."]
          ]
        },
        {
          name: "Designed in Yallapp Studio",
          title: "Four templates, every part yours to change",
          text: "Ghurza comes in four premium templates, built only from Studio's elements.",
          features: [
            ["MAKERS' MARKET", "Template C, the demo: stitched paper and calligraphic headlines, who made each piece and how."],
            ["Light and dark", "Every template has a designed night."],
            ["A compact hero", "The collections in cards about 210 points tall, the next one peeking."],
            ["A floating bar", "Home, Shop, Cart, Orders and Account, the open one lit."],
            ["COZY STUDIO", "Template D: dusty rose, ready pieces or kits, the pattern of the week and the month's classes. Looks A and B, kept."],
            ["Three languages", "English, Arabic right to left, and Turkish."]
          ]
        },
        {
          name: "Where the products come from",
          title: "Your products, or your shop's platform",
          text: "Ghurza works with products kept in Yallapp, or with the online shop you already have.",
          features: [
            ["Products in Yallapp", "Everything on this page: categories inside categories, days to make and custom orders."],
            ["WordPress and other platforms", "Their categories and products in the app."],
            ["Coming next", "Days to make from a connected platform."]
          ]
        }
      ],
      bundleTitle: "One app, your dashboard, and your shop if you have one",
      bundleText: "The customers' app is built and published under the shop's name from one Studio project. Its products come from Yallapp, or from the shop's own platform.",
      bundleNodes: [
        ["Ghurza", "Customers, on Android and iPhone"],
        ["Yallapp Studio", "The shop: its look, pieces, custom orders and workshops"],
        ["The shop's website", "WooCommerce, Shopify or another, if it has one"]
      ],
      bundleFlows: [
        "A custom order arrives with every answer",
        "Days to make show on every card",
        "A workshop seat booked is one fewer",
        "A gift wrap goes with any piece"
      ],
      compareTitle: "How it compares",
      compareText: "Companies that make apps for online shops, as their own sites describe them, next to Yallapp and to having an agency build an app for you.",
      finale: {
        title: "Twelve days later",
        text: "The blanket arrives wrapped in cotton paper and tied with yarn, a card in Umm Youssef's hand on top. Her mother finds her name in the corner before anything else. On Saturday, in Zamalek, Laila makes her first stitch, and undoes it, and makes it again."
      },
      photos: {
        "crochet-cozy-sweater": "A woman in a soft grey knitted sweater, holding its collar to her face",
        "crochet-fluffy-blanket": "A cup of coffee and an open book on a fluffy white blanket",
        "crochet-knit-flatlay": "A crochet piece in taupe yarn with a hook, beside a notebook and balls of yarn",
        "crochet-knit-coffee": "A knitted piece on its needles beside a cup of coffee and a pattern",
        "crochet-mittens-coffee": "Hands in grey knitted mittens around a steaming cup",
        "crochet-scarves-stack": "Crocheted throws in olive, grey and cream, folded in a stack"
      }
    },
    // 210 Sakan, the home decor shop.
    decor: {
      navName: "Home decor shop app",
      metaTitle: "A home decor shop app with shop the look, rooms, styles and gifts with a card, designed in Yallapp Studio",
      metaDescription: "A day with Sakan: a new flat, a styled dining corner bought piece by piece, a vase sent as a gift with a card, and the lanterns for Ramadan.",
      summary: "Shop the look on a styled room, shop by room and by style, sizes in cm, gifts wrapped with a card and the seasons' banners, in four premium templates.",
      eyebrow: "Yallapp Studio · The home decor shop",
      title: "A corner for two, by Friday",
      intro: "Hessa and her husband moved into a small flat in Riyadh last week. The dining corner is a table they borrowed and two boxes. It's Tuesday evening. This is how a few minutes with her phone become a corner they eat in, and a gift for her sister.",
      cast: "Hessa shops at Sakan, a home decor house in Riyadh. Sakan is the home decor template's demo: its pieces, names and prices are made up, its photos are real, and every screen below is the real app.",
      chapters: [
        {
          time: "20:40",
          kicker: "Riyadh, after dinner",
          title: "Two boxes and a borrowed table",
          text: "Hessa opens Sakan on the sofa. The home is small and quick: the search, the categories, and the season's collections in wide photo cards that slide, the next one peeking from the edge. Under them, four rooms: the bedroom, the living room, the dining room and the reading corner."
        },
        {
          time: "20:44",
          kicker: "Complete the room",
          title: "A tap on the orchid",
          text: "Further down, a styled dining corner fills the screen: a white table, two white chairs, an orchid in a white pot. Each piece has a numbered label on the photo. She taps the orchid, and its page opens. Under the photo, the three pieces in a row, with their prices."
        },
        {
          time: "20:47",
          kicker: "The table's page",
          title: "80 by 80, it fits",
          text: "The table says its size in centimetres: 80 wide, 80 deep, 75 high. She measures the corner with the tape from a drawer: 85 centimetres. The chair comes in white, black and sage; black is almost gone, so she keeps white."
        },
        {
          time: "20:52",
          kicker: "The menu",
          title: "Every room, a row",
          text: "She taps the menu beside the bell. Every room of the shop is a row of cards with their photos: the living room with its vases, cushions and chairs, the bedroom with its linen and lamps, then the plants, the seasons and the gifts. She slides the living room row and taps Vases & bowls."
        },
        {
          time: "20:58",
          kicker: "A gift",
          title: "Twin vases for Noura",
          text: "Her sister Noura has a new home too. Hessa adds the twin vases on their oak tray, then gift wrapping with a card. At checkout she writes the card herself: \"For your first spring in the new flat.\" She copies the shop's code, SAKAN10, and pays."
        },
        {
          time: "09:15",
          kicker: "Wednesday, at the shop",
          title: "Wrapped in olive paper",
          text: "At Sakan, the morning's orders are open. Hessa's says a table, two chairs, an orchid, and the twin vases wrapped as a gift with a card. The card's words print on the packing slip. On the app's home, the Ramadan banner is already up, with the brass lanterns.",
          push: {
            app: "Sakan",
            title: "Order 3124",
            body: "Your pieces are on their way. Returns are free within 14 days."
          }
        }
      ],
      interlude: {
        quote: "Tuesday at nine. Friday's dinner at a real table.",
        text: "Everything in between was the shop's own: its rooms and their rows, the styled corner and its pieces, the sizes in centimetres, the gift wrapping and the card, set once in the dashboard."
      },
      statsTitle: "Small facts behind one dining corner",
      stats: [
        "main categories in the demo's menu, its rooms first",
        "sub-categories sliding in their rows",
        "days to return a piece, picked up from the door",
        "languages, Arabic right to left"
      ],
      systemsTitle: "Every part, explained",
      systemsText: "Shop the look, rooms and styles, gifts and seasons, the four templates, and where the products come from.",
      systems: [
        {
          name: "Shop the look",
          title: "A styled room, each piece a tap away",
          text: "A room photo with a label on each piece, and the pieces under it.",
          features: [
            [
              "Spots on the photo",
              "Each piece has a numbered label; a tap opens its page."
            ],
            [
              "The pieces in a row",
              "Under the photo, every piece in the look with its price."
            ],
            [
              "Shop the look",
              "One button to the pieces, to buy them together or one by one."
            ],
            [
              "In the editor too",
              "Shop the look is an element of Studio's library, for any store."
            ]
          ]
        },
        {
          name: "Rooms and styles",
          title: "Shop the way people think of a home",
          text: "The shop's categories are its rooms, and the menu shows every one of them.",
          features: [
            [
              "By room",
              "Photo tiles for the living room, the bedroom, the dining room and the reading corner, each opening its room."
            ],
            [
              "By style",
              "Natural, minimal, warm earth, classic: a row of chips under the photos."
            ],
            [
              "A row per room",
              "The menu beside the bell: each room a row of cards, its sub-categories after it."
            ],
            [
              "Search on top",
              "One field searches every room."
            ]
          ]
        },
        {
          name: "Gifts and seasons",
          title: "Wrapped by hand, with a card",
          text: "Any piece can leave the shop as a gift.",
          features: [
            [
              "Gift wrapping",
              "An add-on in the cart, offered with every piece."
            ],
            [
              "The card message",
              "Written at checkout, with ready beginnings to tap, in three languages."
            ],
            [
              "The seasons",
              "Ramadan and the new year as banners, each opening its own category."
            ],
            [
              "Weekend offers",
              "A flash sale with its countdown and how many are left."
            ]
          ]
        },
        {
          name: "Designed in Yallapp Studio",
          title: "Four templates, every part yours to change",
          text: "Sakan comes in four premium templates, built only from Studio's elements.",
          features: [
            ["ATHAR", "Template C, the demo: a museum wall in gallery white, one framed piece with its label, the halls in Roman numerals."],
            ["MAZAJ", "Template D: a moodboard in terracotta and cream, taped polaroids and shop by colour. Looks A and B, kept."],
            ["Light and dark", "Every template has a designed night."],
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
              "Complete the room, shop by style, the seasons, the collections and more, for any store."
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
          text: "Sakan works with products kept in Yallapp, or with the online shop you already have.",
          features: [
            [
              "Products in Yallapp",
              "Everything on this page: rooms inside rooms, colours with their stock, sizes in cm and the gift add-on."
            ],
            [
              "WordPress and other platforms",
              "Their categories and sub-categories in the menu, their stock on the page."
            ],
            [
              "Sizes in centimetres",
              "Width, depth and height on the card and the page."
            ]
          ]
        }
      ],
      bundleTitle: "One app, your dashboard, and your shop if you have one",
      bundleText: "The customers' app is built and published under the shop's name from one Studio project. Its products come from Yallapp, or from the shop's own platform.",
      bundleNodes: [
        [
          "Sakan",
          "Customers, on Android and iPhone"
        ],
        [
          "Yallapp Studio",
          "The shop: its look, rooms, styled corners and offers"
        ],
        [
          "The shop's website",
          "WooCommerce, Shopify or another, if it has one"
        ]
      ],
      bundleFlows: [
        "A new piece shows in its room's row of the menu",
        "A colour sold out can't be chosen in the app",
        "The gift card's words arrive with the order",
        "The season's banner opens its category"
      ],
      compareTitle: "How it compares",
      compareText: "Companies that make apps for online shops, as their own sites describe them, next to Yallapp and to having an agency build an app for you.",
      finale: {
        title: "Friday, at eight",
        text: "The table fits the corner with five centimetres to spare. The orchid has opened two more flowers. Noura sends a photo of the twin vases on her windowsill, the card propped against them."
      },
      photos: {
        "decor-hero": "Dried wheat in a small clay vase beside a white pumpkin on a linen cloth",
        "decor-room": "A white dining table with two white chairs and an orchid",
        "decor-vases": "Two white vases with pink blossoms on an oak tray",
        "decor-lantern": "A brass and glass lantern with a candle on a table",
        "decor-pottery": "Shelves of handmade ceramic bowls and cups",
        "decor-reading": "A reading corner with a bentwood armchair and a black side table"
      }
    },
    furniture: {
      navName: "Furniture shop app",
      metaTitle: "A furniture shop app with rooms, sizes in cm, delivery and assembly on your day, designed in Yallapp Studio",
      metaDescription: "A week with Rukn: a first living room, a sofa in the right fabric, 220 cm on a 240 cm wall, delivery and assembly on Saturday, and a unit made to measure.",
      summary: "Rooms and their pieces, fabrics and colours with the stock of each, sizes in cm, delivery and assembly on the customer's day, made-to-measure requests, in four premium templates.",
      eyebrow: "Yallapp Studio · The furniture shop",
      title: "A sofa that fits the wall",
      intro: "Sara has the keys to her first flat in Riyadh and a living room with nothing in it but a rug. It's Wednesday evening. This is how a week with her phone becomes a sofa in the right fabric, delivered and assembled on the day she chose.",
      cast: "Sara shops at Rukn, a furniture house in Riyadh. Rukn is the furniture shop template's demo: its furniture, names and prices are made up, its photos are real, and every screen below is the real app.",
      chapters: [
        {
          time: "20:40",
          kicker: "Riyadh, an empty room",
          title: "A living room with nothing in it",
          text: "Sara opens Rukn sitting on the floor. The home is quiet and quick: the search, the rooms in circles, the season's collection in cards that slide. Under them, four promises side by side: free delivery and assembly, the warranty, a delivery day of her choosing, and a small tag that says installments are coming soon."
        },
        {
          time: "20:44",
          kicker: "The menu",
          title: "Every room, a row",
          text: "The menu beside the bell opens the whole house: Living room first, with Sofas, Armchairs, Coffee tables and TV units sliding after it, then Bedroom, Dining room, Office and Outdoor. She taps Sofas."
        },
        {
          time: "20:52",
          kicker: "The sofa's page",
          title: "Bouclé or velvet",
          text: "The Sadeer sofa comes in bouclé, velvet or linen, in ivory, olive or sand. Olive velvet is down to the last two. She can't decide from a screen, so she asks for the free fabric samples on the home: five swatches, at her door in three days."
        },
        {
          time: "21:05",
          kicker: "With a tape measure",
          title: "220 cm on a 240 cm wall",
          text: "Under the name, every card says its size: W 220 × D 95 × H 82 cm. She measures the wall between the window and the door: 240. Ten centimetres on each side. The Najd coffee table goes on the photo of the complete set, its spot one tap away."
        },
        {
          time: "Saturday",
          kicker: "Her day, her time",
          title: "Saturday, nine to twelve",
          text: "The samples came on Sunday; olive velvet it is. At checkout she picks Saturday, nine to twelve, before the afternoon's one place goes. Assembly is free over 1,500 SAR, and she adds the removal of the old armchair for 199."
        },
        {
          time: "09:20",
          kicker: "At Rukn's workshop",
          title: "A unit to the centimetre",
          text: "The TV wall is 186 cm, and no unit fits it. Sara sends a made-to-measure request with the piece, its size W × D × H, oak and a few words. At Rukn, Faisal finds it in the requests beside the morning's orders and calls her with a price before noon.",
          push: {
            app: "Rukn",
            title: "Order 3104",
            body: "Your sofa arrives Saturday between 9 and 12. The team will assemble it."
          }
        }
      ],
      interlude: {
        quote: "Measured on Wednesday. Sitting on it on Saturday.",
        text: "Everything in between was the shop's own: its rooms and their pieces, the fabrics and colours and the stock of each, the sizes in cm, the delivery days and times, the assembly and the requests, set once in the dashboard."
      },
      statsTitle: "Small facts behind one sofa",
      stats: [
        "rooms in the demo's menu, each a row of cards",
        "kinds of piece sliding in their rows",
        "days ahead a customer can pick for delivery",
        "languages, Arabic right to left"
      ],
      systemsTitle: "Every part, explained",
      systemsText: "Rooms and the menu, fabrics and sizes, delivery and assembly, made to measure, and the four templates.",
      systems: [
        {
          name: "Shop by room",
          title: "Every room, one row each",
          text: "The shop's rooms are its main categories: the circles, the tiles and the menu open them.",
          features: [
            ["Rooms as categories", "Living room, Bedroom, Dining room, Office and Outdoor, each with its kinds of piece."],
            ["A row per room", "The menu shows each room as a row of cards that slides."],
            ["Tiles that open", "A room's tile opens that room in the shop."],
            ["Search on top", "One field searches every room."]
          ]
        },
        {
          name: "Fabrics, colours and sizes",
          title: "The stock of every fabric",
          text: "A piece comes in its fabrics or materials and its colours, and the shop keeps the stock of each.",
          features: [
            ["Fabric and material", "Bouclé, velvet, linen, oak or walnut: each a choice on the page."],
            ["Colour by colour", "Every fabric in every colour is its own piece of stock."],
            ["Sizes in cm", "Width, depth and height on every card and on the page."],
            ["Gone is gone", "A combination with none left is greyed out."],
            ["Made to order", "A piece made in the workshop says how many days it takes."]
          ]
        },
        {
          name: "Delivery and assembly",
          title: "On the customer's day",
          text: "The customer picks the day and the time; the shop's team brings the piece and assembles it.",
          features: [
            ["Days and times", "The shop's next days and its slots, a full one shown as full."],
            ["Free over an amount", "Delivery and assembly free over the shop's amount."],
            ["Services as add-ons", "Assembly and the old furniture's removal, offered with the pieces they fit."],
            ["Warranty and returns", "The warranty in the promises, returns within the shop's days."]
          ]
        },
        {
          name: "Made to measure",
          title: "A request, not a guess",
          text: "A made-to-measure page with its steps and a form the shop keeps as a request.",
          features: [
            ["The request form", "The piece, its size W × D × H, the material or fabric, the colour and the details."],
            ["Sizes that fit", "The customer writes the wall's size; the workshop makes to it."],
            ["In the dashboard", "Each request arrives in the dashboard and in Yallapp Business."],
            ["Installments coming soon", "A tag in the promises; the app takes no installments yet."]
          ]
        },
        {
          name: "Designed in Yallapp Studio",
          title: "Four templates, every part yours to change",
          text: "Rukn comes in four premium templates, built only from Studio's elements.",
          features: [
            ["MIZAN", "Template C, the demo: the shop as a set of drawings in black and white, every piece with its width, depth and height."],
            ["Light and dark", "Every template has a designed night."],
            ["A compact hero", "The collections in cards about 210 points tall, the next one peeking."],
            ["A floating bar", "Home, Shop, Cart, Orders and Account, the open one marked."],
            ["MANZIL", "Template D: room by room in oat and navy, a room switcher at the top. Looks A and B, kept."],
            ["Three languages", "English, Arabic right to left, and Turkish."]
          ]
        }
      ],
      bundleTitle: "One app, your dashboard, and your shop if you have one",
      bundleText: "The customers' app is built and published under the shop's name from one Studio project. Its products come from Yallapp, or from the shop's own platform.",
      bundleNodes: [
        ["Rukn", "Customers, on Android and iPhone"],
        ["Yallapp Studio", "The shop: its look, rooms, fabrics and delivery days"],
        ["The shop's website", "WooCommerce, Shopify or another, if it has one"]
      ],
      bundleFlows: [
        "A new piece shows in its room's row",
        "A fabric sold out is greyed out in the app",
        "A delivery slot that fills up shows as full",
        "A made-to-measure request arrives in the dashboard"
      ],
      compareTitle: "How it compares",
      compareText: "Companies that make apps for online shops, as their own sites describe them, next to Yallapp and to having an agency build an app for you.",
      finale: {
        title: "Saturday, at eleven",
        text: "The team leaves with the boxes and the old armchair. The olive velvet looks warmer than on the screen. Faisal has already added a new armchair to the Living room row, and somewhere in Riyadh someone is measuring a wall."
      },
      photos: {
        "furniture-hero": "A pale blue loveseat with patterned cushions by a bright window",
        "furniture-fabric": "A mid-century armchair in an orange floral fabric",
        "furniture-measure": "A long white TV unit on a wall in a bright living room",
        "furniture-custom": "A long wooden dining table with grey upholstered chairs under a chandelier",
        "furniture-terrace": "A covered terrace with wooden chairs looking out to the sea",
        "furniture-home": "A white leather sofa with checked cushions under a painting"
      }
    },
    // 211 Madar, the electronics shop: a laptop for a new job and an old phone traded in, in its look A (MADAR); look B (NABD) in its section.
    electronics: {
      navName: "Electronics shop app",
      metaTitle: "An electronics shop app with specs, compare, warranty and trade-in, designed in Yallapp Studio",
      metaDescription: "A week with Madar: a new job, a laptop chosen by its specs, two phones compared side by side, a year more of warranty and an old phone traded in.",
      summary: "Every product's specifications as a table, two or three compared side by side, colours and storages each with its price, the warranty and more cover, trade-in and installments coming soon, in four premium templates.",
      eyebrow: "Yallapp Studio · The electronics shop",
      title: "Sunday, with the right laptop",
      intro: "Faisal starts a new job on Sunday and his old laptop won't make it. It's Wednesday evening in Riyadh. This is how a few evenings with his phone become the right laptop, a new phone, and the old one traded in.",
      cast: "Faisal shops at Madar, an all-in-one electronics store in Riyadh. Madar is the electronics shop template's demo: its brands, products and prices are made up, its photos are real, and every screen below is the real app.",
      chapters: [
        {
          time: "20:40",
          kicker: "Riyadh, after work",
          title: "A laptop by Sunday",
          text: "Faisal opens Madar on the sofa. The home is small and quick: the search, the categories, the week's launches in cards that slide, the next one peeking. Under them, one line of promises: delivery in 24 hours, free installation, a certified warranty, and installments, coming soon."
        },
        {
          time: "20:44",
          kicker: "The menu",
          title: "Every category, a row",
          text: "He taps the menu beside the bell. Phones, Laptops, Tablets & watches, TVs: each category is a row of cards, its sub-categories sliding after it. He slides Laptops and taps Thin & light."
        },
        {
          time: "20:51",
          kicker: "The laptop's page",
          title: "Read the specs, not the ads",
          text: "The ARCLINE Air 14. Its specifications are a clean table, in Arabic when the app is: the screen, the processor, the memory, the storage, the battery, the weight. He chooses 16 GB with 1 TB, and the price changes with it. Under the price, a quiet tag: installments, coming soon."
        },
        {
          time: "21:05",
          kicker: "Compare",
          title: "Two phones, side by side",
          text: "His phone is three years old too. He adds the ZENRA X1 and the X1 Pro to compare. The two sit side by side, spec by spec: 6.3 or 6.7 inches, 4,400 or 5,000 mAh, the cameras, the price. He picks the Pro, in titanium, 256 GB, and adds a year more of Madar Care."
        },
        {
          time: "21:12",
          kicker: "Trade-in",
          title: "What the old phone is worth",
          text: "On the trade-in page he chooses his old phone's model, its storage and its condition: good. The app says what it's worth, and he sends the request with his number. It lands in the shop's dashboard, where the team calls him back."
        },
        {
          time: "10:15",
          kicker: "Thursday, at the shop",
          title: "Checked, packed, on its way",
          text: "At Madar, Khalid opens the morning's orders and the trade-in requests. Faisal's says the laptop with 1 TB and the phone with its warranty. Khalid calls about the old phone: it will be checked at the door, and its value taken off.",
          push: {
            app: "Madar",
            title: "Order 4127",
            body: "Your order is on its way. Have your old phone ready for the trade-in."
          }
        }
      ],
      interlude: {
        quote: "Wednesday evening. Sunday, at a new desk.",
        text: "Everything in between was the shop's own: its categories and their rows, its specifications, its colours and storages with their prices, its warranty and cover, its trade-in prices, set once in the dashboard."
      },
      statsTitle: "Small facts behind one laptop",
      stats: [
        "main categories in the demo's menu, each a row of cards",
        "products compared side by side, at most",
        "days to return, shown under every price",
        "languages, Arabic right to left"
      ],
      systemsTitle: "Every part, explained",
      systemsText: "The specifications and the compare sheet, colours, storages and the warranty, trade-in, the four templates, and where the products come from.",
      systems: [
        {
          name: "Specifications and compare",
          title: "Read them, then put them side by side",
          text: "Every product has its specifications, and any two or three can be compared.",
          features: [
            ["A clean table", "The screen, the processor, the memory, the storage and the rest, label and value."],
            ["Side by side", "Two or three products in columns, spec by spec, the ones they share first."],
            ["In the app's language", "The labels Yallapp knows are named in English, Arabic or Turkish."],
            ["Filters by spec", "The shop filtered by a spec's value, such as 16 GB."],
            ["In the editor too", "The table, the compare sheet and the filter are elements of Studio's library, for any store."]
          ]
        },
        {
          name: "Colours, storages and the warranty",
          title: "Each choice with its price",
          text: "A phone comes in its colours and storages, each storage with its own price and stock.",
          features: [
            ["Colour and storage", "Every combination is its own piece of stock, its own price."],
            ["Gone is gone", "A storage with none left in the colour chosen can't be chosen."],
            ["The warranty", "The maker's warranty in the specifications, and the returns under the price."],
            ["More cover", "A year more, or a screen and liquid cover, added before the cart."],
            ["Installments, coming soon", "Only a tag: no way to pay in instalments is offered yet."]
          ]
        },
        {
          name: "Trade-in",
          title: "The old phone, worth something",
          text: "The shop sets the devices it takes and what it pays; the app estimates.",
          features: [
            ["The shop's prices", "Each model and storage with its top price, and a share for each condition."],
            ["An estimate in seconds", "The model, the storage and the condition, then what it's worth."],
            ["A request the shop sees", "The customer's number and the estimate land in the dashboard."],
            ["Checked at the door", "The shop checks the device when it delivers the new one."]
          ]
        },
        {
          name: "Designed in Yallapp Studio",
          title: "Four templates, every part yours to change",
          text: "Madar comes in four premium templates, built only from Studio's elements.",
          features: [
            ["MADAR GRID", "Template C, the demo: a bento of dark glass tiles, the deal of the day beside the best seller."],
            ["The colour stage", "Template D: every device on its own saturated colour, big snapping cards. Looks A and B, kept."],
            ["Light and dark", "Every template has a designed night."],
            ["A compact hero", "The launches in cards about 210 points tall, the next one peeking."],
            ["A floating bar", "Home, Shop, Cart, Orders and Account, the open one lit."],
            ["Ready sections", "Trade-in, compare, the specs, the services, the star of the season and more, for any store."],
            ["Three languages", "English, Arabic right to left, and Turkish."]
          ]
        },
        {
          name: "Where the products come from",
          title: "Your products, or your shop's platform",
          text: "Madar works with products kept in Yallapp, or with the online shop you already have.",
          features: [
            ["Products in Yallapp", "Everything on this page: specifications, colours and storages, cover, trade-in."],
            ["WordPress and other platforms", "Their categories, variations and stock in the app."],
            ["Coming next", "Specifications and trade-in from a connected platform."]
          ]
        }
      ],
      bundleTitle: "One app, your dashboard, and your shop if you have one",
      bundleText: "The customers' app is built and published under the shop's name from one Studio project. Its products come from Yallapp, or from the shop's own platform.",
      bundleNodes: [
        ["Madar", "Customers, on Android and iPhone"],
        ["Yallapp Studio", "The shop: its look, specs, prices and trade-in"],
        ["The shop's website", "WooCommerce, Shopify or another, if it has one"]
      ],
      bundleFlows: [
        "A new laptop shows with its specifications",
        "A storage sold out can't be chosen in the app",
        "A trade-in request lands in the dashboard",
        "An order arrives with its colour, storage and cover"
      ],
      compareTitle: "How it compares",
      compareText: "Companies that make apps for online shops, as their own sites describe them, next to Yallapp and to having an agency build an app for you.",
      finale: {
        title: "Sunday, at nine",
        text: "The laptop is fast and quiet, as its specifications said. The new phone is in his pocket; the old one went back at the door. At Madar, Khalid adds next month's phones, each with its table, and somewhere in Riyadh someone is comparing two of them."
      },
      photos: {
        "electronics-hero": "A laptop, a mug and a small plant on a wooden desk",
        "electronics-phone": "A phone with three cameras beside a camera lens",
        "electronics-compare": "A tablet and a phone side by side on white marble",
        "electronics-desk": "A laptop open on a wooden table beside a plant",
        "electronics-glow": "A laptop's lit keyboard in the dark",
        "electronics-buds": "A phone and white earbuds on a white table"
      }
    },
    // 211 Nova, the mobiles shop: an old phone traded in for a new one, in its look A (NOVA); look B (emerald) in its section.
    mobiles: {
      navName: "Phone shop app",
      metaTitle: "A phone shop app with trade-in, certified used, specs and compare, designed in Yallapp Studio",
      metaDescription: "A day with Nova: an old phone valued in a minute, a new one in its storage, colour and warranty, two phones compared, and the trade-in landing with the shop.",
      summary: "Storage and colour with a price for each, a local or an international warranty, specs in a table, two phones compared, certified used with grades and trade-in, in four premium templates.",
      eyebrow: "Yallapp Studio · The phone shop",
      title: "The old phone pays for part of the new one",
      intro: "Karim's phone has a cracked back and a camera that blurs at night. It's Wednesday evening in Cairo. This is how ten minutes with that same phone become a new one, with the old one taken off the price.",
      cast: "Karim shops at Nova, a phone shop in Cairo. Nova is the phone shop template's demo: its devices, brands, names and prices are made up, its photos are real, and every screen below is the real app.",
      chapters: [
        {
          time: "20:40",
          kicker: "Nasr City, after work",
          title: "A camera that blurs at night",
          text: "Karim opens Nova on the balcony. The home is small and quick: the search, the categories in circles, and this season's phones in cards that slide, the next one peeking from the edge. Under them, three promises: trade-in, certified repair and a warranty on every device."
        },
        {
          time: "20:43",
          kicker: "What it's worth",
          title: "His old phone, in under a minute",
          text: "Halfway down the home, a card asks what his old phone is worth. He picks his model, its 256 GB and Good, not Like new, for the cracked back. The estimate appears at once, under the shop's own prices. He taps Start trade-in and leaves his name and number."
        },
        {
          time: "20:47",
          kicker: "The new phone's page",
          title: "256 GB, titanium, a local warranty",
          text: "The phone he wanted for months. Each storage has its own price; titanium is chosen, and the international warranty is cheaper but he keeps the local one. Under the price, a quiet tag says installments are coming soon. Below it, the specs in a table: the screen, the processor, the cameras, the battery."
        },
        {
          time: "20:52",
          kicker: "Compare",
          title: "Two phones, side by side",
          text: "He isn't sure, so he adds a second phone to Compare. The two sit side by side, spec by spec: 200 MP against 108, 5,000 mAh against 5,500, the price at the foot of each. The camera wins. He adds the first one to his cart with the leather case the page offers with it."
        },
        {
          time: "21:05",
          kicker: "For his sister",
          title: "Certified used, grade A",
          text: "Back on the home, at night now, the app has turned dark. His sister needs a phone for university: the certified used ones show their grade, their storage and their battery health. A Lumen 11, grade A, battery at 91%, with a 12-month warranty. He sends her the link."
        },
        {
          time: "10:15",
          kicker: "Thursday, at the shop",
          title: "A trade-in waiting",
          text: "At Nova, Hany opens the dashboard. Karim's trade-in is there with his model, its storage, its grade and the estimate the app showed him, beside his order. He calls, books a courier for the new phone and the old one in the same trip, and marks the request done.",
          push: {
            app: "Nova",
            title: "Order 3117",
            body: "Your new phone is on its way. Have the old one ready: the courier takes it."
          }
        }
      ],
      interlude: {
        quote: "Wednesday at nine. The old phone, gone with the courier.",
        text: "Everything in between was the shop's own: its categories and their rows, its storages and colours with a price for each, its warranties, its specs, its trade-in prices and grades, set once in the dashboard."
      },
      statsTitle: "Small facts behind one phone",
      stats: [
        "main categories in the demo's menu, each a row of cards",
        "grades of a certified used device, A+ to B",
        "days to return a device, shown under every price",
        "languages, Arabic right to left"
      ],
      systemsTitle: "Every part, explained",
      systemsText: "Trade-in, the phone's page with its specs and compare, certified used, the four templates, and where the products come from.",
      systems: [
        {
          name: "Trade-in",
          title: "What the old phone is worth",
          text: "The shop says which devices it takes and what each is worth; the app works out the estimate and sends the request.",
          features: [
            ["The device", "The customer picks a model from the shop's own list."],
            ["Its storage", "Each storage has its own top price."],
            ["Its condition", "Like new, good, fair or broken, each a share of that price."],
            ["The estimate", "Shown at once, before anything is sent."],
            ["A request for the shop", "The name, the number and the estimate land in the dashboard."],
            ["In the editor too", "The estimator is an element of Studio's library, inline or as a card."]
          ]
        },
        {
          name: "The phone's page",
          title: "Storage, colour, warranty and specs",
          text: "A phone comes in its storages and colours, each with its own price and stock.",
          features: [
            ["Storage and colour", "Every combination is its own piece of stock, with its own price."],
            ["Local or international", "A warranty to choose where the shop offers both."],
            ["Specs in a table", "The screen, the processor, the cameras, the battery, in the customer's language."],
            ["Compare", "Two or three devices side by side, spec by spec."],
            ["In three languages", "The specs' names in English, Arabic and Turkish."],
            ["Installments", "Only a tag that says they are coming soon; nothing to pay with yet."]
          ]
        },
        {
          name: "Certified used",
          title: "A grade you can trust",
          text: "Used devices are sold with what a buyer needs to know.",
          features: [
            ["The grade", "A+ like new, A excellent, B very good."],
            ["The battery", "Its health in percent, on the card and the page."],
            ["The warranty", "How long the shop stands behind it."],
            ["The saving", "The price new struck through beside it."],
            ["The deal of the day", "A flash sale with its countdown and how many are left."]
          ]
        },
        {
          name: "Designed in Yallapp Studio",
          title: "Four templates, every part yours to change",
          text: "Nova comes in four premium templates, built only from Studio's elements.",
          features: [
            ["KEYNOTE", "Template C, the demo: one phone alone on a black stage, the specs revealed one per row."],
            ["DEALS HUB", "Template D: fast and dense in hot pink, today's deals with their countdown. Looks A and B, kept."],
            ["Light and dark", "Every template has a designed night."],
            ["A compact hero", "This season's phones in cards about 210 points tall, the next one peeking."],
            ["A floating bar", "Home, Shop, Cart, Orders and Account, the open one a pill with its name."],
            ["Ready sections", "Trade-in, compare, by storage, certified used and more, for any store."],
            ["Three languages", "English, Arabic right to left, and Turkish."]
          ]
        },
        {
          name: "Where the products come from",
          title: "Your products, or your shop's platform",
          text: "Nova works with products kept in Yallapp, or with the online shop you already have.",
          features: [
            ["Products in Yallapp", "Everything on this page: specs, storages and colours, trade-in and the accessories."],
            ["WordPress and other platforms", "Their categories in the menu, their variations and stock on the page."],
            ["Coming next", "Specs and trade-in from a connected platform."]
          ]
        }
      ],
      bundleTitle: "One app, your dashboard, and your shop if you have one",
      bundleText: "The customers' app is built and published under the shop's name from one Studio project. Its products come from Yallapp, or from the shop's own platform.",
      bundleNodes: [
        ["Nova", "Customers, on Android and iPhone"],
        ["Yallapp Studio", "The shop: its look, categories, specs, trade-in and offers"],
        ["The shop's website", "WooCommerce, Shopify or another, if it has one"]
      ],
      bundleFlows: [
        "A trade-in request arrives with its estimate",
        "A storage sold out is greyed out in the app",
        "The specs show in the customer's language",
        "An order arrives with its storage, colour and warranty"
      ],
      compareTitle: "How it compares",
      compareText: "Companies that make apps for online shops, as their own sites describe them, next to Yallapp and to having an agency build an app for you.",
      finale: {
        title: "Friday, at the river",
        text: "The new camera sees in the dark. The old phone is on a shelf at Nova, checked at 72 points, waiting for its grade. Hany has already added this week's phones to their row, and somewhere in Cairo someone is working out what their own old phone is worth."
      },
      photos: {
        "mobiles-hero": "A hand holding a phone up to a grey sea and sky",
        "mobiles-box": "A new phone in its open black box with its charger and earphones",
        "mobiles-camera": "The back of a phone with three cameras beside an old film camera",
        "mobiles-hand": "A hand holding a phone against a pale grey wall",
        "mobiles-food": "Two hands taking a photo of a table of food with a phone",
        "mobiles-earbuds": "A phone lying on a white desk beside a pair of earbuds"
      }
    },
    // 211 Nawah, computers and gaming: a gaming PC built part by part in Jeddah, in its look A (NAWAH); look B (SILICA) in its section.
    computers: {
      navName: "Computers shop app",
      metaTitle: "A computers and gaming shop app with Build your PC, filters by spec and compare, designed in Yallapp Studio",
      metaDescription: "A week with Nawah: a gaming PC built part by part, every part checked, a laptop found by its specs, and two laptops compared side by side.",
      summary: "Build your PC with its compatibility checks, filters by processor, memory, storage and graphics, specifications as a table, compare and configure, in four premium templates.",
      eyebrow: "Yallapp Studio · The computers shop",
      title: "Part by part, and it fits",
      intro: "Faisal has saved for a gaming PC all year, and his sister Reem starts university next month without a laptop. It's Thursday night in Jeddah. This is how one app built the first and found the second.",
      cast: "Faisal and Reem shop at Nawah, a computers and gaming shop in Jeddah. Nawah is the computers shop template's demo: its products, brands and prices are made up, its photos are real, and every screen below is the real app.",
      chapters: [
        {
          time: "22:05",
          kicker: "Jeddah, Thursday night",
          title: "A PC, part by part",
          text: "Faisal opens Nawah. The home is small and quick: the search, the categories, a hero card with the next one peeking, and under it a card that says Build your PC, its parts in a row: processor, motherboard, memory, graphics, storage, power, case.",
        },
        {
          time: "22:09",
          kicker: "The processor first",
          title: "Twelve cores on AM-X",
          text: "He taps Start your build and chooses the N7, twelve cores on the AM-X socket. Every motherboard that takes another socket is still listed, but marked: it doesn't take this processor's socket. He chooses the full-size X-Arc board.",
        },
        {
          time: "22:14",
          kicker: "What doesn't fit says why",
          title: "DDR4 on a DDR5 board",
          text: "He has a DDR4 kit in his cart from last year. The builder marks it: the board takes DDR5. He takes the Swift 32 GB DDR5 kit instead, then the GX 470. The summary says the build needs 550 W with room to spare; he takes the 750 W supply, for a bigger card one day. The running total and the watts follow every choice.",
        },
        {
          time: "22:31",
          kicker: "The menu, for Reem",
          title: "Filter by what matters",
          text: "Reem takes the phone. From the menu, Find by spec shows the shop's laptops by processor, memory, storage and graphics card, each value with how many have it. She taps 16 GB, then opens the Ofuq 14 Air and reads its specifications in a table: the screen, the battery, the weight.",
        },
        {
          time: "22:40",
          kicker: "Side by side",
          title: "Two laptops, one table",
          text: "She adds the Ofuq 14 Air and the Lumen Slate 13 to Compare. One table, spec by spec: the Ofuq is lighter with a longer battery. She configures it with 32 GB of memory, the price changing as she chooses, and sees, under the price, Installments coming soon. She pays the whole of it with the shop's code, NAWAH10.",
        },
        {
          time: "11:00",
          kicker: "Saturday, at the workshop",
          title: "Built and tested",
          text: "At Nawah, Majed opens Faisal's order: eight parts, one build. He assembles it, tidies the cables and runs it under load for a day. Faisal's order moves to Built and tested, then On its way.",
          push: {
            app: "Nawah",
            title: "Order 3107",
            body: "Your build is assembled and tested. It's on its way.",
          },
        },
      ],
      interlude: {
        quote: "Eight parts. Not one that didn't fit.",
        text: "Everything in between was the shop's own: its categories and their rows, each product's specifications, the parts Build your PC asks for, the options and their prices, its warranty and returns, set once in the dashboard.",
      },
      statsTitle: "Small facts behind one build",
      stats: ["parts in the demo's Build your PC, in their order", "checks between the parts: the socket, the memory, the power and the size", "days to return, shown with every order", "languages, Arabic right to left"],
      systemsTitle: "Every part, explained",
      systemsText: "Build your PC, the filters by spec, the specifications and compare, the four templates, and where the products come from.",
      systems: [
        {
          name: "Build your PC",
          title: "Every part checked against the others",
          text: "The customer chooses a part at a time from the shop's own categories, and the app checks it against the parts already chosen.",
          features: [
            ["Part by part", "Processor, motherboard, memory, graphics card, storage, cooler, power supply and case, in the shop's order."],
            ["From the shop's categories", "Each part is a category the owner chooses; the cooler and the case can be left out."],
            ["The power it needs", "The processor's and graphics card's draw, and a quarter more to spare."],
            ["What fits", "The socket, the memory type, the power and the case's size, from each product's specifications."],
            ["Why not", "A part that doesn't fit stays in the list, marked with the reason."],
            ["One tap to the cart", "The whole build goes in the cart, its running total in sight."],
          ],
        },
        {
          name: "Filters by spec",
          title: "The shop by what's inside",
          text: "The values the shop's products take, as chips, each opening the shop filtered by it.",
          features: [
            ["Processor and graphics", "Every processor and graphics card the shop sells, as chips."],
            ["Memory and storage", "16 GB, 32 GB, 1 TB: tap one to see every product that has it."],
            ["How many", "Each value shows how many products have it."],
            ["From the specifications", "The owner writes each product's specifications once; the filters follow."],
            ["In the shop and the menu", "The filters on the home, over the shop and on a page of their own."],
            ["In the editor too", "The spec filter is an element of Studio's library, for any store."],
          ],
        },
        {
          name: "Specifications and compare",
          title: "One table, spec by spec",
          text: "Every product's specifications as a clean table, and up to three products side by side.",
          features: [
            ["A table on every page", "The specifications under the price, the first rows at once and the rest a tap away."],
            ["Compare", "Two or three products side by side, the specs they share first."],
            ["Configure", "Memory and storage as options, each with its own price."],
            ["Warranty in sight", "The warranty and the returns on the product's page."],
            ["Installments: coming soon", "Shown as coming soon only, never a way to pay."],
          ],
        },
        {
          name: "Designed in Yallapp Studio",
          title: "Four templates, every part yours to change",
          text: "Nawah comes in four premium templates, built only from Studio's elements.",
          features: [
            ["Battle station", "Template C, the demo: neon on black, cut-corner cards and Build your PC first."],
            ["Workstation", "Template D: clean blue-grey for business, a spec sheet, compare and a quote form. Looks A and B, kept."],
            ["Light and dark", "Every template has a designed night."],
            ["A compact hero", "Cards about 210 points tall, the next one peeking."],
            ["A floating bar", "Home, Shop, Cart, Orders and Account."],
            ["Ready sections", "Build your PC, the spec filters, ready builds compared and the device of the week, for any store."],
            ["Three languages", "English, Arabic right to left, and Turkish."],
          ],
        },
        {
          name: "Where the products come from",
          title: "Your products, or your shop's platform",
          text: "Nawah works with products kept in Yallapp, or with the online shop you already have.",
          features: [
            ["Products in Yallapp", "Everything on this page: the specifications, Build your PC and the filters."],
            ["WordPress and other platforms", "Their categories in the menu, their options and stock on the page."],
            ["Coming next", "The specifications and Build your PC from a connected platform."],
          ],
        },
      ],
      bundleTitle: "One app, your dashboard, and your shop if you have one",
      bundleText: "The customers' app is built and published under the shop's name from one Studio project. Its products come from Yallapp, or from the shop's own platform.",
      bundleNodes: [
        ["Nawah", "Customers, on Android and iPhone"],
        ["Yallapp Studio", "The shop: its look, categories, specifications and builder"],
        ["The shop's website", "WooCommerce, Shopify or another, if it has one"],
      ],
      bundleFlows: ["A new graphics card shows in its filter", "A part that doesn't fit says why", "The specifications show in the customer's language", "A build arrives as one order"],
      compareTitle: "How it compares",
      compareText: "Companies that make apps for online shops, as their own sites describe them, next to Yallapp and to having an agency build an app for you.",
      finale: {
        title: "Sunday, after ten",
        text: "The PC hums under Faisal's desk, quieter than he thought. Reem's laptop is in her bag for the first lecture. At Nawah, Majed has added a new graphics card, and it is already in its filter.",
      },
      photos: {
        "computers-hero": "A desk lit purple, a wide monitor showing a galaxy",
        "computers-parts": "A motherboard with a processor in its socket",
        "computers-socket": "A processor's gold pins in a motherboard's socket",
        "computers-laptop": "A laptop on a desk in a dark room, a lamp on",
        "computers-play": "Two hands on a blue-lit game controller",
        "computers-desk": "A man at a desk working on a monitor, speakers on each side",
      },
    },
  },
};
