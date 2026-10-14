import type { AppTemplate, BookingRules, CatalogCurrency, IntakeField, ListingPurpose, ListingSettings, TimeRange } from "../data/types";
import type { DemoId } from "./constants";
import type { AppFont } from "../build-config/types";
import type { CardStyle, Corners, LanguageCode } from "../pages/types";
import type { PictureName } from "./pictures";
import type { AppScreen } from "../marketing";

/**
 * What the demo apps contain (roadmap 16): made-up businesses (21 five) with
 * believable names, prices and texts. People, shops and addresses are
 * invented. Pictures are drawn in lib/demo/pictures.ts.
 */

export interface DemoBrand {
  appName: string;
  shortName: string;
  primaryColor: string;
  splashColor: string;
  secondaryColor: string;
  template: AppTemplate;
  font: AppFont;
  corners: Corners;
  cards: CardStyle;
  languages: LanguageCode[];
  icon: PictureName;
  banner: { picture: PictureName; heading: string; subheading: string };
  /** The app stores' listing. */
  androidPackage: string;
  storeTitle: string;
  shortDescription: string;
  fullDescription: string;
  /** A sentence about the business on the home page. */
  welcome: string;
}

export interface DemoCourse {
  title: string;
  instructor: string;
  level: string;
  category: string;
  priceCents: number;
  picture: PictureName;
  description: string;
  topics: { title: string; lessons: { title: string; minutes: number; text: string; preview?: boolean }[] }[];
}

export interface DemoProduct {
  sku: string;
  name: string;
  category: string;
  priceCents: number;
  salePriceCents: number | null;
  picture: PictureName;
  featured: boolean;
  description: string;
}

export interface DemoService {
  name: string;
  category: string;
  minutes: number;
  priceCents: number;
  picture: PictureName;
  color: string;
  description: string;
}

export interface DemoStaff {
  name: string;
  title: string;
  picture: PictureName;
  /** Service names. */
  services: string[];
  /** 21 A profile, for the clinic's doctors. */
  specialties?: string[];
  languages?: string[];
  bio?: string;
}

export interface DemoListing {
  reference: string;
  title: string;
  purpose: ListingPurpose;
  type: string;
  priceCents: number;
  pricePeriod: "month" | "year" | null;
  negotiable: boolean;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  area: number;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  yearBuilt: number | null;
  furnished: boolean | null;
  features: string[];
  pictures: PictureName[];
  featured: boolean;
  description: string;
}

/** What /demo says to try in each app (its name and icon come from lib/app/kinds.ts). */
export interface DemoGuide {
  summary: string;
  tryThis: string[];
  screens: AppScreen[];
}

export const DEMO_GUIDES: Record<DemoId, DemoGuide> = {
  lms: {
    summary: "An online academy with courses in design, business, languages and programming.",
    tryThis: [
      "Open a course and watch a free preview lesson",
      "Enroll in the free Excel course and mark lessons complete",
      "On Android, buy a paid course: the demo checkout takes no card",
      "Switch the app to Arabic or Turkish in Settings",
    ],
    screens: ["academy-home", "academy-course", "academy-lesson"],
  },
  store: {
    summary: "A flower and gift shop with categories, sale prices and free delivery over an amount.",
    tryThis: [
      "Browse the categories and open a product",
      "Add flowers and a gift box to the cart",
      "Check out: the demo checkout places the order without a card",
      "Find the order under Account › Orders",
    ],
    screens: ["store-home", "store-product", "store-cart"],
  },
  booking: {
    summary: "A hair and beauty studio with services, a team of three and their working hours.",
    tryThis: [
      "Pick a service and see the free times",
      "Choose who you'd like and book a time",
      "Find the appointment under Appointments and cancel it",
    ],
    screens: ["bookings-services", "bookings-slots"],
  },
  clinic: {
    summary: "A family clinic with a family doctor, a dentist and a physiotherapist, and a short intake form.",
    tryThis: [
      "Open a doctor's profile: specialties, languages and a few lines about them",
      "Book a visit and fill in the intake form (use made-up answers: everyone shares this account)",
      "Find the visit under Visits, with your answers, and cancel it",
    ],
    screens: ["clinic-intake", "clinic-doctor"],
  },
  real_estate: {
    summary: "An estate agency with homes for sale and for rent, with filters, favorites and messages.",
    tryThis: [
      "Search with filters: for rent, 2+ bedrooms, a price range",
      "Save a home to your favorites",
      "Message the office about a home and see the reply arrive",
    ],
    screens: ["realestate-search", "realestate-listing"],
  },
};

