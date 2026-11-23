/**
 * 132.112–132.114 Every table of the database, by what it holds for an app:
 * what a copy of an app takes (`content`, and the app's own row), and what
 * moves with an app to another account and when. tests/unit/app-tables.test.ts
 * fails when a table is added to lib/db/schema.ts without a place here, and
 * when a `content` table has no copier (lib/apps/copy.ts COPIERS).
 *
 * - `app`: the app's own row (its design, settings and languages).
 * - `content`: what the app shows, made by its owner: products, courses'
 *   catalogs, events, listings, articles, menus, pages, fonts, media… A copy
 *   takes it; a move takes it.
 * - `customers`: the app's people and what they did: users, members,
 *   students, their progress, devices and sign-ins.
 * - `orders`: orders, bookings, tickets, donations, payments and refunds.
 * - `messages`: chats, notifications and messages sent.
 * - `activity`: analytics, crashes, errors, logs and history.
 * - `builds`: builds, publishing and the store listing's own rows.
 * - `secrets`: the app's keys and the hooks that carry them.
 * - `plan`: the app's Yallapp plan: its license, storage packs, payments.
 * - `account`: not an app's: people, accounts, Yallapp's own settings, the
 *   team, and an account's own library (saved sections, templates).
 *
 * A copy never takes customers, orders, messages, activity, builds,
 * secrets or the plan. A move takes customers, orders, messages and activity
 * with "Move the app's data", the plan with "Move the subscription", and
 * builds and secrets always (they are the app's own identity in the stores).
 */

export type AppTableRole = "app" | "content" | "customers" | "orders" | "messages" | "activity" | "builds" | "secrets" | "plan" | "account";