const PRIVACY_NOTE = "This is a demo app made by Yallapp to show what an app built with Yallapp can do. Everything in it is sample content.";

export const DEMO_BRANDS: Record<DemoId, DemoBrand> = {
  lms: {
    appName: "Nour Academy",
    shortName: "Nour",
    primaryColor: "#24476B",
    splashColor: "#F4EFE6",
    secondaryColor: "#F2B544",
    template: "classic",
    font: "Plus Jakarta Sans",
    corners: "soft",
    cards: "outlined",
    languages: ["en", "ar", "tr"],
    icon: "icon-academy",
    banner: { picture: "banner-academy", heading: "Learn something new this week", subheading: "Short lessons from people who do it every day." },
    androidPackage: "com.yallapp.demo.academy",
    storeTitle: "Nour Academy",
    shortDescription: "Short courses in design, business, languages and programming.",
    fullDescription: `Nour Academy brings short, practical courses to your phone: design, business, languages, photography and programming.\n\nWatch lessons, pick up where you stopped and track your progress.\n\n${PRIVACY_NOTE}`,
    welcome: "Practical courses you can finish. Start with a free preview lesson.",
  },
  store: {
    appName: "Lale Flowers",
    shortName: "Lale",
    primaryColor: "#B03A5B",
    splashColor: "#FBE3E8",
    secondaryColor: "#3E7A4A",
    template: "bold",
    font: "Outfit",
    corners: "round",
    cards: "elevated",
    languages: ["en", "tr"],
    icon: "icon-store",
    banner: { picture: "banner-store", heading: "Fresh flowers, delivered today", subheading: "Free delivery on orders over ₺1,500." },
    androidPackage: "com.yallapp.demo.store",
    storeTitle: "Lale Flowers",
    shortDescription: "Fresh flowers, gift boxes and sweets, delivered in Istanbul.",
    fullDescription: `Lale Flowers is a flower and gift shop: bouquets, potted plants, gift boxes, Turkish delight and candles.\n\nOrder in a few taps and follow your orders in the app.\n\n${PRIVACY_NOTE}`,
    welcome: "Bouquets made this morning, gift boxes and little treats.",
  },
  booking: {
    appName: "Studio Nur",
    shortName: "Studio Nur",
    primaryColor: "#2F6F62",
    splashColor: "#E7F2EF",
    secondaryColor: "#C0566B",
    template: "minimal",
    font: "DM Sans",
    corners: "round",
    cards: "flat",
    languages: ["en", "tr"],
    icon: "icon-bookings",
    banner: { picture: "banner-bookings", heading: "Book your next visit", subheading: "Hair, spa, nails and brows. Pick a time that suits you." },
    androidPackage: "com.yallapp.demo.bookings",
    storeTitle: "Studio Nur",
    shortDescription: "Book hair, spa, nails and brows at Studio Nur.",
    fullDescription: `Studio Nur is a hair and beauty studio. See every service with its price and length, choose who you'd like, and book a free time.\n\nYour appointments are in the app, where you can cancel up to a day before.\n\n${PRIVACY_NOTE}`,
    welcome: "Open Monday to Saturday, 10:00 to 19:00.",
  },
  clinic: {
    appName: "Kardelen Clinic",
    shortName: "Kardelen",
    primaryColor: "#2C6A8A",
    splashColor: "#E6F0F5",
    secondaryColor: "#E39B2E",
    template: "classic",
    font: "Lexend",
    corners: "soft",
    cards: "outlined",
    languages: ["en", "ar", "tr"],
    icon: "icon-clinic",
    banner: { picture: "banner-clinic", heading: "Book your visit in a minute", subheading: "Choose your doctor and a time. Answer a few questions before you come." },
    androidPackage: "com.yallapp.demo.clinic",
    storeTitle: "Kardelen Clinic",
    shortDescription: "Book visits with our family doctor, dentist and physiotherapist.",
    fullDescription: `Kardelen Clinic is a family clinic. See our doctors and what they do, choose a free time and answer a short intake form before your visit.\n\nYour visits are in the app, where you can cancel up to a day before. Payment is at the clinic.\n\n${PRIVACY_NOTE}`,
    welcome: "Open Monday to Friday, 09:00 to 18:00, and Saturday mornings.",
  },
  real_estate: {
    appName: "Nile Homes",
    shortName: "Nile Homes",
    primaryColor: "#9C5B2E",
    splashColor: "#F4EFE6",
    secondaryColor: "#2F6F62",
    template: "classic",
    font: "Manrope",
    corners: "round",
    cards: "elevated",
    languages: ["en", "ar"],
    icon: "icon-realestate",
    banner: { picture: "banner-realestate", heading: "Find your next home in Cairo", subheading: "Apartments, villas and offices for sale and for rent." },
    androidPackage: "com.yallapp.demo.realestate",
    storeTitle: "Nile Homes",
    shortDescription: "Homes for sale and for rent in Cairo and Giza.",
    fullDescription: `Nile Homes lists apartments, villas and offices in Cairo and Giza.\n\nSearch with filters, save homes to your favorites and message the office about any of them.\n\n${PRIVACY_NOTE}`,
    welcome: "Homes we know well, in the neighbourhoods we know best.",
  },
};