export const APP_TABLES: Record<string, AppTableRole> = {
  // Accounts, people and Yallapp's own.
  users: "account",
  clients: "account",
  plugin_releases: "account",
  password_reset_tokens: "account",
  rate_limits: "account",
  platform_settings: "account",
  admin_members: "account",
  admin_audit_log: "account",
  site_content: "account",
  email_templates: "account",
  coupons: "account",
  coupon_redemptions: "account",
  announcements: "account",
  announcement_dismissals: "account",
  update_reads: "account",
  owner_devices: "account",
  courier_accounts: "account",
  courier_devices: "account",
  courier_challenges: "account",
  team_members: "account",
  team_invitations: "account",
  team_activity: "account",
  account_deletion_requests: "account",
  app_move_requests: "account",
  user_sessions: "account",
  user_two_factor: "account",
  user_recovery_codes: "account",
  client_milestones: "account",
  product_days: "account",
  job_runs: "account",
  team_alerts: "account",
  mail_campaigns: "account",
  mail_segments: "account",
  mail_templates: "account",
  mail_recipients: "account",
  mail_events: "account",
  mail_suppressions: "account",
  mail_contacts: "account",
  mail_runs: "account",
  bot_phrases: "account",
  bot_unmatched: "account",
  live_activity_entries: "account",
  demo_visits: "account",
  site_reviews: "account",
  prime_alerts: "account",
  prime_sends: "account",
  staff_profiles: "account",
  account_manager_calls: "account",
  // 136 The platform's own issuer keys and Yallapp's pool of Firebase projects.
  platform_signing_keys: "account",
  firebase_projects: "account",
  // An account's own design library: it stays with the account.
  saved_sections: "account",
  studio_templates: "account",
  studio_designs: "account",
  // Assets belong to an account; an app's are copied with it (lib/apps/copy.ts) or given with it (lib/apps/move.ts).
  assets: "account",
  // 106 Studio Market: a designer's templates and their versions and reviews, and the licences an account took;
  // a template applied to an app stays with the app wherever it goes (by its ID), and a copy starts with the design itself.
  studio_market_designers: "account",
  studio_market_templates: "account",
  studio_market_versions: "account",
  studio_market_reviews: "account",
  studio_market_licences: "account",
  studio_market_applications: "account",
  // 106.10 A paid template's orders and each period a licence was paid for: the account's purchases, like its licences.
  studio_market_orders: "account",
  studio_market_licence_periods: "account",
  // 106.11 The designer's money: the ledger of sales, the checks before the first payout, the payouts.
  studio_market_ledger: "account",
  studio_market_payout_details: "account",
  studio_market_payouts: "account",
  // 106.12 A designer's discounts on their templates: the template's, never an app's.
  studio_market_discounts: "account",

  apps: "app",

  // The plan.
  licenses: "plan",
  license_activations: "plan",
  plan_payments: "plan",
  storage_packs: "plan",
  // 133 An app's add-ons are bought for it like its storage packs: never copied, moved with the subscription.
  app_addons: "plan",
  kept_billing_records: "plan",
  app_deletions: "plan",
  // 132 Prime given as a gift moves with the subscription.
  prime_gifts: "plan",

  // Builds and the store listing.
  builds: "builds",
  publishing_requests: "builds",
  publishing_events: "builds",
  store_products: "builds",
  store_billing_items: "builds",
  // 136 The app's apps in Yallapp's Firebase, by package name and bundle ID: its identity, like its store listing.
  // A copy registers its own once it has its own package name; a move keeps them (the app keeps its ID).
  app_firebase_apps: "builds",

  // Keys and hooks.
  app_auth_keys: "secrets",
  api_webhooks: "secrets",

  // Content.
  catalog_categories: "content",
  catalog_products: "content",
  catalog_coupons: "content",
  store_flash_sales: "content",
  store_gift_occasions: "content",
  // 165 Dashboard › Stories
  app_stories: "content",
  listings: "content",
  listing_settings: "content",
  article_categories: "content",
  articles: "content",
  news_settings: "content",
  events: "content",
  event_ticket_types: "content",
  event_settings: "content",
  campaigns: "content",
  donation_settings: "content",
  delivery_settings: "content",
  delivery_services: "content",
  restaurants: "content",
  market_departments: "content",
  market_aisles: "content",
  market_products: "content",
  market_coupons: "content",
  market_club_plans: "content",
  market_application_forms: "content",
  vehicle_types: "content",
  teachers: "content",
  app_layouts: "content",
  own_fonts: "content",
  media_files: "content",
  school_settings: "content",
  school_classes: "content",
  school_subjects: "content",
  school_periods: "content",
  school_syllabus_units: "content",
  school_syllabus_topics: "content",
  school_report_templates: "content",
  school_bus_routes: "content",
  school_bus_stops: "content",
  school_books: "content",
  school_book_copies: "content",
  school_events: "content",
  school_exams: "content",
  school_behaviour_categories: "content",
  uni_settings: "content",
  uni_faculties: "content",
  uni_departments: "content",
  uni_programs: "content",
  uni_courses: "content",
  uni_terms: "content",
  uni_sections: "content",
  travel_settings: "content",
  travel_hotels: "content",
  travel_rooms: "content",
  travel_flights: "content",

  // The app's people and what they did.
  hosted_users: "customers",
  hosted_user_passwords: "customers",
  hosted_devices: "customers",
  hosted_refresh_tokens: "customers",
  hosted_challenges: "customers",
  memberships: "customers",
  member_check_ins: "customers",
  course_enrollments: "customers",
  learning_time: "customers",
  lesson_progress: "customers",
  lesson_notes: "customers",
  lesson_bookmarks: "customers",
  quiz_attempts: "customers",
  assignment_submissions: "customers",
  course_reviews: "customers",
  // 212 A store's customers' saved products, product reviews and back-in-stock requests.
  shop_wishlist: "customers",
  product_reviews: "customers",
  stock_alerts: "customers",
  course_questions: "customers",
  course_answers: "customers",
  teacher_follows: "customers",
  teacher_reviews: "customers",
  listing_favorites: "customers",
  couriers: "customers",
  restaurant_staff: "customers",
  market_club_members: "customers",
  market_applications: "customers",
  vendor_web_challenges: "customers",
  vendor_web_sessions: "customers",
  hosted_carts: "customers",
  hosted_order_watches: "customers",
  loyalty_balances: "customers",
  loyalty_entries: "customers",
  billing_sessions: "customers",
  school_people: "customers",
  school_family: "customers",
  school_attendance: "customers",
  school_homework: "customers",
  school_submissions: "customers",
  school_assessments: "customers",
  school_scores: "customers",
  school_fees: "customers",
  school_topic_progress: "customers",
  school_reports: "customers",
  school_checkins: "customers",
  school_leave: "customers",
  school_bus_riders: "customers",
  school_bus_runs: "customers",
  school_bus_marks: "customers",
  school_book_loans: "customers",
  school_book_holds: "customers",
  school_behaviour: "customers",
  school_slip_answers: "customers",
  school_excuses: "customers",
  school_pickups: "customers",
  school_pickup_notes: "customers",
  school_salaries: "customers",
  school_payslips: "customers",
  school_salary_months: "customers",
  school_salary_advances: "customers",
  uni_students: "customers",
  uni_registrations: "customers",
  uni_enrolments: "customers",
  uni_attendance: "customers",
  travel_saved: "customers",
  travel_alerts: "customers",
  travel_reviews: "customers",

  // Orders, bookings and payments.
  catalog_orders: "orders",
  store_deliveries: "orders",
  store_platform_orders: "orders",
  booking_appointments: "orders",
  class_sessions: "orders",
  class_bookings: "orders",
  event_tickets: "orders",
  donations: "orders",
  shipments: "orders",
  market_orders: "orders",
  market_complaints: "orders",
  market_coupon_uses: "orders",
  wallet_entries: "orders",
  food_orders: "orders",
  rides: "orders",
  store_purchases: "orders",
  store_purchase_events: "orders",
  payment_refunds: "orders",
  travel_bookings: "orders",
  listing_inquiries: "orders",

  // Messages.
  hosted_notifications: "messages",
  notice_recipients: "messages",
  scheduled_notifications: "messages",
  auto_notices: "messages",
  notification_campaigns: "messages",
  campaign_sends: "messages",
  listing_inquiry_messages: "messages",
  chat_members: "messages",
  chat_conversations: "messages",
  chat_participants: "messages",
  chat_messages: "messages",
  chat_reports: "messages",
  chat_blocks: "messages",
  chat_sessions: "messages",
  chat_uploads: "messages",
  school_announcements: "messages",
  school_slips: "messages",
  owner_notices: "messages",

  // Activity and history.
  analytics_events: "activity",
  analytics_daily: "activity",
  crash_issues: "activity",
  crash_sessions: "activity",
  app_errors: "activity",
  app_layout_versions: "activity",
};

/** What a copy of an app never takes, as the dialog lists it. */
export const NOT_COPIED: readonly Exclude<AppTableRole, "app" | "content" | "account">[] = ["secrets", "customers", "orders", "messages", "builds", "plan", "activity"];