// Academy

export const COURSE_CURRENCY: CatalogCurrency = "TRY";
export const COURSE_CATEGORIES = ["Design", "Business", "Languages", "Photography", "Programming"];

export const DEMO_COURSES: DemoCourse[] = [
  {
    title: "UX Design Fundamentals",
    instructor: "Deniz Kaya",
    level: "Beginner",
    category: "Design",
    priceCents: 1450_00,
    picture: "course-ux",
    description:
      "Learn how designers turn a messy problem into a simple screen. You'll interview people, sketch ideas, build a clickable prototype and test it with real users.\n\nNo design software needed to start: paper and a pen will do.",
    topics: [
      {
        title: "Thinking like a designer",
        lessons: [
          { title: "What UX design is (and isn't)", minutes: 8, preview: true, text: "UX design is about how something works for the person using it, not only how it looks. In this lesson we look at three everyday apps and ask what makes them easy, or hard, to use." },
          { title: "Talking to the people you design for", minutes: 12, text: "Five good questions are worth more than fifty survey answers. You'll learn how to plan a short interview, what to ask, and how to listen without leading." },
        ],
      },
      {
        title: "From sketches to wireframes",
        lessons: [
          { title: "Sketching ten ideas in ten minutes", minutes: 10, text: "Quantity first, quality later. Fold a sheet of paper into eight and sketch a different idea in each box. The point is to get past the first, obvious idea." },
          { title: "Wireframes that answer questions", minutes: 14, text: "A wireframe is a question in the shape of a screen. We'll turn the best sketch into a wireframe and write down what we want to learn from it." },
          { title: "Testing with five people", minutes: 11, text: "Five people find most of the problems in a design. You'll run a short test, take notes and decide what to change first." },
        ],
      },
    ],
  },
  {
    title: "Excel for Small Business Owners",
    instructor: "Omar Farouk",
    level: "Beginner",
    category: "Business",
    priceCents: 0,
    picture: "course-excel",
    description: "A free course for anyone who runs a small business: keep your sales, costs and stock in one tidy workbook, and see at a glance how the month is going.",
    topics: [
      {
        title: "A workbook that works",
        lessons: [
          { title: "Setting up your sales sheet", minutes: 9, preview: true, text: "One row per sale, one column per detail: date, customer, product, quantity, price. We'll format it as a table so it grows by itself." },
          { title: "Totals with SUMIFS", minutes: 12, text: "How much did you sell last month, of which product, to whom? One formula answers all three. We'll build it step by step." },
        ],
      },
      {
        title: "Seeing the month at a glance",
        lessons: [
          { title: "A chart in two clicks", minutes: 7, text: "Select the totals and insert a column chart. Then we'll remove everything that doesn't help you read it." },
          { title: "Keeping an eye on stock", minutes: 10, text: "Conditional formatting turns low stock red. You'll set a minimum for each product and see what to reorder every Monday." },
        ],
      },
    ],
  },
  {
    title: "Product Photography with Your Phone",
    instructor: "Emre Aydın",
    level: "Beginner",
    category: "Photography",
    priceCents: 890_00,
    picture: "course-photo",
    description: "Take product photos that sell, with the phone in your pocket, a window and a sheet of white card. Light, angles, backgrounds and quick edits.",
    topics: [
      {
        title: "Light and background",
        lessons: [
          { title: "Window light is all you need", minutes: 8, preview: true, text: "Soft light from a window, a sheet of white card to bounce it back, and your product halfway between. That's the whole studio." },
          { title: "Backgrounds that don't distract", minutes: 9, text: "Plain, light and a little away from the wall. We'll try three backgrounds and see which one makes the product stand out." },
        ],
      },
      {
        title: "Shooting and editing",
        lessons: [
          { title: "Five angles every product needs", minutes: 11, text: "Front, three-quarter, detail, in use and in scale. We'll shoot all five for a mug and a bag." },
          { title: "Quick edits on the phone", minutes: 10, text: "Straighten, crop to a square, lift the shadows a little. Ten seconds per photo, the same edit for every photo in a set." },
        ],
      },
    ],
  },
  {
    title: "Social Media Marketing That Sells",
    instructor: "Yasmin Adel",
    level: "Intermediate",
    category: "Business",
    priceCents: 1100_00,
    picture: "course-marketing",
    description: "Plan a month of posts in an afternoon, write captions people read to the end, and know which posts bring customers, not only likes.",
    topics: [
      {
        title: "A plan you can keep",
        lessons: [
          { title: "Three kinds of posts", minutes: 9, preview: true, text: "Show the product, show the people, answer a question. A simple mix that keeps your page interesting without daily brainstorming." },
          { title: "A month in one afternoon", minutes: 13, text: "We'll fill a calendar with twelve posts, write the captions in one go and schedule them." },
        ],
      },
      {
        title: "What works",
        lessons: [{ title: "Reading the numbers", minutes: 12, text: "Reach, saves and messages tell you more than likes. We'll look at a real month of numbers and decide what to post more of." }],
      },
    ],
  },
  {
    title: "Everyday English Conversation",
    instructor: "Hannah Clarke",
    level: "Intermediate",
    category: "Languages",
    priceCents: 650_00,
    picture: "course-english",
    description: "Speak with more confidence at work and when you travel: small talk, phone calls, meetings and polite ways to disagree.",
    topics: [
      {
        title: "Small talk",
        lessons: [
          { title: "Starting a conversation", minutes: 7, preview: true, text: "\"How's your week going?\" is a better start than \"How are you?\". We'll practise openers that lead somewhere." },
          { title: "Keeping it going", minutes: 9, text: "Follow-up questions, short stories and how to end a chat politely when you need to go." },
        ],
      },
      {
        title: "At work",
        lessons: [
          { title: "Phone calls without stress", minutes: 10, text: "A simple structure for every call: who you are, why you're calling, what you need, what happens next." },
          { title: "Disagreeing politely", minutes: 8, text: "\"I see your point, but…\" and other phrases that keep a meeting friendly." },
        ],
      },
    ],
  },
  {
    title: "Python for Data Analysis",
    instructor: "Mert Şahin",
    level: "Advanced",
    category: "Programming",
    priceCents: 1600_00,
    picture: "course-python",
    description: "Load a spreadsheet into Python, clean it, answer questions with a few lines of pandas and draw charts you can share. For people who've written a little code before.",
    topics: [
      {
        title: "Getting the data in",
        lessons: [
          { title: "Your first notebook", minutes: 10, preview: true, text: "Open a notebook, load a CSV file with pandas and look at the first rows. Everything else in this course starts here." },
          { title: "Cleaning messy columns", minutes: 14, text: "Dates as text, prices with currency signs, empty cells. We'll fix each one with a single line." },
        ],
      },
      {
        title: "Answers and charts",
        lessons: [
          { title: "Group, sum, sort", minutes: 12, text: "Sales by month, best products, top customers: three questions, three lines of code." },
          { title: "Charts worth sharing", minutes: 11, text: "A clear title, labelled axes and one colour that stands out. We'll turn a default chart into one you'd put in a report." },
        ],
      },
    ],
  },
];

// Store

export const STORE_CURRENCY: CatalogCurrency = "TRY";
export const STORE_SHIPPING_CENTS = 79_90;
export const STORE_FREE_SHIPPING_OVER_CENTS = 1500_00;
export const PRODUCT_CATEGORIES = ["Flowers", "Gift boxes", "Sweets", "Home"];

export const DEMO_PRODUCTS: DemoProduct[] = [
  { sku: "LALE-101", name: "Blush Rose Bouquet", category: "Flowers", priceCents: 1290_00, salePriceCents: null, picture: "product-roses", featured: true, description: "Twelve blush pink roses with eucalyptus, wrapped in cream paper and tied with a silk ribbon.\n\nMade the morning it's delivered." },
  { sku: "LALE-102", name: "White Orchid in Ceramic Pot", category: "Flowers", priceCents: 1850_00, salePriceCents: null, picture: "product-orchid", featured: true, description: "A two-stem white orchid in a handmade ceramic pot. Flowers for weeks with a little water once a week." },
  { sku: "LALE-103", name: "Spring Tulip Bunch", category: "Flowers", priceCents: 690_00, salePriceCents: 590_00, picture: "product-tulips", featured: false, description: "Fifteen tulips in red, yellow and pink. They keep opening for days in a vase." },
  { sku: "LALE-201", name: "Birthday Surprise Box", category: "Gift boxes", priceCents: 1450_00, salePriceCents: null, picture: "product-gift", featured: true, description: "A small bouquet, a scented candle and a box of Turkish delight, with a handwritten card." },
  { sku: "LALE-202", name: "Turkish Coffee Gift Set", category: "Gift boxes", priceCents: 940_00, salePriceCents: null, picture: "product-coffee", featured: false, description: "A copper cezve, two porcelain cups and 250 g of freshly ground Turkish coffee." },
  { sku: "LALE-301", name: "Rose Turkish Delight Box", category: "Sweets", priceCents: 520_00, salePriceCents: 420_00, picture: "product-delight", featured: false, description: "Soft rose and pistachio Turkish delight, dusted with powdered sugar. 500 g." },
  { sku: "LALE-302", name: "Linden Tea Tin", category: "Sweets", priceCents: 280_00, salePriceCents: null, picture: "product-tea", featured: false, description: "Dried linden flowers in a tin you'll want to keep. Calming, lightly sweet. 80 g." },
  { sku: "LALE-401", name: "Fig & Cedar Candle", category: "Home", priceCents: 560_00, salePriceCents: null, picture: "product-candle", featured: false, description: "A soy wax candle with notes of ripe fig and cedar wood. Burns for about 40 hours." },
];

// Bookings

const day = (start: string, end: string): TimeRange[] => [{ start, end }];
/** Sunday first: closed on Sundays. */
export const STUDIO_HOURS: TimeRange[][] = [[], day("10:00", "19:00"), day("10:00", "19:00"), day("10:00", "19:00"), day("10:00", "19:00"), day("10:00", "19:00"), day("10:00", "17:00")];

export const BOOKING_RULES: BookingRules = {
  timezone: "Europe/Istanbul",
  currency: "TRY",
  maxDaysAhead: 30,
  minMinutesAhead: 60,
  cancelBeforeMinutes: 24 * 60,
  slotStepMinutes: 30,
  notes: true,
  autoApprove: true,
};

export const SERVICE_CATEGORIES = ["Hair", "Spa", "Nails & brows"];

export const DEMO_SERVICES: DemoService[] = [
  { name: "Haircut & blow-dry", category: "Hair", minutes: 60, priceCents: 850_00, picture: "service-cut", color: "#2F6F62", description: "A wash, a cut that suits you and a blow-dry. Tell us what you'd like or ask for advice." },
  { name: "Colour & gloss", category: "Hair", minutes: 120, priceCents: 1900_00, picture: "service-colour", color: "#C0566B", description: "All-over colour or roots, with a gloss for shine. Includes a blow-dry." },
  { name: "Relaxing massage", category: "Spa", minutes: 60, priceCents: 1200_00, picture: "service-massage", color: "#5D6B66", description: "A full-body massage with warm oil, to slow down for an hour." },
  { name: "Hydrating facial", category: "Spa", minutes: 45, priceCents: 950_00, picture: "service-facial", color: "#C98F7A", description: "Cleansing, a gentle peel and a hydrating mask, for skin that feels fresh." },
  { name: "Gel manicure", category: "Nails & brows", minutes: 45, priceCents: 600_00, picture: "service-nails", color: "#C0566B", description: "Shaping, cuticle care and a gel colour that lasts up to three weeks." },
  { name: "Brow shaping", category: "Nails & brows", minutes: 30, priceCents: 350_00, picture: "service-brows", color: "#3B2A1E", description: "Shaping with thread or wax, finished with a tint if you'd like." },
];

export const DEMO_STAFF: DemoStaff[] = [
  { name: "Elif Arslan", title: "Hair stylist", picture: "staff-elif", services: ["Haircut & blow-dry", "Colour & gloss"] },
  { name: "Selin Koç", title: "Beauty therapist", picture: "staff-selin", services: ["Hydrating facial", "Gel manicure", "Brow shaping"] },
  { name: "Deniz Yıldız", title: "Massage therapist", picture: "staff-deniz", services: ["Relaxing massage", "Hydrating facial"] },
];

// Clinic (21)

/** Sunday first: Saturday mornings only, closed on Sundays. */
export const CLINIC_HOURS: TimeRange[][] = [[], day("09:00", "18:00"), day("09:00", "18:00"), day("09:00", "18:00"), day("09:00", "18:00"), day("09:00", "18:00"), day("09:00", "13:00")];

export const CLINIC_RULES: BookingRules = { ...BOOKING_RULES, notes: false, slotStepMinutes: 15 };

export const CLINIC_CATEGORIES = ["Family doctor", "Dentist", "Physiotherapy"];

export const CLINIC_SERVICES: DemoService[] = [
  { name: "General visit", category: "Family doctor", minutes: 30, priceCents: 1200_00, picture: "visit-checkup", color: "#2C6A8A", description: "A visit with our family doctor to talk about how you feel and any questions you have." },
  { name: "Follow-up visit", category: "Family doctor", minutes: 15, priceCents: 600_00, picture: "visit-followup", color: "#3F7F5B", description: "A short visit after an earlier one, to see how things are going." },
  { name: "Dental check-up", category: "Dentist", minutes: 45, priceCents: 1500_00, picture: "visit-dental", color: "#4A7FB0", description: "A check of your teeth and gums, with a cleaning." },
  { name: "Children's dental visit", category: "Dentist", minutes: 30, priceCents: 900_00, picture: "visit-children", color: "#E39B2E", description: "A calm first visit for children, with time to get to know the dentist." },
  { name: "Physiotherapy session", category: "Physiotherapy", minutes: 45, priceCents: 1400_00, picture: "visit-physio", color: "#6A4C93", description: "A session with our physiotherapist, with exercises to take home." },
];

export const CLINIC_DOCTORS: DemoStaff[] = [
  {
    name: "Dr. Ayşe Demir",
    title: "Family doctor",
    picture: "doctor-ayse",
    services: ["General visit", "Follow-up visit"],
    specialties: ["Family medicine", "Visits for children and adults"],
    languages: ["Turkish", "English"],
    bio: "Ayşe has been a family doctor in Istanbul for twelve years. She sees adults and children, and likes to take the time to answer every question.",
  },
  {
    name: "Dr. Kerem Aksoy",
    title: "Dentist",
    picture: "doctor-kerem",
    services: ["Dental check-up", "Children's dental visit"],
    specialties: ["General dentistry", "Children's dentistry"],
    languages: ["Turkish", "English", "German"],
    bio: "Kerem studied in Istanbul and Berlin. Children like his visits because he shows them every tool before he uses it.",
  },
  {
    name: "Leyla Haddad",
    title: "Physiotherapist",
    picture: "doctor-leyla",
    services: ["Physiotherapy session"],
    specialties: ["Back and neck", "Sports"],
    languages: ["Arabic", "English", "Turkish"],
    bio: "Leyla works with people of every age who want to move with more ease, from office workers to weekend runners.",
  },
];

/** The demo's intake form. Visitors share one account, so the guide asks for made-up answers. */
export const CLINIC_INTAKE: IntakeField[] = [
  { id: "reason", label: "Reason for your visit", type: "textarea", options: [], required: true },
  { id: "first_visit", label: "Is this your first visit to us?", type: "choice", options: ["Yes", "No"], required: true },
  { id: "date_of_birth", label: "Date of birth", type: "date", options: [], required: false },
  { id: "allergies", label: "Allergies we should know about", type: "text", options: [], required: false },
];

// Real estate

export const LISTING_SETTINGS: Omit<ListingSettings, "contactName"> = {
  currency: "EGP",
  areaUnit: "m2",
  contactPhone: null,
  contactWhatsapp: null,
  contactEmail: null,
  messages: true,
};

export const DEMO_LISTINGS: DemoListing[] = [
  {
    reference: "NH-1001",
    title: "Bright 3-bedroom apartment with Nile view",
    purpose: "sale",
    type: "apartment",
    priceCents: 14_500_000_00,
    pricePeriod: null,
    negotiable: true,
    city: "Cairo",
    district: "Zamalek",
    latitude: 30.0626,
    longitude: 31.2197,
    area: 185,
    bedrooms: 3,
    bathrooms: 2,
    floor: 7,
    yearBuilt: 2012,
    furnished: false,
    features: ["Nile view", "Elevator", "Balcony", "Doorman", "Parking"],
    pictures: ["home-zamalek", "room-living", "room-kitchen"],
    featured: true,
    description: "A bright corner apartment on the seventh floor with a wide view of the Nile.\n\nThree bedrooms, two bathrooms, a large living room opening onto the balcony and a separate kitchen. Covered parking and a doorman around the clock.",
  },
  {
    reference: "NH-1002",
    title: "Family villa with garden in Maadi",
    purpose: "sale",
    type: "villa",
    priceCents: 32_000_000_00,
    pricePeriod: null,
    negotiable: false,
    city: "Cairo",
    district: "Maadi",
    latitude: 29.9602,
    longitude: 31.2569,
    area: 360,
    bedrooms: 5,
    bathrooms: 4,
    floor: null,
    yearBuilt: 2005,
    furnished: false,
    features: ["Garden", "Private parking", "Maid's room", "Storage", "Quiet street"],
    pictures: ["home-maadi", "room-bedroom", "room-living"],
    featured: true,
    description: "A two-storey villa on a quiet, green street, a short walk from Road 9.\n\nFive bedrooms, a family room, a garden with mature trees and parking for two cars.",
  },
  {
    reference: "NH-1003",
    title: "Modern 2-bedroom apartment for rent in New Cairo",
    purpose: "rent",
    type: "apartment",
    priceCents: 32_000_00,
    pricePeriod: "month",
    negotiable: false,
    city: "Cairo",
    district: "New Cairo",
    latitude: 30.0074,
    longitude: 31.4913,
    area: 120,
    bedrooms: 2,
    bathrooms: 2,
    floor: 3,
    yearBuilt: 2021,
    furnished: true,
    features: ["Furnished", "Air conditioning", "Gym", "Pool", "Security"],
    pictures: ["home-newcairo", "room-living", "room-bedroom"],
    featured: false,
    description: "A furnished apartment in a gated compound with a pool, a gym and security.\n\nTwo bedrooms, an open kitchen and a balcony over the garden. Available from next month.",
  },
  {
    reference: "NH-1004",
    title: "Studio near the university, Sheikh Zayed",
    purpose: "rent",
    type: "studio",
    priceCents: 14_500_00,
    pricePeriod: "month",
    negotiable: true,
    city: "Giza",
    district: "Sheikh Zayed",
    latitude: 30.0392,
    longitude: 30.9874,
    area: 55,
    bedrooms: 1,
    bathrooms: 1,
    floor: 2,
    yearBuilt: 2019,
    furnished: true,
    features: ["Furnished", "Elevator", "Internet"],
    pictures: ["home-zayed", "room-bedroom"],
    featured: false,
    description: "A compact, furnished studio close to the university and the shops. Ideal for a student or a young professional.",
  },
  {
    reference: "NH-1005",
    title: "Penthouse with roof terrace in Heliopolis",
    purpose: "sale",
    type: "penthouse",
    priceCents: 21_750_000_00,
    pricePeriod: null,
    negotiable: true,
    city: "Cairo",
    district: "Heliopolis",
    latitude: 30.0911,
    longitude: 31.3225,
    area: 240,
    bedrooms: 4,
    bathrooms: 3,
    floor: 9,
    yearBuilt: 2016,
    furnished: false,
    features: ["Roof terrace", "Elevator", "City view", "Parking", "Storage"],
    pictures: ["home-heliopolis", "room-living", "room-kitchen"],
    featured: true,
    description: "The top floor of a well-kept building, with a private roof terrace looking over Heliopolis.\n\nFour bedrooms, a double living room and a kitchen with room for a table.",
  },
  {
    reference: "NH-1006",
    title: "Classic apartment in Garden City",
    purpose: "sale",
    type: "apartment",
    priceCents: 11_900_000_00,
    pricePeriod: null,
    negotiable: true,
    city: "Cairo",
    district: "Garden City",
    latitude: 30.0367,
    longitude: 31.2311,
    area: 210,
    bedrooms: 3,
    bathrooms: 2,
    floor: 4,
    yearBuilt: 1952,
    furnished: false,
    features: ["High ceilings", "Balcony", "Elevator", "Doorman"],
    pictures: ["home-garden-city", "room-living"],
    featured: false,
    description: "High ceilings, tall windows and wooden floors in a classic building on a tree-lined street. Needs some updating; priced to match.",
  },
  {
    reference: "NH-1007",
    title: "Office floor for rent in Zamalek",
    purpose: "rent",
    type: "office",
    priceCents: 780_000_00,
    pricePeriod: "year",
    negotiable: true,
    city: "Cairo",
    district: "Zamalek",
    latitude: 30.0596,
    longitude: 31.2234,
    area: 160,
    bedrooms: null,
    bathrooms: 2,
    floor: 2,
    yearBuilt: 2008,
    furnished: false,
    features: ["Elevator", "Air conditioning", "Meeting room", "Parking"],
    pictures: ["home-zamalek", "room-kitchen"],
    featured: false,
    description: "An open-plan office floor with a meeting room and a kitchenette, in a quiet street close to the main roads.",
  },
];

